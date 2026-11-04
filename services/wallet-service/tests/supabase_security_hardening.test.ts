import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { DDL_STATEMENTS } from '../src/schemaBootstrap';
import { validatePasswordComplexity, SUPABASE_PASSWORD_SECURITY_PLAN } from '../src/security/passwordValidator';

describe('Supabase Security Advisor & Database Integrity Validation (Phase 3.3)', () => {

  test('1.1 CustomerProfileView enforces security_invoker = true in schemaBootstrap DDL without fail-open fallback', () => {
    const customerViewDdl = DDL_STATEMENTS.find(stmt => 
      stmt.includes('"CustomerProfileView"') && stmt.includes('CREATE OR REPLACE VIEW')
    );
    assert.ok(customerViewDdl, 'CustomerProfileView DDL statement must exist');
    assert.match(
      customerViewDdl, 
      /WITH\s*\(\s*security_invoker\s*=\s*true\s*\)/i,
      'CustomerProfileView must explicitly declare WITH (security_invoker = true) to prevent bypassing RLS'
    );
    // Ensure there is NO fallback creating a view without security_invoker
    assert.doesNotMatch(
      customerViewDdl,
      /EXCEPTION\s+WHEN\s+OTHERS\s+THEN\s+CREATE\s+OR\s+REPLACE\s+VIEW/i,
      'CustomerProfileView must never fall back to an insecure normal view upon error (Fail-Closed)'
    );
  });

  test('1.2 CustomerProfileView excludes sensitive authentication secrets from SELECT columns', () => {
    const customerViewDdl = DDL_STATEMENTS.find(stmt => 
      stmt.includes('"CustomerProfileView"') && stmt.includes('CREATE OR REPLACE VIEW')
    );
    assert.ok(customerViewDdl);
    assert.doesNotMatch(customerViewDdl, /"passwordHash"/i, 'passwordHash must never be exposed in CustomerProfileView');
    assert.doesNotMatch(customerViewDdl, /"passwordSalt"/i, 'passwordSalt must never be exposed in CustomerProfileView');
    assert.doesNotMatch(customerViewDdl, /"mfaSecret"/i, 'mfaSecret must never be exposed in CustomerProfileView');
    assert.doesNotMatch(customerViewDdl, /"mfaRecoveryCodes"/i, 'mfaRecoveryCodes must never be exposed in CustomerProfileView');
    assert.doesNotMatch(customerViewDdl, /"resetTokenHash"/i, 'resetTokenHash must never be exposed in CustomerProfileView');
  });

  test('1.3 Granting SELECT on CustomerProfileView is conditionally gated on verified security_invoker', () => {
    const grantDdl = DDL_STATEMENTS.find(stmt =>
      stmt.includes('"CustomerProfileView"') && stmt.includes('GRANT SELECT')
    );
    assert.ok(grantDdl, 'CustomerProfileView GRANT SELECT statement must exist');
    assert.match(
      grantDdl,
      /security_invoker=true/i,
      'GRANT SELECT on CustomerProfileView must verify security_invoker=true in pg_class reloptions'
    );
    assert.match(
      grantDdl,
      /RAISE EXCEPTION/i,
      'Must raise exception and fail closed if security_invoker is not active'
    );
  });

  test('1.4 DDL attaches prevent_unauthorized_profile_mutation trigger to User table', () => {
    const triggerDdl = DDL_STATEMENTS.find(stmt =>
      stmt.includes('trg_prevent_unauthorized_user_mutation')
    );
    assert.ok(triggerDdl, 'trg_prevent_unauthorized_user_mutation statement must exist');
    assert.match(triggerDdl, /BEFORE UPDATE ON "User"/i);
    assert.match(triggerDdl, /prevent_unauthorized_profile_mutation/i);
  });

  test('2.1 Migration 20261104_07_fix_security_advisor_hardening.sql exists and enforces PG15+ security_invoker', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');
    
    assert.match(content, /server_version_num/i);
    assert.match(content, /150000/i);
    assert.match(content, /security_invoker = true/i);
    assert.match(content, /REVOKE ALL ON public\."CustomerProfileView" FROM PUBLIC/i);
    assert.match(content, /REVOKE ALL ON public\."CustomerProfileView" FROM anon/i);
  });

  test('2.2 Migration restricts public.rls_auto_enable() execution and locks search path', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /REVOKE ALL ON FUNCTION public\.rls_auto_enable\(\) FROM PUBLIC;/i);
    assert.match(content, /REVOKE EXECUTE ON FUNCTION public\.rls_auto_enable\(\) FROM anon, authenticated;/i);
    assert.match(content, /GRANT EXECUTE ON FUNCTION public\.rls_auto_enable\(\) TO postgres, service_role;/i);
    assert.match(content, /ALTER FUNCTION public\.rls_auto_enable\(\) SET search_path = pg_catalog, public;/i);
  });

  test('2.3 Migration locks search_path and supports both profiles and User relations in prevent_unauthorized_profile_mutation', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /SET search_path = pg_catalog, public/i);
    assert.match(content, /to_jsonb\(OLD\)/i, 'Must use to_jsonb to avoid column lookup errors on mismatched target tables');
    assert.match(content, /wallet_balance.*walletBalance/s, 'Must handle both snake_case and camelCase wallet balance');
    assert.match(content, /account_status.*status/s, 'Must handle both snake_case and camelCase status');
    assert.match(content, /REVOKE EXECUTE ON FUNCTION public\.prevent_unauthorized_profile_mutation\(\) FROM anon, authenticated;/i);
    assert.match(content, /GRANT EXECUTE ON FUNCTION public\.prevent_unauthorized_profile_mutation\(\) TO postgres, service_role;/i);
  });

  test('2.4 Migration locks search_path and revokes public execute on handle_new_user and handle_updated_at', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /REVOKE EXECUTE ON FUNCTION public\.handle_new_user\(\) FROM anon, authenticated;/i);
    assert.match(content, /ALTER FUNCTION public\.handle_new_user\(\) SET search_path = pg_catalog, public, auth;/i);
    assert.match(content, /ALTER FUNCTION public\.handle_updated_at\(\) SET search_path = pg_catalog, public;/i);
  });

  test('2.5 Migration revokes future function execute privileges using role-scoped global and schema statements', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/i);
    assert.match(content, /ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM anon/i);
    assert.match(content, /ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM authenticated/i);
    assert.match(content, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;/i);
  });

  test('2.6 Migration configures private Storage buckets and comprehensive owner-isolated policies', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /'kundli-reports', 'kundli-reports', false/i, 'kundli-reports bucket must be private (public = false)');
    assert.match(content, /'customer-documents', 'customer-documents', false/i, 'customer-documents bucket must be private (public = false)');
    assert.match(content, /'avatars', 'avatars', true/i, 'avatars bucket is public = true');
    
    // Checks for owner isolation on kundli-reports and customer-documents
    assert.match(content, /"Customers can read own reports in storage"/i);
    assert.match(content, /"Customers can read own documents in storage"/i);
    assert.match(content, /"Public can view avatars in storage"/i);
    assert.match(content, /"Users can manage own avatars in storage"/i);
    assert.match(content, /\(auth\.uid\(\)\)::text = \(storage\.foldername\(name\)\)\[1\]/i, 'Storage folder must isolate objects to authenticated user ID');
  });

  test('2.7 Migration verification DO block uses fail-closed RAISE EXCEPTION assertions', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.doesNotMatch(content, /RAISE WARNING/i, 'Migration verification must not use RAISE WARNING (must abort on failure)');
    assert.match(content, /RAISE EXCEPTION 'SECURITY INVARIANT VIOLATION: CustomerProfileView must exist with security_invoker=true/i);
    assert.match(content, /RAISE EXCEPTION 'SECURITY INVARIANT VIOLATION: Insecure function execute privileges detected/i);
  });

  test('3.1 Application Password Complexity Validator handles entropy requirements and BLOCKED_PLAN_REQUIREMENT', () => {
    // Supabase Free Tier does not support HaveIBeenPwned API check
    assert.strictEqual(SUPABASE_PASSWORD_SECURITY_PLAN, 'BLOCKED_PLAN_REQUIREMENT');

    // Test real application validator imported from security/passwordValidator
    assert.strictEqual(validatePasswordComplexity('').valid, false);
    assert.strictEqual(validatePasswordComplexity('short').valid, false);
    assert.strictEqual(validatePasswordComplexity('weakpassword123').valid, false);
    assert.strictEqual(validatePasswordComplexity('NOLOWERCASENUMBER!').valid, false);
    assert.strictEqual(validatePasswordComplexity('NoSymbols12345').valid, false);
    assert.strictEqual(validatePasswordComplexity('password12345!').valid, false, 'Common dictionary password must be rejected');
    
    // Valid high-entropy password
    const validRes = validatePasswordComplexity('ValidP@ssw0rd2026!');
    assert.strictEqual(validRes.valid, true);
    assert.ok(validRes.score && validRes.score >= 3);

    // Admin password requirements (minLength 12)
    assert.strictEqual(validatePasswordComplexity('Short@123', { minLength: 12, isAdmin: true }).valid, false);
    assert.strictEqual(validatePasswordComplexity('LongAdminP@ssw0rd2026!', { minLength: 12, isAdmin: true }).valid, true);
  });

  test('4.1 Absolute Safety Restriction: Zero direct production execution allowed', () => {
    const prodUrl = process.env.SUPABASE_PRODUCTION_DB_URL || '';
    assert.equal(prodUrl, '', 'SUPABASE_PRODUCTION_DB_URL must not be defined in active test process');
  });

});
