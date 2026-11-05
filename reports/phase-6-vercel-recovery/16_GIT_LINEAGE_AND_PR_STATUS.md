# PHASE 6.1 — GIT LINEAGE AND PR STATUS

**Repository:** `https://github.com/knowledgeispower1715-sketch/astroverse`  
**Active Work Branch:** `fix/enterprise-security-and-hardening`  
**Main Branch:** `main`  
**Target Pull Request:** PR #1 (`https://github.com/knowledgeispower1715-sketch/astroverse/pull/1`)  

---

## 1. Lineage & Branch Status

- **PR #1 Status:** `MERGED` into `main` by repo owner at commit `296b759fc` on 2026-11-04 22:47:51 UTC.
- **Post-Merge Lineage on `fix/enterprise-security-and-hardening`:**
  - `296b759fc`: Merged baseline in main (Live production release).
  - `75b9a9c8c`: Initial Cashfree webhook fix on working branch.
  - `b2c03a84b`: Branch merge synchronization.
  - `44285d708`: Hoisted `CASHFREE_WEBHOOK_PATHS` declaration.
  - `2283bd2a4`: Promoted TypeScript dependencies to runtime scope.
  - `73031900b` (**HEAD**): Fixed Vercel schema conflict and added consultation-service dependencies.
- **Production Status:** `https://astroverse-eta.vercel.app` remains pinned to `296b759fc` in read-only mode.
- **Preview Status:** `https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app` is verified on commit `73031900b`.

---

## 2. PR Governance Rules Maintained
1. Zero direct pushes to `main`.
2. No force-pushes or history rewriting.
3. PR #1 recorded as merged by owner; new PR can be opened from `fix/enterprise-security-and-hardening` when release owner authorizes production promotion.
