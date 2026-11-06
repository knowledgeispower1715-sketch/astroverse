# ASTROVERSE AI — PHASE 6.3 BLOCKED & NOT TESTED ITEMS REGISTER

**Document Reference:** `reports/phase-6-final/19_BLOCKED_AND_NOT_TESTED.md`  
**Classification:** Release Governance, Boundary Control & Safety Exclusions  
**Status:** AUDITED & GOVERNED  

---

## 1. Explicit Exclusions & Safety Invariants

To guarantee production security, business continuity, and data protection, the following actions were deliberately **NOT EXECUTED** against live production infrastructure:

| Item Code | Operation Description | Environment Affected | Governance Justification | Status |
| :--- | :--- | :--- | :--- | :---: |
| **BLK-01** | Production Database DDL / Migrations | Live Supabase PostgreSQL | Executing schema alterations without explicit owner maintenance window risks locking production tables. | **GOVERNED** |
| **BLK-02** | Production Customer Data Alterations | Live Supabase PostgreSQL | Mutating live customer records, emails, or passwords violates privacy regulations and enterprise compliance. | **GOVERNED** |
| **BLK-03** | Real Money Payment Charges / Debits | Live Cashfree Production | Dispatched payments using real bank accounts or corporate cards would create fraudulent financial transactions. | **GOVERNED** |
| **BLK-04** | Live Production Refund Executions | Live Cashfree Production | Triggering gateway refunds on live merchant balance without real chargebacks is prohibited. | **GOVERNED** |
| **BLK-05** | Direct Git Push to `main` | GitHub Repository | Bypassing peer review and merging PR #1 without human owner approval violates repo guidelines. | **GOVERNED** |
| **BLK-06** | Promotion of Preview to Production | Vercel Deployment Console | Production promotions require manual confirmation by the repository owner after formal verification review. | **GOVERNED** |

---

## 2. Alternative Non-Production Evidentiary Basis

For all governed operations, complete equivalent verification was achieved in isolated, non-production environments:
- **Cashfree Payment Workflows:** Validated using genuine Cashfree API v6 Sandbox test orders, payment IDs, and webhook signatures.
- **Database Hardening:** Validated using an isolated local PostgreSQL database and transactional test suites.
- **Tenant Isolation:** Validated using dedicated synthetic test customer accounts (`usr_recon_alpha`, `usr_recon_beta`).
