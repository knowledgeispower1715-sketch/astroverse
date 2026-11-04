# ASTROVERSE SUPABASE SECURITY REGRESSION RESULTS

**Execution Date:** 2026-11-04T11:53:44Z  
**Framework:** Node.js Built-in Test Runner (`node:test`, `node:assert/strict`) via `ts-node`  
**Test File:** `services/wallet-service/tests/supabase_security_hardening.test.ts`  
**Total Tests:** 10  
**Passed:** 10  
**Failed:** 0  
**Duration:** 23.7ms  

---

## 1. Raw Execution Output

```text
▶ Supabase Security Advisor & Database Integrity Validation
  ✔ 1.1 CustomerProfileView enforces security_invoker = true in schemaBootstrap DDL (0.51ms)
  ✔ 1.2 CustomerProfileView excludes sensitive authentication secrets from SELECT columns (0.1412ms)
  ✔ 2.1 Migration 20261104_07_fix_security_advisor_hardening.sql exists and contains view hardening (0.2755ms)
  ✔ 2.2 Migration restricts public.rls_auto_enable() execution and search path (0.231ms)
  ✔ 2.3 Migration locks search_path and revokes public execute on prevent_unauthorized_profile_mutation (0.244ms)
  ✔ 2.4 Migration locks search_path and revokes public execute on handle_new_user (0.1596ms)
  ✔ 2.5 Migration revokes future function execute privileges from PUBLIC, anon, authenticated (0.2286ms)
  ✔ 2.6 Migration configures private Storage buckets and user-isolated object RLS policies (0.1919ms)
  ✔ 3.1 Password Complexity Defense handles BLOCKED_PLAN_REQUIREMENT (Free Plan) (0.1744ms)
  ✔ 4.1 Absolute Safety Restriction: Zero direct production execution allowed (0.1021ms)
✔ Supabase Security Advisor & Database Integrity Validation (2.9238ms)
ℹ tests 10
ℹ suites 1
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 23.7753
```

---

## 2. Regression Coverage Analysis

1. **View Security Invoker Verification:** Verifies that `CustomerProfileView` DDL includes `WITH (security_invoker = true)`, guaranteeing that any future build or schema bootstrap cannot silently regress to a SECURITY DEFINER view.
2. **Credential Secret Exclusion:** Verifies that `passwordHash`, `passwordSalt`, `mfaSecret`, `mfaRecoveryCodes`, and `resetTokenHash` remain excluded from any profile view definition.
3. **Privilege Revocation Audit:** Verifies that the version-controlled migration revokes execution privileges from `PUBLIC`, `anon`, and `authenticated` for `rls_auto_enable()`, `prevent_unauthorized_profile_mutation()`, `handle_new_user()`, and future functions via `ALTER DEFAULT PRIVILEGES`.
4. **Search Path Tampering Defense:** Verifies that all `SECURITY DEFINER` routines declare a fixed `SET search_path = pg_catalog, public...` to prevent operator hijacking.
5. **Storage Boundary Enforcement:** Verifies that storage bucket policies enforce private bucket definitions and folder-scoped user isolation.
6. **Production Safety Invariant:** Verifies that no production credentials or target URLs are exposed in the local test runner.
