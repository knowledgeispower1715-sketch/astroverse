# AstroVerse — Security Architecture & Tier Simulator Audit

**Date:** 29 October 2026  
**Auditor:** Principal Application Security Architect, Staff Full-Stack Engineer & Database Integrity Engineer  
**Scope:** Public Simulator Elimination, Admin Preview Isolation, RBAC Security, Demo Wallet Hygiene & Entitlement Integrity  
**Repository:** `E:\rea`  
**Current Branch:** `feature/premium-reports-and-subscriptions` (Commit: `2caba8c0f`)

---

## 1. Executive Summary

This audit assesses the security boundaries, entitlement models, and simulation infrastructure of AstroVerse.
The previous system exposed subscription simulation controls (`SIMULATE: Free | Plus | Premium`) and demo wallet increment buttons (`+₹100`, `+₹500`, `+₹1,000`) in the public header, navigation drawer, and wallet modal. Ordinary visitors could click these buttons, setting unverified values in `localStorage` (`astro_simulated_tier`, `astro_demo_wallet_bal`), which were then read by multiple client-side components to unlock paid features, alter displayed discount tiers, or bypass daily quotas.

Furthermore, several backend routes inspected `req.headers['x-simulated-tier']` under non-production environments without verifying whether the caller was an authenticated administrator.

This architecture has been thoroughly audited across 10 security vectors. Below are the definitive findings, followed by the remediation plan to relocate simulation into a server-authoritative, session-scoped administrator preview context.

---

## 2. Detailed Vulnerability & Architecture Audit

### 2.1 Where the Public Simulator Controls Were Located
1. **Desktop Header Navigation:** Line 5500 in `index.html` rendered `#header-tier-simulator` containing buttons `#sim-tier-free`, `#sim-tier-plus`, and `#sim-tier-premium` with `onclick="simulateTierFromUI(...)"`.
2. **Mobile Navigation Drawer:** Lines 5590–5596 in `index.html` rendered mobile simulator buttons (`#mob-sim-tier-free`, `#mob-sim-tier-plus`, `#mob-sim-tier-premium`, `#mob-sim-tier-active-badge`).
3. **Public Wallet Modal:** Lines 9032–9034 in `index.html` rendered `+₹100 Demo`, `+₹500 Demo`, `+₹1,000 Demo` quick-credit buttons (`onclick="addDemoCreditsFromUI(...)"`).
4. **Mobile Drawer Wallet Actions:** Line 5606 in `index.html` rendered `+₹500 Demo`.

### 2.2 Storage & Propagation of Simulated Tiers
- **Client Storage:** `simulateTierFromUI(tier)` stored the chosen tier in `localStorage.setItem('astro_simulated_tier', normTier)` without any authentication or role checks.
- **Client Bypass Points:**
  - AI Quota (`index.html:17179`): Bypassed the daily 3-question limit if `localStorage.getItem('astro_simulated_tier')` was `PLUS` or `PREMIUM`.
  - Numerology Studio (`index.html:25939`): Bypassed tab locks for Name Correction and Business Name Analysis based solely on `localStorage.getItem('astro_simulated_tier')`.
  - Report Store (`index.html:19056`): Applied 10% or 20% discounts on premium report pricing based on `localStorage.getItem('astro_simulated_tier')`.
- **Backend Headers:** The frontend transmitted `headers['x-simulated-tier'] = localStorage.getItem('astro_simulated_tier')` to the backend gateway.

### 2.3 Backend Entitlement & Authorization Analysis
- **Authoritative Source of Truth:** `EntitlementManager.resolveEffectiveTier(user)` in `services/wallet-service/src/monetization/entitlements.ts` inspects active subscriptions in `user.subscriptions` and checks validity against `validUntil`.
- **Backend Simulation Vulnerability:** In `server.ts` lines 3992, 4756, and 4930, endpoints accepted `req.headers['x-simulated-tier']` under non-production environments without checking whether `req.user` possessed an administrative role (`OWNER`, `SUPER_ADMIN`, `SECURITY_ADMIN`, etc.).
- **Subscription Simulation Endpoint:** `POST /api/subscriptions/simulate-tier` allowed any authenticated user to mutate `user.simulatedSubscriptionTier` in the database when non-production.

### 2.4 Self-Escalation & Role Security Audit
- `PUT /api/user/profile`: Correctly sanitizes input and strictly prohibits modifications to `role`, `status`, `walletBalance`, `demoWalletBalance`, or `mfaSecret`. Normal users cannot self-escalate roles via profile updates.
- Role checks: Server routes use `requireAdmin(permissionOrRoles)`. However, there was no separate `AdminPreviewSession` entity to bind simulated tiers exclusively to administrative sessions.

### 2.5 Admin Panel & Modules Audit
- An administrative dashboard `#view-admin` (`TAB 10: ADMINISTRATIVE MANAGEMENT CONSOLE`) already exists with 15 management modules, secured by `CANONICAL_ADMIN_ROLES` and backend JWT authentication.
- However, the simulator and premium feature QA testing tools were entirely absent from `#view-admin` and instead floated publicly in the main user navigation.

---

## 3. Inventory of Genuine User Entitlements

| Product Domain | Free / Essentials | Plus Tier | Premium Tier |
|---|---|---|---|
| **Daily AI Questions** | 3 questions / day | 15 questions / day | 30 questions / day |
| **Numerology Studio** | Basic Moolank & Bhagyank | Name Correction & Harmony | Unlimited Name, Business & Mobile |
| **Report Discounts** | Standard Catalogue Price | 10% Off All Reports | 20% Off All Reports |
| **PDF Downloads** | Online Reader Only | Online Reader + Low-res PDF | Full High-res Unrestricted PDF |
| **Consultation Rates** | 1st Min Free, ₹15/min | 1st Min Free, ₹15/min | 1st Min Free, ₹15/min |
| **Divisional Charts** | D1 (Rashi) Only | D1 + D9 (Navamsha) | Full Shodashvarga (D1–D60) |
| **Horas & Guidance** | Current Hora Only | 24-Hour Horizon | 7-Day & 5-Year Mahadasha |

---

## 4. Architectural Remediation Plan

1. **Eliminate Public Controls:** Completely remove `#header-tier-simulator`, mobile drawer tier buttons, and public demo wallet buttons from `index.html`. Do not merely hide with CSS.
2. **Implement Server-Authoritative Admin Preview Session (`AdminPreviewManager`):**
   - Bind preview sessions exclusively to verified admin users (`OWNER`, `SUPER_ADMIN`, `SECURITY_ADMIN`, `ASTROLOGY_OPS_ADMIN`, etc.).
   - Reject any `x-simulated-tier` header unless accompanied by an active admin preview token or verified admin session.
   - Non-admin callers attempting to simulate tiers receive HTTP 403 `FORBIDDEN`.
3. **Move Simulator & Demo Wallet to Admin Console (`#view-admin` Module 3 / Module 16):**
   - Add a dedicated **Admin Tier Preview & Premium QA Console** inside the Admin Management Console.
   - Provide explicit buttons: `Preview as Free`, `Preview as Plus`, `Preview as Premium`, and `Exit Preview Mode`.
   - Provide isolated demo wallet controls (`+₹100`, `+₹500`, `+₹1,000`, `Reset Demo Wallet`) inside the admin console only.
4. **Synthetic Test Data Isolation:**
   - Provide an explicit synthetic test profile selector (`SAMPLE TEST DATA — NOT A CUSTOMER PROFILE`) to test chart calculations and reports safely without touching real customer PII.
5. **Session-Scoped Gating:**
   - When an administrator activates preview mode, display a persistent, non-intrusive banner: `ADMIN PREVIEW MODE — SIMULATED PREMIUM ENTITLEMENTS`.
   - Exiting preview mode immediately terminates the preview session on the server and restores real entitlements.
