# ASTROVERSE AI — GIT & VERCEL DEPLOYMENT REPORT

**Audit Date:** 2026-11-12T05:10:00Z  
**Repository:** `knowledgeispower1715-sketch/astroverse`  
**Authorized Branch:** `fix/enterprise-security-and-hardening`  
**Latest Remote Commit:** `58c990172`  
**Status:** Synchronized with GitHub Origin

---

## 1. Git Synchronization Summary

* **Branch Status:** `fix/enterprise-security-and-hardening` is up to date with `origin/fix/enterprise-security-and-hardening`.
* **Recent Commit Log:**
  * `58c990172`: `fix(admin): resolve Prisma non-nullable subscriptionTier filter in user directory summary`
  * `008097a2f`: `fix(admin-mfa): pass direct verify token to admin session sync and enforce byte parity`
  * `05c1050fa`: `docs(admin): publish complete administrative platform audit, forensic baseline, and release deliverables`
  * `270af355c`: `feat(security): enforce owner factor authority, separate cryptographic assurance signing key, and classify payment errors`
  * `8be47cbad`: `fix(auth): isolate owner to native Supabase MFA and harden payment offline handling`

---

## 2. Deployment Topology & Environments

### A. Production Environment
* **URL:** `https://astroverse-eta.vercel.app/`
* **Admin URL:** `https://astroverse-eta.vercel.app/admin`
* **Current Deployed SHA:** `44285d70818458c4dfd0cfb6db199259d27db599`
* **Schema Version:** `20261104_07`
* **Payment Mode:** Live Cashfree Production Gateway (`api.cashfree.com/pg`)
* **Note:** Per repository guidelines and owner directives, Production will only be updated upon explicit owner promotion and merge approval.

### B. Vercel Preview Environment
* **URL:** `https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app/`
* **Admin URL:** `https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app/admin`
* **Current Operational SHA:** `58c990172`
* **Authentication Bridge:** Supabase Auth GoTrue Native TOTP MFA (AAL2)
* **Readiness Endpoint (`/api/ready`):**
  ```json
  {
    "status": "READY",
    "persistence": "POSTGRES_PRISMA",
    "guestModeAvailable": true,
    "supabaseConnected": true
  }
  ```
* **Release Endpoint (`/api/release`):**
  ```json
  {
    "application": "astroverse-ai",
    "version": "2.5.0",
    "gitCommitSha": "58c990172",
    "environmentLabel": "preview",
    "schemaVersion": "20261104_07"
  }
  ```

---

## 3. Secret & Credential Sanity Audit

Before pushing to origin, automated checks confirmed:
* Zero `.env` files staged or committed.
* Zero Supabase `service_role` secrets in frontend or committed source.
* Zero Cashfree secret keys in client-side code.
* Zero plain text passwords, TOTP seeds, or user session tokens in Git tree.
* Byte parity strictly enforced between `admin.html` and `apps/admin/index.html`.
