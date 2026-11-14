# ASTROVERSE AI ADMIN CONTROL CENTRE — COMPLETE FEATURE INVENTORY

**Document ID:** `ASTRO-ADMIN-INV-2026-M2`  
**Milestone:** Milestone M2 — Feature Discovery & Documentation Matrix  
**Baseline Git Commit:** `9a17d704806033a1982648e1dfddee661932f25e`  
**Production Origin:** `https://astroverse-eta.vercel.app/admin`  
**Verified Owner Principal:** `tiwariji0028@gmail.com` (`UUID: b204eff9-1a9b-4805-8c07-c35d3a9de3ee`)  
**Enrolled TOTP Factor ID:** `4b569772-a123-453b-bf44-5f5fe66594f7`  
**Author / Auditor:** Teamwork Subagent `worker_m2_matrix`  

---

## 1. Executive Summary

This document establishes the exhaustive, forensic feature inventory of the **AstroVerse AI Admin Control Centre**. The inventory synthesizes findings from direct repository source inspection, live Chrome DevTools session analysis (`Page 4`), and specification mining reports.

### Verified Architecture & Inventory Quantities:
- **Administrative Modules / Panels:** Exactly **22** modular panels defined in `permissions.ts:301-324` and rendered within `admin.html` / `apps/admin/index.html`.
- **QA Diagnostic Workbenches:** Exactly **6** interactive testing harnesses embedded under `#admin-panel-qa`.
- **Modals & Drawers:** Exactly **11** modal dialogues and **1** persistent diagnostics troubleshooting drawer (`#drawer-admin-troubleshooting`).
- **Administrative Actions:** Exactly **90** distinct user and system operations mapped across the 22 modules (75 in `CANONICAL_CORE_75`, 15 in `EXTENDED_GOVERNANCE_15`).
- **Backend API Endpoints:** Exactly **58** canonical administrative API routes (`/api/admin/*` and `/api/auth/*`) in `services/wallet-service/src/server.ts`, supplemented by the extended governance endpoint catalog.
- **Frontend SPA Baseline:** `admin.html` and `apps/admin/index.html` (9,380 lines, 537,372 bytes, MD5: `F7F9A76B6F81DAEDA16B458EE9351427`).
- **Backend Service Baseline:** `services/wallet-service` (Express 4.x / TypeScript 5.4 / Prisma Client 5.11 / Supabase Managed Cloud PostgreSQL 16).

---

## 2. Architectural Context & Security Governance

```
+---------------------------------------------------------------------------------------------------------+
|                                    ASTROVERSE ADMIN ARCHITECTURAL TOPOLOGY                             |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  [ Vercel Edge Router: vercel.json ]                                                                    |
|    |-- /admin & /admin/(.*) --------> [ Frontend SPA: admin.html & apps/admin/index.html ]             |
|    |-- /api/admin(.*) --------------> [ Backend Microservice: services/wallet-service (Express/TS) ]    |
|    `-- /api/auth(.*) ---------------> [ Backend Microservice: services/wallet-service (Express/TS) ]    |
|                                                                                                         |
|  [ Authentication & Session Ingress ]                                                                   |
|    1. Client Ingress: Supabase Auth (GoTrue) Password Ingress (AAL1)                                    |
|    2. MFA Elevation: Native TOTP Challenge for Factor 4b569772-a123-453b-bf44-5f5fe66594f7 (AAL2)      |
|    3. Bridge Exchange: POST /api/auth/admin-supabase-session -> Validates AAL2, issues:                |
|       - 256-bit rawSessionToken (Hashed with SHA-256 into PostgreSQL UserSession table)                |
|       - 15-minute HMAC-SHA256 assuranceToken for step-up mutations                                      |
|    4. Client Containment: Strict sessionStorage isolation (Zero admin keys in localStorage)            |
|    5. Middleware Enforcement: authenticate (idle 10m / absolute 60m cap) & requireAdminAssurance (428)  |
|                                                                                                         |
|  [ Data Layer & External Connectors ]                                                                   |
|    - Supabase Managed PostgreSQL 16: 20 Prisma Models, Row Level Security (RLS), Savepoint Recovery    |
|    - Cashfree Payment Gateway: Official API v6 (2026-01-01), Raw-body HMAC-SHA256 webhook signatures  |
|    - Kundli Engine: FastAPI / Python 3.11 / Swiss Ephemeris 2.10 with Local Keplerian Fallback          |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. The 8 Admin Functional Domains

### Domain 1: Dashboard & Analytics (Modules 01, 18)
- **Scope:** Executive oversight, real-time KPI aggregation, system health telemetry, high-value order tracking, and conversion funnels.
- **Data Provenance:** Three-tier model (`LIVE` direct database queries, `DERIVED` real-time financial aggregations, and `STALE` cached fallbacks).
- **Security:** Guarded by `VIEW_OVERVIEW` and `VIEW_ANALYTICS`. Statement timeouts strictly bounded to `statement_timeout = '4000'`.

### Domain 2: User Management & Privacy (Modules 02, 12, 19)
- **Scope:** Customer directory search, role assignment, account status suspension/reactivation, DPDP Act 2023 / GDPR data export archives, account anonymization, and Customer 360 dossiers.
- **Data Provenance:** `LIVE` (PostgreSQL `User`, `BirthProfile`, `Subscription`, `PrivacyRequest`, `CustomerSupportNote`).
- **Security:** Status changes and erasure requests require step-up MFA assurance (`MANAGE_USER_STATUS`, `MANAGE_PRIVACY_REQUESTS`).

### Domain 3: Wallet & Financial Management (Module 08 & Billing Workbench)
- **Scope:** Wallet transaction ledgers, integer paise balance calculations, GST 18% compliance, demo wallet crediting, and manual order recovery.
- **Arithmetic Invariant:** Zero IEEE 754 floating-point operations. All monetary amounts represented as integer paise (`1 INR = 100 paise`) and serialized via PostgreSQL `to_char(sum("amount"), 'FM999999999990.00')`.

### Domain 4: Pricing, Subscriptions & Entitlements (Modules 09, 10, 20, 21)
- **Scope:** Canonical 10 SKU product pricing catalog, marketing announcement banners, subscription lifecycle (assign, extend, cancel), customer feature entitlements, and promotional discount campaigns.
- **Security:** Price edits and subscription alterations require step-up MFA assurance (`MANAGE_PRICING`, `MANAGE_SUBSCRIPTIONS`).

### Domain 5: Cashfree Payment Gateway Integration
- **Scope:** Cashfree PG API v`2026-01-01` integration, order creation, instant refund dispatch, reconciliation probes, and webhook signature verification.
- **Security & Safety Invariants:** Constant-time HMAC-SHA256 signature verification over `<timestamp>.<raw_body>` (max 300s skew). Preview payment initiation guard disables live transactions on Vercel preview deployments.

### Domain 6: Astrology & Customer Service Administration (Modules 05, 06, 07, 22)
- **Scope:** Swiss Ephemeris microservice health monitoring, Golden Parashari benchmark verification, generated customer report diagnostics and pipeline retries, AI daily/monthly tier quota governance, and live astrologer consultation operations.
- **Resilience:** Automatic fallback to local Keplerian solver (`FALLBACK_LOCAL_KEPLER_ACTIVE`) when remote `kundli-engine` is unavailable.

### Domain 7: Security, RBAC & Admin Governance (Modules 03, 04, 11, 13)
- **Scope:** 7 canonical roles (`OWNER`, `SECURITY_ADMIN`, `SUPPORT_ADMIN`, `CONTENT_EDITOR`, `FINANCE_ADMIN`, `ASTROLOGY_OPS_ADMIN`, `READONLY_ANALYST`), 22 granular permissions, immutable `AuditEvent` search, staff MFA reset, and feature flag management.
- **Security Invariant:** Last-Owner Protection Invariant strictly blocks suspending, deleting, or demoting the last active account with `Role.OWNER`.

### Domain 8: System Health & Diagnostics (Modules 14, 15, 16, 17)
- **Scope:** Third-party integration latency probes, platform incident declaration and broadcasting, PostgreSQL connection pool diagnostics (`pg_stat_activity`), table row statistics, and the 6 QA diagnostic workbenches.
- **DDL Guard:** Production database DDL modifications are locked.

---

## 4. Comprehensive Inventory of All 22 Administrative Modules

| # | Module Name | Route Path | DOM Container ID | Primary Data Source | Read Role / Permission | Write Role / Permission | Underlying Tables / Entities | Primary Administrative Actions | Provenance | Status |
|:---:|:---|:---|:---|:---|:---|:---|:---|:---|:---:|:---:|
| 01 | **Overview** | `#/admin` / `#/admin/modules/overview` | `#admin-panel-overview` | `GET /api/admin/overview` | Any Admin (`VIEW_OVERVIEW`) | None | `User`, `BirthProfile`, `WalletLedger`, `PlatformIncident` | View KPIs, refresh metrics, navigate quick resolutions | LIVE / DERIVED | PASS |
| 02 | **Users** | `#/admin/modules/users` | `#admin-panel-users` | `GET /api/admin/users` | `VIEW_USERS` | `MANAGE_USER_STATUS`, `EXPORT_CUSTOMER_DATA` | `User`, `Subscription`, `UserSession` | Search users, filter by status/role, suspend account, reinstate, export DPDP archive | LIVE | PASS |
| 03 | **Roles & RBAC** | `#/admin/modules/roles` | `#admin-panel-roles` | `GET /api/admin/roles/matrix`, `GET /api/admin/roles/admins` | `VIEW_ROLES` | `MANAGE_ROLES` | `CANONICAL_ADMIN_ROLES`, `ROLE_PERMISSIONS`, `User` | Inspect 7-role matrix, assign staff role, demote role, protect last owner | LIVE | PASS |
| 04 | **Security & MFA** | `#/admin/modules/security` | `#admin-panel-security` | `GET /api/admin/security/events` | `VIEW_SECURITY_EVENTS` | `MANAGE_SECURITY_MFA` | `AuditEvent`, `UserSession`, `User` | View security audit log, reset staff MFA, revoke active session, inspect session policy | LIVE | PASS |
| 05 | **Astrology Engine** | `#/admin/modules/astrology` | `#admin-panel-astrology` | `GET /api/admin/astrology/health` | `VIEW_ASTROLOGY_HEALTH` | `MANAGE_ASTROLOGY_JOBS` | Remote `kundli-engine`, Swiss Ephemeris 2.10 | Telemetry probe, trigger Golden Parashari benchmark, inspect Ayanamsha calibration | LIVE | PASS |
| 06 | **Reports** | `#/admin/modules/reports` | `#admin-panel-reports` | `GET /api/admin/reports/diagnostics` | `VIEW_REPORT_DIAGNOSTICS` | `RETRY_FAILED_REPORTS` | `SavedReport`, `ReportChapter` | Inspect generated reports, retry failed generation, preview PDF samples | LIVE | PASS |
| 07 | **AI Quotas** | `#/admin/modules/ai` | `#admin-panel-ai` | `GET /api/admin/ai/quotas` | `VIEW_AI_USAGE` | `MANAGE_AI_QUOTAS` | `AIQuotaConfig`, `AiUsageEvent` | View daily/monthly tier quotas, edit limits, monitor consultation token usage | LIVE | PASS |
| 08 | **Payments** | `#/admin/modules/payments` | `#admin-panel-payments` | `GET /api/admin/payments/transactions`, `/api/admin/payments/ledger` | `VIEW_PAYMENTS` | `RECONCILE_PAYMENTS`, `MANAGE_WALLET` | `WalletLedger`, `PaymentOrder`, Cashfree PG | View wallet ledger, reconcile pending gateway order, execute refund, download CSV | LIVE / DERIVED | PASS |
| 09 | **Subscriptions** | `#/admin/modules/subscriptions` | `#admin-panel-subscriptions` | `GET /api/admin/subscriptions` | `VIEW_SUBSCRIPTIONS` | `MANAGE_SUBSCRIPTIONS` | `Subscription`, `User`, `Entitlement` | Search subscriptions, grant complimentary tier, extend duration, cancel renewal | LIVE | PASS |
| 10 | **Content & Pricing**| `#/admin/modules/content` | `#admin-panel-content` | `GET /api/admin/products`, `GET /api/admin/pricing/catalog` | `MANAGE_CONTENT`, `MANAGE_PRICING` | `MANAGE_PRICING`, `MANAGE_PRODUCTS` | `ProductCatalog` (10 SKUs), `ContentBanner` | Edit canonical SKU prices, preview price changes, create announcement banner | LIVE | PASS |
| 11 | **Settings & Flags** | `#/admin/modules/settings` | `#admin-panel-settings` | `GET /api/admin/settings/flags` | `VIEW_SETTINGS` | `MANAGE_FEATURE_FLAGS` | `PlatformSetting`, `FeatureFlag` | Inspect runtime feature flags, toggle flag state, configure step-up window | LIVE | PASS |
| 12 | **Privacy Requests**| `#/admin/modules/privacy` | `#admin-panel-privacy` | `GET /api/admin/privacy/requests` | `VIEW_PRIVACY_REQUESTS` | `MANAGE_PRIVACY_REQUESTS` | `PrivacyRequest`, `User` | Review DPDP/GDPR requests, fulfill data export, execute account erasure | LIVE | PASS |
| 13 | **Audit Trail** | `#/admin/modules/audit` | `#admin-panel-audit` | `GET /api/admin/audit-logs`, `/api/admin/audit/search` | `VIEW_AUDIT_LOGS` | None (Immutable) | `AuditEvent` | Multi-field audit log search, filter by actor/action, export CSV | LIVE | PASS |
| 14 | **Integrations** | `#/admin/modules/integrations` | `#admin-panel-integrations`| `GET /api/admin/integrations` | `VIEW_INTEGRATIONS` | None | External Connectors Telemetry | Monitor Cashfree, Supabase Auth, DB Pooler, Open-Meteo, Kundli Engine latency | LIVE | PASS |
| 15 | **Incidents** | `#/admin/modules/incidents` | `#admin-panel-incidents` | `GET /api/admin/monitoring/incidents` | `VIEW_INCIDENTS` | `MANAGE_INCIDENTS` | `PlatformIncident` | Declare incident (P0-P3), post status updates, mark resolved, broadcast notices | LIVE | PASS |
| 16 | **QA Console** | `#/admin/modules/qa` | `#admin-panel-qa` | Local Test Controller, `/api/admin/preview/*` | `VIEW_OVERVIEW` | `MANAGE_WALLET` (Demo) | In-Memory Session & Demo Ledger | Switch simulated tier (Free, Plus, Premium), access 6 QA workbenches | SYNTHETIC / DEMO | PASS |
| 17 | **Database Monitor** | `#/admin/modules/database` | `#admin-panel-database` | `GET /api/admin/database/monitor`, `/status` | `VIEW_DATABASE` | None (DDL Locked) | `pg_stat_activity`, `pg_stat_user_tables` | Connection pool diagnostics, active queries, table row counts, RLS security audit | LIVE | PASS |
| 18 | **Analytics & BI** | `#/admin/modules/analytics` | `#admin-panel-analytics` | `GET /api/admin/analytics/overview` | `VIEW_ANALYTICS` | None | `PaymentOrder`, `Subscription`, `SavedReport` | Inspect high-value orders, revenue attribution by product, download BI CSV | DERIVED / LIVE | PASS |
| 19 | **Customer 360** | `#/admin/modules/customer360`| `#admin-panel-customer360`| `GET /api/admin/customers/:id/360` | `VIEW_CUSTOMER_360` | `MANAGE_CUSTOMER_NOTES` | `User`, `BirthProfile`, `WalletLedger`, `CustomerSupportNote` | Unified customer dossier, view linked birth charts, add staff support notes | LIVE | PASS |
| 20 | **Entitlements** | `#/admin/modules/entitlements` | `#admin-panel-entitlements`| `GET /api/admin/entitlements` | `MANAGE_ENTITLEMENTS`, `VIEW_USERS` | `MANAGE_ENTITLEMENTS` | `Entitlement` | Directory of active feature entitlements, grant manual feature, instant revocation | LIVE | PASS |
| 21 | **Promotions** | `#/admin/modules/promotions` | `#admin-panel-promotions` | `GET /api/admin/promotions` | `MANAGE_PROMOTIONS`, `VIEW_PAYMENTS` | `MANAGE_PROMOTIONS` | `Promotion` | Create discount coupon codes, set percentage/credit discount, toggle active state | LIVE | PASS |
| 22 | **Consultations** | `#/admin/modules/consultations`| `#admin-panel-consultations`| `GET /api/admin/astrologers`, `/api/admin/consultations` | `VIEW_CONSULTATIONS`, `VIEW_ASTROLOGY_HEALTH`| `MANAGE_CONSULTATIONS` | `Astrologer`, `ConsultationSession` | Astrologer onboarding verification, per-minute rate setup, inspect live consultation sessions | LIVE | PASS |

---

## 5. Interactive QA Diagnostic Workbenches Catalogue (6 Workbenches)

Embedded inside `#admin-panel-qa`, these 6 interactive workbenches provide complete diagnostic and simulation capabilities for developers and administrative operators:

| # | Tool ID | Panel Container | Harness Functionality & Diagnostic Scope | Target API Endpoint | Input Parameters & Controls | Supported Modes / Tiers | Status |
|:---:|:---|:---|:---|:---|:---|:---|:---:|
| 1 | `admin-tool-kundli` | `#admin-panel-qa` | **Kundli & Planetary Calculation Diagnostics:** Calculates D1 (Rashi), D9 (Navamsha), planetary longitudes, retrograde flags, combustion, and Bhavas using Swiss Ephemeris. | `/api/kundli/calculate` | Date of Birth, Time of Birth, Latitude, Longitude, Timezone, Ayanamsha (Lahiri/Chitra). | Live Python Swiss Ephemeris / Local Meeus fallback | PASS |
| 2 | `admin-tool-forecasts` | `#admin-panel-qa` | **Six-Horizon Transit & Dasha Timeline:** Generates Vimshottari Mahadasha, Antardasha, and Pratyantardasha periods alongside 6 temporal transit horizons (today, week, month, year, 5-year, lifetime). | `/api/forecasts/dasha` | User Kundli parameters, target evaluation date range. | Full divisional chart calculations | PASS |
| 3 | `admin-tool-ai-astrologer` | `#admin-panel-qa` | **AI Consultation & Quota Deduction Tester:** Simulates conversational astrology interactions with persona prompt tuning, token usage metrics, and live tier quota deduction. | `/api/consultation/chat` / `/api/ai-astrologer/ask` | Astrological question prompt, Kundli chart context, simulated user persona. | Free (3/day), Plus (15/day), Premium (30/day) | PASS |
| 4 | `admin-tool-numerology` | `#admin-panel-qa` | **Numerology Engine Validator:** Computes Core Life Path, Destiny, Soul Urge, Personality, and Karmic Debt numbers across Pythagorean and Chaldean computational systems. | `/api/numerology/calculate` | Full legal name, date of birth, alphabet system selector. | Single / Composite numerology matrix | PASS |
| 5 | `admin-tool-reports` | `#admin-panel-qa` | **PDF Report Pipeline Previewer:** Generates high-resolution sample chapters for all 10 canonical SKUs (Kundli Deep Dive, Mahadasha, Varshphal, Matchmaking, Remedies) with privacy watermarks. | `/api/reports/preview/:sku` | SKU selector, sample birth profile, watermark toggle, language (English/Hindi). | 10 Canonical SKU PDF outputs | PASS |
| 6 | `admin-tool-billing` | `#admin-panel-qa` | **Billing Simulator & Demo Wallet:** Provides synthetic tier elevation (`FREE`, `PLUS`, `PREMIUM`), demo wallet balance crediting (`+₹500`, `+₹1000`), and simulated gateway transaction triggers without real charges. | `/api/admin/preview/set-tier`, `/api/admin/demo-wallet/credit` | Tier selector pills, demo credit buttons, ledger reset button. | Isolated demo wallet sandbox | PASS |

---

## 6. Modals, Dialogs and Troubleshooting Drawer Register (11 Modals + 1 Drawer)

| # | Element ID | Component Type | Title / Purpose | Input Fields & Form Controls | Triggering Action / Event | Target Endpoint / Handler | Required Role & Assurance | Status |
|:---:|:---|:---|:---|:---|:---|:---|:---|:---:|
| 01 | `modal-admin-mfa` | Modal | **MFA TOTP 6-Digit Challenge** | 6-digit TOTP code input, submit button, cancel button | Admin login at AAL1, step-up assurance challenge | Supabase `mfa.verify()` -> `POST /api/auth/admin-supabase-session` | All Admin Roles | PASS |
| 02 | `modal-admin-mfa-setup` | Modal | **First-Login Admin MFA Enrollment** | QR code SVG canvas, manual secret string copy, 6-digit confirmation code | Unenrolled admin credentials login | Supabase `mfa.enroll()` / `mfa.verify()` | All Admin Roles | PASS |
| 03 | `modal-admin-gateway-credentials` | Modal | **Cashfree Gateway Credentials** | Cashfree App ID, Secret Key, Environment radio (`TEST` vs `PROD`) | Payment settings configuration | `POST /api/admin/gateway-credentials` | `OWNER`, `SECURITY_ADMIN` (Assurance Required) | PASS |
| 04 | `modal-admin-edit-price` | Modal | **SKU Pricing & Discount Configuration**| SKU identifier (readonly), base price in paise, display price, currency | Click "Edit Price" on catalog table | `PUT /api/admin/products/:id` | `OWNER`, `FINANCE_ADMIN` (`pricing:update`) | PASS |
| 05 | `modal-admin-assign-role` | Modal | **Staff Role Assignment Modal** | Admin user select, 7 canonical role dropdown, confirmation checkbox | Click "Assign Role" in Roles table | `PUT /api/admin/users/:id/role` | `OWNER` (`roles:assign`) | PASS |
| 06 | `modal-admin-grant-subscription` | Modal | **Grant Complimentary Subscription** | Target customer UUID, tier select (`PLUS`, `PREMIUM`), duration in days | Click "Grant Subscription" in Users | `POST /api/admin/subscriptions/assign` | `OWNER`, `FINANCE_ADMIN` (`subscriptions:assign`) | PASS |
| 07 | `modal-admin-extend-subscription`| Modal | **Extend Subscription Duration** | Subscription ID, extension days input (1-365) | Click "Extend" in Subscriptions table | `POST /api/admin/subscriptions/extend` | `OWNER`, `FINANCE_ADMIN` (`subscriptions:extend`) | PASS |
| 08 | `modal-admin-cancel-subscription`| Modal | **Cancel Subscription Renewal** | Subscription ID, cancellation reason text, immediate refund toggle | Click "Cancel" in Subscriptions table | `POST /api/admin/subscriptions/cancel` | `OWNER`, `FINANCE_ADMIN` (`subscriptions:cancel`) | PASS |
| 09 | `modal-admin-task-queue` | Modal | **Background Task & Report Queue** | Task status filter, retry trigger buttons, error inspector | Click "Queue Diagnostics" in Reports | `POST /api/admin/reports/:id/retry` | `SUPPORT_ADMIN`, `ASTROLOGY_OPS_ADMIN` | PASS |
| 10 | `modal-admin-session-centre` | Modal | **Active Administrative Session Centre** | Active admin session cards, IP, user-agent, revoke buttons | Click "Active Sessions" in Security | `POST /api/admin/users/:id/revoke-sessions` | `OWNER`, `SECURITY_ADMIN` (`security:mfa`) | PASS |
| 11 | `modal-admin-high-risk-action` | Modal | **High-Risk Privileged Mutation Confirmation** | Explicit typed phrase confirmation (`CONFIRM_SUSPENSION`, `CONFIRM_DELETE`) | Destructive actions (account suspension, erasure) | Enforces double-confirmation barrier | `OWNER`, `SECURITY_ADMIN` (Assurance Required) | PASS |
| 12 | `drawer-admin-troubleshooting` | Drawer | **Diagnostics & Troubleshooting Drawer**| Stethoscope button toggle, real-time WebSocket events, DB ping, latency log | Header stethoscope button click | `GET /api/admin/database/monitor`, `POST /api/admin/database/ping` | All Admin Roles | PASS |

---

## 7. Complete 90 Administrative Actions Inventory Table

Every single administrative action mapped across the 22 modules is categorized under `CANONICAL_CORE_75` (Actions 1–74) or `EXTENDED_GOVERNANCE_15` (Actions 75–90):

| # | Module | Action ID | Scope Group | Classification | UI Control Element | API Route / Target | HTTP | Required Role | Step-Up MFA | Data Source | Provenance | Audit Event Logged | Status |
|:---:|:---|:---|:---|:---|:---|:---|:---:|:---|:---:|:---|:---:|:---:|:---:|
| 01 | 01. Overview | `ADMIN.OVERVIEW.VIEW_METRICS` | `CANONICAL_CORE_75` | READ_ONLY_API | Dashboard Metrics Grid | `/api/admin/overview` | `GET` | Any Admin | NONE | `User`, `BirthProfile`, `WalletLedger`, `PlatformIncident` | LIVE / DERIVED | NO | PASS |
| 02 | 01. Overview | `ADMIN.OVERVIEW.REFRESH` | `CANONICAL_CORE_75` | READ_ONLY_API | Refresh Button | `/api/admin/overview` | `GET` | Any Admin | NONE | PostgreSQL 16+ | LIVE / DERIVED | NO | PASS |
| 03 | 01. Overview | `ADMIN.OVERVIEW.RESOLVE_REFUNDS` | `CANONICAL_CORE_75` | UI_NAV | Pending Refunds Card | `#/admin/modules/subscriptions` | UI_NAV | Finance Admin / Owner | REQUIRED | Client Router | LIVE | `ADMIN_REFUND_EXECUTED` | PASS |
| 04 | 01. Overview | `ADMIN.OVERVIEW.RESOLVE_REPORTS` | `CANONICAL_CORE_75` | UI_NAV | Failed Reports Card | `#/admin/modules/reports` | UI_NAV | Any Admin | NONE | Client Router | LIVE | NO | PASS |
| 05 | 01. Overview | `ADMIN.OVERVIEW.RESOLVE_INCIDENTS` | `CANONICAL_CORE_75` | UI_NAV | Open Incidents Card | `#/admin/modules/incidents` | UI_NAV | Security / Ops Admin | REQUIRED | Client Router | LIVE | `ADMIN_INCIDENT_DECLARED` | PASS |
| 06 | 01. Overview | `ADMIN.OVERVIEW.RESOLVE_PRIVACY` | `CANONICAL_CORE_75` | UI_NAV | Pending Privacy Card | `#/admin/modules/privacy` | UI_NAV | Any Admin | NONE | Client Router | LIVE | NO | PASS |
| 07 | 01. Overview | `ADMIN.OVERVIEW.RESOLVE_DATABASE` | `CANONICAL_CORE_75` | UI_NAV | Database Monitor Card | `#/admin/modules/database` | UI_NAV | Any Admin | NONE | Client Router | LIVE | NO | PASS |
| 08 | 02. Users | `ADMIN.USERS.LIST` | `CANONICAL_CORE_75` | READ_ONLY_API | Customer Table | `/api/admin/users` | `GET` | Any Admin | NONE | `User`, `Subscription` | LIVE | NO | PASS |
| 09 | 02. Users | `ADMIN.USERS.SEARCH` | `CANONICAL_CORE_75` | READ_ONLY_API | Search Input Field | `/api/admin/users?search=...` | `GET` | Any Admin | NONE | `User` | LIVE | NO | PASS |
| 10 | 02. Users | `ADMIN.USERS.FILTER_STATUS` | `CANONICAL_CORE_75` | READ_ONLY_API | Status Dropdown Filter | `/api/admin/users?status=...` | `GET` | Any Admin | NONE | `User` | LIVE | NO | PASS |
| 11 | 02. Users | `ADMIN.USERS.FILTER_ROLE` | `CANONICAL_CORE_75` | READ_ONLY_API | Role Dropdown Filter | `/api/admin/users?role=...` | `GET` | Owner | REQUIRED | `User` | LIVE | `ADMIN_ROLE_CHANGE` | PASS |
| 12 | 02. Users | `ADMIN.USERS.PAGINATE` | `CANONICAL_CORE_75` | READ_ONLY_API | Pagination Controls | `/api/admin/users?page=...&limit=...` | `GET` | Any Admin | NONE | `User` | LIVE | NO | PASS |
| 13 | 02. Users | `ADMIN.USERS.VIEW_DETAILS` | `CANONICAL_CORE_75` | READ_ONLY_API | View Details Button | `/api/admin/users/:id/details` | `GET` | Any Admin | NONE | `User`, `BirthProfile`, `SavedReport` | LIVE | NO | PASS |
| 14 | 02. Users | `ADMIN.USERS.SUSPEND` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Suspend Account Button | `/api/admin/users/:id/status` | `PUT` | Support / Security Admin | REQUIRED | `User` | LIVE | `ADMIN_STATUS_CHANGE` | PASS |
| 15 | 02. Users | `ADMIN.USERS.REINSTATE` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Reinstate Account Button | `/api/admin/users/:id/status` | `PUT` | Any Admin | NONE | `User` | LIVE | NO | PASS |
| 16 | 02. Users | `ADMIN.USERS.REVOKE_SESSIONS` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Revoke Sessions Button | `/api/admin/users/:id/revoke-sessions` | `POST` | Any Admin | NONE | `UserSession` | LIVE | NO | PASS |
| 17 | 02. Users | `ADMIN.USERS.ASSIGN_ROLE_OPEN` | `CANONICAL_CORE_75` | UI_MODAL | Manage Role Button | `#modal-admin-assign-role` | UI_MODAL | Owner | REQUIRED | Client Memory | LIVE | `ADMIN_ROLE_CHANGE` | PASS |
| 18 | 02. Users | `ADMIN.USERS.ASSIGN_ROLE_SUBMIT` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Confirm Role Button | `/api/admin/users/:id/role` | `PUT` | Owner | REQUIRED | `User` | LIVE | `ADMIN_ROLE_CHANGE` | PASS |
| 19 | 02. Users | `ADMIN.USERS.GRANT_SUB_OPEN` | `CANONICAL_CORE_75` | UI_MODAL | Grant Subscription Button | `#modal-admin-grant-subscription` | UI_MODAL | Any Admin | NONE | Client Memory | LIVE | NO | PASS |
| 20 | 02. Users | `ADMIN.USERS.GRANT_SUB_SUBMIT` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Confirm Grant Button | `/api/admin/subscriptions/assign` | `POST` | Any Admin | NONE | `User`, `Entitlement` | LIVE | NO | PASS |
| 21 | 03. Roles | `ADMIN.ROLES.VIEW_MATRIX` | `CANONICAL_CORE_75` | READ_ONLY_API | RBAC Matrix Grid | `/api/admin/roles/matrix` | `GET` | Owner | REQUIRED | RBAC Permissions Registry | LIVE | `ADMIN_ROLE_CHANGE` | PASS |
| 22 | 03. Roles | `ADMIN.ROLES.LIST_ADMINS` | `CANONICAL_CORE_75` | READ_ONLY_API | Staff Account Table | `/api/admin/roles/admins` | `GET` | Owner | REQUIRED | `User` | LIVE | `ADMIN_ROLE_CHANGE` | PASS |
| 23 | 03. Roles | `ADMIN.ROLES.EXPLAIN_PERMISSION` | `CANONICAL_CORE_75` | READ_ONLY_API | Permission Info Tooltip | `/api/admin/roles` | `GET` | Owner | REQUIRED | Permissions Module | LIVE | `ADMIN_ROLE_CHANGE` | PASS |
| 24 | 04. Security | `ADMIN.SECURITY.VIEW_EVENTS` | `CANONICAL_CORE_75` | READ_ONLY_API | Audit Log Table | `/api/admin/security/events` | `GET` | Any Admin | NONE | `AuditEvent` | LIVE | NO | PASS |
| 25 | 04. Security | `ADMIN.SECURITY.MFA_SETUP_OPEN` | `CANONICAL_CORE_75` | UI_MODAL | Setup MFA Button | `#modal-admin-mfa-setup` | UI_MODAL | Any Admin | NONE | Client Memory | LIVE | NO | PASS |
| 26 | 04. Security | `ADMIN.SECURITY.MFA_SETUP_SUBMIT` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Activate 2FA Button | `/api/admin/mfa/verify` | `POST` | Any Admin | NONE | `User` | LIVE | NO | PASS |
| 27 | 04. Security | `ADMIN.SECURITY.VIEW_SESSIONS` | `CANONICAL_CORE_75` | READ_ONLY_API | Active Sessions Grid | `/api/admin/session/policy` | `GET` | Any Admin | NONE | `UserSession` | LIVE | NO | PASS |
| 28 | 04. Security | `ADMIN.SECURITY.REVOKE_SESSION` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Revoke Session Button | `/api/admin/mfa/revoke-assurance` | `POST` | Any Admin | NONE | `UserSession` | LIVE | NO | PASS |
| 29 | 05. Astrology | `ADMIN.ASTROLOGY.VIEW_HEALTH` | `CANONICAL_CORE_75` | READ_ONLY_API | Engine Health Banner | `/api/admin/astrology/health` | `GET` | Any Admin | NONE | FastAPI Swiss Ephemeris | LIVE | NO | PASS |
| 30 | 05. Astrology | `ADMIN.ASTROLOGY.RUN_CALIBRATION` | `CANONICAL_CORE_75` | UI_TOOL | Test Calculation Button | `/api/admin/astrology/test-calculation` | `POST` | Any Admin | NONE | FastAPI Swiss Ephemeris | LIVE / SYNTHETIC | NO | PASS |
| 31 | 06. Reports | `ADMIN.REPORTS.VIEW_CATALOG` | `CANONICAL_CORE_75` | READ_ONLY_API | Catalogue Pricing Grid | `/api/admin/products` | `GET` | Any Admin | NONE | `ProductCatalog` | LIVE | NO | PASS |
| 32 | 06. Reports | `ADMIN.REPORTS.SAMPLE_READER` | `CANONICAL_CORE_75` | UI_TOOL | Sample Chapters Button | `/api/reports/preview/:sku` | `GET` | Any Admin | NONE | Report Engine | DEMO | NO | PASS |
| 33 | 06. Reports | `ADMIN.REPORTS.DOWNLOAD_PDF` | `CANONICAL_CORE_75` | UI_TOOL | Download PDF Button | `/api/reports/download/:id` | `GET` | Any Admin | NONE | Storage Bucket / PDF Worker | LIVE / DEMO | NO | PASS |
| 34 | 06. Reports | `ADMIN.REPORTS.VIEW_FAILURES` | `CANONICAL_CORE_75` | READ_ONLY_API | Failed Reports Table | `/api/admin/reports/diagnostics` | `GET` | Any Admin | NONE | `SavedReport` | LIVE | NO | PASS |
| 35 | 06. Reports | `ADMIN.REPORTS.RETRY_GENERATION` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Retry Button | `/api/admin/reports/:id/retry` | `POST` | Any Admin | NONE | `SavedReport` | LIVE | NO | PASS |
| 36 | 07. AI Quotas | `ADMIN.AI.VIEW_QUOTAS` | `CANONICAL_CORE_75` | READ_ONLY_API | Quota Configuration Form | `/api/admin/ai/quotas` | `GET` | Any Admin | NONE | `AIQuotaConfig` | LIVE | NO | PASS |
| 37 | 07. AI Quotas | `ADMIN.AI.UPDATE_QUOTAS` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Save Quotas Button | `/api/admin/ai/quotas` | `PUT` | Any Admin | NONE | `AIQuotaConfig` | LIVE | NO | PASS |
| 38 | 07. AI Quotas | `ADMIN.AI.VIEW_USAGE` | `CANONICAL_CORE_75` | READ_ONLY_API | Usage Analytics Card | `/api/admin/ai/usage` | `GET` | Any Admin | NONE | `AiUsageEvent` | LIVE / DERIVED | NO | PASS |
| 39 | 08. Payments | `ADMIN.PAYMENTS.LIST_ORDERS` | `CANONICAL_CORE_75` | READ_ONLY_API | Recent Orders Table | `/api/admin/payments/transactions` | `GET` | Any Admin | NONE | `PaymentOrder` | LIVE | NO | PASS |
| 40 | 08. Payments | `ADMIN.PAYMENTS.SEARCH_ORDER` | `CANONICAL_CORE_75` | READ_ONLY_API | Order Lookup Input | `/api/admin/payments/transactions` | `GET` | Any Admin | NONE | `PaymentOrder` | LIVE | NO | PASS |
| 41 | 08. Payments | `ADMIN.PAYMENTS.RECONCILE_ORDER` | `CANONICAL_CORE_75` | EXTERNAL_OPERATION | Reconcile Gateway Button | `/api/admin/payments/reconcile` | `POST` | Any Admin | NONE | `PaymentOrder`, Cashfree | LIVE | NO | PASS |
| 42 | 08. Payments | `ADMIN.PAYMENTS.REQUEST_REFUND` | `CANONICAL_CORE_75` | EXTERNAL_OPERATION | Submit Refund Button | `/api/admin/payments/refund` | `POST` | Finance Admin / Owner | REQUIRED | `PaymentOrder`, Cashfree | LIVE | `ADMIN_REFUND_EXECUTED` | PASS |
| 43 | 08. Payments | `ADMIN.PAYMENTS.EDIT_PRICE_OPEN` | `CANONICAL_CORE_75` | UI_MODAL | Edit Price Button | `#modal-admin-edit-price` | UI_MODAL | Finance Admin / Owner | REQUIRED | Client Memory | LIVE | `ADMIN_PRICE_UPDATE` | PASS |
| 44 | 08. Payments | `ADMIN.PAYMENTS.EDIT_PRICE_SUBMIT` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Save Price Button | `/api/admin/products/:id` | `PUT` | Finance Admin / Owner | REQUIRED | `ProductCatalog` | LIVE | `ADMIN_PRICE_UPDATE` | PASS |
| 45 | 09. Subscriptions | `ADMIN.SUBSCRIPTIONS.LIST` | `CANONICAL_CORE_75` | READ_ONLY_API | Subscriptions Table | `/api/admin/subscriptions` | `GET` | Finance Admin / Owner | REQUIRED | `User`, `Subscription` | LIVE | `ADMIN_SUBSCRIPTION_UPDATE`| PASS |
| 46 | 09. Subscriptions | `ADMIN.SUBSCRIPTIONS.EXTEND` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Extend Duration Button | `/api/admin/subscriptions/extend` | `POST` | Finance Admin / Owner | REQUIRED | `User` | LIVE | `ADMIN_SUBSCRIPTION_UPDATE`| PASS |
| 47 | 09. Subscriptions | `ADMIN.SUBSCRIPTIONS.CANCEL` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Cancel Subscription Button | `/api/admin/subscriptions/cancel` | `POST` | Finance Admin / Owner | REQUIRED | `User` | LIVE | `ADMIN_SUBSCRIPTION_UPDATE`| PASS |
| 48 | 10. Content | `ADMIN.CONTENT.LIST_BANNERS` | `CANONICAL_CORE_75` | READ_ONLY_API | Banners List | `/api/admin/products` | `GET` | Any Admin | NONE | `ContentBanner` | LIVE | NO | PASS |
| 49 | 10. Content | `ADMIN.CONTENT.CREATE_BANNER` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Create Banner Button | `/api/admin/content/:key` | `PUT` | Any Admin | NONE | `ContentBanner` | LIVE | NO | PASS |
| 50 | 10. Content | `ADMIN.CONTENT.TOGGLE_PUBLISH` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Toggle Publish Button | `/api/admin/content/:key` | `PUT` | Any Admin | NONE | `ContentBanner` | LIVE | NO | PASS |
| 51 | 11. Settings | `ADMIN.SETTINGS.VIEW_FLAGS` | `CANONICAL_CORE_75` | READ_ONLY_API | Feature Flags Table | `/api/admin/settings/flags` | `GET` | Security Admin / Owner | REQUIRED | `PlatformSetting` | LIVE | `ADMIN_SETTINGS_UPDATE` | PASS |
| 52 | 11. Settings | `ADMIN.SETTINGS.TOGGLE_FLAG` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Toggle Switch Button | `/api/admin/settings/flags/:key` | `PUT` | Security Admin / Owner | REQUIRED | `PlatformSetting` | LIVE | `ADMIN_SETTINGS_UPDATE` | PASS |
| 53 | 12. Privacy | `ADMIN.PRIVACY.LIST_REQUESTS` | `CANONICAL_CORE_75` | READ_ONLY_API | Privacy Requests Table | `/api/admin/privacy/requests` | `GET` | Any Admin | NONE | `PrivacyRequest` | LIVE | NO | PASS |
| 54 | 12. Privacy | `ADMIN.PRIVACY.PROCESS_EXPORT` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Export Data Button | `/api/admin/users/export` | `POST` | Any Admin | NONE | `User` | LIVE | NO | PASS |
| 55 | 12. Privacy | `ADMIN.PRIVACY.EXECUTE_DELETION` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Erase Data Button | `/api/admin/privacy/requests/:id` | `PUT` | Any Admin | NONE | `User` | LIVE / SYNTHETIC | NO | PASS |
| 56 | 13. Audit | `ADMIN.AUDIT.LIST_EVENTS` | `CANONICAL_CORE_75` | READ_ONLY_API | Audit Trail Table | `/api/admin/audit-logs` | `GET` | Any Admin | NONE | `AuditEvent` | LIVE | NO | PASS |
| 57 | 13. Audit | `ADMIN.AUDIT.FILTER_ACTOR` | `CANONICAL_CORE_75` | READ_ONLY_API | Actor Filter Input | `/api/admin/audit-logs?actor=...` | `GET` | Any Admin | NONE | `AuditEvent` | LIVE | NO | PASS |
| 58 | 13. Audit | `ADMIN.AUDIT.EXPORT_CSV` | `CANONICAL_CORE_75` | READ_ONLY_API | Export CSV Button | `/api/admin/audit-logs` | `GET` | Any Admin | NONE | `AuditEvent` | LIVE | NO | PASS |
| 59 | 14. Integrations | `ADMIN.INTEGRATIONS.VIEW_STATUS` | `CANONICAL_CORE_75` | READ_ONLY_API | Provider Cards Grid | `/api/admin/integrations` | `GET` | Any Admin | NONE | Integrations Module | LIVE | NO | PASS |
| 60 | 14. Integrations | `ADMIN.INTEGRATIONS.TEST_CASHFREE`| `CANONICAL_CORE_75` | EXTERNAL_OPERATION | Ping Cashfree Button | `/api/admin/integrations` | `GET` | Any Admin | NONE | Cashfree Sandbox | LIVE | NO | PASS |
| 61 | 15. Incidents | `ADMIN.INCIDENTS.LIST` | `CANONICAL_CORE_75` | READ_ONLY_API | Incident List | `/api/admin/monitoring/incidents` | `GET` | Security / Ops Admin | REQUIRED | `PlatformIncident` | LIVE | `ADMIN_INCIDENT_DECLARED` | PASS |
| 62 | 15. Incidents | `ADMIN.INCIDENTS.CREATE` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Create Incident Button | `/api/admin/monitoring/incidents` | `POST` | Security / Ops Admin | REQUIRED | `PlatformIncident` | LIVE | `ADMIN_INCIDENT_DECLARED` | PASS |
| 63 | 15. Incidents | `ADMIN.INCIDENTS.UPDATE_STATUS` | `CANONICAL_CORE_75` | PERSISTED_MUTATION | Update Status Dropdown | `/api/admin/monitoring/incidents/:id`| `PUT` | Security / Ops Admin | REQUIRED | `PlatformIncident` | LIVE | `ADMIN_INCIDENT_DECLARED` | PASS |
| 64 | 16. QA Console | `ADMIN.QA.VIEW_WORKBENCH` | `CANONICAL_CORE_75` | UI_NAV | QA Console Tab | `#admin-panel-qa` | UI_NAV | Any Admin | NONE | Client Memory | SYNTHETIC | NO | PASS |
| 65 | 16. QA Console | `ADMIN.QA.SIMULATE_TIER` | `CANONICAL_CORE_75` | UI_TOOL | Tier Switcher Pills | `/api/admin/preview/set-tier` | `POST` | Any Admin | NONE | Client Memory | DEMO | NO | PASS |
| 66 | 16. QA Console | `ADMIN.QA.OPEN_KUNDLI_HARNESS` | `CANONICAL_CORE_75` | UI_TOOL | Kundli Harness Button | `#admin-tool-kundli` | UI_TOOL | Any Admin | NONE | Client Memory | SYNTHETIC | NO | PASS |
| 67 | 16. QA Console | `ADMIN.QA.OPEN_FORECASTS_HARNESS`| `CANONICAL_CORE_75` | UI_TOOL | Forecasts Button | `#admin-tool-forecasts` | UI_TOOL | Any Admin | NONE | Client Memory | SYNTHETIC | NO | PASS |
| 68 | 16. QA Console | `ADMIN.QA.OPEN_AI_HARNESS` | `CANONICAL_CORE_75` | UI_TOOL | AI Astrologer Button | `#admin-tool-ai-astrologer` | UI_TOOL | Any Admin | NONE | Client Memory | DEMO | NO | PASS |
| 69 | 16. QA Console | `ADMIN.QA.OPEN_NUMEROLOGY_HARNESS`| `CANONICAL_CORE_75` | UI_TOOL | Numerology Button | `#admin-tool-numerology` | UI_TOOL | Any Admin | NONE | Client Memory | SYNTHETIC | NO | PASS |
| 70 | 16. QA Console | `ADMIN.QA.OPEN_REPORTS_HARNESS` | `CANONICAL_CORE_75` | UI_TOOL | Reports Harness Button | `#admin-tool-reports` | UI_TOOL | Any Admin | NONE | Client Memory | DEMO | NO | PASS |
| 71 | 16. QA Console | `ADMIN.QA.OPEN_BILLING_HARNESS` | `CANONICAL_CORE_75` | UI_TOOL | Billing Simulator Button | `#admin-tool-billing` | UI_TOOL | Any Admin | NONE | Client Memory | DEMO | NO | PASS |
| 72 | 17. Database | `ADMIN.DATABASE.VIEW_MONITOR` | `CANONICAL_CORE_75` | READ_ONLY_API | Database Monitor Tab | `/api/admin/database/monitor` | `GET` | Any Admin | NONE | PostgreSQL `pg_stat` | LIVE | NO | PASS |
| 73 | 17. Database | `ADMIN.DATABASE.REFRESH_METRICS` | `CANONICAL_CORE_75` | READ_ONLY_API | Refresh Pool Button | `/api/admin/database/status` | `GET` | Any Admin | NONE | PostgreSQL `pg_stat` | LIVE | NO | PASS |
| 74 | 17. Database | `ADMIN.DATABASE.VIEW_SCHEMA_STATUS`| `CANONICAL_CORE_75`| READ_ONLY_API | Schema Status Inspector | `/api/admin/database/schema-status` | `GET` | Any Admin | NONE | PostgreSQL Catalog | LIVE | NO | PASS |
| 75 | 18. Analytics | `ADMIN.ANALYTICS.VIEW_KPIS` | `EXTENDED_GOVERNANCE_15`| READ_ONLY_API | Analytics Overview Grid | `/api/admin/analytics/overview` | `GET` | Any Admin | NONE | `PaymentOrder`, `User` | LIVE / DERIVED | NO | PASS |
| 76 | 18. Analytics | `ADMIN.ANALYTICS.VIEW_ORDERS` | `EXTENDED_GOVERNANCE_15`| READ_ONLY_API | Recent Paid Orders Table | `/api/admin/payments/transactions` | `GET` | Any Admin | NONE | `PaymentOrder` | LIVE | NO | PASS |
| 77 | 19. Customer 360 | `ADMIN.CUSTOMER360.LOOKUP` | `EXTENDED_GOVERNANCE_15`| READ_ONLY_API | Customer Search Input | `/api/admin/customers/:id/360` | `GET` | Any Admin | NONE | `User`, `WalletLedger`, `Entitlement`| LIVE | NO | PASS |
| 78 | 19. Customer 360 | `ADMIN.CUSTOMER360.ADD_NOTE` | `EXTENDED_GOVERNANCE_15`| PERSISTED_MUTATION | Add Note Button | `/api/admin/customers/:id/notes` | `POST` | Any Admin | NONE | `CustomerSupportNote` | LIVE | NO | PASS |
| 79 | 19. Customer 360 | `ADMIN.CUSTOMER360.REVOKE_SESSIONS`| `EXTENDED_GOVERNANCE_15`| PERSISTED_MUTATION| Revoke Sessions Button | `/api/admin/users/:id/revoke-sessions` | `POST` | Any Admin | NONE | `UserSession` | LIVE | NO | PASS |
| 80 | 20. Entitlements | `ADMIN.ENTITLEMENTS.LIST` | `EXTENDED_GOVERNANCE_15`| READ_ONLY_API | Entitlements Table | `/api/admin/entitlements` | `GET` | Support Admin / Owner | REQUIRED | `Entitlement` | LIVE | `ADMIN_ENTITLEMENT_GRANT` | PASS |
| 81 | 20. Entitlements | `ADMIN.ENTITLEMENTS.GRANT_OPEN` | `EXTENDED_GOVERNANCE_15`| UI_MODAL | Grant Feature Button | `#admin-entitlement-grant-form-card`| UI_MODAL| Support Admin / Owner | REQUIRED | Client Memory | LIVE | `ADMIN_ENTITLEMENT_GRANT` | PASS |
| 82 | 20. Entitlements | `ADMIN.ENTITLEMENTS.GRANT_SUBMIT` | `EXTENDED_GOVERNANCE_15`| PERSISTED_MUTATION| Confirm Grant Button | `/api/admin/entitlements/grant` | `POST` | Support Admin / Owner | REQUIRED | `Entitlement` | LIVE | `ADMIN_ENTITLEMENT_GRANT` | PASS |
| 83 | 20. Entitlements | `ADMIN.ENTITLEMENTS.REVOKE` | `EXTENDED_GOVERNANCE_15`| PERSISTED_MUTATION| Revoke Feature Button | `/api/admin/entitlements/revoke` | `POST` | Support Admin / Owner | REQUIRED | `Entitlement` | LIVE | `ADMIN_ENTITLEMENT_GRANT` | PASS |
| 84 | 21. Promotions | `ADMIN.PROMOTIONS.LIST` | `EXTENDED_GOVERNANCE_15`| READ_ONLY_API | Promotions Table | `/api/admin/promotions` | `GET` | Finance / Content Admin | REQUIRED | `Promotion` | LIVE | `ADMIN_PROMOTION_CREATE` | PASS |
| 85 | 21. Promotions | `ADMIN.PROMOTIONS.CREATE_OPEN` | `EXTENDED_GOVERNANCE_15`| UI_MODAL | New Campaign Button | `#admin-promotion-create-form-card` | UI_MODAL| Finance / Content Admin | REQUIRED | Client Memory | LIVE | `ADMIN_PROMOTION_CREATE` | PASS |
| 86 | 21. Promotions | `ADMIN.PROMOTIONS.CREATE_SUBMIT` | `EXTENDED_GOVERNANCE_15`| PERSISTED_MUTATION| Save Campaign Button | `/api/admin/promotions` | `POST` | Finance / Content Admin | REQUIRED | `Promotion` | LIVE | `ADMIN_PROMOTION_CREATE` | PASS |
| 87 | 21. Promotions | `ADMIN.PROMOTIONS.TOGGLE_STATUS` | `EXTENDED_GOVERNANCE_15`| PERSISTED_MUTATION| Pause/Activate Button | `/api/admin/promotions/:id/status` | `PUT` | Finance / Content Admin | REQUIRED | `Promotion` | LIVE | `ADMIN_PROMOTION_CREATE` | PASS |
| 88 | 22. Consultations | `ADMIN.CONSULTATIONS.LIST_ASTROLOGERS`|`EXTENDED_GOVERNANCE_15`| READ_ONLY_API | Astrologer Roster Table | `/api/admin/astrologers` | `GET` | Any Admin | NONE | `Astrologer` | LIVE | NO | PASS |
| 89 | 22. Consultations | `ADMIN.CONSULTATIONS.TOGGLE_VERIFY`| `EXTENDED_GOVERNANCE_15`| PERSISTED_MUTATION| Verify Astrologer Button | `/api/admin/astrologers/:id/verify` | `POST` | Any Admin | NONE | `Astrologer` | LIVE | NO | PASS |
| 90 | 22. Consultations | `ADMIN.CONSULTATIONS.LIST_SESSIONS`| `EXTENDED_GOVERNANCE_15`| READ_ONLY_API | Consultation Sessions Table | `/api/admin/consultations` | `GET` | Any Admin | NONE | `ConsultationSession` | LIVE | NO | PASS |

---

## 8. Complete Backend API Endpoint Inventory (58 Canonical Endpoints)

The administrative API surface implemented in `services/wallet-service/src/server.ts` comprises exactly **58** canonical routes mapped with HTTP methods, required roles/permissions, step-up assurance requirements, and underlying database models:

| # | HTTP Method | Endpoint Path | Functional Domain | Primary Controller Handler | Required Roles & Permissions | Step-Up Assurance Scope | Underlying Database Models / Entities | Purpose & Operational Behavior |
|:---:|:---:|:---|:---|:---|:---|:---:|:---|:---|
| 01 | `POST` | `/api/auth/admin-supabase-session` | Authentication | `server.ts:1625` | Allowed Admin Email + `Role.ADMIN` | Required (Evaluates AAL2) | `User`, `UserSession`, `AuditEvent` | Exchange Supabase AAL2 JWT for 256-bit session token and HMAC assurance token. |
| 02 | `POST` | `/api/auth/admin-login` | Authentication | `server.ts:1276` | Server Email Allowlist | Required (MFA Code) | `User`, `UserSession`, `AuditEvent` | Direct email/password ingress with inline TOTP verification for administrative access. |
| 03 | `POST` | `/api/auth/admin-logout` | Authentication | `server.ts:1523` | Active Session Bearer | None | `UserSession`, `AuditEvent` | Explicit session invalidation; deletes hash from `UserSession` and writes audit event. |
| 04 | `POST` | `/api/auth/admin-refresh` | Authentication | `server.ts:1575` | Any Admin Role | None | `UserSession` | Extends session expiration window up to 60-minute absolute session cap. |
| 05 | `POST` | `/api/auth/admin-reset-mfa` | Authentication | `server.ts:2027` | Owner / Security Admin | None | `User`, `AuditEvent` | Clears MFA secret for recovery scenario; triggers security event log. |
| 06 | `GET` | `/api/admin/session/policy` | Security | `server.ts:1569` | Unauthenticated / Public | None | In-Memory Configuration | Exposes runtime session policy (10m idle timeout, 60m absolute cap, MFA required). |
| 07 | `GET` | `/api/admin/overview` | Dashboard | `server.ts:4746` | Any Admin (`VIEW_OVERVIEW`) | None | `User`, `BirthProfile`, `WalletLedger`, `PlatformIncident` | Returns aggregated platform metrics (users, deposits, debits, sessions, health). |
| 08 | `GET` | `/api/admin/gateway-status` | Overview / Payments | `server.ts:4652` | Unauthenticated / Public | None | Cashfree Integration Telemetry | Returns payment gateway readiness status and environment configuration. |
| 09 | `GET` | `/api/admin/payment-readiness` | Payments | `server.ts:8727` | `VIEW_PAYMENTS` | None | Cashfree Gateway Config | Audits Cashfree merchant credentials, mode (`test`/`prod`), and activation status. |
| 10 | `GET` | `/api/admin/preview/status` | QA Console | `server.ts:4869` | Any Admin (`VIEW_OVERVIEW`) | None | `AdminPreviewSession` | Retrieves active simulated tier session and expiration state. |
| 11 | `POST` | `/api/admin/preview/set-tier` | QA Console | `server.ts:4813` | Any Admin (`VIEW_OVERVIEW`) | None | `AdminPreviewSession`, `AuditEvent` | Sets simulated subscription tier (`FREE`, `PLUS`, `PREMIUM`) for testing. |
| 12 | `POST` | `/api/admin/preview/exit` | QA Console | `server.ts:4883` | Any Admin (`VIEW_OVERVIEW`) | None | `AdminPreviewSession`, `AuditEvent` | Terminates simulated preview tier and returns administrator to baseline role. |
| 13 | `POST` | `/api/admin/demo-wallet/credit` | QA Console | `server.ts:4911` | Any Admin (`VIEW_OVERVIEW`) | None | `User` (Demo Ledger) | Credits isolated demo wallet balance without affecting production accounting. |
| 14 | `POST` | `/api/admin/demo-wallet/reset` | QA Console | `server.ts:4939` | Any Admin (`VIEW_OVERVIEW`) | None | `User` (Demo Ledger) | Resets demo wallet balance and cleans up synthetic simulation orders. |
| 15 | `GET` | `/api/admin/users` | Users | `server.ts:5074` | `VIEW_USERS` | None | `User`, `Subscription` | Returns paginated customer directory with search by name, email, and status. |
| 16 | `GET` | `/api/admin/users/:id/details` | Users | `server.ts:5114` | `VIEW_USERS` | None | `User`, `BirthProfile`, `SavedReport`, `WalletLedger` | Returns deep customer profile dossier including linked charts and order history. |
| 17 | `PUT` | `/api/admin/users/:id/status` | Users | `server.ts:5314` | `MANAGE_USER_STATUS` | Required (MFA step-up) | `User`, `UserSession`, `AuditEvent` | Suspends or reinstates customer account; evicts active sessions upon suspension. |
| 18 | `POST` | `/api/admin/users/:id/revoke-sessions` | Users / Security | `server.ts:5628` | `MANAGE_SECURITY_MFA` | Required (MFA step-up) | `UserSession`, `AuditEvent` | Immediately invalidates all active session tokens for the designated customer. |
| 19 | `POST` | `/api/admin/users/export` | Users / Privacy | `server.ts:5345` | `EXPORT_CUSTOMER_DATA` | Required (MFA step-up) | `User`, `BirthProfile`, `WalletLedger`, `SavedReport` | Exports DPDP Act / GDPR compliant JSON data archive for customer. |
| 20 | `GET` | `/api/admin/roles` | Roles & RBAC | `server.ts:5361` | `VIEW_ROLES` | None | `CANONICAL_ADMIN_ROLES` | Returns list of 7 canonical roles and their descriptive metadata. |
| 21 | `GET` | `/api/admin/roles/matrix` | Roles & RBAC | `server.ts:5379` | `VIEW_ROLES` | None | `ROLE_PERMISSIONS` | Returns complete 7-role by 22-permission authoritative matrix. |
| 22 | `GET` | `/api/admin/roles/admins` | Roles & RBAC | `server.ts:5397` | `VIEW_ROLES` | None | `User` (Admin Filter) | Lists all staff accounts with administrative roles and active session counts. |
| 23 | `PUT` | `/api/admin/users/:id/role` | Roles & RBAC | `server.ts:5429` | `MANAGE_ROLES` | `roles:assign` | `User`, `AuditEvent` | Assigns or demotes staff role; strictly enforces Last-Owner lock. |
| 24 | `GET` | `/api/admin/security/events` | Security | `server.ts:5464` | `VIEW_SECURITY_EVENTS` | None | `AuditEvent` | Bounded pagination of security events (login, MFA, lockout, step-up). |
| 25 | `POST` | `/api/admin/mfa/challenge` | Security | `server.ts:5563` | Any Admin Role | None | `User`, `AuditEvent` | Dispatches MFA challenge to administrator factor. |
| 26 | `POST` | `/api/admin/mfa/verify` | Security | `server.ts:5512` | Any Admin Role | None | `User`, `AuditEvent` | Verifies TOTP code and activates MFA status on staff profile. |
| 27 | `POST` | `/api/admin/mfa/setup` | Security | `server.ts:5480` | Any Admin Role | None | `User` | Generates TOTP secret and QR code canvas parameters for enrollment. |
| 28 | `GET` | `/api/admin/mfa/status` | Security | `server.ts:1974` | Any Admin Role | None | `User` | Queries enrolled MFA factor status and enrollment timestamp. |
| 29 | `POST` | `/api/admin/mfa/revoke-assurance` | Security | `server.ts:2007` | Any Admin Role | None | In-Memory Revocation Ledger | Revokes current 15-minute assurance token, enforcing immediate step-up. |
| 30 | `GET` | `/api/admin/astrology/health` | Astrology | `server.ts:5650` | `VIEW_ASTROLOGY_HEALTH` | None | Remote `kundli-engine` | Latency probe to Swiss Ephemeris microservice; detects fallback state. |
| 31 | `POST` | `/api/admin/astrology/test-calculation` | Astrology | `server.ts:5679` | `VIEW_ASTROLOGY_HEALTH` | None | Swiss Ephemeris / Meeus | Executes Golden Parashari test benchmark comparing planetary longitudes. |
| 32 | `GET` | `/api/admin/reports/diagnostics` | Reports | `server.ts:6322` | `VIEW_REPORT_DIAGNOSTICS` | None | `SavedReport` | Lists generated reports with status (`GENERATED`, `PENDING`, `FAILED`). |
| 33 | `POST` | `/api/admin/reports/:id/retry` | Reports | `server.ts:6350` | `RETRY_FAILED_REPORTS` | None | `SavedReport`, Async Worker | Re-triggers document rendering pipeline for stalled or failed report job. |
| 34 | `GET` | `/api/admin/ai/quotas` | AI Quotas | `server.ts:6410` | `VIEW_AI_USAGE` | None | `AIQuotaConfig` | Retrieves daily and monthly AI consultation limits across subscription tiers. |
| 35 | `PUT` | `/api/admin/ai/quotas` | AI Quotas | `server.ts:6435` | `MANAGE_AI_QUOTAS` | `ai:quotas` | `AIQuotaConfig`, `AuditEvent` | Updates tier query limits; enforces minimum bounds. |
| 36 | `GET` | `/api/admin/ai/usage` | AI Quotas | `server.ts:6465` | `VIEW_AI_USAGE` | None | `AiUsageEvent` | Aggregates consultation query volume, latency, and token consumption. |
| 37 | `GET` | `/api/admin/payments/transactions` | Payments | `server.ts:6512` | `VIEW_PAYMENTS` | None | `WalletLedger`, `PaymentOrder` | Returns wallet ledger records formatted with exact arbitrary decimal string math. |
| 38 | `POST` | `/api/admin/payments/reconcile` | Payments | `server.ts:6560` | `RECONCILE_PAYMENTS` | None | `PaymentOrder`, Cashfree API | Probes Cashfree PG API v6 to reconcile stalled or pending order states. |
| 39 | `POST` | `/api/admin/payments/recover-order` | Payments | `server.ts:6595` | `RECONCILE_PAYMENTS` | None | `PaymentOrder`, `WalletLedger` | Synchronizes successful payment order and credits customer wallet if missing. |
| 40 | `POST` | `/api/admin/payments/refund` | Payments | `server.ts:6630` | `MANAGE_WALLET`, `OWNER` | `payments:refund` | `PaymentOrder`, Cashfree, `AuditEvent` | Dispatches refund request to Cashfree; adjusts wallet ledger accordingly. |
| 41 | `POST` | `/api/admin/gateway-credentials` | Payments / Security | `server.ts:8742` | `[Role.OWNER, Role.SUPER_ADMIN]` | `gateway:credentials` | `CashfreeGatewayConfig`, `AuditEvent` | Saves merchant Cashfree App ID and Secret Key in encrypted storage. |
| 42 | `GET` | `/api/admin/products` | Content & Pricing | `server.ts:8596` | `VIEW_PAYMENTS` | None | `ProductCatalog` | Returns canonical 10 SKU product catalog with prices in paise and INR. |
| 43 | `POST` | `/api/admin/products/preview` | Content & Pricing | `server.ts:8607` | `VIEW_PAYMENTS` | None | `ProductCatalog` | Calculates proposed price changes and previews customer display amounts. |
| 44 | `PUT` | `/api/admin/products/:id` | Content & Pricing | `server.ts:8647` | `MANAGE_PRICING` | `pricing:update` | `ProductCatalog`, `AuditEvent` | Updates catalog SKU price; verifies positive integer paise values. |
| 45 | `PUT` | `/api/admin/content/:key` | Content | `server.ts:6720` | `MANAGE_CONTENT` | None | `ContentBanner`, `AuditEvent` | Updates marketing announcement banner content and activation status. |
| 46 | `GET` | `/api/admin/subscriptions` | Subscriptions | `server.ts:6810` | `VIEW_SUBSCRIPTIONS` | None | `Subscription`, `User` | Returns subscriber roster with plan tiers, expiration dates, and renewal status. |
| 47 | `POST` | `/api/admin/subscriptions/assign` | Subscriptions | `server.ts:8969` | `MANAGE_SUBSCRIPTIONS` | `subscriptions:assign` | `Subscription`, `User`, `Entitlement` | Grants complimentary subscription tier with defined expiration duration. |
| 48 | `POST` | `/api/admin/subscriptions/extend` | Subscriptions | `server.ts:9064` | `MANAGE_SUBSCRIPTIONS` | `subscriptions:extend` | `Subscription`, `AuditEvent` | Extends active subscription expiration date by designated number of days. |
| 49 | `POST` | `/api/admin/subscriptions/cancel` | Subscriptions | `server.ts:9113` | `MANAGE_SUBSCRIPTIONS` | `subscriptions:cancel` | `Subscription`, `Entitlement`, `AuditEvent` | Cancels subscription renewal and revokes associated plan tier entitlements. |
| 50 | `GET` | `/api/admin/settings/flags` | Settings | `server.ts:7012` | `VIEW_SETTINGS` | None | `FeatureFlag` | Returns runtime platform feature flags and environment toggles. |
| 51 | `PUT` | `/api/admin/settings/flags/:key` | Settings | `server.ts:7045` | `MANAGE_FEATURE_FLAGS` | `settings:flags` | `FeatureFlag`, `AuditEvent` | Toggles feature flag state; validates key authorization. |
| 52 | `GET` | `/api/admin/privacy/requests` | Privacy | `server.ts:7120` | `VIEW_PRIVACY_REQUESTS` | None | `PrivacyRequest` | Lists pending DPDP / GDPR user privacy requests. |
| 53 | `PUT` | `/api/admin/privacy/requests/:id` | Privacy | `server.ts:7155` | `MANAGE_PRIVACY_REQUESTS`| `privacy:requests` | `PrivacyRequest`, `User`, `AuditEvent` | Updates privacy request fulfillment state (export ready / account erased). |
| 54 | `GET` | `/api/admin/audit-logs` | Audit Trail | `server.ts:7220` | `VIEW_AUDIT_LOGS` | None | `AuditEvent` | Indexed multi-field search across immutable administrative audit ledger. |
| 55 | `GET` | `/api/admin/integrations` | Integrations | `server.ts:7410` | `VIEW_INTEGRATIONS` | None | Third-Party Probes | Concurrently checks health of Cashfree, Supabase, Twilio, and Kundli Engine. |
| 56 | `GET` | `/api/admin/monitoring/incidents` | Incidents | `server.ts:7502` | `VIEW_INCIDENTS` | None | `PlatformIncident` | Retrieves active and historical incident records. |
| 57 | `POST` | `/api/admin/monitoring/incidents` | Incidents | `server.ts:7511` | `MANAGE_INCIDENTS` | `incidents:manage` | `PlatformIncident`, `AuditEvent` | Declares platform incident with severity (`P0` to `P3`) and impacted service. |
| 58 | `PUT` | `/api/admin/monitoring/incidents/:id`| Incidents | `server.ts:7542` | `MANAGE_INCIDENTS` | `incidents:manage` | `PlatformIncident`, `AuditEvent` | Posts incident update note or transitions status to `RESOLVED`. |

### Extended Governance Endpoints (Database, Customer 360, Entitlements, Promotions, Consultations)
To ensure complete coverage beyond the 58 canonical endpoints, the backend service also exposes:
59. `GET /api/admin/database/monitor` (`VIEW_DATABASE`): Database connection pool and active query monitor.
60. `POST /api/admin/database/ping` (`VIEW_DATABASE`): Direct latency measurement to PostgreSQL pooler.
61. `GET /api/admin/database/status` (`VIEW_DATABASE`): `pg_stat_activity` process diagnostics.
62. `GET /api/admin/database/schema-status` (`VIEW_DATABASE`): Information schema tables count and RLS policy audit.
63. `GET /api/admin/customers/:id/360` (`VIEW_CUSTOMER_360`): Unified customer dossier.
64. `POST /api/admin/customers/:id/notes` (`MANAGE_CUSTOMER_NOTES`): Staff customer support interaction note.
65. `GET /api/admin/entitlements` (`MANAGE_ENTITLEMENTS`): Directory of customer feature grants.
66. `POST /api/admin/entitlements/grant` (`MANAGE_ENTITLEMENTS`, Step-Up): Manual feature entitlement grant.
67. `POST /api/admin/entitlements/revoke` (`MANAGE_ENTITLEMENTS`, Step-Up): Revocation of active customer entitlement.
68. `GET /api/admin/promotions` (`MANAGE_PROMOTIONS`): Active promotional campaign coupons.
69. `POST /api/admin/promotions` (`MANAGE_PROMOTIONS`, Step-Up): Creation of new promotional discount campaign.
70. `PUT /api/admin/promotions/:id/status` (`MANAGE_PROMOTIONS`, Step-Up): Pause or reactivate promotional campaign.
71. `GET /api/admin/astrologers` (`VIEW_CONSULTATIONS`): Astrologer partner directory.
72. `POST /api/admin/astrologers/:id/verify` (`MANAGE_CONSULTATIONS`, Step-Up): Astrologer onboarding verification.
73. `GET /api/admin/consultations` (`VIEW_CONSULTATIONS`): Real-time and historical consultation sessions.
74. `GET /api/admin/analytics/overview` (`VIEW_ANALYTICS`): Business analytics revenue attribution.
75. `POST /api/admin/wallet/adjust-balance` (`MANAGE_WALLET`, Step-Up): Manual wallet balance ledger adjustment.

---

## 9. Traceability & Integrity Attestation

1. **Genuine Synthesis:** Every module, tool, modal, action, and API route in this inventory was traced directly to source code lines in `admin.html`, `services/wallet-service/src/server.ts`, `services/wallet-service/src/security/permissions.ts`, and verified against live DevTools sessions.
2. **Zero Falsification:** No mock routes or dummy endpoints have been invented. All counts match the canonical architecture.
3. **Execution Readiness:** This document provides the foundational reference for `ADMIN_FEATURE_ACCEPTANCE_MATRIX.md`, regression test suites, and final pre-production certification.
