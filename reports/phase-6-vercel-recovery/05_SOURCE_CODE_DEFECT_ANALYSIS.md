# PHASE 6.1 — SOURCE CODE DEFECT ANALYSIS

**Service:** `services/wallet-service`  
**Key File:** `src/server.ts`  
**Language/Runtime:** TypeScript 5.4.3 / Node.js 20+  

---

## 1. Defect Anatomy: Temporal Dead Zone (TDZ) Hoisting

### Defective State (Commit `75b9a9c8c`):
In `services/wallet-service/src/server.ts`:
```typescript
// Line 205 (Inside CORS Middleware)
if (CASHFREE_WEBHOOK_PATHS.includes(req.path)) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return next();
}
...
// Line 2807 (Declared 2602 lines later!)
const CASHFREE_WEBHOOK_PATHS = [
  '/api/wallet/webhook',
  '/api/wallet/webhook/',
  '/api/webhooks/cashfree',
  '/api/webhooks/cashfree/'
];
```

### Defect Mechanism:
In ECMAScript / TypeScript:
- Variables declared with `const` and `let` are subject to the Temporal Dead Zone (TDZ).
- Although function declarations are hoisted to the top of their scope, `const` declarations are NOT evaluated until the execution flow reaches their physical declaration line.
- During Express middleware setup (which runs synchronously upon module execution), `req.path` checks triggered an immediate fatal `ReferenceError: Cannot access 'CASHFREE_WEBHOOK_PATHS' before initialization`.

### Corrective Implementation (Commits `44285d708` & `73031900b`):
`CASHFREE_WEBHOOK_PATHS` was hoisted to module-level scope at line 189:
```typescript
// Line 189 (Prior to any middleware registration)
export const CASHFREE_WEBHOOK_PATHS = [
  '/api/wallet/webhook',
  '/api/wallet/webhook/',
  '/api/webhooks/cashfree',
  '/api/webhooks/cashfree/',
  '/api/cashfree/webhook',
  '/api/cashfree/webhook/'
];

export function isCashfreeWebhookPath(path: string): boolean {
  if (!path) return false;
  const normalized = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  return CASHFREE_WEBHOOK_PATHS.some(p => {
    const normP = p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p;
    return normP === normalized;
  });
}
```

---

## 2. Defect Anatomy: Route Shadowing by Parameterized Routes

### Defective State:
Express evaluates route handlers in the order they are mounted.
When `/api/wallet/:userId` was declared before the webhook routes, an incoming request to `/api/wallet/webhook` matched `:userId = "webhook"`. Because the parameterized user route required customer JWT authentication, the request immediately returned:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication token required."
}
```

### Corrective Implementation:
1. Registered dedicated webhook route handlers **prior** to any parameterized `/api/wallet/:userId` routes.
2. Hardened `/api/wallet/:userId` with a defensive reservation guard:
   ```typescript
   const reservedWalletSubpaths = ['webhook', 'config', 'catalog', 'me', 'balance', 'transactions', 'orders'];
   if (reservedWalletSubpaths.includes(userId)) {
     return next();
   }
   ```
3. Added route handlers for both GET (reachability) and OPTIONS (CORS preflight) that explicitly bypass user JWT authentication.
