# ASTROVERSE AI — REMAINING PRODUCTION BLOCKERS & GO-LIVE PREREQUISITES

**Document ID:** `AV-BLK-2026-10-30-08`  
**Classification:** Pre-Deployment Operational Prerequisites  
**Author:** Principal Engineering Lead  
**Status:** Actionable Human Checklist (Pending External Provisioning)  
**Target Environment:** `https://astroverse-eta.vercel.app/`  

---

## 1. BLOCKER LEDGER & READINESS SUMMARY

All application code, calculation logic, security guards, and test suites have been completed and verified locally. The following blockers are external administrative prerequisites that require human authorization and external account access:

```
+---------------------------------------------------------------------------------------------------------+
|                                    REMAINING PRODUCTION BLOCKERS                                        |
+----+-----------------------------------------------+----------------------+-----------------------------+
| #  | Blocker Description                           | Responsible Party    | Impact if Unresolved        |
+----+-----------------------------------------------+----------------------+-----------------------------+
| 1  | Cashfree Production API Credentials           | Merchant Owner       | Paid checkouts return 503   |
| 2  | Merchant Domain Whitelisting in Cashfree      | Merchant Owner       | Browser modal blocked by CF |
| 3  | Cashfree Webhook URL Registration             | Merchant Owner       | Async orders not settled    |
| 4  | Managed PostgreSQL Connection (DATABASE_URL)  | DevOps / DBA         | State mutations fail-close  |
| 5  | Decommissioning of Retired Razorpay Secrets   | DevOps / Admin       | Secret hygiene defect       |
| 6  | Human Review & Release PR Merge               | Repository Owner     | Changes remain unstaged     |
+----+-----------------------------------------------+----------------------+-----------------------------+
```

---

## 2. DETAILED ACTIONABLE PREREQUISITES

### 2.1 Blocker 1: Cashfree Production Credentials
- **Action:** Obtain live production API keys from the [Cashfree Merchant Dashboard](https://merchant.cashfree.com/merchants/login) under **Developers > API Keys**.
- **Configuration:** Add the following environment variables to the Vercel Production Environment:
  ```bash
  CASHFREE_APP_ID="your_cashfree_production_app_id"
  CASHFREE_SECRET_KEY="your_cashfree_production_secret_key"
  CASHFREE_ENV="production"
  CASHFREE_API_VERSION="2026-01-01"
  ```
- **Constraint:** Never commit these values to Git or paste them into chat transcripts.

### 2.2 Blocker 2: Cashfree Domain Whitelisting
- **Action:** Log into the Cashfree Dashboard, navigate to **Payment Gateway > Developers > Whitelisted Domains**, and register:
  ```
  https://astroverse-eta.vercel.app
  ```
- **Reason:** Cashfree JS SDK v3 enforces Cross-Origin Request and iframe embedding restrictions; unlisted domains cannot open the payment modal.

### 2.3 Blocker 3: Asynchronous Webhook Registration
- **Action:** Under **Payment Gateway > Developers > Webhooks**, configure:
  - **Webhook URL:** `https://astroverse-eta.vercel.app/api/webhooks/cashfree`
  - **Version:** `2026-01-01`
  - **Event Subscriptions:** `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, `REFUND_SUCCESS_WEBHOOK`.

### 2.4 Blocker 4: Production Database Pool Configuration
- **Action:** Provide an authenticated connection string in Vercel under `DATABASE_URL`:
  ```bash
  DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?pgbouncer=true&connection_limit=15"
  ```
- **Reason:** Required by `db.assertDurableStorage()` to ensure financial ledgers and user entitlements survive serverless container lifecycles.

### 2.5 Blocker 5: Decommission Obsolete Razorpay Secrets
- **Action:** In Vercel Project Settings > Environment Variables, permanently delete:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`

### 2.6 Blocker 6: Human Code Review & Release Promotion
- **Action:** Inspect the modified and untracked files locally, commit the changes to a dedicated release branch (e.g. `release/cashfree-migration-2026-10-30`), and open a Pull Request for peer review.
- **Constraint:** Do not force-push (`git push -f`) or run destructive clean commands (`git clean -fd`, `git reset --hard`).

---

## 3. SMOKE TEST RUNBOOK UPON UNBLOCKING

Once the above items are configured, execute this 3-step verification on the live deployment:
1. **Wallet Recharge Smoke Test:** Initiate a ₹50 top-up; confirm Cashfree modal loads and payment credits wallet.
2. **Subscription Activation Smoke Test:** Subscribe to Plus tier; confirm instantaneous elevation to Plus and 10% discount application.
3. **Report Generation Smoke Test:** Purchase "Complete Janam Kundli Deep Dive"; verify immediate PDF compilation and error-free reader rendering.
