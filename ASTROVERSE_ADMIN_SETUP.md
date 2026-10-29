# ASTROVERSE — ADMINISTRATOR ONBOARDING & SETUP GUIDE

## Authoritative Enterprise Access • Role-Based Governance • Safe Premium QA • Financial Isolation

---

### Executive Overview

AstroVerse provides an enterprise-grade administrative portal (`/admin`) governed by strict server-side authorization. To ensure maximum security:
- **Zero Backdoors:** No hardcoded passwords, master credentials, or client-side bypass flags exist.
- **Fail-Closed Access Control:** Access is strictly denied (401 Unauthorized for visitors; 403 Forbidden for ordinary users) unless authenticated with an authorized administrative role.
- **Automatic Allowlist Provisioning:** The platform owner can configure an email allowlist in Vercel to automatically elevate their verified Google OAuth, Email OTP, or Supabase account to `OWNER` on login.
- **Isolated Premium QA Simulator:** Administrators can test Free, Plus, and Premium features and sample synthetic profiles in an isolated sandbox that **never** touches genuine customer data, balances, or payment gateways.

---

### Step 1: Provisioning the First Administrator via Vercel

The primary and recommended method to provision the platform owner is configuring server environment variables in the Vercel dashboard:

1. **Log in to Vercel:** Navigate to [https://vercel.com/dashboard](https://vercel.com/dashboard) and open the **AstroVerse** project.
2. **Open Project Settings:**
   - Click on the **Settings** tab.
   - In the left sidebar, click **Environment Variables**.
3. **Add Administrator Email Allowlist:**
   - **Key:** `ASTROVERSE_ADMIN_EMAILS`
   - **Value:** `your-email@gmail.com` *(or comma-separated emails, e.g. `owner@astroverse.com,cto@astroverse.com`)*
   - **Environments:** Check **Production**, **Preview**, and **Development**.
   - Click **Save**.
4. **Enable Admin Tier Preview (Optional for QA):**
   - **Key:** `ASTROVERSE_ADMIN_PREVIEW_ENABLED`
   - **Value:** `true`
   - **Environments:** Check **Production**, **Preview**, and **Development**.
   - Click **Save**.
5. **Redeploy or Promote Deployment:**
   - Go to the **Deployments** tab.
   - Click the three dots `...` on the latest deployment and select **Redeploy** so the new environment variables take effect.

---

### Step 2: Logging In as Administrator

Once `ASTROVERSE_ADMIN_EMAILS` is configured:

1. Navigate to the AstroVerse website: [https://astroverse-eta.vercel.app/](https://astroverse-eta.vercel.app/)
2. Click **Sign In** in the top navigation bar.
3. Authenticate using the exact email address specified in `ASTROVERSE_ADMIN_EMAILS` via:
   - **Google Sign-In / One-Tap** *(Recommended)*
   - **Email OTP**
   - **Password Login**
4. The server automatically detects your allowlisted email address, assigns you the `OWNER` role, and issues a cryptographically signed administrative session token.
5. In your browser, navigate directly to:
   ```
   https://astroverse-eta.vercel.app/admin
   ```
   *(Or append `#/admin` to the URL).*
6. The enterprise console loads immediately with your role badge (`OWNER`) and access to all 16 administrative operational modules.

---

### Step 3: Server-Side CLI Provisioning (Alternative)

If you have direct terminal access or are running in a containerized backend environment, you can provision or promote administrators via the CLI tool:

```bash
# In services/wallet-service directory:
npm run admin:provision -- --email owner@astroverse.app --role OWNER

# Or from project root:
npm --prefix services/wallet-service run admin:provision -- --email owner@astroverse.app --role OWNER
```

#### CLI Options:
- `--email <email>` *(Required)*: The user's email address.
- `--role <role>` *(Optional, defaults to `OWNER`)*: One of the 7 canonical roles:
  * `OWNER`
  * `SECURITY_ADMIN`
  * `SUPPORT_ADMIN`
  * `CONTENT_EDITOR`
  * `FINANCE_ADMIN`
  * `ASTROLOGY_OPS_ADMIN`
  * `READONLY_ANALYST`
- `--name <name>` *(Optional)*: Display name for the administrator.

The CLI script is completely **idempotent**:
- If the account does not yet exist, it creates an active account with verified email and 0.00 balance.
- If the account already exists, it elevates their role to the specified role and updates their audit log.

---

### Step 4: Role-Based Access Control (RBAC) Architecture

AstroVerse enforces 7 canonical roles with granular permissions:

| Canonical Role | Primary Responsibilities | Permitted Modules |
| :--- | :--- | :--- |
| **OWNER** | Full root authority, governance, all operational modules | Modules 1–16 |
| **SECURITY_ADMIN** | Platform security, MFA enforcement, session revocation | Modules 1, 2, 3, 4, 11, 13, 15 |
| **SUPPORT_ADMIN** | Customer service, user inquiries, ticket management | Modules 1, 2, 6, 12, 15 |
| **CONTENT_EDITOR** | Astrology articles, horoscope text, FAQ updates | Modules 1, 10 |
| **FINANCE_ADMIN** | Razorpay reconciliation, refunds, subscription analytics | Modules 1, 2, 8, 9, 13 |
| **ASTROLOGY_OPS_ADMIN** | Swiss Ephemeris health, chart diagnostics, calculation testing | Modules 1, 5, 6, 7, 16 |
| **READONLY_ANALYST** | Read-only platform analytics and reporting metrics | Modules 1, 5, 8, 9, 13 |

---

### Step 5: Testing Premium & Plus Features Safely (QA Simulator)

The owner and administrators can test all platform tiers without purchasing subscriptions:

1. In the `/admin` portal, click **16. Tier Simulator & QA**.
2. **Select Simulated Tier:**
   - **Free:** Tests the baseline visitor experience with standard kundli calculations and locked premium cards.
   - **Plus:** Activates 10% report discounts, daily guidance transit horizons, and standard numerology.
   - **Premium:** Activates 20% report discounts, unlimited AI consultations, high-resolution PDF downloads, all 11 Upagrahas & Kalavelas, and comprehensive Ashtakavarga matrices.
3. **Select Synthetic Test Profile:**
   - Choose a sample profile (e.g. *Synthetic Aryan Tiwari* or *Synthetic Priyadarshini Rao*).
   - This prevents real customer PII exposure and validates calculation integrity against known astronomical baselines.
4. **Isolated Demo Wallet:**
   - Click **+₹100**, **+₹500**, or **+₹1000** to add test credits.
   - Test report purchasing, consultation deductions, and checkout flows.
   - Click **Reset Balance** to clear demo credits.
   - **Financial Isolation Invariant:** Real customer ledger entries, bank accounts, Razorpay webhooks, and genuine balances are **never** affected.
5. **Exit Preview:** Click **Exit Preview Mode** to instantly restore your authentic account entitlements.

---

### Step 6: Revoking Administrator Access

To revoke administrative privileges:

1. **Via Allowlist:** Remove the user's email address from `ASTROVERSE_ADMIN_EMAILS` in Vercel settings and redeploy. The server-side allowlist guard automatically fails closed with `403 Forbidden` on all subsequent requests from that account.
2. **Via Database / Admin Console:** In the **2. Users** or **3. Roles & RBAC** module, demote the user's role back to `USER` or set account status to `DEACTIVATED`.

---

### Security & Operational Checklist

- [x] Server allowlist `ASTROVERSE_ADMIN_EMAILS` is evaluated securely on the backend; it is **never** bundled or exposed to frontend JavaScript.
- [x] Admin routes require valid 256-bit cryptographic session tokens.
- [x] High-stakes operations (user deletion, refunds, system flags) require Step-Up MFA assurance tokens.
- [x] Sensitive actions generate tamper-evident audit logs (`ADMIN_CLI_PROVISION`, `ADMIN_TIER_PREVIEW_ACTIVATED`, etc.).
