# AstroVerse AI — Security Remediation Report

**Audit Date:** October 26, 2026  
**Auditor:** Application Security Lead & Compliance Auditor  

---

## 1. Summary of Remediated Security Deficiencies

| ID | Component | Vulnerability Description | Remediation Implemented | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | `wallet-service` | Missing HMAC-SHA256 signature verification on Razorpay webhook callbacks | Implemented `verifyRazorpayWebhookSignature()` using raw request body buffer (`req.rawBody`). Forged signatures rejected with HTTP 400. | `tests/razorpay_compliance.test.ts` (3 tests pass) |
| **SEC-02** | `apps/mobile` | Missing in-app account deletion capability on native mobile client | Added `handleDeleteAccount` trigger with confirmation dialog in `ProfileScreen.tsx`, calling `DELETE /api/user/account`. | Code verification & typecheck clean |
| **SEC-03** | `wallet-service` | Insecure Direct Object References (IDOR) on saved reports and birth profiles | Server-side ownership validation: requests for records owned by other users return HTTP 403 Forbidden. | `tests/auth.test.ts` (cross-user tests pass) |
| **SEC-04** | `wallet-service` | Duplicate webhook event processing leading to potential double-credit | Added memory-backed event cache storing SHA-256 digests; duplicate deliveries return HTTP 200 with `alreadyProcessed: true`. | `tests/razorpay_compliance.test.ts` (idempotency test passes) |
| **SEC-05** | `wallet-service` | Unredacted sensitive identifiers in server execution logs | Added `maskIdentifier()` utility redacting emails and phone numbers across all OTP and password reset dispatches. | Log inspection in `auth.test.ts` |
| **SEC-06** | `index.html` / Web | Inconsistent origin error on Google Sign-In and multiple competing login buttons | Replaced fragmented buttons with unified Google Identity Services (GIS) library and server verification callback. | `index.html` GIS integration verified |

---

## 2. OWASP Compliance Alignment

- **OWASP ASVS Level 2 (Web & API)**:
  - V2 Authentication: Session management with 256-bit entropy; single-use OTPs; brute-force cooldowns.
  - V3 Session Management: Server-controlled expiration and revocation.
  - V4 Access Control: Strict resource ownership checks on all endpoints.
  - V8 Data Protection: Zero storage of payment card credentials; 256-bit TLS in transit.
- **OWASP MASVS (Mobile)**:
  - MASVS-AUTH: Secure credential storage via Async Storage; session invalidation on logout.
  - MASVS-NETWORK: Enforced HTTPS for all API communication with 12s timeout guards.
  - MASVS-STORAGE: Sensitive tokens never stored in plaintext SQLite without session scoping.
