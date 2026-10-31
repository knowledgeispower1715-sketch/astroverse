# ASTROVERSE AI — SECURITY THREAT MODEL & HARDENING AUDIT

**Classification:** Security Architecture & Threat Model (STRIDE)  
**Security Standard:** OWASP Top 10, CWE / SANS Top 25, PCI-DSS Relevant Principles  
**Date:** November 1, 2026  

---

## 1. STRIDE Threat Analysis Matrix

| Threat Category | Description & Attack Surface | Existing Countermeasures & Architectural Controls | Security Status |
| :--- | :--- | :--- | :--- |
| **S**poofing | Attacker impersonates legitimate user or administrative staff | - 256-bit cryptographically random JWT tokens.<br>- OTP tokens evicted upon single use with 60s cooldown.<br>- TOTP Multi-Factor Authentication mandatory for admin roles.<br>- Server allowlist (`ADMIN_EMAILS_ALLOWLIST`) enforced at API layer. | ✅ SECURE |
| **T**ampering | Attacker tampers with wallet balances or report prices | - Double-entry immutable financial ledger (`wallet_transactions`).<br>- Prices derived server-side from canonical catalog (`catalog.ts`). Client prices ignored.<br>- Cashfree webhook HMAC-SHA256 signature verification. | ✅ SECURE |
| **R**epudiation | Admin or customer denies performing a critical transaction | - Tamper-evident `audit_logs` table storing actor ID, IP address, user agent, action type, timestamp, and metadata diff.<br>- Financial transaction IDs tied to Cashfree reference IDs. | ✅ SECURE |
| **I**nformation Disclosure | Leakage of customer birth charts, reports, or credentials | - Strict tenant isolation: User A cannot read User B's profiles or reports (HTTP 403 Forbidden).<br>- Production log sanitization redacting OTP codes, passwords, and webhook secrets.<br>- Sensitive admin emails removed from static frontend markup. | ✅ SECURE |
| **D**enial of Service | Flooding OTP dispatch, calculation endpoints, or login | - Sliding window rate limiters on IP and phone/email identifiers.<br>- Fail-closed circuit breakers on external astronomical APIs.<br>- Ephemeral in-memory caching for repetitive ephemeris calculations. | ✅ SECURE |
| **E**levation of Privilege | Regular user escalates role to ADMIN or OWNER | - Strict Prisma role enum (`Role.USER`, `Role.STAFF`, `Role.ADMIN`, `Role.SECURITY_ADMIN`, `Role.FINANCE_ADMIN`, `Role.OWNER`).<br>- Administrative endpoints guarded by `requireRole([Role.ADMIN, Role.OWNER])`.<br>- Bootstrap endpoint `bootstrap-first-owner` permanently disabled once an OWNER exists. | ✅ SECURE |

---

## 2. Authentication & Session Security Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer / Staff
    participant Edge as Vercel Edge / API Proxy
    participant Auth as Auth Controller (wallet-service)
    participant DB as Supabase PostgreSQL

    User->>Edge: POST /api/auth/request-otp { identifier }
    Edge->>Auth: Validate identifier & Rate Limit
    Auth->>DB: Check rate limit & cooldown
    Auth-->>User: 200 OK (OTP Dispatched)

    User->>Edge: POST /api/auth/verify-otp { identifier, otp }
    Edge->>Auth: Constant-time OTP comparison
    Auth->>DB: Single-use eviction & Session Creation
    Auth-->>User: 200 OK + JWT Bearer Token (256-bit)

    Note over User,Auth: Subsequent requests carry Authorization: Bearer <token>
    User->>Edge: GET /api/user/me
    Edge->>Auth: Verify JWT signature & expiration
    Auth->>DB: Lookup user status (fail if SUSPENDED)
    Auth-->>User: 200 OK { userProfile }
```

---

## 3. Financial Integrity & Webhook Verification

Every inbound Cashfree webhook must pass rigorous cryptographic checks before any wallet credit or order fulfillment occurs:

1. **Header Validation:** Requires `x-webhook-signature` and `x-webhook-timestamp`.
2. **Clock Drift Tolerance:** Webhooks with timestamp drift exceeding 300 seconds are rejected.
3. **HMAC-SHA256 Verification:** Computed as `HMAC_SHA256(timestamp + "." + rawBody, CASHFREE_WEBHOOK_SECRET)`.
4. **Idempotency & Replay Protection:** Webhook event IDs are recorded in `payment_webhook_events`. Duplicate deliveries return HTTP 200 immediately without executing secondary ledger mutations.

---

## 4. Administrative Control Centre Hardening

- **Access Guard:** `requireRole` middleware inspects both database role and the active `ADMIN_EMAILS_ALLOWLIST`. If an email is removed from the allowlist, their active session fails closed with HTTP 403.
- **First Owner Lockout:** The initial platform setup endpoint (`POST /api/admin/bootstrap-first-owner`) verifies whether any active `Role.OWNER` exists. If one exists, it permanently fails closed with HTTP 403 `FIRST_OWNER_ALREADY_INITIALIZED`.
- **MFA Enforcement:** Staff with `mfaEnabled: true` must submit valid 6-digit TOTP codes or 64-character hex backup codes during login.
