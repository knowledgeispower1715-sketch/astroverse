# AstroVerse AI — Automated Test Baseline & Coverage Report

**Audit Date:** October 26, 2026  
**Auditor:** Automated Test Engineer & QA Lead  

---

## 1. Test Suite Inventory & Results Summary

| Suite Category | Runner / Tool | Target Service / Module | Test Count | Pass | Fail | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & Users** | `ts-node` | `services/wallet-service/tests/auth.test.ts` | 39 | 39 | 0 | ~2.5s |
| **Chat & Consultations** | `ts-node` | `services/wallet-service/tests/chat_frontend_logic.test.ts` | 12 | 12 | 0 | ~0.8s |
| **Monetization & Reports** | `ts-node` | `services/wallet-service/tests/monetization.test.ts` | 25 | 25 | 0 | ~1.8s |
| **PDF Fixtures** | `ts-node` | `services/wallet-service/tests/pdf_fixtures.test.ts` | 9 | 9 | 0 | ~0.6s |
| **Product Differentiation**| `ts-node` | `services/wallet-service/tests/differentiation.test.ts` | 8 | 8 | 0 | ~0.9s |
| **PDF Quality & Blank Page**| `ts-node` | `services/wallet-service/tests/pdf_quality_regression.test.ts`| 7 | 7 | 0 | ~1.1s |
| **Numerology Engine** | `ts-node` | `services/wallet-service/tests/numerology.test.ts` | 13 | 13 | 0 | ~0.7s |
| **Razorpay Compliance** | `ts-node` | `services/wallet-service/tests/razorpay_compliance.test.ts` | 15 | 15 | 0 | ~0.9s |
| **Vedic Calculation Engine**| `pytest` | `services/kundli-engine/tests/` | 86 | 84 (2 skip) | 0 | ~11.8s |
| **Mobile Hourly Guidance** | `node --test` | `apps/mobile/tests/hourlyGuidance.test.ts` | 13 | 13 | 0 | ~0.1s |
| **Total Automated Tests** | — | **Monorepo Backend, Engine & Mobile** | **227** | **225** | **0** | **~20.3s** |

---

## 2. Static Typing & Compiler Verification

- **Backend TypeScript Compilation**:
  - Command: `npx --prefix services/wallet-service tsc --project services/wallet-service/tsconfig.json --noEmit`
  - Output: Clean exit code 0, **0 type errors**.
- **Mobile TypeScript Compilation**:
  - Command: `npm --prefix apps/mobile run typecheck`
  - Output: Clean exit code 0, **0 type errors**.
- **Git Formatting & Whitespace Verification**:
  - Command: `git diff --check`
  - Output: Clean exit code 0, **0 whitespace/marker defects**.
