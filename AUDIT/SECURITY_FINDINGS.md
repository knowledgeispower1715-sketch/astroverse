# AstroVerse AI — Security Baseline & Vulnerability Findings

**Audit Date:** October 26, 2026  
**Auditor:** Application Security Lead & Compliance Auditor  
**Frameworks Referenced:** OWASP MASVS (Mobile Application Security Verification Standard) & OWASP ASVS (Application Security Verification Standard)  

---

## 1. Executive Summary

A comprehensive risk-based security audit of the web application, backend microservices, and mobile client was performed. All previously identified critical authentication and authorization defects have been successfully repaired.

---

## 2. Security Assessment by Domain

### A. Secrets Management & Credential Exposure
- **Finding:** No production private keys, service-role tokens, or Razorpay live secrets are hardcoded in git version control.
- **Environment Isolation:** Secrets are injected strictly via environment variables (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SESSION_SECRET`, `DATABASE_URL`).
- **Log Redaction:** Implemented personal identifier masking in `maskIdentifier()` (`services/wallet-service/src/server.ts`). OTPs, password hashes, and reset tokens are strictly masked in application logs.
- **Status:** `VERIFIED PASS`.

### B. Authentication & Session Security
- **OAuth 2.0 GIS Integration:** Single Google Sign-In with Google Identity Services (GIS) library replaces legacy multi-button confusion. Tokens are validated server-side.
- **Session Tokens:** Cryptographically random 256-bit session tokens generated via `crypto.randomBytes(32).toString('hex')`.
- **OTP Eviction & Rate Limiting:** Single-use OTP eviction prevents replay attacks. A 60-second cooldown and maximum attempt cap prevent brute-force attacks.
- **Password Security:** Salted SHA-256 with iteration stretching; strict password strength requirements (minimum 8 characters, letters, and numbers).
- **Status:** `VERIFIED PASS`.

### C. Authorization & Multi-Tenant Isolation
- **Resource Ownership Verification:** Every user-owned resource (birth profiles, saved reports, wallet orders, transaction ledger) validates ownership on every mutation and query.
- **Cross-Account Penetration Testing:** Automated tests in `auth.test.ts` verify:
  - User A cannot fetch User B's saved reports by ID (HTTP 403 Forbidden).
  - User A cannot fetch or update User B's birth profiles (HTTP 403 Forbidden).
  - User A cannot verify payments or create orders on behalf of User B (HTTP 403 Forbidden).
- **Administrative Privileges:** Administrative endpoints require `Role.SUPER_ADMIN` and reject regular users with HTTP 403.
- **Status:** `VERIFIED PASS`.

### D. Payment Security & Webhook Verification
- **HMAC-SHA256 Signature Verification:** Webhook payloads received at `POST /api/webhooks/razorpay` are verified against `x-razorpay-signature` using `crypto.createHmac('sha256', secret)`.
- **Raw Body Preservation:** Express JSON parser preserves raw buffer (`req.rawBody`) before parsing, preventing whitespace/key reordering hash mismatches.
- **Idempotency Guard:** Handled events are recorded in memory cache; duplicate webhook deliveries receive HTTP 200 with `alreadyProcessed: true`, preventing double-crediting.
- **RBI Payment Compliance:** Zero storage of payment card numbers, CVVs, or UPI PINs. All payment transactions handled via Razorpay checkout.
- **Status:** `VERIFIED PASS`.

### E. Account Deletion & Privacy Compliance
- **Web Deletion:** `DELETE /api/user/account` permanently deletes the user account, associated sessions, birth profiles, and saved reports, recording an immutable audit log.
- **Mobile Deletion (Defect Identified):** `apps/mobile/src/screens/ProfileScreen.tsx` previously lacked an in-app trigger for account deletion.
- **Remediation:** In-app account deletion modal and API call implemented in mobile profile screen to satisfy Apple App Store Guideline 5.1.1(v) and Google Play account deletion mandates.
- **Status:** `REMEDIATION IN PROGRESS`.

---

## 3. Severity & Vulnerability Summary Table

| ID | Domain | Vulnerability / Issue | Severity | Status | Remediation Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Payments | Webhook HMAC-SHA256 signature verification missing | HIGH | RESOLVED | Implemented in `server.ts` & verified in `razorpay_compliance.test.ts` |
| **SEC-02** | Privacy | Missing in-app account deletion on mobile client | MEDIUM | IN PROGRESS | Adding deletion trigger in `apps/mobile/src/screens/ProfileScreen.tsx` |
| **SEC-03** | Auth | Cross-user report tampering vulnerability | HIGH | RESOLVED | Ownership validation gates all queries (HTTP 403) |
| **SEC-04** | Logs | Unredacted OTP or credential leakage in server stdout | MEDIUM | RESOLVED | Redaction applied across all dispatch logs |
| **SEC-05** | Storage | Payment card data exposure risk | HIGH | RESOLVED | Zero card data captured or persisted |
