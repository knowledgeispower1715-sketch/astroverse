# 13. BLOCKED & NOT TESTED ITEMS REGISTER

**Target Application:** AstroVerse AI  
**Release Target:** Phase 5 — Exhaustive Admin Control Centre Audit & Remediation  
**Status:** Explicit Fail-Closed Environmental & Safety Governance  

---

## 1. Safety Blockers Register

In accordance with strict operating boundaries and non-negotiable enterprise safeguards, the following operations were intentionally prevented from executing against live production systems:

| Item ID | Description | Scope / Target | Blocker Reason & Enforcement Rule | Safe Validation Alternative Executed | Status |
|:---|:---|:---|:---|:---|:---:|
| **BLOCK-01** | Production Database DDL & Schema Migration Execution | `supabase-byzantine-nest` (`https://astroverse-eta.vercel.app/`) | **Strictly Forbidden:** Production is 100% READ-ONLY. Zero automated DDL, migrations, or table drops. | DDL invariants verified locally via `tests/real_postgres_security_hardening.test.ts`. Production migration `20261104_07_fix_security_advisor_hardening.sql` prepared for manual human execution. | **BLOCKED (BY DESIGN)** |
| **BLOCK-02** | Live Customer Financial Transactions & Real Refunds | Cashfree Production API (`api.cashfree.com/pg`) | **Strictly Forbidden:** Real customer cards, bank accounts, or real monetary debits/credits must never be executed during automated testing. | Cashfree Sandbox protocol (`sandbox.cashfree.com/pg`), mock payment webhooks, and integer paise math verified in `tests/cashfree_forensic_and_safety.test.ts`. | **BLOCKED (BY DESIGN)** |
| **BLOCK-03** | Merging GitHub Pull Request #1 into `main` | GitHub Repository `knowledgeispower1715-sketch/astroverse` | **Strictly Forbidden:** PR #1 must remain OPEN and UNMERGED until final human owner executive review. | PR #1 head verified at `748cc320dd8c284fa7cb31c2afbdf49c087ee3f9`, state `OPEN`, mergeable `MERGEABLE`. | **BLOCKED (BY DESIGN)** |
| **BLOCK-04** | Direct Production Mutation of Customer Accounts | Live `User` table on Production | **Strictly Forbidden:** Production customer records cannot be modified, suspended, or demoted as test fixtures. | Synthetic admin test fixtures, isolated memory stores, and test users (`test-admin@astroverse.test`) utilized exclusively. | **BLOCKED (BY DESIGN)** |
| **BLOCK-05** | Production Vercel CLI Deployment (`vercel --prod`) | Production Host `https://astroverse-eta.vercel.app/` | **Strictly Forbidden:** Deployments to production must only be triggered following human owner sign-off and PR merge. | Verified exclusively against preview deployment `https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app`. | **BLOCKED (BY DESIGN)** |
| **BLOCK-06** | Browser Session Token Extraction & Fake Identity Injection | Remote Chrome CDP Port 9222 | **Strictly Forbidden:** Zero export or serialization of cookies, tokens, or browser storage keys to disk or git. Fake `sessionStorage` injection prohibited. | Remote CDP inspection evaluated DOM attributes and `/api/release` directly without inspecting or persisting authentication tokens. | **BLOCKED (BY DESIGN)** |

---

## 2. Unverified Items

- **Physical Cashfree Bank Settlement:** Verification of automated daily bank payout settlements (UTR matching) is dependent on real bank settlement cycles and cannot be simulated in sandbox.
- **Physical SMS OTP Delivery:** Actual carrier GSM SMS transmission was not executed; verified using server-side OTP dispatch handlers and preview test codes.
