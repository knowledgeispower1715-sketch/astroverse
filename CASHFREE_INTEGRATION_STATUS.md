# Cashfree Payment Gateway Integration Status & Operational Runbook

**Date:** October 30, 2026  
**Lead:** Principal Engineering Lead  
**Scope:** Payment Infrastructure, Webhook Deduplication, Cashfree PG API v6  
**Status:** Implementation Complete, Tested & Hardened Locally; Awaiting Production Key Provisioning

---

## 1. Integration Overview & Architecture

AstroVerse is migrating from legacy Razorpay payment flows to **Cashfree Payments** as its primary payment service provider. The integration is implemented as a server-authoritative Server-to-Server (S2S) architecture following official Cashfree PG API specifications (`2026-01-01`).

### Core Integration Components
- **`services/wallet-service/src/cashfree.ts`**: Pure TypeScript Cashfree PG v6 client implementing order creation, server-authoritative status polling, and HMAC-SHA256 webhook signature verification.
- **`services/wallet-service/src/server.ts`**: Dedicated Cashfree endpoints:
  - `POST /api/cashfree/create-order`
  - `POST /api/cashfree/verify-order`
  - `POST /api/webhooks/cashfree`
- **`services/wallet-service/src/db.ts`**: Database order model supporting multi-gateway order records (`gateway: 'CASHFREE' | 'RAZORPAY'`, `cfOrderId`, `cfPaymentSessionId`).
- **`services/wallet-service/tests/cashfree_and_serverless_state.test.ts`**: Automated test suite validating fail-closed behavior, signature math, and webhook deduplication.

---

## 2. API Contract & Endpoint Details

### 2.1 Order Creation (`POST /api/cashfree/create-order`)
- **Authentication:** Required (`Bearer <sessionToken>`)
- **Payload:**
  ```json
  {
    "amount": 249,
    "productType": "REPORT",
    "productId": "report_janam_kundli_deep_dive",
    "returnUrl": "https://astroverse-eta.vercel.app/billing/return"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "orderId": "cf_ord_1793314000000_a1b2c3d4",
    "cfOrderId": "2149460581",
    "paymentSessionId": "session_xxx...",
    "amount": 249.00,
    "currency": "INR"
  }
  ```
- **Fail-Closed Enforcement:** If `CASHFREE_APP_ID` or `CASHFREE_SECRET_KEY` are not set or contain dummy placeholders, returns HTTP 503 (`CASHFREE_GATEWAY_NOT_CONFIGURED`).

### 2.2 S2S Order Verification (`POST /api/cashfree/verify-order`)
- **Authentication:** Required
- **Payload:** `{ "orderId": "cf_ord_1793314000000_a1b2c3d4" }`
- **Behavior:**
  1. Retrieves stored order and enforces user ownership (`order.userId === req.user.id`).
  2. Queries Cashfree authoritative API (`GET /pg/orders/{order_id}`).
  3. Verifies `order_status === 'PAID'` and exact monetary match.
  4. Fulfills the order idempotently (credits wallet or unlocks report).
  5. If already paid, returns 200 with `alreadyProcessed: true`.

### 2.3 Webhook Event Processing (`POST /api/webhooks/cashfree`)
- **Headers Verified:** `x-webhook-signature`, `x-webhook-timestamp`, `x-idempotency-key`
- **Signature Verification Algorithm:**
  ```
  signedPayload = timestamp + rawBody
  expectedSignature = Base64Encode(HMAC-SHA256(signedPayload, CASHFREE_SECRET_KEY))
  crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ```
- **Idempotent Deduplication:** Every webhook event is checked against `db.isWebhookEventProcessed(idempotencyKey)`. Processed events return HTTP 200 immediately without duplicate crediting.

---

## 3. Coexistence & Dual Gateway Strategy

To guarantee continuous business operations and prevent payment disruption:
1. **Backward Compatibility:** Legacy Razorpay endpoints (`/api/wallet/create-order`, `/api/wallet/verify-payment`, `/api/subscriptions/verify-payment`, `/api/reports/verify-and-generate`, `/api/webhooks/razorpay`) remain functional and hardened against replay attacks.
2. **Runtime Gateway Discovery:** `GET /api/config` and `GET /api/billing/config` broadcast the availability of both gateways (`isLiveGateway` for Razorpay, `isCashfreeConfigured` for Cashfree).
3. **Fail-Safe Client Transition:** The frontend client checks `isCashfreeConfigured`. When true, it initializes the Cashfree JS Drop-in SDK; when false, it gracefully falls back or guides the user appropriately.

---

## 4. Production Go-Live Prerequisites

Before declaring Cashfree production-ready, maintainers must complete these required steps:

### Step 1: Environment Variable Provisioning
Set the following secrets in the Vercel Production Environment Settings:
```env
CASHFREE_APP_ID="<Production App ID from Cashfree Merchant Dashboard>"
CASHFREE_SECRET_KEY="<Production Secret Key from Cashfree Merchant Dashboard>"
CASHFREE_ENV="production"
CASHFREE_API_VERSION="2026-01-01"
```

### Step 2: Cashfree Merchant Dashboard Configuration
1. Log into [Cashfree Merchant Dashboard (Prod)](https://merchant.cashfree.com).
2. Navigate to **Payment Gateway > Developers > Webhooks > Configuration**.
3. Add Webhook Endpoint:
   - **URL:** `https://astroverse-eta.vercel.app/api/webhooks/cashfree`
   - **Version:** `2025-01-01` (includes `x-idempotency-key`)
   - **Events Subscribed:**
     * `PAYMENT_SUCCESS_WEBHOOK`
     * `PAYMENT_FAILED_WEBHOOK`
     * `PAYMENT_USER_DROPPED_WEBHOOK`
     * `REFUND_STATUS_WEBHOOK`
4. Whitelist AstroVerse Production Domains:
   - `https://astroverse-eta.vercel.app`

### Step 3: Server Firewall & IP Whitelisting
Ensure server firewalls or Cloudflare WAF allow incoming webhooks from Cashfree Production IPs:
- `52.66.101.190`
- `3.109.102.144`
- `18.60.134.245`
- `18.60.183.142`
Port: `443` (HTTPS only).

---

## 5. Verification Test Evidence

Verified locally via automated test suite `services/wallet-service/tests/cashfree_and_serverless_state.test.ts`:
- `GET /api/config surfaces cashfreeAppId, cashfreeEnv and isCashfreeConfigured` -> **PASS**
- `POST /api/cashfree/create-order fails closed when live credentials are unconfigured` -> **PASS (HTTP 503)**
- `POST /api/cashfree/create-order rejects negative or zero amounts` -> **PASS (HTTP 400)**
- `verifies Cashfree webhook signature correctly using HMAC-SHA256` -> **PASS**
- `POST /api/webhooks/cashfree rejects missing signature headers` -> **PASS (HTTP 400)**
- `POST /api/webhooks/cashfree rejects invalid signature` -> **PASS (HTTP 400)**
- `POST /api/webhooks/cashfree processes valid payment success and fulfills wallet idempotently` -> **PASS (HTTP 200)**
- `POST /api/cashfree/verify-order rejects missing order and cross-user order` -> **PASS (HTTP 404 / 403)**
