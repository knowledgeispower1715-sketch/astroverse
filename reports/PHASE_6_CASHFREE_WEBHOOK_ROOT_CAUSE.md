# ASTROVERSE AI — CASHFREE WEBHOOK ROOT CAUSE FORENSIC AUDIT
**Classification:** Critical Production Security & Reliability Audit  
**Target Endpoint:** `https://astroverse-eta.vercel.app/api/wallet/webhook`  
**Payment Provider:** Cashfree Payments (API Version: `2026-01-01` / `2025-01-01`)  
**Service:** `services/wallet-service` (Express / Node.js / Prisma)  
**Authorized Branch:** `fix/enterprise-security-and-hardening`  
**PR Status:** PR #1 remains OPEN and UNMERGED  
**Production Integrity:** Strictly Read-Only  

---

## 1. Executive Summary

An external probe on the AstroVerse AI Cashfree webhook endpoint `https://astroverse-eta.vercel.app/api/wallet/webhook` revealed an immediate authentication failure:
- **HTTP GET / HEAD:** Returned `HTTP 401 Unauthorized` with body:
  ```json
  {
    "error": "UNAUTHORIZED",
    "message": "Authentication token required."
  }
  ```
- **HTTP POST:** Returned `HTTP 404 Not Found` with body:
  ```html
  <pre>Cannot POST /api/wallet/webhook</pre>
  ```

Because Cashfree server-to-server callbacks are dispatched over HTTP POST with HMAC-SHA256 headers (`x-webhook-signature`, `x-webhook-timestamp`), requiring a customer/admin Bearer token broke webhook delivery. Furthermore, administrative and health inspection via browser or monitoring GET probes was completely blocked by the 401 error.

This forensic investigation proved that the root cause was not an intentional auth policy, but a combination of **Express parametric route shadowing**, **missing canonical route registration**, and **coupling of inbound signature verification to gateway readiness state**.

---

## 2. Forensic Findings & Root Cause Analysis

### Root Cause 1: Express Parametric Route Shadowing (Line 4218)
In `services/wallet-service/src/server.ts`, the wallet statement endpoint was mounted as:
```typescript
// Line 4218 in services/wallet-service/src/server.ts
app.get('/api/wallet/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user!;
  const { userId } = req.params;
  ...
```
Express matches routes top-to-bottom in the order they are registered.
- The route `/api/wallet/:userId` matches any GET request starting with `/api/wallet/`, capturing `:userId = "webhook"`.
- The `authenticate` middleware is evaluated as the second argument *before* entering the route handler.
- When an administrator, monitoring tool, or browser probes `GET /api/wallet/webhook` without an `Authorization: Bearer <token>` header, `authenticate` intercepts the request and terminates it with `HTTP 401 Unauthorized`:
  ```json
  { "error": "UNAUTHORIZED", "message": "Authentication token required." }
  ```
- Any handler registered after line 4218 was completely unreachable for GET requests to `/api/wallet/webhook`.

### Root Cause 2: Missing Canonical Route Registration for `/api/wallet/webhook`
In the previous codebase, Cashfree webhook handlers were registered thousands of lines down in `server.ts` (at line 7623):
```typescript
// Line 7628 in services/wallet-service/src/server.ts (Legacy)
app.post(['/api/webhooks/cashfree', '/api/cashfree/webhook'], async (req: Request, res: Response) => {
  ...
```
- The route array only listened on `['/api/webhooks/cashfree', '/api/cashfree/webhook']`.
- The path `/api/wallet/webhook` was completely absent from the registered array.
- Consequently, when Cashfree or an operator dispatched `POST /api/wallet/webhook`, Express had no handler registered for that path, returning default `HTTP 404 <pre>Cannot POST /api/wallet/webhook</pre>`.

### Root Cause 3: Inbound Signature Verification Coupled to Outgoing Gateway State
In `services/wallet-service/src/cashfree.ts` line 865:
```typescript
// Legacy implementation in cashfree.ts
export function verifyCashfreeWebhookSignature(rawBody, timestamp, signature) {
  if (!isCashfreeConfigured()) return false;
  ...
}
```
- `isCashfreeConfigured()` checks if the merchant account has valid live credentials that match the runtime environment (`ENVIRONMENT_MISMATCH` check).
- In staging, preview, or testing environments, or when `CASHFREE_ENV` in Vercel is set to `"sandbox"` while using a live webhook secret (or vice-versa), `isCashfreeConfigured()` returns `false`.
- This caused `verifyCashfreeWebhookSignature` to fail closed and reject authentic HMAC-SHA256 signatures, even when the secret key matched the provider's signature perfectly.
- Inbound cryptographic verification only requires the shared secret (`CASHFREE_WEBHOOK_SECRET` or `CASHFREE_SECRET_KEY`), and must never depend on whether the server has outbound gateway checkout capability enabled.

### Root Cause 4: Absence of Safe Reachability Contract for Operators
Standard browsers issue HTTP GET when an administrator or developer clicks a webhook URL in a dashboard. The application lacked a dedicated GET / HEAD reachability diagnostic for `/api/wallet/webhook`, making it impossible to verify endpoint reachability without dispatching synthetic signed POST requests.

---

## 3. Threat Modeling & Scope Verification

| Threat / Vulnerability | Severity | Impact |
|---|---|---|
| Unauthenticated Webhook Processing | Critical | Addressed: Webhook POST strictly authenticates via HMAC-SHA256. |
| Global Authentication Bypass | High | Avoided: Auth middleware was NOT removed or weakened globally. Only the exact webhook route handles signatures. |
| Timing Side-Channel Attacks | Medium | Mitigated: Signature verification uses `crypto.timingSafeEqual`. |
| Replay & Duplicate Fulfillment | Critical | Mitigated: Durable idempotency via `db.claimWebhookEvent` prevents double credit. |
| Denial of Service via Huge Payloads | Medium | Mitigated: Enforced 512 KB payload size limit with HTTP 413. |
| Parameter Tampering (Amount / Currency) | High | Mitigated: Server verifies paid amount and currency against immutable server order snapshot. |

---

## 4. Conclusion

The authentication conflict was purely architectural: route shadowing in Express and an incomplete route array. The fix does not weaken application authentication, but cleanly separates customer/admin Bearer token authentication from Cashfree server-to-server cryptographic HMAC authentication.
