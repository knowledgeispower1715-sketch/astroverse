# PHASE 6.2 — STAGE F: ADMIN SECURITY, AUTHENTICATION & RBAC ENFORCEMENT

**Evaluator:** Chief Information Security Officer & Application Security Architect  
**Evaluation Date:** 2026-11-06T01:50:00+05:30  
**Target Domain:** Administrative Control Centre Authorization & Identity Enforcement  

---

## 1. Role-Based Access Control (RBAC) Authority Model

AstroVerse enforces a strict, hierarchical 7-role server-side RBAC matrix. Client-side requests cannot override or manipulate role scopes.

| Role Key | Role Title | Read Scope | Write / Action Scope | High-Risk Actions Permitted |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | System Owner | Complete Platform Access | Unbounded Administrative Authority | Role Assignment, Owner Demotion Guard, DDL Gate |
| **SECURITY_ADMIN** | Security Officer | Users, Roles, Audit, Security | MFA Reset, Session Revocation, Flag Toggle | Force MFA Reset, Step-Up Assurance Window |
| **FINANCE_ADMIN** | Financial Controller| Ledger, Orders, Subscriptions, Pricing | Pricing Updates, Subscription Grants, Reconcile | Gateway Order Reconciliation, Coupon Creation |
| **SUPPORT_ADMIN** | Customer Support | Users, Reports, Privacy Requests | User Status Toggle, DPDP Erasure, Report Retry | Account Suspension, DPDP Archive Export |
| **CONTENT_EDITOR** | Editorial Manager | Pricing Catalog, Banners, Promotions | Banner Creation, Coupon Management | Content Updates, Banner Activation |
| **ASTROLOGY_OPS** | Astrology Ops Lead | Astrology Telemetry, Consultations | Astrologer Verification, Rate Adjustments | Engine Verification, Astrologer Rate Controls |
| **READONLY_ANALYST**| Business Analyst | Overview, Analytics BI, Audit Read | Strictly Read-Only (Zero Mutation Authority) | None |

---

## 2. Privilege Escalation Defense Verification

### Test 1: Self-Escalation via Profile Mutation
- **Attack Vector:** Authenticated customer submits `PUT /api/user/profile` with payload `{"role": "OWNER"}` or `{"walletBalance": 999999}`.
- **Defense Implementation:** Database trigger `prevent_unauthorized_profile_mutation()` and Prisma data-layer validation discard client-supplied role and balance properties.
- **Result:** **REJECTED / STRIPPED.** User role remains `USER`, balance remains unchanged.

### Test 2: Last Owner Protection Invariant
- **Attack Vector:** An administrator or owner attempts to demote the final remaining active `OWNER` account.
- **Defense Implementation:** `assignUserRoleAtomic` executes a row-level lock (`SELECT count(*) FROM "User" WHERE role = 'OWNER' FOR UPDATE`).
- **Result:** **REJECTED.** Returns HTTP 400 `CANNOT_MODIFY_OWN_ROLE` / `LAST_OWNER_PROTECTED`.

### Test 3: Unauthenticated & Customer Admin Rejection
- **Attack Vector:** Anonymous user or standard customer invokes `/api/admin/*`.
- **Defense Implementation:** `requireAdminAuth` middleware verifies JWT claims against the Supabase JWKS public key and verifies that `user.role` is one of the approved staff roles.
- **Result:** Returns HTTP 401 Unauthorized (anonymous) or HTTP 403 Forbidden (standard user).

---

## 3. Session Security & Step-Up Assurance

1. **Cookie Configuration:**
   - `HttpOnly`: Enforced on session tokens to prevent XSS exfiltration.
   - `Secure`: Transmitted strictly over HTTPS.
   - `SameSite=Strict`: Enforces CSRF isolation.
2. **Session Lifetimes:**
   - Production Idle Timeout: 10 minutes.
   - Preview Idle Timeout: 60 minutes.
   - Absolute Session Cap: 4 hours (hard re-authentication enforced).
3. **MFA Step-Up Window:**
   - Sensitive mutations (Role changes, account erasures, price changes, subscription grants) require an explicit MFA assurance step-up token valid for 5 minutes.
   - Actions without the step-up token fail with HTTP 401 / `MFA_STEP_UP_REQUIRED`.

---

## 4. Stage F Verification Verdict
**PASS:** Server-side RBAC, privilege escalation defenses, last-owner invariants, and session security policies are strictly enforced and verified by automated test suites.
