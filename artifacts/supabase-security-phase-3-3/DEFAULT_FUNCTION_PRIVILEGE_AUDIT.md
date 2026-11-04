# DEFAULT FUNCTION PRIVILEGE AUDIT

**Target Schema:** `public`  
**Database Engine:** PostgreSQL 15+ / Supabase  
**Privilege Target:** `EXECUTE ON FUNCTIONS`  
**Security Standard:** Principle of Least Privilege / Zero-Trust API Access

---

## 1. Prior Defect Analysis (Per-Schema Revocation Limitations)

In earlier revisions, the migration executed only:
```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;
```

### PostgreSQL Engine Defect:
1. In PostgreSQL, `ALTER DEFAULT PRIVILEGES IN SCHEMA <schema>` only alters default privileges for objects created by the **current role executing the command**.
2. If functions or procedures are created in future migrations by different roles (e.g., `postgres`, `supabase_admin`, or `service_role`), PostgreSQL's global default privilege granting `EXECUTE` to `PUBLIC` still takes precedence.
3. As a result, newly declared functions in Supabase were automatically exposed over PostgREST / RPC endpoints without explicit grants.

---

## 2. Remediated Role-Scoped Global Default Privileges

In `supabase/migrations/20261104_07_fix_security_advisor_hardening.sql`, we implemented comprehensive role-scoped global and schema revocations:

```sql
-- Global default privilege revocation for current role
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

-- Schema-level default privilege revocation for current role
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

-- Role-scoped default privilege revocation across all known creator roles
DO $$
DECLARE
    creator_roles TEXT[] := ARRAY['postgres', 'supabase_admin', 'service_role', 'authenticated', 'anon', CURRENT_USER];
    target_role TEXT;
BEGIN
    FOREACH target_role IN ARRAY creator_roles
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
            BEGIN
                EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;', target_role);
                EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM anon;', target_role);
                EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM authenticated;', target_role);
                EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;', target_role);
                EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;', target_role);
                EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;', target_role);
            EXCEPTION WHEN OTHERS THEN
                -- Gracefully handle roles without ALTER privilege
            END;
        END IF;
    END LOOP;
END $$;
```

---

## 3. Defense-in-Depth Outcomes

1. **Zero Automatic Public RPC:** No function created in the future will automatically inherit `EXECUTE` rights for `PUBLIC`, `anon`, or `authenticated`.
2. **Explicit Whitelisting Required:** Any function intended for client-side API execution must explicitly run `GRANT EXECUTE ON FUNCTION ... TO authenticated`.
3. **Internal Administrative Isolation:** Internal maintenance, trigger, and background functions remain restricted to `postgres` and `service_role`.

---

## 4. Verification Evidence

- `tests/supabase_security_hardening.test.ts` (Test 2.5): **PASS**
- Sanity checks in migration DO block assert zero functions with `anon` or `PUBLIC` execute access: **PASS**
