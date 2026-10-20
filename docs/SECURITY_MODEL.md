# Astroverse Security Architecture & Threat Model

**Project**: Astroverse Vedic Astrology Platform  
**Document**: Threat Modeling, Security Policies, and Defensive Architecture  
**Standard**: OWASP Top 10 Compliance  

---

## 1. Threat Modeling & Attack Surface Analysis

The platform evaluated six primary threat vectors across the authentication, financial, and data layers:

```
+-----------------------------------------------------------------------------+
|                               ATTACK SURFACE                                |
+-----------------------------------------------------------------------------+
| 1. Brute-Force OTP / Credential Guessing                                    |
| 2. Session Hijacking / Token Theft & Replay                                 |
| 3. Unearned Credit Injection & Balance Tampering                            |
| 4. Privilege Escalation to Administrative Roles                             |
| 5. Account Takeover via Malicious Secondary Identity Linking                |
| 6. Silent Calculation Corruption via Form Initializer Injection            |
+-----------------------------------------------------------------------------+
```

---

## 2. Defensive Controls & Mitigations

### 2.1 OTP Cryptography & Anti-Brute-Force Policies
* **Entropy**: 6-digit numeric codes generated with Node.js `crypto.randomInt(100000, 999999)` offering $10^6$ combinations.
* **Validity Window**: Strict 5-minute time-to-live (`TTL = 300,000 ms`).
* **Attempt Limiter**: An attempt counter tracks every verification attempt. If $\ge 5$ invalid attempts occur, the OTP record is permanently revoked, terminating the attack window.
* **Cooldown Throttle**: A mandatory 60-second cooldown is enforced per identifier. Attempting to request a new code before the cooldown expires yields HTTP 429 `COOLDOWN_ACTIVE`.
* **IP Rate Limiting**: Client IPs are throttled to a maximum of 20 OTP requests per 10-minute sliding window, defending against distributed SMS/email flooding attacks.
* **Single-Use Eviction**: Upon successful verification, the OTP is deleted from the store immediately (`otpStore.delete(identifier)`), eliminating replay attacks.

### 2.2 Session Security & Token Hashing
* **Cryptographic Token Issuance**: Session tokens are 256-bit random strings generated using `crypto.randomBytes(32).toString('hex')`.
* **Zero Plaintext Storage**: The database stores only the SHA-256 digest (`tokenHash`). Even if read-only database compromise occurs, raw bearer tokens cannot be derived from hashes.
* **Revocation & Invalidation**:
  - User logout (`POST /api/auth/logout`) deletes the session record.
  - User suspension or deactivation cascades to evict all active sessions immediately.
* **Expiration**: Hard expiry of 7 days enforced at database query level.

### 2.3 Financial Integrity & Double-Entry Ledger Protection
* **True Guest State**: Unauthenticated visitors have strict ₹0.00 balance.
* **Strict Initializer Policy**: New user accounts are created with `@default(0.00)` wallet balance. No promotional balance is injected.
* **Double-Entry Reconciliation**: Balance mutation occurs exclusively via transactional updates bound to `WalletLedger` entries with unique `idempotencyKey` strings.
* **Cryptographic Webhook Verification**: Razorpay payment captures are verified using HMAC-SHA256 signature calculation over the order ID and payment ID.

### 2.4 Role-Based Privilege Separation (RBAC)
* Access to `/api/admin/*` is protected by `requireAdmin` middleware.
* The system enforces role boundaries:
  - `SUPER_ADMIN`: Can assign roles and modify platform configurations.
  - `SUPPORT` / `OPERATIONS` / `ANALYST`: Cannot grant or revoke `SUPER_ADMIN` privileges.
  - `USER`: Calling any administrative endpoint yields HTTP 403 `FORBIDDEN`.
* Non-super-admins cannot suspend or modify the Super Admin account.

### 2.5 Anti-Takeover Identity Linking
* To link a secondary identity (e.g. attaching a mobile phone to an existing email-based account), the user must:
  1. Hold a valid, active authenticated session.
  2. Prove ownership of the target identifier via real-time OTP verification.
* **Anti-Collision Gate**: Before linking, the system queries the database for the target identifier. If the identifier is already registered to a different user, the operation is blocked with HTTP 409 `IDENTIFIER_ALREADY_LINKED`, preventing hostile takeover or silent account merges.

### 2.6 Form Cleanliness & Zero-Default Principle
* Silent calculation corruption is prevented by eliminating prefilled defaults.
* The frontend initializes all input fields as empty.
* Backend endpoints reject incomplete submissions with HTTP 400 `REQUIRED_FIELDS_MISSING`.

---

## 3. Security Audit Logging Policy

All security-relevant actions trigger an immutable `AuditEvent` entry containing:
* `userId`: Actor identifier.
* `action`: Action classification.
* `targetType` & `targetId`: Entity affected.
* `ipAddress`: Remote client IP.
* `metadata`: Contextual request attributes.
* `createdAt`: UTC timestamp.

Log records cannot be modified or deleted through application APIs.
