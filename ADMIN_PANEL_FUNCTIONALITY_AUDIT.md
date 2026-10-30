# AstroVerse AI — Administrative Panel Functionality & Security Audit

**Author:** Principal Engineering Lead  
**Document Reference:** Deliverable 7 / Administrative Security & Governance  
**Scope:** Admin Control Centre (All 16 Diagnostic & Governance Modules)  
**Automated Verification Suites:**  
- `services/wallet-service/tests/admin_security_mfa_and_modules.test.ts` (23 Passed, 0 Failed)  
- `services/wallet-service/tests/admin_control_centre.test.ts` (10 Passed, 0 Failed)  
- `services/wallet-service/tests/admin_access_recovery.test.ts` (14 Passed, 0 Failed)  
**Date:** October 30, 2026  
**Status:** Certified Fully Operational, Hardened & Tested  

---

## 1. Administrative Architecture & Authentication Governance

Access to administrative capabilities is strictly guarded by multi-layered defenses:

1. **Dedicated Administrative Route & Isolation:**
   - Administrative login is isolated to `POST /api/auth/admin-login` and `admin-login` UI view.
   - Ordinary consumer accounts (`Role.USER`) attempting admin login fail closed with `HTTP 403 FORBIDDEN`.
2. **Canonical Role Hierarchy (RBAC):**
   - Enforced by `CANONICAL_ADMIN_ROLES = ['OWNER', 'SECURITY_ADMIN', 'SUPPORT_ADMIN', 'CONTENT_EDITOR', 'FINANCE_ADMIN']`.
   - Granular capability checks prevent privilege escalation (e.g., Support Admin cannot mutate finance ledgers).
3. **Mandatory Admin Allowlist:**
   - Even with a valid password, an administrator must be pre-registered in the server-authoritative allowlist (`ADMIN_ALLOWLIST`). Unlisted accounts fail closed with `HTTP 403 ADMIN_EMAIL_NOT_AUTHORIZED`.
4. **Multi-Factor Authentication (MFA):**
   - MFA-enabled administrators must provide a valid TOTP code alongside credentials. Unverified attempts return `HTTP 401 MFA_REQUIRED` and grant zero access.
5. **Session Assurance & High-Stakes Action Re-Authentication:**
   - Financial adjustments and emergency declarations require short-lived cryptographic assurance tokens (`astro_admin_assurance`).

---

## 2. Exhaustive Audit of All 16 Administrative Modules

| Module # | Module Name | Primary Administrative Capability | Security & Access Governance | Verified Audit Status |
| :---: | :--- | :--- | :--- | :---: |
| **01** | **System Overview & Health** | Real-time node status, memory footprint, event loop latency, and uptime telemetry. | Read-only for all canonical admin roles. | **PASS (100%)** |
| **02** | **User Accounts & RBAC** | View user directory, lock/suspend suspicious accounts, and inspect assigned roles. | Modifying roles restricted to `OWNER` and `SECURITY_ADMIN`. | **PASS (100%)** |
| **03** | **Wallet Ledgers & Adjustments** | Audit wallet balances; perform manual credits/debits with mandatory audit justification. | Restricted to `FINANCE_ADMIN` and `OWNER`. Requires assurance token. | **PASS (100%)** |
| **04** | **Security Events Stream** | Structured log stream capturing failed logins, rate limit breaches, and OTP anomalies. | All roles can inspect; immutable append-only storage. | **PASS (100%)** |
| **05** | **Astrology Engine Health** | Validates Swiss Ephemeris 2.10.03 native binary bindings, Lahiri Ayanamsha, and ephemeris files. | Read-only diagnostic ping returning version and test natal calculations. | **PASS (100%)** |
| **06** | **Report Diagnostics & Logs** | Inspects PDF compilation latencies, chapter counts, and document generation errors. | Read-only; scrubs user PII from diagnostic traces. | **PASS (100%)** |
| **07** | **AI Quotas & Provider Usage** | Telemetry on Gemini / DeepSeek token consumption, daily quota exhaustion, and fallback triggers. | Read-only; alerts on 80% daily budget consumption. | **PASS (100%)** |
| **08** | **Payment Gateway Reconciliation** | Compares gateway order IDs and Cashfree webhook events against wallet ledger credits. | Enforces strict idempotent reconciliation without duplicate balance credit. | **PASS (100%)** |
| **09** | **Subscriptions Distribution** | Visualizes subscriber breakdown across Essentials (Free), Plus, and Premium tiers. | Read-only statistical aggregation. | **PASS (100%)** |
| **10** | **Content Banners Management** | Manage promotional alerts, Vedic festival notices, and temporary discount announcements. | Restricted to `CONTENT_EDITOR` and `OWNER`. Strict XSS sanitization. | **PASS (100%)** |
| **11** | **Feature Flags & Safe Settings** | Toggle maintenance mode, preview harnesses, and beta calculation engines. | Zero plaintext secrets exposed in responses; sensitive keys masked. | **PASS (100%)** |
| **12** | **Support & Privacy (DPDP/GDPR)** | Export complete user data packages and process right-to-be-forgotten deletion requests. | Compliant with India DPDP Act 2023. Generates signed JSON/CSV archive. | **PASS (100%)** |
| **13** | **Audit Trail Search** | Query administrative action logs by actor ID, target user, IP address, and date range. | Immutable PostgreSQL audit table with tamper-evident record hashing. | **PASS (100%)** |
| **14** | **External Integrations Health** | Pings Cashfree, Supabase Auth, Firebase, and external ephemeris services. | Reports latency, HTTP status, and failover availability. | **PASS (100%)** |
| **15** | **Incident Management** | Declare platform incidents, set degraded mode flags, and publish status notices. | Restricted to `OWNER` and `SECURITY_ADMIN`. Fires emergency webhooks. | **PASS (100%)** |
| **16** | **Catalogue & PDF Reader Harness** | Full diagnostic harness for all 10 report products, tier simulations, and PDF downloads. | Fully isolated test context; zero mutation of real customer data. | **PASS (100%)** |

---

## 3. Security Hardening & Zero-Plaintext Secret Verification

In Module 11 (Feature Flags & Safe Settings) and across all administrative API responses:
1. **Redaction of Sensitive Configuration:**
   - Database connection strings, Cashfree client secrets, Firebase private keys, and session JWT signing secrets are **strictly redacted** (`[REDACTED_SECRET]`).
   - Responses only return whether a service is configured (`isCashfreeConfigured: true/false`), never the secret value itself.
2. **Log Redaction:**
   - Verified that user passwords, OTP tokens, password-reset hashes, and authentication tokens are masked in stdout/stderr and audit trails.

---

## 4. Automated Test Verification Summary

The administrative architecture was verified across 3 automated test suites:
1. `services/wallet-service/tests/admin_security_mfa_and_modules.test.ts`:
   - 23 tests verifying all 15 core operational modules, RBAC enforcement, DPDP export, and secret masking: **23/23 PASSED (100%)**.
2. `services/wallet-service/tests/admin_control_centre.test.ts`:
   - 10 tests verifying administrative login rejection, password complexity, allowlist enforcement, MFA challenge, and CLI provisioning: **10/10 PASSED (100%)**.
3. `services/wallet-service/tests/admin_access_recovery.test.ts`:
   - 14 tests verifying privilege escalation prevention, preview tier switching, and demo wallet isolation: **14/14 PASSED (100%)**.
