# CUSTOMER PROFILE VIEW FAIL-CLOSED AUDIT

**Target Object:** `public."CustomerProfileView"`  
**Underlying Relation:** `public."User"` / `public.profiles`  
**Security Model:** PostgreSQL 15+ Row Level Security (RLS) under caller identity (`security_invoker = true`)  
**Audit Finding:** CRITICAL FAIL-OPEN ELIMINATION & BLOCKING VERIFICATION

---

## 1. Prior Defect Analysis (Fail-Open Bootstrap)

In prior revisions, `services/wallet-service/src/schemaBootstrap.ts` contained a dangerous exception catch block:
```sql
DO $$ BEGIN
  CREATE OR REPLACE VIEW "CustomerProfileView" WITH (security_invoker = true) AS 
  SELECT ... FROM "User";
EXCEPTION WHEN OTHERS THEN
  -- INSECURE FALLBACK:
  CREATE OR REPLACE VIEW "CustomerProfileView" AS 
  SELECT ... FROM "User";
  REVOKE ALL ON "CustomerProfileView" FROM anon, authenticated, PUBLIC;
END $$;
```
followed by an unconditional grant:
```sql
GRANT SELECT ON "CustomerProfileView" TO authenticated;
```

### The Security Vulnerability:
1. If the underlying database engine was PostgreSQL < 15 or if the `security_invoker = true` option failed for any reason, the exception block created a standard view **without** `security_invoker = true`.
2. Standard PostgreSQL views execute with the privileges of the view owner (**SECURITY DEFINER** behavior).
3. The subsequent unconditional statement `GRANT SELECT ON "CustomerProfileView" TO authenticated;` granted read access to all authenticated users on this non-invoker view.
4. **Impact:** Any authenticated user querying `CustomerProfileView` completely bypassed Row Level Security on `"User"`, resulting in cross-customer identity, phone, email, and wallet balance exposure.

---

## 2. Hardened Implementation (Strict Fail-Closed)

The fallback creation was completely removed from both `schemaBootstrap.ts` and `supabase/migrations/20261104_07_fix_security_advisor_hardening.sql`.

### New Bootstrap DDL:
```sql
DO $$ 
DECLARE
  pg_ver INTEGER;
BEGIN
  SELECT current_setting('server_version_num')::integer INTO pg_ver;
  IF pg_ver < 150000 THEN
    RAISE EXCEPTION 'POSTGRESQL_VERSION_INSUFFICIENT: CustomerProfileView requires PostgreSQL 15+ for security_invoker = true. Current version: %', pg_ver;
  END IF;

  CREATE OR REPLACE VIEW "CustomerProfileView" WITH (security_invoker = true) AS 
  SELECT 
    "id", "phone", "email", "phoneVerified", "emailVerified", 
    "displayName", "role", "status", "preferredLanguage", "preferredTimezone", 
    "walletBalance", "mfaEnabled", "mfaEnforced", 
    "subscriptionTier", "subscriptionStatus", "subscriptionBillingPeriod", "subscriptionExpiresAt", 
    "lastLoginAt", "createdAt", "updatedAt" 
  FROM "User";

  -- Fail-closed post-creation verification
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'CustomerProfileView'
      AND c.reloptions @> ARRAY['security_invoker=true']
  ) THEN
    RAISE EXCEPTION 'SECURITY_INVOKER_VERIFICATION_FAILED: CustomerProfileView was not created with security_invoker=true';
  END IF;
END $$;
```

### Hardened Gated Grant:
```sql
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'CustomerProfileView'
      AND c.reloptions @> ARRAY['security_invoker=true']
  ) THEN
    GRANT SELECT ON "CustomerProfileView" TO authenticated;
  ELSE
    RAISE EXCEPTION 'GRANT_ABORTED: Refusing to grant SELECT on CustomerProfileView without security_invoker=true';
  END IF;
END $$;
```

---

## 3. Excluded Credential Inventory

The view explicitly projects only non-sensitive user metadata. The following columns from `"User"` are strictly **excluded**:
- `passwordHash` (Excluded)
- `passwordSalt` (Excluded)
- `resetTokenHash` (Excluded)
- `resetTokenExpiresAt` (Excluded)
- `mfaSecret` (Excluded)
- `mfaRecoveryCodes` (Excluded)

Direct `SELECT` on these sensitive columns is revoked from `anon` and `authenticated` roles at the schema level.

---

## 4. Verification Evidence

- `tests/supabase_security_hardening.test.ts` (Test 1.1, 1.2, 1.3): **PASS**
- `tests/real_postgres_security_hardening.test.ts` (Test 3, 4): **PASS**
- Confirmed zero fail-open catch blocks in DDL or migrations.
