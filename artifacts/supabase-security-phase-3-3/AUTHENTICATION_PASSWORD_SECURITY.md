# AUTHENTICATION PASSWORD SECURITY & ENTROPY DEFENSE

**Audited Subsystems:** 
- Registration (`/api/auth/register-password`)
- Password Reset (`/api/auth/reset-password`)
- Administrative Provisioning (`provisionAdmin.ts` / `/api/admin/bootstrap-owner`)
- Supabase Project Security Settings (`supabase-byzantine-nest`)

---

## 1. Supabase Free Tier Leaked Password Check (BLOCKED_PLAN_REQUIREMENT)

### Forensic Advisor Finding:
Supabase Security Advisor recommends enabling **Leaked Password Protection** (HaveIBeenPwned k-anonymity API integration in Supabase Auth GoTrue service).

### Real Project Boundary:
- **Active Supabase Project:** `supabase-byzantine-nest`
- **Current Plan:** **Free Tier**
- **Platform Limitation:** On the Supabase Free Tier, the Leaked Password Protection toggle is locked and restricted to Supabase Pro and Enterprise tiers. Enabling it programmatically via GoTrue configuration API returns plan restriction errors.
- **Truth Declaration:** Per Gravitas Invariant 6, this capability is formally recorded as `BLOCKED_PLAN_REQUIREMENT`. The test suite and documentation do not simulate or fabricate a breach checking API.

---

## 2. Server-Authoritative Password Entropy Validator

To provide defense-in-depth against credential stuffing, brute force, and dictionary attacks in the absence of the paid Supabase HIBP integration, AstroVerse implemented a centralized validator: `services/wallet-service/src/security/passwordValidator.ts`.

### Complexity Standards:
| Role / Flow | Min Length | Uppercase [A-Z] | Lowercase [a-z] | Numbers [0-9] | Symbols [!@#$...] | Common Weak Dictionary Check |
|---|---|---|---|---|---|---|
| **Customer Registration** | 8 | Optional | Optional | **Required** | Optional | **Checked** |
| **Password Reset** | 8 | Optional | Optional | **Required** | Optional | **Checked** |
| **Administrator Provisioning** | 10 | **Required** | **Required** | **Required** | **Required** | **Checked** |
| **Owner Bootstrap** | 10 | **Required** | **Required** | **Required** | **Required** | **Checked** |

### Common Dictionary Rejection:
Passphrases matching common patterns (e.g., `password`, `password123`, `astroverse`, `12345678`, `qwerty123`, `administrator`) are rejected immediately with HTTP 400 `WEAK_PASSWORD`.

---

## 3. Cryptographic Storage & Verification

- **Algorithm:** `scrypt` key derivation function with 16-byte cryptographically secure random salt.
- **Key Length:** 64 bytes (128 hex characters).
- **Timing-Safe Comparison:** Password checks employ `crypto.timingSafeEqual` over buffers to prevent timing side-channel attacks.
- **Credential Sanitization:** User serialization helpers (`sanitizeUser`) unconditionally strip `passwordHash`, `passwordSalt`, `resetTokenHash`, `mfaSecret`, and `mfaRecoveryCodes` from all API responses.

---

## 4. Verification Evidence

- `tests/supabase_security_hardening.test.ts` (Test 3.1): **PASS**
- `tests/real_postgres_security_hardening.test.ts` (Test 6): **PASS**
- `tests/auth.test.ts` (Password Registration & Reset Suite): **PASS**
