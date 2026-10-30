# ASTROVERSE AI — CASHFREE CONFIGURATION READINESS & INTEGRATION SPECIFICATION

**Document ID:** `AV-CFG-2026-10-30-02`  
**Classification:** Payment Gateway Provider Specification  
**Author:** Principal Engineering Lead & Payment Architect  
**Status:** Architecture Certified / Live Verification Blocked (Pending Credentials)  
**Target Environment:** `https://astroverse-eta.vercel.app/`  

---

## 1. INTEGRATION STATUS

```
========================================================================================
CASHFREE LIVE VERIFICATION BLOCKED — credentials not provided.
========================================================================================
```

In accordance with strict operating instructions, live Cashfree gateway credentials (`CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`) have **not** been supplied or simulated in production. The AstroVerse application has been engineered to be 100% structurally ready for Cashfree Payments, with a safe, predictable, fail-closed state active until valid credentials are provided.

---

## 2. SPECIFICATION CONFORMANCE & API STANDARDS

The implementation in `services/wallet-service/src/cashfree.ts` adheres strictly to the official Cashfree Payments API specifications:

### 2.1 API Versioning
- **Pinned Version:** `2026-01-01` (v6)
- **Header:** `x-api-version: 2026-01-01`
- **Rationale:** Ensures zero breakage from legacy 2025-01-01 schemas while leveraging the latest Cashfree order session management contracts.

### 2.2 Environments & Base URLs
| Environment | Base API URL | Webhook Signature Algorithm |
| :--- | :--- | :--- |
| **Sandbox (Testing)** | `https://sandbox.cashfree.com/pg` | HMAC-SHA256 (Base64) |
| **Production** | `https://api.cashfree.com/pg` | HMAC-SHA256 (Base64) |

Environment selection is controlled server-side via `CASHFREE_ENV` (defaults to `sandbox` in development/test, and `production` when `NODE_ENV === 'production'`).

### 2.3 Authentication Headers
Every server-side request to Cashfree endpoints transmits the required headers:
```http
x-client-id: <CASHFREE_APP_ID>
x-client-secret: <CASHFREE_SECRET_KEY>
x-api-version: 2026-01-01
Content-Type: application/json
```
*Guaranteed Invariant: Credentials are read exclusively on the server and are NEVER exposed to client-side bundles or browser payloads.*

---

## 3. CONFIGURATION DETECTION & INTEGRITY GUARDS

In `services/wallet-service/src/cashfree.ts`, `isCashfreeConfigured()` provides a deterministic check:

```typescript
export function isCashfreeConfigured(): boolean {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  return Boolean(
    appId &&
    secretKey &&
    !appId.includes('YOUR_') &&
    !secretKey.includes('YOUR_') &&
    !appId.includes('placeholder') &&
    !secretKey.includes('placeholder') &&
    appId !== 'dummy_cashfree_app_id'
  );
}
```

### Server Response Behavior:
- **When Configured:** Initiates order creation via `POST /orders`, receives `payment_session_id`, and delivers it to the client for Cashfree Drop-in / Modal checkout.
- **When Unconfigured:** Returns HTTP 503 `PAYMENTS_NOT_CONFIGURED` across all paid checkout routes without attempting network calls or leaking system paths.

---

## 4. ASYNCHRONOUS WEBHOOK SPECIFICATION & TIMING GUARDS

The Cashfree webhook handler is mounted at `POST /api/webhooks/cashfree`.

### 4.1 Cryptographic Signature Verification
Cashfree computes signatures across the concatenated timestamp and raw request body:
$$\text{Signature} = \text{Base64}\Big(\text{HMAC-SHA256}\big(K_{\text{secret}}, \, T_{\text{timestamp}} \mathbin{\Vert} B_{\text{rawBody}}\big)\Big)$$

Implementation in `cashfree.ts`:
```typescript
export function verifyCashfreeWebhookSignature(
  rawBody: string | Buffer,
  timestamp: string,
  signature: string
): boolean {
  if (!isCashfreeConfigured()) return false;
  if (!timestamp || !signature) return false;

  const secretKey = process.env.CASHFREE_SECRET_KEY!.trim();
  const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const signedPayload = timestamp + bodyString;

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('base64');

  try {
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
```

### 4.2 Idempotency & Webhook Deduplication
Every incoming webhook event generates an event idempotency key:
- Uses `x-idempotency-key` header, or
- Format: `${event.type}_${event.data.order.order_id}`, or
- SHA-256 hash of timestamp + raw body.
- Checked against `db.isWebhookEventProcessed(idempotencyKey)`. If duplicate, immediately returns HTTP 200 `{ status: 'ok', alreadyProcessed: true }`.

---

## 5. CLIENT-SIDE WEB CHECKOUT INTEGRATION

The web client integrates Cashfree JS SDK v3 (`https://sdk.cashfree.com/js/v3/cashfree.js`):
```javascript
const cashfree = window.Cashfree({
  mode: (window.CASHFREE_ENV === 'production' ? 'production' : 'sandbox')
});

cashfree.checkout({
  paymentSessionId: orderData.paymentSessionId,
  redirectTarget: '_modal'
}).then(result => {
  if (result.error) {
    showToast(result.error.message || "Payment cancelled or failed.", "error");
  }
  if (result.paymentDetails) {
    verifyAndFulfillOrder(orderData.orderId, result.paymentDetails.paymentMessage);
  }
});
```

---

## 6. PREREQUISITES FOR ACTIVATING CASHFREE IN PRODUCTION

When the human maintainer receives Cashfree Merchant credentials, complete the following steps:

1. **Vercel Project Settings > Environment Variables:**
   - Add `CASHFREE_APP_ID`: Merchant App ID from Cashfree Dashboard.
   - Add `CASHFREE_SECRET_KEY`: Merchant Secret Key from Cashfree Dashboard.
   - Add `CASHFREE_ENV`: Set to `production` (or `sandbox` for staging).
   - Add `CASHFREE_API_VERSION`: Set to `2026-01-01`.
2. **Cashfree Merchant Dashboard Configuration:**
   - Whitelist the production domain: `https://astroverse-eta.vercel.app/`.
   - Register Webhook Endpoint: `https://astroverse-eta.vercel.app/api/webhooks/cashfree`.
   - Select Webhook Events: `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, `REFUND_SUCCESS_WEBHOOK`.
3. **Smoke Verification:**
   - Execute an end-to-end ₹1 or test order to confirm webhook round-trip.
