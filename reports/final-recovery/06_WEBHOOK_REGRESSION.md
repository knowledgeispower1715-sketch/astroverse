# ASTROVERSE AI — CASHFREE WEBHOOK SECURITY & ROUTING REGRESSION REPORT

**Report ID:** `AV-REP-WBH-20261106-06`  
**Classification:** Critical Financial Webhook Authentication & Security Matrix  
**Date:** `2026-11-06T16:07:45+05:30`  
**Endpoint:** `POST https://astroverse-eta.vercel.app/api/wallet/webhook`  
**Probe Endpoint:** `GET https://astroverse-eta.vercel.app/api/wallet/webhook`

---

## 1. PREVIOUS WEBHOOK RECOVERY PRESERVATION

### 1.1 The Express Parameter Shadowing Root Cause
The production webhook URL is:
`https://astroverse-eta.vercel.app/api/wallet/webhook`

Previously, requests returned:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication token required."
}
```
* **Root Cause:** In `services/wallet-service/src/server.ts`, a parameterized customer route `app.get('/api/wallet/:userId', authenticate, ...)` was declared before the webhook route. Express matched the string `'webhook'` as `:userId`, subjecting the Cashfree webhook to user JWT authentication middleware.
* **Correction:**
  1. Hoisted `CASHFREE_WEBHOOK_PATHS` (`/api/wallet/webhook`, `/api/webhooks/cashfree`, etc.) to the authoritative Section 5 before `/api/wallet/:userId`.
  2. Implemented reserved subpath guard rejecting any customer ID equal to reserved system keywords (`webhook`, `create-order`, `verify-order`, `balance`).
  3. Added informational probe handler: `GET /api/wallet/webhook` returns HTTP 200 without token:
     ```json
     {
       "status": "REACHABLE",
       "endpoint": "cashfree_webhook",
       "acceptedMethod": "POST",
       "authentication": "CASHFREE_SIGNATURE"
     }
     ```

---

## 2. AUTOMATED SECURITY TEST MATRIX (24/24 PASSING)

From [`services/wallet-service/tests/cashfree_webhook_security.test.ts`](file:///e:/rea/services/wallet-service/tests/cashfree_webhook_security.test.ts):

| Test Case | Scenario | Expected | Result |
|---|---|---|---|
| **Test 1** | Browser GET without token | HTTP 200 REACHABLE | **PASS** |
| **Test 2** | HEAD without token | HTTP 200 (Headers only) | **PASS** |
| **Test 3** | Unsupported method (PUT/DELETE) | HTTP 405 Method Not Allowed | **PASS** |
| **Test 4** | OPTIONS preflight | HTTP 204 No Content | **PASS** |
| **Test 5** | POST missing signature header | HTTP 400 Bad Request | **PASS** |
| **Test 6** | POST missing timestamp header | HTTP 400 Bad Request | **PASS** |
| **Test 7** | POST with forged signature | HTTP 401 Unauthorized | **PASS** |
| **Test 8** | POST with tampered payload body | HTTP 401 Unauthorized | **PASS** |
| **Test 9** | POST signed with wrong secret | HTTP 401 Unauthorized | **PASS** |
| **Test 10** | Valid Cashfree signed webhook | HTTP 200 & Wallet Credited | **PASS** |
| **Test 11** | Malformed JSON body | HTTP 400 Bad Request | **PASS** |
| **Test 12** | Oversized payload (>512KB) | HTTP 413 Payload Too Large | **PASS** |
| **Test 13** | Duplicate event replay | HTTP 200 (Zero Double-Credit) | **PASS** |
| **Test 14** | Concurrent duplicate deliveries | Exactly 1 Fulfilment | **PASS** |
| **Test 15** | Unknown order identifier | HTTP 404 Order Not Found | **PASS** |
| **Test 16** | Missing payment identifier | HTTP 400 Bad Request | **PASS** |
| **Test 17** | Webhook amount mismatch | HTTP 400 Bad Request | **PASS** |
| **Test 18** | Currency mismatch | HTTP 400 Bad Request | **PASS** |
| **Test 19** | Failed payment webhook | HTTP 200 (Zero Credit) | **PASS** |
| **Test 20** | Transient DB Deadlock | HTTP 500 & Retryable | **PASS** |
| **Test 21** | Unrelated API GET (/api/admin/users) | HTTP 401 Unauthorized | **PASS** |
| **Test 22** | Unrelated API POST (/api/wallet/create-order) | HTTP 401 Unauthorized | **PASS** |
| **Test 23** | Missing server secret | HTTP 401 Fail-Closed | **PASS** |
| **Test 24** | Cashfree Sandbox payload structure | HTTP 200 Exact Parity | **PASS** |

**Verification Status:** 24/24 tests passed (100%).
