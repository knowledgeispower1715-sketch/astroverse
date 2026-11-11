# ASTROVERSE AI — ADMINISTRATIVE SECURITY & AUDIT REPORT

**Audit Date:** 2026-11-12T04:50:00Z  
**Target Environment:** Preview & Production Cross-Verification  
**Security Framework:** OWASP Top 10 API Security / DPDP Act / CIS Benchmarks  
**Classification:** Enterprise Security Certification

---

## 1. Executive Summary

This report assesses the administrative security controls, authentication safeguards, access authorization matrices, and audit logging architecture across AstroVerse AI.

Key findings:
* **Multi-Factor Authentication (MFA):** Super Administrator authentication is strictly locked to Supabase Native TOTP (AAL2). Legacy endpoint bypass is forbidden by fail-closed server guards.
* **Cryptographic Token Verification:** Administrative assurance tokens are signed with high-entropy SHA256 secrets (`ADMIN_ASSURANCE_SIGNING_KEY`), bound to specific admin identities and operations (`ADMIN_MUTATION`), and enforce strict time-to-live boundaries (15 minutes).
* **Role-Based Access Control (RBAC):** Backend endpoints independently validate caller roles against the permission catalog. Frontend UI hiding is never relied upon as an access control boundary.
* **Audit Logging:** All sensitive administrative mutations (status changes, role assignments, balance adjustments, refunds, feature toggles) write immutable audit entries to the PostgreSQL `AuditEvent` table.

---

## 2. Authentication Architecture Verification

```
+--------------------------------------------------------------------------------+
|                         ADMIN AUTHENTICATION LIFECYCLE                         |
+--------------------------------------------------------------------------------+
|  1. Email + Password Ingress                                                   |
|     --> Supabase Auth signInWithPassword({ email, password })                  |
|     --> Result: Session established at AAL1                                    |
|                                                                                |
|  2. Owner Factor Authority Check                                               |
|     --> Supabase Auth mfa.listFactors()                                        |
|     --> Confirms Factor ID 4b569772-a123-453b-bf44-5f5fe66594f7 [VERIFIED]     |
|                                                                                |
|  3. MFA Challenge Dispatch                                                     |
|     --> Supabase Auth mfa.challenge({ factorId })                              |
|     --> Displays dedicated 6-digit challenge card                              |
|                                                                                |
|  4. TOTP Verification & Assurance Elevation                                    |
|     --> Supabase Auth mfa.verify({ factorId, challengeId, code })             |
|     --> Result: Session elevated to AAL2                                       |
|                                                                                |
|  5. Authoritative Backend Synchronization                                      |
|     --> POST /api/auth/admin-supabase-session                                  |
|     --> Header: Authorization: Bearer <aal2_access_token>                      |
|     --> Backend independently validates JWT signature, expiry, issuer & aal    |
|     --> Issues: rawSessionToken (32 bytes) + Admin Assurance Token (AAL2)      |
|                                                                                |
|  6. Admin Control Centre Entry                                                 |
|     --> Session stored in sessionStorage (never localStorage)                  |
|     --> Dashboard renders with OWNER privileges and live database provenance   |
+--------------------------------------------------------------------------------+
```

---

## 3. Threat Modeling & Vulnerability Review

| Threat Vector | Defense Mechanism | Verification Status |
| :--- | :--- | :--- |
| **Legacy Endpoint Bypass** | `POST /api/auth/admin-login` strictly rejects owner email and owner UUID with HTTP 403 `OWNER_NATIVE_MFA_REQUIRED`. | **VERIFIED (PASS)** |
| **AAL1 Privilege Escalation** | Sensitive endpoints reject requests without valid AAL2 assurance tokens with HTTP 428 `MFA_ASSURANCE_REQUIRED`. | **VERIFIED (PASS)** |
| **Token Replay / Hijacking** | Raw session tokens are hashed with SHA256 before storage in PostgreSQL `UserSession.tokenHash`. | **VERIFIED (PASS)** |
| **Inactivity Session Hijacking** | Auto-lock countdown (60 minutes) terminates administrative sessions automatically. | **VERIFIED (PASS)** |
| **Client-Side Storage Leakage** | Legacy administrative localStorage keys are wiped upon login; only isolated `sessionStorage` is utilized. | **VERIFIED (PASS)** |
| **Webhook Forgery** | Cashfree webhooks require valid HMAC-SHA256 signature calculated with server secret; unsigned payloads rejected with 400/401. | **VERIFIED (PASS)** |
| **Credential & Secret Leakage** | Audit logs redact passwords, OTPs, auth tokens, and cryptographic keys. Server errors return sanitized error codes. | **VERIFIED (PASS)** |

---

## 4. Audit Log Integrity

* **Table:** PostgreSQL `AuditEvent`
* **Recorded Parameters:** `id`, `userId`, `actorId`, `actorRole`, `action`, `targetType`, `targetId`, `outcome`, `ipAddress`, `metadata`, `createdAt`.
* **Sample Verified Audit Actions:**
  * `ADMIN_LOGIN_SUCCESS`
  * `ADMIN_MFA_CHALLENGE_SUCCESS`
  * `ADMIN_MFA_ENROLLMENT_VERIFIED`
  * `ADMIN_ROLE_ASSIGNED`
  * `ADMIN_STATUS_CHANGED`
  * `ADMIN_REFUND_EXECUTED`
  * `ADMIN_BALANCE_ADJUSTED`
  * `ADMIN_PREVIEW_ACTIVATED`
  * `ADMIN_PREVIEW_TERMINATED`
