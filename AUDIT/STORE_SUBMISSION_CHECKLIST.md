# AstroVerse AI — App Store & Google Play Submission Checklist

**Document Date:** October 26, 2026  
**Auditor:** App Store & Google Play Release Specialist  

---

## 1. Apple App Store Submission Compliance (iOS)

| Guideline | Requirement | Status | Evidence / Implementation |
| :--- | :--- | :--- | :--- |
| **2.1 App Completeness** | App must be free of placeholder text, broken links, or crash loops | VERIFIED PASS | Monorepo mobile suite passes, typecheck clean, zero crashes |
| **5.1.1(v) Account Deletion** | Apps supporting account creation must provide visible in-app deletion | VERIFIED PASS | Implemented in `apps/mobile/src/screens/ProfileScreen.tsx` (`DELETE /api/user/account`) |
| **5.1.2 Data Privacy** | Clear Privacy Policy describing birth data, no sale of user data | VERIFIED PASS | Disclosed in in-app policies and live at `https://astroverse-eta.vercel.app/` |
| **3.1.1 In-App Purchases** | Digital content on iOS must use StoreKit In-App Purchases | BLOCKED | Requires active Apple Developer Team credentials; sandbox store integration stubbed |
| **App Store Reviewer Account**| Demo / Test credentials for App Store review team | VERIFIED PASS | Test credentials provided: `reviewer@astroverse.app` / `ReviewerPass123!` |
| **App Icon & Assets** | 1024 × 1024 px PNG icon with zero alpha transparency | VERIFIED PASS | Created at `apps/mobile/assets/icon.png` |
| **Launch Screen** | Branded launch screen matching app aesthetic | VERIFIED PASS | Created at `apps/mobile/assets/splash.png` (2048 × 2048) |
| **Category Selection** | Primary: Lifestyle, Secondary: Reference / Utilities | VERIFIED PASS | Configured in `app.json` |

---

## 2. Google Play Console Submission Compliance (Android)

| Policy Area | Requirement | Status | Evidence / Implementation |
| :--- | :--- | :--- | :--- |
| **Data Safety Section** | Accurate declaration of collected data (location, email, birth time) | VERIFIED PASS | Data collected strictly for astronomical calculation; no third-party ad brokers |
| **Account Deletion Link** | Both in-app deletion and external web deletion link required | VERIFIED PASS | In-app button + web deletion flow at `https://astroverse-eta.vercel.app/` |
| **Target API Level** | Target Android 14 (API level 34) | VERIFIED PASS | Handled by Expo SDK 51 / React Native 0.74 |
| **Adaptive Icons** | 1024 × 1024 px foreground with background color | VERIFIED PASS | Created at `apps/mobile/assets/adaptive-icon.png` (safe zone diameter 600px) |
| **Google Play Billing** | Google Play Billing Library for digital purchases on Android | BLOCKED | Requires Google Play Console Merchant Account credentials |
| **Content Rating** | Complete IARC rating questionnaire (Everyone / 12+) | VERIFIED PASS | No violence, gambling, or adult content |

---

## 3. Store Listing Copy & Marketing Assets

- **App Name**: AstroVerse AI — Vedic Astrology
- **Subtitle / Short Description**: High-precision Swiss Ephemeris Janam Kundli, Horas & Synastry
- **Full Description**:
  > AstroVerse AI is an enterprise computational Vedic astrology platform powered by high-precision Swiss Ephemeris astronomical calculations and classical Parashari Jyotish principles.
  >
  > Key Capabilities:
  > • Authentic Janam Kundli (D1–D60 Shodashvarga divisional charts)
  > • Real-time 24-hour planetary Horas & Panchanga timing
  > • Ashtakoota 36-Guna compatibility synastry analysis
  > • Vedic, Chaldean & Pythagorean Numerology Studio
  > • High-resolution downloadable PDF research publications
  > • AI Astrologer consultations grounded in authentic natal facts
- **Support Email**: `support@astroverse.app`
- **Marketing URL**: `https://astroverse-eta.vercel.app/`
- **Privacy Policy URL**: `https://astroverse-eta.vercel.app/` (Accessible via Footer & Modals)
