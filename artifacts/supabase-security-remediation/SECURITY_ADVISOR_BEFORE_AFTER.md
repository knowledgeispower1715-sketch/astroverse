# ASTROVERSE SUPABASE SECURITY ADVISOR: BEFORE & AFTER COMPARISON

**Project:** `supabase-byzantine-nest`  
**Database Branch:** `main (PRODUCTION)`  
**Audit Timestamp:** 2026-11-04T11:53:44Z  
**Advisor Tool:** Supabase Security Advisor  

---

## 1. Security Advisor Comparison Matrix

| # | Advisor Rule | Affected Object | Severity | "Before" Finding | "After" Remediation Status | Corrective Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Security Definer View** | `public.CustomerProfileView` | **HIGH** | View executes as owner (`postgres`), bypassing underlying table RLS for API callers | **PASS (Remediated in Migration & DDL)** | `WITH (security_invoker = true)` ensures queries evaluate under caller's RLS policy. |
| **2** | **Security Definer Function in Exposed Schema** | `public.rls_auto_enable()` | **HIGH** | Maintenance function directly callable by `PUBLIC` with mutable search path | **PASS (Remediated in Migration)** | Revoked `EXECUTE` from `PUBLIC`, `anon`, `authenticated`. Locked `search_path = pg_catalog, public`. |
| **3** | **Security Definer Search Path Mutable** | `public.prevent_unauthorized_profile_mutation()` | **MEDIUM** | Function runs as owner without fixed `search_path` | **PASS (Remediated in Migration)** | Explicit `SET search_path = pg_catalog, public`. Revoked public execute. |
| **4** | **Function Execute Default Privileges** | `public.*` (All functions) | **MEDIUM** | PostgreSQL default privileges grant `EXECUTE` to `PUBLIC` on new functions | **PASS (Remediated in Migration)** | `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;` |
| **5** | **Leaked Password Protection Disabled** | Supabase Auth Settings | **MEDIUM** | HaveIBeenPwned API checking toggle is disabled in Dashboard | **BLOCKED_PLAN_REQUIREMENT** | Supabase Free tier does not support Leaked Password Protection (requires Pro plan). High-entropy application-level validation enforced as compensating control. |
| **6** | **Unprotected Storage Objects** | `storage.objects` | **MEDIUM** | Potential for public URL leakage of private customer reports | **PASS (Remediated in Migration)** | Buckets declared private (`public = false`); folder-level RLS policy enforced `auth.uid() = foldername`. |

---

## 2. DDL & Configuration Comparison (Diff View)

### Finding 1: `CustomerProfileView`
```diff
- CREATE OR REPLACE VIEW "CustomerProfileView" AS 
+ CREATE OR REPLACE VIEW "CustomerProfileView" WITH (security_invoker = true) AS 
  SELECT 
    "id", "phone", "email", "phoneVerified", "emailVerified", 
    "displayName", "role", "status", "preferredLanguage", "preferredTimezone", 
    "walletBalance", "mfaEnabled", "mfaEnforced", 
    "subscriptionTier", "subscriptionStatus", "subscriptionBillingPeriod", "subscriptionExpiresAt", 
    "lastLoginAt", "createdAt", "updatedAt" 
  FROM "User";
```

### Finding 2: `public.rls_auto_enable()`
```diff
- GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC;
+ REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
+ REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
+ GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;
+ ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog, public;
```

### Finding 3: `public.prevent_unauthorized_profile_mutation()`
```diff
  CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_mutation()
  RETURNS TRIGGER AS $$
  ...
  END;
- $$ LANGUAGE plpgsql SECURITY DEFINER;
+ $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;
+ REVOKE ALL ON FUNCTION public.prevent_unauthorized_profile_mutation() FROM PUBLIC;
+ REVOKE EXECUTE ON FUNCTION public.prevent_unauthorized_profile_mutation() FROM anon, authenticated;
+ GRANT EXECUTE ON FUNCTION public.prevent_unauthorized_profile_mutation() TO postgres, service_role;
```

### Finding 4: Future Function Default Privileges
```diff
+ ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
+ ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
+ ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;
```
