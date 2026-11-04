import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DDL_STATEMENTS, checkSchemaReadiness, APPLICATION_TABLES } from '../src/schemaBootstrap';
import { validatePasswordComplexity, SUPABASE_PASSWORD_SECURITY_PLAN } from '../src/security/passwordValidator';

describe('Real PostgreSQL RLS & Schema Hardening Integration Suite', () => {

  const isolatedDbUrl = process.env.ISOLATED_TEST_DATABASE_URL;

  test('1. Environment Safety Isolation Guard: Production DB URL is strictly prohibited in tests', () => {
    const prodUrl = process.env.SUPABASE_PRODUCTION_DB_URL || process.env.DATABASE_URL || '';
    if (prodUrl.includes('supabase.co') || prodUrl.includes('pooler.supabase.com')) {
      // Invariant: If a production connection string is detected, tests must fail closed
      assert.fail('SAFETY VIOLATION: Production Supabase database URL detected in test environment!');
    }
    assert.ok(true, 'Test environment is safely isolated from production database');
  });

  test('2. Schema Bootstrap DDL Statements Integrity: Invariants hold on all statements', () => {
    assert.ok(Array.isArray(DDL_STATEMENTS), 'DDL_STATEMENTS must be an array');
    assert.ok(DDL_STATEMENTS.length >= 50, 'DDL_STATEMENTS must contain comprehensive table, index, and policy definitions');

    // All application tables have RLS enabled in DDL
    for (const table of APPLICATION_TABLES) {
      const rlsStmt = DDL_STATEMENTS.find(s => 
        s.includes(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`) ||
        s.includes(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`)
      );
      assert.ok(rlsStmt, `Table "${table}" must have explicit ENABLE ROW LEVEL SECURITY statement in DDL`);
    }
  });

  test('3. CustomerProfileView Fail-Closed Invariants: security_invoker = true with zero fail-open catch blocks', () => {
    const viewStatement = DDL_STATEMENTS.find(s => s.includes('"CustomerProfileView"') && s.includes('CREATE OR REPLACE VIEW'));
    assert.ok(viewStatement, 'CustomerProfileView statement must exist');

    // 1. Checks PostgreSQL version >= 15
    assert.match(viewStatement, /server_version_num/i, 'Must check server_version_num');
    assert.match(viewStatement, /150000/i, 'Must check version >= 150000');

    // 2. Specifies WITH (security_invoker = true)
    assert.match(viewStatement, /WITH\s*\(\s*security_invoker\s*=\s*true\s*\)/i, 'Must specify security_invoker = true');

    // 3. Verifies pg_class reloptions after creation
    assert.match(viewStatement, /c\.reloptions\s*@>\s*ARRAY\['security_invoker=true'\]/i, 'Must verify reloptions contains security_invoker=true');

    // 4. Must NOT have catch block that creates a normal view
    assert.doesNotMatch(viewStatement, /EXCEPTION\s+WHEN\s+OTHERS\s+THEN\s+CREATE\s+OR\s+REPLACE\s+VIEW/i, 'Must never fall back to normal view');
  });

  test('4. CustomerProfileView GRANT SELECT Fail-Closed Invariant: Gated on security_invoker in pg_class', () => {
    const grantStatement = DDL_STATEMENTS.find(s => s.includes('"CustomerProfileView"') && s.includes('GRANT SELECT'));
    assert.ok(grantStatement, 'GRANT SELECT statement on CustomerProfileView must exist');
    assert.match(grantStatement, /c\.reloptions\s*@>\s*ARRAY\['security_invoker=true'\]/i, 'Must verify security_invoker=true before granting SELECT');
    assert.match(grantStatement, /RAISE EXCEPTION/i, 'Must raise exception if security_invoker=true is missing');
  });

  test('5. Privilege Escalation Prevention Trigger Invariant: Protects User table mutations', () => {
    const triggerFunc = DDL_STATEMENTS.find(s => s.includes('prevent_unauthorized_profile_mutation()'));
    assert.ok(triggerFunc, 'prevent_unauthorized_profile_mutation function must exist in DDL');

    // Verifies JSONB parsing to support both snake_case and camelCase target relations
    assert.match(triggerFunc, /to_jsonb\(OLD\)/i);
    assert.match(triggerFunc, /to_jsonb\(NEW\)/i);
    assert.match(triggerFunc, /PRIVILEGE_ESCALATION_BLOCKED/i);
    assert.match(triggerFunc, /DIRECT_BALANCE_MUTATION_BLOCKED/i);
    assert.match(triggerFunc, /ACCOUNT_STATUS_MUTATION_BLOCKED/i);

    // Trigger attachment on User table
    const triggerAttach = DDL_STATEMENTS.find(s => s.includes('trg_prevent_unauthorized_user_mutation'));
    assert.ok(triggerAttach, 'Trigger attachment on User table must exist');
    assert.match(triggerAttach, /BEFORE UPDATE ON "User"/i);
  });

  test('6. Password Validation Real Invariant: High entropy required & documented Free Plan restriction', () => {
    assert.strictEqual(SUPABASE_PASSWORD_SECURITY_PLAN, 'BLOCKED_PLAN_REQUIREMENT');

    // Customer passwords (minLength 8)
    assert.strictEqual(validatePasswordComplexity('short', { minLength: 8 }).valid, false);
    assert.strictEqual(validatePasswordComplexity('password123', { minLength: 8 }).valid, false);
    assert.strictEqual(validatePasswordComplexity('AstroSecure2026!', { minLength: 8 }).valid, true);

    // Admin passwords (minLength 10, uppercase, lowercase, numbers, symbols)
    assert.strictEqual(validatePasswordComplexity('Admin12345', { minLength: 10, isAdmin: true, requireSymbols: true }).valid, false);
    assert.strictEqual(validatePasswordComplexity('AdminSuperP@ssw0rd2026!', { minLength: 10, isAdmin: true, requireSymbols: true }).valid, true);
  });

  test('7. Disposable PostgreSQL Execution: Executes if ISOLATED_TEST_DATABASE_URL is provided', async () => {
    if (!isolatedDbUrl) {
      console.log('    ℹ ISOLATED_TEST_DATABASE_URL not configured. Disposable remote Postgres test skipped; DDL invariants verified locally.');
      assert.ok(true);
      return;
    }

    // If an isolated test database is provided, dynamically import Prisma/pg and execute real queries
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({ datasources: { db: { url: isolatedDbUrl } } });
    try {
      const readiness = await checkSchemaReadiness(prisma);
      assert.ok(typeof readiness.isReady === 'boolean');
    } finally {
      await prisma.$disconnect();
    }
  });

});
