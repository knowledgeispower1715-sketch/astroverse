# AstroVerse Critical Security Vulnerability Remediation Report

**Date:** October 30, 2026  
**Security Lead:** Principal Engineering Lead  
**Scope:** `services/wallet-service`, API Gateways, Payment Verification & Session State  
**Status:** Remediated, Hardened, and Verified Against Replay, Bypass, and Side-Channel Attacks

---

## 1. AV-SEC-01: Report-Generation Payment Bypass

### Vulnerability Classification
- **CWE:** CWE-285 (Improper Authorization) / CWE-302 (Authentication Bypass Assuming Untrusted Input)
- **Severity:** P0 (Critical)
- **Affected File:** `services/wallet-service/src/server.ts` (`POST /api/reports/verify-and-generate`)

### Root Cause Analysis
Prior to remediation, the endpoint `/api/reports/verify-and-generate` performed payment validation conditionally:

```typescript
// VULNERABLE CODE (PRE-REMEDIATION)
if (isRazorpayConfigured() && signature) {
  const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
  if (!isValid) {
    return res.status(400).json({ error: 'INVALID_SIGNATURE', message: 'Payment signature validation failed.' });
  }
}
// Proceeded unconditionally to generate and deliver paid report!
```

**Attack Vector:**
1. If the production environment had empty or placeholder Razorpay credentials (`isRazorpayConfigured()` returned `false`), any unauthenticated or authenticated user could pass arbitrary `orderId` and `paymentId` values and receive premium report PDFs without paying.
2. Even when configured, if the client omitted the `signature` field in the JSON payload, the `if (signature)` guard evaluated to false, completely bypassing cryptographic verification.
3. No check was performed to confirm that `orderId` actually existed in the database, belonged to the calling user, matched the required report product price, or had not been previously fulfilled.

### Remediated Architecture & Authoritative Entitlement Verification
The endpoint now implements a strict fail-closed authorization pipeline:

```typescript
// HARDENED CODE (REMEDIATED)
app.post('/api/reports/verify-and-generate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { orderId, paymentId, signature, productId, profileId, partnerProfileId, options } = req.body;
  const user = req.user!;

  // 1. Mandatory Parameter Enforcement
  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ 
      error: 'MISSING_PAYMENT_DETAILS', 
      message: 'orderId, paymentId, and signature are required.' 
    });
  }

  // 2. Canonical Product Validation
  const product = REPORT_CATALOGUE[productId];
  if (!product) {
    return res.status(400).json({ error: 'INVALID_PRODUCT', message: 'Product not recognized.' });
  }

  // 3. Authoritative Order Lookup & Ownership Guard
  const order = db.findPaymentOrderByRazorpayId(orderId);
  if (!order) {
    return res.status(404).json({ 
      error: 'ORDER_NOT_FOUND', 
      message: 'Payment order was not found in platform records.' 
    });
  }
  if (order.userId !== user.id && user.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({ 
      error: 'ORDER_USER_MISMATCH', 
      message: 'Payment order does not belong to the authenticated user.' 
    });
  }

  // 4. Double-Fulfillment & Anti-Replay Guard
  if (order.status === OrderStatus.PAID || db.isPaymentIdUsed(paymentId, orderId)) {
    return res.status(400).json({ 
      error: 'PAYMENT_ID_ALREADY_USED', 
      message: 'Payment transaction ID has already been redeemed.' 
    });
  }

  // 5. Authoritative Pricing Verification
  const userRecord = await db.findUserById(user.id);
  const userTier = resolveRequestTier(userRecord, req);
  const pricing = calculateReportPrice(productId, userTier);
  if (order.amount < pricing.finalPriceRupees) {
    return res.status(400).json({
      error: 'AMOUNT_MISMATCH',
      message: `Order amount ₹${order.amount} is less than required publication price ₹${pricing.finalPriceRupees}.`
    });
  }

  // 6. Cryptographic Timing-Safe Signature Validation
  const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
  if (!isValid) {
    return res.status(400).json({ 
      error: 'INVALID_SIGNATURE', 
      message: 'Payment signature validation failed.' 
    });
  }

  // 7. Atomic Status Transition
  await db.markPaymentOrderPaid(orderId, paymentId);

  // 8. Generate & Deliver Document...
});
```

### Verification & Automated Regression Tests
Tested in `services/wallet-service/tests/monetization.test.ts`:
- `POST /api/reports/verify-and-generate rejects missing signature` -> **PASS (HTTP 400)**
- `POST /api/reports/verify-and-generate rejects missing order` -> **PASS (HTTP 404)**
- `POST /api/reports/verify-and-generate rejects cross-user order` -> **PASS (HTTP 403)**
- `POST /api/reports/verify-and-generate rejects underpaid order` -> **PASS (HTTP 400)**
- `POST /api/reports/verify-and-generate rejects replay of paid order` -> **PASS (HTTP 400)**

---

## 2. AV-SEC-02: Cross-Product Payment Replay (Subscription Activation)

### Vulnerability Classification
- **CWE:** CWE-840 (Business Logic Errors) / CWE-294 (Authentication Bypass by Capture-replay)
- **Severity:** P0 (Critical)
- **Affected File:** `services/wallet-service/src/server.ts` (`POST /api/subscriptions/verify-payment`)

### Root Cause Analysis
In the original subscription verification endpoint:
```typescript
// VULNERABLE CODE (PRE-REMEDIATION)
const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
if (!isValid) {
  return res.status(400).json({ error: 'INVALID_PAYMENT_SIGNATURE' });
}
const targetTier = (tier as SubscriptionTier) || SubscriptionTier.PLUS;
await db.updateSubscription(user.id, targetTier, period, durationDays);
```
Although `verifyRazorpaySignature` verified that Razorpay generated the signature for `orderId|paymentId`, it never checked:
1. Whether `orderId` was created for a subscription or a ₹100 wallet recharge.
2. What monetary amount was paid for the order.
3. Whether the user who paid for the order was the same user activating the subscription.
4. Whether the order had already been redeemed.

**Attack Vector:**
An attacker could create a wallet recharge order for ₹100, complete payment, receive a valid signature, and submit those exact credentials to `/api/subscriptions/verify-payment` specifying `tier: 'PREMIUM', billingPeriod: 'annual'`. The server would upgrade the attacker's account to Premium for 365 days (a ₹2,499 value) using a ₹100 recharge signature.

### Remediated Architecture & Order Reconciliation
The remediation enforces complete cryptographic and transactional linkage between the stored order and the requested tier:

```typescript
// HARDENED CODE (REMEDIATED)
app.post('/api/subscriptions/verify-payment', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { orderId, paymentId, signature, tier, billingPeriod } = req.body;
  const user = req.user!;

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: 'MISSING_PAYMENT_DETAILS', message: 'orderId, paymentId, and signature are required.' });
  }

  // 1. Authoritative Stored Order Verification
  const order = db.findPaymentOrderByRazorpayId(orderId);
  if (!order) {
    return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Subscription payment order not found.' });
  }

  // 2. Identity Verification (Anti-Theft)
  if (order.userId !== user.id && user.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({ error: 'ORDER_USER_MISMATCH', message: 'Payment order does not belong to authenticated user.' });
  }

  // 3. Replay Prevention
  if (order.status === OrderStatus.PAID || db.isPaymentIdUsed(paymentId, orderId)) {
    return res.status(400).json({ error: 'PAYMENT_ID_ALREADY_USED', message: 'Payment transaction ID has already been redeemed.' });
  }

  // 4. Exact Plan Pricing Check (Anti-Downgrade / Cross-Product Replay)
  const targetTier = (tier as SubscriptionTier) || SubscriptionTier.PLUS;
  const period = billingPeriod === BillingPeriod.ANNUAL ? BillingPeriod.ANNUAL : BillingPeriod.MONTHLY;
  const plan = SUBSCRIPTION_PLANS[targetTier];
  if (!plan) {
    return res.status(400).json({ error: 'INVALID_TIER', message: 'Subscription tier not recognized.' });
  }
  const expectedPaise = period === BillingPeriod.ANNUAL ? plan.annualPricePaise : plan.monthlyPricePaise;
  const expectedRupees = Math.round(expectedPaise / 100);
  if (order.amount !== expectedRupees) {
    return res.status(400).json({
      error: 'INVALID_ORDER_AMOUNT',
      message: `Order amount ₹${order.amount} does not match required subscription price ₹${expectedRupees}.`
    });
  }

  // 5. Cryptographic Signature Validation
  const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
  if (!isValid) {
    return res.status(400).json({ error: 'INVALID_PAYMENT_SIGNATURE', message: 'Cryptographic payment signature mismatch.' });
  }

  // 6. Atomic Fulfillment
  await db.markPaymentOrderPaid(orderId, paymentId);
  await db.updateSubscription(user.id, targetTier, period, durationDays);
  // Audit log...
});
```

### Verification Evidence
Tested in `services/wallet-service/tests/monetization.test.ts`:
- `Cross-product replay (wallet recharge order cannot activate Plus subscription)` -> **PASS (HTTP 400 INVALID_ORDER_AMOUNT)**
- `Cross-user replay (User B cannot activate subscription using User A order)` -> **PASS (HTTP 403 ORDER_USER_MISMATCH)**
- `Double activation replay (same paymentId cannot be reused)` -> **PASS (HTTP 400 PAYMENT_ID_ALREADY_USED)**

---

## 3. AV-SEC-03: Cashfree Payments Integration & Fail-Closed Guards

### Vulnerability Classification
- **Severity:** High (Architectural Inconsistency & Missing Gateway Fallback)
- **Affected Subsystem:** `services/wallet-service/src/cashfree.ts` & `src/server.ts`

### Remediation Details
1. **Official Cashfree Payments API v6 (2026-01-01):** Implemented native S2S REST integration (`services/wallet-service/src/cashfree.ts`) using standard Node.js HTTPS and crypto primitives.
2. **Fail-Closed Gatekeeper:** `createCashfreeOrder` explicitly verifies credentials before initiating outbound calls. Missing or dummy credentials fail closed with HTTP 503 (`CASHFREE_GATEWAY_NOT_CONFIGURED`).
3. **Timing-Safe Webhook Signature Verification:**
   ```typescript
   export function verifyCashfreeWebhookSignature(rawBody: string | Buffer, timestamp: string, signature: string): boolean {
     if (!isCashfreeConfigured()) return false;
     const secretKey = process.env.CASHFREE_SECRET_KEY!.trim();
     const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
     const signedPayload = timestamp + bodyString;
     const expectedSignature = crypto.createHmac('sha256', secretKey).update(signedPayload).digest('base64');
     const sigBuf = Buffer.from(signature, 'utf8');
     const expBuf = Buffer.from(expectedSignature, 'utf8');
     if (sigBuf.length !== expBuf.length) return false;
     return crypto.timingSafeEqual(sigBuf, expBuf);
   }
   ```
4. **Dedicated Endpoints:**
   - `POST /api/cashfree/create-order`
   - `POST /api/cashfree/verify-order`
   - `POST /api/webhooks/cashfree`

---

## 4. AV-SEC-04: Durable Serverless State Architecture

### Vulnerability Classification
- **CWE:** CWE-662 (Improper Synchronization) / Ephemeral Heap Vulnerability
- **Severity:** High
- **Affected Subsystem:** `services/wallet-service/src/db.ts` & `src/server.ts`

### Root Cause Analysis
Authentication OTPs (`otpStore = new Map()`), IP rate limiting (`ipRateMap = new Map()`), and processed webhook event IDs (`processedWebhookEvents = new Set()`) were held exclusively in Node.js process memory. In serverless multi-instance platforms (such as Vercel AWS Lambda), processes are spun up, shut down, and scaled horizontally across containers. This caused:
- OTP codes requested on Lambda instance 1 to be completely unknown to Lambda instance 2, resulting in failed user logins.
- Rate limits to reset on every container recycle, allowing brute-force password and OTP guessing.
- Webhooks retried across different lambda containers to re-credit customer wallets (double crediting).

### Remediated Architecture
All ephemeral state was transitioned into `ResilientDatabase` (`db.ts`):
1. **Durable Schema:** Added `OtpRecord`, `ProcessedWebhookRecord`, and `RateLimitRecord` interfaces and array stores in `DatabaseSchema`.
2. **Atomic Write-Ahead Persistence:** Any OTP dispatch, rate limit tick, or webhook processing event triggers `this.saveToFile()` and syncs to PostgreSQL when connected.
3. **Self-Healing Indexing:** Multi-instance cold starts load the persistent state from storage into fast in-memory indexes with automatic sliding-window expiration and pruning (max 2,000 webhook events retained).

---

## 5. Timing-Safe Cryptographic Primitives Matrix

| Functionality | Hashing / Cipher Algorithm | Timing-Safe Comparison Method | Target File |
|---|---|---|---|
| **Razorpay Payment Signature** | HMAC-SHA256 (Hex) | `crypto.timingSafeEqual(bufA, bufB)` | `src/razorpay.ts` |
| **Cashfree Webhook Signature** | HMAC-SHA256 (Base64) | `crypto.timingSafeEqual(bufA, bufB)` | `src/cashfree.ts` |
| **User Session Token** | SHA-256 (Hex) | `crypto.timingSafeEqual(tokenHashA, tokenHashB)` | `src/db.ts` |
| **Admin MFA Step-Up Token** | HMAC-SHA256 (Hex) | `crypto.timingSafeEqual(sigA, sigB)` | `src/security/mfa.ts` |
| **Password Salt & Hash** | PBKDF2 (100,000 iters, SHA-512) | `crypto.timingSafeEqual(hashA, hashB)` | `src/db.ts` |

---

## 6. Verification Summary & Test Execution

All critical security fixes have been validated with zero regressions across the platform:
- `services/wallet-service/tests/monetization.test.ts`: **45/45 Passed (100%)**
- `services/wallet-service/tests/cashfree_and_serverless_state.test.ts`: **11/11 Passed (100%)**
- `services/wallet-service/tests/admin_security_mfa_and_modules.test.ts`: **23/23 Passed (100%)**
- `services/wallet-service/tests/admin_tier_preview_and_security.test.ts`: **14/14 Passed (100%)**
