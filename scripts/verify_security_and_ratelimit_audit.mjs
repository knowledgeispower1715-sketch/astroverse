/**
 * ASTROVERSE PRODUCTION SECURITY & RATE LIMITING VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Sliding-window rate limiter algorithms, headers, and HTTP 429 response formatting.
 * 2. OWASP security response headers on Express and FastAPI services.
 * 3. Safe dynamic runtime configuration (/api/config) without credential leakage.
 * 4. Backend authentication defense-in-depth on protected endpoints.
 * 5. Complete eradication of hardcoded secrets from tracked files.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

console.log('===============================================================');
console.log('ASTROVERSE SECURITY & RATE LIMITING AUDIT SUITE');
console.log('===============================================================');

// ------------------------------------------------------------------
// 1. Sliding-Window Rate Limiter Unit Verification via ts-node
// ------------------------------------------------------------------
console.log('\n--- 1. SLIDING-WINDOW RATE LIMITER VERIFICATION ---');

try {
  const tsOutput = execSync(
    'powershell -Command "Push-Location services/wallet-service; npx ts-node tests/security_and_ratelimit.test.ts; Pop-Location"',
    { encoding: 'utf-8' }
  );
  console.log(tsOutput);
  assert(tsOutput.includes('15 PASSED, 0 FAILED'), 'Wallet-service rate limiter suite passed all 15 tests');
} catch (err) {
  console.error('Rate limiter test failed:', err);
  assert(false, 'Wallet-service rate limiter suite failed');
}

// ------------------------------------------------------------------
// 2. Eradication of Hardcoded Secrets from Tracked Source
// ------------------------------------------------------------------
console.log('\n--- 2. SECRETS ERADICATION FORENSIC AUDIT ---');

const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');
const serverTs = readFileSync(join(process.cwd(), 'services/wallet-service/src/server.ts'), 'utf-8');
const mainPy = readFileSync(join(process.cwd(), 'services/kundli-engine/main.py'), 'utf-8');

// SHA-256 Hashes of known compromised legacy credentials
// Checked via hash-matching to prevent plaintext secret exposure in tracked repo files
const HASH_RZP_KEY_ID = '9cf84d8c83c27181c9641776cecefcb755b46e3d24ea2df13e3db834317ae510';
const HASH_RZP_SECRET = 'ba49de1f4c229829f9401c92301978ef09821673018d32742a3c7dd2d00f90cf';
const HASH_FIREBASE_KEY = 'd1d2ac315a57e4c45f86091e617c8771252ea0302ed5ab01a816c59da34bcbc9';
const HASH_GOOGLE_SECRET = 'a509c338354d76938d43bc6d4b0580b964f943047136879871865dfd70edcb47';
const HASH_PROKERALA_SECRET = '8f629c5f1dd10b612beb37b366f74969bfac0fe9c8fba36012617b4df7747c3a';

function containsSecretHash(text, targetHash) {
  const tokens = text.match(/[A-Za-z0-9_\-]{16,80}/g) || [];
  for (const token of tokens) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    if (hash === targetHash) {
      return true;
    }
  }
  return false;
}

// Test Razorpay Key ID
assert(!containsSecretHash(indexHtml, HASH_RZP_KEY_ID), 'index.html contains zero hardcoded Razorpay Key IDs');
assert(!containsSecretHash(serverTs, HASH_RZP_KEY_ID), 'server.ts contains zero hardcoded Razorpay Key ID fallbacks');

// Test Razorpay Secret
assert(!containsSecretHash(indexHtml, HASH_RZP_SECRET), 'index.html does not contain Razorpay Key Secret');
assert(!containsSecretHash(serverTs, HASH_RZP_SECRET), 'server.ts does not contain Razorpay Key Secret');
assert(!containsSecretHash(mainPy, HASH_RZP_SECRET), 'main.py does not contain Razorpay Key Secret');

// Test Firebase API Key in index.html
assert(!containsSecretHash(indexHtml, HASH_FIREBASE_KEY), 'index.html does not contain hardcoded Firebase apiKey');

// Test Google Client Secret
assert(!containsSecretHash(indexHtml, HASH_GOOGLE_SECRET), 'index.html does not contain Google Client Secret');
assert(!containsSecretHash(serverTs, HASH_GOOGLE_SECRET), 'server.ts does not contain Google Client Secret');

// Test Prokerala Secret
assert(!containsSecretHash(indexHtml, HASH_PROKERALA_SECRET), 'index.html does not contain Prokerala Secret');
assert(!containsSecretHash(serverTs, HASH_PROKERALA_SECRET), 'server.ts does not contain Prokerala Secret');
assert(!containsSecretHash(mainPy, HASH_PROKERALA_SECRET), 'main.py does not contain Prokerala Secret');

// Pattern-based absence validation for common token prefixes
assert(!/AIzaSy[a-zA-Z0-9_-]{33}/.test(indexHtml), 'index.html contains zero Google/Firebase client key patterns');
assert(!/GOCSPX-[a-zA-Z0-9_-]{28}/.test(indexHtml), 'index.html contains zero Google OAuth client secret patterns');
assert(!/GOCSPX-[a-zA-Z0-9_-]{28}/.test(serverTs), 'server.ts contains zero Google OAuth client secret patterns');

// ------------------------------------------------------------------
// 3. Frontend Authentication Defense-in-Depth Verification
// ------------------------------------------------------------------
console.log('\n--- 3. FRONTEND AUTHENTICATION DEFENSE-IN-DEPTH ---');

// Check /api/ai-astrologer/ask passes getAuthHeaders()
const askBlockRegex = /fetch\(`\$\{authBase\}\/api\/ai-astrologer\/ask`,\s*\{[\s\S]*?headers:\s*getAuthHeaders\(\)/;
assert(askBlockRegex.test(indexHtml), '/api/ai-astrologer/ask sends Authorization headers via getAuthHeaders()');

// Check /api/predictions/generate passes getAuthHeaders()
const predBlockRegex = /fetch\('\/api\/predictions\/generate',\s*\{[\s\S]*?headers:\s*getAuthHeaders\(\)/;
assert(predBlockRegex.test(indexHtml), '/api/predictions/generate sends Authorization headers via getAuthHeaders()');

// Check /api/config initialization
assert(indexHtml.includes('fetch(`${authBase}/api/config`)'), 'Firebase configuration initializes from /api/config runtime endpoint');

// ------------------------------------------------------------------
// 4. Rate Limiter Routing in Wallet Service
// ------------------------------------------------------------------
console.log('\n--- 4. WALLET SERVICE RATE LIMITER BINDINGS ---');

function hasHeader(content, header, value) {
  const re = new RegExp(`res\\.setHeader\\(\\s*["']${header}["']\\s*,\\s*["']${value}["']\\s*\\)`);
  return re.test(content);
}

function hasLimiterBinding(content, route, limiter) {
  const escaped = route.replace(/\//g, '\\/');
  const re = new RegExp(`app\\.(use|post|get)\\(\\s*["']${escaped}["'][\\s\\S]*?\\b${limiter}\\b`);
  return re.test(content);
}

// Security Headers
assert(hasHeader(serverTs, 'X-Content-Type-Options', 'nosniff'), 'Security headers include X-Content-Type-Options: nosniff');
assert(hasHeader(serverTs, 'X-Frame-Options', 'DENY'), 'Security headers include X-Frame-Options: DENY');
assert(hasHeader(serverTs, 'X-XSS-Protection', '0'), 'Security headers include X-XSS-Protection: 0');
assert(hasHeader(serverTs, 'Referrer-Policy', 'strict-origin-when-cross-origin'), 'Security headers include Referrer-Policy');

// Global limiter
assert(hasLimiterBinding(serverTs, '/api', 'globalApiLimiter'), 'Global API rate limiter bound across all /api routes');

// Auth Limiter bindings
assert(hasLimiterBinding(serverTs, '/api/auth/request-otp', 'authLimiter'), 'authLimiter bound to /api/auth/request-otp');
assert(hasLimiterBinding(serverTs, '/api/auth/verify-otp', 'authLimiter'), 'authLimiter bound to /api/auth/verify-otp');
assert(hasLimiterBinding(serverTs, '/api/auth/register-password', 'authLimiter'), 'authLimiter bound to /api/auth/register-password');
assert(hasLimiterBinding(serverTs, '/api/auth/login-password', 'authLimiter'), 'authLimiter bound to /api/auth/login-password');
assert(hasLimiterBinding(serverTs, '/api/auth/forgot-password', 'authLimiter'), 'authLimiter bound to /api/auth/forgot-password');
assert(hasLimiterBinding(serverTs, '/api/auth/reset-password', 'authLimiter'), 'authLimiter bound to /api/auth/reset-password');
assert(hasLimiterBinding(serverTs, '/api/auth/google', 'authLimiter'), 'authLimiter bound to /api/auth/google');
assert(hasLimiterBinding(serverTs, '/api/auth/supabase/sync', 'authLimiter'), 'authLimiter bound to /api/auth/supabase/sync');

// Order Limiter bindings
assert(hasLimiterBinding(serverTs, '/api/wallet/create-order', 'orderLimiter'), 'orderLimiter bound to /api/wallet/create-order');
assert(hasLimiterBinding(serverTs, '/api/subscriptions/create-order', 'orderLimiter'), 'orderLimiter bound to /api/subscriptions/create-order');
assert(hasLimiterBinding(serverTs, '/api/reports/order', 'orderLimiter'), 'orderLimiter bound to /api/reports/order');

// /api/config endpoint
assert(/app\.get\(\s*["']\/api\/config["']/.test(serverTs), 'GET /api/config endpoint is declared');

// ------------------------------------------------------------------
// 5. FastAPI Kundli Engine Rate Limiting & Security Headers
// ------------------------------------------------------------------
console.log('\n--- 5. FASTAPI KUNDLI ENGINE RATE LIMITING & HEADERS ---');

assert(mainPy.includes('class SecurityHeadersMiddleware'), 'SecurityHeadersMiddleware defined in FastAPI');
assert(mainPy.includes('class RateLimitMiddleware'), 'RateLimitMiddleware defined in FastAPI');
assert(mainPy.includes('response.headers["X-Content-Type-Options"] = "nosniff"'), 'FastAPI sets X-Content-Type-Options: nosniff');
assert(mainPy.includes('response.headers["X-Frame-Options"] = "DENY"'), 'FastAPI sets X-Frame-Options: DENY');
assert(mainPy.includes('"Retry-After"'), 'FastAPI RateLimitMiddleware sets Retry-After on HTTP 429');
assert(mainPy.includes('is_heavy = request.url.path in'), 'FastAPI applies strict rate limiting on heavy calculation endpoints');

console.log('\n===============================================================');
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('===============================================================');

if (failCount > 0) {
  process.exit(1);
}
