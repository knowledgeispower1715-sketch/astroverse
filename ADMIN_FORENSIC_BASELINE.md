# ASTROVERSE AI — ADMINISTRATIVE FORENSIC BASELINE REPORT
**Classification:** Enterprise Platform Security & Architectural Audit  
**Timestamp:** 2026-11-11T11:27:00+05:30  
**Host Environment:** Windows x64 | Node.js v25.1.0 | npm 11.6.2  
**Active Repository:** `knowledgeispower1715-sketch/astroverse`  
**Active Branch:** `fix/enterprise-security-and-hardening`  
**Current HEAD SHA:** `270af355c` (`origin/fix/enterprise-security-and-hardening` synchronized)  
**Production Remote Branch:** `main` (`44285d708`)  

---

## 1. Executive Forensic Overview

A comprehensive audit was performed across the local repository, remote Git branches, deployment configurations, database architectures, authentication models, payment gateways, and browser execution sessions.

### Key Forensic Findings
1. **Repository Synchronization**:
   - Local branch `fix/enterprise-security-and-hardening` is synchronized with `origin/fix/enterprise-security-and-hardening` at commit `270af355c`.
   - Previous milestone repair commits are verified in Git history:
     - `8be47cbad`: Owner native MFA isolation and payment offline handling.
     - `e8a806289`: Resilient admin assurance token signing secrets.
     - `8b5b36551`: Recharge checkout redirect target alignment (`_self`).
     - `f7ca273fe`: Cashfree checkout lifecycle hardening.
   - Master production branch `main` is at `44285d708`.

2. **Network & Infrastructure Connectivity**:
   - Local gateway `192.168.0.1` and public DNS (`8.8.8.8`) verified active and responding with ~21ms latency.
   - GitHub remote fetch/push connectivity is fully restored and operational.
   - Vercel production endpoint (`https://astroverse-eta.vercel.app/api/ready`) responds with HTTP 200 (`status: "READY"`).

3. **Runtime Chrome Session (CDP)**:
   - Google Chrome active and attached via Chrome DevTools Protocol (CDP) on `127.0.0.1:9222`.
   - Active inspected pages:
     - Page 3: `AstroVerse — Administrative Control Centre (https://astroverse-eta.vercel.app/admin)`
     - Page 4: `AstroVerse AI — Vedic Astrology Software & Astrological Calculations Platform (https://astroverse-eta.vercel.app/)`
     - Page 2: `AstroVerse AI Instagram Channel`

4. **Architecture & Service Topology**:
   - **Frontend**: Single-page architecture with dual administrative representations (`admin.html` and `apps/admin/index.html`) maintained under strict 100% byte parity.
   - **Backend**: Express-based `wallet-service` (`services/wallet-service/src/server.ts`) hosting all admin, financial, telemetry, authentication, and catalog endpoints.
   - **Database Layer**: Dual-mode resilience architecture supported by Prisma ORM (`services/wallet-service/prisma/schema.prisma`), connected PostgreSQL instance, and durable local storage fallback (`astroverse_db.json`).
   - **Authentication**: Native Supabase Auth with AAL1/AAL2 Multi-Factor Authentication (MFA), enforcing TOTP step-up for the designated owner.
   - **Payments**: Cashfree Payments API (v2026-01-01) with cryptographic webhook signature verification and server-side integer paise accounting.

---

## 2. Git & Release Lineage

| Commit Hash | Author / Role | Description | Remote Status |
| :--- | :--- | :--- | :--- |
| `270af355c` | System Architect | `feat(security): enforce owner factor authority, separate cryptographic assurance signing key, and classify payment errors` | Pushed (`origin/fix/enterprise-security-and-hardening`) |
| `8be47cbad` | Vercel Deploy | `fix(auth): isolate owner to native Supabase MFA and harden payment offline handling` | Present on origin |
| `e8a806289` | Vercel Deploy | `fix(mfa): provide resilient fallback signing secrets for admin assurance tokens in serverless environment` | Present on origin |
| `8b5b36551` | Vercel Deploy | `fix(payments): align recharge checkout redirect target to hosted self strategy` | Present on origin |
| `f7ca273fe` | Vercel Deploy | `fix(admin-mfa): resolve script syntax error and harden Cashfree checkout lifecycle` | Present on origin |
| `44285d708` | Vercel Deploy | `fix(wallet-service): hoist CASHFREE_WEBHOOK_PATHS declaration before CORS middleware` | Production `main` HEAD |

---

## 3. Deployment Configuration & Edge Routing

### Vercel Routing (`vercel.json`)
- **Admin Routing**:
  - `/admin` rewrites directly to `/admin.html`.
  - `/admin/(.*)` rewrites directly to `/admin.html`.
  - `/api/admin(.*)` routes to the `wallet-service` microservice.
- **Cache Governance**:
  - Route pattern `/(admin.*|api/admin/.*|api/user/.*|api/wallet/.*|api/reports/.*|api/profiles/.*)` enforces `no-store, no-cache, must-revalidate, proxy-revalidate`, completely preventing stale cache delivery in browser sessions.
- **Security Headers**:
  - `Content-Security-Policy`: Strictly allows Cashfree SDK scripts, Supabase connectivity, Google OAuth, and Open-Meteo geocoding.
  - `X-Frame-Options`: `DENY`.
  - `Permissions-Policy`: Restricts camera, microphone, and geolocation; allows payment for Cashfree origins.
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`.

---

## 4. Known Forensic Defects & Remediation Status

| Defect ID | Component | Description | Remediation State | Regression Test |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | `server.ts` | Owner factor authority previously allowed DB `mfaEnabled` flag to substitute for verified Supabase factor | **RESOLVED** in `270af355c` (Postgres flag ignored for owner; verified Supabase factor strictly required) | `admin_supabase_mfa_assurance.test.ts` (Tests 24-29) |
| **DEF-002** | `security/mfa.ts` | Step-up assurance signing secret previously fell back to Cashfree or Supabase secret keys | **RESOLVED** in `270af355c` (`ADMIN_ASSURANCE_SIGNING_KEY` isolated with 32-byte entropy requirement) | `admin_supabase_mfa_assurance.test.ts` (Tests 15-17) |
| **DEF-003** | `index.html` | Payment order creation network timeouts / DNS drops were displayed as generic "Gateway unavailable" | **RESOLVED** in `270af355c` (Differentiated `TypeError` offline drops from HTTP 401/403/503/5xx errors) | Tested via CDP & manual injection |
| **DEF-004** | `admin.html` | Owner login previously fell through to legacy password+totp endpoint upon factor challenge failure | **RESOLVED** in `8be47cbad` (Owner routed strictly to native Supabase MFA; legacy endpoint returns HTTP 403) | `admin_supabase_mfa_assurance.test.ts` (Test 6) |
| **DEF-005** | `cashfree.ts` | Payment return URL previously failed to enforce `redirectTarget: "_self"` on mobile checkouts | **RESOLVED** in `8b5b36551` (Enforced hosted redirect across wallet, subscriptions, and report checkouts) | `cashfree_forensic_and_safety.test.ts` (Section A) |

---

## 5. Architectural Invariants Verification

1. **Owner Factor Isolation**: Only the immutable owner identity (`b204eff9-1a9b-4805-8c07-c35d3a9de3ee` / `tiwariji0028@gmail.com`) is bound to mandatory Supabase Native TOTP. Non-owner staff/support accounts follow standard policy.
2. **Byte Parity**: File parity check between `admin.html` and `apps/admin/index.html` confirmed identical (`0 byte diff`).
3. **Data Provenance System**: 6-tier provenance system (`LIVE`, `AGGREGATED`, `CACHED`, `FALLBACK`, `SYNTHETIC`, `DEMO`) active and asserted across all 22 modules.
4. **Zero Destructive Production Mutations**: Production safeguards prevent destructive schema drops or un-audited ledger modifications.
