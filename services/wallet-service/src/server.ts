import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, UserRecord, Role, AccountStatus, OrderStatus, isDemoModeActive } from './db';
import { razorpay, isRazorpayConfigured, verifyRazorpaySignature, verifyRazorpayWebhookSignature, getRazorpayWebhookSecret } from './razorpay';
import {
  SUBSCRIPTION_PLANS,
  REPORT_CATALOGUE,
  SubscriptionTier,
  BillingPeriod,
  calculateReportPrice
} from './monetization/catalog';
import { EntitlementManager } from './monetization/entitlements';
import { ReportDocumentGenerator } from './monetization/reportGenerator';
import {
  digitRoot1To9,
  calculateMoolank,
  calculateBhagyank,
  calculateNaamank,
  calculateHarmonyScore,
  PLANET_DATA,
  RELATIONSHIP_MATRIX,
  PREFERRED_COMPOUND_NUMBERS,
  CHALLENGING_COMPOUND_NUMBERS
} from './monetization/numerologyCalculator';

const app = express();
app.use(express.json({
  verify: (req: any, _res: any, buf: Buffer) => {
    req.rawBody = buf;
  }
}));

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

// ==================== ERROR HANDLING HELPER ====================

function handleServiceError(res: Response, err: any, defaultMsg = 'Internal Server Error') {
  if (err?.message && err.message.includes('DURABLE_STORAGE_REQUIRED')) {
    return res.status(503).json({
      error: 'DATABASE_CONFIGURATION_REQUIRED',
      message: 'Production deployment requires a connected PostgreSQL database (DATABASE_URL). Ephemeral storage fallback is strictly disabled.'
    });
  }
  return res.status(500).json({ error: err?.message || defaultMsg });
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
  if (!password) {
    return res.status(400).json({ error: 'FIELDS_REQUIRED', message: 'Password is required.' });
  }

  const cleanEmail = email ? String(email).trim().toLowerCase() : null;
  const cleanPhone = phone ? String(phone).trim() : null;

  if (!cleanEmail && !cleanPhone) {
    return res.status(400).json({
      error: 'FIELDS_REQUIRED',
      message: 'At least an email address or mobile phone number is required.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (cleanEmail && !emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'INVALID_EMAIL_FORMAT', message: 'Please provide a valid email address.' });
  }

  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (cleanPhone) {
    const digitsOnly = cleanPhone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(digitsOnly)) {
      return res.status(400).json({ error: 'INVALID_PHONE_FORMAT', message: 'Please provide a valid 10-15 digit phone number.' });
    }
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
    let existing: UserRecord | null = null;
    if (cleanEmail) {
      existing = await db.findUserByEmail(cleanEmail);
    }
    if (!existing && cleanPhone) {
      existing = await db.findUserByPhone(cleanPhone);
    }

    if (existing) {
      if (existing.status !== AccountStatus.ACTIVE) {
        return res.status(403).json({
          error: 'ACCOUNT_INACTIVE',
          message: `Account is ${existing.status.toLowerCase()}. Please contact customer support.`
        });
      }

      if (existing.passwordHash) {
        const errCode = (cleanEmail && existing.email === cleanEmail) ? 'EMAIL_ALREADY_EXISTS' : 'ACCOUNT_ALREADY_EXISTS';
        return res.status(409).json({
          error: errCode,
          message: 'An account with this email or phone already exists. Please log in.'
        });
      }

      // Existing account without password (OTP-only registration)
      // Strictly require a fresh, single-use, server-verified OTP challenge bound to this identifier
      const challengeTarget = cleanEmail || cleanPhone!;
      if (!otp) {
        return res.status(401).json({
          error: 'VERIFICATION_REQUIRED',
          message: 'Account ownership verification required. Please provide a valid OTP sent to your device to attach a password to this account.'
        });
      }

      const record = otpStore.get(challengeTarget);
      if (!record || record.expiresAt < Date.now()) {
        return res.status(401).json({
          error: 'INVALID_OR_EXPIRED_OTP',
          message: 'The verification code has expired or was not requested. Please request a new code.'
        });
      }

      record.attempts += 1;
      if (record.attempts > 5) {
        otpStore.delete(challengeTarget);
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
      otpStore.delete(challengeTarget);

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);

      const user = await db.updateUser(existing.id, {
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: cleanEmail ? true : existing.emailVerified,
        phoneVerified: cleanPhone ? true : existing.phoneVerified,
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
        metadata: { identifier: challengeTarget }
      });

      return res.json({
        status: 'AUTHENTICATED',
        sessionToken: rawSessionToken,
        user: sanitizeUser(user)
      });
    }

    // Genuinely new account
    let emailVerified = false;
    let phoneVerified = false;
    const challengeTarget = cleanEmail || cleanPhone!;
    if (otp) {
      const record = otpStore.get(challengeTarget);
      if (!record || record.expiresAt < Date.now() || record.otp !== String(otp).trim()) {
        return res.status(401).json({
          error: 'INVALID_OR_EXPIRED_OTP',
          message: 'Incorrect or expired verification code.'
        });
      }
      if (cleanEmail) emailVerified = true;
      if (cleanPhone) phoneVerified = true;
      otpStore.delete(challengeTarget);
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);

    const defaultName = displayName
      ? String(displayName).trim()
      : (cleanEmail ? cleanEmail.split('@')[0] : (cleanPhone ? `User_${cleanPhone.slice(-4)}` : 'Seeker'));

    const user = await db.createUser({
      email: cleanEmail,
      phone: cleanPhone,
      phoneVerified,
      emailVerified,
      displayName: defaultName,
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
      metadata: { email: cleanEmail, phone: cleanPhone, emailVerified, phoneVerified }
    });

    return res.json({
      status: 'AUTHENTICATED',
      sessionToken: rawSessionToken,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    return handleServiceError(res, err);
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

// ============================================================================
// GOOGLE OAUTH 2.0 & GOOGLE IDENTITY SERVICES (GIS) AUTHENTICATION
// ============================================================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '488224636987-ai5khc8s0cumhq3n243ca9rdpv9mt89j.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

interface GooglePayload {
  email: string;
  name?: string;
  sub: string;
  picture?: string;
  email_verified?: boolean;
}

async function verifyGoogleToken(token: string): Promise<GooglePayload | null> {
  if (!token || typeof token !== 'string') return null;

  // Test mode bypass for synthetic verification
  if (process.env.NODE_ENV === 'test' && token.startsWith('test_google_token_')) {
    if (token.includes('_unverified')) {
      return null; // Simulate unverified email rejection
    }
    if (token.includes('_wrong_aud')) {
      return null; // Simulate audience mismatch rejection
    }
    if (token.includes('_expired')) {
      return null; // Simulate expired token rejection
    }
    const parts = token.split('_');
    const email = parts[3] || 'google.user@example.com';
    return {
      email,
      name: 'Google Test User',
      sub: 'google_sub_123456789',
      email_verified: true
    };
  }

  // 1. Try decoding JWT payload to inspect structure
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);

      // Verify token with Google tokeninfo endpoint
      try {
        const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
        if (resp.ok) {
          const verified = await resp.json();
          const isAudValid = verified.aud === GOOGLE_CLIENT_ID;
          const isIssValid = verified.iss === 'accounts.google.com' || verified.iss === 'https://accounts.google.com';
          const isEmailVerified = verified.email_verified === 'true' || verified.email_verified === true;
          const isNotExpired = verified.exp ? (Number(verified.exp) * 1000 > Date.now()) : true;

          if (isAudValid && isIssValid && isEmailVerified && isNotExpired && verified.email) {
            return {
              email: verified.email.toLowerCase().trim(),
              name: verified.name,
              sub: verified.sub,
              picture: verified.picture,
              email_verified: true
            };
          }
          return null;
        }
      } catch {
        // Fallback to verified structure if client ID matches and network is offline
        const isAudValid = payload.aud === GOOGLE_CLIENT_ID;
        const isIssValid = payload.iss?.includes('accounts.google.com');
        const isEmailVerified = payload.email_verified === true;
        const isNotExpired = payload.exp ? (payload.exp * 1000 > Date.now()) : true;

        if (isAudValid && isIssValid && isEmailVerified && isNotExpired && payload.email) {
          return {
            email: payload.email.toLowerCase().trim(),
            name: payload.name,
            sub: payload.sub,
            picture: payload.picture,
            email_verified: true
          };
        }
        return null;
      }
    }
  } catch (err) {
    // Non-JWT token
  }

  // 2. Try verifying as an access token via Google UserInfo API
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.email && (data.email_verified === true || data.email_verified === 'true')) {
        return {
          email: data.email.toLowerCase().trim(),
          name: data.name,
          sub: data.sub,
          picture: data.picture,
          email_verified: true
        };
      }
    }
  } catch {}

  return null;
}

async function exchangeGoogleCode(code: string, redirectUri?: string): Promise<{ payload: GooglePayload | null; error?: string }> {
  if (!code || typeof code !== 'string') return { payload: null, error: 'MISSING_CODE' };

  if (process.env.NODE_ENV === 'test' && code.startsWith('test_google_code_')) {
    if (code.includes('_invalid')) {
      return { payload: null, error: 'INVALID_CODE' };
    }
    const email = code.replace('test_google_code_', '').split('_')[0] || 'code.user@example.com';
    return {
      payload: {
        email,
        name: 'Google Code User',
        sub: 'google_sub_code_987654321',
        email_verified: true
      }
    };
  }

  if (!GOOGLE_CLIENT_SECRET) {
    console.warn('[Google OAuth2] Code exchange unavailable: GOOGLE_CLIENT_SECRET is missing from server environment variables.');
    return { payload: null, error: 'MISSING_CLIENT_SECRET' };
  }

  try {
    const params = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri || 'https://astroverse-eta.vercel.app/',
      grant_type: 'authorization_code'
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Google OAuth2] Code exchange failed:', tokenRes.status, errText);
      return { payload: null, error: 'TOKEN_EXCHANGE_REJECTED' };
    }
    const tokenData = await tokenRes.json();
    if (tokenData.id_token) {
      const p = await verifyGoogleToken(tokenData.id_token);
      return { payload: p };
    } else if (tokenData.access_token) {
      const p = await verifyGoogleToken(tokenData.access_token);
      return { payload: p };
    }
  } catch (err: any) {
    return { payload: null, error: err.message };
  }
  return { payload: null, error: 'NO_TOKEN_IN_RESPONSE' };
}

// GET /api/auth/google/config
app.get('/api/auth/google/config', (_req: Request, res: Response) => {
  res.json({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri: 'https://astroverse-eta.vercel.app/'
  });
});

// GET /api/auth/google/callback
app.get('/api/auth/google/callback', (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    return res.redirect(`https://astroverse-eta.vercel.app/?auth_error=${encodeURIComponent(error)}`);
  }

  const target = new URL('https://astroverse-eta.vercel.app/');
  if (code) target.searchParams.set('code', code);
  if (state) target.searchParams.set('state', state);
  res.redirect(target.toString());
});

// POST /api/auth/google
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { credential, idToken, token, code, redirectUri } = req.body;
  const rawToken = credential || idToken || token;

  let payload: GooglePayload | null = null;
  let codeError: string | undefined;

  if (rawToken) {
    payload = await verifyGoogleToken(rawToken);
  } else if (code) {
    const exchangeResult = await exchangeGoogleCode(code, redirectUri);
    payload = exchangeResult.payload;
    codeError = exchangeResult.error;
  }

  if (!payload || !payload.email) {
    const detailMsg = codeError === 'MISSING_CLIENT_SECRET'
      ? 'Google authorization code received, but GOOGLE_CLIENT_SECRET is not configured on the server. Please sign in using the Google One-Tap or GIS button.'
      : 'Failed to authenticate with Google. Please check your account and try again.';
    return res.status(401).json({
      error: 'INVALID_GOOGLE_CREDENTIAL',
      codeError,
      message: detailMsg
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const cleanEmail = payload.email.trim().toLowerCase();

  try {
    let user = await db.findUserByIdentifier(cleanEmail);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await db.createUser({
        phone: null,
        email: cleanEmail,
        phoneVerified: false,
        emailVerified: true,
        displayName: payload.name || cleanEmail.split('@')[0],
        role: Role.USER,
        status: AccountStatus.ACTIVE,
        walletBalance: 0.00
      });
    } else {
      if (user.status !== AccountStatus.ACTIVE) {
        return res.status(403).json({
          error: 'ACCOUNT_INACTIVE',
          message: `Your account is ${user.status.toLowerCase()}. Please contact customer support.`
        });
      }

      const updates: Partial<UserRecord> = {
        lastLoginAt: new Date().toISOString(),
        emailVerified: true
      };
      if (!user.displayName && payload.name) {
        updates.displayName = payload.name;
      }
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
      metadata: { identifier: cleanEmail, method: 'google_oauth', googleSub: payload.sub }
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

// POST /api/user/migrate-guest (Import locally stored guest profiles into authenticated account)
app.post('/api/user/migrate-guest', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user!;
  const { profiles } = req.body;

  if (!Array.isArray(profiles) || profiles.length === 0) {
    return res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'profiles array is required and must not be empty.'
    });
  }

  try {
    const imported: any[] = [];
    const skipped: any[] = [];
    const existingProfiles = await db.getProfilesByUserId(sessionUser.id);

    for (const p of profiles) {
      if (!p.profileName || !p.dateOfBirth || !p.timeOfBirth || !p.birthplaceName ||
          !Number.isFinite(Number(p.latitude)) || !Number.isFinite(Number(p.longitude))) {
        skipped.push({ profileName: p.profileName || 'Unknown', reason: 'MISSING_OR_INVALID_COORDINATES' });
        continue;
      }

      const numLat = Number(p.latitude);
      const numLon = Number(p.longitude);
      const trimmedName = String(p.profileName).trim();

      // Idempotency: skip if profile with same name, DOB, and coordinates already exists
      const duplicate = existingProfiles.find(ep =>
        ep.profileName.toLowerCase() === trimmedName.toLowerCase() &&
        ep.dateOfBirth === p.dateOfBirth &&
        Math.abs(ep.latitude - numLat) < 0.001 &&
        Math.abs(ep.longitude - numLon) < 0.001
      );

      if (duplicate) {
        skipped.push({ profileName: trimmedName, reason: 'ALREADY_EXISTS', existingId: duplicate.id });
        continue;
      }

      const created = await db.createProfile({
        userId: sessionUser.id,
        profileName: trimmedName,
        relationship: p.relationship || 'Self',
        dateOfBirth: p.dateOfBirth,
        timeOfBirth: p.timeOfBirth,
        birthplaceName: String(p.birthplaceName).trim(),
        latitude: numLat,
        longitude: numLon,
        resolvedTimezone: p.resolvedTimezone || 'Asia/Kolkata'
      });

      imported.push(created);
      existingProfiles.push(created);
    }

    await db.recordAuditEvent({
      userId: sessionUser.id,
      action: 'GUEST_PROFILES_MIGRATED',
      targetType: 'USER',
      targetId: sessionUser.id,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      metadata: { importedCount: imported.length, skippedCount: skipped.length }
    });

    return res.json({
      status: 'MIGRATED',
      importedCount: imported.length,
      skippedCount: skipped.length,
      importedProfiles: imported,
      skipped
    });
  } catch (err: any) {
    return handleServiceError(res, err);
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

// GET /api/reports/catalogue (Public catalogue of individual report products)
app.get('/api/reports/catalogue', (_req: Request, res: Response) => {
  res.json({
    success: true,
    catalogue: Object.values(REPORT_CATALOGUE),
    disclaimer: 'Personalized reports are digital publications viewable exclusively inside the private online reader.'
  });
});

// GET /api/reports/reader/:id (Private, online-only paginated report reader)
app.get('/api/reports/reader/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const report = await db.getSavedReportById(id);
    if (!report) {
      return res.status(404).json({ error: 'REPORT_NOT_FOUND', message: 'Report publication not found.' });
    }

    // Strict ownership gate
    if (report.userId !== req.user!.id && req.user!.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: You do not own this report publication.' });
    }

    // Anti-download, anti-scraping, private reader headers
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    res.json({
      success: true,
      reportId: report.id,
      title: report.title,
      reportType: report.reportType,
      createdAt: report.createdAt,
      document: report.payload,
      readerSettings: {
        onlineOnly: true,
        downloadAllowed: false,
        printProtected: true,
        watermarkEnabled: true,
        disclaimer: 'Personalized private publication. Screenshots or external optical recording cannot be technically prevented.'
      }
    });
  } catch (err: any) {
    handleServiceError(res, err, 'Failed to fetch report for reader');
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
    return handleServiceError(res, error, 'Failed to create payment order');
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
    return handleServiceError(res, error, 'Payment verification failed');
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
    return handleServiceError(res, error, 'Settlement failed');
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
    return handleServiceError(res, error, 'Report unlock failed');
  }
});

app.post(['/api/wallet/book-puja', '/api/pujas/book'], authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user!;
  const { pujaName, amount, referenceId, clientKey } = req.body;

  if (!pujaName || typeof pujaName !== 'string' || !pujaName.trim()) {
    return res.status(400).json({
      error: 'PUJA_NAME_REQUIRED',
      message: 'A valid pujaName string is required to book a puja.'
    });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({
      error: 'INVALID_AMOUNT',
      message: 'A valid positive amount is required to book a puja.'
    });
  }

  try {
    const result = await db.bookPuja(sessionUser.id, pujaName.trim(), amt, referenceId, clientKey);

    await db.recordAuditEvent({
      userId: sessionUser.id,
      action: 'PUJA_BOOKED',
      targetType: 'PUJA_SERVICE',
      targetId: referenceId || pujaName.trim(),
      metadata: {
        pujaName: pujaName.trim(),
        amount: amt,
        deduction: result.deduction,
        newBalance: result.newBalance,
        alreadyBooked: Boolean(result.alreadyBooked)
      }
    });

    return res.json({
      booked: true,
      ...result
    });
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      const user = await db.findUserById(sessionUser.id);
      return res.status(400).json({
        error: 'INSUFFICIENT_FUNDS',
        message: `Wallet balance is insufficient. Booking ${pujaName} requires ₹${amt.toFixed(2)}.`,
        requiredAmount: amt,
        currentBalance: user ? user.walletBalance : 0
      });
    }
    return handleServiceError(res, error, 'Puja booking failed');
  }
});

app.get('/api/wallet/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    const statement = await db.getWalletStatement(user.id);
    res.json({
      balance: user.walletBalance,
      demoBalance: user.demoWalletBalance || 0,
      isDemoMode: isDemoModeActive(),
      statement
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// DEMO MODE ENDPOINTS (CONTROLLED NON-PRODUCTION TEST CREDITS ONLY)
// ==============================================================================

// GET /api/demo/status - check if demo mode is enabled in the current runtime environment
app.get('/api/demo/status', (req: Request, res: Response) => {
  res.json({
    demoModeActive: isDemoModeActive(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// POST /api/demo/credit - issue controlled demo credits to authenticated test account
app.post('/api/demo/credit', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDemoModeActive()) {
    return res.status(403).json({
      error: 'DEMO_MODE_DISABLED',
      message: 'Demo credit issuance is strictly disabled in production.'
    });
  }

  const { amount } = req.body;
  const validAmounts = [100, 500, 1000];
  const numAmount = Number(amount);

  if (!Number.isFinite(numAmount) || !validAmounts.includes(numAmount)) {
    return res.status(400).json({
      error: 'INVALID_DEMO_AMOUNT',
      message: 'Demo credit amount must be exactly 100, 500, or 1000.'
    });
  }

  try {
    const result = await db.addDemoCredits(req.user!.id, numAmount);
    res.json(result);
  } catch (err: any) {
    handleServiceError(res, err, 'Demo credit issuance failed');
  }
});

// POST /api/demo/reset - reset demo wallet balance to 0.00
app.post('/api/demo/reset', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDemoModeActive()) {
    return res.status(403).json({
      error: 'DEMO_MODE_DISABLED',
      message: 'Demo wallet reset is strictly disabled in production.'
    });
  }

  try {
    const result = await db.resetDemoWallet(req.user!.id);
    res.json(result);
  } catch (err: any) {
    handleServiceError(res, err, 'Demo wallet reset failed');
  }
});

// POST /api/demo/set-tier - simulate subscription tier for entitlement testing
app.post('/api/demo/set-tier', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDemoModeActive()) {
    return res.status(403).json({
      error: 'DEMO_MODE_DISABLED',
      message: 'Simulated subscription setting is strictly disabled in production.'
    });
  }

  const { tier } = req.body;
  if (!['FREE', 'PLUS', 'PREMIUM'].includes(String(tier).toUpperCase())) {
    return res.status(400).json({
      error: 'INVALID_TIER',
      message: 'Simulated tier must be FREE, PLUS, or PREMIUM.'
    });
  }

  try {
    const result = await db.setSimulatedTier(req.user!.id, String(tier).toUpperCase() as any);
    res.json(result);
  } catch (err: any) {
    handleServiceError(res, err, 'Simulated tier update failed');
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

// ==================== 7.5 MONETIZATION, SUBSCRIPTIONS & REPORT STUDIO ====================

// GET /api/subscriptions/plans (Public catalogue of subscription tiers)
app.get('/api/subscriptions/plans', (_req: Request, res: Response) => {
  res.json({
    success: true,
    plans: Object.values(SUBSCRIPTION_PLANS),
    disclaimer: 'Subscription pricing is billed in Indian Rupees (INR). Daily AI consultation quotas reset at 00:00 UTC.'
  });
});

// GET /api/entitlements/me (Authenticated user tier, profile quota, and daily AI quota)
app.get('/api/entitlements/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const profiles = await db.getProfilesByUserId(user.id);
    const snapshot = EntitlementManager.getEntitlementSnapshot(user, profiles.length);
    res.json(snapshot);
  } catch (err: any) {
    handleServiceError(res, err, 'Failed to fetch entitlements');
  }
});

// POST /api/subscriptions/create-order (Create Razorpay order for Plus/Premium subscription)
app.post('/api/subscriptions/create-order', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { tier, billingPeriod } = req.body;
  const user = req.user!;

  if (!tier || !Object.values(SubscriptionTier).includes(tier) || tier === SubscriptionTier.FREE) {
    return res.status(400).json({
      error: 'INVALID_TIER',
      message: 'A valid paid subscription tier (PLUS or PREMIUM) is required.'
    });
  }

  const period: BillingPeriod = billingPeriod === BillingPeriod.ANNUAL ? BillingPeriod.ANNUAL : BillingPeriod.MONTHLY;
  const plan = SUBSCRIPTION_PLANS[tier as SubscriptionTier];
  const pricePaise = period === BillingPeriod.ANNUAL ? plan.annualPricePaise : plan.monthlyPricePaise;
  const priceRupees = Math.round(pricePaise / 100);

  try {
    const orderId = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let razorpayOrderId = `order_${orderId}`;

    if (isRazorpayConfigured()) {
      const rzpOrder = await razorpay.orders.create({
        amount: pricePaise,
        currency: 'INR',
        receipt: orderId,
        notes: { userId: user.id, tier, period }
      });
      razorpayOrderId = rzpOrder.id;
    }

    const order = await db.createPaymentOrder({
      userId: user.id,
      amount: priceRupees,
      currency: 'INR',
      razorpayOrderId
    });

    res.json({
      success: true,
      orderId: order.razorpayOrderId,
      amount: pricePaise,
      amountPaise: pricePaise,
      amountRupees: priceRupees,
      tier,
      billingPeriod: period,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_preview_key'
    });
  } catch (err: any) {
    handleServiceError(res, err, 'Subscription order creation failed');
  }
});

// POST /api/subscriptions/verify-payment (Activate subscription upon verified payment)
app.post('/api/subscriptions/verify-payment', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { orderId, paymentId, signature, tier, billingPeriod } = req.body;
  const user = req.user!;

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: 'MISSING_PAYMENT_DETAILS', message: 'orderId, paymentId, and signature are required.' });
  }

  const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
  if (!isValid) {
    return res.status(400).json({ error: 'INVALID_PAYMENT_SIGNATURE', message: 'Cryptographic payment signature mismatch.' });
  }

  const targetTier = (tier as SubscriptionTier) || SubscriptionTier.PLUS;
  const period = billingPeriod === BillingPeriod.ANNUAL ? BillingPeriod.ANNUAL : BillingPeriod.MONTHLY;
  const durationDays = period === BillingPeriod.ANNUAL ? 365 : 30;

  try {
    const updatedUser = await db.updateSubscription(user.id, targetTier, period, durationDays);

    await db.recordAuditEvent({
      userId: user.id,
      action: 'SUBSCRIPTION_ACTIVATED',
      targetType: 'SUBSCRIPTION',
      targetId: `${targetTier}_${period}`,
      metadata: {
        tier: targetTier,
        period,
        durationDays,
        expiresAt: updatedUser.subscriptionExpiresAt,
        paymentId
      }
    });

    res.json({
      success: true,
      subscriptionTier: updatedUser.subscriptionTier,
      tier: updatedUser.subscriptionTier,
      billingPeriod: updatedUser.subscriptionBillingPeriod,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
      expiresAt: updatedUser.subscriptionExpiresAt,
      subscriptionStatus: updatedUser.subscriptionStatus
    });
  } catch (err: any) {
    handleServiceError(res, err, 'Subscription activation failed');
  }
});

// POST /api/subscriptions/cancel (Cancel recurring auto-renewal)
app.post('/api/subscriptions/cancel', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.cancelSubscription(req.user!.id);
    res.json({
      success: true,
      status: updated.subscriptionStatus,
      subscriptionStatus: updated.subscriptionStatus,
      expiresAt: updated.subscriptionExpiresAt,
      message: 'Subscription renewal has been cancelled. Access remains active until the expiration date.'
    });
  } catch (err: any) {
    handleServiceError(res, err, 'Subscription cancellation failed');
  }
});

// In-memory set to guarantee idempotent processing of webhook event deliveries
const processedWebhookEvents = new Set<string>();

// POST /api/webhooks/razorpay (Razorpay Asynchronous Webhook Processor)
app.post('/api/webhooks/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      return res.status(400).json({
        error: 'MISSING_SIGNATURE',
        message: 'Missing x-razorpay-signature header on webhook event.'
      });
    }

    const rawPayload = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const isValid = verifyRazorpayWebhookSignature(rawPayload, signature);
    if (!isValid) {
      return res.status(400).json({
        error: 'INVALID_SIGNATURE',
        message: 'Cryptographic signature verification failed for Razorpay webhook.'
      });
    }

    const event = req.body;
    const eventId = (req.headers['x-razorpay-event-id'] as string) ||
      event.id ||
      crypto.createHash('sha256').update(rawPayload).digest('hex');

    // Idempotency: skip already-processed events
    if (processedWebhookEvents.has(eventId)) {
      return res.status(200).json({
        status: 'ok',
        event: event.event,
        alreadyProcessed: true,
        message: 'Webhook event was previously processed idempotently.'
      });
    }

    const eventType = event.event;

    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const orderId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = event.payload?.payment?.entity?.id;
      if (orderId) {
        const order = db.findPaymentOrderByRazorpayId(orderId);
        if (order && order.status === OrderStatus.CREATED) {
          try {
            await db.rechargeWallet(
              order.userId,
              order.amount,
              paymentId || `pay_wh_${Date.now()}`,
              orderId
            );
          } catch (settleErr: any) {
            console.error('[WEBHOOK] Order settlement warning:', settleErr.message);
          }
        }
      }
    } else if (eventType === 'subscription.charged' || eventType === 'subscription.activated') {
      const subEntity = event.payload?.subscription?.entity;
      const customerEmail = subEntity?.customer_email || subEntity?.notes?.email;
      if (customerEmail) {
        const user = await db.findUserByEmail(customerEmail);
        if (user) {
          const tier = subEntity?.notes?.tier === 'PREMIUM' ? 'PREMIUM' : 'PLUS';
          const billing = subEntity?.notes?.billing === 'annual' ? 'ANNUAL' : 'MONTHLY';
          await db.updateSubscription(user.id, tier, billing, billing === 'ANNUAL' ? 365 : 30);
        }
      }
    } else if (eventType === 'subscription.cancelled') {
      const subEntity = event.payload?.subscription?.entity;
      const customerEmail = subEntity?.customer_email || subEntity?.notes?.email;
      if (customerEmail) {
        const user = await db.findUserByEmail(customerEmail);
        if (user) {
          await db.cancelSubscription(user.id);
        }
      }
    }

    // Record processed event to prevent duplicate execution
    processedWebhookEvents.add(eventId);

    return res.status(200).json({
      status: 'ok',
      event: eventType,
      processed: true
    });
  } catch (err: any) {
    console.error('[WEBHOOK] Error processing Razorpay webhook:', err);
    return res.status(500).json({
      error: 'WEBHOOK_PROCESSING_FAILED',
      message: 'Internal server error while processing webhook.'
    });
  }
});

// GET /api/billing/status (Active tier, subscription renewal, wallet balance, and entitlements)
app.get('/api/billing/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
    }
    const snapshot = EntitlementManager.getEntitlementSnapshot(user);

    res.json({
      userId: user.id,
      tier: snapshot.tier,
      subscriptionStatus: snapshot.subscriptionStatus,
      subscriptionExpiresAt: snapshot.expiresAt,
      walletBalance: user.walletBalance || 0,
      currency: 'INR',
      entitlements: snapshot,
      billingCycle: snapshot.billingPeriod || (snapshot.subscriptionStatus === 'ACTIVE' ? 'monthly' : null)
    });
  } catch (err: any) {
    handleServiceError(res, err, 'Failed to fetch billing status');
  }
});

// GET /api/billing/history (User payment orders and wallet statement history)
app.get('/api/billing/history', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const orders = db.getUserPaymentOrders(userId);
    const statement = await db.getWalletStatement(userId);

    res.json({
      userId,
      orders,
      ledger: statement,
      totalOrders: orders.length,
      totalTransactions: statement.length
    });
  } catch (err: any) {
    handleServiceError(res, err, 'Failed to fetch billing history');
  }
});

// Helper to validate and normalize inline birth profile payloads with strict coordinate and format bounds
function validateProfileInputData(pd: any): { error?: string; message?: string; cleanData?: any } {
  if (!pd || typeof pd !== 'object') {
    return { error: 'INVALID_PROFILE_DATA', message: 'Profile data must be an object.' };
  }
  const latRaw = pd.latitude ?? pd.lat;
  const lonRaw = pd.longitude ?? pd.lon;
  if (latRaw !== undefined) {
    const lat = Number(latRaw);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { error: 'INVALID_COORDINATES', message: 'Latitude must be a valid number between -90 and 90.' };
    }
  }
  if (lonRaw !== undefined) {
    const lon = Number(lonRaw);
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      return { error: 'INVALID_COORDINATES', message: 'Longitude must be a valid number between -180 and 180.' };
    }
  }
  const dob = pd.dateOfBirth || pd.dob;
  if (dob) {
    const parsedDob = Date.parse(dob);
    if (isNaN(parsedDob)) {
      return { error: 'INVALID_BIRTH_DATA', message: 'Date of birth must be a valid parseable date string (YYYY-MM-DD).' };
    }
  }
  const tob = pd.timeOfBirth || pd.tob;
  if (tob) {
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(tob).trim())) {
      return { error: 'INVALID_BIRTH_DATA', message: 'Time of birth must be in valid HH:MM 24-hour format.' };
    }
  }
  return {
    cleanData: {
      profileName: pd.profileName || pd.name || 'Primary Profile',
      relationship: pd.relationship || 'Self',
      dateOfBirth: dob || '1995-01-01',
      timeOfBirth: tob || '12:00',
      birthplaceName: pd.birthplaceName || pd.city || 'New Delhi, India',
      latitude: Number(latRaw ?? 28.6139),
      longitude: Number(lonRaw ?? 77.2090),
      resolvedTimezone: pd.resolvedTimezone || pd.timezone || 'Asia/Kolkata'
    }
  };
}

// POST /api/reports/order (Create order for individual personalized report)
app.post('/api/reports/order', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { productId, profileId, partnerProfileId, options, paymentMethod } = req.body;
  const user = req.user!;

  const product = REPORT_CATALOGUE[productId];
  if (!product) {
    return res.status(400).json({ error: 'INVALID_PRODUCT', message: `Product '${productId}' not found in catalogue.` });
  }

  try {
    // Verify birth profile exists and is owned by this user
    let profile = await db.getProfileById(profileId);
    if (!profile) {
      if (req.body.profileData && typeof req.body.profileData === 'object') {
        const pValidation = validateProfileInputData(req.body.profileData);
        if (pValidation.error) {
          return res.status(400).json({ error: pValidation.error, message: pValidation.message });
        }
        profile = await db.createProfile({
          userId: user.id,
          ...pValidation.cleanData,
          profileName: pValidation.cleanData.profileName || user.displayName || 'Primary Profile'
        });
      } else {
        const userProfiles = await db.getProfilesByUserId(user.id);
        if (userProfiles && userProfiles.length > 0) {
          profile = userProfiles[0];
        } else {
          return res.status(404).json({ error: 'PROFILE_NOT_FOUND', message: 'Selected birth profile not found.' });
        }
      }
    }
    if (profile.userId !== user.id && user.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: 'FORBIDDEN', message: "Cannot generate report using another user's profile." });
    }

    let partnerProfile: any = null;
    if (partnerProfileId && partnerProfileId !== 'default_partner' && partnerProfileId !== 'none') {
      partnerProfile = await db.getProfileById(partnerProfileId);
      if (!partnerProfile) {
        return res.status(404).json({ error: 'PARTNER_PROFILE_NOT_FOUND', message: 'Selected partner profile not found.' });
      }
      if (partnerProfile.userId !== user.id && user.role !== Role.SUPER_ADMIN) {
        return res.status(403).json({ error: 'FORBIDDEN', message: "Cannot generate report using another user's partner profile." });
      }
    } else if (req.body.partnerProfileData && typeof req.body.partnerProfileData === 'object') {
      const pValidation = validateProfileInputData(req.body.partnerProfileData);
      if (pValidation.error) {
        return res.status(400).json({ error: pValidation.error, message: pValidation.message });
      }
      partnerProfile = await db.createProfile({
        userId: user.id,
        ...pValidation.cleanData
      });
    }

    if (productId === 'report_kundli_milan') {
      if (!partnerProfile) {
        return res.status(400).json({
          error: 'MISSING_PARTNER_PROFILE',
          message: 'Kundli Milan synastry requires a distinct partner birth profile.'
        });
      }
      if (partnerProfile.id === profile.id) {
        return res.status(400).json({
          error: 'SELF_AS_PARTNER_INVALID',
          message: 'Subject profile and partner profile cannot be identical for synastry matchmaking.'
        });
      }
    }

    // Resolve user's effective subscription tier to apply legitimate member discounts
    const dbUser = await db.findUserById(user.id);
    const { tier } = EntitlementManager.resolveEffectiveTier(dbUser);
    const pricing = calculateReportPrice(productId, tier);

    // Free report product (Basic Summary)
    if (pricing.finalPricePaise === 0) {
      const doc = await ReportDocumentGenerator.generateReport(productId, dbUser, profile, { partnerProfile, ...options });
      const saved = await db.createSavedReport({
        userId: user.id,
        title: product.displayName,
        reportType: productId,
        payload: doc
      });
      return res.json({
        success: true,
        reportId: saved.id,
        title: saved.title,
        reportType: saved.reportType,
        paidAmountPaise: 0,
        discountPercent: 0,
        document: doc,
        status: 'READY_FOR_READER',
        free: true
      });
    }

    // If user opts to pay via Wallet balance
    if (paymentMethod && String(paymentMethod).toUpperCase() === 'WALLET') {
      if (Number(dbUser?.walletBalance || 0) < pricing.finalPriceRupees) {
        return res.status(400).json({
          error: 'INSUFFICIENT_FUNDS',
          message: `Insufficient wallet balance. This report requires ₹${pricing.finalPriceRupees.toFixed(2)}.`,
          requiredAmount: pricing.finalPriceRupees,
          currentBalance: dbUser?.walletBalance || 0
        });
      }

      // Debit wallet via dedicated purchaseReport mechanism with idempotency
      const clientKey = req.body.clientKey || `REPORT_${user.id}_${productId}_${Date.now()}`;
      await db.purchaseReport(user.id, product.displayName, pricing.finalPriceRupees, profile.id, clientKey);

      // Generate canonical document
      const doc = await ReportDocumentGenerator.generateReport(productId, dbUser, profile, { partnerProfile, ...options });
      const saved = await db.createSavedReport({
        userId: user.id,
        title: `${product.displayName} (${profile.profileName})`,
        reportType: productId,
        payload: doc
      });

      return res.json({
        success: true,
        reportId: saved.id,
        title: saved.title,
        reportType: saved.reportType,
        paidAmountPaise: pricing.finalPricePaise,
        discountPercent: pricing.discountPercent,
        document: doc,
        status: 'READY_FOR_READER',
        paidVia: 'WALLET',
        deduction: pricing.finalPriceRupees
      });
    }

    // If user opts to pay via DEMO Mode wallet balance (Non-production testing only)
    if (paymentMethod && (String(paymentMethod).toUpperCase() === 'DEMO_WALLET' || String(paymentMethod).toUpperCase() === 'DEMO')) {
      if (!isDemoModeActive()) {
        return res.status(403).json({
          error: 'DEMO_MODE_DISABLED',
          message: 'Demo purchases are strictly forbidden in production.'
        });
      }

      if (Number(dbUser?.demoWalletBalance || 0) < pricing.finalPriceRupees) {
        return res.status(400).json({
          error: 'INSUFFICIENT_FUNDS',
          message: `Insufficient demo wallet balance. This report requires ₹${pricing.finalPriceRupees.toFixed(2)} in demo credits.`,
          requiredAmount: pricing.finalPriceRupees,
          currentBalance: dbUser?.demoWalletBalance || 0,
          isDemo: true
        });
      }

      // Debit demo balance exclusively via purchaseReportWithDemo
      const clientKey = req.body.clientKey || `DEMO_REPORT_${user.id}_${productId}_${Date.now()}`;
      const demoResult = await db.purchaseReportWithDemo(user.id, product.displayName, pricing.finalPriceRupees, profile.id, clientKey);

      // Generate canonical document with demo notice watermark
      const doc = await ReportDocumentGenerator.generateReport(productId, dbUser, profile, {
        partnerProfile,
        isDemoPurchase: true,
        ...options
      });
      const saved = await db.createSavedReport({
        userId: user.id,
        title: `[DEMO] ${product.displayName} (${profile.profileName})`,
        reportType: productId,
        payload: doc
      });

      return res.json({
        success: true,
        reportId: saved.id,
        title: saved.title,
        reportType: saved.reportType,
        paidAmountPaise: pricing.finalPricePaise,
        discountPercent: pricing.discountPercent,
        document: doc,
        status: 'READY_FOR_READER',
        paidVia: 'DEMO_WALLET',
        deduction: pricing.finalPriceRupees,
        newDemoBalance: demoResult.newDemoBalance,
        isDemo: true
      });
    }

    // Razorpay Checkout flow
    const orderReceipt = `rep_ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let razorpayOrderId = `order_${orderReceipt}`;

    if (isRazorpayConfigured()) {
      const rzpOrder = await razorpay.orders.create({
        amount: pricing.finalPricePaise,
        currency: 'INR',
        receipt: orderReceipt,
        notes: { userId: user.id, productId, profileId }
      });
      razorpayOrderId = rzpOrder.id;
    }

    const order = await db.createPaymentOrder({
      userId: user.id,
      amount: pricing.finalPriceRupees,
      currency: 'INR',
      razorpayOrderId
    });

    res.json({
      orderId: order.razorpayOrderId,
      amountPaise: pricing.finalPricePaise,
      amountRupees: pricing.finalPriceRupees,
      discountPercent: pricing.discountPercent,
      productId,
      profileId,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_preview_key'
    });
  } catch (err: any) {
    handleServiceError(res, err, 'Report order generation failed');
  }
});

// POST /api/reports/verify-and-generate (Verify Razorpay payment and compile canonical document)
app.post('/api/reports/verify-and-generate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { orderId, paymentId, signature, productId, profileId, partnerProfileId, options } = req.body;
  const user = req.user!;

  if (!orderId || !paymentId) {
    return res.status(400).json({ error: 'MISSING_PAYMENT_DETAILS', message: 'orderId and paymentId are required.' });
  }

  const product = REPORT_CATALOGUE[productId];
  if (!product) {
    return res.status(400).json({ error: 'INVALID_PRODUCT', message: 'Product not recognized.' });
  }

  // Signature check
  if (isRazorpayConfigured() && signature) {
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    if (!isValid) {
      return res.status(400).json({ error: 'INVALID_SIGNATURE', message: 'Payment signature validation failed.' });
    }
  }

  try {
    let profile = await db.getProfileById(profileId);
    if (!profile) {
      if (req.body.profileData && typeof req.body.profileData === 'object') {
        const pValidation = validateProfileInputData(req.body.profileData);
        if (pValidation.error) {
          return res.status(400).json({ error: pValidation.error, message: pValidation.message });
        }
        profile = await db.createProfile({
          userId: user.id,
          ...pValidation.cleanData,
          profileName: pValidation.cleanData.profileName || user.displayName || 'Primary Profile'
        });
      } else {
        const userProfiles = await db.getProfilesByUserId(user.id);
        if (userProfiles && userProfiles.length > 0) {
          profile = userProfiles[0];
        } else {
          return res.status(404).json({ error: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
        }
      }
    }
    if (profile.userId !== user.id && user.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: 'FORBIDDEN', message: "Cannot generate report using another user's profile." });
    }

    let partnerProfile: any = null;
    if (partnerProfileId && partnerProfileId !== 'default_partner' && partnerProfileId !== 'none') {
      partnerProfile = await db.getProfileById(partnerProfileId);
      if (!partnerProfile) {
        return res.status(404).json({ error: 'PARTNER_PROFILE_NOT_FOUND', message: 'Selected partner profile not found.' });
      }
      if (partnerProfile.userId !== user.id && user.role !== Role.SUPER_ADMIN) {
        return res.status(403).json({ error: 'FORBIDDEN', message: "Cannot generate report using another user's partner profile." });
      }
    } else if (req.body.partnerProfileData && typeof req.body.partnerProfileData === 'object') {
      const pValidation = validateProfileInputData(req.body.partnerProfileData);
      if (pValidation.error) {
        return res.status(400).json({ error: pValidation.error, message: pValidation.message });
      }
      partnerProfile = await db.createProfile({
        userId: user.id,
        ...pValidation.cleanData
      });
    }

    if (productId === 'report_kundli_milan') {
      if (!partnerProfile) {
        return res.status(400).json({
          error: 'MISSING_PARTNER_PROFILE',
          message: 'Kundli Milan synastry requires a distinct partner birth profile.'
        });
      }
      if (partnerProfile.id === profile.id) {
        return res.status(400).json({
          error: 'SELF_AS_PARTNER_INVALID',
          message: 'Subject profile and partner profile cannot be identical for synastry matchmaking.'
        });
      }
    }

    const dbUser = await db.findUserById(user.id);
    const doc = await ReportDocumentGenerator.generateReport(productId, dbUser, profile, { partnerProfile, ...options });

    const saved = await db.createSavedReport({
      userId: user.id,
      title: `${product.displayName} (${profile.profileName})`,
      reportType: productId,
      payload: doc
    });

    await db.recordAuditEvent({
      userId: user.id,
      action: 'REPORT_PURCHASED_AND_GENERATED',
      targetType: 'SAVED_REPORT',
      targetId: saved.id,
      metadata: {
        productId,
        profileId,
        orderId,
        paymentId
      }
    });

    res.json({
      success: true,
      reportId: saved.id,
      status: 'READY_FOR_READER',
      paidVia: 'RAZORPAY'
    });
  } catch (err: any) {
    handleServiceError(res, err, 'Report verification and compilation failed');
  }
});

// POST /api/ai-astrologer/consume-quota (Server-side daily question limit enforcement)
app.post('/api/ai-astrologer/consume-quota', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.id);
    const { tier } = EntitlementManager.resolveEffectiveTier(user);
    const result = EntitlementManager.consumeAiQuery(req.user!.id, tier);
    res.json({
      success: true,
      usedToday: result.usedToday,
      consumedToday: result.usedToday,
      totalAllowed: result.totalAllowed,
      allowedLimit: result.totalAllowed,
      limit: result.totalAllowed,
      remaining: result.remaining,
      remainingToday: result.remaining
    });
  } catch (err: any) {
    if (err.code === 'AI_QUOTA_EXCEEDED') {
      return res.status(429).json({
        error: 'DAILY_AI_QUOTA_EXCEEDED',
        message: err.message,
        tier: err.tier,
        dailyLimit: err.dailyLimit,
        allowedLimit: err.dailyLimit,
        upgradeRequired: err.upgradeRequired
      });
    }
    handleServiceError(res, err, 'Quota check failed');
  }
});

// ==================== 7.5 NUMEROLOGY & NAME CORRECTION API ====================

app.post('/api/numerology/analyze', async (req: Request, res: Response) => {
  const { name, birthDate, dateOfBirth, calculationSpelling, analysisTarget, phoneNumber, language } = req.body;
  const targetDob = birthDate || dateOfBirth;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'NAME_REQUIRED', message: 'Name string is required.' });
  }
  if (!targetDob || typeof targetDob !== 'string') {
    return res.status(400).json({ error: 'BIRTH_DATE_REQUIRED', message: 'Valid ISO birthDate (YYYY-MM-DD) is required.' });
  }

  // Optional authentication check for tier resolution & quota consumption
  let user: any = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1].trim();
    const tokenHash = hashToken(token);
    const session = await db.findSessionByTokenHash(tokenHash);
    if (session) {
      user = await db.findUserById(session.userId);
    }
  }

  const { tier } = EntitlementManager.resolveEffectiveTier(user);

  try {
    if (analysisTarget === 'business_name' || analysisTarget === 'mobile_number') {
      EntitlementManager.assertBusinessOrMobileAllowed(tier);
    }

    if (user) {
      EntitlementManager.consumeNumerologyCheck(user.id, tier);
    }

    const targetName = (calculationSpelling || name).trim();
    if (analysisTarget === 'mobile_number') {
      if (!phoneNumber) return res.status(400).json({ error: 'PHONE_REQUIRED', message: 'phoneNumber is required.' });
      const digits = String(phoneNumber).replace(/\D/g, '');
      const calcDigits = digits.slice(-10);
      const total = calcDigits.split('').map(Number).reduce((a, b) => a + b, 0);
      const root = digitRoot1To9(total);
      const pInfo = PLANET_DATA[root] || PLANET_DATA[1];
      return res.json({
        success: true,
        target: 'mobile_number',
        digitCount: calcDigits.length,
        compoundTotal: total,
        reducedNumber: root,
        governingPlanetEn: pInfo.planetEn,
        governingPlanetHi: pInfo.planetHi,
        luckyColorsEn: pInfo.luckyColorsEn,
        luckyColorsHi: pInfo.luckyColorsHi,
        sanitizedDisplay: `...${calcDigits.slice(-4)}`
      });
    }

    const day = parseInt(targetDob.slice(8, 10), 10);
    const moolank = calculateMoolank(day);
    const bhagyank = calculateBhagyank(targetDob);
    const naamank = calculateNaamank(targetName);
    const harmony = calculateHarmonyScore(moolank, bhagyank.destinyNumber, naamank.chaldean.compoundTotal);

    const planetM = PLANET_DATA[moolank] || PLANET_DATA[1];
    const planetB = PLANET_DATA[bhagyank.destinyNumber] || PLANET_DATA[1];
    const planetN = PLANET_DATA[naamank.chaldean.naamank] || PLANET_DATA[1];

    res.json({
      success: true,
      originalName: name,
      calculationSpelling: targetName,
      birthDate: targetDob,
      birthNumber: {
        value: moolank,
        title: 'Moolank (Psychic / Birth Number)',
        titleHi: 'मूलांक (जन्मांक)',
        governingPlanet: planetM.planetEn,
        governingPlanetHi: planetM.planetHi,
        archetype: planetM.archetypeEn,
        archetypeHi: planetM.archetypeHi,
        qualities: planetM.qualitiesEn,
        qualitiesHi: planetM.qualitiesHi,
        element: planetM.elementEn
      },
      destinyNumber: {
        value: bhagyank.destinyNumber,
        masterNumber: bhagyank.masterNumber,
        totalCompound: bhagyank.totalSum,
        title: 'Bhagyank (Destiny / Life Path Number)',
        titleHi: 'भाग्यांक (जीवन पथ अंक)',
        governingPlanet: planetB.planetEn,
        governingPlanetHi: planetB.planetHi,
        archetype: planetB.archetypeEn,
        archetypeHi: planetB.archetypeHi
      },
      nameNumbers: {
        chaldean: {
          naamank: naamank.chaldean.naamank,
          compoundTotal: naamank.chaldean.compoundTotal,
          breakdown: naamank.chaldean.breakdown,
          system: 'Chaldean (Vedic Standard)',
          governingPlanet: planetN.planetEn,
          governingPlanetHi: planetN.planetHi,
          isPreferred: naamank.chaldean.isPreferred,
          isChallenging: naamank.chaldean.isChallenging
        },
        pythagorean: {
          naamank: naamank.pythagorean.naamank,
          compoundTotal: naamank.pythagorean.compoundTotal,
          breakdown: naamank.pythagorean.breakdown,
          system: 'Pythagorean'
        }
      },
      harmony,
      favorableElements: {
        luckyColors: planetM.luckyColorsEn,
        luckyColorsHi: planetM.luckyColorsHi,
        luckyDays: planetM.luckyDaysEn,
        luckyDaysHi: planetM.luckyDaysHi,
        luckyGemstone: planetM.luckyGemEn,
        luckyGemstoneHi: planetM.luckyGemHi
      },
      userTier: tier
    });
  } catch (err: any) {
    if (err.code === 'NUMEROLOGY_QUOTA_EXCEEDED' || err.code === 'UPGRADE_REQUIRED') {
      return res.status(403).json({
        error: err.code,
        message: err.message,
        tier: err.tier,
        upgradeRequired: err.upgradeRequired
      });
    }
    handleServiceError(res, err, 'Numerology analysis failed');
  }
});

app.post('/api/numerology/correct-name', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { name, birthDate, dateOfBirth, calculationSpelling, candidateCount, moonNakshatra, gender } = req.body;
  const targetDob = birthDate || dateOfBirth;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'NAME_REQUIRED', message: 'Name string is required.' });
  }
  if (!targetDob || typeof targetDob !== 'string') {
    return res.status(400).json({ error: 'BIRTH_DATE_REQUIRED', message: 'Valid birthDate (YYYY-MM-DD) is required.' });
  }

  const user = await db.findUserById(req.user!.id);
  const { tier } = EntitlementManager.resolveEffectiveTier(user);

  try {
    EntitlementManager.assertNameCorrectionAllowed(tier);

    const targetName = (calculationSpelling || name).trim().toUpperCase();
    const day = parseInt(targetDob.slice(8, 10), 10);
    const moolank = calculateMoolank(day);
    const bhagyank = calculateBhagyank(targetDob);
    const baseNaam = calculateNaamank(targetName);
    const baseHarmony = calculateHarmonyScore(moolank, bhagyank.destinyNumber, baseNaam.chaldean.compoundTotal);

    // Bounded candidate generation in TypeScript
    const words = targetName.split(' ');
    const firstName = words[0];
    const surname = words.slice(1).join(' ');

    const variations: { name: string; noteEn: string; noteHi: string }[] = [];
    const vTransforms: [string, string][] = [['A', 'AA'], ['I', 'EE'], ['E', 'EE'], ['U', 'OO']];
    for (const [o, n] of vTransforms) {
      if (firstName.includes(o)) {
        const v = firstName.replace(o, n);
        variations.push({ name: `${v} ${surname}`.trim(), noteEn: `Vowel expansion (${o} -> ${n})`, noteHi: `स्वर विस्तार (${o} -> ${n})` });
      }
    }

    const hPairs: [string, string][] = [['S', 'SH'], ['K', 'KH'], ['D', 'DH'], ['T', 'TH'], ['R', 'RH']];
    for (const [o, n] of hPairs) {
      if (firstName.includes(o) && !firstName.includes(o + 'H')) {
        const v = firstName.replace(o, n);
        variations.push({ name: `${v} ${surname}`.trim(), noteEn: `Phonetic harmonizer (${o} -> ${n})`, noteHi: `ध्वनि सामंजस्य (${o} -> ${n})` });
      }
    }

    if (!firstName.endsWith('A') && !firstName.endsWith('H')) {
      variations.push({ name: `${firstName}A ${surname}`.trim(), noteEn: "Terminal 'A' resonant harmonic", noteHi: "अंतिम 'A' स्वर कम्पन" });
      variations.push({ name: `${firstName}H ${surname}`.trim(), noteEn: "Terminal 'H' breath harmonizer", noteHi: "अंतिम 'H' प्राण संतुलन" });
    }

    const dCons = ['N', 'R', 'L', 'M', 'S'];
    for (const c of dCons) {
      if (firstName.includes(c) && !firstName.includes(c + c)) {
        const v = firstName.replace(c, c + c);
        variations.push({ name: `${v} ${surname}`.trim(), noteEn: `Resonant doubling of '${c}'`, noteHi: `'${c}' का पुनरावृत्ति संतुलन` });
      }
    }

    const candidates: any[] = [];
    const seenCompounds = new Set<number>();
    const countLimit = Math.min(Math.max(Number(candidateCount) || 5, 1), 5);

    for (const v of variations) {
      try {
        const calc = calculateNaamank(v.name);
        const comp = calc.chaldean.compoundTotal;
        const harm = calculateHarmonyScore(moolank, bhagyank.destinyNumber, comp);
        if (!seenCompounds.has(comp) || candidates.length < countLimit) {
          seenCompounds.add(comp);
          candidates.push({
            proposedName: v.name,
            alterationNoteEn: v.noteEn,
            alterationNoteHi: v.noteHi,
            chaldeanCompound: comp,
            chaldeanNaamank: calc.chaldean.naamank,
            pythagoreanCompound: calc.pythagorean.compoundTotal,
            pythagoreanNaamank: calc.pythagorean.naamank,
            governingPlanetEn: calc.chaldean.governingPlanet,
            harmonyScore: harm.score,
            alignmentTierEn: harm.alignmentTierEn,
            alignmentTierHi: harm.alignmentTierHi,
            isPreferredCompound: calc.chaldean.isPreferred
          });
          if (candidates.length >= countLimit) break;
        }
      } catch (_) {}
    }

    candidates.sort((a, b) => b.harmonyScore - a.harmonyScore);

    res.json({
      success: true,
      originalName: name,
      calculationSpelling: targetName,
      birthDate,
      baselineMoolank: moolank,
      baselineBhagyank: bhagyank.destinyNumber,
      baselineChaldeanCompound: baseNaam.chaldean.compoundTotal,
      baselineHarmonyScore: baseHarmony.score,
      baselineAlignmentTierEn: baseHarmony.alignmentTierEn,
      baselineAlignmentTierHi: baseHarmony.alignmentTierHi,
      candidatesCount: candidates.length,
      candidates
    });
  } catch (err: any) {
    if (err.code === 'PREMIUM_REQUIRED') {
      return res.status(403).json({
        error: 'PREMIUM_REQUIRED',
        message: err.message,
        upgradeRequired: SubscriptionTier.PREMIUM
      });
    }
    handleServiceError(res, err, 'Name correction failed');
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
    guestModeAvailable: true,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ready', (_req: Request, res: Response) => {
  const pStatus = db.getPersistenceStatus();
  if (pStatus.isProduction && !pStatus.durable) {
    return res.status(503).json({
      status: 'NOT_READY',
      error: 'DATABASE_CONFIGURATION_REQUIRED',
      message: 'Production deployment requires DATABASE_URL environment variable for durable PostgreSQL persistence.',
      durable: false,
      guestModeAvailable: true
    });
  }
  return res.json({ status: 'READY', persistence: pStatus.mode, guestModeAvailable: true });
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
