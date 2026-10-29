-- =============================================================================
-- ASTROVERSE SUPABASE MIGRATION 05: ADMIN SECURITY, 7-ROLE RBAC & MFA FOUNDATION
-- =============================================================================
-- Description:
-- 1. Adds Multi-Factor Authentication (MFA/TOTP) support to public.profiles.
-- 2. Expands role constraints to support the 7 canonical administrative roles:
--    OWNER, SECURITY_ADMIN, SUPPORT_ADMIN, CONTENT_EDITOR, FINANCE_ADMIN,
--    ASTROLOGY_OPS_ADMIN, READONLY_ANALYST, and USER.
-- 3. Creates the immutable structured public.admin_audit_logs table.
-- 4. Creates public.feature_flags and public.platform_incidents tables.
-- =============================================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADD MFA COLUMNS TO PROFILES IF MISSING
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'mfa_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'mfa_secret') THEN
        ALTER TABLE public.profiles ADD COLUMN mfa_secret TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'mfa_enforced') THEN
        ALTER TABLE public.profiles ADD COLUMN mfa_enforced BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 2. UPDATE ROLE CHECK CONSTRAINT ON PROFILES
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_role;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_role CHECK (
    role IN (
        'USER',
        'OWNER',
        'SECURITY_ADMIN',
        'SUPPORT_ADMIN',
        'CONTENT_EDITOR',
        'FINANCE_ADMIN',
        'ASTROLOGY_OPS_ADMIN',
        'READONLY_ANALYST',
        'SUPER_ADMIN',
        'SUPPORT',
        'OPERATIONS',
        'ANALYST'
    )
);

-- 3. CREATE STRUCTURED ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL DEFAULT 'USER',
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    outcome TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
    request_id TEXT,
    reason TEXT,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON public.admin_audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);

-- 4. CREATE FEATURE FLAGS TABLE
CREATE TABLE IF NOT EXISTS public.feature_flags (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT DEFAULT 'system'
);

-- Seed initial safe defaults
INSERT INTO public.feature_flags (key, name, enabled, description, updated_by)
VALUES
    ('enable_phone_otp', 'Phone OTP Authentication', true, 'Allow mobile number login via SMS OTP', 'system'),
    ('enable_google_oauth', 'Google OAuth 2.0', true, 'Enable one-tap Google authentication', 'system'),
    ('enable_numerology_paid', 'Paid Numerology Studio', true, 'Monetize comprehensive 15-chapter name numerology reports', 'system'),
    ('enable_ai_consultation', 'AI Astrologer Personas', true, 'Enable Acharya Devratan, Dr. Sunita, and Pandit Raghavendra consultations', 'system'),
    ('enable_pujas', 'Vedic Puja Bookings', true, 'Allow temple puja bookings and sankalps', 'system'),
    ('maintenance_mode', 'Platform Maintenance Mode', false, 'Fail-closed maintenance gate for emergency migrations', 'system')
ON CONFLICT (key) DO NOTHING;

-- 5. CREATE PLATFORM INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS public.platform_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'P3_MINOR' CHECK (severity IN ('P1_CRITICAL', 'P2_MAJOR', 'P3_MINOR', 'INFO')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')),
    summary TEXT NOT NULL,
    reported_by TEXT NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_incidents_status ON public.platform_incidents(status, created_at DESC);
