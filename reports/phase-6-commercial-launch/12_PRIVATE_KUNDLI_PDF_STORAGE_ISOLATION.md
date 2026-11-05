# 12 — PRIVATE KUNDLI PDF STORAGE ISOLATION & ACCESS GOVERNANCE

**AstroVerse AI Commercial Launch & Production Certification — Phase 6**  
**Classification:** Document Storage Security & Cryptographic Access Isolation  
**Evaluator:** Principal Security Architect & Cloud Storage Engineer  
**Evaluation Date:** 2026-11-05T13:28:00Z  
**Verification Environment:** Production Supabase Storage & Automated Test Suites  

---

## 1. Storage Architecture & Privacy Boundaries

AstroVerse generates confidential, highly detailed astrological documents (Kundli Deep Dive Reports, Mahadasha Forecasts, Matchmaking Synastry, and Annual Solar Returns) containing sensitive personal information (full name, exact date/time/place of birth, astrological charts, and life predictions).

To protect customer privacy in accordance with the Indian Digital Personal Data Protection (DPDP) Act:
1. **Private Bucket Configuration:** All PDF reports are stored exclusively in the private bucket **`kundli-reports`**.
2. **Deterministic Folder Hierarchy:** Objects are organized by tenant:
   `kundli-reports/${userId}/${reportId}.pdf`
3. **Zero Public Access:** Public access is disabled on the bucket. Direct unauthenticated HTTP requests return `HTTP 401 Unauthorized` or `404 Not Found`.

---

## 2. Row Level Security Policies on `storage.objects`

Storage isolation is enforced at the database level by Supabase Storage RLS:

### Read Policy (`storage_owner_read_kundli_reports`)
```sql
CREATE POLICY "Users can only read own kundli reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kundli-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Write Policy (`storage_owner_insert_kundli_reports`)
```sql
CREATE POLICY "Users can only upload own kundli reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kundli-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Delete Policy (`storage_owner_delete_kundli_reports`)
```sql
CREATE POLICY "Users can only delete own kundli reports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kundli-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 3. Ephemeral Signed URL Delivery

When an authorized customer views or downloads their saved report:
1. The client requests a download link via `GET /api/reports/reader/:id`.
2. The server authenticates the session and verifies that `report.userId === req.user.id`.
3. The server generates an ephemeral **Signed URL** via the Supabase Storage SDK with a strict 1-hour expiration:
   `supabase.storage.from('kundli-reports').createSignedUrl(path, 3600);`
4. The client receives the temporary signed token; unauthorized access after token expiration fails automatically.

---

## 4. Empirical Security Test Verification

Verified under `tests/pdf_fixtures.test.ts`, `tests/pdf_quality_regression.test.ts`, and `tests/supabase_security_hardening.test.ts`:
- **Anonymous Listing Probe:** Direct `GET https://nzeutydhfxhjufacqren.supabase.co/storage/v1/object/list/kundli-reports` without authorization returns an empty array `[]`.
- **Cross-Tenant Access Rejection:** Customer A cannot request or retrieve signed URLs for Customer B's reports (`HTTP 403 Forbidden`).
- **Watermark & Integrity:** All generated PDF pages include customer name, generation timestamp, and AstroVerse security watermark to deter unauthorized distribution.
