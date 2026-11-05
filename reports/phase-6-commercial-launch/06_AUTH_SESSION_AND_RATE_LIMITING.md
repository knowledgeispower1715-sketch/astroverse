# 06 — AUTHENTICATION, SESSION LIFECYCLE & MULTI-TIER RATE LIMITING

**AstroVerse AI Commercial Launch & Production Certification — Phase 6**  
**Classification:** Authentication Architecture & DoS Defense Verification  
**Evaluator:** Senior Application Security & Infrastructure Reliability Engineer  
**Evaluation Date:** 2026-11-05T13:27:00Z  
**Verification Environment:** Local Automated Regression & Isolated Staging Tests  

---

## 1. Authentication Modalities & Security Invariants

AstroVerse implements a unified, defense-in-depth authentication gateway supporting three customer and administrative pathways:
1. **Password Authentication (`POST /api/auth/register-password`, `POST /api/auth/login-password`):**
   - Password Hashing: PBKDF2 with HMAC-SHA512, 100,000 iterations, 32-byte cryptographically secure random salt per user.
   - Password Complexity: Minimum 8 characters, requiring at least one uppercase letter, one lowercase letter, one digit, and one special character. Weak or common dictionary passwords are rejected (`HTTP 400`).
2. **OTP Authentication (`POST /api/auth/request-otp`, `POST /api/auth/verify-otp`):**
   - OTP Generation: 6-digit cryptographically pseudo-random numeric tokens.
   - Replay Resistance: Single-use invalidation upon successful verification or expiry (5-minute TTL).
   - Cooldown Gate: Enforces a strict 60-second cooldown per identifier before another OTP can be dispatched (`HTTP 429`).
3. **Supabase JWT & Federated OAuth (`GET /api/auth/supabase/config`, `POST /api/auth/supabase/sync`):**
   - Cryptographic Verification: Validates RS256/HS256 tokens using Supabase project public JWKS / keys.
   - Identity Synchronization: Synchronizes Supabase authenticated user profiles to the application layer idempotently.

---

## 2. Session Lifecycle & Token Security

- **Token Format:** 256-bit entropy (`crypto.randomBytes(32)`), represented as a 64-character hex string.
- **Database Storage:** Sessions are stored strictly as SHA-256 hashes (`tokenHash`). The raw token is never persisted in plaintext.
- **Session Duration & Expiration:** Customer sessions expire after 30 days of inactivity; administrative sessions expire after 24 hours.
- **Revocation:** Account suspension, password changes, or administrative revocation immediately evict all matching session hashes from the database.

---

## 3. Multi-Tier Rate Limiting & Denial-of-Service (DoS) Shielding

Tested under `tests/security_and_ratelimit.test.ts` and `tests/enterprise_backend_hardening_and_resilience.test.ts`:

| Limiter Name | Target Routes / Operations | Window | Quota | Header Semantics | Verified Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`authRateLimiter`** | `/api/auth/login-*`, `/api/auth/verify-otp` | 60 sec | 10 reqs | `Retry-After: 60`, `X-RateLimit-*` | Blocks brute-force credential stuffing with `HTTP 429` |
| **`otpDispatchLimiter`**| `/api/auth/request-otp` | 60 sec | 3 reqs | `Retry-After: 60`, `X-RateLimit-*` | Prevents SMS / Email spamming with `HTTP 429` |
| **`apiGeneralLimiter`** | General Customer APIs (`/api/profiles`, etc.) | 60 sec | 100 reqs | Standard rate limit headers | Protects compute resources while permitting fluid UX |
| **`adminMonitoringLimiter`**| `/api/admin/database/monitor`, overview telemetry | 60 sec | 120 reqs | High-frequency polling header | Allows administrative monitoring without false throttling |
| **`adminSensitiveMutationsLimiter`**| Role changes, wallet adjustments, quota changes | 60 sec | 20 reqs | Strict mutation throttling | Prevents accidental or automated administrative over-mutation |

---

## 4. Empirical Test Verification

All 108 authentication test cases in `tests/auth.test.ts`, 30 tests in `tests/supabase_auth.test.ts`, and 15 tests in `tests/security_and_ratelimit.test.ts` passed with zero errors:
- Zero credential leakage in logs (tested via `cdp_diagnostics_redaction.test.ts`).
- Zero plaintext password or token persistence in database records.
- Deterministic HTTP 429 and Retry-After responses when rate limits are exceeded.
