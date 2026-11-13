# PHASE 6.1 — DEPLOYMENT REMEDIATION LOG

**Engineers / Agents:** Principal DevOps Engineer, Senior Backend Engineer  
**Branch:** `fix/enterprise-security-and-hardening`  
**Repository:** `knowledgeispower1715-sketch/astroverse`  

---

## 1. Sequence of Remediation Steps

### Step 1: Hoisting and CORS Refactoring (Commit `44285d708`)
- **Action:** Moved `CASHFREE_WEBHOOK_PATHS` to line 189 in `services/wallet-service/src/server.ts`.
- **Purpose:** Eliminate TDZ `ReferenceError` during module execution.
- **Verification:** Unit test suite execution locally verified 24/24 tests passing.

### Step 2: Runtime Dependency Promotion (Commit `2283bd2a4`)
- **Action:** Promoted `typescript`, `ts-node`, `@types/node`, `@types/express`, and `prisma` into `dependencies` in `services/wallet-service/package.json`.
- **Purpose:** Ensure availability of TypeScript tooling in Vercel's `NODE_ENV=production` build container.

### Step 3: Vercel Schema Clean-up & Alignment (Commit `73031900b`)
- **Action:** Removed top-level `buildCommand`, `installCommand`, and `ignoreCommand` from `vercel.json`. Restored the exact service configuration that succeeded in `296b759fc`.
- **Additional Guard:** Added `typescript` and `ts-node` to `services/consultation-service/package.json` `dependencies`.
- **Purpose:** Satisfy Vercel multi-service schema requirements and eliminate 11-second schema rejection.

### Step 4: Git Push & Autonomous CI/CD Pipeline Monitoring
- **Action:** Pushed commit `73031900b` to `origin/fix/enterprise-security-and-hardening`.
- **Outcome:** Vercel deployment `dpl_CyXMPCQQe7F4nmxcoxZrsEnGpBKH` triggered at 19:33:23 UTC and completed with state `READY` (SUCCESS) at 19:36:07 UTC (duration: 2m 44s).

### Step 5: Live Preview Runtime Validation
- **Action:** Executed live HTTP curl requests against `https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app`.
- **Endpoints Verified:**
  - `GET /api/release` -> HTTP 200 OK (`gitCommitSha: 73031900b`, `environmentLabel: preview`)
  - `GET /api/wallet/webhook` -> HTTP 200 OK (`status: REACHABLE`)
  - `OPTIONS /api/wallet/webhook` -> HTTP 204 No Content (`Allow: POST, GET, HEAD, OPTIONS`)
  - `POST /api/wallet/webhook` (no signature) -> HTTP 400 Bad Request (`MISSING_SIGNATURE_HEADERS`)
  - `GET /api/health` -> HTTP 200 OK (`POSTGRES_PRISMA`, `isDurable: true`)
  - `GET /api/ready` -> HTTP 200 OK (`status: READY`)
  - `GET /api/catalog/products` -> HTTP 200 OK (Full Product & Subscription Catalogue)
  - `GET /` -> HTTP 200 OK (SPA Frontend HTML)
