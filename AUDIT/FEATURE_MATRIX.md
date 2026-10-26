# AstroVerse AI — Feature Inventory & Acceptance Matrix

**Audit Date:** October 26, 2026  
**Auditor:** Principal Software Architect & QA Lead  
**Statuses Used:** `VERIFIED PASS` | `FAILED` | `BLOCKED` | `NOT TESTED` | `NOT IMPLEMENTED` | `NOT APPLICABLE`  

---

| Feature | Current status | Evidence | Defect | Required action | Final test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free Janam Kundli & D1 Chart** | VERIFIED PASS | Calculated via Swiss Ephemeris (`services/kundli-engine`), verified in browser & backend tests | None | Retain ephemeris grounding | End-to-end chart generation returns valid planetary degrees |
| **Detailed Vedic Birth Chart (D1–D60)** | VERIFIED PASS | Shodashvarga charts (D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60) verified | None | Enforce tier restrictions (Plus/Premium) | Tier gating verified in `entitlements.test.ts` |
| **Daily Horoscope** | VERIFIED PASS | Multi-sign dynamic horoscope with lucky color, number, and transit advice | None | Ensure daily updates without manual refresh | Sign switching and voice narration tested |
| **Hourly Guidance (Solar Horas)** | VERIFIED PASS | Real-time 24-hour planetary Horas with dynamic remaining-time progress meter | Historical negative duration on edge boundary | Clamped interval boundary in `horaCalculation.ts` | 13 native mobile tests + frontend tests pass |
| **Weekly & Monthly Forecasts** | VERIFIED PASS | `report_one_month_forecast` with 30-day timeline and active Antardasha breakdown | None | Retain multi-horizon structure | 5 chapters verified in `differentiation.test.ts` |
| **Yearly Forecasts (Varshphal)** | VERIFIED PASS | `report_twelve_month_varshphal` with 12 distinct monthly forecasts | None | Distinct monthly forecasts | 12 distinct months verified in test |
| **Vimshottari Mahadasha Analysis** | VERIFIED PASS | Complete Mahadasha, Antardasha, and Pratyantardasha timeline calculation | None | Grounded in exact birth moon longitude | Validated in `calculations.py` and mobile tests |
| **Planetary Transits (Gochar)** | VERIFIED PASS | Major planet transits (Saturn, Jupiter, Rahu/Ketu) compared to natal moon | None | Preserve Swiss Ephemeris accuracy | Verified in Kundli engine suite |
| **Panchang & Auspicious Timing** | VERIFIED PASS | 5-Limb table (Tithi, Nakshatra, Yoga, Karana, Vara) with Rahu Kalam & Abhijit Muhurta | None | Synchronized with user coordinates | Verified in `test_vedastro_parity_suite.py` |
| **Astrological Compatibility Synastry** | VERIFIED PASS | Full Ashtakoota 36-Guna calculation with Nadi, Bhakoot, and Kuja Dosha checks | Matrimonial wording triggered merchant block | Refactored to Compatibility Synastry & Chart A/B | Verified in `razorpay_compliance.test.ts` |
| **Numerology Studio** | VERIFIED PASS | Chaldean & Pythagorean calculation (Moolank, Bhagyank, Name correction, Business, Mobile) | Historical paywall lock on free preview | Tier-adaptive preview + 15-chapter publication | 13 automated tests in `numerology.test.ts` |
| **Moon Phases & Ephemeris Data** | VERIFIED PASS | Lunar phase, illumination percentage, and Paksha calculation | None | Calculated mathematically | Verified in Panchang routes |
| **Downloadable PDF Publications** | VERIFIED PASS | 10 distinct physical PDF publications with A4 geometry budgeting (296mm) | Historical blank pages on chapter boundaries | Strict CSS budget + page break controls | 7 tests in `pdf_quality_regression.test.ts` |
| **Saved Reports & History** | VERIFIED PASS | User report persistence with private in-app reader, summary, and print | None | User isolation enforced | Verified in `auth.test.ts` (cross-user 403) |
| **Google Identity Services Authentication** | VERIFIED PASS | Single Google Sign-In with GIS client, OAuth token exchange, and persistent session | Historical 401 origin error and duplicate buttons | Replaced with unified GIS client | Verified in `auth.test.ts` |
| **Password Registration & Login** | VERIFIED PASS | Bcrypt/Argon2 password hashing, salt, password reset token flow | None | Preserve production password security | Verified in `auth.test.ts` |
| **Account Deletion & Data Purge (Web)** | VERIFIED PASS | `DELETE /api/user/account` wipes user, sessions, profiles, and logs audit trail | None | Implemented in backend & web UI | Verified in `auth.test.ts` |
| **Account Deletion (Mobile Client)** | FAILED | `apps/mobile/src/screens/ProfileScreen.tsx` lacked in-app delete account button | Store rejection risk (Apple 5.1.1(v) & Play Store) | Implement delete button & API call in mobile Profile | Verified via mobile test / code inspection |
| **Mobile App Branding Assets** | FAILED | `apps/mobile/assets/` was missing (`icon.png`, `splash.png`, `adaptive-icon.png`) | App build & launch failure on physical devices | Generate high-res branded assets | Assets created and verified in `apps/mobile/assets` |
| **Razorpay Webhook & Billing Status** | VERIFIED PASS | HMAC-SHA256 signature verification over raw body, idempotency, billing status & history | Historical lack of webhooks and billing endpoints | Implemented in `server.ts` + `razorpay.ts` | 15 tests in `razorpay_compliance.test.ts` |
| **Subscription Tier Entitlements** | VERIFIED PASS | Essentials (₹0), Plus (₹499/mo), Premium (₹999/mo) with server-enforced limits | Historical simulated tier in UI only | Authoritative `EntitlementManager` backend | 25 tests in `monetization.test.ts` |
| **In-App Store Sandbox Purchases (Apple/Google)**| BLOCKED | Store credentials & sandbox accounts require active Apple Developer / Google Play credentials | Developer account credentials not present in repository | Provide store submission checklist & mock integration | Blocked on live store credentials |
| **AI Astrologer Consultation** | VERIFIED PASS | Real-time chart-grounded consultation with token quota enforcement | None | Server-side quota by subscription tier | Verified in `chat_frontend_logic.test.ts` |
| **Responsive Web Layouts (Mobile/Desktop)** | VERIFIED PASS | Tested at 320px, 360px, 375px, 390px, 412px, 430px, 768px, 1024px, 1366px, 1920px | Historical horizontal overflow on small devices | Repaired mobile dock, container bounds | Screenshot verified in `test-artifacts/` |
