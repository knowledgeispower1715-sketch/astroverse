# REMAINING BLOCKERS & PRODUCTION RELEASE PRE-CONDITIONS

**Phase:** 3.3 Supabase Security Remediation & Admin Platform Hardening  
**Target:** Owner Sign-off for Production Migration

---

## 1. Operational & Infrastructure Blockers

| # | Item | Category | Blocker Description | Required Resolution |
|---|---|---|---|---|
| **1** | **Vercel Preview SSO Gate** | **Environment / Auth** | The Preview Admin URL (`https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app/admin`) redirects to Vercel Team SSO login (`https://vercel.com/login?next=...`). Automated tests without Vercel team credentials cannot interact with the remote deployment UI. | Maintainer/Owner to provide a preview deployment bypass token or review via logged-in Vercel session. |
| **2** | **Supabase Free Tier HIBP Check** | **Plan Restriction** | Supabase Leaked Password Protection (HaveIBeenPwned API integration) is locked on the Free Plan for project `supabase-byzantine-nest` (`BLOCKED_PLAN_REQUIREMENT`). | Requires upgrading organization to Supabase Pro/Enterprise tier to toggle in Supabase Dashboard. |
| **3** | **Production Migration Execution** | **Governance** | Migration `20261104_07_fix_security_advisor_hardening.sql` contains blocking `RAISE EXCEPTION` assertions and must be applied to the live production database during a scheduled maintenance window. | Owner execution of migration via Supabase CLI or SQL Editor following PR #1 merge approval. |

---

## 2. Invariant Standard Notice

In accordance with Gravitas Invariant 6 ("Mark uncertain or unverifiable claims explicitly instead of fabricating certainty"), these three blockers are explicitly declared. No synthetic workarounds or fabricated credentials were used to bypass these genuine environment boundaries.
