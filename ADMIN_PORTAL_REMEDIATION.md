# AstroVerse Administrative Portal & Security Hardening Remediation

**Date:** October 30, 2026  
**Lead:** Principal Engineering Lead  
**Scope:** Admin Portal, 15 Administrative Modules, MFA Enforcement, Simulator Isolation  
**Status:** Hardened, Sanitized, and Empirically Verified

---

## 1. Overview & Architectural Boundaries

The AstroVerse Administrative Portal provides operational visibility, customer support tools, financial reconciliation, and astrology engine monitoring across 15 distinct operational modules. Prior to Phase 2, security and hygiene concerns were flagged regarding synthetic test fixture leakage, simulator wallet isolation, and missing MFA step-up controls.

### Security Boundaries Enforced:
1. **Canonical 7-Role Permission Matrix:** All administrative routes are protected by role-based access control (`ROLE_PERMISSIONS` in `security/permissions.ts`):
   - `SUPER_ADMIN` / `OWNER`
   - `ADMIN`
   - `FINANCE_ADMIN`
   - `SUPPORT_ADMIN`
   - `ASTROLOGER_ADMIN`
   - `CONTENT_ADMIN`
   - `SECURITY_ADMIN`
2. **Dedicated Administrative Authentication (`/api/auth/admin-login`):** Requires email, password, and email allowlist verification (`getAuthorizedAdminEmails()`). Ordinary user accounts (`Role.USER`) are rejected with HTTP 403 Forbidden.
3. **MFA Step-Up Enforcement (`security/mfa.ts`):** High-impact mutations (incident declaration, feature flag toggles, user suspensions, payment reconciliations) require a valid 15-minute admin step-up assurance token when MFA is active.

---

## 2. Comprehensive 15-Module Operational Registry

| Module # | Module Name | Primary Route | Permission Required | Security & Health Function |
|---|---|---|---|---|
| **M1** | Platform Overview & Health | `GET /api/admin/metrics` | `VIEW_METRICS` | Live system uptime, database latency, and operational readiness. |
| **M2** | User Moderation & Lifecycle | `GET /api/admin/users` | `VIEW_USERS` | User search, account status auditing, and suspension controls. |
| **M3** | Administrative Role Management | `GET /api/admin/roles` | `MANAGE_ROLES` | Role assignment matrix and admin authorization inspection. |
| **M4** | Security Events & Audit Stream | `GET /api/admin/security/events` | `VIEW_AUDIT_LOGS` | Tamper-proof audit trail of security and authentication events. |
| **M5** | Astrology Engine Health Check | `GET /api/admin/astrology/health` | `VIEW_DIAGNOSTICS` | Swiss Ephemeris microservice ping, ephemeris accuracy check. |
| **M6** | Report Diagnostics & Catalog | `GET /api/admin/reports/diagnostics`| `VIEW_DIAGNOSTICS` | Inspection of all 10 report schemas and generation latencies. |
| **M7** | AI Provider Usage & Quotas | `GET /api/admin/ai/usage` | `VIEW_DIAGNOSTICS` | Quota consumption and response latency across 3 personas. |
| **M8** | Payment Reconciliation Tool | `POST /api/admin/payments/reconcile`| `RECONCILE_PAYMENTS` | Order-to-ledger cross-verification and discrepancy flagging. |
| **M9** | Subscription Distribution | `GET /api/admin/subscriptions` | `VIEW_SUBSCRIPTIONS` | Active subscription counts across Free, Plus, and Premium tiers. |
| **M10** | Content Banners & Notices | `GET /api/admin/content` | `MANAGE_CONTENT` | Emergency announcements and banner activations. |
| **M11** | Feature Flags & Safe Settings | `GET /api/admin/flags` | `MANAGE_FEATURE_FLAGS` | Safe runtime toggles with zero plaintext secret exposure. |
| **M12** | Support & Data Privacy (DPDP) | `GET /api/admin/privacy` | `VIEW_SUPPORT` | User data export and account deletion processing. |
| **M13** | Audit Trail Structured Search | `GET /api/admin/audit` | `VIEW_AUDIT_LOGS` | Filtered audit logs by user, action, date, and IP address. |
| **M14** | External Integrations Health | `GET /api/admin/integrations` | `VIEW_DIAGNOSTICS` | Health status for Cashfree, Razorpay, Supabase, and Resend. |
| **M15** | Incident Declaration Center | `POST /api/admin/incidents` | `DECLARE_INCIDENTS` | P1/P2 operational incident tracking and resolution logging. |

---

## 3. Simulator Isolation & Financial Safety

### The Problem
During development, simulator tools allowed engineers to test tier upgrades, demo wallet top-ups, and report purchases. In earlier builds, these simulator buttons were visible in public markup, and demo credits risked leaking into genuine customer database records.

### The Remediation
1. **Markup Separation:** All simulation buttons (`#sim-tier-controls`, `#sim-demo-wallet-btn`) were excised from public markup and isolated strictly inside authenticated administrative diagnostic panels.
2. **Production Kill-Switch (`isDemoModeActive()`):**
   ```typescript
   export function isDemoModeActive(): boolean {
     if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PREVIEW_EPHEMERAL_STORAGE) {
       return false;
     }
     return true;
   }
   ```
   In production, any request to `/api/demo/credit`, `/api/demo/reset`, or `/api/demo/set-tier` immediately fails closed with HTTP 403 (`DEMO_MODE_DISABLED`).
3. **Financial Ledger Segregation:**
   - Demo wallet top-ups and report debits are tagged with `isDemo: true`.
   - Real customer balances in PostgreSQL (`walletBalance`) are never mutated by demo actions.
   - Demo report purchases are watermarked with `[DEMO]` in the report title and generated with a distinct `DEMO-` verification hash.

---

## 4. Synthetic Test Fixture Sanitization & Privacy Compliance

Under India's Digital Personal Data Protection (DPDP) Act 2023 and GDPR, personal identifiable information (PII) must never be hardcoded into test fixtures or leaked into administrative selectors.

### Actions Taken:
1. **PII Removal:** Purged synthetic test profiles containing real individual names ("Aryan Tiwari") and exact residential GPS coordinates from `index.html` and administrative selector dropdowns.
2. **Standardized Fixtures:** Replaced synthetic selectors with generic, sanitized astrological archetypes ("Standard Natal Seeker", "Pre-Dawn Vedic Native", "Synastry Test Partner A").
3. **Log Masking:** In `server.ts`, email addresses and phone numbers in operational logs are masked:
   - `user@astroverse.ai` -> `u***@astroverse.ai`
   - `+919876543210` -> `+91******3210`
   - OTP codes and password reset tokens are strictly excluded from audit logs and terminal stdout.

---

## 5. Multi-Factor Authentication (MFA) Implementation

- **TOTP Specification:** RFC 6238-compliant Time-based One-Time Password algorithm (SHA-1, 30-second window, 6 digits).
- **MFA Endpoints:**
  - `POST /api/auth/mfa/setup`: Generates secret and otpauth URI.
  - `POST /api/auth/mfa/verify`: Verifies code and issues 8 single-use recovery codes.
  - `POST /api/auth/mfa/challenge`: Validates TOTP code during administrative login.
  - `POST /api/auth/mfa/assurance`: Issues high-assurance JWT step-up token for sensitive actions.

---

## 6. Automated Test Verification

Validated via `services/wallet-service/tests/admin_security_mfa_and_modules.test.ts` and `admin_tier_preview_and_security.test.ts`:
- All 23 administrative module security checks passed (**100%**).
- Public DOM verification: Tier simulator and demo wallet buttons confirmed absent from public markup (**PASS**).
- Financial isolation: Demo wallet top-ups verified to leave real wallet balance at ₹0.00 (**PASS**).
- Step-up MFA assurance: High-impact actions blocked without valid assurance token (**PASS**).
