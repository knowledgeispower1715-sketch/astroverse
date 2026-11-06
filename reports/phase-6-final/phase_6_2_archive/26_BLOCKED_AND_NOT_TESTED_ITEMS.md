# PHASE 6.2 — BLOCKED AND NOT TESTED ITEMS REGISTER

**Evaluator:** Principal Enterprise Software Architect & Release Governance Lead  
**Evaluation Date:** 2026-11-06T01:55:10+05:30  
**Target Environment:** Production Safeguards & Boundary Declarations  

---

## 1. Strictly Blocked Operations (By Policy & Design)

In accordance with Section 4 (GRAVITAS Invariants) and production protection rules, the following operations were intentionally blocked:

| Item ID | Operation Description | Reason for Blocking | Safe Alternative Executed |
| :--- | :--- | :--- | :--- |
| **BLK-01** | Production Payment Triggering | Real monetary deduction against production Cashfree account | Verified in isolated Cashfree Sandbox and local financial test harnesses |
| **BLK-02** | Production User/Wallet Mutation | Destructive mutation of live customer records or balances | Tested against synthetic test records in staging/preview DB |
| **BLK-03** | Production DDL / Database Migration | Accidental corruption of production Supabase PostgreSQL tables | Verified via migration SQL audit and staging database bootstrap checks |
| **BLK-04** | Direct Promotion to Production (`vercel --prod`)| Bypassing owner review and governance gate | Pushed exclusively to `fix/enterprise-security-and-hardening` (Preview) |
| **BLK-05** | Production High-Volume Load Testing | Risk of rate-limiting production APIs or incurring excess serverless fees | Tested via local bounded concurrency suites and preview single-probe latency |

---

## 2. Items Explicitly Not Tested

| Item ID | Item Scope | Justification & Current State |
| :--- | :--- | :--- |
| **NT-01** | Production Cashfree Live Settlement Reconciliation | Requires settled live bank payouts from Cashfree bank account (T+2 settlement cycle); Sandbox simulated |
| **NT-02** | Real SMS Gateway OTP Delivery | Third-party SMS provider credentials isolated to production; Supabase Auth email/magic link verified |

---

## 3. Governance Conclusion
No blockers impede commercial production readiness. All blocked items represent appropriate risk controls preventing unauthorized production impact.
