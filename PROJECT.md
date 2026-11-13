# Project: AstroVerse AI Vercel Preview Deployment Hardening & Remediation

## Architecture
- **Root Repository**: `rea-agents` monorepo containing REA tooling, binary analysis engines, and AstroVerse AI multi-service applications.
- **Microservices Deployment**: Defined via Vercel Microservices (`vercel.json#services`):
  - `app`: Static SPA frontend serving `index.html`, `admin.html`, and client assets from root `.`.
  - `wallet-service`: Node.js Express service in `services/wallet-service` handling authentication, Supabase GoTrue MFA, Cashfree payments, and admin APIs.
  - `kundli-engine`: Python FastAPI service in `services/kundli-engine` for Vedic astrological calculations.
  - `consultation-service`: Node.js Socket.io service in `services/consultation-service`.
- **Routing Engine**: 38 URL rewrite rules in `vercel.json` routing traffic by prefix to respective microservices with explicit priority over catch-all rules.
- **Package Management**: Dedicated `package-lock.json` lockfiles per service, strictly managed via `npm`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Forensic Build Reproduction | Reproduce Vercel build failure, inspect logs, and isolate exact root causes | M0 (Done) | Survey |
| F2 | Dangling Symlink Remediation | Create `.vercelignore` to exclude `third_party/unblob` dangling symlinks and non-deployment test artifacts | M1 | R2 |
| F3 | Turborepo Warning Remediation | Define canonical `"build"` task in `turbo.json` and set `"framework": null` in `vercel.json` | M1 | R3 |
| F4 | Dependency Install Determinism | Configure `"installCommand": "npm ci"` in `wallet-service` while preserving `"echo 'No install needed'"` in static `app` | M1 | R4 |
| F5 | Node Engine Pinning | Pin Node engine range in `package.json` to prevent open-ended upgrade warnings | M1 | R4 |
| F6 | Vercel Routing Preservation | Audit all 38 rewrites and verify 100% preservation of HTTP methods, raw bodies, query params, headers, and status codes | M1 | R5 |
| F7 | Local Verification Suite | Execute TypeScript check, contract tests, auth tests, MFA regression tests, and Cashfree webhook security tests | M1 | R6 |
| F8 | Git Commit & Push | Commit fixes to `fix/enterprise-security-and-hardening` and push without force-pushing | M2 | R6 |
| F9 | Vercel Preview Deployment | Verify Vercel Preview deployment succeeds with status READY matching pushed commit SHA | M2 | R6 |
| F10 | Live Preview Smoke Testing | Smoke test live endpoints (`/api/ready`, `/api/release`, `/api/config`, `/api/wallet/config`, `/admin`, `/`, MFA, Supabase) safely | M3 | R6 |
| F11 | Root Cause & Recovery Report | Generate complete `VERCEL_DEPLOYMENT_FAILURE_ROOT_CAUSE_AND_RECOVERY.md` report with all 16 required sections | M4 | R7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Forensic Reproduction | Complete forensic sweep of repo, cloud logs, routing, dependencies | none | DONE |
| M1 | Configuration Hardening & Local Verification | Implement `.vercelignore`, `vercel.json`, `turbo.json`, `package.json` & verify via `tsc`, contract suite, and unit/integration tests | M0 | DONE |
| M2 | Git Push & Vercel Preview Deployment | Commit to branch `fix/enterprise-security-and-hardening`, push, and achieve status READY on Vercel Preview | M1 | IN_PROGRESS |
| M3 | Live Preview Smoke Testing | Smoke test live endpoints on preview URL, verify MFA & Supabase connectivity with zero customer impact | M2 | PLANNED |
| M4 | Root Cause & Recovery Report | Publish comprehensive 16-section `VERCEL_DEPLOYMENT_FAILURE_ROOT_CAUSE_AND_RECOVERY.md` report | M3 | PLANNED |

## Interface Contracts
### Vercel Cloud ↔ AstroVerse Services
- `/api/ready` -> `wallet-service` (GET 200 OK `{ status: "READY" }`)
- `/api/release` -> `wallet-service` (GET 200 OK `{ application: "astroverse-ai", version: "2.5.0" }`)
- `/api/config` -> `wallet-service` (GET 200 OK `{ supabaseUrl, anonKey, cashfreeAppId }`)
- `/api/wallet/config` -> `wallet-service` (GET 200 OK `{ currency: "INR" }`)
- `/api/wallet/create-order` -> `wallet-service` (POST 401 unauthenticated, 200 with valid JWT)
- `/api/auth/admin-supabase-session` -> `wallet-service` (POST 401 unauthenticated, 200 with valid Supabase admin token)
- `/api/admin/*` -> `wallet-service` (Strict authentication and Cloudflare Access headers)
- `/api/webhooks/cashfree` -> `wallet-service` (GET 200 reachability probe, POST HMAC-SHA256 verified signature)
- `/` -> `app` (Static `index.html`)
- `/admin` -> `app` (Static `admin.html`)

## Code Layout
- `.vercelignore`: Deployment file-tracing ignore rules at repository root.
- `vercel.json`: Vercel microservices, routing rewrites, and service definitions at repository root.
- `turbo.json`: Turborepo build pipeline definition at repository root.
- `package.json`: Root package manifest and engine declarations.
- `services/wallet-service/`: Express backend service, routes, and security tests.
- `VERCEL_DEPLOYMENT_FAILURE_ROOT_CAUSE_AND_RECOVERY.md`: Comprehensive recovery report at repository root.
