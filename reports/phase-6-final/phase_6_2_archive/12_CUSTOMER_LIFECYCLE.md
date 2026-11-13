# PHASE 6.2 — STAGE I: GUEST-TO-AUTHENTICATED CUSTOMER JOURNEY & MULTI-TENANT ISOLATION

**Evaluator:** Senior Full-Stack Engineer & Identity Architect  
**Evaluation Date:** 2026-11-06T01:51:10+05:30  
**Target Domain:** End-to-End Customer Lifecycle & Cross-Tenant Data Isolation  

---

## 1. Verified Customer Lifecycle Stages

1. **Guest Visit & Anonymous Calculation:**
   - Unauthenticated visitors access `index.html` and generate Kundli charts using browser-ephemeral state.
   - An anonymous guest session ID (`gst_...`) tracks temporary calculation output in sessionStorage without storing PII on the backend.
2. **Seamless Conversion & Supabase Registration:**
   - Guest registers via email/password or Supabase Auth.
   - Gateway endpoint `/api/auth/register-password` creates the persistent `User` record in PostgreSQL with default role `USER` and plan `FREE`.
3. **Guest Data Migration / Claim:**
   - Upon authentication, `claimGuestCalculations()` binds any pending ephemeral birth particulars and calculations to the newly generated `userId`.
4. **Subsequent Session Authentication:**
   - JWT issued by Supabase Auth verified via public JWKS endpoint (`SUPABASE_JWKS_URL`).
   - Session tokens persisted in secure, HttpOnly, SameSite cookies.
5. **Session Termination & Invalidation:**
   - Logout calls `/api/auth/logout`, invalidating backend session tokens and clearing browser cookies. Subsequent requests immediately fail with HTTP 401.

---

## 2. Cross-Tenant Data Isolation Proofs

Automated suite `authenticated_cross_user_isolation.test.ts` verified that Customer A and Customer B are strictly isolated:
- Customer B attempting `GET /api/profiles/item/:id` belonging to Customer A: **HTTP 403 Forbidden**.
- Customer B attempting `GET /api/reports/reader/:id` belonging to Customer A: **HTTP 403 Forbidden**.
- Customer B attempting `PUT /api/profiles/:id` belonging to Customer A: **HTTP 403 Forbidden**.
- Customer B attempting `DELETE /api/reports/:id` belonging to Customer A: **HTTP 403 Forbidden**.
- Customer B attempting to trigger `/api/predictions/generate` using Customer A's `profileId`: **HTTP 403 Forbidden**.
- Password hashes and reset tokens are stripped from all API outputs.

---

## 3. Stage I Verification Verdict
**PASS:** The end-to-end customer journey, guest data claiming, and multi-tenant cross-user data isolation are completely verified.
