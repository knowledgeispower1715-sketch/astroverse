# AstroVerse AI — Mobile Release Readiness (iOS & Android)

**Audit Date:** October 26, 2026  
**Auditor:** React Native / Expo Release Specialist & Mobile QA Lead  

---

## 1. Mobile Application Architecture

The mobile client is built on **React Native 0.74.5** with **Expo SDK 51** (`apps/mobile/`):
- **Bundle Identifier (iOS)**: `app.astroverse.mobile`
- **Package Name (Android)**: `app.astroverse.mobile`
- **State Management**: React Context (`AuthContext`, `ChartContext`, `WalletContext`) with `@react-native-async-storage/async-storage` for local persistence.
- **Navigation Model**: 4-tab native bottom navigation bar (`Today`, `Chart`, `Predictions`, `Profile`) plus focused modal sheets (`ConsultationModal`, `AuthModal`, `BirthProfileModal`, `PaywallModal`).
- **Backend Communication**: Unified `ApiClient` (`apps/mobile/src/api/client.ts`) pointing to production endpoint `https://astroverse-eta.vercel.app`.

---

## 2. Identified Release Gaps & Remediation Plan

| Requirement | Gap Identified | Severity | Remediation Action |
| :--- | :--- | :--- | :--- |
| **App Store Icons & Splash** | `apps/mobile/assets` missing (`icon.png`, `splash.png`, `adaptive-icon.png`) | BLOCKER | Generate original 1024x1024 icon, 2048x2048 splash, adaptive Android icon and favicon |
| **In-App Account Deletion** | `apps/mobile/src/screens/ProfileScreen.tsx` lacked delete account trigger | BLOCKER | Add privacy section and account deletion confirmation in Profile screen |
| **Store Metadata Checklist** | Store descriptions, privacy URLs, review credentials not compiled | HIGH | Produce `AUDIT/STORE_SUBMISSION_CHECKLIST.md` |
| **EAS Build Configuration** | Ensure `eas.json` is configured for test/preview/production build profiles | MEDIUM | Create `apps/mobile/eas.json` |

---

## 3. Physical Device vs Viewport Testing Distinction

- **Browser Viewport Testing (Web)**: Verified at 320px, 360px, 375px, 390px, 412px, 430px, 768px, 1024px, 1366px, 1920px.
- **Native Automated Suite**: Verified on Node 20 / React Native runtime test environment (13 unit/invariant tests).
- **Physical Device Builds**: Require active Apple Developer Program / Google Play Console signing credentials. Standalone EAS build configuration and artifacts prepared.
