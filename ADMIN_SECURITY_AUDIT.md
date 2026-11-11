# ASTROVERSE AI — ADMINISTRATIVE SECURITY AUDIT
**Standard:** OWASP Top 10 API Security / NIST SP 800-63B / ISO 27001  
**Classification:** Comprehensive Adversarial Threat Assessment  
**Evaluation Scope:** AstroVerse Admin Control Centre (`/admin`), Backend APIs, Authentication & Payment Gateways  
**Timestamp:** 2026-11-11T11:30:00+05:30  
**Overall Security Posture:** SECURE & HARDENED (Grade: A+)  

---

## 1. Executive Security Evaluation

An exhaustive adversarial audit was conducted across the 20 primary application and administrative attack surfaces. The system enforces strict defense-in-depth:
- Authoritative server-side role resolution (`Role.OWNER`, `SECURITY_ADMIN`, etc.).
- Dual-layer authentication: Cryptographic Supabase JWT verification + Native AAL2 TOTP step-up.
- HMAC-SHA256 cryptographic assurance tokens (`ADMIN_ASSURANCE_SIGNING_KEY`) with 15-minute expiration and domain-scoped permission hierarchies for sensitive mutations.
- Strict cross-customer data isolation and integer paise accounting for all financial operations.
- Zero client-side credential exposure and strict Content-Security-Policy (CSP) headers.

---

## 2. 20-Point Adversarial Threat Matrix

| # | Attack Vector | Security Mechanism & Control | Test Vector / Verification | Verdict |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Unauthenticated Admin Access** | `authenticate` middleware intercepts all `/api/admin/*` routes; rejects requests missing Bearer headers with HTTP 401 | `GET /api/admin/overview` without header -> 401 | **PASS** |
| **2** | **Ordinary Customer Admin Access** | `requireAdmin()` normalizes user role and asserts `isAnyAdmin(role)`; blocks `Role.USER` with HTTP 403 `ADMIN_NOT_AUTHORIZED` | Consumer JWT to `/api/admin/users` -> 403 | **PASS** |
| **3** | **Cross-Customer Data Access (IDOR)** | User ID strictly derived from verified session token; route-level ownership validation checks `sessionUser.id === targetUserId` | User A token requesting User B report -> 403 | **PASS** |
| **4** | **Unauthorized Admin Endpoints** | Granular RBAC (`hasPermission()`) enforces least privilege across 7 canonical admin roles | `CONTENT_EDITOR` accessing `/api/admin/payments` -> 403 | **PASS** |
| **5** | **AAL1 Access to Sensitive Mutations** | `requireAdminAssurance()` requires valid, non-expired AAL2 step-up assurance token; rejects AAL1 with HTTP 428 | Wallet balance adjust at AAL1 -> 428 | **PASS** |
| **6** | **AAL2 Authorization Integrity** | Server cryptographically inspects `amr` claims (`['password', 'totp']`) and `aal: 'aal2'` from Supabase JWT | AAL2 token verified -> 200 OK | **PASS** |
| **7** | **Forged Administrator Headers** | Role and privileges derived strictly from database record and verified JWT, never client-supplied headers | Client sending `x-admin-role: OWNER` -> Ignored, 403 | **PASS** |
| **8** | **Expired JWTs** | Supabase client and JWT parser cryptographically check `exp` claim against server epoch time | Expired test token -> 401 Invalid Token | **PASS** |
| **9** | **Replayed Requests & Idempotency** | Orders and financial mutations require unique `x-idempotency-key`; cached result returned without duplicate mutations | Replaying wallet create-order -> Reused order returned | **PASS** |
| **10** | **SQL Injection** | Prisma ORM parameterizes all SQL queries; zero raw string concatenation used in user inputs | Injection payloads `' OR 1=1 --` safely escaped | **PASS** |
| **11** | **Cross-Site Scripting (XSS)** | `admin.html` uses textContent and safe DOM creation; strict CSP header forbids unsafe-eval and unlisted origins | Script tags `<script>alert(1)</script>` rendered as text | **PASS** |
| **12** | **Cross-Site Request Forgery (CSRF)** | All state-changing mutations require Authorization Bearer headers (incompatible with standard cross-origin form POSTs) | Cross-origin image/form fetch -> Blocked by CORS/Auth | **PASS** |
| **13** | **Broken Object-Level Authorization** | Resource endpoints verify tenant / user ownership before returning entity data or attachments | Cross-user note creation -> Rejected | **PASS** |
| **14** | **Broken Function-Level Auth** | Administrative action centers enforce step-up modal verification with explicit confirmation dialogs | Role promotion requires step-up confirmation | **PASS** |
| **15** | **Rate-Limit Bypass** | Dual-tier rate limiters (`authLimiter: 5/min`, `adminSensitiveMutationsLimiter: 30/min`) bound by client IP and token hash | Bursting 10 auth calls -> 429 Too Many Requests | **PASS** |
| **16** | **Mass Assignment** | DTO destructuring explicitly whitelists permitted fields; client cannot update `role`, `mfaEnabled`, or `balance` via profile PUT | Sending `{ role: "OWNER" }` in profile update -> Ignored | **PASS** |
| **17** | **Improper File Access** | Reports generated and streamed from internal memory / verified Supabase storage; path traversal (`../`) rejected | Requesting `/api/reports/../../etc/passwd` -> 404 | **PASS** |
| **18** | **Sensitive Data Leakage** | Diagnostics drawers, audit logs, and API payloads strictly redact secrets, passwords, OTPs, and private conversation messages | Inspecting `/api/admin/settings/safe` -> Masked `***` | **PASS** |
| **19** | **Webhook Forgery** | Cashfree webhooks verified via HMAC-SHA256 signature using `x-webhook-signature` and `x-webhook-timestamp` | Forged webhook payload -> HTTP 401 Rejected | **PASS** |
| **20** | **Duplicate Payment Events** | Processed webhook event IDs tracked in `processedWebhookEvents` set; duplicate delivery returns HTTP 200 without double crediting | Duplicate payment webhook -> Exactly 1 credit | **PASS** |

---

## 3. Secret Management & Credential Safety

1. **Storage Governance**:
   - Zero hardcoded secrets in repository commits or client-facing HTML/JS.
   - All server credentials (`SUPABASE_SERVICE_ROLE_KEY`, `CASHFREE_SECRET_KEY`, `DATABASE_URL`, `ADMIN_ASSURANCE_SIGNING_KEY`) loaded exclusively from server environment variables.
2. **UI Redaction**:
   - The Admin settings panel (`/api/admin/settings/safe`) displays only masked prefixes/suffixes (`cfsk_ma_...3db2`).
3. **Audit Redaction**:
   - The audit log engine (`db.recordAuditEvent()`) automatically scrubs authorization tokens, passwords, and recovery codes before persistence.
