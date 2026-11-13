# PHASE 6.1 — PRODUCTION DEPLOYMENT SAFEGUARDS

**Platform:** AstroVerse AI Release Pipeline  
**Production Target:** `https://astroverse-eta.vercel.app`  

---

## 1. Production Release Guardrails

To protect production data, database schemas, and commercial integrity, the following safeguards are strictly enforced:

1. **Explicit Owner Authorization Gate:**
   - No automatic promotions to production (`vercel --prod`) without explicit written instruction from the repository owner.
   - Branch `main` is protected; all changes must merge through GitHub PR with passing preview CI/CD checks.
2. **Environment Variable Parity & Whitelisting:**
   - Production Cashfree credentials (`CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`) must match production merchant credentials in Vercel Production environment variables.
   - The production webhook URL (`https://astroverse-eta.vercel.app/api/wallet/webhook`) must be configured in the Cashfree Merchant Dashboard under Developers > Webhooks.
   - The production domain (`astroverse-eta.vercel.app`) must be whitelisted in Cashfree Payment Gateway settings.
3. **Database Migration Safety:**
   - PostgreSQL schema updates on production Supabase must execute strictly through verified idempotent DDL migrations.
   - Destructive operations (`DROP TABLE`, `TRUNCATE`, unindexed foreign keys) are strictly prohibited.
4. **Read-Only Inspection Policy:**
   - Development and maintenance agents operate in read-only mode against production endpoints (`/api/release`, `/api/health`).
   - Mock test payments and sandbox orders are strictly isolated from production ledgers.
