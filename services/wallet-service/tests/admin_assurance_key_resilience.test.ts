import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import {
  getAssuranceSigningSecret,
  issueAdminAssuranceToken,
  verifyAdminAssuranceToken
} from '../src/security/mfa';

describe('ADMIN ASSURANCE SIGNING KEY RESILIENCE & ENTROPY HARNESS', () => {
  const originalEnv = { ...process.env };

  const restoreEnv = () => {
    process.env = { ...originalEnv };
  };

  it('1. Returns explicit ADMIN_ASSURANCE_SIGNING_KEY when configured with >= 32 chars', () => {
    restoreEnv();
    const explicitKey = 'a'.repeat(32);
    process.env.ADMIN_ASSURANCE_SIGNING_KEY = explicitKey;
    process.env.VERCEL_ENV = 'production';
    const resolved = getAssuranceSigningSecret();
    assert.strictEqual(resolved, explicitKey);
  });

  it('2. In production without explicit key, derives deterministic 64-char key from SUPABASE_SERVICE_ROLE_KEY', () => {
    restoreEnv();
    delete process.env.ADMIN_ASSURANCE_SIGNING_KEY;
    delete process.env.ADMIN_MFA_SECRET;
    process.env.VERCEL_ENV = 'production';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_supabase_service_role_key_with_sufficient_entropy_1234567890';

    const resolved = getAssuranceSigningSecret();
    assert.strictEqual(typeof resolved, 'string');
    assert.strictEqual(resolved.length, 64);
    assert.strictEqual(/^[0-9a-f]{64}$/.test(resolved), true);

    // Verify determinism
    const resolved2 = getAssuranceSigningSecret();
    assert.strictEqual(resolved, resolved2);
  });

  it('3. In production without explicit key, derives deterministic 64-char key from POSTGRES_PRISMA_URL', () => {
    restoreEnv();
    delete process.env.ADMIN_ASSURANCE_SIGNING_KEY;
    delete process.env.ADMIN_MFA_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.VERCEL_ENV = 'production';
    process.env.POSTGRES_PRISMA_URL = 'postgres://default:secret1234567890@ep-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require';

    const resolved = getAssuranceSigningSecret();
    assert.strictEqual(resolved.length, 64);
    assert.strictEqual(/^[0-9a-f]{64}$/.test(resolved), true);
  });

  it('4. Successfully issues and verifies assurance tokens with derived key', () => {
    restoreEnv();
    delete process.env.ADMIN_ASSURANCE_SIGNING_KEY;
    delete process.env.ADMIN_MFA_SECRET;
    process.env.VERCEL_ENV = 'production';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_supabase_service_role_key_with_sufficient_entropy_1234567890';

    const token = issueAdminAssuranceToken('usr_owner_123', 'SUPER_ADMIN', 'ADMIN_MUTATION');
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(token.includes('.'), true);

    const verified = verifyAdminAssuranceToken(token, 'ADMIN_MUTATION');
    assert.ok(verified);
    assert.strictEqual(verified.userId, 'usr_owner_123');
    assert.strictEqual(verified.role, 'SUPER_ADMIN');
    assert.strictEqual(verified.scope, 'ADMIN_MUTATION');
  });

  it('5. In production with zero secrets, strictly throws security critical error', () => {
    restoreEnv();
    delete process.env.ADMIN_ASSURANCE_SIGNING_KEY;
    delete process.env.ADMIN_MFA_SECRET;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.JWT_SECRET;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.DATABASE_URL;
    delete process.env.CASHFREE_SECRET_KEY;
    process.env.VERCEL_ENV = 'production';

    assert.throws(() => {
      getAssuranceSigningSecret();
    }, /\[SECURITY_CRITICAL\] ADMIN_ASSURANCE_SIGNING_KEY must be configured with at least 32 characters in production/);
  });

  it('6. In non-production with no secrets, returns DEFAULT_DEV_ASSURANCE_KEY', () => {
    restoreEnv();
    delete process.env.ADMIN_ASSURANCE_SIGNING_KEY;
    delete process.env.ADMIN_MFA_SECRET;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.JWT_SECRET;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.DATABASE_URL;
    delete process.env.CASHFREE_SECRET_KEY;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';

    const resolved = getAssuranceSigningSecret();
    assert.strictEqual(resolved, 'astroverse_dev_preview_admin_assurance_signing_key_9999a001_entropy32');
  });

  restoreEnv();
});
