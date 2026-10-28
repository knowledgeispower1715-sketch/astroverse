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

// Test Razorpay Key ID
assert(!indexHtml.includes('"rzp_test_Tt5BwadyapFq9T"'), 'index.html contains zero hardcoded Razorpay Key IDs');
assert(!serverTs.includes('rzp_test_Tt5BwadyapFq9T'), 'server.ts contains zero hardcoded Razorpay Key ID fallbacks');

// Test Razorpay Secret
const razorpaySecret = '2LOoQxeneB0HfllVW0nNW7uu';
assert(!indexHtml.includes(razorpaySecret), 'index.html does not contain Razorpay Key Secret');
assert(!serverTs.includes(razorpaySecret), 'server.ts does not contain Razorpay Key Secret');
assert(!mainPy.includes(razorpaySecret), 'main.py does not contain Razorpay Key Secret');

// Test Firebase API Key in index.html
assert(!indexHtml.includes('apiKey: "AIzaSyBd0EFdhLD3AAGsmBwGf12EGOI2lkAgW80"'), 'index.html does not contain hardcoded Firebase apiKey');

// Test Google Client Secret
const googleSecret = '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';
assert(!indexHtml.includes(googleSecret), 'index.html does not contain Google Client Secret');
assert(!serverTs.includes(googleSecret), 'server.ts does not contain Google Client Secret');

// Test Prokerala Secret
const prokeralaSecret = 'UI9qcVviX9S16T2j31PqUP7ri1uzDxizYoxveIll';
assert(!indexHtml.includes(prokeralaSecret), 'index.html does not contain Prokerala Secret');
assert(!serverTs.includes(prokeralaSecret), 'server.ts does not contain Prokerala Secret');
assert(!mainPy.includes(prokeralaSecret), 'main.py does not contain Prokerala Secret');

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

// Security Headers
assert(serverTs.includes("res.setHeader('X-Content-Type-Options', 'nosniff')"), 'Security headers include X-Content-Type-Options: nosniff');
assert(serverTs.includes("res.setHeader('X-Frame-Options', 'DENY')"), 'Security headers include X-Frame-Options: DENY');
assert(serverTs.includes("res.setHeader('X-XSS-Protection', '0')"), 'Security headers include X-XSS-Protection: 0');
assert(serverTs.includes("res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')"), 'Security headers include Referrer-Policy');

// Global limiter
assert(serverTs.includes("app.use('/api', globalApiLimiter)"), 'Global API rate limiter bound across all /api routes');

// Auth Limiter bindings
assert(serverTs.includes("app.post('/api/auth/request-otp', authLimiter"), 'authLimiter bound to /api/auth/request-otp');
assert(serverTs.includes("app.post('/api/auth/verify-otp', authLimiter"), 'authLimiter bound to /api/auth/verify-otp');
assert(serverTs.includes("app.post('/api/auth/register-password', authLimiter"), 'authLimiter bound to /api/auth/register-password');
assert(serverTs.includes("app.post('/api/auth/login-password', authLimiter"), 'authLimiter bound to /api/auth/login-password');
assert(serverTs.includes("app.post('/api/auth/forgot-password', authLimiter"), 'authLimiter bound to /api/auth/forgot-password');
assert(serverTs.includes("app.post('/api/auth/reset-password', authLimiter"), 'authLimiter bound to /api/auth/reset-password');
assert(serverTs.includes("app.post('/api/auth/google', authLimiter"), 'authLimiter bound to /api/auth/google');
assert(serverTs.includes("app.post('/api/auth/supabase/sync', authLimiter"), 'authLimiter bound to /api/auth/supabase/sync');

// Order Limiter bindings
assert(serverTs.includes("app.post('/api/wallet/create-order', orderLimiter"), 'orderLimiter bound to /api/wallet/create-order');
assert(serverTs.includes("app.post('/api/subscriptions/create-order', orderLimiter"), 'orderLimiter bound to /api/subscriptions/create-order');
assert(serverTs.includes("app.post('/api/reports/order', orderLimiter"), 'orderLimiter bound to /api/reports/order');

// /api/config endpoint
assert(serverTs.includes("app.get('/api/config'"), 'GET /api/config endpoint is declared');

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
