# SECURITY, ROLE-BASED ACCESS CONTROL (RBAC) & DATA ISOLATION AUDIT

## ASTROVERSE APPLICATION SECURITY HARDENING REPORT

**Security Level:** Enterprise Tier 1 SaaS  
**Authentication Standard:** Supabase Auth + 256-bit Argon2/Crypto Token Sessions + Time-based MFA  
**Administrative Authority:** Platform Owner (`Role.OWNER`)  

---

## 1. CANONICAL ROLE MATRIX & PERMISSIONS ENFORCEMENT

The AstroVerse administrative subsystem enforces eight canonical assignable roles:

| Role Name | Authority Scope | Key Permissions | May Assign Roles? | May Configure Gateway? |
|---|---|---|---|---|
| `OWNER` | Full Platform Ownership | `MANAGE_ADMIN_ROLES`, `VIEW_FINANCIALS`, `MANAGE_SETTINGS`, `EXPORT_CUSTOMER_DATA`, all modules | **YES (Exclusive)** | **YES** |
| `SECURITY_ADMIN` | Platform Security Operations | `MANAGE_INCIDENTS`, `VIEW_AUDIT_LOGS`, `VIEW_SETTINGS`, `MANAGE_FEATURE_FLAGS` | **NO** | **NO** |
| `FINANCE_ADMIN` | Payment & Ledger Operations | `VIEW_PAYMENTS`, `MANAGE_PAYMENTS`, `VIEW_FINANCIALS`, `VIEW_SUBSCRIPTIONS` | **NO** | **NO** |
| `SUPPORT_ADMIN` | Customer Support & Triage | `VIEW_USERS`, `MANAGE_USERS`, `VIEW_TICKETS`, `VIEW_SUBSCRIPTIONS` | **NO** | **NO** |
| `CONTENT_EDITOR` | Platform Content & Banners | `MANAGE_BANNERS`, `MANAGE_PROMOTIONS`, `VIEW_CONTENT` | **NO** | **NO** |
| `ASTROLOGY_OPS_ADMIN` | Consultation & Astrologer Ops | `MANAGE_ASTROLOGERS`, `VIEW_CONSULTATIONS`, `MANAGE_PUJAS` | **NO** | **NO** |
| `READONLY_ANALYST` | Business Intelligence Audit | `VIEW_OVERVIEW`, `VIEW_METRICS`, `VIEW_ANALYTICS` | **NO** | **NO** |
| `USER` | Consumer End-User | Basic Kundli & Horoscope Generation, Wallet Recharge, Purchases | **NO** | **NO** |

---

## 2. PRIVILEGED STEP-UP ASSURANCE & ZERO-TRUST SAFEGUARDS

1. **Step-Up Assurance (`x-admin-assurance-token`):**
   - Critical administrative actions require a recently issued cryptographic assurance token (valid for 5 minutes).
   - Protected actions:
     - `PUT /api/admin/users/:id/role` (Admin role assignment)
     - `POST /api/admin/gateway-credentials` (Cashfree secret activation)
     - `POST /api/admin/users/export` (Customer data CSV export)
     - `DELETE /api/admin/users/:id` (Account erasure)
   - Requests with missing, expired, or role-mismatched assurance tokens are rejected with HTTP 401/403 fail-closed.

2. **Mandatory Business Justification:**
   - All privileged modifications require a human-readable justification reason of at least 5 characters (`REASON_REQUIRED`). Empty or trivial reasons (`"ok"`, `"test"`) are rejected with HTTP 400.

3. **Self-Role Alteration Prohibition:**
   - Administrators cannot modify their own assigned roles (`CANNOT_MODIFY_OWN_ROLE`). This eliminates accidental privilege suicide and forced role escalation.

4. **Last Active Owner Protection:**
   - The platform prevents demoting the last active Platform Owner account (`LAST_OWNER_PROTECTION`). Locked verification guarantees at least 1 other active owner remains before demotion executes.

---

## 3. CROSS-USER ISOLATION & DATA LEAKAGE CONTROLS

1. **Horizontal Privilege Escalation (IDOR) Protection:**
   - Birth Profiles (`/api/profiles/:id`): User A cannot read, edit, or delete User B's profiles.
   - Saved Reports (`/api/reports/:id`): User A cannot view User B's astrological reports.
   - Financial Ledgers (`/api/billing/history`): User A cannot view User B's transactions or wallet balance.
2. **Formula Injection Sanitization (CSV Export):**
   - In `POST /api/admin/users/export`, all user-controlled text fields (display names, email prefixes, notes) starting with spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with a leading single quote (`'`).
   - The export response stamps cryptographic integrity headers: `X-Export-Checksum` (SHA-256) and `X-Export-Row-Count`.
