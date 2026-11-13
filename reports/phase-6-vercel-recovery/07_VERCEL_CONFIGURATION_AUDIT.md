# PHASE 6.1 — VERCEL CONFIGURATION AUDIT

**Target File:** `vercel.json`  
**Configuration Dialect:** OpenAPI Vercel JSON Schema (`https://openapi.vercel.sh/vercel.json`)  
**Architecture:** Heterogeneous Multi-Service Serverless (Express + FastAPI + Socket.IO + Static HTML)  

---

## 1. Schema Analysis & Root Conflict

Vercel defines two distinct deployment paradigms in `vercel.json`:
1. **Single-Project / Monolithic Mode:** Global top-level properties such as `buildCommand`, `installCommand`, `devCommand`, and `outputDirectory`.
2. **Multi-Service Mode:** Defined under the top-level `"services"` map.

### The Conflict:
When `"services"` is present, Vercel delegates lifecycle hooks to the individual service descriptors. Placing global `buildCommand` or `installCommand` at the top level causes an unresolvable ambiguity: which root directory does the global command apply to, and should it run before or after service installations?
In deployment `dpl_AsgGPWtuQTMW3uYggUh26jAg62ax`, the inclusion of top-level commands triggered immediate schema validation failure.

---

## 2. Remediated Architecture in `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [ ... ],
  "services": {
    "app": {
      "root": ".",
      "buildCommand": "echo 'Static app ready'",
      "installCommand": "echo 'No install needed'",
      "outputDirectory": "."
    },
    "consultation-service": {
      "root": "services/consultation-service",
      "runtime": "node",
      "entrypoint": "server.ts",
      "bindings": [
        {
          "type": "service",
          "service": "wallet-service",
          "format": "url",
          "env": "WALLET_SERVICE_URL"
        }
      ]
    },
    "kundli-engine": {
      "root": "services/kundli-engine",
      "framework": "fastapi",
      "entrypoint": "main.py"
    },
    "wallet-service": {
      "root": "services/wallet-service",
      "framework": "express",
      "entrypoint": "src/server.ts",
      "bindings": [
        {
          "type": "service",
          "service": "kundli-engine",
          "format": "url",
          "env": "KUNDLI_ENGINE_URL"
        }
      ]
    }
  },
  "rewrites": [ ... ]
}
```

---

## 3. Rewrites and Routing Audit

The rewrites map in `vercel.json` routes incoming traffic to the appropriate service container:
- `/api/wallet/(.*)` -> `wallet-service` (Matches Cashfree webhook, wallet transactions, balance)
- `/api/cashfree/(.*)` -> `wallet-service` (Matches alternate Cashfree callbacks)
- `/api/webhooks(.*)` -> `wallet-service` (Matches generic webhook handlers)
- `/api/catalog/(.*)` & `/api/catalog` -> `wallet-service` (Matches product & subscription catalogue)
- `/api/health`, `/api/ready`, `/api/release` -> `wallet-service` (System telemetry)
- `/api/(.*)` -> `kundli-engine` (Astrological calculation fallback)
- `/socket.io/(.*)` -> `consultation-service` (Real-time consultations)
- `/(.*)` -> `app` (Static Single Page Application)

All rewrite patterns have been verified live against Preview deployment `dpl_CyXMPCQQe7F4nmxcoxZrsEnGpBKH`.
