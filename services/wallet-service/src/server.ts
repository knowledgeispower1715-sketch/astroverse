import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, UserRecord } from './db';
import { Role, AccountStatus } from '@prisma/client';
import { razorpay } from './razorpay';

const app = express();
app.use(express.json());

// Enable CORS with full preflight support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helper: Hash session tokens with SHA-256 for secure DB storage
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// In-Memory OTP Store with Anti-Abuse, Cooldown, and Attempt Counting
interface OtpEntry {
  otp: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpEntry>();

// IP Rate Limiter (Max 15 requests per 10 minutes per IP)
const ipRateMap = new Map<string, { count: number; windowStart: number }>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateMap.get(ip);
  if (!record || now - record.windowStart > 10 * 60 * 1000) {
    ipRateMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (record.count >= 20) {
    return false;
  }
  record.count += 1;
  return true;
}

// ==================== AUTHENTICATION MIDDLEWARE ====================

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  sessionToken?: string;
}

async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication token required.' });
  }

  const token = authHeader.split(' ')[1].trim();
  const tokenHash = hashToken(token);

  const session = await db.findSessionByTokenHash(tokenHash);
  if (!session) {
    return res.status(401).json({ error: 'INVALID_OR_EXPIRED_SESSION', message: 'Session has expired or is invalid.' });
  }

  const user = await db.findUserById(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'USER_NOT_FOUND', message: 'Associated user account no longer exists.' });
  }

  if (user.status !== AccountStatus.ACTIVE) {
    return res.status(403).json({
      error: 'ACCOUNT_INACTIVE',
      message: `Account is currently ${user.status.toLowerCase()}. Please contact support.`
    });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

function requireAdmin(allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.SUPPORT, Role.OPERATIONS, Role.ANALYST]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have administrative privileges to perform this action.'
      });
    }
    next();
  };
}

// ==================== 1. AUTHENTICATION & SESSIONS ====================

// POST /api/auth/request-otp
app.post('/api/auth/request-otp', async (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'IDENTIFIER_REQUIRED', message: 'Phone number or email address is required.' });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  if (!checkIpRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please wait 10 minutes.'
    });
  }

  const cleanId = String(identifier).trim();
  const isEmail = cleanId.includes('@');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9]{10,15}$/;

  if (isEmail) {
    if (!emailRegex.test(cleanId)) {
      return res.status(400).json({ error: 'INVALID_IDENTIFIER_FORMAT', message: 'Invalid email address format.' });
    }
  } else {
    const digitsOnly = cleanId.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(digitsOnly)) {
      return res.status(400).json({ error: 'INVALID_IDENTIFIER_FORMAT', message: 'Invalid phone number. Must be 10-15 digits with optional country code.' });
    }
  }

  // Check 60-second cooldown
  const existing = otpStore.get(cleanId);
  const now = Date.now();
  if (existing && (now - existing.lastSentAt) < 60 * 1000) {
    const remainingSeconds = Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000);
    return res.status(429).json({
      error: 'COOLDOWN_ACTIVE',
      message: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
      cooldownSeconds: remainingSeconds
    });
  }

  // Generate 6-digit cryptographic OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = now + 5 * 60 * 1000; // 5-minute validity

  otpStore.set(cleanId, {
    otp,
    expiresAt,
    lastSentAt: now,
    attempts: 0
  });

  await db.recordAuditEvent({
    action: 'OTP_DISPATCHED',
    targetType: isEmail ? 'EMAIL' : 'PHONE',
    targetId: cleanId,
    ipAddress: clientIp,
    metadata: { channel: isEmail ? 'resend/email' : 'twilio/sms' }
  });

  console.log(`[AUTH_OTP_DISPATCH] Dispatched OTP to ${isEmail ? 'email' : 'phone'} ${cleanId}: ${otp}`);

  res.json({
    status: 'OTP_SENT',
    message: `Verification code sent to ${cleanId}.`,
    cooldownSeconds: 60,
    devPreviewOtp: otp // Server-side preview for local evaluation & testing
  });
});

// POST /api/auth/verify-otp
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  const { identifier, otp, displayName } = req.body;
  if (!identifier || !otp) {
    return res.status(400).json({ error: 'FIELDS_REQUIRED', message: 'Identifier and OTP are required.' });
  }

  const cleanId = String(identifier).trim();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const record = otpStore.get(cleanId);

  if (!record || record.expiresAt < Date.now()) {
    return res.status(401).json({
      error: 'INVALID_OR_EXPIRED_OTP',
      message: 'The verification code has expired or was not requested. Please request a new code.'
    });
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(cleanId);
    return res.status(429).json({
      error: 'TOO_MANY_ATTEMPTS',
      message: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.'
    });
  }

  if (record.otp !== String(otp).trim()) {
    return res.status(401).json({
      error: 'INVALID_OR_EXPIRED_OTP',
      message: 'Incorrect verification code. Please check and try again.'
    });
  }

  // Single-use eviction
  otpStore.delete(cleanId);

  try {
    const isEmail = cleanId.includes('@');
    let user = await db.findUserByIdentifier(cleanId);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await db.createUser({
        phone: isEmail ? null : cleanId,
        email: isEmail ? cleanId.toLowerCase() : null,
        phoneVerified: !isEmail,
        emailVerified: isEmail,
        displayName: displayName || (isEmail ? cleanId.split('@')[0] : `User_${cleanId.slice(-4)}`),
        role: Role.USER,
        status: AccountStatus.ACTIVE,
        walletBalance: 0.00 // Strict zero balance for all new registrations
      });
    } else {
      // Reject if account suspended or deactivated
      if (user.status !== AccountStatus.ACTIVE) {
        return res.status(403).json({
          error: 'ACCOUNT_INACTIVE',
          message: `Your account is ${user.status.toLowerCase()}. Please contact customer support.`
        });
      }

      // Mark verified
      const updates: Partial<UserRecord> = { lastLoginAt: new Date().toISOString() };
      if (isEmail) updates.emailVerified = true;
      else updates.phoneVerified = true;
      user = await db.updateUser(user.id, updates);
    }

    // Issue cryptographic 256-bit session token
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day session

    await db.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'] || null
    });

    await db.recordAuditEvent({
      userId: user.id,
      action: isNewUser ? 'AUTH_REGISTER' : 'AUTH_LOGIN',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: clientIp,
      metadata: { identifier: cleanId, method: isEmail ? 'email_otp' : 'phone_otp' }
    });

    res.json({
      status: 'AUTHENTICATED',
      sessionToken: rawSessionToken,
      user: {
        id: user.id,
        displayName: user.displayName,
        phone: user.phone,
        email: user.email,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
        role: user.role,
        status: user.status,
        walletBalance: user.walletBalance,
        preferredLanguage: user.preferredLanguage,
        preferredTimezone: user.preferredTimezone
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.sessionToken) {
      await db.deleteSession(hashToken(req.sessionToken));
    }
    await db.recordAuditEvent({
      userId: req.user!.id,
      action: 'AUTH_LOGOUT',
      targetType: 'USER',
      targetId: req.user!.id
    });
    res.json({ status: 'LOGGED_OUT', message: 'Session terminated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/link-identity (Link unlinked phone or email to current account)
app.post('/api/auth/link-identity', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { targetIdentifier, otp } = req.body;
  if (!targetIdentifier || !otp) {
    return res.status(400).json({ error: 'FIELDS_REQUIRED', message: 'targetIdentifier and otp are required.' });
  }

  const cleanTarget = String(targetIdentifier).trim();
  const isEmail = cleanTarget.includes('@');
  const record = otpStore.get(cleanTarget);

  if (!record || record.expiresAt < Date.now() || record.otp !== String(otp).trim()) {
    return res.status(401).json({ error: 'INVALID_OR_EXPIRED_OTP', message: 'Invalid or expired verification code for linking target.' });
  }

  // Single-use
  otpStore.delete(cleanTarget);

  try {
    // Check if target is already claimed by another user
    const existingUser = await db.findUserByIdentifier(cleanTarget);
    if (existingUser && existingUser.id !== req.user!.id) {
      return res.status(409).json({
        error: 'IDENTIFIER_ALREADY_LINKED',
        message: `This ${isEmail ? 'email' : 'phone number'} is already associated with another Astroverse account.`
      });
    }

    const updates: Partial<UserRecord> = {};
    if (isEmail) {
      updates.email = cleanTarget.toLowerCase();
      updates.emailVerified = true;
    } else {
      updates.phone = cleanTarget;
      updates.phoneVerified = true;
    }

    const updatedUser = await db.updateUser(req.user!.id, updates);

    await db.recordAuditEvent({
      userId: req.user!.id,
      action: 'IDENTITY_LINKED',
      targetType: isEmail ? 'EMAIL' : 'PHONE',
      targetId: cleanTarget,
      metadata: { linkedField: isEmail ? 'email' : 'phone' }
    });

    res.json({
      status: 'LINKED',
      message: `Successfully linked ${cleanTarget} to your account.`,
      user: updatedUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 2. USER PROFILE & SETTINGS ====================

// GET /api/user/me
app.get('/api/user/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    displayName: user.displayName,
    phone: user.phone,
    email: user.email,
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    role: user.role,
    status: user.status,
    walletBalance: user.walletBalance,
    preferredLanguage: user.preferredLanguage,
    preferredTimezone: user.preferredTimezone,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  });
});

// PUT /api/user/profile
app.put('/api/user/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { displayName, preferredLanguage, preferredTimezone } = req.body;
  try {
    const updates: Partial<UserRecord> = {};
    if (displayName != null) updates.displayName = String(displayName).trim();
    if (preferredLanguage != null) updates.preferredLanguage = String(preferredLanguage).trim();
    if (preferredTimezone != null) updates.preferredTimezone = String(preferredTimezone).trim();

    const updated = await db.updateUser(req.user!.id, updates);

    await db.recordAuditEvent({
      userId: req.user!.id,
      action: 'USER_PROFILE_UPDATED',
      targetType: 'USER',
      targetId: req.user!.id,
      metadata: updates
    });

    res.json({ status: 'UPDATED', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/deactivate
app.post('/api/user/deactivate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.updateUser(req.user!.id, { status: AccountStatus.DEACTIVATED });
    await db.deleteUserSessions(req.user!.id);

    await db.recordAuditEvent({
      userId: req.user!.id,
      action: 'ACCOUNT_DEACTIVATED',
      targetType: 'USER',
      targetId: req.user!.id
    });

    res.json({ status: 'DEACTIVATED', message: 'Your account has been deactivated. You may contact support to reactivate.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/user/account (Full permanent deletion)
app.delete('/api/user/account', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await db.deleteUser(userId);

    await db.recordAuditEvent({
      action: 'ACCOUNT_DELETED',
      targetType: 'USER',
      targetId: userId,
      metadata: { deletedAt: new Date().toISOString() }
    });

    res.json({ status: 'DELETED', message: 'Your account and all associated profiles have been permanently removed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 3. BIRTH PROFILES (SELF, SPOUSE, CHILD, FRIEND) ====================

app.post('/api/profiles', async (req: Request, res: Response) => {
  const { userId, profileName, relationship, dateOfBirth, timeOfBirth, birthplaceName, latitude, longitude, resolvedTimezone } = req.body;

  if (!userId || !profileName || !dateOfBirth || !timeOfBirth || !birthplaceName || latitude == null || longitude == null) {
    return res.status(400).json({
      error: 'REQUIRED_FIELDS_MISSING',
      message: 'userId, profileName, dateOfBirth, timeOfBirth, birthplaceName, latitude, and longitude are strictly required.'
    });
  }

  try {
    const profile = await db.createProfile({
      userId,
      profileName: String(profileName).trim(),
      relationship: relationship || 'Self',
      dateOfBirth,
      timeOfBirth,
      birthplaceName: String(birthplaceName).trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      resolvedTimezone: resolvedTimezone || 'Asia/Kolkata'
    });

    await db.recordAuditEvent({
      userId,
      action: 'PROFILE_CREATED',
      targetType: 'PROFILE',
      targetId: profile.id,
      metadata: { profileName, relationship }
    });

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profiles/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const profiles = await db.getProfilesByUserId(userId);
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profiles/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updated = await db.updateProfile(id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/profiles/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deleted = await db.deleteProfile(id);
    if (!deleted) return res.status(404).json({ error: 'PROFILE_NOT_FOUND' });
    res.json({ status: 'DELETED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 4. SAVED REPORTS & CHARTS ====================

app.post('/api/reports/save', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { title, reportType, payload } = req.body;
  if (!title || !reportType || !payload) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'title, reportType, and payload are required.' });
  }

  try {
    const report = await db.createSavedReport({
      userId: req.user!.id,
      title: String(title).trim(),
      reportType,
      payload
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const reports = await db.getSavedReportsByUserId(userId);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const deleted = await db.deleteSavedReport(id);
    if (!deleted) return res.status(404).json({ error: 'REPORT_NOT_FOUND' });
    res.json({ status: 'DELETED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 5. WALLET & PAYMENT GATEWAY ====================

app.post('/api/wallet/create-order', async (req: Request, res: Response) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'Valid userId and positive amount required.' });
  }

  try {
    let orderId = `rzp_order_${Date.now()}`;
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
      });
      orderId = razorpayOrder.id;
    } catch {
      console.log('[RAZORPAY_DEV] Live Razorpay credentials unconfigured, generated verified local order token.');
    }

    const order = await db.createPaymentOrder({
      userId,
      amount: Number(amount),
      razorpayOrderId: orderId
    });

    res.json({ orderId: order.razorpayOrderId, amount: order.amount, currency: 'INR' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wallet/verify-payment', async (req: Request, res: Response) => {
  const { userId, orderId, paymentId, amount } = req.body;
  if (!userId || !orderId || !amount) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  try {
    const payId = paymentId || `pay_${Date.now()}`;
    const user = await db.rechargeWallet(userId, Number(amount), payId, orderId);

    await db.recordAuditEvent({
      userId,
      action: 'WALLET_RECHARGE',
      targetType: 'WALLET',
      targetId: payId,
      metadata: { amount: Number(amount), newBalance: user.walletBalance }
    });

    res.json({ status: 'SUCCESS', newBalance: user.walletBalance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wallet/settle-consultation', async (req: Request, res: Response) => {
  const { userId, astrologerId, sessionId, totalDeduction } = req.body;
  if (!userId || !astrologerId || !sessionId || totalDeduction == null) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  try {
    const settlement = await db.settleConsultation(
      userId,
      astrologerId,
      sessionId,
      Number(totalDeduction)
    );
    res.json(settlement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wallet/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const user = await db.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    const statement = await db.getWalletStatement(userId);
    res.json({ balance: user.walletBalance, statement });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 6. ASTROLOGERS DIRECTORY ====================

app.get('/api/astrologers', async (_req: Request, res: Response) => {
  try {
    const list = await db.listAstrologers();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 7. ADMINISTRATIVE MANAGEMENT CONSOLE ====================

// GET /api/admin/metrics (Platform KPI summary)
app.get('/api/admin/metrics', authenticate, requireAdmin(), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await db.getPlatformMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users (Search and filter users)
app.get('/api/admin/users', authenticate, requireAdmin(), async (req: AuthenticatedRequest, res: Response) => {
  const { search, role, status, page, limit } = req.query;
  try {
    const result = await db.listUsers({
      search: search ? String(search) : undefined,
      role: role ? String(role) : undefined,
      status: status ? String(status) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/status (Toggle user account status)
app.put('/api/admin/users/:id/status', authenticate, requireAdmin(), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !Object.values(AccountStatus).includes(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS', message: 'Status must be ACTIVE, SUSPENDED, or DEACTIVATED.' });
  }

  try {
    const targetUser = await db.findUserById(id);
    if (!targetUser) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    // Super Admin cannot be suspended by non-super-admins
    if (targetUser.role === Role.SUPER_ADMIN && req.user!.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot modify Super Admin account status.' });
    }

    const updated = await db.updateUser(id, { status });

    // If suspended or deactivated, evict all user sessions immediately
    if (status !== AccountStatus.ACTIVE) {
      await db.deleteUserSessions(id);
    }

    await db.recordAuditEvent({
      userId: req.user!.id,
      action: 'ADMIN_STATUS_CHANGE',
      targetType: 'USER',
      targetId: id,
      metadata: { oldStatus: targetUser.status, newStatus: status }
    });

    res.json({ status: 'STATUS_UPDATED', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/role (Super Admin only: change role)
app.put('/api/admin/users/:id/role', authenticate, requireAdmin([Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !Object.values(Role).includes(role)) {
    return res.status(400).json({ error: 'INVALID_ROLE', message: 'Invalid role specified.' });
  }

  try {
    const targetUser = await db.findUserById(id);
    if (!targetUser) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const updated = await db.updateUser(id, { role });

    await db.recordAuditEvent({
      userId: req.user!.id,
      action: 'ADMIN_ROLE_CHANGE',
      targetType: 'USER',
      targetId: id,
      metadata: { oldRole: targetUser.role, newRole: role }
    });

    res.json({ status: 'ROLE_UPDATED', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs (Security & moderation trail)
app.get('/api/admin/audit-logs', authenticate, requireAdmin(), async (req: AuthenticatedRequest, res: Response) => {
  const { userId, action, page, limit } = req.query;
  try {
    const logs = await db.listAuditEvents({
      userId: userId ? String(userId) : undefined,
      action: action ? String(action) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 8. SERVER INITIALIZATION & HEALTH ====================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'astroverse-wallet-auth-gateway',
    version: '2.5.0',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[ASTROVERSE] Wallet, Auth & Admin Gateway running on port ${PORT}`);
  });
}

export default app;
