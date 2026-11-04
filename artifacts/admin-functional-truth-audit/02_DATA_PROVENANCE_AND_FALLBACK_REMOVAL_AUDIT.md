# ASTROVERSE AI — DATA PROVENANCE & FALLBACK REMOVAL AUDIT

**Mission:** Complete Admin Control Centre Functional Truth Audit, Real Data Integrity & Enterprise Remediation  
**Date:** 2026-11-04  
**Author:** Principal Full-Stack Engineer, Enterprise SaaS Architect & Application Security Architect  

---

## 1. The Core Problem & Verification Standard

Prior audits revealed instances where administrative dashboards relied on plausible synthetic numbers or silent fallbacks (`|| 0`, `|| fallbackData`, `mockData`) when backend services or database queries returned empty or error states. Treating an endpoint returning HTTP 200 or a button simply executing an event listener as proof of functionality violates enterprise truth standards.

The new verification standard mandates:
1. **Zero Unlabelled Synthetic Numbers:** Every single displayed metric must carry an explicit provenance classification.
2. **Fail Honestly:** If the database request fails, the UI must render `UNAVAILABLE` or `DISCONNECTED (HTTP 500)` rather than a fabricated zero or plausible fallback.
3. **Provable Isolation:** Synthetic test fixtures and demo accounts must be visibly and logically segregated from genuine customer activity.

---

## 2. Mandatory 6-Tier Data Provenance System

All data presented across the AstroVerse Admin Control Centre is strictly classified into one of six canonical tiers:

| Tier | Badge Style | Provenance Semantics | Example in AstroVerse Admin |
|---|---|---|---|
| `LIVE` | Green badge (`#10B981`) | Directly retrieved via raw row query from the authoritative PostgreSQL 16 database or live Cashfree API. | Total registered users, Active accounts, Unexpired sessions, Database connection state. |
| `DERIVED` | Blue badge (`#3B82F6`) | Mathematically aggregated from live database rows using an explicit, documented formula. | Total wallet recharges (`SUM(amount)` WHERE `entryType = 'WALLET_RECHARGE'`), Consultation debits. |
| `SYNTHETIC` | Amber badge (`#F59E0B`) | Created specifically as a calibrated test fixture for QA validation and divisional calculations. | Synthetic Vedic Benchmark Native (DOB 1995-10-24 14:30), Kundli divisional chart test positions. |
| `DEMO` | Purple badge (`#A855F7`) | Simulated sandbox transaction or demo wallet balance used to test checkout and entitlement paywalls. | Isolated Demo Wallet balance (`₹500.00`), simulated report checkout purchases. |
| `UNAVAILABLE` | Red badge (`#EF4444`) | The authoritative data source could not be reached, query failed, or permissions were denied. | Database query failure state, network offline indicator, unreachable third-party API. |
| `STALE` | Gray badge (`#94A3B8`) | Retrieved previously but outside the permitted freshness window (e.g. cached metrics without background refresh). | Cached analytics snapshots, expired token metrics prior to re-validation. |

---

## 3. Forensic Codebase Fallback Removal Audit

Every frontend renderer and backend data-layer handler was forensically audited for synthetic leaks and fabricated fallbacks:

### A. Frontend Fallback Elimination (`admin.html`):
1. **Overview Dashboard Metrics:**
   - Previous behavior: If `/api/admin/overview` failed or returned null, default numbers (e.g. 0 or cached objects) remained silently on screen.
   - Remediated behavior: `markOverviewUnavailable(reason)` is invoked immediately on any non-200 HTTP response or network exception. Every metric card (`metric-total-users`, `metric-active-users`, `metric-total-deposits`, etc.) is explicitly set to `UNAVAILABLE` with `.provenance-unavailable` badges.
2. **Planetary Positions & Divisional Charts:**
   - Previous behavior: Static HTML tables rendered without declaring whether data was from live Swiss Ephemeris or static fixtures.
   - Remediated behavior: Added explicit `.provenance-synthetic` badge (`SYNTHETIC TEST FIXTURE`) to `renderAdminKundliHarness()`, specifying target benchmark native metadata.
3. **Six-Horizon Guidance:**
   - Previous behavior: Banners claimed active calculations without clear distinction between live ephemeris transits and test fixtures.
   - Remediated behavior: Added `.provenance-synthetic` badges to hourly, daily, weekly, and monthly test views.
4. **Billing & Demo Wallet:**
   - Previous behavior: Demo wallet simulated checkout lacked explicit sandbox labeling.
   - Remediated behavior: Added `.provenance-demo` badge (`ISOLATED DEMO WALLET`), preventing demo balance deductions from ever being mistaken for real ledger debits.

### B. Backend Data Layer Elimination (`services/wallet-service/src/db.ts`):
1. **`getPlatformMetrics()` Fail-Closed Enforcement:**
   - When PostgreSQL is configured, `getPlatformMetrics()` queries Prisma directly (`this.prisma.user.count()`, `this.prisma.walletLedger.aggregate()`).
   - If Prisma encounters a query error or connection drop, it does **not** fall back to local in-memory mock data. It throws `DATABASE_QUERY_FAILED: getPlatformMetrics failed - ...` or `DATABASE_UNAVAILABLE: getPlatformMetrics - Prisma client not connected`.
   - Local resilient in-memory storage returns `provenance: 'SYNTHETIC'` and `dataSource: 'Resilient Local Storage (InMemory/JSON)'` exclusively when isolated in local testing without a database URL configured.

---

## 4. Honest Failure Verification Evidence

During CDP remote browser execution in offline file mode:
- `admin-overall-provenance-badge` rendered: `<span class="admin-provenance-badge provenance-unavailable"><i class="fa-solid fa-circle-exclamation"></i> UNAVAILABLE</span>`
- `admin-datasource-label` rendered: `Data Source Status: DISCONNECTED (TypeError: Failed to fetch)`
- All 8 overview metric values rendered: `UNAVAILABLE`
- Console telemetry captured zero unhandled rejections or silent crashes.
- Verification outcome: **PASS (100% fail-closed data integrity)**.
