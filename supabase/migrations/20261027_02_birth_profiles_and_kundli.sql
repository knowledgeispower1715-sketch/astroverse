-- =============================================================================
-- ASTROVERSE SUPABASE MIGRATION 02: BIRTH PROFILES & KUNDLI CALCULATIONS
-- =============================================================================
-- Description: Creates persistent storage for individual user Janam Kundli
-- birth profiles and calculated Vedic astronomical chart state.
-- =============================================================================

-- 1. Birth Profiles Table
CREATE TABLE IF NOT EXISTS public.birth_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_name TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'Self', -- Self, Spouse, Child, Friend, Family
    date_of_birth DATE NOT NULL,
    time_of_birth TEXT, -- e.g. "14:30" (nullable for unknown birth time)
    birth_time_known BOOLEAN NOT NULL DEFAULT true,
    birthplace_name TEXT NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    resolved_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index birth profiles by owner and creation date
CREATE INDEX IF NOT EXISTS idx_birth_profiles_user_id ON public.birth_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_birth_profiles_user_name ON public.birth_profiles(user_id, profile_name);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_birth_profiles_updated_at ON public.birth_profiles;
CREATE TRIGGER set_birth_profiles_updated_at
    BEFORE UPDATE ON public.birth_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. Kundli Calculations Table
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
