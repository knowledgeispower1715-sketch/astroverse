# ASTROVERSE AI — CASHFREE WEBHOOK FORENSIC ROOT CAUSE ANALYSIS

**Investigation Date:** November 6, 2026  
**Investigating Engineers:** Principal Node.js/Express Architect, Cashfree Payments Integration Engineer, CISO & Vercel Deployment Engineer  
**Classification:** Critical Security & Infrastructure Investigation  
**Affected Production Endpoint:** `https://astroverse-eta.vercel.app/api/wallet/webhook`  
**Backend Microservice:** `services/wallet-service` (Node.js / Express / Prisma / PostgreSQL)  
**Git Repository:** `https://github.com/knowledgeispower1715-sketch/astroverse`  

---

## 1. Executive Summary

A critical issue was reported where opening or querying the production Cashfree webhook endpoint:
```
https://astroverse-eta.vercel.app/api/wallet/webhook
```
returned an unexpected client authorization failure:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication token required."
}
```

A comprehensive forensic investigation was conducted across Git commit lineage, Vercel deployment records, live runtime headers, Express middleware composition, and route registration order.

### The Real Root Cause
The root cause was **Route Parameter Shadowing in Express.js**:
1. The parameterized route `app.get('/api/wallet/:userId', authenticate, ...)` was registered in `services/wallet-service/src/server.ts` before the dedicated Cashfree webhook reachability handler.
2. In Express routing semantics, string pattern matching evaluated `/api/wallet/webhook` against `/api/wallet/:userId`, binding `req.params.userId = "webhook"`.
3. Because the user statement route was bound to the `authenticate` middleware, every incoming request was required to provide a valid user Bearer token (`req.headers.authorization`).
4. When an anonymous browser user or Cashfree S2S probe queried the endpoint without a user Bearer token, `authenticate` intercepted the request and aborted execution with `HTTP 401 UNAUTHORIZED: "Authentication token required."`.
5. The dedicated reachability handler was completely starved of execution.

---

## 2. Deployed Source Identity & Environment Reconciliation

A rigorous audit was performed comparing the production deployment against preview deployments and local branch HEAD:

| Parameter | Production (`astroverse-eta.vercel.app`) | Preview (`astroverse-git-fix-...`) | Local Working Branch (`fix/enterprise-security-and-hardening`) |
| :--- | :--- | :--- | :--- |
| **Vercel Host** | `astroverse-eta.vercel.app` | `astroverse-git-fix-e-72a6a3-...vercel.app` | Local Workspace (`E:\rea`) |
| **Active Git Branch** | `main` | `fix/enterprise-security-and-hardening` | `fix/enterprise-security-and-hardening` |
| **Deployed Git SHA** | `44285d70818458c4dfd0cfb6db199259d27db599` | `b7eb0d8cee2bd7666c2e19db18a3c96c58b0f1ab` | `b7eb0d8cee2bd7666c2e19db18a3c96c58b0f1ab` |
| **`/api/release` Status**| `HTTP 200 OK` | `HTTP 200 OK` | N/A (Build source) |
| **Environment Label** | `"production"` | `"preview"` | `"development"` |
| **Schema Version** | `20261104_07` | `20261104_07` | `20261104_07` |
| **PR #1 Status** | Merged into `main` at `296b759fc` | Open / Unmerged Feature Branch | Open / Unmerged Feature Branch |

### Deployment Chronology
1. **Commit `296b759fc` (Initial Production State):**
   - Merged into `main` via PR #1.
   - Contained the shadowed `/api/wallet/:userId` route that caused the `401 Unauthorized: Authentication token required.` failure on production.
2. **Commit `75b9a9c8c` & `44285d708` (Production Hotfix on `main`):**
   - Hoisted `CASHFREE_WEBHOOK_PATHS` before CORS and route registration.
   - Deployed automatically by Vercel to Production.
   - Verified active on Production: `curl https://astroverse-eta.vercel.app/api/release` confirms active SHA `44285d70818458c4dfd0cfb6db199259d27db599`.
3. **Commit `2283bd2a4` & `73031900b` (Hardened Monorepo Configuration on `fix/...`):**
   - Restored exact multi-service `vercel.json` routing schema without brittle top-level overrides.
   - Promoted `typescript`, `ts-node`, and `@types/*` to runtime `dependencies` in `services/wallet-service/package.json` to prevent serverless build pruning under `NODE_ENV=production`.
   - Added trailing slash path normalization helper `isCashfreeWebhookPath(path)`.
   - Built and deployed to Preview under `dpl_3mT5x3CUudoYwd7oiF4MKfpiLFfV` and `b7eb0d8ce`.

---

## 3. Code-Level Forensic Dissection

### A. The Defective Middleware Architecture (Commit `296b759fc`)
In `services/wallet-service/src/server.ts`:
```typescript
// Line 422: Authentication Middleware
async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // THIS LINE GENERATED THE PRODUCTION FAILURE:
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication token required.' });
  }
  // ...
}

// Line 4554: Parameterized Route registered BEFORE Webhook handler
app.get('/api/wallet/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  // Express regex: /^\/api\/wallet\/([^\/]+?)\/?$/i
  // req.params.userId === "webhook"
  // Route matched! 'authenticate' middleware executed immediately!
});
```

### B. Why Global Middleware Did Not Cause the Failure
A common hypothesis was that global Express middleware (such as `app.use(authenticate)`) was applied across all `/api` routes. Forensic inspection disproved this:
- Global middleware only applied:
  1. `globalApiLimiter` (IP rate limiting)
  2. `express.json({ verify: (req, _res, buf) => req.rawBody = buf })`
  3. CORS headers
- Authentication was mounted per-route. The failure occurred solely because Express evaluated routes sequentially, and the parameterized `:userId` pattern captured `"webhook"` before the specific webhook route was registered.

### C. The Trailing Slash Variance
In commit `44285d708`:
- `CASHFREE_WEBHOOK_PATHS` contained `['/api/wallet/webhook', '/api/webhooks/cashfree', '/api/cashfree/webhook']`.
- If a client queried `https://astroverse-eta.vercel.app/api/wallet/webhook/` (with a trailing slash), Express matched the alias fallback, returning `status: "ONLINE"` instead of the required canonical reachability response:
  ```json
  {
    "status": "REACHABLE",
    "endpoint": "cashfree_webhook",
    "acceptedMethod": "POST",
    "authentication": "CASHFREE_SIGNATURE"
  }
  ```
- This was resolved in the hardening branch by implementing `isCashfreeWebhookPath(path)` and normalizing trailing slashes via `normPath = (req.path || '').replace(/\/+$/, '') || '/'`.

---

## 4. Conclusion

The defect has been permanently isolated to route registration order and parameter shadowing in Express. The correction separates server-to-server webhook callbacks from user session authentication, ensuring that Cashfree webhooks are authenticated strictly via cryptographic provider signatures while preserving user authentication across all customer and administrative endpoints.
