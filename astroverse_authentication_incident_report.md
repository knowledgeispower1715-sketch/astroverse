# ASTROVERSE — P0 AUTHENTICATION INCIDENT & ROOT CAUSE REPORT

**Incident ID:** INC-2026-AUTH-P0  
**Date:** October 29, 2026  
**Severity:** P0 — Critical Functional Incident (Authentication & Account Access)  
**Target Environment:** Production (`https://astroverse-eta.vercel.app/`) & Local Gateway (`services/wallet-service`)  
**Git Commit Baseline:** `ce872e70d`  
**Lead Investigator:** Principal IAM Architect & Full-Stack SRE  

---

## 1. Executive Summary

A comprehensive investigation into AstroVerse's deployed authentication system was conducted following reports that user registration, email/password login, and Google sign-in failed on the live application, accompanied by the visible warning:
> `"Cloud Database Setup Pending: Production cloud storage requires a connected PostgreSQL database (DATABASE_URL)..."`

Using clean headless Chrome browser sessions (via Chrome DevTools Protocol) and direct API probes against the live Vercel production deployment (`https://astroverse-eta.vercel.app/`), all reported failures were successfully reproduced and isolated to five concrete root causes.

---

## 2. Reproduction Evidence & Observed Failures

### 2.1 Direct Backend Registration Probe (`POST /api/auth/register-password`)
- **Request:**
  ```http
  POST https://astroverse-eta.vercel.app/api/auth/register-password
  Content-Type: application/json
  {
    "displayName": "Test User",
    "email": "test_direct_reg_user@gmail.com",
    "password": "[REDACTED]"
  }
  ```
- **Observed Response:**
  ```http
  HTTP/1.1 500 Internal Server Error
  Content-Type: application/json
  {
    "error": "\nInvalid `prisma.user.create()` invocation:\n\n\nThe table `public.User` does not exist in the current database."
  }
  ```
- **Finding:** In production, `DATABASE_URL` is configured, causing `db.ts` to instantiate Prisma Client (`this.isPostgresAvailable = true`). However, **Prisma migrations have never been deployed to the PostgreSQL database**. The tables `public.User`, `public.BirthProfile`, `public.SavedReport`, etc. do not exist, causing every database write to fail with a fatal 500 error.

### 2.2 Direct Backend Readiness Probe (`GET /api/ready`)
- **Observed Response:**
  ```http
  HTTP/1.1 200 OK
  Content-Type: application/json
  {
    "status": "READY",
    "persistence": "POSTGRES_PRISMA",
    "guestModeAvailable": true,
    "supabaseConnected": true
  }
  ```
- **Finding:** The `/api/ready` endpoint verified that `DATABASE_URL` is non-empty, but Prisma Client constructor never validates table existence. The backend falsely reported readiness despite missing schema tables.

### 2.3 Supabase Auth Direct Signup Probe (`POST /auth/v1/signup`)
- **Observed Response for standard email (`astroverse_tester_2026@gmail.com`):**
  ```http
  HTTP/1.1 200 OK
  {
    "id": "225a84c8-136a-4b7f-9268-269f6981d42a",
    "confirmation_sent_at": "2026-10-29T09:31:23Z",
    "user_metadata": { "email_verified": false },
    "session": null
  }
  ```
- **Observed Response for subsequent immediate login (`POST /auth/v1/token?grant_type=password`):**
  ```http
  HTTP/1.1 400 Bad Request
  {
    "code": 400,
    "error_code": "email_not_confirmed",
    "msg": "Email not confirmed"
  }
  ```
- **Finding:** In the Supabase project (`https://nzeutydhfxhjufacqren.supabase.co`), **email confirmation is enabled by default**. When a new customer registers, Supabase creates the user record and sends an email confirmation link, but returns `session: null`. Because Supabase's free tier uses a rate-limited shared email service, users either do not receive the confirmation or attempt to sign in immediately and receive an unhandled `email_not_confirmed` rejection.

### 2.4 Supabase Google OAuth Provider Probe (`GET /auth/v1/authorize?provider=google`)
- **Observed Response:**
  ```http
  HTTP/1.1 400 Bad Request
  {
    "code": 400,
    "error_code": "validation_failed",
    "msg": "Unsupported provider: provider is not enabled"
  }
  ```
- **Finding:** Google OAuth is **not enabled** in the Supabase project settings. When customers click "Continue with Google", Supabase rejects the OAuth initiation with `Unsupported provider: provider is not enabled`.

### 2.5 Frontend Input & Modal Defects (`index.html`)
- In `#auth-modal`, the registration tab displayed `Mobile Number` as a prominent field and `Email Address (Optional)`. When users submitted registration with only a phone number, Supabase Auth was bypassed, falling back to `/api/auth/register-password`, which crashed on the missing `public.User` table.
- When Supabase returned `email_not_confirmed` or invalid email during registration, error messages were not translated into clear user guidance.

---

## 3. Structural Root Cause Analysis

| Component | Symptom | Exact Root Cause |
|:---|:---|:---|
| **PostgreSQL Database** | 500 error on registration & synchronization | Prisma migrations were never executed against the PostgreSQL database pointed to by `DATABASE_URL`. The table `public.User` does not exist. |
| **Backend Gateway (`db.ts`)** | Crashing instead of self-healing | `db.ts` assumed `PrismaClient` initialization guarantees schema readiness. It lacks automatic DDL bootstrap and re-threw Prisma errors rather than falling back gracefully. |
| **Supabase Project Auth** | `email_not_confirmed` 400 error | Supabase project requires email confirmation before issuing a session, leaving unconfirmed users locked out of password sign-in. |
| **Supabase Social Auth** | `Unsupported provider: provider is not enabled` | Google provider is disabled in Supabase project authentication settings. |
| **Client UI (`index.html`)** | Misleading errors and input confusion | Form had phone-first registration instead of email-first; error handling for `email_not_confirmed` was absent; Google button did not handle disabled provider gracefully. |

---

## 4. Comprehensive Remediation Blueprint

1. **Automated Database Schema Self-Healing Bootstrap (`db.ts`):**
   Implement an automated schema bootstrap in `services/wallet-service/src/db.ts`. On startup or first query, if PostgreSQL is connected, the server tests table existence. If `public.User` does not exist, it runs the complete DDL script (`CREATE TABLE IF NOT EXISTS ...`, `CREATE TYPE IF NOT EXISTS ...`, `CREATE INDEX ...`) to establish all application tables automatically.
2. **Resilient Failover in `db.ts`:**
   If PostgreSQL encounters connection errors or missing tables, `db.ts` must fall back to its internal resilient data engine (`this.data`) rather than returning fatal 500 errors to users.
3. **Refactored Registration & Login UI (`index.html`):**
   - Clean 2-tab interface: **Sign In** and **Create Account**.
   - Email is mandatory; password with strength indicator; confirm password validation; display name optional.
   - Clear handling for email confirmation states: `"Verification link sent! Check your inbox to activate your account, then sign in."`
   - Unified Google button with fallback guidance.
4. **End-to-End Google OAuth Setup Documentation:**
   Document exact callback URLs and Google Cloud Console settings for Supabase integration:
   `https://nzeutydhfxhjufacqren.supabase.co/auth/v1/callback`
5. **Password Recovery Flow:**
   Ensure password reset requests dispatch properly through Supabase and fall back cleanly with neutral success messaging.
6. **Automated Verification:**
   Verify all flows through automated browser tests (CDP/Playwright) and unit test suites before production release.
