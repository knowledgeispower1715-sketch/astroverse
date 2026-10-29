-- =============================================================================
-- ASTROVERSE SUPABASE MIGRATION 06: PROFILE PROTECTION TRIGGER & RLS HARDENING
-- =============================================================================
-- Description:
-- 1. Implements a database-level BEFORE UPDATE security trigger on public.profiles
--    to mathematically prevent privilege escalation (role self-granting) and
--    direct client-side wallet tampering.
-- 2. Enforces least-privilege RLS policies on public.profiles, public.admin_audit_logs,
--    public.feature_flags, and public.platform_incidents.
-- 3. Guarantees that the audit log is strictly append-only (UPDATE and DELETE denied).
-- =============================================================================

-- 1. SECURITY DEFINER FUNCTION TO PREVENT PRIVILEGE ESCALATION
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to public.profiles
DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_mutation ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_profile_mutation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_unauthorized_profile_mutation();

-- 2. RLS POLICIES FOR PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('OWNER', 'SUPER_ADMIN', 'SECURITY_ADMIN', 'SUPPORT_ADMIN', 'SUPPORT')
        )
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. RLS POLICIES FOR IMMUTABLE ADMIN AUDIT LOGS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('OWNER', 'SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN')
        )
    );

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.admin_audit_logs FOR INSERT
    WITH CHECK (
        auth.uid() = actor_id OR
        current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Audit logs are strictly immutable: DENY ALL UPDATES AND DELETES
DROP POLICY IF EXISTS "Audit logs cannot be updated" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON public.admin_audit_logs;

-- 4. RLS POLICIES FOR FEATURE FLAGS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feature flags" ON public.feature_flags;
CREATE POLICY "Anyone can read feature flags"
    ON public.feature_flags FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage feature flags"
    ON public.feature_flags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('OWNER', 'SUPER_ADMIN', 'SECURITY_ADMIN')
        )
    );

-- 5. RLS POLICIES FOR PLATFORM INCIDENTS
ALTER TABLE public.platform_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view incidents" ON public.platform_incidents;
CREATE POLICY "Admins can view incidents"
    ON public.platform_incidents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('OWNER', 'SUPER_ADMIN', 'SECURITY_ADMIN', 'SUPPORT_ADMIN', 'ASTROLOGY_OPS_ADMIN', 'OPERATIONS')
        )
    );

DROP POLICY IF EXISTS "Admins can manage incidents" ON public.platform_incidents;
CREATE POLICY "Admins can manage incidents"
    ON public.platform_incidents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('OWNER', 'SUPER_ADMIN', 'SECURITY_ADMIN')
        )
    );
