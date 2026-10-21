# AstroVerse — App Store & Payment Compliance Architecture

**Date:** October 21, 2026  
**Auditor:** Principal Software Architect, Application Security & Compliance Engineer  
**Scope:** Apple App Store Review Guidelines, Google Play Billing Policies, RBI/Razorpay Standards

---

## 1. Regulatory & Store Compliance Mandates

AstroVerse provides digital astrology reports, algorithmic predictions, live consultations, and wallet credits across Web, iOS, and Android. To maintain complete store approval and regulatory compliance, the platform enforces strict channel separation:

### A. Apple App Store Guidelines Compliance
1. **Digital Predictions & Reports (Guideline 3.1.1):**
   - In-app purchases unlocking algorithmic predictions, multi-horizon forecasts, and digital dossiers (`DOSSIER_45P`, subscriptions) within iOS native builds must use **StoreKit / Apple In-App Purchase (IAP)**.
   - Native iOS binaries (`apps/mobile`) do not link to external web-based credit card checkout forms for digital content.
2. **Real-Time Human Consultations (Guideline 3.1.3(d)):**
   - Scheduled one-on-one real-time consultations connecting users to external human advisors are classified as *Person-to-Person Services* and may utilize direct payment options where permitted.
   - For automated AI personas (Acharya Shastri, Dr. Radhika Sharma, Pandit Anand Varma), services are classified as digital interactive content and billed via standard wallet / IAP tokens.

### B. Google Play Billing Compliance
1. **Google Play Billing System:**
   - All in-app purchases of virtual wallet balance and digital reports on Android must process through Google Play Billing.
   - App packages do not include unauthorized third-party billing libraries.

### C. Web Payments Compliance (Razorpay & RBI Guidelines)
1. **Server-Side Signature Verification:**
   - Web checkouts (`https://astroverse-eta.vercel.app`) utilize Razorpay Checkout with server-side HMAC-SHA256 cryptographic verification of `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
2. **Webhook Security:**
   - Webhook events (`order.paid`, `payment.failed`) are processed idempotently using the Razorpay Webhook Secret.
3. **No Stored Plaintext Card Data:**
   - AstroVerse does not collect, log, or persist raw credit/debit card numbers, CVVs, or bank net-banking passwords. Payment processing is completely tokenized.

---

## 2. Consumer Transparency & Anti-Dark-Pattern Rules

1. **Clear Price Disclosures:**
   - All unlock modals and consultation persona cards prominently display the exact cost before action (e.g. "Unlock Instant Access for ₹49", "₹15/min").
2. **No Pre-Checked Recurring Subscriptions:**
   - One-time purchases are strictly non-recurring.
3. **No Automatic Account Drain:**
   - Consultations pause automatically if the user's wallet balance reaches zero; sessions are never allowed to overdraft into a negative balance.
4. **Transparent Epistemic Limitations:**
   - All payment screens and reports include clear notices: *"Planetary configurations indicate environmental tendencies rather than deterministic guarantees. Financial and health outcomes depend on personal discernment, professional guidance, and practical agency."*
