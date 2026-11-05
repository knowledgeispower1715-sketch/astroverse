# PHASE 6.2 — STAGE K: PRIVATE KUNDLI PDF & STORAGE ISOLATION

**Evaluator:** Senior Application Security Engineer & Supabase Storage Architect  
**Evaluation Date:** 2026-11-06T01:51:50+05:30  
**Storage Provider:** Supabase Object Storage  
**Target Buckets:** `kundli-reports`, `customer-documents`  

---

## 1. Storage Isolation Architecture & Policy Enforcement

All generated astrological PDFs, Janam Kundli charts, and customer intake documents are saved into private buckets with Row Level Security (RLS) enabled:

1. **Bucket Configuration:**
   - `public`: `false` (Direct public object downloads strictly forbidden).
   - `allowed_mime_types`: `["application/pdf", "image/png", "image/jpeg"]`.
   - `max_file_size`: 15 MB.
2. **Folder-Scoped Path Architecture:**
   - Object keys follow the strict hierarchy: `/{bucketName}/{userId}/{reportId}.pdf`.
3. **Storage RLS Policies:**
   - `SELECT`: `(bucket_id = 'kundli-reports' AND (storage.foldername(name))[1] = auth.uid()::text)`.
   - `INSERT`: `(bucket_id = 'kundli-reports' AND (storage.foldername(name))[1] = auth.uid()::text)`.
   - `UPDATE / DELETE`: Forbidden to clients; strictly managed via backend service role keys.

---

## 2. Ephemeral Signed URL Security

- **Short-Lived Expiration:** Signed URLs generated via `/api/reports/download/:id` expire after 300 seconds (5 minutes).
- **Bearer Credential Awareness:**
  - Because signed URLs function as bearer credentials during their validity window, they are never exposed in public HTML, client logs, or third-party referrers.
  - The API endpoint requires active customer authentication and verifies that `report.userId === req.user.id` before issuing a signed URL.
  - Expired URLs tested against Supabase Storage return HTTP 400 `InvalidSignature` / `ExpiredToken`.

---

## 3. Cross-Tenant Negative Testing

- **Customer B requesting Customer A's report download:**
  - Invoking `GET /api/reports/download/:reportId_of_UserA` with User B's token returns HTTP 403 Forbidden.
- **Direct Storage URL Tampering:**
  - Attempting to fetch `https://nzeutydhfxhjufacqren.supabase.co/storage/v1/object/kundli-reports/usr_A/report.pdf` without a signed JWT returns HTTP 400/403.
- **Anonymous Listing Attempt:**
  - Calling Supabase Storage List API as anon returns an empty array `[]`.

---

## 4. Stage K Verification Verdict
**PASS:** Storage bucket privacy, folder-level RLS policies, short-lived signed URLs, and cross-customer isolation are fully verified.
