# PHASE 6.1 — DEPENDENCY AND PACKAGING AUDIT

**Services Audited:** `services/wallet-service`, `services/consultation-service`  
**Package Manager:** NPM / Node.js 20+  
**Target Environment:** Vercel Serverless AWS Lambda Containers  

---

## 1. Audit Rationale & Environmental Constraints

Under Vercel's multi-service architecture:
- Serverless Node.js functions are built with `NODE_ENV=production`.
- The default behavior of `npm install` under `NODE_ENV=production` is to omit all dependencies listed under `devDependencies` (`npm install --omit=dev`).
- If an application's startup script relies on `ts-node` or `typescript` without pre-compiling to pure CommonJS/ESM JavaScript in a `dist/` folder, the absent modules will cause runtime failure.

---

## 2. Package Manifest Audit & Remediation

### `services/wallet-service/package.json`
| Dependency | Original Scope | Remediated Scope | Rationale |
| :--- | :--- | :--- | :--- |
| `typescript` | `devDependencies` | `dependencies` | Required for runtime ts-node module resolution and Prisma client generation. |
| `ts-node` | `devDependencies` | `dependencies` | Direct execution harness for `src/server.ts`. |
| `@types/express` | `devDependencies` | `dependencies` | Type definitions required during on-the-fly compilation. |
| `@types/node` | `devDependencies` | `dependencies` | Core Node.js types. |
| `prisma` | `devDependencies` | `dependencies` | Required for `prisma generate` post-install hook. |
| `@prisma/client` | `dependencies` | `dependencies` | Database client runtime. |
| `express` | `dependencies` | `dependencies` | Core HTTP framework. |
| `@supabase/supabase-js` | `dependencies` | `dependencies` | Supabase data and auth integration. |
| `dotenv` | `dependencies` | `dependencies` | Environment variable loader. |

### `services/consultation-service/package.json`
| Dependency | Original Scope | Remediated Scope | Rationale |
| :--- | :--- | :--- | :--- |
| `typescript` | `devDependencies` | `dependencies` | Prevents cold-start failure on entrypoint `server.ts`. |
| `ts-node` | `devDependencies` | `dependencies` | Direct execution harness. |
| `@types/node` | `devDependencies` | `dependencies` | Core Node.js types. |
| `socket.io` | `dependencies` | `dependencies` | Real-time WebSocket consultation service. |
| `ioredis` | `dependencies` | `dependencies` | Redis caching and pub/sub adapter. |
| `axios` | `dependencies` | `dependencies` | Outbound HTTP client for wallet service calls. |

---

## 3. Supply Chain Security Verification
- No untrusted or dynamic scripts (`curl | sh`) executed in build hooks.
- All versions pinned via `package-lock.json`.
- Zero security advisories detected across audited production dependencies.
