-- =============================================================================
-- ASTROVERSE SUPABASE MIGRATION 04: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
-- Description: Enforces cryptographic tenant isolation on all tables.
-- Guarantees that Account A cannot read, insert, modify, or delete Account B's
-- birth profiles, kundli calculations, reports, or saved items.
-- =============================================================================

-- =============================================================================
-- 1. BIRTH PROFILES RLS
-- =============================================================================
ALTER TABLE public.birth_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own birth profiles" ON public.birth_profiles;
CREATE POLICY "Users can view own birth profiles"
    ON public.birth_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own birth profiles" ON public.birth_profiles;
CREATE POLICY "Users can insert own birth profiles"
    ON public.birth_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own birth profiles" ON public.birth_profiles;
CREATE POLICY "Users can update own birth profiles"
    ON public.birth_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own birth profiles" ON public.birth_profiles;
CREATE POLICY "Users can delete own birth profiles"
    ON public.birth_profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- 2. KUNDLI CALCULATIONS RLS
-- =============================================================================
ALTER TABLE public.kundli_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own kundli calculations" ON public.kundli_calculations;
CREATE POLICY "Users can view own kundli calculations"
    ON public.kundli_calculations
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own kundli calculations" ON public.kundli_calculations;
CREATE POLICY "Users can insert own kundli calculations"
    ON public.kundli_calculations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own kundli calculations" ON public.kundli_calculations;
CREATE POLICY "Users can delete own kundli calculations"
    ON public.kundli_calculations
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- 3. PREDICTION REPORTS RLS
-- =============================================================================
ALTER TABLE public.prediction_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own prediction reports" ON public.prediction_reports;
CREATE POLICY "Users can view own prediction reports"
    ON public.prediction_reports
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own prediction reports" ON public.prediction_reports;
CREATE POLICY "Users can insert own prediction reports"
    ON public.prediction_reports
    FOR INSERT
    WITH CHECK (
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
    ON public.prediction_reports
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own prediction reports" ON public.prediction_reports;
CREATE POLICY "Users can delete own prediction reports"
    ON public.prediction_reports
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- 4. SAVED ITEMS RLS
-- =============================================================================
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved items" ON public.saved_items;
CREATE POLICY "Users can view own saved items"
    ON public.saved_items
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved items" ON public.saved_items;
CREATE POLICY "Users can insert own saved items"
    ON public.saved_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved items" ON public.saved_items;
CREATE POLICY "Users can update own saved items"
    ON public.saved_items
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;
CREATE POLICY "Users can delete own saved items"
    ON public.saved_items
    FOR DELETE
    USING (auth.uid() = user_id);
