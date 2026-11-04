# ASTROVERSE SUPABASE STORAGE SECURITY AUDIT

**Document Classification:** Enterprise Storage & File Security  
**Target Environment:** Supabase Storage (`supabase-byzantine-nest`)  
**Status Code:** PASS (Policies Defined & Guarded)  

---

## 1. Storage Architecture & Bucket Inventory

AstroVerse handles personalized Kundli reports, astrological PDFs, user birth documents, and avatars.

### 1.1 Bucket Security Classification

| Bucket Name | Target Content | Visibility | Max File Size | Allowed MIME Types | RLS Enforced |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `kundli-reports` | Generated Janam Kundli PDFs, charts | **PRIVATE (`public = false`)** | 15 MB | `application/pdf`, `application/json` | **YES** |
| `customer-documents` | User birth certificates, palm images | **PRIVATE (`public = false`)** | 10 MB | `application/pdf`, `image/jpeg`, `image/png` | **YES** |
| `avatars` | Profile pictures | **PUBLIC (`public = true`)** | 2 MB | `image/jpeg`, `image/png`, `image/webp` | **YES** |

---

## 2. Row Level Security Policies for `storage.objects`

All private bucket operations enforce cryptographic ownership matching against `auth.uid()`:

### 2.1 Private Customer Reports Read Isolation
```sql
CREATE POLICY "Customers can read own reports in storage"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'kundli-reports' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );
```
- A customer logged in with `auth.uid() = 'usr_001'` can only access objects whose storage path begins with `usr_001/`.
- Direct unauthenticated URL access returns HTTP 403 / 400.
- Signed URLs generated for report downloads are time-bounded to 300 seconds (5 minutes).

### 2.2 Upload Authorization (Folder Scoping)
```sql
CREATE POLICY "Customers can upload own reports to storage"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'kundli-reports' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );
```
- Prevents cross-tenant file overwrites (User A cannot upload files into User B's folder).

### 2.3 Backend Service Role Exemption
```sql
CREATE POLICY "Service role full storage control"
    ON storage.objects FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```
- Server-side background jobs (PDF rendering worker in `kundli-engine` and `wallet-service`) can generate, write, and archive reports seamlessly using the protected `service_role` key.

---

## 3. Storage Adversarial Verification

| Test Scenario | Action Attempted | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| **Anonymous URL Request** | `GET /storage/v1/object/public/kundli-reports/usr_1/report.pdf` | HTTP 400 / 404 (Bucket is private) | **PASS** |
| **Cross-User Download** | User B attempts to read `usr_A/report.pdf` via REST API | HTTP 403 Forbidden (0 rows returned) | **PASS** |
| **Cross-User Upload** | User B attempts to upload `usr_A/malicious.pdf` | HTTP 403 RLS violation | **PASS** |
| **Own Report Access** | User A requests signed URL for `usr_A/kundli.pdf` | Signed token generated; valid for 300s | **PASS** |
| **Service Role PDF Generation**| Backend PDF worker stores generated report | Write succeeds under service_role | **PASS** |
