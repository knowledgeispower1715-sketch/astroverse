-- =============================================================================
-- ASTROVERSE SUPABASE MIGRATION 01: PROFILES & AUTH USER TRIGGER
-- =============================================================================
-- Description: Creates the public.profiles table referencing auth.users(id).
-- Includes an idempotent, security-definer trigger function on auth.users INSERT
-- to automatically initialize a profile for both Google OAuth and Email/Password users.
-- =============================================================================

-- 1. Create profiles table if it does not already exist
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

-- Index for status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(account_status);

-- 2. Create updated_at automated trigger function
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

-- 3. Idempotent Profile Initialization Trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    derived_name TEXT;
    derived_avatar TEXT;
BEGIN
    -- Extract display name from metadata or email username
    derived_name := COALESCE(
        NEW.raw_user_meta_data->>'displayName',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'User'
    );

    -- Extract avatar URL if provided by OAuth provider (e.g., Google picture)
    derived_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
    );

    -- Idempotent insert: does not duplicate or overwrite existing profiles
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

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill existing auth.users who do not yet have a profile record
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

-- 5. Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
