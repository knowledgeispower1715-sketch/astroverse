# AstroVerse AI — Release Notes

## Version 2.5.1-preview.1 (Commit `73031900b`) — 2026-11-05

### Highlights
- **Vercel Deployment Pipeline Recovery:** Restored clean multi-service serverless builds by eliminating schema command conflicts in `vercel.json` and promoting TypeScript execution tooling to production dependencies.
- **Cashfree Webhook Reachability & Security:** Hardened the Cashfree webhook callback endpoint (`/api/wallet/webhook`) with dedicated reachability handling, robust trailing-slash support, and fail-closed HMAC-SHA256 signature verification.
- **Microservice Routing Reliability:** Resolved route shadowing on Express parameterized endpoints, preventing `/api/wallet/:userId` from intercepting webhook traffic.
- **Continuous Integration Hardening:** Confirmed 100% pass rate across all 24 automated financial and webhook security test suites.

### Detailed Changes
- `services/wallet-service/src/server.ts`:
  - Hoisted `CASHFREE_WEBHOOK_PATHS` to module scope before CORS initialization.
  - Added `isCashfreeWebhookPath()` normalization helper for trailing slash resilience.
  - Implemented HTTP 200 informational GET reachability for monitoring agents.
  - Implemented HTTP 204 preflight OPTIONS handler with explicit Allow headers.
  - Added reservation guard in `/api/wallet/:userId` to prevent collision with reserved endpoints.
- `services/wallet-service/package.json`:
  - Promoted `typescript`, `ts-node`, `@types/node`, `@types/express`, and `prisma` to `dependencies`.
- `services/consultation-service/package.json`:
  - Promoted `typescript`, `ts-node`, and `@types/node` to `dependencies`.
- `vercel.json`:
  - Reverted invalid top-level `buildCommand` and `installCommand` directives in accordance with Vercel's multi-service specification.
