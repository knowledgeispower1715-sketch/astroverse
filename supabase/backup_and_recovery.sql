-- =============================================================================
-- ASTROVERSE PRODUCTION DATABASE BACKUP, DISASTER RECOVERY & VERIFICATION
-- =============================================================================
-- Standard Operating Procedure for Scheduled Point-in-Time Recovery (PITR),
-- Logical Snapshot Backups, and Data Integrity Restoration Testing.
-- =============================================================================

/*
1. LOGICAL BACKUP PROCEDURE (DAILY AUTOMATED CRON)
--------------------------------------------------------------------------------
Execute from secure administrative bastion / CI runner with pg_dump:

pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exclude-table-data='*.audit_events' \
  --file="astroverse_backup_$(date +%Y%m%d_%H%M%S).dump"

2. SENSITIVE AUDIT LOG RETENTION ARCHIVE (IMMUTABLE WORM COLD STORAGE)
--------------------------------------------------------------------------------
pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --table='public.admin_audit_logs' \
  --file="astroverse_audit_archive_$(date +%Y%m%d_%H%M%S).dump"

3. RESTORATION & INTEGRITY TESTING PROCEDURE (ON STAGING / TEST INSTANCE)
--------------------------------------------------------------------------------
pg_restore \
  --dbname="${STAGING_DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --exit-on-error \
  "astroverse_backup_latest.dump"
*/

-- =============================================================================
-- 4. VERIFICATION SCRIPTS: INTEGRITY SANITY CHECK QUERIES
-- =============================================================================

-- A. Verify table row counts across critical entities
SELECT 'public.profiles' AS table_name, count(*) AS total_rows FROM public.profiles
UNION ALL
SELECT 'public.birth_profiles', count(*) FROM public.birth_profiles
UNION ALL
SELECT 'public.prediction_reports', count(*) FROM public.prediction_reports
UNION ALL
SELECT 'public.saved_items', count(*) FROM public.saved_items
UNION ALL
SELECT 'public.admin_audit_logs', count(*) FROM public.admin_audit_logs;

-- B. Verify zero orphan records (foreign key referential integrity)
SELECT bp.id AS orphan_birth_profile_id
FROM public.birth_profiles bp
LEFT JOIN auth.users u ON u.id = bp.user_id
WHERE u.id IS NULL;

-- C. Verify zero privilege escalation (no non-admin users possessing admin permissions)
SELECT id, display_name, role, account_status
FROM public.profiles
WHERE role IN ('OWNER', 'SUPER_ADMIN', 'SECURITY_ADMIN');

-- D. Verify active RLS policies on all public tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
