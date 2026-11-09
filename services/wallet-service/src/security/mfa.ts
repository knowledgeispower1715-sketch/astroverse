import crypto from 'crypto';

// =============================================================================
// ASTROVERSE MULTI-FACTOR AUTHENTICATION (MFA) & TOTP ENGINE (RFC 6238)
// =============================================================================
// Zero external dependencies: Built strictly with Node.js native crypto
// =============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to RFC 3548 / RFC 4648 Base32 string
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string to Buffer
 */
export function base32Decode(input: string): Buffer {
  const cleanInput = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleanInput[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically secure 160-bit Base32 secret for TOTP
 */
export function generateTotpSecret(): { secret: string; otpauthUrl: (accountName: string, issuer?: string) => string } {
  const buffer = crypto.randomBytes(20); // 160 bits
  const secret = base32Encode(buffer);

  return {
    secret,
    otpauthUrl: (accountName: string, issuer = 'AstroVerse') => {
      const encodedIssuer = encodeURIComponent(issuer);
      const encodedAccount = encodeURIComponent(accountName);
      return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
    }
  };
}

/**
 * Generates an RFC 6238 TOTP 6-digit code for a given epoch time
 */
export function generateTotpCode(secretBase32: string, timestampMs = Date.now(), timeStepSeconds = 30): string {
  const key = base32Decode(secretBase32);
  const timeStep = Math.floor(timestampMs / 1000 / timeStepSeconds);

  // Time step as 8-byte big-endian integer
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;

  return String(codeInt).padStart(6, '0');
}

/**
 * Verifies a candidate TOTP token allowing clock skew window of +/- 2 time steps (60s)
 * Automatically strips whitespace and hyphens, and uses constant-time comparison
 */
export function verifyTotpCode(secretBase32: string, candidateToken: string, window = 2): boolean {
  if (!candidateToken) {
    return false;
  }

  const cleanToken = String(candidateToken).replace(/[\s-]/g, '').trim();
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  const now = Date.now();

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const testTime = now + errorWindow * 30 * 1000;
    const generated = generateTotpCode(secretBase32, testTime);
    // Constant-time comparison to prevent timing attacks
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(generated))) {
      return true;
    }
  }

  return false;
}

/**
 * Generates single-use backup recovery codes
 */
export function generateMfaRecoveryCodes(count = 8): { plaintextCodes: string[]; hashedCodes: string[] } {
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `${part1}-${part2}`;
    plaintextCodes.push(code);
    hashedCodes.push(crypto.createHash('sha256').update(code).digest('hex'));
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Verifies and consumes a recovery code
 * Tolerates codes entered with or without hyphens and spaces
 */
export function verifyAndConsumeRecoveryCode(hashedCodes: string[], candidateCode: string): { valid: boolean; remainingHashedCodes: string[] } {
  if (!candidateCode || !Array.isArray(hashedCodes) || hashedCodes.length === 0) {
    return { valid: false, remainingHashedCodes: hashedCodes || [] };
  }

  const cleanCode = String(candidateCode).replace(/[\s]/g, '').toUpperCase();
  const candidatesToMatch = [cleanCode];

  // If candidate was entered without a hyphen, test with hyphen inserted in the middle
  if (!cleanCode.includes('-')) {
    if (cleanCode.length === 12) {
      candidatesToMatch.push(`${cleanCode.slice(0, 6)}-${cleanCode.slice(6)}`);
    } else if (cleanCode.length === 8) {
      candidatesToMatch.push(`${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`);
    }
  }

  let matchedIndex = -1;
  for (const c of candidatesToMatch) {
    const candidateHash = crypto.createHash('sha256').update(c).digest('hex');
    const idx = hashedCodes.findIndex(h => h === candidateHash);
    if (idx !== -1) {
      matchedIndex = idx;
      break;
    }
  }

  if (matchedIndex === -1) {
    return { valid: false, remainingHashedCodes: hashedCodes };
  }

  const remaining = [...hashedCodes];
  remaining.splice(matchedIndex, 1);
  return { valid: true, remainingHashedCodes: remaining };
}

// =============================================================================
// STEP-UP ASSURANCE TOKENS FOR SENSITIVE ADMINISTRATIVE ACTIONS
// =============================================================================
// Once MFA is verified, an admin is granted a short-lived (15 min) step-up
// assurance token required for high-impact mutations (role changes, refunds, etc.)
// =============================================================================

export const ALLOWED_ASSURANCE_SCOPES = [
  'ADMIN_MUTATION',
  'USER_MANAGEMENT',
  'FINANCIAL_OPERATIONS',
  'SECURITY_ADMIN',
  'SYSTEM_CONFIG',
  'ALL'
] as const;

export type AllowedAssuranceScope = typeof ALLOWED_ASSURANCE_SCOPES[number] | string;

let ephemeralSecret: string | null = null;

export function getAssuranceSigningSecret(): string {
  const secret = process.env.ADMIN_MFA_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.CASHFREE_SECRET_KEY;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (isProd) {
    throw new Error('[SECURITY_CRITICAL] ADMIN_MFA_SECRET, JWT_SECRET, or SUPABASE_SECRET_KEY must be configured with at least 32 characters in production.');
  }

  if (!ephemeralSecret) {
    ephemeralSecret = crypto.randomBytes(64).toString('hex');
  }
  return ephemeralSecret;
}

const ASSURANCE_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes

export interface AdminAssurancePayload {
  jti: string;
  userId: string;
  role: string;
  scope: string;
  issuedAt: number;
  expiresAt: number;
}

const revokedAssuranceTokens = new Set<string>();

export function revokeAdminAssuranceToken(tokenOrJti: string): void {
  if (tokenOrJti && typeof tokenOrJti === 'string') {
    revokedAssuranceTokens.add(tokenOrJti.trim());
  }
}

export function isAssuranceTokenRevoked(tokenOrJti: string): boolean {
  if (!tokenOrJti || typeof tokenOrJti !== 'string') return false;
  return revokedAssuranceTokens.has(tokenOrJti.trim());
}

export function clearRevokedAssuranceTokens(): void {
  revokedAssuranceTokens.clear();
}

export function isScopeSatisfied(payloadScope: string | undefined, requiredScope?: string): boolean {
  if (!requiredScope || requiredScope === 'ADMIN_MUTATION') {
    return true;
  }
  if (!payloadScope) return false;
  if (payloadScope === 'ALL' || payloadScope === 'SECURITY_ADMIN') return true;
  if (payloadScope === requiredScope) return true;

  // Domain-level scope hierarchy
  if (payloadScope === 'FINANCIAL_OPERATIONS') {
    return ['wallet:adjust', 'pricing:update', 'gateway:credentials', 'payments:refund'].includes(requiredScope);
  }
  if (payloadScope === 'USER_MANAGEMENT') {
    return ['users:manage', 'entitlements:grant', 'entitlements:revoke', 'subscriptions:assign', 'subscriptions:extend', 'subscriptions:cancel'].includes(requiredScope);
  }
  if (payloadScope === 'SYSTEM_CONFIG') {
    return ['content:manage', 'privacy:manage', 'reports:retry', 'flags:manage'].includes(requiredScope);
  }
  return payloadScope === 'ADMIN_MUTATION';
}

export function issueAdminAssuranceToken(
  userId: string,
  role: string,
  scope: AllowedAssuranceScope = 'ADMIN_MUTATION',
  customJti?: string
): string {
  const now = Date.now();
  const jti = customJti || crypto.randomUUID();
  const payload: AdminAssurancePayload = {
    jti,
    userId,
    role,
    scope: scope || 'ADMIN_MUTATION',
    issuedAt: now,
    expiresAt: now + ASSURANCE_LIFETIME_MS
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', getAssuranceSigningSecret()).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

export function verifyAdminAssuranceToken(
  token: string | undefined,
  requiredScope?: string
): AdminAssurancePayload | null {
  if (!token || typeof token !== 'string') return null;

  if (isAssuranceTokenRevoked(token)) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  let expectedSig: string;
  try {
    expectedSig = crypto.createHmac('sha256', getAssuranceSigningSecret()).update(payloadBase64).digest('base64url');
  } catch {
    return null;
  }

  try {
    const isSigValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!isSigValid) return null;

    const payload: AdminAssurancePayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }

    if (payload.jti && isAssuranceTokenRevoked(payload.jti)) {
      return null; // Revoked by JTI
    }

    if (requiredScope && !isScopeSatisfied(payload.scope, requiredScope)) {
      return null; // Insufficient scope
    }

    return payload;
  } catch {
    return null;
  }
}
