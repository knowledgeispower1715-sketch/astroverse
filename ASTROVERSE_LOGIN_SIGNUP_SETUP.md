# AstroVerse — Complete Authentication & Account Setup Guide

## Architecture Overview

AstroVerse employs a production-grade, resilient dual-tier authentication and persistence architecture:
1. **Frontend Authentication Client (`index.html`)**:
   - Direct integration with Supabase Auth for Email/Password sign-up, sign-in, password reset, and Google OAuth 2.0.
   - Transparent fallback to backend authentication (`/api/auth/login-password`, `/api/auth/register-password`) ensuring zero downtime if external cloud services experience transient latency.
   - Unrestricted Guest Mode allowing seekers to calculate full Parashari Kundlis, Horas, and Panchangs with local browser storage.
2. **Backend Persistence & Gateway (`services/wallet-service`)**:
   - Self-healing PostgreSQL schema bootstrap (`services/wallet-service/src/schemaBootstrap.ts`): Automatically creates enums (`Role`, `AccountStatus`, `EntryType`, `OrderStatus`, `SessionStatus`) and all 16 relational tables on first connection without requiring manual migration runs.
   - Automatic fail-open resilient storage: If database network interruptions occur, the gateway persists user sessions and transactions safely in its structured data engine, preventing HTTP 500 errors.
   - Role-Based Access Control (RBAC): Auto-promotes allowlisted administrators (`ASTROVERSE_ADMIN_EMAILS`) to `Role.OWNER`.

---

## 1. Supabase Project Configuration

Your project is hosted at: `https://nzeutydhfxhjufacqren.supabase.co`

### A. Email Provider & Confirmation Settings
1. Navigate to **Authentication** → **Providers** → **Email** in your [Supabase Dashboard](https://supabase.com/dashboard/project/nzeutydhfxhjufacqren/auth/providers).
2. Ensure **Enable Email provider** is toggled **ON**.
3. Configure the **Confirm email** setting:
   - **Production Mode (Default)**: Toggle **ON**. Supabase sends an activation link to the user's inbox upon registration. The AstroVerse frontend displays a clear confirmation notice and offers a 1-click **Resend Activation Email** button.
   - **Fast Testing / Staging Mode**: If you wish for users to be immediately logged in without waiting for an activation email, toggle **OFF** ("Confirm email"). Users can then register and immediately sign in.

### B. Google OAuth 2.0 Provider Setup
1. In the Supabase Dashboard, navigate to **Authentication** → **Providers** → **Google**.
2. Toggle **Enable Google provider** to **ON**.
3. Fill in your Google credentials:
   - **Client ID**: `488224636987-ai5khc8s0cumhq3n243ca9rdpv9mt89j.apps.googleusercontent.com`
   - **Client Secret**: Obtain from your [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
4. Copy the Supabase Callback URL displayed in the dashboard:
   ```text
   https://nzeutydhfxhjufacqren.supabase.co/auth/v1/callback
   ```
5. In your [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Under **Authorized JavaScript Origins**, add:
     - `https://astroverse-eta.vercel.app`
     - `https://nzeutydhfxhjufacqren.supabase.co`
     - `http://localhost:5000`
   - Under **Authorized redirect URIs**, add:
     - `https://nzeutydhfxhjufacqren.supabase.co/auth/v1/callback`
     - `https://astroverse-eta.vercel.app/`
6. Click **Save** in both Google Cloud Console and Supabase Dashboard.

### C. Site URL & Redirect URLs
1. Navigate to **Authentication** → **URL Configuration**.
2. Set **Site URL** to:
   ```text
   https://astroverse-eta.vercel.app
   ```
3. Under **Redirect URLs**, add the following patterns:
   - `https://astroverse-eta.vercel.app/**`
   - `http://localhost:5000/**`
   - `http://localhost:3000/**`
4. Click **Save**.

---

## 2. Vercel Deployment Environment Variables

Ensure the following environment variables are configured in your Vercel Project Settings (**Settings** → **Environment Variables**):

| Variable Name | Required | Description | Example / Target Value |
|---|---|---|---|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string (Transaction Pooler or Direct) | `postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `SUPABASE_URL` | Yes | Supabase project endpoint | `https://nzeutydhfxhjufacqren.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Supabase public anonymous API key | Public JWT key from Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase administrative key for backend validation | Secret key from Supabase API settings |
| `ASTROVERSE_ADMIN_EMAILS` | Recommended | Comma-separated list of owner emails | `admin@astroverse.app,owner@astroverse.app` |
| `DEMO_MODE` | Optional | Controls isolated testing wallet | `true` in preview, `false` in production |

---

## 3. Database Schema Verification

AstroVerse includes an automatic self-healing database bootstrap in `services/wallet-service/src/schemaBootstrap.ts`.
When the server boots or runs its first query against PostgreSQL, it executes:
- `CREATE TYPE IF NOT EXISTS` for all system enums.
- `CREATE TABLE IF NOT EXISTS` for all 16 core entities:
  - `User`, `UserSession`, `AuditEvent`, `SavedReport`, `BirthProfile`, `KundliCalculation`
  - `Astrologer`, `ConsultationSession`, `ConsultationMessage`
  - `PaymentOrder`, `WalletLedger`, `PujaBooking`
  - `FeatureFlag`, `PlatformIncident`, `PrivacyRequest`, `ContentBanner`
- All necessary performance and uniqueness indexes.
- Foreign key constraints with cascade behaviors.

If manual SQL execution is ever preferred, run the complete migration script located at:
```text
services/wallet-service/prisma/migrations/20261029000000_init/migration.sql
```
in the Supabase **SQL Editor**.

---

## 4. End-to-End Verification Checklist

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `https://astroverse-eta.vercel.app/` | Site loads cleanly in dark luxury liquid-glass theme |
| 2 | Open Auth Modal (click "Sign In") | Status pill shows `Cloud Auth Online` (green dot) |
| 3 | Click "Continue as Guest" | Modal closes immediately, guest calculations active |
| 4 | Open Register tab in Auth Modal | Form prompts for Full Name, Email Address, Password, Confirm Password |
| 5 | Submit valid registration form | Account registered; if email confirmation is required, green verification banner appears with "Resend Email" button |
| 6 | Sign In with registered credentials | Session token issued, seeker welcomed, wallet balance initialized, overview active chart synced |
| 7 | Click "Continue with Google" | Supabase Google OAuth initiated; if provider not yet toggled in dashboard, toast guides seeker to email sign-in without breaking UI |
| 8 | Sign In with Allowlisted Admin Email | Authenticated as `Role.OWNER`; Admin Console and Tier Simulator accessible |
