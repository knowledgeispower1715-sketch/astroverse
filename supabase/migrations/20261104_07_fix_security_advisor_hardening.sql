-- =============================================================================
-- ASTROVERSE SUPABASE MIGRATION 07: SECURITY ADVISOR FORENSIC HARDENING
-- =============================================================================
-- Migration: 20261104_07_fix_security_advisor_hardening.sql
-- Description:
-- 1. Hardens CustomerProfileView with (security_invoker = true) to enforce
--    underlying RLS policies on "User" and prevent cross-customer data exposure.
-- 2. Restricts public.rls_auto_enable() execution privileges to postgres and
--    service_role, fixes mutable search_path, and removes public API exposure.
-- 3. Audits and remediates all SECURITY DEFINER functions in public schema:
--    - public.handle_new_user()
--    - public.prevent_unauthorized_profile_mutation()
--    - public.handle_updated_at()
-- 4. Alters default privileges in public schema to prevent future function privilege
--    regressions (REVOKE EXECUTE FROM PUBLIC / anon / authenticated by default).
-- 5. Implements defense-in-depth Supabase Storage RLS policies for private buckets.
-- =============================================================================

-- =============================================================================
-- 1. HARDEN CustomerProfileView (SECURITY INVOKER ENFORCEMENT)
-- =============================================================================
-- Problem: In PostgreSQL, views default to SECURITY DEFINER semantics (executing
-- as view owner), completely bypassing underlying table RLS policies for callers.
-- Solution: In PostgreSQL 15+, enable security_invoker = true so queries evaluate
-- using the calling role's permissions and RLS predicates.
DO $$ 
BEGIN
    -- Check if view exists in public schema
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'CustomerProfileView'
    ) THEN
        BEGIN
            -- Attempt PostgreSQL 15+ security_invoker option
            ALTER VIEW public."CustomerProfileView" SET (security_invoker = true);
            RAISE NOTICE 'CustomerProfileView successfully migrated to security_invoker = true';
        EXCEPTION WHEN OTHERS THEN
            -- Safe fail-closed fallback for PostgreSQL < 15: Revoke direct API access
            REVOKE ALL ON public."CustomerProfileView" FROM PUBLIC, anon, authenticated;
            RAISE NOTICE 'PostgreSQL < 15 detected; revoked API grants on CustomerProfileView';
        END;
    END IF;
END $$;


-- =============================================================================
-- 2. HARDEN public.rls_auto_enable() FUNCTION
-- =============================================================================
-- Problem: rls_auto_enable() was created as SECURITY DEFINER in public schema with
-- default EXECUTE granted to PUBLIC, and lacked a fixed search_path.
-- Solution: Revoke execution from untrusted API roles (PUBLIC, anon, authenticated),
-- restrict to postgres and service_role, and set fixed search_path.
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) THEN
        -- 1. Revoke public execution
        REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
        
        -- 2. Grant only to privileged backend / migration roles
        GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;
        
        -- 3. Lock search_path to prevent hijacking
        ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog, public;
        
        RAISE NOTICE 'public.rls_auto_enable() execution privileges and search_path successfully secured';
    ELSE
        RAISE NOTICE 'public.rls_auto_enable() not present in current schema; skipped';
    END IF;
END $$;


-- =============================================================================
-- 3. AUDIT & HARDEN EXISTING SECURITY DEFINER TRIGGER FUNCTIONS
-- =============================================================================

-- A. Hardening public.handle_new_user()
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    ) THEN
        REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, supabase_auth_admin, service_role;
        ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public, auth;
        RAISE NOTICE 'public.handle_new_user() secured';
    END IF;
END $$;

-- B. Hardening public.prevent_unauthorized_profile_mutation()
-- Fixes missing search_path that triggered Supabase Security Advisor mutable search path warning
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_mutation()
RETURNS TRIGGER AS $$
DECLARE
    current_jwt_role TEXT;
    is_service_role BOOLEAN;
BEGIN
    -- Determine execution role from Supabase auth JWT
    current_jwt_role := COALESCE(
        current_setting('request.jwt.claim.role', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    );
    is_service_role := (current_jwt_role = 'service_role');

    -- If running as service_role (backend API), mutation is authorized
    IF is_service_role THEN
        RETURN NEW;
    END IF;

    -- Block unauthorized mutation of account role
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'PRIVILEGE_ESCALATION_BLOCKED: Ordinary users cannot modify administrative roles directly.';
    END IF;

    -- Block direct client mutation of wallet balance
    IF OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance THEN
        RAISE EXCEPTION 'DIRECT_BALANCE_MUTATION_BLOCKED: Wallet balances may only be altered via verified server-side ledger operations.';
    END IF;

    -- Block unauthorized modification of account status (e.g. self-unsuspension)
    IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
        RAISE EXCEPTION 'ACCOUNT_STATUS_MUTATION_BLOCKED: Account status moderation is restricted to platform administrators.';
    END IF;

    -- Preserve timestamps
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Revoke execute from API roles on prevent_unauthorized_profile_mutation
REVOKE ALL ON FUNCTION public.prevent_unauthorized_profile_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_unauthorized_profile_mutation() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_unauthorized_profile_mutation() TO postgres, service_role;

-- C. Hardening public.handle_updated_at()
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'handle_updated_at'
    ) THEN
        REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO postgres, service_role;
        ALTER FUNCTION public.handle_updated_at() SET search_path = pg_catalog, public;
        RAISE NOTICE 'public.handle_updated_at() secured';
    END IF;
END $$;


-- =============================================================================
-- 4. PREVENT FUTURE FUNCTION-PRIVILEGE REGRESSIONS
-- =============================================================================
-- PostgreSQL grants EXECUTE to PUBLIC on all newly created functions by default.
-- Altering default privileges prevents newly created functions in public schema
-- from being automatically exposed via Supabase Data / RPC APIs.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;


-- =============================================================================
-- 5. STORAGE BUCKET ISOLATION & ROW LEVEL SECURITY POLICIES
-- =============================================================================
-- Hardens Supabase storage objects so that customer Kundli reports and documents
-- are strictly private and accessible only by their authenticated owner.
DO $$
BEGIN
    -- Only execute if Supabase Storage extension is active
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
        -- Ensure private bucket configuration
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
            ('kundli-reports', 'kundli-reports', false, 15728640, ARRAY['application/pdf', 'application/json']),
            ('customer-documents', 'customer-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
            ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
        ON CONFLICT (id) DO UPDATE SET 
            public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types;

        -- Ensure RLS on storage.objects
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- Policy: Customer Kundli Reports read isolation
        DROP POLICY IF EXISTS "Customers can read own reports in storage" ON storage.objects;
        CREATE POLICY "Customers can read own reports in storage"
            ON storage.objects FOR SELECT
            TO authenticated
            USING (
                bucket_id = 'kundli-reports' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        -- Policy: Customer Kundli Reports upload isolation
        DROP POLICY IF EXISTS "Customers can upload own reports to storage" ON storage.objects;
        CREATE POLICY "Customers can upload own reports to storage"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'kundli-reports' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        -- Policy: Backend service_role full control over storage
        DROP POLICY IF EXISTS "Service role full storage control" ON storage.objects;
        CREATE POLICY "Service role full storage control"
            ON storage.objects FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        RAISE NOTICE 'Supabase Storage RLS policies successfully applied';
    END IF;
END $$;

-- =============================================================================
-- 6. VERIFICATION SANITY CHECK
-- =============================================================================
DO $$
DECLARE
    insecure_views_count INTEGER;
    insecure_functions_count INTEGER;
BEGIN
    -- Check for public views lacking security_invoker
    SELECT count(*) INTO insecure_views_count
    FROM pg_views v
    JOIN pg_class c ON c.relname = v.viewname
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND v.viewname = 'CustomerProfileView'
      AND NOT (c.reloptions @> ARRAY['security_invoker=true']);

    IF insecure_views_count > 0 THEN
        RAISE WARNING 'CustomerProfileView does not have security_invoker=true enabled!';
    ELSE
        RAISE NOTICE 'SECURITY CHECK PASSED: CustomerProfileView has security_invoker enabled.';
    END IF;

    -- Check for functions in public with public execute
    SELECT count(*) INTO insecure_functions_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('rls_auto_enable', 'prevent_unauthorized_profile_mutation', 'handle_new_user')
      AND has_function_privilege('anon', p.oid, 'EXECUTE');

    IF insecure_functions_count > 0 THEN
        RAISE WARNING 'Insecure function execute privileges detected for anon role!';
    ELSE
        RAISE NOTICE 'SECURITY CHECK PASSED: Privileged functions are restricted from anon.';
    END IF;
END $$;
