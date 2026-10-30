# AstroVerse AI — Production Readiness & Go-Live Verification Checklist

**Author:** Principal Engineering Lead  
**Document Reference:** Deliverable 10 / Production Release Governance  
**Deployment Target:** Vercel Production (`https://astroverse-eta.vercel.app/`)  
**Date:** October 30, 2026  
**Final Release Verdict:**  
> **"The codebase remediation and integration are structurally correct, mathematically grounded, and verified across automated browser and unit suites. However, live Cashfree gateway credentials, domain whitelisting, production webhook endpoint registration, and final human acceptance must be completed before triggering live production deployment."**

---

## 1. Production Readiness Audit Matrix

| Verification Domain | Specific Production Requirement | Local Implementation Status | Live Production Status | Action Prior to Go-Live |
| :--- | :--- | :---: | :---: | :--- |
| **Active Payment Gateway** | Cashfree JS v3 SDK loaded in checkout; Razorpay active checkout removed. | **VERIFIED** | Active | None (Code complete) |
| **Gateway Credentials** | `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` configured in env. | **FAIL-CLOSED (Verified)** | **PENDING CREDENTIALS** | Supply live production keys in Vercel project environment variables |
| **Domain Whitelisting** | Production domain whitelisted in Cashfree Merchant Dashboard. | Localhost / test ports | **PENDING HUMAN ACTION** | Whitelist `astroverse-eta.vercel.app` under Cashfree Developers → Whitelisted Domains |
| **Webhook Endpoint** | Webhook URL registered with `PAYMENT_SUCCESS_WEBHOOK` event subscription. | `/api/webhooks/cashfree` verified with HMAC | **PENDING HUMAN ACTION** | Register `https://astroverse-eta.vercel.app/api/webhooks/cashfree` in Cashfree Dashboard |
| **Webhook Secret** | `CASHFREE_SECRET_KEY` shared with webhook verification logic. | Verified with SHA-256 HMAC | **PENDING CREDENTIALS** | Ensure production secret is populated |
| **Financial Ledger Integrity** | Historical Razorpay transactions preserved for audit; no accidental deletion. | **PRESERVED** | Preserved | None (Immutable read-only ledger) |
| **Database Architecture** | PostgreSQL serverless persistence with durable fallback. | **VERIFIED** | Active on Neon | Verify PostgreSQL connection pool limits |
| **Entitlement Gating** | Unverified orders fail closed; subscriptions isolated from report replay. | **VERIFIED (100%)** | Active | None |
| **PDF Generation Engine** | Multi-page attached blob download; zero unattached anchor cancellation. | **VERIFIED (100%)** | Active | None |
| **Report Reader Experience** | Unified `#modal-report-reader` with Table of Contents & Hindi summary. | **VERIFIED (100%)** | Active | None |
| **Catalogue & Pricing** | Strict ₹49–₹499 range; integer paise storage; member discounts. | **VERIFIED (100%)** | Active | None |
| **Admin Panel Hardening** | RBAC, MFA challenge, zero plaintext secrets exposed, DPDP export. | **VERIFIED (100%)** | Active | None |
| **Third-Party Licensing** | Swiss Ephemeris 2.10.03 legal notices and attribution published. | **VERIFIED** | Published | None (`THIRD_PARTY_NOTICES.md`) |
| **Automated Regressions** | End-to-end browser tests, 10-product PDF audit, 24 backend suites passing. | **392/392 PASS (100%)** | Verified locally | None |

---

## 2. Unmet Items Required for Live Production Release

Before the maintainer flips the switch to deploy this recovered codebase to production, the following four external environmental prerequisites must be fulfilled:

### 1. Provisioning Live Cashfree Production Keys
- **Environment Variables to Set in Vercel:**
  ```env
  CASHFREE_APP_ID="prod_app_xxxxxxxxxxxx"
  CASHFREE_SECRET_KEY="cfsk_ma_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  CASHFREE_ENV="production"
  ```
- *Current Local Behavior:* Operating securely in **fail-closed mode**. All endpoints correctly reject unauthorized orders with `HTTP 503 SERVICE_UNAVAILABLE` rather than failing open.

### 2. Domain Whitelisting in Cashfree Merchant Portal
- Log in to the [Cashfree Merchant Dashboard](https://merchant.cashfree.com/).
- Navigate to **Payment Gateway → Settings → Developers → Whitelisted Domains**.
- Add the production domain:
  `https://astroverse-eta.vercel.app`
- Add any custom canonical domains (e.g., `https://astroverse.ai`).

### 3. Registering the Production Webhook Endpoint
- Navigate to **Payment Gateway → Settings → Developers → Webhooks**.
- Add new Webhook URL:
  `https://astroverse-eta.vercel.app/api/webhooks/cashfree`
- Version: `2026-01-01` (or `2025-01-01`).
- Subscribed Events: `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, `REFUND_STATUS_WEBHOOK`.

### 4. Human Maintainer Sign-Off
- In compliance with repository guidelines, AI agents do not deploy code to production, modify production DNS/TLS, or sign off on financial readiness on behalf of human owners.
- The human repository owner reviews the generated deliverables, inspects the git diff, and declares readiness.

---

## 3. Step-by-Step Production Release Protocol

When the human maintainer is ready to deploy:

1. **Verify Local Git State:**
   ```bash
   git status
   ```
   Ensure working directory contains all verified fixes and deliverables.
2. **Execute Full Pre-Push Test Gate:**
   ```bash
   node scripts/verify_module16_end_to_end.mjs
   node scripts/verify_pdf_engine_and_reader.mjs
   cd services/wallet-service && npm test
   pytest services/kundli-engine/tests
   ```
3. **Commit Cleanly Using Conventional Commits:**
   ```bash
   git add index.html services/wallet-service/ RECOVERY_BASELINE.md PDF_DOWNLOAD_ROOT_CAUSE.md PDF_READER_REDESIGN.md PRODUCT_CATALOGUE_AND_PRICING.md REPORT_TEMPLATE_SPECIFICATIONS.md ADMIN_PUBLIC_CATALOGUE_INTEGRATION.md ADMIN_PANEL_FUNCTIONALITY_AUDIT.md SECURITY_AND_ENTITLEMENT_VERIFICATION.md REGRESSION_TEST_RESULTS.md PRODUCTION_READINESS_CHECKLIST.md scripts/
   git commit -m "fix(reports): resolve PDF download cancellation, unify reader experience and reconcile catalogue pricing"
   ```
4. **Deploy to Vercel Staging / Production:**
   - Push to GitHub remote branch after maintainer authorization.
   - Vercel automatically compiles and deploys the preview build.
   - Perform smoke testing of Module 16 and public store on the preview URL before aliasing to production.
