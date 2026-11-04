# CUSTOMER STORAGE ISOLATION RESULTS

**Audited Subsystem:** Supabase Storage (`storage.buckets` & `storage.objects`)  
**Buckets Under Scope:**
- `kundli-reports` (Private, 15MB limit)
- `customer-documents` (Private, 10MB limit)
- `avatars` (Public Read, 2MB limit)  
**Access Model:** Owner-isolated directory structure: `<bucket>/<user_id>/<file_name>`  
**Enforcement Engine:** Row Level Security on `storage.objects`

---

## 1. Storage Security Threat Modeling & Remediation

### Prior Defect:
1. In previous migrations, only `kundli-reports` had partial RLS policies. `customer-documents` was created as private in `storage.buckets` but lacked `storage.objects` RLS policies, leaving its objects either unqueryable or exposed via legacy bucket defaults.
2. Insecure mutations directly inserting into `storage.buckets` without checking active extension presence could conflict with Supabase Storage storage-api metadata.
3. Lack of explicit `UPDATE` and `DELETE` policies allowed potential stale file retention or orphaned customer data during GDPR erasure requests.

### Remediation:
1. Idempotent bucket configuration guarded by `IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets')`.
2. Strict bucket parameters:
   - `kundli-reports`: `public = false`, limit 15,728,640 bytes, MIME types `['application/pdf', 'application/json']`.
   - `customer-documents`: `public = false`, limit 10,485,760 bytes, MIME types `['application/pdf', 'image/jpeg', 'image/png']`.
   - `avatars`: `public = true`, limit 2,097,152 bytes, MIME types `['image/jpeg', 'image/png', 'image/webp']`.
3. Comprehensive CRUD owner policies on `storage.objects`:
   - Read (`SELECT`): `(auth.uid())::text = (storage.foldername(name))[1]`
   - Upload (`INSERT`): `(auth.uid())::text = (storage.foldername(name))[1]`
   - Update (`UPDATE`): `(auth.uid())::text = (storage.foldername(name))[1]`
   - Delete (`DELETE`): `(auth.uid())::text = (storage.foldername(name))[1]`

---

## 2. Adversarial Test Matrix

| Test Scenario | Caller Identity | Target Path | Expected Outcome | Observed Outcome | Status |
|---|---|---|---|---|---|
| User A reads User A report | `auth.uid() = UserA` | `kundli-reports/UserA/chart.pdf` | HTTP 200 / Query returns object | RLS permits read | **PASS** |
| User B reads User A report | `auth.uid() = UserB` | `kundli-reports/UserA/chart.pdf` | HTTP 403 / Query returns 0 rows | RLS isolates object | **PASS** |
| Anon reads User A report | Anonymous / unauth | `kundli-reports/UserA/chart.pdf` | HTTP 401 / 403 / Access Denied | RLS blocks anon | **PASS** |
| User B writes to User A folder | `auth.uid() = UserB` | `kundli-reports/UserA/malicious.pdf`| HTTP 403 / WITH CHECK violation | Policy blocks insert | **PASS** |
| User A updates User A report | `auth.uid() = UserA` | `kundli-reports/UserA/chart.pdf` | HTTP 200 / Mutation allowed | RLS permits update | **PASS** |
| User B deletes User A report | `auth.uid() = UserB` | `kundli-reports/UserA/chart.pdf` | HTTP 403 / 0 rows deleted | RLS blocks delete | **PASS** |
| Backend service_role management| `service_role` | `kundli-reports/UserA/chart.pdf` | Full administrative control | Allowed via bypass | **PASS** |
| Public views avatar | Anonymous | `avatars/UserA/profile.jpg` | HTTP 200 / Public download | Allowed | **PASS** |
| User B overwrites User A avatar| `auth.uid() = UserB` | `avatars/UserA/profile.jpg` | HTTP 403 / WITH CHECK violation | Policy blocks tamper | **PASS** |

---

## 3. Signed URL Generation Protocol

For private customer reports (`kundli-reports` and `customer-documents`), AstroVerse generates time-bounded, cryptographically signed URLs via the backend service:
- Default TTL: 300 seconds (5 minutes).
- Direct unauthenticated URL access returns HTTP 400 `{"statusCode":"400","error":"Error","message":"Invalid token"}`.
