# 12. DEFECTS & ARCHITECTURAL REMEDIATION LOG

**Target Application:** AstroVerse AI  
**Release Target:** Phase 5 — Exhaustive Admin Control Centre Audit & Remediation  
**Status:** All Confirmed Defects Remediated, Tested & Verified  

---

## Remediated Defects Register

### DEFECT-01: PostgreSQL Interactive Transaction Abort Cascading (`SQLSTATE 25P02`)
- **Finding ID:** `DEFECT-01`
- **Severity:** `CRITICAL`
- **Root Cause:** In PostgreSQL interactive transactions (`BEGIN ... COMMIT`), an unhandled error inside any query flags the transaction aborted. Catching the exception in JavaScript without rolling back or establishing savepoints poisons subsequent queries with `SQLSTATE 25P02`.
- **Affected Module:** Overview (`#/admin/modules/overview`)
- **Affected Route:** `GET /api/admin/overview`
- **Affected Actions:** `ADMIN.OVERVIEW.VIEW_METRICS`, `ADMIN.OVERVIEW.REFRESH`
- **Changed Files:** [`services/wallet-service/src/db.ts`](file:///e:/rea/services/wallet-service/src/db.ts)
- **Fix Description:**
  1. Implemented `runSavepointProtectedQuery` utilizing genuine PostgreSQL `SAVEPOINT <name>` and `ROLLBACK TO SAVEPOINT <name>`.
  2. Isolated core platform aggregates (`User`, `BirthProfile`, `UserSession`, `Astrologer`, `WalletLedger`) into an independent transaction with server-enforced `SET LOCAL statement_timeout = '4000';`.
  3. Separated optional auxiliary queries (`PlatformIncident`, `PrivacyRequest`, `PaymentOrder`, `SavedReport`) into independent bounded queries with individual statement timeouts (`timeout = '2000'`).
- **Regression Test:** `services/wallet-service/tests/overview_metrics_truth.test.ts` (Tests 4 & 9).
- **Test Result:** **PASS**
- **Preview Verification:** Verified on preview deployment `FnCztNEanKtvjpVJGBbftCR7YCzR`; core metrics render without abort cascading.

---

### DEFECT-02: Binary IEEE 754 Floating-Point Monetary Precision Loss
- **Finding ID:** `DEFECT-02`
- **Severity:** `HIGH`
- **Root Cause:** SQL casting to `::float` and JavaScript `Math.round(... * 100) / 100` converted arbitrary-precision fixed-point database numbers to IEEE 754 binary floating-point, risking rounding errors and fractional paise loss.
- **Affected Module:** Overview, Payments, Consultations
- **Affected Route:** `GET /api/admin/overview`, `GET /api/admin/payments/summary`
- **Affected Columns:** `Total Deposits`, `Consultation Debits`, `Wallet Balance`
- **Changed Files:** [`services/wallet-service/src/db.ts`](file:///e:/rea/services/wallet-service/src/db.ts), [`admin.html`](file:///e:/rea/admin.html), [`apps/admin/index.html`](file:///e:/rea/apps/admin/index.html)
- **Fix Description:**
  1. Updated SQL queries to use `to_char(COALESCE(sum("amount"), 0), 'FM999999999990.00')`.
  2. Enforced arbitrary-precision string serialization (`"3.54"`, `"0.00"`).
  3. Added non-coercing `formatMoney(v)` helper in frontend that renders exact decimal strings.
- **Regression Test:** `services/wallet-service/tests/overview_metrics_truth.test.ts` (Test 3).
- **Test Result:** **PASS**
- **Preview Verification:** Total deposits rendered as exact string `"3.54"` on preview overview dashboard.

---

### DEFECT-03: Fabricated Static `ONLINE` System Health Status
- **Finding ID:** `DEFECT-03`
- **Severity:** `MEDIUM`
- **Root Cause:** Service health statuses were hardcoded as `'ONLINE'`, masking microservice outages and connection degradations.
- **Affected Module:** Overview, Integrations
- **Affected Route:** `GET /api/admin/overview`
- **Affected Components:** System Health Status Indicators
- **Changed Files:** [`services/wallet-service/src/db.ts`](file:///e:/rea/services/wallet-service/src/db.ts)
- **Fix Description:** Replaced static values with active HTTP probing to `${KUNDLI_ENGINE_URL}/api/engine/version` (`AbortSignal.timeout(1200)`) and live PostgreSQL connection state (`POSTGRESQL_CONNECTED`).
- **Regression Test:** `services/wallet-service/tests/overview_metrics_truth.test.ts` (Test 7).
- **Test Result:** **PASS**
- **Preview Verification:** DB status reported dynamically as `"PostgreSQL Connected (Supabase Managed Cloud)"`.

---

### DEFECT-04: Client-Side Data Leakage of Internal Database SQL & Pooler Hostnames
- **Finding ID:** `DEFECT-04`
- **Severity:** `HIGH`
- **Root Cause:** 500 / 503 error handlers returned raw `err.message`, leaking internal table names, SQL query strings, and Supabase connection pooler hostnames (`aws-0-ap-south-1.pooler.supabase.com`).
- **Affected Module:** Overview, Users, Payments
- **Affected Route:** `/api/admin/metrics`, `/api/admin/overview`, `/api/admin/payments/summary`
- **Changed Files:** [`services/wallet-service/src/server.ts`](file:///e:/rea/services/wallet-service/src/server.ts)
- **Fix Description:**
  1. Sanitized HTTP response payloads to return generic client-safe messages: `"The administrative data service is temporarily unavailable. Please retry shortly."`
  2. Implemented stable error codes (`DATABASE_UNAVAILABLE`, `INTERNAL_SERVER_ERROR`).
  3. Attached traceable correlation IDs (`cid_...`) returned to clients while logging detailed SQL errors internally.
- **Regression Test:** `services/wallet-service/tests/overview_metrics_truth.test.ts` (Test 8).
- **Test Result:** **PASS**
- **Preview Verification:** Verified error payload sanitization and correlation ID generation.

---

### DEFECT-05: Horizontal Viewport Overflow on Compact Mobile Viewports (360×640)
- **Finding ID:** `DEFECT-05`
- **Severity:** `HIGH`
- **Root Cause:** Fixed padding and minimum width constraints on `.admin-global-header` and `.admin-brand-cluster` caused 18px horizontal overflow on 360px screens.
- **Affected Module:** Global Header across all 22 modules
- **Affected Route:** `#/admin`
- **Changed Files:** [`admin.html`](file:///e:/rea/admin.html), [`apps/admin/index.html`](file:///e:/rea/apps/admin/index.html)
- **Fix Description:** Added media queries for `<= 480px` and `<= 360px`, set `box-sizing: border-box`, wrapped header action buttons, and constrained brand cluster text to fit 340px width.
- **Regression Test:** CDP device metrics override at 360×640 (`test_responsive_viewports.mjs`).
- **Test Result:** **PASS (0px overflow)**
- **Preview Verification:** Measured `scrollWidth: 360px`, `clientWidth: 360px`, `overflow: 0px` on live preview.

---

### DEFECT-06: Cryptographic Git Lineage Discrepancy Across Deployment Boundaries
- **Finding ID:** `DEFECT-06`
- **Severity:** `HIGH`
- **Root Cause:** Git commit discrepancy between local HEAD, PR #1 HEAD, and deployed Vercel preview source SHA.
- **Affected Module:** Global Release Identification
- **Affected Route:** `GET /api/release`
- **Changed Files:** [`vercel.json`](file:///e:/rea/vercel.json), [`services/wallet-service/src/server.ts`](file:///e:/rea/services/wallet-service/src/server.ts)
- **Fix Description:** Routed `/api/release` to wallet-service in `vercel.json` and synchronized linear git ancestry up to commit `748cc320dd8c284fa7cb31c2afbdf49c087ee3f9`.
- **Regression Test:** `01_RELEASE_IDENTITY_AND_GIT_RECONCILIATION.md`.
- **Test Result:** **PASS**
- **Preview Verification:** All 5 identity endpoints return identical 40-character SHA `748cc320dd8c284fa7cb31c2afbdf49c087ee3f9`.
