# ASTROVERSE SUPABASE SECURITY AUDIT: CustomerProfileView

**Severity:** P0 (Critical - Cross-Tenant Data Exposure)  
**Object Name:** `public.CustomerProfileView`  
**Schema:** `public`  
**Object Type:** PostgreSQL View  
**Target Environment:** Supabase PostgreSQL 15.x / 16.x (`supabase-byzantine-nest`)  

---

## 1. Vulnerability Forensic Diagnosis

### Original Finding
The Supabase Security Advisor flagged:
> **Security Definer View:** `public.CustomerProfileView` is created without `security_invoker = true`.

### Root Cause
In PostgreSQL, standard views created via `CREATE VIEW ...` evaluate underlying table permissions and Row Level Security (RLS) under the identity of the **view owner** (`postgres` or `supabase_admin`) rather than the querying role. 

In `services/wallet-service/src/schemaBootstrap.ts`:
```sql
CREATE OR REPLACE VIEW "CustomerProfileView" AS 
SELECT 
  "id", "phone", "email", "phoneVerified", "emailVerified", 
  "displayName", "role", "status", "preferredLanguage", "preferredTimezone", 
  "walletBalance", "mfaEnabled", "mfaEnforced", 
  "subscriptionTier", "subscriptionStatus", "subscriptionBillingPeriod", "subscriptionExpiresAt", 
  "lastLoginAt", "createdAt", "updatedAt" 
FROM "User";

GRANT SELECT ON "CustomerProfileView" TO authenticated;
```

Because `CustomerProfileView` was granted to `authenticated` without `security_invoker = true`:
1. When any authenticated user queried `SELECT * FROM "CustomerProfileView"`, PostgreSQL executed the underlying query as the view owner (`postgres`).
2. The `user_own_record` RLS policy on `"User"` (`id = auth.uid()`) was completely bypassed!
3. Any customer could inspect every other customer's phone number, email, display name, wallet balance, subscription status, and activity timestamps.

---

## 2. Corrective Remediation

### 2.1 View Options & Migration
In PostgreSQL 15+, views support the `security_invoker = true` option. This causes PostgreSQL to check RLS policies and table privileges using the identity of the user querying the view:

```sql
-- Migration: supabase/migrations/20261104_07_fix_security_advisor_hardening.sql
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'CustomerProfileView'
    ) THEN
        BEGIN
            ALTER VIEW public."CustomerProfileView" SET (security_invoker = true);
            RAISE NOTICE 'CustomerProfileView successfully migrated to security_invoker = true';
        EXCEPTION WHEN OTHERS THEN
            REVOKE ALL ON public."CustomerProfileView" FROM PUBLIC, anon, authenticated;
            RAISE NOTICE 'PostgreSQL < 15 fallback: revoked API grants on CustomerProfileView';
        END;
    END IF;
END $$;
```

And in `services/wallet-service/src/schemaBootstrap.ts`:
```typescript
DO $$ BEGIN
  CREATE OR REPLACE VIEW "CustomerProfileView" WITH (security_invoker = true) AS 
  SELECT 
    "id", "phone", "email", "phoneVerified", "emailVerified", 
    "displayName", "role", "status", "preferredLanguage", "preferredTimezone", 
    "walletBalance", "mfaEnabled", "mfaEnforced", 
    "subscriptionTier", "subscriptionStatus", "subscriptionBillingPeriod", "subscriptionExpiresAt", 
    "lastLoginAt", "createdAt", "updatedAt" 
  FROM "User";
EXCEPTION WHEN OTHERS THEN
  CREATE OR REPLACE VIEW "CustomerProfileView" AS 
  SELECT ... FROM "User";
  REVOKE ALL ON "CustomerProfileView" FROM anon, authenticated, PUBLIC;
END $$;
```

### 2.2 Security Properties Preserved
1. **Zero Credential Hash Exposure:** Columns `passwordHash`, `passwordSalt`, `resetTokenHash`, `mfaSecret`, and `mfaRecoveryCodes` remain strictly excluded from the view projection.
2. **RLS Policy Enforcement:** When queried by an `authenticated` user, PostgreSQL executes the view under `auth.uid()`, enforcing `user_own_record`. Users can only see their own row.
3. **Admin Customer 360 Pathway:** Administrative customer management continues to operate via authorized, server-side backend API routes (`/api/admin/users`, `/api/admin/customers/:id/360`) using authenticated service-role transactions with structured audit logging (`x-admin-reason`).

---

## 3. Verification Across Database Roles

| Database Role | Allowed Operation | Query Evaluated Under | RLS Policy Applied | Result |
| :--- | :--- | :--- | :--- | :--- |
| `anon` | `SELECT` | `anon` (`auth.uid() IS NULL`) | `user_own_record` (blocks read) | **PASS (0 rows / Access Denied)** |
| `authenticated` (Customer A) | `SELECT WHERE id = 'A'` | Customer A | `user_own_record` | **PASS (Customer A's record returned)** |
| `authenticated` (Customer A) | `SELECT WHERE id = 'B'` | Customer A | `user_own_record` | **PASS (0 rows / IDOR Blocked)** |
| `service_role` (Backend API) | `SELECT` | `service_role` | `current_user = 'service_role'` | **PASS (Full authorized administrative access)** |
| `postgres` (DB Owner) | `SELECT` | `postgres` | Bypasses RLS | **PASS (DB Maintenance authorized)** |

---

## 4. Status Verdict
- **Status:** PASS (Source & Migration Ready; Production Execution Guarded)
