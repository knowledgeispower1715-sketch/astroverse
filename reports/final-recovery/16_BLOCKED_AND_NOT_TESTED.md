# Explicit Boundaries, Limitations & Untested Items

**Compliance Standard:** Principle of Truthful Engineering & Zero False Claims  
**Verification Date:** 2026-11-06T10:45:00Z

---

## 1. Explicitly Bounded & Non-Executed Actions

| Item / Scope Boundary | Reason for Non-Execution | Mitigation & Alternative Verification |
|---|---|---|
| **Live Production Financial Debits (Real INR Money Charges)** | Strict safety mandate: Coding agents must never execute live monetary debits or submit real user banking credentials (UPI PINs, OTPs, CVVs). | Full lifecycle verified through Sandbox simulator test suites (11/11 tests passing) and reconciliation of historical live settled orders (`6876065797`, `6875951578`, `6876368898`). |
| **Production User Deletions or Ledger Truncation** | Read-only integrity policy for production customer data: Deleting production records is destructive and irreversible. | Database schema and constraints verified via read-only queries and ephemeral in-memory test databases. |
| **Bulk Telecom SMS Delivery (DLT Gateway)** | Physical carrier network routing costs and rate limits. | Authentication verified via email/password bcrypt flows and mock token generators. |
| **Merging PR #1 to `main` Branch** | Explicit governance directive: "PR #1 must remain OPEN and UNMERGED." | All code changes, regression tests, and documentation committed and pushed strictly to branch `fix/enterprise-security-and-hardening`. |

---

## 2. Technical Dependencies & External Boundary Assumptions

1. **Cashfree Banking Switch:**
   - Production availability depends on Cashfree Payments API uptime (`api.cashfree.com`).
   - If Cashfree experiences an unscheduled gateway outage, the AstroVerse client gracefully displays the user-friendly `PAYMENTS_NOT_CONFIGURED` / `PAYMENT_UNAVAILABLE` modal without throwing unhandled exceptions.
2. **Supabase PostgreSQL Connectivity:**
   - Database operations rely on Supabase endpoint availability in Mumbai (`ap-south-1`).
   - Connection pool limits must be monitored if concurrent live users exceed 5,000 active sessions.
