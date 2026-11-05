# ASTROVERSE AI — CASHFREE WEBHOOK ARCHITECTURAL REMEDIATION
**Classification:** Production Engineering & Cryptographic Implementation Report  
**Target File(s):**  
- `services/wallet-service/src/server.ts`  
- `services/wallet-service/src/cashfree.ts`  
- `services/wallet-service/package.json`  
**Provider API Standard:** Cashfree Payments `2026-01-01` (with `2025-01-01` compatibility)  
**PR Status:** PR #1 remains OPEN and UNMERGED  
**Production Guardrail:** Production environment remains strictly READ-ONLY  

---

## 1. Summary of Structural Fixes

The remediation resolved the root cause through four precise, non-breaking architectural corrections:

1. **Route Ordering & Shadowing Prevention:**
   - Moved all Cashfree webhook route handlers (`/api/wallet/webhook`, `/api/webhooks/cashfree`, `/api/cashfree/webhook`) up to **Section 5 (Wallet & Payment Gateway)** in `services/wallet-service/src/server.ts`, before any parametric routes.
   - Added an explicit reserved-subpath guard to `app.get('/api/wallet/:userId')`:
     ```typescript
     const reservedWalletSubpaths = ['webhook', 'config', 'catalog', 'me', 'balance', 'transactions', 'orders'];
     if (reservedWalletSubpaths.includes(userId)) {
       return next();
     }
     ```
   - Removed duplicate, shadowed legacy route declarations from line 7620+.

2. **Safe Browser & Operator Reachability Contract (GET / HEAD / OPTIONS / 405):**
   - Implemented `cashfreeWebhookReachabilityHandler` mounted on `CASHFREE_WEBHOOK_PATHS`:
     - **GET `/api/wallet/webhook`:** Returns `HTTP 200 OK` with exact JSON specification:
       ```json
       {
         "status": "REACHABLE",
         "endpoint": "cashfree_webhook",
         "acceptedMethod": "POST",
         "authentication": "CASHFREE_SIGNATURE"
       }
       ```
     - **HEAD `/api/wallet/webhook`:** Returns `HTTP 200 OK` with empty body.
     - **OPTIONS `/api/wallet/webhook`:** Returns `HTTP 204 No Content` with `Allow: POST, GET, HEAD, OPTIONS` header.
     - **Unsupported Methods (PUT, DELETE, PATCH):** Returns `HTTP 405 Method Not Allowed` with `Allow: POST, GET, HEAD, OPTIONS` header.

3. **Isolated Raw-Body Handling & Payload Protection:**
   - Enforced body size limits via `express.json({ limit: '512kb', verify: (req, _res, buf) => { req.rawBody = buf; } })`.
   - Added error handling middleware returning `HTTP 413 PAYLOAD_TOO_LARGE` for payloads exceeding 512 KB, and `HTTP 400 MALFORMED_JSON` for corrupted syntax.
   - Retained unmutated `Buffer` in `req.rawBody` for cryptographic HMAC calculation without stringification or whitespace alteration.

4. **Cryptographic Decoupling & Secret Resolution:**
   - In `services/wallet-service/src/cashfree.ts`, decoupled `verifyCashfreeWebhookSignature` from `isCashfreeConfigured()`.
   - Uses `CASHFREE_WEBHOOK_SECRET || secretKey`, failing closed (`return false`) if secret is missing or `'FORCE_EMPTY'`.
   - Implemented constant-time comparison via `crypto.timingSafeEqual` against Base64-encoded `HMAC-SHA256(timestamp + rawBody, secret)`.
   - Exported `generateCashfreeWebhookSignature` helper for deterministic automated testing.

5. **Durable Idempotency & Transactional Fulfillment:**
   - Evaluates `idempotencyKey` from `x-idempotency-key` header, `event.event_id`, or composite `type_orderId_paymentId`.
   - Enforces single execution via `db.claimWebhookEvent`. Repeated deliveries return `HTTP 200 { status: "ok", alreadyProcessed: true }` immediately without double credit.
   - Validates order existence, payment ID presence, amount equality (`Math.abs(paid - order.amount) <= 0.01`), currency equality, and eligible payment status (`SUCCESS`).
   - Executes wallet credit or subscription unlock transactionally, committing completion via `db.completeWebhookEvent`.
   - On transient failure, calls `db.failWebhookEvent` and returns `HTTP 500 TRANSACTION_FAILURE`, allowing Cashfree retry mechanisms to safely redeliver.

---

## 2. Modified Source Diff Analysis

### `services/wallet-service/src/cashfree.ts`
```typescript
export function verifyCashfreeWebhookSignature(
  rawBody: string | Buffer,
  timestamp: string,
  signature: string,
  secretOverride?: string
): boolean {
  if (!timestamp || !signature) return false;

  const { secretKey } = getResolvedCashfreeCredentials();
  const webhookSecret = secretOverride || process.env.CASHFREE_WEBHOOK_SECRET || secretKey;
  if (!webhookSecret || webhookSecret === 'FORCE_EMPTY') return false;

  const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const signedPayload = timestamp + bodyString;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
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

### `services/wallet-service/src/server.ts`
```typescript
// Cashfree Webhook Endpoints (Canonical & Aliases)
export const CASHFREE_WEBHOOK_PATHS = [
  '/api/wallet/webhook',
  '/api/webhooks/cashfree',
  '/api/cashfree/webhook'
];

export const cashfreeWebhookReachabilityHandler = (req: Request, res: Response) => {
  if (req.path === '/api/wallet/webhook') {
    return res.status(200).json({
      status: 'REACHABLE',
      endpoint: 'cashfree_webhook',
      acceptedMethod: 'POST',
      authentication: 'CASHFREE_SIGNATURE'
    });
  }
  return res.status(200).json({
    status: 'ONLINE',
    endpoint: req.path,
    protocol: 'HTTP POST',
    message: 'Cashfree webhook receiver is online and operational. Payment lifecycle events must be dispatched via HTTP POST with cryptographic x-webhook-signature and x-webhook-timestamp headers.',
    provider: 'Cashfree Payments',
    apiVersion: '2026-01-01',
    supportedEvents: [
      'PAYMENT_SUCCESS_WEBHOOK',
      'PAYMENT_FAILED_WEBHOOK',
      'PAYMENT_USER_DROPPED_WEBHOOK',
      'REFUND_STATUS_WEBHOOK',
      'SETTLEMENT_SUCCESS'
    ],
    timestamp: new Date().toISOString()
  });
};

app.get(CASHFREE_WEBHOOK_PATHS, cashfreeWebhookReachabilityHandler);
app.head(CASHFREE_WEBHOOK_PATHS, (_req: Request, res: Response) => res.status(200).end());
app.options(CASHFREE_WEBHOOK_PATHS, (_req: Request, res: Response) => {
  res.setHeader('Allow', 'POST, GET, HEAD, OPTIONS');
  return res.status(204).end();
});
app.all(CASHFREE_WEBHOOK_PATHS, (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  res.setHeader('Allow', 'POST, GET, HEAD, OPTIONS');
  return res.status(405).json({
    error: 'METHOD_NOT_ALLOWED',
    message: 'Only POST (for webhooks), GET (for reachability), HEAD, and OPTIONS methods are allowed.'
  });
});
```

---

## 3. Preservation of Protected Endpoints

Negative regression testing confirmed that protected routes continue to reject anonymous callers:
- `GET /api/admin/users` → `HTTP 401 Unauthorized` (`UNAUTHORIZED`)
- `POST /api/wallet/create-order` → `HTTP 401 Unauthorized` (`UNAUTHORIZED`)
- `POST /api/wallet/recharge` → `HTTP 401 Unauthorized` (`UNAUTHORIZED`)
- `GET /api/wallet/:userId` (for real user IDs) → `HTTP 401 Unauthorized` (`UNAUTHORIZED`)

No global authentication bypass was created. Only `CASHFREE_WEBHOOK_PATHS` bypass customer session authentication to evaluate Cashfree cryptographic signatures.
