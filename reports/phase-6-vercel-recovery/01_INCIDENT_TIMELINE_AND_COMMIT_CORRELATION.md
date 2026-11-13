# PHASE 6.1 — INCIDENT TIMELINE & COMMIT CORRELATION

**Platform:** AstroVerse AI Deployment Pipeline  
**Target Environment:** Vercel Multi-Service Serverless Platform  
**Repository:** `knowledgeispower1715-sketch/astroverse`  
**Active Working Branch:** `fix/enterprise-security-and-hardening`  
**Production Host:** `https://astroverse-eta.vercel.app`  

---

## 1. Executive Timeline & Sequence of Events

| Timestamp (UTC) | Git Commit | Deployment / Event ID | Action & Observations | Outcome / Status |
| :--- | :--- | :--- | :--- | :--- |
| **2026-11-04 22:47:51** | `296b759fc` | `dpl_D28f9yqJp1JRXc8csr64Y9rgUEuV` | PR #1 merged into `main` by repo owner. Clean multi-service build. | **SUCCESS (Live Production Baseline)** |
| **2026-11-05 18:32:02** | `296b759fc` | `dpl_41ThhdNNPc3NdrRsoDsmrUztWboE` | Subsequent production deployment check on baseline. | **SUCCESS** |
| **2026-11-05 18:36:36** | `75b9a9c8c` | `dpl_9pUrS6jC35U6SdABjU8YN2idmu22` | Cashfree webhook implementation pushed. TDZ error in `server.ts`. | **FAILED (Timeout / Unhandled Startup)** |
| **2026-11-05 18:37:16** | `b2c03a84b` | `dpl_2agApTFvcbXDo71czFeLM3RgPUfX` | Merge branch commit incorporating `75b9a9c8c`. Same TDZ defect. | **FAILED** |
| **2026-11-05 18:41:08** | `c0d64dc` | `dpl_6eG3LFW848Uu1cjaJCUxFzFMDXBw` | Release-please automated PR branch push (`rea-agents` manifest). | **FAILED (Ignored noise)** |
| **2026-11-05 18:52:44** | `44285d708` | `dpl_HU8nCH1x7gcN7KKXsqNmVkfQFWvr` | Hoisted `CASHFREE_WEBHOOK_PATHS`. TDZ resolved, but TypeScript missing. | **FAILED (Build Failure / Missing DevDeps)** |
| **2026-11-05 18:55:36** | `70ef757` | `dpl_CAgMkfXwfZZQzq62Hp2DnJ4rUjtU` | Release-please automated release notes branch push. | **FAILED (Ignored noise)** |
| **2026-11-05 19:26:41** | `2283bd2a4` | `dpl_AsgGPWtuQTMW3uYggUh26jAg62ax` | Config commit with top-level buildCommand. Immediate schema rejection. | **FAILED (11s Config Rejection)** |
| **2026-11-05 19:33:23** | `73031900b` | `dpl_CyXMPCQQe7F4nmxcoxZrsEnGpBKH` | Schema aligned to production standard, runtime ts-node/typescript added. | **BUILDING (Remediation Commit)** |

---

## 2. Forensic Commit Correlation

### Root Cause Cluster 1: Temporal Dead Zone (TDZ) Hoisting Violation
- **Affected Commits:** `75b9a9c8c`, `b2c03a84b`
- **Symptom:** Vercel builder spins attempting to bundle or execute entrypoint `services/wallet-service/src/server.ts`, timing out after ~10 minutes.
- **Root Cause:** Line 205 evaluated `CASHFREE_WEBHOOK_PATHS.includes(req.path)` during CORS middleware instantiation, but `const CASHFREE_WEBHOOK_PATHS = [...]` was defined at line 2807. In ES6 module execution, `const` variables are in a temporal dead zone until declared, throwing a fatal `ReferenceError`.
- **Remediation:** Hoisted `CASHFREE_WEBHOOK_PATHS` to line 189 in commit `44285d708`.

### Root Cause Cluster 2: Production Tooling Absence (`NODE_ENV=production`)
- **Affected Commits:** `44285d708`
- **Symptom:** Build/package failure after ~3.8 minutes.
- **Root Cause:** In Vercel serverless functions, `npm install` runs in production mode, omitting packages listed under `devDependencies`. Because `typescript`, `ts-node`, `@types/node`, and `@types/express` were placed in `devDependencies`, the Express service entrypoint `src/server.ts` could not be transpiled or traced during Vercel's serverless compilation.
- **Remediation:** Promoted `typescript`, `ts-node`, `@types/node`, and `@types/express` to `dependencies` in `services/wallet-service/package.json` and `services/consultation-service/package.json`.

### Root Cause Cluster 3: Multi-Service Vercel Schema Conflict
- **Affected Commits:** `2283bd2a4`
- **Symptom:** Immediate deployment failure within 11 seconds.
- **Root Cause:** When `"services"` is defined in `vercel.json`, Vercel prohibits global top-level `"buildCommand"` and `"installCommand"` directives (`Global buildCommand conflicts with services schema`).
- **Remediation:** Stripped global build and install directives from `vercel.json` and restored the exact validated schema from the successful `296b759fc` baseline in commit `73031900b`.
