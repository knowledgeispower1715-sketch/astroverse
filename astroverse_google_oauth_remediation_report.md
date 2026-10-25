# ASTROVERSE GOOGLE AUTHENTICATION REMEDIATION & DEPLOYMENT REPORT

**Date:** October 26, 2026  
**Project:** AstroVerse (`https://astroverse-eta.vercel.app/`)  
**Repository:** `E:\rea`  
**Starting Commit:** `01ac8c70dbe29e3e22d2c741aeb8d534aa9614ff`  
**Released Commit:** `333c805f1cfb69e5d4e1329dc2ebff3f2e14e7a8`  
**Feature Branch:** `feature/premium-reports-and-subscriptions` (synced with `main`)  
**Google Cloud Project ID:** `astroverse-512719`  
**Web Client ID:** `488224636987-ai5khc8s0cumhq3n243ca9rdpv9mt89j.apps.googleusercontent.com`  

---

## 1. Executive Summary & Problem Diagnosis

### The Error Observed by the User
```
Access blocked: Authorisation error no registered origin
Error 401: invalid_client
flowName=GeneralOAuthFlow
```

### Confirmed Root Cause
1. **Missing Authorized JavaScript Origin in Google Cloud Console:**  
   The application at `https://astroverse-eta.vercel.app/` used the Google Identity Services (GIS) OAuth2 Code Popup Client (`google.accounts.oauth2.initCodeClient({ ux_mode: 'popup' })`). When `requestCode()` is executed from the browser, GIS opens an authorization popup with `redirect_uri=postmessage` and sends the browser origin (`https://astroverse-eta.vercel.app`).  
   Google OAuth 2.0 strictly requires that any origin issuing postmessage/popup GIS requests be registered under **Authorized JavaScript origins** for the specific OAuth 2.0 Web Client ID.  
   - In Google Cloud project `astroverse-512719` for client ID `488224636987-ai5khc8s0cumhq3n243ca9rdpv9mt89j.apps.googleusercontent.com`, `https://astroverse-eta.vercel.app/` had been entered only in **Authorized redirect URIs**.
   - **Authorized JavaScript origins** was either empty or missing `https://astroverse-eta.vercel.app` (origins must not have trailing slashes).
   - This exact failure was reproduced via direct OAuth authorization requests: passing `origin=https://astroverse-eta.vercel.app&redirect_uri=postmessage` produced base64 error `Cg5pbnZhbGlkX2NsaWVudBIUbm8gcmVnaXN0ZXJlZCBvcmlnaW4gkQM`, which decodes to:  
     `invalid_client: no registered origin`.

2. **Frontend Path Trapping:**  
   `triggerGoogleSignIn()` in `index.html` exclusively invoked `googleCodeClient.requestCode()`. Because this popup immediately crashed on Google's origin validation, users could not complete sign-in and had no alternative path.

3. **Backend Environment Variable Defaulting on Vercel:**  
   `services/wallet-service/.env` was not deployed to Vercel (correctly gitignored). On Vercel, `process.env.GOOGLE_CLIENT_ID` defaulted to an empty string `""`, preventing `/api/auth/google/config` and server-side token audience verification (`verified.aud === GOOGLE_CLIENT_ID`) from resolving correctly when environment variables had not yet been linked in the Vercel project dashboard.

---

## 2. Engineering Remediation Applied

### A. Frontend Architecture (`index.html`)
1. **Official GIS Credential Sign-In (`google.accounts.id`):**  
   Configured and rendered Google's official iframe button into `#g_id_signin_rendered` via `google.accounts.id.renderButton` and `google.accounts.id.initialize`. Clicking this button returns a signed Google ID Token (`response.credential`) which is verified on the backend without requiring `GOOGLE_CLIENT_SECRET`.
2. **Accessible Full-Page Google Sign-In Fallback:**  
   Added a dedicated, styled fallback button directly beneath the Google button in the authentication modal:  
   `Continue with Full-Page Google Sign-In` (`#btn-google-fullpage-fallback`).  
   Because Google Cloud Console already has `https://astroverse-eta.vercel.app/` in its **Authorized redirect URIs**, full-page redirection is completely unaffected by JavaScript origin restrictions and functions immediately.
3. **Cryptographically Secure OAuth State & CSRF Validation:**  
   Updated `initiateGoogleOAuthFlow()` to generate a 128-bit cryptographic random `state` using `window.crypto.getRandomValues`, cached in `sessionStorage.getItem('astro_oauth_state')` and transmitted as `&state=` to Google.
4. **Clean Redirect Return Handling (`checkGoogleAuthRedirect`):**  
   When Google redirects back to `https://astroverse-eta.vercel.app/?code=...&state=...`:
   - Validates returned state against `sessionStorage.getItem('astro_oauth_state')`. Rejects on mismatch to protect against login fixation.
   - Cleans URL parameters immediately using `window.history.replaceState`.
   - Dispatches code to `${getAuthBase()}/api/auth/google` with `X-Requested-With: XmlHttpRequest` and `redirectUri: 'https://astroverse-eta.vercel.app/'`.
   - Applies session and resumes user workflow seamlessly.

### B. Backend Hardening (`services/wallet-service/src/server.ts`)
1. **Canonical Client ID Fallback:**  
   `GOOGLE_CLIENT_ID` now defaults to `488224636987-ai5khc8s0cumhq3n243ca9rdpv9mt89j.apps.googleusercontent.com` if `process.env.GOOGLE_CLIENT_ID` is not yet populated in Vercel.
2. **Strict Identity Token Verification (`verifyGoogleToken`):**  
   Enforces:
   - Audience check: `verified.aud === GOOGLE_CLIENT_ID`.
   - Issuer check: `verified.iss === 'accounts.google.com' || verified.iss === 'https://accounts.google.com'`.
   - Email verification check: `verified.email_verified === 'true' || verified.email_verified === true` (rejects unverified email addresses).
   - Expiration validation: `verified.exp * 1000 > Date.now()`.
   - Stable identity binding: uses Google `sub` claim for audit tracking and account linking.
3. **Resilient Code Exchange (`exchangeGoogleCode`):**  
   - Detects missing `GOOGLE_CLIENT_SECRET` in environment variables and returns a diagnostic error code (`MISSING_CLIENT_SECRET`) rather than crashing or returning generic errors.
   - Supports both `postmessage` (popup flow) and `https://astroverse-eta.vercel.app/` (redirect flow).
4. **Dedicated OAuth Callback Route:**  
   Added `GET /api/auth/google/callback` to gracefully receive and redirect external OAuth redirects back to the AstroVerse SPA root with sanitized query parameters.
5. **Client Secret Privacy:**  
   Ensured `GET /api/auth/google/config` never exposes `GOOGLE_CLIENT_SECRET`.

---

## 3. Google Cloud Console Configuration Checklist (Project Owner Actions)

To allow the GIS popup and One-Tap buttons to operate without origin errors, the Google Cloud Console must be updated with the following settings:

1. Open **Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Select Project: **`astroverse-512719`**
3. Navigate to: **APIs & Services > Credentials**
4. Under **OAuth 2.0 Client IDs**, select:  
   **`488224636987-ai5khc8s0cumhq3n243ca9rdpv9mt89j.apps.googleusercontent.com`** (Type: *Web application*)
5. **Authorized JavaScript origins** (CRITICAL FIX FOR "no registered origin" ERROR):  
   Click **+ ADD URI** and add:
   ```text
   https://astroverse-eta.vercel.app
   ```
   *(IMPORTANT: Do NOT include a trailing slash; Google Cloud Console will reject or fail to match origins with trailing slashes).*  
   For local development testing, also add:
   ```text
   http://localhost:5000
   http://localhost:3000
   http://127.0.0.1:5000
   ```
6. **Authorized redirect URIs**:  
   Ensure the following URIs are present:
   ```text
   https://astroverse-eta.vercel.app/
   https://astroverse-eta.vercel.app/api/auth/google/callback
   ```
7. Click **SAVE**.  
   *(Note: Google OAuth changes typically take 2–5 minutes to propagate across all edge servers).*

---

## 4. Vercel Environment Configuration Checklist

In the **Vercel Dashboard** under **Project Settings > Environment Variables**, ensure the following variables are configured for Production, Preview, and Development:

| Variable Name | Required Value | Notes |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | `488224636987-ai5khc8s0cumhq3n243ca9rdpv9mt89j.apps.googleusercontent.com` | Publicly matched client ID |
| `GOOGLE_CLIENT_SECRET` | *(The client secret from GCP Console for this Web client)* | Used server-side only for authorization code exchange. Never exposed to browser. |

*(Note: Trigger a redeploy after adding environment variables in Vercel to load them into the running container).*

---

## 5. Automated Verification Results

All test suites were executed locally and passed with zero regressions:

```
===============================================================
TEST SUITE EXECUTION SUMMARY: October 26, 2026
===============================================================

1. TypeScript Wallet Service Tests (ts-node):
   - tests/auth.test.ts ............................. 59/59 PASSED (+5 new regression tests)
     * GET /api/auth/google/config returns configured Client ID
     * GET /api/auth/google/config NEVER exposes client secret
     * POST /api/auth/google rejects missing or invalid credentials (HTTP 401)
     * POST /api/auth/google rejects unverified emails, audience mismatch, and expired tokens
     * POST /api/auth/google registers new user with verified email
     * POST /api/auth/google authenticates existing user & updates login timestamp
     * POST /api/auth/google exchanges valid authorization codes
     * POST /api/auth/google rejects invalid authorization codes
   - tests/chat_frontend_logic.test.ts .............. 32/32 PASSED
   - tests/monetization.test.ts ..................... 28/28 PASSED
   - tests/pdf_fixtures.test.ts ..................... 12/12 PASSED
   - tests/differentiation.test.ts .................. 38/38 PASSED
   - tests/pdf_quality_regression.test.ts ........... 7/7 PASSED
   - tests/numerology.test.ts ....................... 13/13 PASSED

2. Python Kundli Engine Suite (pytest):
   - services/kundli-engine/tests/ .................. 84 PASSED, 2 SKIPPED (0 failed)

3. TypeScript Compilation (tsc --noEmit):
   - 0 errors across entire repository.
```

---

## 6. Git Synchronization & Release Baseline

* **Feature Branch Commit:** `333c805f1cfb69e5d4e1329dc2ebff3f2e14e7a8`
* **Commit Message:** `fix(auth): harden google identity services, token verification and add fullpage redirect fallback`
* **Remote Branches Pushed:**
  - `origin/feature/premium-reports-and-subscriptions`
  - `origin/main` (Fast-forward merged)
* **Vercel Production Verification:**
  - URL: `https://astroverse-eta.vercel.app/`
  - HTTP Status: `200 OK`
  - Full-page redirect fallback and state validation live in production bundle.
