import assert from 'node:assert';
import { describe, it } from 'node:test';
import { db } from '../src/db';

describe('OVERVIEW METRICS INTEGRITY & DATA PROVENANCE SUITE (PHASE 4.4)', () => {

  it('1. Offline / Synthetic fallback: honors SYNTHETIC provenance when Postgres is absent', async () => {
    // When isPostgresAvailable is false (default in unit tests without DATABASE_URL)
    const metrics = await db.getPlatformMetrics(true);
    assert.strictEqual(metrics.provenance, 'SYNTHETIC');
    assert.strictEqual(metrics.dataSource, 'Resilient Local Storage (InMemory/JSON)');
    assert.strictEqual(typeof metrics.totalUsers, 'number');
    assert.strictEqual(typeof metrics.activeUsers, 'number');
    assert.strictEqual(typeof metrics.suspendedUsers, 'number');
    assert.strictEqual(typeof metrics.totalWalletDeposits, 'number');
    assert.strictEqual(typeof metrics.totalConsultationSpent, 'number');
    assert.strictEqual(metrics.metricStatus.totalUsers, 'DERIVED');
  });

  it('2. Cache & Stale provenance: serving cached metrics sets provenance to STALE', async () => {
    // Populate cache
    const initial = await db.getPlatformMetrics(true);
    // Non-forced fetch should return cached data with provenance STALE
    const cached = await db.getPlatformMetrics(false);
    assert.strictEqual(cached.cached, true);
    assert.strictEqual(cached.provenance, 'STALE');
    assert.strictEqual(cached.totalUsers, initial.totalUsers);
  });

  it('3. PostgreSQL simulation: distinguishes real zero from query failure', async () => {
    const fakePrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          $executeRawUnsafe: async () => {},
          $queryRawUnsafe: async (sql: string) => {
            if (sql.includes('User')) {
              // Core query succeeds with real zeroes
              return [{
                totalUsers: 0,
                activeUsers: 0,
                suspendedUsers: 0,
                activeSubscriptions: 0,
                totalProfiles: 0,
                activeSessions: 0,
                astrologerCount: 0,
                totalWalletDeposits: 0,
                totalConsultationSpent: 0
              }];
            }
            if (sql.includes('PlatformIncident')) {
              // Auxiliary table succeeds with real count
              return [{ count: 0 }];
            }
            if (sql.includes('PaymentOrder')) {
              // Simulating table not found / query failure for PaymentOrder
              throw new Error('relation "PaymentOrder" does not exist');
            }
            if (sql.includes('SavedReport')) {
              // Simulating table not found / query failure for SavedReport
              throw new Error('relation "SavedReport" does not exist');
            }
            return [{ count: 0 }];
          }
        };
        return cb(tx);
      }
    };

    const origPrisma = (db as any).prisma;
    const origPg = (db as any).isPostgresAvailable;
    try {
      (db as any).isPostgresAvailable = true;
      (db as any).prisma = fakePrisma;

      const res = await db.getPlatformMetrics(true);
      assert.strictEqual(res.provenance, 'LIVE');
      assert.strictEqual(res.totalUsers, 0, 'Real database zero must be represented as 0');
      assert.strictEqual(res.metricStatus.totalUsers, 'LIVE', 'Real zero metricStatus is LIVE');
      assert.strictEqual(res.openIncidents, 0, 'Incident count 0 is a real zero');
      assert.strictEqual(res.metricStatus.openIncidents, 'LIVE');

      // Failed auxiliary tables MUST be UNAVAILABLE, not falsely converted to 0
      assert.strictEqual(res.pendingRefundsCount, 'UNAVAILABLE', 'Failed PaymentOrder query must be UNAVAILABLE');
      assert.strictEqual(res.metricStatus.pendingRefundsCount, 'UNAVAILABLE');
      assert.strictEqual(res.failedReportsCount, 'UNAVAILABLE', 'Failed SavedReport query must be UNAVAILABLE');
      assert.strictEqual(res.metricStatus.failedReportsCount, 'UNAVAILABLE');
    } finally {
      (db as any).isPostgresAvailable = origPg;
      (db as any).prisma = origPrisma;
    }
  });

  it('4. PostgreSQL whole transaction failure: fails closed with DATABASE_UNAVAILABLE and never falls back to in-memory', async () => {
    const failingPrisma = {
      $transaction: async () => {
        throw new Error('canceling statement due to statement timeout');
      }
    };

    const origPrisma = (db as any).prisma;
    const origPg = (db as any).isPostgresAvailable;
    try {
      (db as any).isPostgresAvailable = true;
      (db as any).prisma = failingPrisma;

      await assert.rejects(
        async () => {
          await db.getPlatformMetrics(true);
        },
        (err: any) => {
          assert.strictEqual(err.code, 'DATABASE_UNAVAILABLE');
          assert.match(err.message, /DATABASE_UNAVAILABLE/);
          assert.match(err.message, /statement timeout/);
          return true;
        },
        'Must reject with DATABASE_UNAVAILABLE instead of silently falling back to in-memory store'
      );
    } finally {
      (db as any).isPostgresAvailable = origPg;
      (db as any).prisma = origPrisma;
    }
  });

  it('5. Disconnection & Client error: fails closed with DATABASE_UNAVAILABLE on connection pool drop', async () => {
    const disconnectedPrisma = {
      $transaction: async () => {
        throw new Error('PrismaClientInitializationError: Can\'t reach database server at `aws-0-ap-south-1.pooler.supabase.com`');
      }
    };

    const origPrisma = (db as any).prisma;
    const origPg = (db as any).isPostgresAvailable;
    try {
      (db as any).isPostgresAvailable = true;
      (db as any).prisma = disconnectedPrisma;

      await assert.rejects(
        async () => {
          await db.getPlatformMetrics(true);
        },
        (err: any) => {
          assert.strictEqual(err.code, 'DATABASE_UNAVAILABLE');
          return true;
        }
      );
    } finally {
      (db as any).isPostgresAvailable = origPg;
      (db as any).prisma = origPrisma;
    }
  });
});
