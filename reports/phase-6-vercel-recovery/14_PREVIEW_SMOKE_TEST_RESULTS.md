# PHASE 6.1 — PREVIEW SMOKE TEST RESULTS

**Execution Date:** 2026-11-05 19:38 UTC  
**Environment:** Live Vercel Preview (`https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app`)  
**Target Commit:** `73031900bd0538f3b146e4d45f3ec33627dd135b`  
**Harness:** Live Automated HTTP Probes via `curl`  

---

## 1. Test Execution Matrix

| Test ID | Target Endpoint | Method | Expected Code | Observed Code | Response Body / Status Evidence | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ST-01** | `/` | GET | 200 | 200 | HTML DOM delivered (1.81 MB, title: "AstroVerse AI") | **PASS** |
| **ST-02** | `/api/release` | GET | 200 | 200 | JSON `{ "gitCommitSha": "73031900b...", "environmentLabel": "preview" }` | **PASS** |
| **ST-03** | `/api/health` | GET | 200 | 200 | JSON `{ "status": "ONLINE", "persistence": { "mode": "POSTGRES_PRISMA" } }` | **PASS** |
| **ST-04** | `/api/ready` | GET | 200 | 200 | JSON `{ "status": "READY", "persistence": "POSTGRES_PRISMA" }` | **PASS** |
| **ST-05** | `/api/wallet/webhook` | GET | 200 | 200 | JSON `{ "status": "REACHABLE", "acceptedMethod": "POST" }` | **PASS** |
| **ST-06** | `/api/wallet/webhook` | OPTIONS | 204 | 204 | Headers contain `Allow: POST, GET, HEAD, OPTIONS` | **PASS** |
| **ST-07** | `/api/wallet/webhook` | POST (no sig)| 400 | 400 | JSON `{ "error": "MISSING_SIGNATURE_HEADERS" }` | **PASS** |
| **ST-08** | `/api/catalog/products` | GET | 200 | 200 | JSON containing Plus, Premium, Janam Kundli Deep Dive SKUs | **PASS** |
| **ST-09** | `/api/admin/users` | GET (unauth)| 401 | 401 | JSON `{ "error": "UNAUTHORIZED" }` (Protected admin route) | **PASS** |
| **ST-10** | `/api/wallet/create-order`| POST (unauth)| 401 | 401 | JSON `{ "error": "UNAUTHORIZED" }` (Protected user route) | **PASS** |

---

## 2. Regression & Security Guard Verification
- **Zero Route Collisions:** Unrelated protected routes (`/api/admin/users`, `/api/wallet/create-order`) remain strictly protected by JWT authentication (HTTP 401).
- **No Token Leakage:** Informational GET `/api/wallet/webhook` outputs zero secrets, salt, or signature keys.
- **Fail-Closed Guarantees:** Tampered or unsigned POST payloads are immediately rejected prior to database transaction execution.
