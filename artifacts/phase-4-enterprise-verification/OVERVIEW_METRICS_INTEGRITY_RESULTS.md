# OVERVIEW METRICS INTEGRITY, PROVENANCE & DATABASE TIMEOUT SPECIFICATION

**Application:** AstroVerse AI  
**Service:** `services/wallet-service`  
**Endpoint:** `GET /api/admin/overview` and `GET /api/admin/metrics`  
**Audited Method:** `db.getPlatformMetrics(forceFresh)` in `services/wallet-service/src/db.ts`  
**Status:** **ENTERPRISE HARDENED — FAIL-CLOSED WITH EXPLICIT DATA PROVENANCE**  

---

## 1. Architectural Defects Identified in Initial Implementation

The previous temporary implementation introduced three unacceptable compromises:
1. An un-canceled `Promise.race` timeout that left underlying Prisma database connections alive in the pool.
2. Silent fallback to local in-memory mock arrays when PostgreSQL queries failed or timed out.
3. Converting failed queries into zero counts, conflating a broken database check with an actual zero count.

---

## 2. Structural Resolution & Design Principles

### A. Engine-Level Statement Timeout (`SET LOCAL statement_timeout = '4000'`)
Rather than relying on client-side promise races that leave hanging connections on PostgreSQL poolers, the query executes inside an interactive transaction with server-enforced statement timeouts:
```typescript
await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '4000';");
```
If execution exceeds 4,000ms, the PostgreSQL engine aborts the query immediately, releasing locks and returning connection slots to the pool.

### B. Single Consolidated SQL Aggregate Query
Eliminated 11 competing independent queries by combining core platform metrics into a single SQL round-trip:
```sql
SELECT
  (SELECT count(*)::int FROM "User") AS "totalUsers",
  (SELECT count(*)::int FROM "User" WHERE "status"::text = 'ACTIVE') AS "activeUsers",
  (SELECT count(*)::int FROM "User" WHERE "status"::text = 'SUSPENDED') AS "suspendedUsers",
  (SELECT count(*)::int FROM "User" WHERE "subscriptionTier" IN ('PLUS', 'PREMIUM') AND "subscriptionStatus" = 'ACTIVE' AND ("subscriptionExpiresAt" IS NULL OR "subscriptionExpiresAt" > NOW())) AS "activeSubscriptions",
  (SELECT count(*)::int FROM "BirthProfile") AS "totalProfiles",
  (SELECT count(*)::int FROM "UserSession" WHERE "expiresAt" > NOW()) AS "activeSessions",
  (SELECT count(*)::int FROM "Astrologer") AS "astrologerCount",
  (SELECT COALESCE(sum("amount"), 0)::float FROM "WalletLedger" WHERE "entryType"::text = 'WALLET_RECHARGE') AS "totalWalletDeposits",
  (SELECT COALESCE(abs(sum("amount")), 0)::float FROM "WalletLedger" WHERE "entryType"::text = 'CONSULTATION_DEBIT') AS "totalConsultationSpent";
```
This executes with minimal query overhead, eliminating connection pool thrashing.

### C. Explicit Data Provenance & Real Zero Representation
- **Real Zero (`0`):** When a count query returns 0, the metric is stamped with value `0` and `metricStatus: 'LIVE'`.
- **Query Failure (`UNAVAILABLE`):** When an auxiliary query fails (e.g. table not yet present or query error), the metric is stamped as `'UNAVAILABLE'` and `metricStatus: 'UNAVAILABLE'`. It is **never** converted to `0`.
- **Cached Response (`STALE`):** When serving from the 5-second TTL cache, the overall provenance is marked `'STALE'` with `telemetryAgeMs` and `cachedRemainingMs` exposed.
- **Whole Failure (`DATABASE_UNAVAILABLE` - HTTP 503):** If PostgreSQL connection fails or the transaction times out, the endpoint returns HTTP 503 with structured error telemetry rather than synthetic mock data.

---

## 3. Regression Test Coverage

Verified via automated test suite `tests/overview_metrics_truth.test.ts`:
1. `Offline / Synthetic fallback`: Correctly marks `SYNTHETIC` when PostgreSQL is absent.
2. `Cache & Stale provenance`: Serves cached metrics with `STALE` provenance.
3. `PostgreSQL simulation`: Distinguishes real database 0 from query failure.
4. `PostgreSQL whole transaction failure`: Rejects with `DATABASE_UNAVAILABLE` (HTTP 503) and never falls back to in-memory store.
5. `Disconnection & Client error`: Fails closed when connection pool drops.

All 5 test cases passed with 100% success.
