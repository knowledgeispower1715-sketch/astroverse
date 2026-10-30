import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { isAuthorizedAdminEmail } from './permissions';

export interface CloudflareAccessClaims {
  aud: string | string[];
  email: string;
  exp: number;
  iat: number;
  nbf?: number;
  iss: string;
  type?: string;
  identity_nonce?: string;
  sub: string;
  country?: string;
  [key: string]: any;
}

export interface CloudflareAccessConfig {
  teamName: string;
  aud: string;
  required: boolean;
  certsUrl: string;
  expectedIssuer: string;
}

// In-memory cache for Cloudflare Access JWKS public keys
interface JwkCacheEntry {
  keys: Map<string, crypto.KeyObject>;
  expiresAt: number;
}

let jwkCache: JwkCacheEntry | null = null;
const JWK_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Synthetic test keys for unit/penetration testing
let mockJwksForTesting: { kid: string; publicKey: crypto.KeyObject }[] | null = null;

export function setMockJwksForTesting(mocks: { kid: string; publicKey: crypto.KeyObject }[] | null) {
  mockJwksForTesting = mocks;
}

export function getCloudflareAccessConfig(): CloudflareAccessConfig {
  const teamName = (process.env.CLOUDFLARE_ACCESS_TEAM_NAME || '').trim();
  const aud = (process.env.CLOUDFLARE_ACCESS_AUD || '').trim();
  
  // Explicitly require if CLOUDFLARE_ACCESS_REQUIRED is 'true'
  // Or auto-require in production if teamName and aud are configured
  const explicitlyRequired = process.env.CLOUDFLARE_ACCESS_REQUIRED === 'true';
  const explicitlyDisabled = process.env.CLOUDFLARE_ACCESS_REQUIRED === 'false';
  
  const required = explicitlyRequired || (!explicitlyDisabled && Boolean(teamName && aud && process.env.NODE_ENV === 'production'));

  return {
    teamName,
    aud,
    required,
    certsUrl: teamName ? `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs` : '',
    expectedIssuer: teamName ? `https://${teamName}.cloudflareaccess.com` : ''
  };
}

export function isCloudflareAccessEnforced(): boolean {
  const cfg = getCloudflareAccessConfig();
  return cfg.required;
}

/**
 * Base64URL decode helper
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Fetches and caches Cloudflare Access public keys from the team JWKS endpoint
 */
async function getPublicKeyForKid(kid: string, certsUrl: string): Promise<crypto.KeyObject | null> {
  // Check test mocks first
  if (mockJwksForTesting) {
    const found = mockJwksForTesting.find(m => m.kid === kid);
    if (found) return found.publicKey;
  }

  const now = Date.now();
  if (jwkCache && jwkCache.expiresAt > now) {
    return jwkCache.keys.get(kid) || null;
  }

  if (!certsUrl) return null;

  try {
    const res = await fetch(certsUrl);
    if (!res.ok) {
      console.error(`[CLOUDFLARE_ACCESS] Failed to fetch JWKS from ${certsUrl}: HTTP ${res.status}`);
      return null;
    }
    const data: any = await res.json();
    const newKeyMap = new Map<string, crypto.KeyObject>();

    if (Array.isArray(data.keys)) {
      for (const jwk of data.keys) {
        if (jwk.kid && jwk.kty === 'RSA') {
          try {
            const keyObj = crypto.createPublicKey({ key: jwk, format: 'jwk' });
            newKeyMap.set(jwk.kid, keyObj);
          } catch (err: any) {
            console.warn(`[CLOUDFLARE_ACCESS] Could not parse JWK kid ${jwk.kid}:`, err?.message);
          }
        }
      }
    }

    jwkCache = {
      keys: newKeyMap,
      expiresAt: now + JWK_CACHE_TTL_MS
    };

    return newKeyMap.get(kid) || null;
  } catch (err: any) {
    console.error(`[CLOUDFLARE_ACCESS] Network error fetching JWKS:`, err?.message);
    return null;
  }
}

/**
 * Cryptographically verifies a Cloudflare Access JWT Assertion.
 * Validates signature against team JWKS, issuer, audience, expiry, and identity.
 */
export async function verifyCloudflareAccessJwt(
  token: string,
  overrideConfig?: Partial<CloudflareAccessConfig>
): Promise<{ valid: boolean; claims?: CloudflareAccessClaims; error?: string }> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'TOKEN_REQUIRED' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'MALFORMED_JWT' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string; typ?: string };
  let payload: CloudflareAccessClaims;

  try {
    header = JSON.parse(base64UrlDecode(headerB64));
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return { valid: false, error: 'INVALID_JSON_ENCODING' };
  }

  // 1. Algorithm check: Cloudflare Access strictly signs with RS256
  if (header.alg !== 'RS256') {
    return { valid: false, error: `UNSUPPORTED_ALGORITHM: Expected RS256, received ${header.alg}` };
  }

  // 2. Key ID check
  if (!header.kid) {
    return { valid: false, error: 'MISSING_KID_IN_HEADER' };
  }

  const cfg = { ...getCloudflareAccessConfig(), ...overrideConfig };

  // 3. Expiration check (with 10-second clock skew tolerance)
  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || typeof payload.exp !== 'number' || payload.exp < (nowSec - 10)) {
    return { valid: false, error: 'TOKEN_EXPIRED' };
  }

  // 4. Not-before check
  if (payload.nbf && typeof payload.nbf === 'number' && payload.nbf > (nowSec + 10)) {
    return { valid: false, error: 'TOKEN_NOT_YET_VALID' };
  }

  // 5. Issuer check (if configured)
  if (cfg.expectedIssuer && payload.iss !== cfg.expectedIssuer) {
    return { valid: false, error: `ISSUER_MISMATCH: Expected ${cfg.expectedIssuer}, received ${payload.iss}` };
  }

  // 6. Audience check (if configured)
  if (cfg.aud) {
    const payloadAuds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!payloadAuds.includes(cfg.aud)) {
      return { valid: false, error: `AUDIENCE_MISMATCH: Token not issued for expected audience` };
    }
  }

  // 7. Identity check
  if (!payload.email || typeof payload.email !== 'string') {
    return { valid: false, error: 'MISSING_EMAIL_CLAIM' };
  }

  // 8. Cryptographic Signature Verification using RS256
  const publicKey = await getPublicKeyForKid(header.kid, cfg.certsUrl);
  if (!publicKey) {
    return { valid: false, error: `UNKNOWN_KEY_ID: Public key for kid ${header.kid} not found in JWKS` };
  }

  try {
    const signedData = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
    const signature = Buffer.from(
      signatureB64.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    const isVerified = crypto.verify('RSA-SHA256', signedData, publicKey, signature);
    if (!isVerified) {
      return { valid: false, error: 'SIGNATURE_VERIFICATION_FAILED' };
    }
  } catch (sigErr: any) {
    return { valid: false, error: `SIGNATURE_VERIFICATION_ERROR: ${sigErr?.message || sigErr}` };
  }

  return { valid: true, claims: payload };
}

/**
 * Express Middleware: Enforces Cloudflare Zero Trust Access on administrative endpoints
 * and prevents Direct-Origin Bypass via Vercel URLs.
 */
export function requireCloudflareAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cfg = getCloudflareAccessConfig();

    // Check if Cloudflare Access is enforced
    if (!cfg.required) {
      // Direct origin fallback in development or non-enforced mode
      res.setHeader('X-Origin-Security-Gateway', 'Application-Layer-Only');
      return next();
    }

    // Extract Cloudflare Access JWT Assertion from header or cookie
    const headerToken = req.headers['cf-access-jwt-assertion'] as string;
    let cookieToken: string | undefined;

    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
      if (match) {
        cookieToken = decodeURIComponent(match[1]);
      }
    }

    const token = headerToken || cookieToken;

    if (!token) {
      // Direct-Origin Bypass Attempt! Request reached Vercel origin directly without CF Access gateway.
      return res.status(403).json({
        error: 'DIRECT_ORIGIN_ACCESS_DENIED',
        message: 'Direct origin access to administrative resources is strictly forbidden. Requests must transit the Cloudflare Zero Trust Access gateway.'
      });
    }

    const verification = await verifyCloudflareAccessJwt(token);

    if (!verification.valid || !verification.claims) {
      return res.status(403).json({
        error: 'CLOUDFLARE_ACCESS_FORBIDDEN',
        message: `Cloudflare Access validation failed: ${verification.error || 'Invalid token'}`
      });
    }

    // Secondary authorization check: ensure CF Access email is present in the admin allowlist
    const userEmail = verification.claims.email.toLowerCase();
    if (!isAuthorizedAdminEmail(userEmail)) {
      return res.status(403).json({
        error: 'ADMIN_EMAIL_NOT_AUTHORIZED',
        message: 'The identity verified by Cloudflare Access is not in the server administrator allowlist.'
      });
    }

    // Attach verified Cloudflare identity to request
    (req as any).cloudflareIdentity = verification.claims;
    res.setHeader('X-Origin-Security-Gateway', 'Cloudflare-Access-Verified');

    next();
  };
}
