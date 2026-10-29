# ASTROVERSE — ADMINISTRATOR ACCESS & SECURITY BASELINE AUDIT

**Audit Date:** October 29, 2026  
**Auditor:** Principal Application Security Architect & Staff Full-Stack Engineer  
**Repository:** `E:\rea`  
**Current Git SHA:** `f5db7ceb7051d2d9f35eb75b7f0a996e5645fde8`  
**Active Branch:** `feature/premium-reports-and-subscriptions`  
**Target Release:** Secure Admin Access, First-Admin Bootstrap & Premium Feature QA Console

---

## 1. Executive Summary & Problem Diagnosis

The platform owner currently cannot access the administrative dashboard because:
1. **Missing First-Admin Provisioning Mechanism:** In `services/wallet-service/src/server.ts`, all user registrations and logins via Google OAuth (`/api/auth/google`), Email/Password (`/api/auth/login-password`), and Supabase sync (`/api/auth/supabase/sync`) unconditionally assign or retain `Role.USER`.
2. **Missing Server-Side Allowlist Configuration:** The server-side environment variable `ASTROVERSE_ADMIN_EMAILS` does not exist in the codebase. As a consequence, there is no mechanism to recognize the owner's verified email upon sign-in.
3. **No Provisioning CLI / Fallback:** There is no operational command line script to provision or promote an administrator in the database.
4. **URL Path Routing Inconsistency:** In `index.html`, direct browser navigation to `/admin` only checked `window.location.hash`, causing direct URL hits to default to `#overview` rather than activating `#view-admin`.

---

## 2. Authentication & Authorization Baseline

### Identity Providers Audited:
- **Google OAuth 2.0:** Verified via `verifyGoogleToken` or `exchangeGoogleCode`. Enforces `email_verified: true` from Google payload.
- **Email / Password Auth:** Issues 256-bit cryptographically random session tokens hashed with SHA-256. Enforces email verification before account linking.
- **Supabase Auth Integration:** Verified via `verifySupabaseToken`.
- **Role Model:** Defined in `services/wallet-service/src/security/permissions.ts` with 7 canonical roles:
  * `OWNER` (full super-authority across all 15 modules)
  * `SECURITY_ADMIN`
  * `SUPPORT_ADMIN`
  * `CONTENT_EDITOR`
  * `FINANCE_ADMIN`
  * `ASTROLOGY_OPS_ADMIN`
  * `READONLY_ANALYST`
- **Security Invariant:** Client-supplied role headers or profile update fields are rejected by the backend and database trigger `trg_prevent_unauthorized_profile_mutation`.

---

## 3. Entitlement & Tier Preview Baseline

### Authoritative Entitlement Manager:
- Located in `services/wallet-service/src/monetization/entitlements.ts`.
- Resolves user subscription tier: `FREE`, `PLUS`, `PREMIUM`.
- Controls access to 10 distinct report types, AI astrologer consultation quotas, Kundli analysis depths, and Numerology Studio features.

### Admin Tier Preview Harness:
- Exists in `services/wallet-service/src/server.ts` via `/api/admin/preview/*` endpoints:
  * `POST /api/admin/preview/tier` (activates simulated `FREE`, `PLUS`, or `PREMIUM` session for verified administrators).
  * `GET /api/admin/preview/status`
  * `POST /api/admin/preview/exit`
- **Current Defect:** The server does not check an explicit `ASTROVERSE_ADMIN_PREVIEW_ENABLED` toggle before allowing preview session activation in production environments.

---

## 4. Test Suite Baseline Execution

| Test Suite | Framework / Tool | Commands Executed | Pass Count | Fail Count | Skip Count |
|:---|:---|:---|:---:|:---:|:---:|
| **Wallet & Security** | Node.js / `ts-node` | `npm --prefix services/wallet-service test` | 20 Suites | 0 | 0 |
| **Ephemeris & Calculations**| Python / `pytest` | `python -m pytest services/kundli-engine/tests` | 120 | 0 | 2 (API stubs) |
| **Git Diff Hygiene** | Git CLI | `git diff --check` | Clean | 0 | 0 |

---

## 5. Architectural Remediation Plan

1. **Phase 1: First-Admin Bootstrap & Provisioning:**
   - Implement `ASTROVERSE_ADMIN_EMAILS` parser in backend.
   - On verified Google / Email authentication, automatically provision or promote authorized email addresses to `Role.OWNER`.
   - Create idempotent CLI setup script: `npm --prefix services/wallet-service run admin:provision -- <email>`.
2. **Phase 2: Separate Admin Route & Navigation:**
   - Update `handleHashRoute` in `index.html` to support direct `/admin` path access.
   - Display `Admin Panel` in navigation for server-verified admins; hide completely for ordinary users.
3. **Phase 3 & 4: Admin Tier Simulator & Isolated Profile:**
   - Implement `ASTROVERSE_ADMIN_PREVIEW_ENABLED` server-side check.
   - Ensure synthetic profile context is clearly stamped `SAMPLE TEST DATA`.
4. **Phase 5 & 6: Demo Wallet & Audit Trail:**
   - Confirm demo ledger operations are strictly isolated from real customer accounts.
   - Verify audit logging for all administrator authentication, role changes, and preview actions.
5. **Phase 7: Setup Documentation:**
   - Create beginner-friendly owner onboarding guide `E:\rea\ASTROVERSE_ADMIN_SETUP.md`.
