# ASTROVERSE AI — PREVIEW & REMOTE ENDPOINT VERIFICATION
**Classification:** Deployment Environment & Remote Probe Evidence  
**Target URL:** `https://astroverse-eta.vercel.app/api/wallet/webhook`  
**Deployment Platform:** Vercel Serverless (Node.js 20.x/25.x / Next.js Gateway)  
**PR Status:** PR #1 remains OPEN and UNMERGED  
**Production Integrity:** Strictly Read-Only  

---

## 1. Live Deployment Baseline Audit

Live probes were conducted against the deployed production endpoint `https://astroverse-eta.vercel.app` to record the unpatched state before deployment of this PR:

### Probe 1: GET `https://astroverse-eta.vercel.app/api/wallet/webhook`
- **Observed Status:** `HTTP 401 Unauthorized`
- **Observed Response Headers:**
  - `Content-Type: application/json; charset=utf-8`
  - `Server: Vercel`
- **Observed Body:**
  ```json
  {
    "error": "UNAUTHORIZED",
    "message": "Authentication token required."
  }
  ```
- **Finding:** Confirms that in the current deployed production build, GET requests hit `app.get('/api/wallet/:userId')` and require a customer session token.

### Probe 2: HEAD `https://astroverse-eta.vercel.app/api/wallet/webhook`
- **Observed Status:** `HTTP 401 Unauthorized`
- **Observed Body:** `""` (Empty)
- **Finding:** Proves that HEAD requests fail with 401.

### Probe 3: POST `https://astroverse-eta.vercel.app/api/wallet/webhook`
- **Observed Status:** `HTTP 404 Not Found`
- **Observed Body:**
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="utf-8"><title>Error</title></head>
  <body><pre>Cannot POST /api/wallet/webhook</pre></body>
  </html>
  ```
- **Finding:** Confirms that POST is unmounted on the deployed production server.

### Probe 4: GET `https://astroverse-eta.vercel.app/api/release`
- **Observed Status:** `HTTP 200 OK`
- **Observed Body:**
  ```json
  {
    "application": "astroverse-ai",
    "version": "2.5.0",
    "gitCommitSha": "296b759fcbcaad33713e32df17d94a7f8664c1e0",
    "buildTimestamp": "2026-11-04T18:50:00Z",
    "environmentLabel": "production",
    "schemaVersion": "20261104_07"
  }
  ```

---

## 2. Remediated Local & Preview Verification Evidence

Following the architectural remediation on branch `fix/enterprise-security-and-hardening` (Commit: `97a59c410`), the endpoint behavior was certified under local and isolated preview conditions:

### Remediated Probe 1: GET `/api/wallet/webhook`
- **Status:** `HTTP 200 OK`
- **Body:**
  ```json
  {
    "status": "REACHABLE",
    "endpoint": "cashfree_webhook",
    "acceptedMethod": "POST",
    "authentication": "CASHFREE_SIGNATURE"
  }
  ```
- **Security Check:** Zero credentials, secrets, or internal database metadata exposed.

### Remediated Probe 2: HEAD `/api/wallet/webhook`
- **Status:** `HTTP 200 OK`
- **Body:** `""` (Zero bytes).

### Remediated Probe 3: OPTIONS `/api/wallet/webhook`
- **Status:** `HTTP 204 No Content`
- **Headers:** `Allow: POST, GET, HEAD, OPTIONS`

### Remediated Probe 4: PUT / DELETE `/api/wallet/webhook`
- **Status:** `HTTP 405 Method Not Allowed`
- **Headers:** `Allow: POST, GET, HEAD, OPTIONS`
- **Body:**
  ```json
  {
    "error": "METHOD_NOT_ALLOWED",
    "message": "Only POST (for webhooks), GET (for reachability), HEAD, and OPTIONS methods are allowed."
  }
  ```

### Remediated Probe 5: POST without Signatures
- **Status:** `HTTP 400 Bad Request`
- **Body:**
  ```json
  {
    "error": "MISSING_SIGNATURE_HEADERS",
    "message": "x-webhook-signature and x-webhook-timestamp headers are required."
  }
  ```

### Remediated Probe 6: POST with Forged / Invalid Signature
- **Status:** `HTTP 401 Unauthorized`
- **Body:**
  ```json
  {
    "error": "INVALID_SIGNATURE",
    "message": "Cashfree webhook signature verification failed."
  }
  ```

### Remediated Probe 7: POST with Valid Authentic Signature
- **Status:** `HTTP 200 OK`
- **Body:**
  ```json
  {
    "status": "ok",
    "received": true,
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "message": "Cashfree webhook event processed successfully.",
    "event": "PAYMENT_SUCCESS_WEBHOOK",
    "processed": true,
    "idempotencyKey": "wh_test_1793868358415"
  }
  ```

### Remediated Probe 8: Duplicate Replay
- **Status:** `HTTP 200 OK`
- **Body:**
  ```json
  {
    "status": "ok",
    "alreadyProcessed": true,
    "message": "Cashfree webhook event was already processed or is actively being processed idempotently.",
    "processingStatus": "PROCESSED"
  }
  ```
- **Financial Integrity:** Customer wallet credited exactly once.
