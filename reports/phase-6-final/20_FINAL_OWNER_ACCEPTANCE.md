# ASTROVERSE AI — PHASE 6.3 FINAL OWNER ACCEPTANCE & PRODUCTION PROMOTION CHECKLIST

**Document Reference:** `reports/phase-6-final/20_FINAL_OWNER_ACCEPTANCE.md`  
**Classification:** Operational Runbook, Deployment Sign-Off & Go-Live Governance  
**Repository:** `https://github.com/knowledgeispower1715-sketch/astroverse`  
**Target Production Domain:** `https://astroverse-eta.vercel.app`  

---

## 1. Owner Actionable Runbook

The platform owner should execute the following sequential steps to complete commercial launch:

### Step 1: Verify Production Environment Variables on Vercel
In the Vercel Project Dashboard (`Settings > Environment Variables`), confirm that the following credentials are configured for the **Production** environment:

| Variable Name | Required Value / Description | Sensitive? |
| :--- | :--- | :---: |
| `CASHFREE_APP_ID` | `14962482c27cb93db2c6bc6e4af8426941` (Canonical Merchant App ID) | Public |
| `CASHFREE_SECRET_KEY` | Live Production Merchant Secret Key | **CRITICAL SECRET** |
| `CASHFREE_ENVIRONMENT` | `PRODUCTION` | Public |
| `CASHFREE_API_VERSION` | `2026-01-01` | Public |
| `DATABASE_URL` | Supabase Production PostgreSQL Connection String (Pooler: 6543) | **CRITICAL SECRET** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Production Service Role Key | **CRITICAL SECRET** |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nzeutydhfxhjufacqren.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Production Anonymous Client Key | Public |

### Step 2: Verify Production Reachability in Browser
Verify that the production webhook returns the reachability payload:
```bash
curl -i -s "https://astroverse-eta.vercel.app/api/wallet/webhook"
```
Or open `https://astroverse-eta.vercel.app/api/wallet/webhook` in an **Incognito / Private Browsing window** to bypass any stale cached 401 responses.

### Step 3: Configure Cashfree Production Merchant Dashboard
In the Cashfree Merchant Dashboard (`Developers > Webhooks`):
1. **Webhook URL:** `https://astroverse-eta.vercel.app/api/wallet/webhook`
2. **API Version:** `2026-01-01`
3. **Subscribed Events:**
   - `PAYMENT_SUCCESS_WEBHOOK`
   - `PAYMENT_FAILED_WEBHOOK`
   - `PAYMENT_USER_DROPPED_WEBHOOK`
   - `REFUND_STATUS_WEBHOOK`
   - `SETTLEMENT_SUCCESS`
4. Send a test webhook from the Cashfree dashboard; verify `HTTP 200` delivery acknowledgment.

### Step 4: Review and Merge Pull Request #1 on GitHub
1. Open [`https://github.com/knowledgeispower1715-sketch/astroverse/pull/1`](https://github.com/knowledgeispower1715-sketch/astroverse/pull/1).
2. Review the verified branch diff from `fix/enterprise-security-and-hardening`.
3. Confirm that all 22 release deliverables under [`reports/phase-6-final/`](file:///e:/rea/reports/phase-6-final/) are present.
4. Approve and execute merge into `main`.

### Step 5: Verify Post-Merge Production Deployment
Once Vercel automatically completes the production build from `main`:
```bash
curl -s "https://astroverse-eta.vercel.app/api/release"
```
Confirm that `environmentLabel` is `"production"` and `gitCommitSha` matches the merged commit SHA.

### Step 6: Execute Live Canary Payment Test
1. Log into AstroVerse production as a test user.
2. Navigate to Wallet > Recharge > Custom Amount.
3. Initiate a live ₹50.00 recharge via UPI QR.
4. Complete payment on UPI mobile app.
5. Confirm instant wallet credit (+₹50.00) and generation of GST receipt.
