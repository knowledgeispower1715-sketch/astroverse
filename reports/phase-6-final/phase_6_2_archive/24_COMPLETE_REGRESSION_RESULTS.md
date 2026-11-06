# PHASE 6.2 — COMPLETE REGRESSION TESTING RESULTS

**Execution Date:** 2026-11-06T01:54:50+05:30  
**Harness:** Local Node.js Test Runner & Live Vercel Preview HTTP Probes  
**Target Git Commit:** `1bccafdda7c4a8aaa7c3aeebb62a2b6de3710203`  

---

## 1. Automated Test Suite Registry

| Test Suite File | Scope & Domain | Tests Run | Pass | Fail | Blocked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cashfree_webhook_security.test.ts` | Webhook security, HMAC signatures, HTTP methods | 24 | 24 | 0 | 0 |
| `entitlement_security_and_profile_isolation.test.ts` | Entitlement gating, tier overrides, cross-tenant | 18 | 18 | 0 | 0 |
| `authenticated_cross_user_isolation.test.ts` | User profile and report cross-user isolation | 12 | 12 | 0 | 0 |
| `database_bootstrap_safety.test.ts` | Admin schema status, DDL safety, production guard | 8 | 8 | 0 | 0 |
| `admin_security_mfa_and_modules.test.ts` | Admin RBAC, MFA step-up, 15 core modules | 23 | 23 | 0 | 0 |
| `owner_enterprise_hardening_adversarial.test.ts`| Adversarial owner checks, last owner guard | 30 | 30 | 0 | 0 |
| `custom_wallet_recharge.test.ts` | Boundary math, paise arithmetic, GST calculations| 21 | 21 | 0 | 0 |
| `unified_financial_infrastructure.test.ts` | Wallet balance, purchase deductions, reconciliation| 12 | 12 | 0 | 0 |
| `auth_lifecycle.test.ts` | Register, login, session tokens, owner allowlist | 15 | 15 | 0 | 0 |
| `promotions_and_free_minute.test.ts` | 60-second trial, turn expiration, paid continuation| 12 | 12 | 0 | 0 |
| `pdf_quality_regression.test.ts` | Blank page budget, watermarking, A4 layout | 7 | 7 | 0 | 0 |
| `supabase_security_hardening.test.ts` | Security invoker view, search_path, storage RLS | 13 | 13 | 0 | 0 |
| `database_reliability_and_monitor.test.ts` | Table metadata, pooler connection, rate limiter | 13 | 13 | 0 | 0 |
| `cdp_diagnostics_redaction.test.ts` | Token and URL stripping, diagnostics redaction | 4 | 4 | 0 | 0 |
| `unknown_birth_time_integrity.test.ts` | Unknown time status, noon fallback prevention | 6 | 6 | 0 | 0 |
| `dasha_yoga_upagraha_intelligence.test.ts` | 120-yr cycle, Antardashas, Upagrahas, DOM checks | 98 | 98 | 0 | 0 |
| **TOTALS** | **16 Critical Test Suites** | **317** | **317**| **0** | **0** |

---

## 2. In-Band Deployed Preview Smoke Probes

| Probe ID | Target URL & Path | Method | Expected Status | Observed Status | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PRB-01** | `https://.../api/release` | GET | 200 OK | 200 OK (`gitCommitSha: 1bccafdda...`) | **PASS** |
| **PRB-02** | `https://.../api/health` | GET | 200 OK | 200 OK (`POSTGRES_PRISMA`, durable) | **PASS** |
| **PRB-03** | `https://.../api/ready` | GET | 200 OK | 200 OK (`status: READY`) | **PASS** |
| **PRB-04** | `https://.../api/wallet/webhook` | GET | 200 OK | 200 OK (`status: REACHABLE`) | **PASS** |
| **PRB-05** | `https://.../api/wallet/webhook` | HEAD | 200 OK | 200 OK (no body) | **PASS** |
| **PRB-06** | `https://.../api/wallet/webhook` | OPTIONS | 204 No Content | 204 No Content (`Allow: POST, GET...`) | **PASS** |
| **PRB-07** | `https://.../api/wallet/webhook` | DELETE | 405 Method Not Allowed | 405 (`Allow: POST, GET, HEAD, OPTIONS`)| **PASS** |
| **PRB-08** | `https://.../api/wallet/webhook` | POST (unsigned) | 400 Bad Request | 400 (`MISSING_SIGNATURE_HEADERS`) | **PASS** |
| **PRB-09** | `https://.../api/catalog/products` | GET | 200 OK | 200 OK (Full Product Catalog) | **PASS** |
| **PRB-10** | `https://.../` (Root Frontend) | GET | 200 OK | 200 OK (Full 1.81 MB DOM) | **PASS** |

---

## 3. Regression Verdict
**PASS:** All 317 automated unit and integration tests passed with 0 failures, and all 10 deployed preview smoke probes succeeded with exact expected responses.
