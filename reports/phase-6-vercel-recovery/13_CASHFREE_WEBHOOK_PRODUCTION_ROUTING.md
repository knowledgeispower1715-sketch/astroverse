# PHASE 6.1 — CASHFREE WEBHOOK PRODUCTION ROUTING

**Target Endpoint:** `/api/wallet/webhook`  
**Provider:** Cashfree Payments  
**Specification Version:** `2026-01-01`  
**Authentication Standard:** Cryptographic HMAC-SHA256 (`x-webhook-signature`, `x-webhook-timestamp`)  

---

## 1. Webhook Reachability Probe (Browser / Health Check)

Request:
```http
GET /api/wallet/webhook HTTP/1.1
Host: astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app
```

Response:
```http
HTTP/1.1 200 OK
Allow: POST, GET, HEAD, OPTIONS
Access-Control-Allow-Origin: *
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Content-Type: application/json; charset=utf-8

{
  "status": "REACHABLE",
  "endpoint": "cashfree_webhook",
  "acceptedMethod": "POST",
  "authentication": "CASHFREE_SIGNATURE"
}
```

### Analysis:
- Does NOT require any customer or admin JWT.
- Returns explicit reachability metadata informing automated monitors that the endpoint is alive and expects Cashfree signature verification.

---

## 2. CORS Preflight Probe

Request:
```http
OPTIONS /api/wallet/webhook HTTP/1.1
Host: astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app
```

Response:
```http
HTTP/1.1 204 No Content
Allow: POST, GET, HEAD, OPTIONS
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cf-Access-Jwt-Assertion, X-Admin-Assurance-Token, X-Admin-Mfa-Token, x-webhook-signature, x-webhook-timestamp, x-idempotency-key
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

---

## 3. Signature Security Enforcement Probe

Request (Unsigned POST):
```http
POST /api/wallet/webhook HTTP/1.1
Host: astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app
Content-Type: application/json

{"test": 1}
```

Response:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{
  "error": "MISSING_SIGNATURE_HEADERS",
  "message": "x-webhook-signature and x-webhook-timestamp headers are required."
}
```

### Security Proof:
- The endpoint is **not** globally open.
- In the absence of valid Cashfree HMAC signature headers (`x-webhook-signature`, `x-webhook-timestamp`), the request is fail-closed rejected with HTTP 400.
- Customer/admin bearer token authentication is bypassed exclusively for Cashfree signature validation.
