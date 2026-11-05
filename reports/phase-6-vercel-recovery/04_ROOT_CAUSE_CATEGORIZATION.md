# PHASE 6.1 — ROOT CAUSE CATEGORIZATION

**Scope:** AstroVerse AI Vercel Deployment Failures  
**Incidents Analyzed:** Commits `75b9a9c8c`, `b2c03a84b`, `44285d708`, `2283bd2a4`  
**Classification Framework:** Enterprise CI/CD and Serverless Reliability Standards  

---

## 1. Taxonomic Classification of Deployment Failures

| Defect Class | Severity | Affected Artifact | Mechanism of Failure | Definitive Fix Applied |
| :--- | :--- | :--- | :--- | :--- |
| **CODE_EXECUTION_ORDER (TDZ)** | CRITICAL | `services/wallet-service/src/server.ts` | Variable declaration hoisted below referencing middleware; fatal `ReferenceError` during serverless function evaluation. | Hoisted `CASHFREE_WEBHOOK_PATHS` to top of module (line 189) prior to CORS instantiation. |
| **DEPENDENCY_SCOPE_MISMATCH** | HIGH | `services/wallet-service/package.json` | TypeScript compiler and type defs isolated in `devDependencies`; omitted by `npm install --omit=dev` under `NODE_ENV=production`. | Promoted `typescript`, `ts-node`, and `@types/*` to production `dependencies`. |
| **MULTI_SERVICE_CONFIG_CONFLICT** | HIGH | `vercel.json` | Top-level `buildCommand` and `installCommand` directives conflict with Vercel Multi-Service schema. | Removed top-level directives; restored proven multi-service production configuration schema. |
| **BRANCH_PIPELINE_NOISE** | LOW | Git automated branches | Automated bot PR branches (`release-please`) triggered redundant preview builds for non-app manifest changes. | Verified separation of concern; documented bot branch isolation. |

---

## 2. Deep-Dive Diagnostic Analysis

### A. TDZ Hoisting in Serverless Function Modules
In an Express microservice packaged as a Vercel Serverless Function, the entry point (`src/server.ts`) is evaluated during the cold-start initialization phase. When `CASHFREE_WEBHOOK_PATHS` was declared at line 2807 using `const`, JavaScript's temporal dead zone prevented its evaluation at line 205.
Unlike long-running Node processes that crash loudly with a stack trace immediately upon startup, serverless execution harnesses can stall waiting for the process to bind to an ephemeral port or report ready, ultimately resulting in a build/runtime timeout.

### B. Production NPM Dependency Pruning
When Vercel packages Node.js lambdas, it sets `NODE_ENV=production`. As a consequence, `npm install` skips devDependencies. Because `wallet-service` uses `ts-node` directly for execution (`dev: "ts-node src/server.ts"`), or relies on TypeScript for type-checking and schema bindings, omitting `typescript` and `ts-node` causes execution failure when the serverless bundle is generated or launched.
Moving all build-required tools to `dependencies` guarantees their presence in any CI/CD environment regardless of `NODE_ENV`.

### C. Multi-Service Configuration Constraints
Vercel's multi-service architecture allows defining isolated microservices (`app`, `consultation-service`, `kundli-engine`, `wallet-service`) within a single monorepo.
Under this schema:
- Top-level `buildCommand` and `installCommand` are strictly prohibited because they create an ambiguous build lifecycle across heterogeneous runtimes (Node.js vs Python FastAPI vs Static HTML).
- Each service manages its own dependencies and build hooks locally within its declared `root`.
