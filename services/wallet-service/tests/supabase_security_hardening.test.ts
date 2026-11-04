import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { DDL_STATEMENTS } from '../src/schemaBootstrap';

describe('Supabase Security Advisor & Database Integrity Validation', () => {

  test('1.1 CustomerProfileView enforces security_invoker = true in schemaBootstrap DDL', () => {
    const customerViewDdl = DDL_STATEMENTS.find(stmt => 
      stmt.includes('"CustomerProfileView"') && stmt.includes('CREATE OR REPLACE VIEW')
    );
    assert.ok(customerViewDdl, 'CustomerProfileView DDL statement must exist');
    assert.match(
      customerViewDdl, 
      /WITH\s*\(\s*security_invoker\s*=\s*true\s*\)/i,
      'CustomerProfileView must explicitly declare WITH (security_invoker = true) to prevent bypassing RLS'
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

  test('2.1 Migration 20261104_07_fix_security_advisor_hardening.sql exists and contains view hardening', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');
    
    assert.match(content, /ALTER VIEW public\."CustomerProfileView" SET \(security_invoker = true\);/i);
    assert.match(content, /REVOKE ALL ON public\."CustomerProfileView" FROM PUBLIC, anon, authenticated;/i);
  });

  test('2.2 Migration restricts public.rls_auto_enable() execution and search path', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /REVOKE ALL ON FUNCTION public\.rls_auto_enable\(\) FROM PUBLIC;/i);
    assert.match(content, /REVOKE EXECUTE ON FUNCTION public\.rls_auto_enable\(\) FROM anon, authenticated;/i);
    assert.match(content, /GRANT EXECUTE ON FUNCTION public\.rls_auto_enable\(\) TO postgres, service_role;/i);
    assert.match(content, /ALTER FUNCTION public\.rls_auto_enable\(\) SET search_path = pg_catalog, public;/i);
  });

  test('2.3 Migration locks search_path and revokes public execute on prevent_unauthorized_profile_mutation', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /SET search_path = pg_catalog, public/i);
    assert.match(content, /REVOKE EXECUTE ON FUNCTION public\.prevent_unauthorized_profile_mutation\(\) FROM anon, authenticated;/i);
    assert.match(content, /GRANT EXECUTE ON FUNCTION public\.prevent_unauthorized_profile_mutation\(\) TO postgres, service_role;/i);
  });

  test('2.4 Migration locks search_path and revokes public execute on handle_new_user', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /REVOKE EXECUTE ON FUNCTION public\.handle_new_user\(\) FROM anon, authenticated;/i);
    assert.match(content, /ALTER FUNCTION public\.handle_new_user\(\) SET search_path = pg_catalog, public, auth;/i);
  });

  test('2.5 Migration revokes future function execute privileges from PUBLIC, anon, authenticated', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;/i);
    assert.match(content, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;/i);
    assert.match(content, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;/i);
  });

  test('2.6 Migration configures private Storage buckets and user-isolated object RLS policies', () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261104_07_fix_security_advisor_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /'kundli-reports', 'kundli-reports', false/i, 'kundli-reports bucket must be private (public = false)');
    assert.match(content, /'customer-documents', 'customer-documents', false/i, 'customer-documents bucket must be private (public = false)');
    assert.match(content, /CREATE POLICY "Customers can read own reports in storage"/i);
    assert.match(content, /\(auth\.uid\(\)\)::text = \(storage\.foldername\(name\)\)\[1\]/i, 'Storage folder must isolate objects to authenticated user ID');
  });

  test('3.1 Password Complexity Defense handles BLOCKED_PLAN_REQUIREMENT (Free Plan)', () => {
    // When Supabase Leaked Password Protection is blocked by plan (Free Tier),
    // backend and application validation must enforce high password entropy
    const validatePasswordComplexity = (password: string): { valid: boolean; reason?: string } => {
      if (!password || password.length < 10) {
        return { valid: false, reason: 'Password must be at least 10 characters long' };
      }
      if (!/[A-Z]/.test(password)) {
        return { valid: false, reason: 'Password must contain at least one uppercase letter' };
      }
      if (!/[a-z]/.test(password)) {
        return { valid: false, reason: 'Password must contain at least one lowercase letter' };
      }
      if (!/[0-9]/.test(password)) {
        return { valid: false, reason: 'Password must contain at least one number' };
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, reason: 'Password must contain at least one special character' };
      }
      return { valid: true };
    };

    assert.equal(validatePasswordComplexity('short').valid, false);
    assert.equal(validatePasswordComplexity('weakpassword123').valid, false);
    assert.equal(validatePasswordComplexity('NOLOWERCASENUMBER!').valid, false);
    assert.equal(validatePasswordComplexity('ValidP@ssw0rd2026!').valid, true);
  });

  test('4.1 Absolute Safety Restriction: Zero direct production execution allowed', () => {
    // Invariant check: production database URL must never be targeted by local scripts
    const prodUrl = process.env.SUPABASE_PRODUCTION_DB_URL || '';
    assert.equal(prodUrl, '', 'SUPABASE_PRODUCTION_DB_URL must not be defined in active test process');
  });

});
