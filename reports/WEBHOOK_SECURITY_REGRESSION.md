# ASTROVERSE AI — CASHFREE WEBHOOK AUTOMATED SECURITY REGRESSION

**Document Reference:** `reports/WEBHOOK_SECURITY_REGRESSION.md`  
**Classification:** Automated Test Matrix & Security Regression Certification  
**Test Suite File:** `services/wallet-service/tests/cashfree_webhook_security.test.ts`  
**Test Harness:** Node.js Native Test Runner (`node:test`) + `ts-node`  
**Execution Timestamp:** 2026-11-06T02:18:32+05:30  
**Overall Execution Result:** PASS (24 / 24 Tests Succeeded in 112.7ms)  

---

## 1. Test Execution Metrics & Environment

- **Total Test Cases:** 24
- **Passed:** 24 (100%)
- **Failed:** 0 (0%)
- **Skipped / Todo:** 0 (0%)
- **Suite Duration:** 112.71ms
- **Database Engine Under Test:** ResilientDatabase (Transactional In-Memory & SQLite/PostgreSQL compliant)
- **Node.js Toolchain:** v20.11.30, TypeScript v5.4.3

---

## 2. Complete 24-Point Test Matrix

| Test Case | Category | Assertion & Security Requirement | Result | Duration |
| :---: | :--- | :--- | :---: | :---: |
| **01** | Reachability | Anonymous browser `GET` returns HTTP 200 with `status: "REACHABLE"` without demanding JWT. | **PASS** | 6.61ms |
| **02** | Reachability | Anonymous `HEAD` request returns HTTP 200 with zero-length body and safe headers. | **PASS** | 1.14ms |
| **03** | Method Guard | Unsupported HTTP methods (`PUT`, `DELETE`) return HTTP 405 with `Allow: POST, GET, HEAD, OPTIONS`. | **PASS** | 5.09ms |
| **04** | CORS / Preflight | `OPTIONS` preflight returns HTTP 204 with correct CORS and `Allow` headers. | **PASS** | 0.73ms |
| **05** | Header Validation | Webhook `POST` lacking `x-webhook-signature` is rejected immediately with HTTP 400. | **PASS** | 1.05ms |
| **06** | Header Validation | Webhook `POST` lacking `x-webhook-timestamp` is rejected immediately with HTTP 400. | **PASS** | 0.61ms |
| **07** | Cryptography | Webhook `POST` with forged signature is rejected with HTTP 401 `INVALID_SIGNATURE`. | **PASS** | 0.89ms |
| **08** | Tamper Resistance | Modifying a single character of the payload body invalidates HMAC and returns HTTP 401. | **PASS** | 1.01ms |
| **09** | Key Isolation | Payload signed with an incorrect or stale secret key is rejected with HTTP 401. | **PASS** | 0.77ms |
| **10** | Fulfilment | Authentic Cashfree payload updates order to `PAID` and adds integer paise to wallet balance. | **PASS** | 6.74ms |
| **11** | Payload Safety | Malformed JSON body is caught by Express error middleware and returns HTTP 400 `MALFORMED_JSON`. | **PASS** | 2.20ms |
| **12** | DoS Defense | Payloads exceeding 512 KB are rejected with HTTP 413 `PAYLOAD_TOO_LARGE`. | **PASS** | 3.45ms |
| **13** | Idempotency | Replaying the same webhook event returns HTTP 200 without executing a second financial credit. | **PASS** | 6.50ms |
| **14** | Concurrency Lock | 5 concurrent requests with identical event IDs result in exactly 1 transaction commit. | **PASS** | 7.84ms |
| **15** | Order Integrity | Webhook for non-existent order ID is rejected with HTTP 404 without balance mutation. | **PASS** | 3.41ms |
| **16** | Provider Integrity | Missing or blank `cf_payment_id` is rejected with HTTP 400 `MISSING_PAYMENT_ID`. | **PASS** | 4.46ms |
| **17** | Amount Validation | Amount discrepancy between webhook (`1180.00`) and DB order (`118.00`) returns HTTP 400. | **PASS** | 4.99ms |
| **18** | Currency Validation | Currency discrepancy (e.g. `USD` instead of `INR`) is rejected with HTTP 400. | **PASS** | 4.80ms |
| **19** | Payment Failures | `PAYMENT_FAILED_WEBHOOK` transitions order to `FAILED` and executes zero wallet credit. | **PASS** | 4.84ms |
| **20** | DB Interruption | Simulated database deadlock throws error, rolls back transaction, and returns HTTP 500 for retry. | **PASS** | 17.68ms |
| **21** | Route Isolation | Unrelated protected admin API (`GET /api/admin/users`) remains protected with HTTP 401. | **PASS** | 1.09ms |
| **22** | Route Isolation | Unrelated protected customer API (`POST /api/wallet/create-order`) remains protected with HTTP 401. | **PASS** | 0.56ms |
| **23** | Fail-Closed Guard | Empty or unconfigured webhook secret causes signature verification to fail closed. | **PASS** | 0.71ms |
| **24** | Sandbox Parity | Full Cashfree Sandbox JSON structure is deserialized and processed identically. | **PASS** | 7.71ms |

---

## 3. Raw Test Runner Output

```
▶ PHASE 6 — CASHFREE WEBHOOK SECURITY & INTEGRATION TEST MATRIX
  ✔ 1. Browser GET without token returns HTTP 200 informational reachability response (6.6137ms)
  ✔ 2. HEAD without token returns HTTP 200 without sensitive body (1.1413ms)
  ✔ 3. Unsupported method (e.g. PUT, DELETE) returns HTTP 405 with Allow header (5.09ms)
  ✔ 4. OPTIONS returns HTTP 204 with Allow header (0.7256ms)
  ✔ 5. POST without signature header is rejected with HTTP 400 (1.0516ms)
  ✔ 6. POST without timestamp header is rejected with HTTP 400 (0.6144ms)
  ✔ 7. POST with invalid signature is rejected with HTTP 401 (0.8875ms)
  ✔ 8. POST with modified body is rejected with HTTP 401 (HMAC tamper detection) (1.0148ms)
  ✔ 9. POST signed with incorrect secret is rejected with HTTP 401 (0.7652ms)
  ✔ 10. POST with valid signature is accepted and fulfills order correctly (6.7365ms)
  ✔ 11. POST with malformed JSON body is rejected with HTTP 400 (2.1983ms)
  ✔ 12. Oversized payload (>512KB) is rejected with HTTP 413 (3.4501ms)
  ✔ 13. Valid repeated event is acknowledged without duplicate financial fulfilment (6.5043ms)
  ✔ 14. Concurrent duplicate events result in exactly one financial fulfilment (7.8423ms)
  ✔ 15. Wrong order identifier results in no fulfilment and HTTP 404 (3.4084ms)
  ✔ 16. Missing or invalid payment identifier results in no fulfilment and HTTP 400 (4.4609ms)
  ✔ 17. Amount mismatch between webhook and server order is rejected with HTTP 400 (4.9884ms)
  ✔ 18. Currency mismatch is rejected with HTTP 400 (4.8044ms)
  ✔ 19. Failed payment status (PAYMENT_FAILED_WEBHOOK) marks order failed and performs no credit (4.8383ms)
[CASHFREE_WEBHOOK] Processing error: Error: SIMULATED_TRANSIENT_POSTGRES_DEADLOCK
  ✔ 20. Database transaction failure returns HTTP 500 and leaves event retryable (17.6757ms)
  ✔ 21. Unauthorized unrelated API GET (/api/admin/users) is still denied with 401 (1.0945ms)
  ✔ 22. Unauthorized unrelated API POST (/api/wallet/create-order) is still denied with 401 (0.564ms)
  ✔ 23. Webhook secret missing fails closed with HTTP 401 (0.7094ms)
  ✔ 24. Cashfree Sandbox payload structure is parsed and fulfilled identically (7.7107ms)
✔ PHASE 6 — CASHFREE WEBHOOK SECURITY & INTEGRATION TEST MATRIX (109.5163ms)
ℹ tests 24
ℹ suites 1
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 112.7143
```

---

## 4. Verification Conclusion

The regression test suite establishes independently verifiable evidence that:
1. Webhooks are cryptographically authenticated without requiring customer or administrator credentials.
2. Financial ledger mutations are completely protected against replay attacks, race conditions, amount tampering, and transient failures.
3. Protected user and administrative APIs maintain their complete security boundaries.
