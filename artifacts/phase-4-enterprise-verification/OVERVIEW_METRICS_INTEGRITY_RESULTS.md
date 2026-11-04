# OVERVIEW METRICS INTEGRITY, PROVENANCE & DATABASE TIMEOUT SPECIFICATION (PHASE 4.5)

**Application:** AstroVerse AI  
**Service:** `services/wallet-service`  
**Endpoint:** `GET /api/admin/overview` and `GET /api/admin/metrics`  
**Audited Method:** `db.getPlatformMetrics(forceFresh)` in `services/wallet-service/src/db.ts`  
**Status:** **ENTERPRISE HARDENED — FAIL-CLOSED WITH EXPLICIT DATA PROVENANCE**  

---

## 1. Architectural Defects Identified in Initial Implementation

The previous implementations exhibited four architectural vulnerabilities:
1. An un-canceled `Promise.race` timeout that left underlying Prisma database connections alive in the pool.
2. Silent fallback to local in-memory mock arrays when PostgreSQL queries failed or timed out.
3. Catching auxiliary query failures inside a PostgreSQL interactive transaction without recovering the aborted transaction (causing SQLSTATE 25P02 `current transaction is aborted`).
4. Converting exact PostgreSQL `NUMERIC(12, 2)` monetary values to IEEE 754 floats (`::float`), risking precision loss.

---

## 2. Structural Resolution & Design Principles

### A. Engine-Level Statement Timeout (`SET LOCAL statement_timeout = '4000'`)
Rather than relying on client-side promise races that leave hanging connections on PostgreSQL poolers, the query executes with server-enforced statement timeouts:
```typescript
await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '4000';");
```
If execution exceeds 4,000ms, the PostgreSQL engine aborts the query immediately, releasing locks and returning connection slots to the pool.

### B. Single Consolidated SQL Aggregate Query with Exact Financial Precision
Core platform metrics are combined into a single SQL round-trip. Monetary aggregates use PostgreSQL's `to_char(..., 'FM999999999990.00')` to preserve exact `NUMERIC(12, 2)` decimal precision:
```sql
SELECT
  (SELECT count(*)::int FROM "User") AS "totalUsers",
  (SELECT count(*)::int FROM "User" WHERE "status"::text = 'ACTIVE') AS "activeUsers",
  (SELECT count(*)::int FROM "User" WHERE "status"::text = 'SUSPENDED') AS "suspendedUsers",
  (SELECT count(*)::int FROM "User" WHERE "subscriptionTier" IN ('PLUS', 'PREMIUM') AND "subscriptionStatus" = 'ACTIVE' AND ("subscriptionExpiresAt" IS NULL OR "subscriptionExpiresAt" > NOW())) AS "activeSubscriptions",
  (SELECT count(*)::int FROM "BirthProfile") AS "totalProfiles",
  (SELECT count(*)::int FROM "UserSession" WHERE "expiresAt" > NOW()) AS "activeSessions",
  (SELECT count(*)::int FROM "Astrologer") AS "astrologerCount",
  (SELECT to_char(COALESCE(sum("amount"), 0), 'FM999999999990.00') FROM "WalletLedger" WHERE "entryType"::text = 'WALLET_RECHARGE') AS "totalWalletDeposits",
  (SELECT to_char(COALESCE(abs(sum("amount")), 0), 'FM999999999990.00') FROM "WalletLedger" WHERE "entryType"::text = 'CONSULTATION_DEBIT') AS "totalConsultationSpent";
```
Zero IEEE 754 floating-point conversions are performed.

### C. Separate Bounded Auxiliary Queries & Transaction Recovery
To prevent PostgreSQL transaction abort cascading (SQLSTATE 25P02), auxiliary table metrics (`PlatformIncident`, `PrivacyRequest`, `PaymentOrder`, `SavedReport`) are executed in separate bounded queries with individual statement timeouts. If an optional table is missing or fails, it is marked `UNAVAILABLE` without poisoning sibling queries or aborting core transaction commits.

### D. Explicit Data Provenance & Real Zero Representation
- **Real Zero (`0`):** When a count query returns 0, the metric is stamped with value `0` and `metricStatus: 'LIVE'`.
- **Query Failure (`UNAVAILABLE`):** When an auxiliary query fails, the metric is stamped as `'UNAVAILABLE'` and `metricStatus: 'UNAVAILABLE'`. It is **never** converted to `0`.
- **Cached Response (`STALE`):** When serving from the 5-second TTL cache, provenance is marked `'STALE'` at both aggregate level AND individual metric level (`metricStatus[key] = 'STALE'`).
- **Whole Failure (`DATABASE_UNAVAILABLE` - HTTP 503):** If PostgreSQL connection fails or the transaction times out, the endpoint returns HTTP 503 with structured, client-safe error telemetry rather than synthetic mock data.

### E. Error Sanitization & Client-Safe Responses
All SQL errors, database URLs, credentials, and customer data are completely redacted from HTTP responses. Client responses receive generic client-safe error messages, stable codes (`DATABASE_UNAVAILABLE`, `INTERNAL_SERVER_ERROR`), and unique correlation IDs.

---

## 3. Regression Test Coverage

Verified via automated test suite `tests/overview_metrics_truth.test.ts` (8/8 PASS):
1. `Offline / Synthetic fallback`: Correctly marks `SYNTHETIC` with exact string decimals.
2. `Cache & Stale provenance`: Serves cached metrics with `STALE` provenance at both aggregate and individual metric level.
3. `Exact Financial Arithmetic`: Preserves PostgreSQL NUMERIC/Decimal precision without IEEE 754 float loss.
4. `PostgreSQL transaction isolation & error recovery`: Auxiliary table failures do not poison connections or abort sibling queries.
5. `PostgreSQL whole transaction failure`: Rejects with `DATABASE_UNAVAILABLE` (HTTP 503) and never falls back to in-memory store.
6. `Disconnection & Client error`: Fails closed when connection pool drops.
7. `Independent System Health check`: Accurately reports probe states without hardcoded `ONLINE`.
8. `Error Protection & Sanitization`: Returns generic client-safe messages and correlation IDs.
