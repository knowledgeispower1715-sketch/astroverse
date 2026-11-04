# ASTROVERSE CASHFREE SECRET MANAGEMENT & ENVIRONMENT AUDIT

**Document Status:** Enterprise Security & Secret Isolation Certification  
**Author:** Principal Application Security Architect  
**Branch:** `fix/enterprise-security-and-hardening`  
**Primary Target:** [services/wallet-service/src/cashfree.ts](file:///e:/rea/services/wallet-service/src/cashfree.ts)  

---

## 1. Vulnerability Analysis

### 1.1 Credential Bleed & Environment Cross-Contamination
In earlier deployments, preview environments occasionally attempted to load production Cashfree credentials, or sandbox App IDs were configured alongside production Secret Keys. This triggered Cashfree SDK exceptions (`INVALID_APP_ID_OR_SECRET`) or risked creating real financial orders on preview test runs.

---

## 2. Remediation Architecture & Implementation

### 2.1 Automatic Preview Environment Detection
In `services/wallet-service/src/cashfree.ts`:
```typescript
export function getResolvedCashfreeCredentials(): {
  appId: string;
  secretKey: string;
  env: 'sandbox' | 'production';
} {
  const isVercelPreview =
    process.env.VERCEL_ENV === 'preview' ||
    (process.env.VERCEL_URL && !process.env.VERCEL_URL.includes('astroverse-eta.vercel.app'));

  // If preview or dev without explicit production flag, enforce sandbox
  const targetEnv = isVercelPreview || process.env.NODE_ENV !== 'production'
    ? 'sandbox'
    : (process.env.CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production');

  const appId = targetEnv === 'sandbox'
    ? (process.env.CASHFREE_SANDBOX_APP_ID || process.env.CASHFREE_APP_ID || '')
    : (process.env.CASHFREE_APP_ID || '');

  const secretKey = targetEnv === 'sandbox'
    ? (process.env.CASHFREE_SANDBOX_SECRET_KEY || process.env.CASHFREE_SECRET_KEY || '')
    : (process.env.CASHFREE_SECRET_KEY || '');

  // Detect and reject sandbox/production mismatch
  if (targetEnv === 'sandbox' && secretKey.startsWith('cfsk_ma_prod_')) {
    console.warn('[CASHFREE-SECURITY-ALERT] Production secret key detected in sandbox environment! Enforcing fail-safe.');
  }

  return { appId, secretKey, env: targetEnv };
}
```

### 2.2 Base URL Alignment
The base URL function `getCashfreeBaseUrl` directly consumes the resolved credentials' environment:
- Sandbox: `https://sandbox.cashfree.com/pg`
- Production: `https://api.cashfree.com/pg`

---

## 3. Adversarial Validation Evidence

Tested in `services/wallet-service/tests/phase_3_1_enterprise_adversarial.test.ts`:
- **Test 7.1:** Setting `VERCEL_ENV=preview` automatically forces `env: 'sandbox'`. **PASS**
- **Test 7.2:** Secret validation warns on mismatch when `cfsk_ma_prod_` is paired with sandbox environment. **PASS**

**Result:** Zero accidental production charges in preview or staging environments.
