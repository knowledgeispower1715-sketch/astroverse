import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, UserRecord, Role, AccountStatus, OrderStatus } from './db';
import { razorpay, isRazorpayConfigured, verifyRazorpaySignature } from './razorpay';

const app = express();
app.use(express.json());

const ALLOWED_ORIGINS = [
  'https://astroverse-eta.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8081',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

// Enable CORS with origin verification and preflight support
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === 'test') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', 'https://astroverse-eta.vercel.app');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helper: Hash session tokens with SHA-256 for secure DB storage
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper: Sanitize user record (never return passwords or reset tokens to client)
function sanitizeUser(user: UserRecord): any {
  const { passwordHash, passwordSalt, resetTokenHash, resetTokenExpiresAt, ...safe } = user as any;
  return safe;
}

// Helper: Scrypt password hashing & timing-safe verification
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const hash = hashPassword(password, salt);
  if (Buffer.byteLength(hash) !== Buffer.byteLength(storedHash)) return false;
  return crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(storedHash, 'utf8'));
}

// Helper: Mask sensitive personal identifiers in logs (redacts emails & phone numbers)
export function maskIdentifier(id: string): string {
  if (!id) return '';
  const trimmed = id.trim();
  if (trimmed.includes('@')) {
    const parts = trimmed.split('@');
    const local = parts[0];
    const domain = parts[1] || '';
    const maskedLocal = local.length <= 2
      ? local[0] + '*'
      : local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
  }
  if (trimmed.length > 4) {
    return trimmed.slice(0, 3) + '*'.repeat(Math.max(1, trimmed.length - 7)) + trimmed.slice(-4);
  }
  return '***';
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
  if (process.env.NODE_ENV === 'test') return true;
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

  console.log(`[AUTH_OTP_DISPATCH] Dispatched verification OTP to ${isEmail ? 'email' : 'phone'} ${maskIdentifier(cleanId)}`);

  const responsePayload: any = {
    status: 'OTP_SENT',
    message: `Verification code sent to ${cleanId}.`,
    cooldownSeconds: 60
  };
  if (process.env.NODE_ENV === 'test') {
    responsePayload.devPreviewOtp = otp; // Only populated for isolated automated test runs
  }
  res.json(responsePayload);
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
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register-password
app.post('/api/auth/register-password', async (req: Request, res: Response) => {
  const { email, password, displayName, phone, otp } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'FIELDS_REQUIRED', message: 'Email and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'INVALID_EMAIL_FORMAT', message: 'Please provide a valid email address.' });
  }

  if (typeof password !== 'string' || password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    return res.status(400).json({
      error: 'WEAK_PASSWORD',
      message: 'Password must be at least 8 characters long and contain both letters and numbers.'
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  if (!checkIpRateLimit(clientIp)) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please wait 10 minutes.' });
  }

  try {
    let existing = await db.findUserByEmail(cleanEmail);

    if (existing) {
      if (existing.status !== AccountStatus.ACTIVE) {
        return res.status(403).json({
          error: 'ACCOUNT_INACTIVE',
          message: `Account is ${existing.status.toLowerCase()}. Please contact customer support.`
        });
      }

      if (existing.passwordHash) {
        return res.status(409).json({
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists. Please log in.'
        });
      }

      // Existing account without password (OTP-only registration)
      // Strictly require a fresh, single-use, server-verified OTP challenge bound to this email.
      if (!otp) {
        return res.status(401).json({
          error: 'VERIFICATION_REQUIRED',
          message: 'Account ownership verification required. Please provide a valid OTP sent to your email to attach a password to this account.'
        });
      }

      const record = otpStore.get(cleanEmail);
      if (!record || record.expiresAt < Date.now()) {
        return res.status(401).json({
          error: 'INVALID_OR_EXPIRED_OTP',
          message: 'The verification code has expired or was not requested. Please request a new code.'
        });
      }

      record.attempts += 1;
      if (record.attempts > 5) {
        otpStore.delete(cleanEmail);
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

      // Single-use eviction to prevent replay attacks
      otpStore.delete(cleanEmail);

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);

      const user = await db.updateUser(existing.id, {
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: true,
        displayName: displayName ? String(displayName).trim() : existing.displayName,
        lastLoginAt: new Date().toISOString()
      });

      const rawSessionToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawSessionToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.createSession({
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'] || null
      });

      await db.recordAuditEvent({
        userId: user.id,
        action: 'AUTH_LINK_PASSWORD',
        targetType: 'USER',
        targetId: user.id,
        ipAddress: clientIp,
        metadata: { email: cleanEmail }
      });

      return res.json({
        status: 'AUTHENTICATED',
        sessionToken: rawSessionToken,
        user: sanitizeUser(user)
      });
    }

    // Genuinely new account
    let emailVerified = false;
    if (otp) {
      const record = otpStore.get(cleanEmail);
      if (!record || record.expiresAt < Date.now() || record.otp !== String(otp).trim()) {
        return res.status(401).json({
          error: 'INVALID_OR_EXPIRED_OTP',
          message: 'Incorrect or expired verification code.'
        });
      }
      emailVerified = true;
      otpStore.delete(cleanEmail);
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);

    const user = await db.createUser({
      email: cleanEmail,
      phone: phone ? String(phone).trim() : null,
      phoneVerified: false,
      emailVerified: emailVerified,
      displayName: displayName ? String(displayName).trim() : cleanEmail.split('@')[0],
      passwordHash: hash,
      passwordSalt: salt,
      role: Role.USER,
      status: AccountStatus.ACTIVE,
      walletBalance: 0.00
    });

    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'] || null
    });

    await db.recordAuditEvent({
      userId: user.id,
      action: 'AUTH_REGISTER_PASSWORD',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: clientIp,
      metadata: { email: cleanEmail, emailVerified }
    });

    return res.json({
      status: 'AUTHENTICATED',
      sessionToken: rawSessionToken,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login-password
app.post('/api/auth/login-password', async (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'FIELDS_REQUIRED', message: 'Identifier and password are required.' });
  }

  const cleanId = String(identifier).trim();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  if (!checkIpRateLimit(clientIp)) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED', message: 'Too many attempts. Please try again later.' });
  }

  try {
    const user = await db.findUserByIdentifier(cleanId);
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email/phone or password. If you registered via OTP, please log in with OTP.'
      });
    }

    if (user.status !== AccountStatus.ACTIVE) {
      return res.status(403).json({
        error: 'ACCOUNT_INACTIVE',
        message: `Account is ${user.status.toLowerCase()}. Please contact customer support.`
      });
    }

    const matches = verifyPassword(String(password), user.passwordSalt, user.passwordHash);
    if (!matches) {
      await db.recordAuditEvent({
        userId: user.id,
        action: 'AUTH_FAILED_PASSWORD',
        targetType: 'USER',
        targetId: user.id,
        ipAddress: clientIp,
        metadata: { identifier: cleanId }
      });
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email/phone or password.'
      });
    }

    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'] || null
    });

    await db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    await db.recordAuditEvent({
      userId: user.id,
      action: 'AUTH_LOGIN_PASSWORD',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: clientIp,
      metadata: { identifier: cleanId }
    });

    res.json({
      status: 'AUTHENTICATED',
      sessionToken: rawSessionToken,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'IDENTIFIER_REQUIRED', message: 'Email address or phone number is required.' });
  }

  const cleanId = String(identifier).trim();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  if (!checkIpRateLimit(clientIp)) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please wait 10 minutes.' });
  }

  try {
    const user = await db.findUserByIdentifier(cleanId);
    if (!user) {
      return res.json({
        status: 'RESET_CODE_SENT',
        message: `If an account exists for ${cleanId}, a 6-digit password reset code has been dispatched.`
      });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetTokenHash = crypto.createHash('sha256').update(resetCode).digest('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.updateUser(user.id, {
      resetTokenHash,
      resetTokenExpiresAt
    });

    await db.recordAuditEvent({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: clientIp,
      metadata: { identifier: cleanId }
    });

    console.log(`[AUTH_PASSWORD_RESET] Dispatched password reset token to ${maskIdentifier(cleanId)}`);

    const resPayload: any = {
      status: 'RESET_CODE_SENT',
      message: `A 6-digit password reset code has been dispatched to ${cleanId}.`
    };
    if (process.env.NODE_ENV === 'test') {
      resPayload.devResetCode = resetCode;
    }
    res.json(resPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { identifier, resetCode, newPassword } = req.body;
  if (!identifier || !resetCode || !newPassword) {
    return res.status(400).json({ error: 'FIELDS_REQUIRED', message: 'Identifier, reset code, and new password are required.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8 || !/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
    return res.status(400).json({
      error: 'WEAK_PASSWORD',
      message: 'New password must be at least 8 characters long and contain both letters and numbers.'
    });
  }

  const cleanId = String(identifier).trim();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  try {
    const user = await db.findUserByIdentifier(cleanId);
    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      return res.status(400).json({
        error: 'INVALID_RESET_REQUEST',
        message: 'No active reset request found for this account. Please request a new code.'
      });
    }

    if (new Date(user.resetTokenExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        error: 'RESET_CODE_EXPIRED',
        message: 'The password reset code has expired. Please request a new code.'
      });
    }

    const submittedHash = crypto.createHash('sha256').update(String(resetCode).trim()).digest('hex');
    if (submittedHash !== user.resetTokenHash) {
      return res.status(400).json({
        error: 'INVALID_RESET_CODE',
        message: 'Incorrect password reset code.'
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(newPassword, salt);

    await db.updateUser(user.id, {
      passwordHash: hash,
      passwordSalt: salt,
      resetTokenHash: null,
      resetTokenExpiresAt: null
    });

    // Invalidate existing sessions for security
    await db.deleteUserSessions(user.id);

    await db.recordAuditEvent({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: clientIp,
      metadata: { identifier: cleanId }
    });

    res.json({
      status: 'PASSWORD_RESET_SUCCESS',
      message: 'Password has been reset successfully. Please log in with your new password.'
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

app.post('/api/profiles', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { userId, profileName, relationship, dateOfBirth, timeOfBirth, birthplaceName, latitude, longitude, resolvedTimezone } = req.body;

  if (!profileName || !dateOfBirth || !timeOfBirth || !birthplaceName || latitude == null || longitude == null) {
    return res.status(400).json({
      error: 'REQUIRED_FIELDS_MISSING',
      message: 'profileName, dateOfBirth, timeOfBirth, birthplaceName, latitude, and longitude are strictly required.'
    });
  }

  const numLat = Number(latitude);
  const numLon = Number(longitude);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLon)) {
    return res.status(400).json({
      error: 'INVALID_COORDINATES',
      message: 'latitude and longitude must be valid finite numbers.'
    });
  }

  // Derive owner ID from the authenticated session (never trust client-supplied userId alone)
  const sessionUser = req.user!;
  let targetUserId = sessionUser.id;

  // Cross-account operations are strictly forbidden unless performed by an authorized Administrator
  if (userId && String(userId) !== sessionUser.id) {
    if (sessionUser.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Cannot create or link birth profile to another user account.'
      });
    }
    const targetUser = await db.findUserById(String(userId));
    if (!targetUser) {
      return res.status(404).json({
        error: 'TARGET_USER_NOT_FOUND',
        message: 'Target user account does not exist.'
      });
    }
    targetUserId = targetUser.id;
  }

  try {
    const trimmedName = String(profileName).trim();
    const profile = await db.createProfile({
      userId: targetUserId,
      profileName: trimmedName,
      relationship: relationship || 'Self',
      dateOfBirth,
      timeOfBirth,
      birthplaceName: String(birthplaceName).trim(),
      latitude: numLat,
      longitude: numLon,
      resolvedTimezone: resolvedTimezone || 'Asia/Kolkata'
    });

    await db.recordAuditEvent({
      userId: targetUserId,
      action: 'PROFILE_CREATED',
      targetType: 'PROFILE',
      targetId: profile.id,
      metadata: { profileName: trimmedName, relationship, actorId: sessionUser.id }
    });

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profiles/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  if (req.user!.role !== Role.SUPER_ADMIN && req.user!.id !== userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: cannot access another user\'s birth profiles.' });
  }
  try {
    const profiles = await db.getProfilesByUserId(userId);
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profiles/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const profile = await db.getProfileById(id);
    if (!profile) return res.status(404).json({ error: 'PROFILE_NOT_FOUND' });
    if (req.user!.role !== Role.SUPER_ADMIN && profile.userId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: cannot update another user\'s birth profile.' });
    }
    const updated = await db.updateProfile(id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/profiles/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const profile = await db.getProfileById(id);
    if (!profile) return res.status(404).json({ error: 'PROFILE_NOT_FOUND' });
    if (req.user!.role !== Role.SUPER_ADMIN && profile.userId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: cannot delete another user\'s birth profile.' });
    }
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

app.get('/api/reports/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  if (req.user!.role !== Role.SUPER_ADMIN && req.user!.id !== userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: cannot access another user\'s saved reports.' });
  }
  try {
    const reports = await db.getSavedReportsByUserId(userId);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/detail/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const report = await db.getSavedReportById(id);
    if (!report) return res.status(404).json({ error: 'REPORT_NOT_FOUND' });
    if (req.user!.role !== Role.SUPER_ADMIN && report.userId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: cannot access another user\'s saved report.' });
    }
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const report = await db.getSavedReportById(id);
    if (!report) return res.status(404).json({ error: 'REPORT_NOT_FOUND' });
    if (req.user!.role !== Role.SUPER_ADMIN && report.userId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: cannot delete another user\'s saved report.' });
    }
    const deleted = await db.deleteSavedReport(id);
    if (!deleted) return res.status(404).json({ error: 'REPORT_NOT_FOUND' });
    res.json({ status: 'DELETED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 5. WALLET & PAYMENT GATEWAY ====================

export const MIN_RECHARGE_AMOUNT = 50;
export const MAX_RECHARGE_AMOUNT = 50000;

/**
 * Direct recharge endpoint is deprecated and disabled for financial integrity.
 * Stale clients requesting POST /api/wallet/recharge are rejected with HTTP 400
 * directing them to use the authentic cryptographic order-and-verify flow.
 */
app.post('/api/wallet/recharge', authenticate, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(400).json({
    error: 'DEPRECATED_ENDPOINT',
    message: 'Direct balance recharge is disabled for financial integrity. All wallet recharges must use the authenticated order flow: POST /api/wallet/create-order followed by POST /api/wallet/verify-payment.'
  });
});

export const APPROVED_RECHARGE_PACKAGES = [
  { id: 'pack_50', baseAmount: 50, bonus: 0, totalCredit: 50 },
  { id: 'pack_100', baseAmount: 100, bonus: 10, totalCredit: 110 },
  { id: 'pack_250', baseAmount: 250, bonus: 35, totalCredit: 285 },
  { id: 'pack_500', baseAmount: 500, bonus: 100, totalCredit: 600 },
  { id: 'pack_1000', baseAmount: 1000, bonus: 250, totalCredit: 1250 },
  { id: 'pack_2000', baseAmount: 2000, bonus: 600, totalCredit: 2600 },
  { id: 'pack_5000', baseAmount: 5000, bonus: 1750, totalCredit: 6750 }
];

export function validateRechargeAmount(amount: any): { valid: boolean; normalizedAmount: number; error?: string } {
  if (amount == null || (typeof amount !== 'number' && typeof amount !== 'string')) {
    return { valid: false, normalizedAmount: 0, error: 'Recharge amount must be a numeric value.' };
  }
  const num = Number(amount);
  if (!Number.isFinite(num) || isNaN(num)) {
    return { valid: false, normalizedAmount: 0, error: 'Recharge amount must be a finite number.' };
  }
  if (num < MIN_RECHARGE_AMOUNT) {
    return { valid: false, normalizedAmount: 0, error: `Minimum recharge amount is ₹${MIN_RECHARGE_AMOUNT}.` };
  }
  if (num > MAX_RECHARGE_AMOUNT) {
    return { valid: false, normalizedAmount: 0, error: `Maximum recharge amount is ₹${MAX_RECHARGE_AMOUNT}.` };
  }
  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(num - rounded) > 0.0001) {
    return { valid: false, normalizedAmount: 0, error: 'Recharge amount cannot exceed 2 decimal places.' };
  }
  return { valid: true, normalizedAmount: rounded };
}

app.post('/api/wallet/create-order', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user!;
  const clientSuppliedUserId = req.body.userId;

  // Derive purchasing user strictly from session; reject cross-user order creation
  if (clientSuppliedUserId && clientSuppliedUserId !== sessionUser.id && sessionUser.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Cannot create payment order for another user account.'
    });
  }
  const userId = (sessionUser.role === Role.SUPER_ADMIN && clientSuppliedUserId)
    ? clientSuppliedUserId
    : sessionUser.id;

  let requestedAmount = req.body.amount;
  if (req.body.packageId) {
    const pkg = APPROVED_RECHARGE_PACKAGES.find(p => p.id === req.body.packageId);
    if (!pkg) {
      return res.status(400).json({
        error: 'INVALID_PACKAGE',
        message: `Package identifier '${req.body.packageId}' is not an approved recharge package.`
      });
    }
    requestedAmount = pkg.baseAmount;
  }

  const validation = validateRechargeAmount(requestedAmount);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'INVALID_AMOUNT',
      message: validation.error
    });
  }
  const amount = validation.normalizedAmount;

  try {
    let razorpayOrderId: string;

    if (isRazorpayConfigured()) {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: `rcpt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
        });
        razorpayOrderId = razorpayOrder.id;
      } catch (rzpErr: any) {
        return res.status(503).json({
          error: 'PAYMENT_GATEWAY_ERROR',
          message: 'Payment gateway rejected order creation. Please retry later.'
        });
      }
    } else if (process.env.NODE_ENV === 'test') {
      // Isolated test-environment order simulation
      razorpayOrderId = `order_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    } else {
      // Production fail-closed: missing live provider credentials
      return res.status(503).json({
        error: 'PAYMENT_GATEWAY_UNAVAILABLE',
        message: 'Payment gateway is not configured for live transactions. Please contact support.'
      });
    }

    const order = await db.createPaymentOrder({
      userId,
      amount,
      currency: 'INR',
      razorpayOrderId
    });

    await db.recordAuditEvent({
      userId,
      action: 'PAYMENT_ORDER_CREATED',
      targetType: 'PAYMENT_ORDER',
      targetId: order.razorpayOrderId,
      metadata: { amount, currency: 'INR' }
    });

    res.json({
      orderId: order.razorpayOrderId,
      amount: order.amount,
      currency: 'INR',
      status: 'CREATED'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
});

app.post('/api/wallet/verify-payment', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user!;
  const { orderId, paymentId, signature } = req.body;

  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    return res.status(400).json({
      error: 'MISSING_ORDER_ID',
      message: 'Valid order identifier is required.'
    });
  }

  if (!paymentId || typeof paymentId !== 'string' || !paymentId.trim()) {
    return res.status(400).json({
      error: 'MISSING_PAYMENT_ID',
      message: 'Valid provider payment identifier is required.'
    });
  }

  const trimmedPaymentId = paymentId.trim();
  if (trimmedPaymentId.length < 5) {
    return res.status(400).json({
      error: 'INVALID_PAYMENT_ID',
      message: 'Payment identifier is invalid.'
    });
  }

  if (!signature || typeof signature !== 'string' || !signature.trim()) {
    return res.status(400).json({
      error: 'MISSING_SIGNATURE',
      message: 'Cryptographic payment signature is required.'
    });
  }

  try {
    const order = db.findPaymentOrderByRazorpayId(orderId.trim());
    if (!order) {
      return res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: 'Payment order not found in platform records.'
      });
    }

    // Ownership verification
    if (order.userId !== sessionUser.id && sessionUser.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Payment order does not belong to the authenticated user.'
      });
    }

    // Idempotency: if already paid with same paymentId, return current balance
    if (order.status === OrderStatus.PAID && order.razorpayPaymentId === trimmedPaymentId) {
      const user = await db.findUserById(order.userId);
      return res.json({
        status: 'SUCCESS',
        newBalance: user ? user.walletBalance : sessionUser.walletBalance,
        alreadySettled: true,
        orderId: order.razorpayOrderId,
        paymentId: order.razorpayPaymentId
      });
    }

    if (order.status === OrderStatus.PAID && order.razorpayPaymentId !== trimmedPaymentId) {
      return res.status(409).json({
        error: 'ORDER_ALREADY_PAID',
        message: 'Order was already settled with a different payment identifier.'
      });
    }

    // Check if payment ID has already been processed for another order
    if (db.isPaymentIdUsed(trimmedPaymentId, order.razorpayOrderId)) {
      return res.status(409).json({
        error: 'DUPLICATE_PAYMENT',
        message: 'Payment identifier has already been processed for another transaction.'
      });
    }

    // Verify cryptographic HMAC-SHA256 signature
    const isSigValid = verifyRazorpaySignature(order.razorpayOrderId, trimmedPaymentId, signature.trim());
    if (!isSigValid) {
      return res.status(400).json({
        error: 'INVALID_PAYMENT_SIGNATURE',
        message: 'Payment signature verification failed. Untrusted payment claim rejected.'
      });
    }

    // If live Razorpay credentials are configured, cross-verify payment directly against provider API
    if (isRazorpayConfigured()) {
      try {
        const paymentData = await razorpay.payments.fetch(trimmedPaymentId);
        if (paymentData.order_id !== order.razorpayOrderId) {
          return res.status(400).json({
            error: 'ORDER_PAYMENT_MISMATCH',
            message: 'Provider payment record does not match the platform order ID.'
          });
        }
        if (paymentData.amount !== Math.round(order.amount * 100)) {
          return res.status(400).json({
            error: 'AMOUNT_MISMATCH',
            message: 'Payment amount recorded by provider differs from platform order amount.'
          });
        }
        if (paymentData.currency !== 'INR') {
          return res.status(400).json({
            error: 'CURRENCY_MISMATCH',
            message: 'Payment currency recorded by provider is not INR.'
          });
        }
        if (paymentData.status !== 'captured' && paymentData.status !== 'authorized') {
          return res.status(400).json({
            error: 'PAYMENT_NOT_SETTLED',
            message: `Provider payment is not in an authorized or captured state (current status: ${paymentData.status}).`
          });
        }
      } catch (fetchErr: any) {
        return res.status(400).json({
          error: 'PROVIDER_PAYMENT_FETCH_FAILED',
          message: 'Could not verify payment with provider: ' + (fetchErr?.error?.description || fetchErr.message)
        });
      }
    }

    // Settle wallet credit atomically
    const updatedUser = await db.rechargeWallet(
      order.userId,
      order.amount,
      trimmedPaymentId,
      order.razorpayOrderId
    );

    await db.recordAuditEvent({
      userId: order.userId,
      action: 'WALLET_RECHARGE_VERIFIED',
      targetType: 'WALLET',
      targetId: trimmedPaymentId,
      metadata: {
        orderId: order.razorpayOrderId,
        paymentId: trimmedPaymentId,
        amount: order.amount,
        newBalance: updatedUser.walletBalance
      }
    });

    res.json({
      status: 'SUCCESS',
      newBalance: updatedUser.walletBalance,
      orderId: order.razorpayOrderId,
      paymentId: trimmedPaymentId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

app.post('/api/wallet/settle-consultation', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user!;
  const { userId: clientUserId, astrologerId, sessionId, totalDeduction, durationSeconds, durationMinutes } = req.body;

  if (clientUserId && clientUserId !== sessionUser.id && sessionUser.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Cannot settle consultation for another user account.'
    });
  }
  const userId = (sessionUser.role === Role.SUPER_ADMIN && clientUserId)
    ? clientUserId
    : sessionUser.id;

  if (!astrologerId || !sessionId) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'astrologerId and sessionId are required.'
    });
  }

  const astro = await db.findAstrologerById(astrologerId);
  if (!astro) {
    return res.status(404).json({
      error: 'ASTROLOGER_NOT_FOUND',
      message: 'Astrologer not found in directory.'
    });
  }

  // Server-authoritative charge calculation
  let deductionAmount: number;
  if (durationSeconds != null || durationMinutes != null) {
    const rawSecs = durationSeconds != null ? Number(durationSeconds) : Number(durationMinutes) * 60;
    if (!Number.isFinite(rawSecs) || rawSecs <= 0 || isNaN(rawSecs)) {
      return res.status(400).json({
        error: 'INVALID_DURATION',
        message: 'Duration must be a positive finite number of seconds or minutes.'
      });
    }
    const mins = Math.max(1, Math.ceil(rawSecs / 60));
    const serverCalculated = Math.round(mins * astro.ratePerMinute * 100) / 100;

    if (typeof totalDeduction === 'number') {
      if (!Number.isFinite(totalDeduction) || totalDeduction <= 0 || isNaN(totalDeduction)) {
        return res.status(400).json({
          error: 'INVALID_DEDUCTION',
          message: 'Deduction amount must be a positive finite number.'
        });
      }
      if (totalDeduction < serverCalculated) {
        return res.status(400).json({
          error: 'TAMPERED_CHARGE',
          message: `Supplied deduction (₹${totalDeduction}) is less than server-calculated rate for duration (₹${serverCalculated}).`
        });
      }
      deductionAmount = Math.round(totalDeduction * 100) / 100;
    } else {
      deductionAmount = serverCalculated;
    }
  } else if (typeof totalDeduction === 'number') {
    if (!Number.isFinite(totalDeduction) || totalDeduction <= 0 || isNaN(totalDeduction)) {
      return res.status(400).json({
        error: 'INVALID_DEDUCTION',
        message: 'Deduction amount must be a positive finite number.'
      });
    }
    deductionAmount = Math.round(totalDeduction * 100) / 100;
  } else {
    return res.status(400).json({
      error: 'MISSING_CHARGE_SPECIFICATION',
      message: 'Either totalDeduction or duration must be provided.'
    });
  }

  const MAX_SESSION_DEDUCTION = 50000.00;
  if (deductionAmount > MAX_SESSION_DEDUCTION) {
    return res.status(400).json({
      error: 'EXCESSIVE_DEDUCTION',
      message: `Single consultation deduction cannot exceed safety limit of ₹${MAX_SESSION_DEDUCTION}.`
    });
  }

  try {
    const settlement = await db.settleConsultation(
      userId,
      astrologerId,
      sessionId,
      deductionAmount
    );

    await db.recordAuditEvent({
      userId,
      action: 'CONSULTATION_SETTLED',
      targetType: 'CONSULTATION_SESSION',
      targetId: sessionId,
      metadata: {
        astrologerId,
        deduction: deductionAmount,
        newBalance: settlement.newBalance
      }
    });

    res.json(settlement);
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      const user = await db.findUserById(userId);
      return res.status(400).json({
        error: 'INSUFFICIENT_FUNDS',
        message: 'Wallet balance is insufficient to settle this consultation.',
        currentBalance: user ? user.walletBalance : 0,
        requiredAmount: deductionAmount
      });
    }
    res.status(500).json({ error: error.message || 'Settlement failed' });
  }
});

app.post('/api/wallet/unlock-report', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user!;
  const { reportType, referenceId, clientKey } = req.body;

  if (!reportType || typeof reportType !== 'string' || !reportType.trim()) {
    return res.status(400).json({
      error: 'REPORT_TYPE_REQUIRED',
      message: 'A valid reportType string is required to unlock a premium report.'
    });
  }

  try {
    const result = await db.unlockReport(sessionUser.id, reportType.trim(), referenceId, clientKey);

    await db.recordAuditEvent({
      userId: sessionUser.id,
      action: 'REPORT_UNLOCKED',
      targetType: 'PREMIUM_REPORT',
      targetId: referenceId || reportType,
      metadata: {
        reportType: reportType.trim(),
        referenceId: referenceId || null,
        deduction: result.deduction,
        newBalance: result.newBalance,
        alreadyUnlocked: Boolean(result.alreadyUnlocked)
      }
    });

    return res.json({
      unlocked: true,
      ...result
    });
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      const user = await db.findUserById(sessionUser.id);
      return res.status(400).json({
        error: 'INSUFFICIENT_FUNDS',
        message: 'Wallet balance is insufficient. Unlocking this premium report requires ₹49.00.',
        requiredAmount: 49.00,
        currentBalance: user ? user.walletBalance : 0
      });
    }
    return res.status(500).json({ error: error.message || 'Report unlock failed' });
  }
});

app.get('/api/wallet/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    const statement = await db.getWalletStatement(user.id);
    res.json({ balance: user.walletBalance, statement });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wallet/balance', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    res.json({ success: true, balance: user.walletBalance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wallet/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user!;
  const { userId } = req.params;

  if (userId !== sessionUser.id && sessionUser.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: "Cannot access another user's wallet statement."
    });
  }

  try {
    const targetUser = await db.findUserById(userId);
    if (!targetUser) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    const statement = await db.getWalletStatement(userId);
    res.json({ balance: targetUser.walletBalance, statement });
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
  const pStatus = db.getPersistenceStatus();
  const isHealthy = process.env.NODE_ENV !== 'production' || pStatus.durable;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ONLINE' : 'DEGRADED_DATABASE_REQUIRED',
    service: 'astroverse-wallet-auth-gateway',
    version: '2.5.0',
    persistence: pStatus,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ready', (_req: Request, res: Response) => {
  const pStatus = db.getPersistenceStatus();
  if ((process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') && !pStatus.durable) {
    return res.status(503).json({
      status: 'NOT_READY',
      error: 'DATABASE_CONFIGURATION_REQUIRED',
      message: 'Production deployment requires DATABASE_URL environment variable for durable PostgreSQL persistence.'
    });
  }
  return res.json({ status: 'READY', persistence: pStatus.mode });
});

const PORT = process.env.PORT || 5000;
if (require.main === module && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`[ASTROVERSE] Wallet, Auth & Admin Gateway running on port ${PORT}`);
  });
}

module.exports = app;
module.exports.default = app;
export default app;
