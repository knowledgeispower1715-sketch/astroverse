# AstroVerse Production Deployment & Release Checklist

**Target Release:** AstroVerse Production Stabilization v2.0.0  
**Production URL:** `https://astroverse-eta.vercel.app/`  
**Deployment Platform:** Vercel (Frontend & Serverless Functions), Supabase/PostgreSQL (Durable Database)  
**Author:** Principal Engineering Lead  
**Status:** Local Verification Complete; Awaiting Maintainer Production Approval & Key Provisioning

---

## 1. Pre-Deployment Verification Gate

Before initiating any deployment to Vercel or running database migrations, the maintainer must confirm that all required gates are green:

- [ ] **1.1 Test Suite 100% Passing:**
  ```bash
  npm test --prefix services/wallet-service
  pytest services/kundli-engine/tests
  node scripts/verify_pdf_engine_and_reader.mjs
  ```
- [ ] **1.2 Clean Git Working Tree:**
  Confirm that only vetted changes are staged and no untracked local experimental files or secrets are present:
  ```bash
  git status
  ```
- [ ] **1.3 Zero Hardcoded Secrets:**
  Verify that `git diff` contains zero API keys, private keys, or passwords.
- [ ] **1.4 Package Lockfile Integrity:**
  Confirm `package.json` and lockfiles are clean with no untracked dependency drift.

---

## 2. Environment Variables Configuration Matrix

Verify that all required environment variables are configured in the **Vercel Project Settings > Environment Variables** (Production Environment). **Never log or commit the plaintext values.**

| Variable Name | Required | Purpose & Target Value Description |
|---|---|---|
| `NODE_ENV` | **REQUIRED** | Set to `production`. Disables development and demo shortcuts. |
| `POSTGRES_PRISMA_URL` / `DATABASE_URL` | **REQUIRED** | Supabase/PostgreSQL connection string with connection pooling. Enables durable multi-instance persistence. |
| `JWT_SECRET` | **REQUIRED** | 256-bit cryptographically secure secret for signing user session tokens. |
| `ADMIN_ASSURANCE_SECRET` | **REQUIRED** | 256-bit secret for signing 15-minute administrative MFA step-up tokens. |
| `AUTHORIZED_ADMIN_EMAILS` | **REQUIRED** | Comma-separated list of authorized email addresses permitted to authenticate via `/api/auth/admin-login`. |
| `CASHFREE_APP_ID` | **REQUIRED** | Production App ID from Cashfree Merchant Dashboard. |
| `CASHFREE_SECRET_KEY` | **REQUIRED** | Production Secret Key from Cashfree Merchant Dashboard. |
| `CASHFREE_ENV` | **REQUIRED** | Set strictly to `production`. |
| `CASHFREE_API_VERSION` | **REQUIRED** | Set to `2026-01-01`. |
| `RAZORPAY_KEY_ID` | OPTIONAL | Set if maintaining legacy Razorpay coexistence during migration window. |
| `RAZORPAY_KEY_SECRET` | OPTIONAL | Set if maintaining legacy Razorpay coexistence. |
| `RAZORPAY_WEBHOOK_SECRET` | OPTIONAL | Set for legacy Razorpay webhook verification. |
| `FIREBASE_API_KEY` | OPTIONAL | Firebase Web Client API key if utilizing Firebase authentication. |
| `SUPABASE_URL` | OPTIONAL | Supabase project URL. |
| `SUPABASE_ANON_KEY` | OPTIONAL | Supabase anonymous public client key. |

---

## 3. Database Durability & Schema Bootstrap

- [ ] **3.1 Confirm PostgreSQL Connectivity:**
  Ensure the database target has pgvector / standard PostgreSQL enabled with valid credentials.
- [ ] **3.2 Schema Bootstrap Verification:**
  On startup, `ResilientDatabase` automatically verifies the existence of the `User` table and executes self-healing idempotent DDL for all 34 tables, indexes, and enums if tables are missing.
- [ ] **3.3 Admin Provisioning:**
  Run the automated CLI script to ensure the initial Owner account exists:
  ```bash
  npm run --prefix services/wallet-service admin:provision -- --email owner@astroverse.ai --role OWNER --password "<SecureInitialPassword>"
  ```

---

## 4. Cashfree Merchant Portal Go-Live Steps

- [ ] **4.1 Whitelist Production Domain:**
  In Cashfree Dashboard > Settings > Whitelist Domains:
  - Add: `https://astroverse-eta.vercel.app`
- [ ] **4.2 Register Webhook Endpoint:**
  In Cashfree Dashboard > Developers > Webhooks > Add Webhook:
  - **Webhook URL:** `https://astroverse-eta.vercel.app/api/webhooks/cashfree`
  - **Webhook Version:** `2025-01-01`
  - **Events to Select:**
    * `PAYMENT_SUCCESS_WEBHOOK`
    * `PAYMENT_FAILED_WEBHOOK`
    * `PAYMENT_USER_DROPPED_WEBHOOK`
    * `REFUND_STATUS_WEBHOOK`
- [ ] **4.3 Configure Ingress IP Whitelisting (if behind Cloudflare WAF):**
  Allow inbound traffic from Cashfree IPs:
  `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` on port 443.

---

## 5. Post-Deployment Smoke Test Protocol (Live Production Verification)

Immediately after deploying the build to Vercel, execute this non-destructive smoke test:

### 5.1 System Health Probes
```bash
# Verify system readiness and PostgreSQL mode
curl -i https://astroverse-eta.vercel.app/api/ready
# Expected: HTTP 200 { "status": "READY", "persistence": "POSTGRES_PRISMA" }

# Verify public configuration (confirm secrets are redacted)
curl -i https://astroverse-eta.vercel.app/api/config
# Expected: HTTP 200, isLiveGateway/isCashfreeConfigured visible, zero secret keys exposed
```

### 5.2 Client UI & PDF Export
1. Navigate to `https://astroverse-eta.vercel.app/` in a clean private browser window.
2. Generate a natal chart using test input (e.g. `1990-05-15 14:30 New Delhi`).
3. Open the **Basic Chart Summary** (Free Report).
4. Click **"Download PDF"** in the reader toolbar.
5. Confirm that a multi-page PDF (`.pdf`) downloads immediately to the browser without blank pages or unstyled formatting.

### 5.3 Administrative Login & MFA Check
1. Navigate to the admin portal login screen.
2. Log in with provisioned Owner credentials.
3. Verify TOTP prompt appears for MFA-enabled accounts.
4. Verify that M1–M15 operational dashboards display live data.
5. Verify that demo wallet and tier simulation buttons are absent from the public DOM.

---

## 6. Rollback & Emergency Containment Plan

If unexpected runtime errors, gateway connectivity failures, or regressions occur post-deployment:

### Immediate Containment (Zero Downtime)
1. **Instant Vercel Rollback:**
   - In Vercel Project Dashboard > Deployments, locate the previous stable deployment (`6b8ac5197fba9ad71fbb7392661cfa6b0e8b28cf`).
   - Click the three dots `...` and select **"Instant Rollback"**. This points DNS to the previous build within seconds.
2. **Payment Gateway Failsafe:**
   - If Cashfree webhooks fail, orders remain safely stored with status `CREATED`.
   - Users can be manually reconciled or credited via `POST /api/admin/payments/reconcile` once connectivity is restored.
3. **Database Safety:**
   - All migrations applied are strictly additive (new tables and columns); rolling back application code will not break existing database tables.
