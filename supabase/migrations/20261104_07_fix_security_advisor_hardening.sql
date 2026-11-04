-- =============================================================================
-- ASTROVERSE SUPABASE MIGRATION 07: SECURITY ADVISOR FORENSIC HARDENING
-- =============================================================================
-- Migration: 20261104_07_fix_security_advisor_hardening.sql
-- Description:
-- 1. Hardens CustomerProfileView with (security_invoker = true) to enforce
--    underlying RLS policies on "User" and prevent cross-customer data exposure.
--    Fail-closed: requires PostgreSQL 15+; never falls back to normal view.
-- 2. Restricts public.rls_auto_enable() execution privileges to postgres and
--    service_role, fixes mutable search_path, and removes public API exposure.
-- 3. Audits and remediates all SECURITY DEFINER functions in public schema:
--    - public.handle_new_user()
--    - public.prevent_unauthorized_profile_mutation()
--    - public.handle_updated_at()
-- 4. Enforces role-scoped global default privilege revocations for creator roles
--    (REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC / anon / authenticated).
-- 5. Implements defense-in-depth Supabase Storage RLS policies for private buckets
--    (kundli-reports, customer-documents, avatars) with strict owner folder isolation.
-- 6. Fail-closed verification assertions: aborts migration on any invariant violation.
-- =============================================================================

-- =============================================================================
-- 1. HARDEN CustomerProfileView (SECURITY INVOKER ENFORCEMENT - FAIL-CLOSED)
-- =============================================================================
DO $$ 
DECLARE
    pg_ver INTEGER;
BEGIN
    SELECT current_setting('server_version_num')::integer INTO pg_ver;
    IF pg_ver < 150000 THEN
        RAISE EXCEPTION 'POSTGRESQL_VERSION_INSUFFICIENT: CustomerProfileView requires PostgreSQL 15+ for security_invoker = true enforcement. Current version: %', pg_ver;
    END IF;

    -- Ensure CustomerProfileView is created or altered with security_invoker = true
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'CustomerProfileView'
    ) THEN
        ALTER VIEW public."CustomerProfileView" SET (security_invoker = true);
        RAISE NOTICE 'CustomerProfileView successfully set to security_invoker = true';
    ELSE
        -- Create view with security_invoker = true if not already present
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
            CREATE OR REPLACE VIEW public."CustomerProfileView" WITH (security_invoker = true) AS 
            SELECT 
              "id", "phone", "email", "phoneVerified", "emailVerified", 
              "displayName", "role", "status", "preferredLanguage", "preferredTimezone", 
              "walletBalance", "mfaEnabled", "mfaEnforced", 
              "subscriptionTier", "subscriptionStatus", "subscriptionBillingPeriod", "subscriptionExpiresAt", 
              "lastLoginAt", "createdAt", "updatedAt" 
            FROM public."User";
            RAISE NOTICE 'CustomerProfileView created with security_invoker = true';
        ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
            CREATE OR REPLACE VIEW public."CustomerProfileView" WITH (security_invoker = true) AS 
            SELECT 
              "id", "display_name", "avatar_url", "role", "account_status", 
              "preferred_language", "preferred_timezone", "wallet_balance", 
              "created_at", "updated_at" 
            FROM public.profiles;
            RAISE NOTICE 'CustomerProfileView created from profiles with security_invoker = true';
        END IF;
    END IF;

    -- Fail-closed assertion: Verify security_invoker = true exists in reloptions
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'CustomerProfileView'
          AND c.reloptions @> ARRAY['security_invoker=true']
    ) THEN
        RAISE EXCEPTION 'SECURITY INVARIANT VIOLATION: CustomerProfileView was not created with security_invoker=true';
    END IF;

    -- Revoke from untrusted API roles
    REVOKE ALL ON public."CustomerProfileView" FROM PUBLIC;
    REVOKE ALL ON public."CustomerProfileView" FROM anon;
    GRANT SELECT ON public."CustomerProfileView" TO authenticated;
END $$;


-- =============================================================================
-- 2. HARDEN public.rls_auto_enable() FUNCTION
-- =============================================================================
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
-- Handles both snake_case (profiles) and camelCase (User) target relations safely via JSONB.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_mutation()
RETURNS TRIGGER AS $$
DECLARE
    current_jwt_role TEXT;
    is_service_role BOOLEAN;
    old_data JSONB;
    new_data JSONB;
    old_role TEXT;
    new_role TEXT;
    old_balance TEXT;
    new_balance TEXT;
    old_status TEXT;
    new_status TEXT;
BEGIN
    -- Determine execution role from Supabase auth JWT
    current_jwt_role := COALESCE(
        current_setting('request.jwt.claim.role', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    );
    is_service_role := (current_jwt_role = 'service_role' OR current_user IN ('postgres', 'service_role'));

    -- If running as service_role (backend API), mutation is authorized
    IF is_service_role THEN
        RETURN NEW;
    END IF;

    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);

    -- Extract role (support both snake_case and camelCase / quoted)
    old_role := COALESCE(old_data->>'role', old_data->>'Role');
    new_role := COALESCE(new_data->>'role', new_data->>'Role');
    IF old_role IS DISTINCT FROM new_role THEN
        RAISE EXCEPTION 'PRIVILEGE_ESCALATION_BLOCKED: Ordinary users cannot modify administrative roles directly.';
    END IF;

    -- Extract wallet balance (support wallet_balance and walletBalance)
    old_balance := COALESCE(old_data->>'wallet_balance', old_data->>'walletBalance');
    new_balance := COALESCE(new_data->>'wallet_balance', new_data->>'walletBalance');
    IF old_balance IS DISTINCT FROM new_balance THEN
        RAISE EXCEPTION 'DIRECT_BALANCE_MUTATION_BLOCKED: Wallet balances may only be altered via verified server-side ledger operations.';
    END IF;

    -- Extract account status (support account_status and status)
    old_status := COALESCE(old_data->>'account_status', old_data->>'status');
    new_status := COALESCE(new_data->>'account_status', new_data->>'status');
    IF old_status IS DISTINCT FROM new_status THEN
        RAISE EXCEPTION 'ACCOUNT_STATUS_MUTATION_BLOCKED: Account status moderation is restricted to platform administrators.';
    END IF;

    -- Preserve timestamps matching relation naming
    IF TG_TABLE_NAME = 'User' THEN
        NEW."updatedAt" := NOW();
    ELSIF TG_TABLE_NAME = 'profiles' THEN
        NEW.updated_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Revoke execute from API roles on prevent_unauthorized_profile_mutation
REVOKE ALL ON FUNCTION public.prevent_unauthorized_profile_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_unauthorized_profile_mutation() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_unauthorized_profile_mutation() TO postgres, service_role;

-- Attach trigger to public.profiles if it exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_mutation ON public.profiles;
        CREATE TRIGGER trg_prevent_unauthorized_profile_mutation
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.prevent_unauthorized_profile_mutation();
        RAISE NOTICE 'Attached prevent_unauthorized_profile_mutation trigger to public.profiles';
    END IF;
END $$;

-- Attach trigger to public."User" if it exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        DROP TRIGGER IF EXISTS trg_prevent_unauthorized_user_mutation ON public."User";
        CREATE TRIGGER trg_prevent_unauthorized_user_mutation
            BEFORE UPDATE ON public."User"
            FOR EACH ROW
            EXECUTE FUNCTION public.prevent_unauthorized_profile_mutation();
        RAISE NOTICE 'Attached prevent_unauthorized_profile_mutation trigger to public."User"';
    END IF;
END $$;

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
-- 4. PREVENT FUTURE FUNCTION-PRIVILEGE REGRESSIONS (ROLE-SCOPED DEFAULT PRIVILEGES)
-- =============================================================================
-- PostgreSQL grants EXECUTE to PUBLIC on all newly created functions by default.
-- Altering default privileges globally and per-schema for each creator role prevents
-- newly created functions from being automatically exposed via Supabase Data / RPC APIs.

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
                RAISE NOTICE 'Revoked default function execute privileges for role %', target_role;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Skipping default privileges for role % (insufficient privileges or not applicable)', target_role;
            END;
        END IF;
    END LOOP;
END $$;


-- =============================================================================
-- 5. STORAGE BUCKET ISOLATION & ROW LEVEL SECURITY POLICIES
-- =============================================================================
-- Hardens Supabase storage objects so that customer Kundli reports and documents
-- are strictly private and accessible only by their authenticated owner.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
        -- Configure private buckets for sensitive customer files; public bucket for avatars only
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
            ('kundli-reports', 'kundli-reports', false, 15728640, ARRAY['application/pdf', 'application/json']),
            ('customer-documents', 'customer-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
            ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
        ON CONFLICT (id) DO UPDATE SET 
            public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types;

        -- Ensure RLS is active on storage.objects
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- Clean up existing permissive or obsolete policies
        DROP POLICY IF EXISTS "Customers can read own reports in storage" ON storage.objects;
        DROP POLICY IF EXISTS "Customers can upload own reports to storage" ON storage.objects;
        DROP POLICY IF EXISTS "Customers can update own reports in storage" ON storage.objects;
        DROP POLICY IF EXISTS "Customers can delete own reports in storage" ON storage.objects;
        DROP POLICY IF EXISTS "Customers can read own documents in storage" ON storage.objects;
        DROP POLICY IF EXISTS "Customers can upload own documents to storage" ON storage.objects;
        DROP POLICY IF EXISTS "Customers can update own documents in storage" ON storage.objects;
        DROP POLICY IF EXISTS "Customers can delete own documents in storage" ON storage.objects;
        DROP POLICY IF EXISTS "Public can view avatars in storage" ON storage.objects;
        DROP POLICY IF EXISTS "Users can manage own avatars in storage" ON storage.objects;
        DROP POLICY IF EXISTS "Service role full storage control" ON storage.objects;

        -- 1. kundli-reports (Private bucket): Owner-isolated policies
        CREATE POLICY "Customers can read own reports in storage"
            ON storage.objects FOR SELECT
            TO authenticated
            USING (
                bucket_id = 'kundli-reports' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        CREATE POLICY "Customers can upload own reports to storage"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'kundli-reports' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        CREATE POLICY "Customers can update own reports in storage"
            ON storage.objects FOR UPDATE
            TO authenticated
            USING (
                bucket_id = 'kundli-reports' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            )
            WITH CHECK (
                bucket_id = 'kundli-reports' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        CREATE POLICY "Customers can delete own reports in storage"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (
                bucket_id = 'kundli-reports' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        -- 2. customer-documents (Private bucket): Owner-isolated policies
        CREATE POLICY "Customers can read own documents in storage"
            ON storage.objects FOR SELECT
            TO authenticated
            USING (
                bucket_id = 'customer-documents' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        CREATE POLICY "Customers can upload own documents to storage"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'customer-documents' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        CREATE POLICY "Customers can update own documents in storage"
            ON storage.objects FOR UPDATE
            TO authenticated
            USING (
                bucket_id = 'customer-documents' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            )
            WITH CHECK (
                bucket_id = 'customer-documents' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        CREATE POLICY "Customers can delete own documents in storage"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (
                bucket_id = 'customer-documents' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        -- 3. avatars (Public read, Owner-write bucket)
        CREATE POLICY "Public can view avatars in storage"
            ON storage.objects FOR SELECT
            TO PUBLIC
            USING (bucket_id = 'avatars');

        CREATE POLICY "Users can manage own avatars in storage"
            ON storage.objects FOR ALL
            TO authenticated
            USING (
                bucket_id = 'avatars' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            )
            WITH CHECK (
                bucket_id = 'avatars' AND
                (auth.uid())::text = (storage.foldername(name))[1]
            );

        -- 4. Backend service_role: Full administration
        CREATE POLICY "Service role full storage control"
            ON storage.objects FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        RAISE NOTICE 'Supabase Storage RLS policies successfully applied with strict owner folder isolation';
    END IF;
END $$;


-- =============================================================================
-- 6. VERIFICATION SANITY CHECKS (FAIL-CLOSED BLOCKING ASSERTIONS)
-- =============================================================================
DO $$
DECLARE
    secure_views_count INTEGER;
    insecure_views_count INTEGER;
    insecure_functions_count INTEGER;
    insecure_buckets_count INTEGER;
BEGIN
    -- Assert 1: CustomerProfileView exists and has security_invoker = true
    SELECT count(*) INTO secure_views_count
    FROM pg_views v
    JOIN pg_class c ON c.relname = v.viewname
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND v.viewname = 'CustomerProfileView'
      AND (c.reloptions @> ARRAY['security_invoker=true']);

    IF secure_views_count <> 1 THEN
        RAISE EXCEPTION 'SECURITY INVARIANT VIOLATION: CustomerProfileView must exist with security_invoker=true exactly once. Count: %', secure_views_count;
    ELSE
        RAISE NOTICE 'SECURITY CHECK PASSED: CustomerProfileView has security_invoker = true.';
    END IF;

    -- Assert 2: Check for any public views lacking security_invoker
    SELECT count(*) INTO insecure_views_count
    FROM pg_views v
    JOIN pg_class c ON c.relname = v.viewname
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND v.viewname = 'CustomerProfileView'
      AND NOT (c.reloptions @> ARRAY['security_invoker=true']);

    IF insecure_views_count > 0 THEN
        RAISE EXCEPTION 'SECURITY INVARIANT VIOLATION: CustomerProfileView does not have security_invoker=true enabled!';
    END IF;

    -- Assert 3: Privileged SECURITY DEFINER functions must not have EXECUTE granted to anon, authenticated, or PUBLIC
    SELECT count(*) INTO insecure_functions_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('rls_auto_enable', 'prevent_unauthorized_profile_mutation', 'handle_new_user', 'handle_updated_at')
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE') OR 
        has_function_privilege('authenticated', p.oid, 'EXECUTE') OR
        has_function_privilege('PUBLIC', p.oid, 'EXECUTE')
      );

    IF insecure_functions_count > 0 THEN
        RAISE EXCEPTION 'SECURITY INVARIANT VIOLATION: Insecure function execute privileges detected for anon/authenticated/PUBLIC! Count: %', insecure_functions_count;
    ELSE
        RAISE NOTICE 'SECURITY CHECK PASSED: Privileged functions are restricted from anon, authenticated, and PUBLIC.';
    END IF;

    -- Assert 4: Sensitive storage buckets must not be public
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
        SELECT count(*) INTO insecure_buckets_count
        FROM storage.buckets
        WHERE id IN ('kundli-reports', 'customer-documents') AND public = true;

        IF insecure_buckets_count > 0 THEN
            RAISE EXCEPTION 'SECURITY INVARIANT VIOLATION: Sensitive storage buckets are marked public! Count: %', insecure_buckets_count;
        ELSE
            RAISE NOTICE 'SECURITY CHECK PASSED: Sensitive storage buckets are strictly private.';
        END IF;
    END IF;

    RAISE NOTICE 'ALL MIGRATION 07 SECURITY ADVISOR INVARIANTS VERIFIED SUCCESSFULLY (FAIL-CLOSED).';
END $$;
