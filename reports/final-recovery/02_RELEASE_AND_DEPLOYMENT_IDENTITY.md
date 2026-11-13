# ASTROVERSE AI — RELEASE AND DEPLOYMENT IDENTITY RECONCILIATION

**Report ID:** `AV-REP-REL-20261106-02`  
**Classification:** Enterprise Release Assurance & Source Lineage Reconciliation  
**Date:** `2026-11-06T16:07:00+05:30`  
**Branch:** `fix/enterprise-security-and-hardening`

---

## 1. IDENTITY MATRIX

| Environment / Asset | Canonical Host / Reference | Commit SHA | Deployment Identity / Status |
|---|---|---|---|
| **Production Domain** | `https://astroverse-eta.vercel.app` | `44285d70818458c4dfd0cfb6db199259d27db599` | Deployed (Active Production) |
| **Preview Deployment** | `https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app` | `3f04e6aa5095c1583118bb5e747611ce8998fe19` | `5rs61TNyCe5EWKwMZAn66Etr1xU5` (Ready) |
| **Local Git HEAD** | `e:/rea` | `3f04e6aa5095c1583118bb5e747611ce8998fe19` | Up to date with `origin` |
| **Remote Branch** | `origin/fix/enterprise-security-and-hardening` | `3f04e6aa5095c1583118bb5e747611ce8998fe19` | Clean, synchronized |
| **GitHub PR #1** | `https://github.com/knowledgeispower1715-sketch/astroverse/pull/1` | Base `main` / Head `fix/...` | State: `MERGED` (at `97a59c410`) |

---

## 2. PRODUCTION RUNTIME IDENTITY
* **Endpoint:** `GET https://astroverse-eta.vercel.app/api/ready`
* **Response Status:** `HTTP 200 OK`
* **Payload:**
  ```json
  {
    "status": "READY",
    "persistence": "POSTGRES_PRISMA",
    "guestModeAvailable": true,
    "supabaseConnected": true
  }
  ```

---

## 3. PREVIEW RUNTIME IDENTITY
* **Endpoint:** `GET https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app/api/config`
* **Response Status:** `HTTP 200 OK`
* **Payload:**
  ```json
  {
    "status": "CONFIG_READY",
    "paymentsConfigured": true,
    "readinessState": "READY",
    "readinessMessage": "Online payments are active and secure.",
    "currency": "INR",
    "gateway": "CASHFREE",
    "isLiveGateway": true,
    "cashfreeAppId": "14962482c27cb93db2c6bc6e4af8426941",
    "cashfreeAppIdMasked": "1496...6941",
    "cashfreeEnv": "production",
    "isCashfreeConfigured": true
  }
  ```

---

## 4. DEPLOYMENT DISCREPANCY & RECONCILIATION SUMMARY
1. **Source Discrepancy:** Production container runs commit `44285d708` from `main`, while Preview runs latest commit `3f04e6aa5` on `fix/enterprise-security-and-hardening`.
2. **Harmonized State:** Due to persistent PostgreSQL gateway configuration synchronization (`CASHFREE_GATEWAY_CONFIG`), both Production and Preview endpoints now evaluate `readinessState: 'READY'` and `isCashfreeConfigured: true`.
