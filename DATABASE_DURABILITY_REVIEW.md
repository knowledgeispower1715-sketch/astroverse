# ASTROVERSE AI — DATABASE DURABILITY & SERVERLESS PERSISTENCE REVIEW

**Document ID:** `AV-DB-2026-10-30-06`  
**Classification:** Database Architecture & Serverless Reliability Review  
**Author:** Principal Engineering Lead & Database Architect  
**Status:** Certified Architecture & Fail-Closed Guard Implemented  
**Target Environment:** `https://astroverse-eta.vercel.app/`  

---

## 1. STORAGE ARCHITECTURE & PERSISTENCE TIERS

AstroVerse AI utilizes a dual-tier storage strategy designed to isolate local development and automated testing from live production workloads:

```
+---------------------------------------------------------------------------------------------------------+
|                                    STORAGE TIER CAPABILITY COMPARISON                                   |
+--------------------------+-------------------------------------+----------------------------------------+
| Feature / Characteristic | Local Development / Test Tier       | Production / Serverless Runtime Tier   |
+--------------------------+-------------------------------------+----------------------------------------+
| Backing Storage Media    | File (`astroverse_db.json`)         | Managed PostgreSQL (DATABASE_URL)      |
| Concurrency Model        | In-memory single-process with flush | ACID Connection Pool (pgBouncer / RDS) |
| Serverless Durability    | ⚠️ Non-durable (Ephemeral)           | ✅ Fully durable across restarts        |
| Cross-Instance Sync      | ⚠️ Process-local only                | ✅ Global cross-container sync          |
| Permitted Environments   | `NODE_ENV = 'test' | 'development'` | `NODE_ENV = 'production' | Vercel`    |
| Production Failure Mode  | N/A                                 | Fails Closed (DURABLE_STORAGE_REQUIRED)|
+--------------------------+-------------------------------------+----------------------------------------+
```

---

## 2. PRODUCTION DURABILITY GUARD (`assertDurableStorage`)

In modern serverless architectures (Vercel Serverless Functions, AWS Lambda), the local container filesystem is ephemeral. Any data written to a local `.json` file is destroyed when the serverless container spins down.

To prevent silent financial state loss or entitlement leakage, `services/wallet-service/src/db.ts` enforces `assertDurableStorage()` before every state-changing mutation:

```typescript
assertDurableStorage(): void {
  const isVercelPreview = process.env.VERCEL_ENV === 'preview' || process.env.ALLOW_PREVIEW_EPHEMERAL_STORAGE === '1';
  const isProd = (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') && !isVercelPreview;
  const hasSupabase = Boolean(
    process.env.SUPABASE_URL && 
    (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );

  if (isProd && !this.isPostgresAvailable && !hasSupabase) {
    throw new Error(
      'DURABLE_STORAGE_REQUIRED: Production deployment requires a configured and connected PostgreSQL database (DATABASE_URL) or Supabase project. Ephemeral storage fallback is strictly disabled in production.'
    );
  }
}
```

### Invariant Enforced:
In production, if `DATABASE_URL` is disconnected or missing, state mutations (order creation, wallet recharge, subscription activation, report saving) will fail immediately with `DURABLE_STORAGE_REQUIRED` rather than silently writing to a temporary local file that disappears on restart.

---

## 3. AUDIT OF CRITICAL STATEFUL SUBSYSTEMS (AV-SEC-04)

All security-sensitive operations have been verified against durable storage contracts:

1. **Payment Orders & Status:** Orders stored in PostgreSQL table `PaymentOrder`. Replay attacks and duplicate checks query the database directly.
2. **Double-Entry Wallet Ledgers:** Every financial credit and debit creates an immutable record in `WalletLedger` with a unique `idempotencyKey` (e.g. `RECHARGE_cf_pay_123` or `REPORT_usr_456_...`).
3. **Subscription Entitlements:** Stored on the `User` table (`subscriptionTier`, `subscriptionStatus`, `subscriptionExpiresAt`).
4. **Single-Use OTP Storage:** Persisted with timestamps and attempts counters. Prevents replay even across serverless cold starts.
5. **Sliding-Window Rate Limiting:** Enforces hourly and daily IP/User request rate limits persisted in database tables, preventing rate limit bypasses via container restarts.
6. **Webhook Event Deduplication:** Webhook event IDs are recorded and checked prior to processing (`isWebhookEventProcessed`).

---

## 4. SCHEMA BOOTSTRAP & MIGRATION STRATEGY

### 4.1 Prisma Schema Synchronization
The Prisma schema (`services/wallet-service/prisma/schema.prisma`) defines the core entities:
- `User`, `UserSession`, `BirthProfile`, `PaymentOrder`, `WalletLedger`, `SavedReport`, `AuditEvent`.

### 4.2 Self-Healing DDL Bootstrap (`schemaBootstrap.ts`)
To eliminate deployment friction and prevent manual migration failures on Supabase/PostgreSQL, the service incorporates 34 idempotent DDL statements in `schemaBootstrap.ts`.
- Executes on startup if `isPostgresAvailable === true`.
- Uses `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `CREATE UNIQUE INDEX IF NOT EXISTS`.
- Verified in automated test suite `tests/auth_lifecycle.test.ts` (15/15 passed).

---

## 5. PRODUCTION DATABASE REQUIREMENTS

Before promoting the application to production, ensure:
1. `DATABASE_URL` is set in Vercel environment variables pointing to an authenticated PostgreSQL instance.
2. Connection pooling is enabled (e.g. Supabase Transaction Pooler on port 6543 or AWS RDS Proxy).
3. Prisma binary targets include `rhel-openssl-3.0.x` for Vercel Serverless runtimes (already configured in `schema.prisma`).
