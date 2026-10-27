-- =============================================================================
-- ASTROVERSE SUPABASE MASTER SETUP: COMPLETE ALL-IN-ONE SQL SCRIPT
-- =============================================================================
-- Copy and paste this entire script into your Supabase Dashboard:
-- Supabase Dashboard -> Project -> SQL Editor -> New Query -> Run
-- =============================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROFILES TABLE & AUTH TRIGGER
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'USER',
    account_status TEXT NOT NULL DEFAULT 'ACTIVE',
    preferred_language TEXT NOT NULL DEFAULT 'en',
    preferred_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(account_status);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Idempotent Profile Initialization Trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    derived_name TEXT;
    derived_avatar TEXT;
BEGIN
    derived_name := COALESCE(
        NEW.raw_user_meta_data->>'displayName',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'User'
    );

    derived_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
    );

    INSERT INTO public.profiles (id, display_name, avatar_url, created_at, updated_at)
    VALUES (NEW.id, derived_name, derived_avatar, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing auth users
INSERT INTO public.profiles (id, display_name, avatar_url, created_at, updated_at)
SELECT
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'displayName',
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1),
        'User'
    ),
    COALESCE(
        u.raw_user_meta_data->>'avatar_url',
        u.raw_user_meta_data->>'picture',
        NULL
    ),
    u.created_at,
    NOW()
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. BIRTH PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.birth_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_name TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'Self',
    date_of_birth DATE NOT NULL,
    time_of_birth TEXT,
    birth_time_known BOOLEAN NOT NULL DEFAULT true,
    birthplace_name TEXT NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    resolved_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_birth_profiles_user_id ON public.birth_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_birth_profiles_user_name ON public.birth_profiles(user_id, profile_name);

DROP TRIGGER IF EXISTS set_birth_profiles_updated_at ON public.birth_profiles;
CREATE TRIGGER set_birth_profiles_updated_at
    BEFORE UPDATE ON public.birth_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 3. KUNDLI CALCULATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.kundli_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    birth_profile_id UUID REFERENCES public.birth_profiles(id) ON DELETE SET NULL,
    calculation_engine TEXT NOT NULL DEFAULT 'SwissEphemeris_v2.10',
    ayanamsha TEXT NOT NULL DEFAULT 'Lahiri',
    lagna_sign TEXT NOT NULL,
    lagna_degree NUMERIC(6, 2) NOT NULL,
    moon_sign TEXT NOT NULL,
    sun_sign TEXT NOT NULL,
    nakshatra TEXT NOT NULL,
    pada INT NOT NULL,
    full_payload JSONB NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kundli_calc_user_id ON public.kundli_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_kundli_calc_profile_id ON public.kundli_calculations(birth_profile_id);

-- =============================================================================
-- 4. PREDICTION REPORTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.prediction_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    birth_profile_id UUID REFERENCES public.birth_profiles(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL,
    report_period TEXT,
    report_status TEXT NOT NULL DEFAULT 'COMPLETED',
    report_content JSONB NOT NULL,
    calculation_version TEXT NOT NULL DEFAULT 'Parashari_v2.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_reports_user_type ON public.prediction_reports(user_id, report_type);
CREATE INDEX IF NOT EXISTS idx_prediction_reports_created_at ON public.prediction_reports(user_id, created_at DESC);

-- =============================================================================
-- 5. SAVED ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items(user_id);

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- BIRTH PROFILES
ALTER TABLE public.birth_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own birth profiles" ON public.birth_profiles;
CREATE POLICY "Users can view own birth profiles"
    ON public.birth_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own birth profiles" ON public.birth_profiles;
CREATE POLICY "Users can insert own birth profiles"
    ON public.birth_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own birth profiles" ON public.birth_profiles;
CREATE POLICY "Users can update own birth profiles"
    ON public.birth_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own birth profiles" ON public.birth_profiles;
CREATE POLICY "Users can delete own birth profiles"
    ON public.birth_profiles FOR DELETE USING (auth.uid() = user_id);

-- KUNDLI CALCULATIONS
ALTER TABLE public.kundli_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own kundli calculations" ON public.kundli_calculations;
CREATE POLICY "Users can view own kundli calculations"
    ON public.kundli_calculations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own kundli calculations" ON public.kundli_calculations;
CREATE POLICY "Users can insert own kundli calculations"
    ON public.kundli_calculations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own kundli calculations" ON public.kundli_calculations;
CREATE POLICY "Users can delete own kundli calculations"
    ON public.kundli_calculations FOR DELETE USING (auth.uid() = user_id);

-- PREDICTION REPORTS
ALTER TABLE public.prediction_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own prediction reports" ON public.prediction_reports;
CREATE POLICY "Users can view own prediction reports"
    ON public.prediction_reports FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own prediction reports" ON public.prediction_reports;
CREATE POLICY "Users can insert own prediction reports"
    ON public.prediction_reports FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        (
            birth_profile_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.birth_profiles bp
                WHERE bp.id = birth_profile_id AND bp.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own prediction reports" ON public.prediction_reports;
CREATE POLICY "Users can update own prediction reports"
    ON public.prediction_reports FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own prediction reports" ON public.prediction_reports;
CREATE POLICY "Users can delete own prediction reports"
    ON public.prediction_reports FOR DELETE USING (auth.uid() = user_id);

-- SAVED ITEMS
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved items" ON public.saved_items;
CREATE POLICY "Users can view own saved items"
    ON public.saved_items FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved items" ON public.saved_items;
CREATE POLICY "Users can insert own saved items"
    ON public.saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved items" ON public.saved_items;
CREATE POLICY "Users can update own saved items"
    ON public.saved_items FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;
CREATE POLICY "Users can delete own saved items"
    ON public.saved_items FOR DELETE USING (auth.uid() = user_id);

-- Done!
