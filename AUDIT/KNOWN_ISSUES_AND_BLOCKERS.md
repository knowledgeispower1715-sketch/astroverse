# AstroVerse AI — Known Issues, Dependencies & External Blockers

**Document Date:** October 26, 2026  
**Auditor:** Principal Software Architect & QA Director  

---

## 1. External Dependencies & Blocked Release Tasks

| Domain | Blocker Item | Impact | Current Status | Required Action / Next Steps |
| :--- | :--- | :--- | :--- | :--- |
| **Store Accounts** | Apple Developer Program Account | Cannot sign and submit `.ipa` binary to App Store Connect | BLOCKED | Human account owner must supply Team ID and provision certificates via `eas credentials` |
| **Store Accounts** | Google Play Developer Console | Cannot upload `.aab` Android App Bundle to Play Console tracks | BLOCKED | Human account owner must create Play Console app listing and link Google Play service account |
| **Store Billing** | Live Sandbox IAP Product SKUs | Apple StoreKit 2 & Google Play Billing sandbox purchases cannot execute live external network handshakes | BLOCKED | Once developer accounts are active, register IAP product identifiers matching catalog IDs |
| **Razorpay Portal** | Merchant Category Code (MCC) Update | Razorpay operations team must complete document review | PENDING REVIEW | Submit [`docs/astroverse_razorpay_merchant_dossier.md`](../docs/astroverse_razorpay_merchant_dossier.md) to Razorpay support |

---

## 2. Resolved Defects & Remediated Areas

1. **Merchant Onboarding Misclassification**: Previously blocked as matrimony/dating; completely remediated with non-dating positioning, Astrological Compatibility Synastry terminology, Schema.org SoftwareApplication JSON-LD, regulatory footer, and legal policy modals.
2. **Missing Mobile Assets**: `apps/mobile/assets` was missing; created high-resolution `icon.png` (1024x1024), `splash.png` (2048x2048), `adaptive-icon.png` (1024x1024), and `favicon.png` (48x48).
3. **Mobile In-App Account Deletion**: Added deletion trigger and user confirmation dialog in `ProfileScreen.tsx` calling `DELETE /api/user/account`.
4. **Hora Edge Boundary Clamping**: Prevented negative durations and NaN intervals on sunrise/sunset transitions.
5. **PDF Quality & Blank Pages**: A4 geometry strictly budgeted at 296mm to eliminate blank trailing pages across all 10 products.
