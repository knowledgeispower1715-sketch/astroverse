# ASTROVERSE SUPABASE AUTHENTICATION HARDENING & PLAN GOVERNANCE

**Document Classification:** Enterprise Identity & Access Governance  
**Subsystem:** Supabase Auth (`supabase-byzantine-nest`) / AstroVerse Identity Gateway  
**Target Environment:** Supabase Cloud (Free Tier Project vs Pro Tier Requirements)  
**Status Code:** `BLOCKED_PLAN_REQUIREMENT` (Documented per Gravitas Invariant 6)  

---

## 1. Finding Analysis: "Leaked Password Protection Disabled"

### 1.1 The Advisory Finding
The Supabase Security Advisor in `supabase-byzantine-nest` displays:
> **Authentication Finding:** `Leaked Password Protection Disabled` (Severity: Medium/High).

### 1.2 Upstream Plan Dependency & Root Cause
1. Supabase provides native leaked password protection by checking candidate passwords against the [HaveIBeenPwned](https://haveibeenpwned.com) Pwned Passwords API (via k-anonymity SHA-1 hash prefix lookups).
2. As formally documented by Supabase ([Supabase Auth Security Documentation](https://supabase.com/docs/guides/auth/password-security#leaked-password-protection)), **Leaked Password Protection is an enterprise feature available exclusively on Supabase Pro, Team, and Enterprise plans.**
3. The active project `supabase-byzantine-nest` is currently provisioned on the **Supabase Free Plan**. The Dashboard toggle at *Authentication > Security > Leaked Password Protection* cannot be enabled on the Free tier.
4. Per prompt instructions:
   > *"If the current project remains on Free: Record `BLOCKED_PLAN_REQUIREMENT`. Do not falsely claim leaked-password protection has been enabled. Configure the strongest available password-length and complexity requirements. Document the residual risk. Prepare the exact owner action required to upgrade and enable the missing feature."*

---

## 2. Compensating Application-Level Controls

Because the upstream cloud toggle is blocked by plan tier, AstroVerse implements compensating defense-in-depth security in the application authentication gateway (`services/wallet-service/src/server.ts` & `index.html`):

### 2.1 Password Complexity Requirements Enforced
In `services/wallet-service/src/server.ts` (lines 1150-1200):
```typescript
export function validateEnterprisePasswordComplexity(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 10) {
    return { valid: false, reason: 'Password must be at least 10 characters in length.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one numeric digit (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character symbol.' };
  }
  // Entropy check: Disallow common predictable substrings
  const lower = password.toLowerCase();
  if (lower.includes('password') || lower.includes('astroverse') || lower.includes('12345678')) {
    return { valid: false, reason: 'Password contains predictable patterns or common words.' };
  }
  return { valid: true };
}
```

### 2.2 Brute-Force Rate Limiting
- `authLimiter`: Max 5 authentication requests per minute per IP address.
- `otpLimiter`: Max 3 OTP generation requests per 5 minutes per phone/email target.
- Temporary IP cool-down with HTTP 429 response and `Retry-After` header.

### 2.3 Non-Disruption Guarantee
- Existing permanent user passwords are not reset without user initiation.
- Email OTP, mobile OTP, and Google OAuth 2.0 flows remain 100% operational.
- Guest-to-permanent account profile migration flows remain preserved.

---

## 3. Residual Risk & Owner Upgrade Directive

### Residual Risk
Until the project is upgraded to Pro, passwords that meet entropy rules but have previously appeared in third-party breaches (e.g. `P@ssword2026!`) cannot be automatically blocked by Supabase Auth engine at registration time.

### Exact Owner Upgrade Action Required
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard/project/supabase-byzantine-nest).
2. Navigate to **Organization Settings > Billing > Change Plan** and select **Pro** ($25/month).
3. Navigate to **Authentication > Security Settings**.
4. Toggle **"Enable Leaked Password Protection"** to **ON**.
5. Save settings. The Security Advisor warning will immediately clear.
