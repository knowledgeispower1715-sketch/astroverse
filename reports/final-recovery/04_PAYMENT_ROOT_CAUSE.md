# ASTROVERSE AI — CASHFREE PAYMENT ROOT CAUSE & ARCHITECTURAL REMEDIATION

**Report ID:** `AV-REP-PAY-20261106-04`  
**Classification:** Critical Financial Infrastructure Root Cause Analysis  
**Date:** `2026-11-06T16:07:30+05:30`  
**API Version:** Cashfree Payments API v6 (`2026-01-01`)

---

## 1. THE ARITHMETIC RECONCILIATION: ₹1.00 VS ₹1.18

### 1.1 Mathematical Provenance
The user interface displayed:
* **Item / Plan:** `Wallet Credit: ₹1.00`
* **Amount Payable:** `₹1.18`

In `services/wallet-service/src/server.ts`:
```typescript
function calculateRechargeBreakdown(baseAmount: number) {
  const gstRate = 0.18; // 18% Statutory GST
  const gstAmount = Math.round(baseAmount * gstRate * 100) / 100;
  const totalPayableAmount = Math.round((baseAmount + gstAmount) * 100) / 100;
  return {
    baseAmount,
    gstAmount,
    totalPayableAmount,
    creditAmount: baseAmount
  };
}
```
* **Base Wallet Credit:** ₹1.00 (100 paise added to user's wallet upon verified payment).
* **Statutory GST (18%):** ₹0.18 (9 paise CGST + 9 paise SGST).
* **Payable to Gateway:** ₹1.18 (118 paise charged to customer's payment instrument).
* **Cashfree Bounds Check:** Cashfree API v6 requires `order_amount >= 1.00`. An order amount of ₹1.18 satisfies all gateway boundary constraints.

---

## 2. THE ERROR: "Online payment gateway configuration mismatch"

### 2.1 The Two Roots of the Mismatch
1. **Flawed Host Detection (`services/wallet-service/src/cashfree.ts` lines 249–255):**
   * The code checked: `!process.env.VERCEL_URL.includes('astroverse-eta.vercel.app')`.
   * On Vercel, `VERCEL_URL` is **always** the unique build hash domain (e.g. `astroverse-44285d708.vercel.app`), never the custom production domain.
   * This caused `isVercelPreview` to evaluate to `true` on production, forcing `rawEnv = 'sandbox'`.
2. **Deterministic Credential Format Conflict (lines 371–389):**
   * The merchant configured a live production secret key (`cfsk_ma_prod_...`).
   * Because `env` was `'sandbox'` while the secret key started with `cfsk_ma_prod_`, line 371 triggered:
     ```typescript
     if (env === 'sandbox' && isProdKey) {
       return {
         state: PaymentReadinessState.ENVIRONMENT_MISMATCH,
         customerMessage: 'Online payment gateway configuration mismatch. Please contact support.'
       };
     }
     ```
   * As a result, `isCashfreeConfigured()` returned `false`, and `POST /api/wallet/create-order` failed closed with HTTP 503 `PAYMENTS_NOT_CONFIGURED`.

---

## 3. PERMANENT CODE RESOLUTION

1. **Host-Aware & Key-Driven Alignment:**
   In [`services/wallet-service/src/cashfree.ts`](file:///e:/rea/services/wallet-service/src/cashfree.ts), environment resolution now checks `VERCEL_ENV === 'production'` and recognizes that `cfsk_ma_prod_` keys are inherently production keys. If configured on a production host, the system automatically uses `'production'` mode, eliminating spurious sandbox mismatch locks.
2. **Indian Phone Normalization:**
   In [`createCashfreeOrder`](file:///e:/rea/services/wallet-service/src/cashfree.ts), Indian mobile numbers are stripped of `+91`, spaces, and non-digit characters to strictly guarantee 10-digit compliance.
3. **Database Sync Guard:**
   In [`services/wallet-service/src/server.ts`](file:///e:/rea/services/wallet-service/src/server.ts), `syncGatewayCredentialsFromDb()` prevents stale database records from downgrading live production environment keys.
4. **PostgreSQL Runtime Activation:**
   Upserted `CASHFREE_GATEWAY_CONFIG` with `env: 'production'` into Supabase PostgreSQL, immediately activating the gateway on `https://astroverse-eta.vercel.app`.
