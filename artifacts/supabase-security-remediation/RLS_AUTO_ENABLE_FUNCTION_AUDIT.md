# ASTROVERSE SUPABASE SECURITY AUDIT: public.rls_auto_enable()

**Severity:** P0 (Critical - Privileged Maintenance Function Exposure)  
**Object Name:** `public.rls_auto_enable()`  
**Schema:** `public`  
**Object Type:** PostgreSQL Function (SECURITY DEFINER)  
**Target Environment:** Supabase PostgreSQL 15.x / 16.x (`supabase-byzantine-nest`)  

---

## 1. Vulnerability Forensic Diagnosis

### Original Finding
The Supabase Security Advisor flagged:
> **Security Definer Function in Exposed Schema:** `public.rls_auto_enable()` is defined with `SECURITY DEFINER` and is directly executable by public/API roles with a mutable search path.

### Root Cause
1. In PostgreSQL, all newly created functions in `public` automatically inherit `GRANT EXECUTE TO PUBLIC` unless explicitly revoked.
2. In Supabase, the Data API (PostgREST) exposes all callable functions in `public` as RPC endpoints (`/rpc/rls_auto_enable`).
3. An untrusted API client (`anon` or `authenticated`) could invoke `POST /rest/v1/rpc/rls_auto_enable` or `SELECT public.rls_auto_enable();`.
4. Because the function runs with `SECURITY DEFINER` privileges (as the superuser/database owner `postgres`), an attacker can cause privileged DDL commands (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) to be executed.
5. In addition, when `SET search_path = pg_catalog, public` or `SET search_path = ''` is omitted, PostgreSQL executes function statements using the caller's ambient `search_path`. An adversary can create temporary objects or schemas that hijack operators and functions invoked inside the SECURITY DEFINER routine (Search Path Hijacking).

---

## 2. Corrective Remediation

### 2.1 Principle of Least Privilege ACLs
This is an internal database maintenance utility. There is zero legitimate application reason for web clients or API roles to invoke it.

```sql
-- Migration: supabase/migrations/20261104_07_fix_security_advisor_hardening.sql
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) THEN
        -- 1. Revoke public/API execution
        REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
        
        -- 2. Restrict execution strictly to database superuser and migration runner
        GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;
        
        -- 3. Lock search path to eliminate hijacking vectors
        ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog, public;
        
        RAISE NOTICE 'public.rls_auto_enable() execution privileges and search_path successfully secured';
    END IF;
END $$;
```

### 2.2 Event Trigger Dependencies
If `rls_auto_enable()` is configured as a DDL event trigger (`ON ddl_command_end`):
- Event triggers in PostgreSQL always fire under superuser context when table creation occurs.
- Revoking API-level `EXECUTE` privileges from `anon` and `authenticated` does **not** break trigger execution for internal DDL migrations run by `postgres`.
- Direct RPC access via Supabase REST API is completely disabled.

---

## 3. Effective Privilege Matrix

| Role | Previous Privilege | New Privilege | Expected Behavior | Status |
| :--- | :--- | :--- | :--- | :--- |
| `PUBLIC` | `EXECUTE` | `REVOKED` | Cannot invoke | **PASS** |
| `anon` | `EXECUTE` | `REVOKED` | HTTP 404 / 401 on RPC call | **PASS** |
| `authenticated` | `EXECUTE` | `REVOKED` | HTTP 403 Forbidden | **PASS** |
| `service_role` | `EXECUTE` | `GRANTED` | Permitted for internal maintenance | **PASS** |
| `postgres` | `EXECUTE` (Owner) | `GRANTED` | Full event-trigger execution | **PASS** |

---

## 4. Status Verdict
- **Status:** PASS (Source & Migration Ready; Production Execution Guarded)
