import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
  firstSeen: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

/**
 * High-performance, sliding-window in-memory rate limiter.
 * Automatically cleans up expired IP entries and respects test environment flags.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please wait a few moments before trying again.',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
      }
      return req.socket.remoteAddress || req.ip || '127.0.0.1';
    },
    skip = () => process.env.NODE_ENV === 'test'
  } = options;

  const storage = new Map<string, RateLimitRecord>();

  // Periodic cleanup every 5 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of storage.entries()) {
      record.timestamps = record.timestamps.filter(t => now - t < windowMs);
      if (record.timestamps.length === 0) {
        storage.delete(key);
      }
    }
  }, Math.max(60000, windowMs));

  // Allow Node.js to exit cleanly without waiting for this timer
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let record = storage.get(key);

    if (!record) {
      record = { timestamps: [now], firstSeen: now };
      storage.set(key, record);
    } else {
      // Filter out timestamps outside the sliding window
      record.timestamps = record.timestamps.filter(t => now - t < windowMs);
      record.timestamps.push(now);
    }

    const count = record.timestamps.length;
    const remaining = Math.max(0, max - count);
    const resetSeconds = Math.ceil(windowMs / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (count > max) {
      const oldestInWindow = record.timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfterSeconds: retryAfter
      });
    }

    next();
  };
}
