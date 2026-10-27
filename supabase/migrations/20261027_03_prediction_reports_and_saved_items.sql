-- =============================================================================
-- ASTROVERSE SUPABASE MIGRATION 03: PREDICTION REPORTS & SAVED ITEMS
-- =============================================================================
-- Description: Creates persistent storage for multi-horizon forecast reports
-- (hourly, daily, weekly, monthly, yearly, Mahadasha) and bookmarked predictions.
-- =============================================================================

-- 1. Prediction Reports Table
CREATE TABLE IF NOT EXISTS public.prediction_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    birth_profile_id UUID REFERENCES public.birth_profiles(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL, -- HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY, MAHADASHA, KUNDLI, NUMEROLOGY
    report_period TEXT,        -- Target date, time window, or dasha phase
    report_status TEXT NOT NULL DEFAULT 'COMPLETED', -- IN_PROGRESS, COMPLETED, ARCHIVED
    report_content JSONB NOT NULL,
    calculation_version TEXT NOT NULL DEFAULT 'Parashari_v2.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_reports_user_type ON public.prediction_reports(user_id, report_type);
CREATE INDEX IF NOT EXISTS idx_prediction_reports_created_at ON public.prediction_reports(user_id, created_at DESC);

-- 2. Saved Items / Bookmarks Table
CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,   -- PREDICTION_SNIPPET, REMEDY, YANTRA, GEMSTONE, HOROSCOPE
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items(user_id);
