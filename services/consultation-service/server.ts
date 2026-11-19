import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';

// 1. Environment & Configuration
const PORT = parseInt(process.env.PORT || '4000', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:5000';

const isProduction =
  (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') &&
  process.env.VERCEL_ENV !== 'preview';
const rawInternalKey = (
  process.env.INTERNAL_SERVICE_KEY ||
  process.env.ASTROVERSE_INTERNAL_KEY ||
  ''
).trim();

if (isProduction) {
  if (
    !rawInternalKey ||
    rawInternalKey === 'astroverse-consultation-internal-secret-2026' ||
    rawInternalKey.length < 16
  ) {
    throw new Error(
      '[CRITICAL_SECURITY_HALT] Valid INTERNAL_SERVICE_KEY or ASTROVERSE_INTERNAL_KEY (min 16 chars) is mandatory in production.'
    );
  }
}
const INTERNAL_SERVICE_KEY = rawInternalKey || 'astroverse-consultation-internal-secret-2026';

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'https://astroverse-eta.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:3000'];

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => (times > 5 ? null : Math.min(times * 100, 2000)),
  lazyConnect: true,
});

// Guard against unhandled EventEmitter errors during disconnect/reconnect
redis.on('error', (err: any) => {
  console.warn('[REDIS_CLIENT_ERROR] Redis connection issue:', err?.message || err);
});

redis.connect().catch((err) => {
  console.warn('[REDIS_WARNING] Redis connection failed, proceeding with fallback:', err.message);
});

const billingLuaPath = path.resolve(__dirname, 'billing.lua');
const billingLua = fs.existsSync(billingLuaPath)
  ? fs.readFileSync(billingLuaPath, 'utf8')
  : `local balance = tonumber(redis.call('GET', KEYS[1]) or "0")\nlocal rate = tonumber(ARGV[1])\nif balance < rate then return {-1, balance} end\nlocal new_balance = balance - rate\nredis.call('SET', KEYS[1], tostring(new_balance))\nreturn {1, new_balance}`;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('CORS origin unauthorized'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 2. Types & Interfaces
export interface ActiveConsultation {
  sessionId: string;
  userId: string;
  astrologerId: string;
  ratePerMinute: number;
  minutesConsumed: number;
  socketId: string;
  timerInterval?: NodeJS.Timeout;
}

export interface StartConsultationPayload {
  sessionId: string;
  userId?: string;
  astrologerId: string;
  ratePerMinute: number;
}

export interface EndConsultationPayload {
  sessionId: string;
}

const activeSessions = new Map<string, ActiveConsultation>();

// 3. Socket.IO Authentication Middleware
io.use(async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    const headerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    const rawToken = socket.handshake.auth?.token || headerToken || socket.handshake.query?.token;
    const token = typeof rawToken === 'string' ? rawToken.trim() : null;

    if (!token) {
      return next(new Error('Authentication error: Authentication token required.'));
    }

    let verifiedUserId: string | null = null;
    let userDetails: any = null;

    // A. Synthetic Test Tokens (strictly scoped to test environment)
    if (process.env.NODE_ENV === 'test' && token.startsWith('test_')) {
      if (token.startsWith('test_supabase_token_')) {
        const parts = token.split('_');
        const uid = parts[5] || '12345678-0000-0000-0000-000000000001';
        verifiedUserId = 'supa-usr-' + uid;
        userDetails = { id: verifiedUserId, email: parts[4] || 'supabase.user@example.com' };
      } else if (token.startsWith('test_token_')) {
        verifiedUserId = token.replace('test_token_', '');
        userDetails = { id: verifiedUserId, email: `${verifiedUserId}@test.local` };
      } else {
        verifiedUserId = token;
        userDetails = { id: verifiedUserId, email: `${verifiedUserId}@test.local` };
      }
      socket.data.userId = verifiedUserId;
      socket.data.user = userDetails;
      socket.data.token = token;
      return next();
    }

    // Pre-check expiration for well-formed JWT structures (fast fail for expired tokens)
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
          const payload = JSON.parse(payloadJson);
          if (payload && typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
            return next(new Error('Authentication error: Token has expired.'));
          }
        } catch {
          // Malformed payloads fall through to authoritative verification
        }
      }
    }

    // B. Optional Cryptographic Supabase JWT Verification (if secret configured)
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (supabaseJwtSecret && token.includes('.')) {
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const [headerB64, payloadB64, signatureB64] = parts;
          const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
          if (header.alg === 'HS256') {
            const expectedSig = crypto
              .createHmac('sha256', supabaseJwtSecret)
              .update(`${headerB64}.${payloadB64}`)
              .digest('base64url');
            if (
              signatureB64.length === expectedSig.length &&
              crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSig))
            ) {
              const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
              if (payload && payload.sub) {
                verifiedUserId = payload.sub;
                userDetails = { id: payload.sub, email: payload.email };
              }
            } else {
              return next(new Error('Authentication error: Invalid token signature.'));
            }
          }
        } catch (jwtErr: any) {
          if (jwtErr.message?.startsWith('Authentication error:')) {
            return next(jwtErr);
          }
        }
      }
    }

    // C. Authoritative Verification via Wallet Service /api/user/me
    // Primary cryptographic verification path for Supabase JWTs & Prisma DB sessions
    if (!verifiedUserId) {
      try {
        const verifyRes = await axios.get(`${WALLET_SERVICE_URL}/api/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 4000,
        });
        if (verifyRes.status === 200 && verifyRes.data?.id) {
          verifiedUserId = verifyRes.data.id;
          userDetails = verifyRes.data;
        }
      } catch (verifyErr: any) {
        const status = verifyErr.response?.status;
        if (status === 401 || status === 403) {
          return next(new Error('Authentication error: Invalid or expired session.'));
        }
        return next(new Error(`Authentication error: Auth verification failed (${verifyErr.message})`));
      }
    }

    if (!verifiedUserId) {
      return next(new Error('Authentication error: Unauthorized credentials.'));
    }

    socket.data.userId = verifiedUserId;
    socket.data.user = userDetails;
    socket.data.token = token;
    next();
  } catch (err: any) {
    next(new Error(`Authentication error: ${err.message || 'Internal authentication failure'}`));
  }
});

// 4. Session Finalization & Resilient Settlement
export async function finalizeSession(session: ActiveConsultation) {
  if (session.timerInterval) {
    clearInterval(session.timerInterval);
    session.timerInterval = undefined;
  }
  activeSessions.delete(session.sessionId);

  const totalDeducted = Math.round(session.minutesConsumed * session.ratePerMinute * 100) / 100;

  if (totalDeducted > 0) {
    const settleUrl = new URL('/api/wallet/settle-consultation', WALLET_SERVICE_URL).toString();
    const settlementPayload = {
      sessionId: session.sessionId,
      userId: session.userId,
      astrologerId: session.astrologerId,
      duration: session.minutesConsumed * 60,
      durationMinutes: session.minutesConsumed,
      durationSeconds: session.minutesConsumed * 60,
      totalDeduction: totalDeducted,
      amount: totalDeducted,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': INTERNAL_SERVICE_KEY,
      'x-astroverse-internal-key': INTERNAL_SERVICE_KEY,
    };

    let settled = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!settled && attempts < maxAttempts) {
      attempts++;
      try {
        await axios.post(settleUrl, settlementPayload, {
          headers,
          timeout: 5000,
        });
        settled = true;
      } catch (err: any) {
        const status = err.response?.status;
        console.error(
          `[SETTLEMENT_SYNC_ERROR] Session ${session.sessionId} (Attempt ${attempts}/${maxAttempts}, HTTP ${status || 'NET'}):`,
          err.response?.data || err.message
        );
        if (status === 401 || status === 403) {
          // Unrecoverable authorization error on internal key
          break;
        }
        if (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempts * 500));
        }
      }
    }

    if (!settled) {
      console.error(`[CRITICAL_SETTLEMENT_FAILURE] Session ${session.sessionId} could not be settled after ${attempts} attempts. Queuing to Redis dead-letter queue.`);
      try {
        await redis.lpush(
          'dead_letter:failed_settlements',
          JSON.stringify({
            sessionId: session.sessionId,
            userId: session.userId,
            astrologerId: session.astrologerId,
            totalDeducted,
            minutesConsumed: session.minutesConsumed,
            failedAt: new Date().toISOString(),
          })
        );
      } catch (redisErr: any) {
        console.error(`[DEAD_LETTER_WRITE_FAILED] Could not persist failed settlement to Redis:`, redisErr.message);
      }
    }
  }
}

// 5. Socket Connection Lifecycle Handlers
io.on('connection', (socket: Socket) => {
  const authenticatedUserId = socket.data.userId;

  socket.on('start_consultation', ({ sessionId, userId, astrologerId, ratePerMinute }: StartConsultationPayload) => {
    if (!sessionId || !astrologerId || !ratePerMinute || ratePerMinute <= 0) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Missing or invalid consultation parameters.' });
      return;
    }

    // Strict identity enforcement: Client cannot claim a different userId than authenticated in handshake
    const boundUserId = authenticatedUserId;
    if (userId && userId !== boundUserId) {
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Cannot initiate consultation session on behalf of another user.',
      });
      return;
    }

    // Guard against duplicate session interval leak
    if (activeSessions.has(sessionId)) {
      const existing = activeSessions.get(sessionId)!;
      if (existing.userId !== boundUserId) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: 'Cannot overwrite active session belonging to another user.',
        });
        return;
      }
      if (existing.timerInterval) {
        clearInterval(existing.timerInterval);
        existing.timerInterval = undefined;
      }
      activeSessions.delete(sessionId);
    }

    socket.join(sessionId);

    const session: ActiveConsultation = {
      sessionId,
      userId: boundUserId,
      astrologerId,
      ratePerMinute,
      minutesConsumed: 0,
      socketId: socket.id,
    };

    session.timerInterval = setInterval(async () => {
      try {
        const result = (await redis.eval(
          billingLua,
          1,
          `user:${boundUserId}:wallet`,
          ratePerMinute.toString(),
          astrologerId
        )) as [number, number];

        const [status, remainingBalance] = result;

        if (status === -1) {
          io.to(sessionId).emit('force_hangup', { reason: 'INSUFFICIENT_FUNDS', remainingBalance });
          await finalizeSession(session);
        } else {
          session.minutesConsumed += 1;
          io.to(sessionId).emit('minute_deducted', {
            remainingBalance,
            deducted: ratePerMinute,
            minutesConsumed: session.minutesConsumed,
          });
        }
      } catch (redisEvalErr: any) {
        console.error(`[REDIS_BILLING_ERROR] Session ${sessionId}:`, redisEvalErr.message);
      }
    }, 60000);

    activeSessions.set(sessionId, session);
    socket.emit('session_active', { sessionId, userId: boundUserId });
  });

  socket.on('end_consultation', async ({ sessionId }: EndConsultationPayload) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      if (session.userId === authenticatedUserId) {
        await finalizeSession(session);
        io.to(sessionId).emit('call_ended');
      } else {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot end session belonging to another user.' });
      }
    } else {
      socket.emit('call_ended');
    }
  });

  socket.on('disconnect', async () => {
    for (const [, session] of activeSessions.entries()) {
      if (session.socketId === socket.id) {
        await finalizeSession(session);
      }
    }
  });
});

if (!httpServer.listening) {
  httpServer.listen(PORT, () => {
    console.log(`Consultation Gateway running securely on port ${PORT}`);
  });
}

export { io, httpServer, activeSessions, redis };
