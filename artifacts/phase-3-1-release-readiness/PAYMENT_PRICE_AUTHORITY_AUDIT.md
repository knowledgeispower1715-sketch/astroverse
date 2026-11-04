# ASTROVERSE PAYMENT PRICE AUTHORITY AUDIT & DEFECT REMEDIATION

**Document Status:** Enterprise Security Certification  
**Author:** Principal Fintech & Payment Security Architect  
**Branch:** `fix/enterprise-security-and-hardening`  
**Base Commit:** `876e0d3a652c335e516abe6aa8f4ebff8769a754`  
**Primary Target:** `POST /api/cashfree/create-order` in [services/wallet-service/src/server.ts](file:///e:/rea/services/wallet-service/src/server.ts)  

---

## 1. Vulnerability Analysis & Forensic Diagnosis

### The Critical Flaw (Client-Controlled Pricing)
In commit `876e0d3a652c335e516abe6aa8f4ebff8769a754`, `POST /api/cashfree/create-order` directly extracted the `amount` field from the unauthenticated/client-supplied request body:
```typescript
// VULNERABLE CODE PRIOR TO PHASE 3.1
const orderAmount = req.body.amount || req.body.order_amount;
const orderPayload = {
  order_id: generatedOrderId,
  order_amount: orderAmount, // <-- ADVERSARY COULD TRANSMIT 1.00 FOR ₹9,999 ANNUAL SUBSCRIPTION
  order_currency: 'INR',
  customer_details: { ... }
};
```
An attacker could invoke `POST /api/cashfree/create-order` with:
```json
{
  "productType": "SUBSCRIPTION",
  "tier": "PREMIUM",
  "billingPeriod": "ANNUAL",
  "amount": 1.00
}
```
Because the downstream fulfillment verified payment against the created Cashfree order amount, paying ₹1.00 would mark the order as `PAID` and grant a 365-day enterprise `PREMIUM` subscription worth ₹9,999.00.

---

## 2. Remediation Architecture & Implementation

### 2.1 Authoritative Price Resolution
In `services/wallet-service/src/server.ts` (lines 7400-7540), client-controlled `amount` has been completely disconnected from order creation. The backend now executes strict server-side price computation:

```typescript
// ENFORCED SERVER-SIDE PRICE RESOLUTION
let finalPriceRupees: number;
let finalPricePaise: number;
let basePriceRupees: number;
let gstAmountRupees: number;
let snapshot: Record<string, any> = {};
let authoritativePeriod: 'MONTHLY' | 'ANNUAL' = billingPeriod === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

if (productType === 'SUBSCRIPTION') {
  const plan = SUBSCRIPTION_PLANS[canonicalTier];
  if (!plan) {
    return res.status(400).json({ success: false, error: 'INVALID_SUBSCRIPTION_TIER' });
  }
  const isAnnual = authoritativePeriod === 'ANNUAL';
  finalPriceRupees = isAnnual ? plan.annualPriceRupees : plan.monthlyPriceRupees;
  finalPricePaise = finalPriceRupees * 100;
  basePriceRupees = Math.round((finalPriceRupees / 1.18) * 100) / 100;
  gstAmountRupees = Math.round((finalPriceRupees - basePriceRupees) * 100) / 100;

  snapshot = {
    tier: canonicalTier,
    billingPeriod: authoritativePeriod,
    basePricePaise: Math.round(basePriceRupees * 100),
    gstPaise: Math.round(gstAmountRupees * 100),
    finalPricePaise,
    gstRatePercent: 18,
    computedAt: new Date().toISOString()
  };
} else if (productType === 'REPORT') {
  const reportDef = REPORT_CATALOGUE[productId];
  if (!reportDef) {
    return res.status(400).json({ success: false, error: 'INVALID_REPORT_SKU' });
  }
  const pricing = calculateReportPrice(productId, 'INR', Boolean(req.body.isKundliMatching));
  finalPricePaise = pricing.finalPricePaise;
  finalPriceRupees = finalPricePaise / 100;
  basePriceRupees = pricing.basePricePaise / 100;
  gstAmountRupees = Math.round((finalPriceRupees - (pricing.basePricePaise / 100)) * 100) / 100;
  snapshot = { ...pricing, computedAt: new Date().toISOString() };
} else if (productType === 'WALLET_RECHARGE') {
  const rechargePricing = calculateWalletRechargePricing(Number(req.body.amount || req.body.order_amount));
  if (!rechargePricing.allowed) {
    return res.status(400).json({ success: false, error: rechargePricing.reason || 'INVALID_RECHARGE_AMOUNT' });
  }
  finalPricePaise = rechargePricing.finalPricePaise;
  finalPriceRupees = rechargePricing.finalPricePaise / 100;
  basePriceRupees = finalPriceRupees;
  gstAmountRupees = 0;
  snapshot = { ...rechargePricing, computedAt: new Date().toISOString() };
} else {
  return res.status(400).json({ success: false, error: 'INVALID_PRODUCT_TYPE' });
}
```

### 2.2 Client Amount Tampering Invariant
Even if the client sends `amount: 1`, the server completely ignores it. The Cashfree order creation payload passes `order_amount: finalPriceRupees`, and `PaymentOrder` in PostgreSQL records `amountPaise: finalPricePaise`, `billingPeriod: authoritativePeriod`, and `pricingSnapshot: snapshot`.

---

## 3. Automated Adversarial Validation Evidence

Tested in `services/wallet-service/tests/phase_3_1_enterprise_adversarial.test.ts`:
- **Test 1.1:** Attempting client price tampering (`amount: 1.00` for `PREMIUM` `ANNUAL`) resulted in an order created for exactly ₹9,999.00 (`amountPaise: 999900`). **PASS**
- **Test 1.2:** Transmitting invalid tier `INVALID_VIP_PLAN` rejected with HTTP 400 `INVALID_SUBSCRIPTION_TIER`. **PASS**
- **Test 1.3:** Transmitting invalid report SKU `report_fake_galaxy` rejected with HTTP 400 `INVALID_REPORT_SKU`. **PASS**
- **Test 1.4:** Transmitting wallet recharge below ₹1.00 (`amount: 0.50`) rejected with HTTP 400 `AMOUNT_BELOW_MINIMUM`. **PASS**
- **Test 1.5:** Transmitting wallet recharge above ₹50,000.00 (`amount: 60000.00`) rejected with HTTP 400 `AMOUNT_EXCEEDS_MAXIMUM`. **PASS**
- **Test 1.6:** Transmitting unsupported productType `BITCOIN_PURCHASE` rejected with HTTP 400 `INVALID_PRODUCT_TYPE`. **PASS**

**Result:** Zero client pricing authority remains in the payment pipeline.
