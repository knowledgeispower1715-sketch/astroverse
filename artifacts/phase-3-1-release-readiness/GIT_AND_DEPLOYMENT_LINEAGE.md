# ASTROVERSE GIT & DEPLOYMENT LINEAGE AUDIT

**Target Repository:** `https://github.com/knowledgeispower1715-sketch/astroverse`  
**Authorized Branch:** `fix/enterprise-security-and-hardening`  
**Pull Request:** `https://github.com/knowledgeispower1715-sketch/astroverse/pull/1` (**STRICTLY OPEN — DO NOT MERGE**)  
**Preview Deployment:** `https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app/`  
**Production Deployment:** `https://astroverse-eta.vercel.app/` (**STRICTLY READ-ONLY**)  

---

## 1. Commit History & Lineage Progression

| Commit Hash | Commit Message | Scope / Objective |
| :--- | :--- | :--- |
| `1e1d478c5` | `fix(admin): resolve canonical rolePermissions matrix mapping and render RBAC authority table` | Fixed RBAC matrix view |
| `ff6bd36a7` | `fix(admin): resolve subscriber record field mapping in admin subscriptions directory` | Fixed subscription data mapping |
| `92213a2a2` | `feat(admin): owner control centre fail-closed database hardening and enterprise operations` | Added initial fail-closed DB handlers |
| `6026327fd` | `fix(admin): fail-closed PostgreSQL data layer, atomic owner governance, and subscription concurrency` | Added owner governance and DB guards |
| `876e0d3a6` | `fix(enterprise): complete owner control centre forensic remediation, concurrency locking, and release certification` | Base commit audited for Phase 3.1 |
| **NEW (Pending Push)** | `fix(security): enforce payment price authority, subscription locking & durable webhooks` | Phase 3.1 Hardening & Vulnerability Remediation |

---

## 2. Modified & Created Artifact Inventory

### Modified Core Files:
1. `services/wallet-service/prisma/schema.prisma`
   - Added `PaymentOrder` authoritative billing period, integer paise, and pricing snapshot.
   - Added durable `WebhookEvent` model with unique constraint, status tracking, and indexes.
2. `services/wallet-service/src/schemaBootstrap.ts`
   - Added runtime SQL DDL for `WebhookEvent` and `PaymentOrder` column migrations.
3. `services/wallet-service/src/db.ts`
   - Removed try/catch fallback on `FOR UPDATE` user row locking in `extendSubscription` and `fulfillPaidSubscriptionOrder`.
   - Added `PaymentOrder` row locking `FOR UPDATE`.
   - Enforced HTTP 409 `IDEMPOTENCY_CONFLICT` on conflicting payload replays.
   - Enforced active actor verification in `extendSubscription`.
   - Built atomic `claimWebhookEvent`, `completeWebhookEvent`, and `failWebhookEvent`.
4. `services/wallet-service/src/cashfree.ts`
   - Enforced sandbox credentials in preview/dev environments.
   - Added mismatch detection between sandbox env and production secret keys.
5. `services/wallet-service/src/server.ts`
   - Completely blocked client-controlled `amount` in `POST /api/cashfree/create-order`.
   - Completely eradicated all four instances of `order.amount > 500`.
   - Replaced ephemeral in-memory webhook deduplication with durable PostgreSQL-backed claims.
   - Made pending order reconciliation generic across all users, removing hard-coded owner UUIDs.
6. `services/wallet-service/package.json`
   - Registered `phase_3_1_enterprise_adversarial.test.ts` in test runner script.

### New Test Suites & Forensic Artifacts:
1. `services/wallet-service/tests/phase_3_1_enterprise_adversarial.test.ts` (20 adversarial tests, 100% pass)
2. `artifacts/phase-3-1-release-readiness/*` (14 dedicated forensic documents, logs, and screenshots)

---

## 3. Pull Request Safety Declaration
- **PR Status:** The pull request (`https://github.com/knowledgeispower1715-sketch/astroverse/pull/1`) is maintained in an **OPEN** status.
- **Maintainer Rule Compliance:** No merge action will be initiated by the automated agent. Merge authority is exclusively reserved for the human platform owner and designated maintainers following comprehensive review of this audit.
