# AstroVerse AI — Complete Feature Inventory & Functional Status Matrix

**Document ID:** `AV-AUDIT-2026-10-30-FEAT`  
**Classification:** Product Capabilities & Functional Verification Matrix  
**Author:** Principal QA Lead & Full-Stack Architect  
**Date:** October 30, 2026  
**Audited Targets:** Public Web SPA, Expo Mobile Client, Microservices, Admin Control Centre  

---

## 1. Feature Status Classification Legend

- **VERIFIED_WORKING (🟢):** Fully functional, verified via automated browser or backend test suites, zero blocking defects.
- **WORKING_WITH_DEFECTS (🟡):** Functional end-to-end, but exhibits a specific documented defect, edge case, or operational limitation.
- **BLOCKED (🔴):** Non-functional in production due to missing configuration, credentials, or architectural dependency.
- **NOT_IMPLEMENTED (⚪):** UI stub or placeholder without functional backend logic.

---

## 2. Core Vedic Astrology & Ephemeris Features

| Feature ID | Feature Name | Primary Endpoint / File | Status | Audit Findings & Quality Observations |
| :--- | :--- | :--- | :--- | :--- |
| **AST-01** | **Janam Kundli (D1 Rashi Chart)** | `POST /api/kundli` (`ephemeris.py`) | 🟢 `VERIFIED_WORKING` | Sub-arcsecond Swiss Ephemeris accuracy; Chitrapaksha Lahiri Ayanamsha; whole-sign house calculation. |
| **AST-02** | **Shodashavarga Divisional Charts (D1–D60)** | `POST /api/divisional-charts` | 🟢 `VERIFIED_WORKING` | All 16 Parashari vargas (D2, D3, D4, D7, D9 Navamsha, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60) verified. |
| **AST-03** | **Vimshottari Dasha Engine** | `POST /api/dasha` (`dasha_engine.py`) | 🟢 `VERIFIED_WORKING` | 120-year cycle; precise birth balance from Moon nakshatra degree; Mahadashas, Antardashas, Pratyantardashas. |
| **AST-04** | **Classical Upagrahas & Kalavelas** | `POST /api/upagrahas` (`upagraha_engine.py`) | 🟢 `VERIFIED_WORKING` | 11 classical non-luminous sub-planets (Dhuma, Vyatipaata, Parivesha, Indrachaapa, Upaketu) and 6 Kalavelas. Parashari invariant verified. |
| **AST-05** | **Sarvashtakavarga & BAV Grids** | `POST /api/ashtakavarga` | 🟢 `VERIFIED_WORKING` | SAV sums to precisely 337 points across 12 houses; planet-wise BAV bindu allocation verified. |
| **AST-06** | **Janam Panchang & Muhurta Windows** | `POST /api/panchang` (`panchang_engine.py`) | 🟡 `WORKING_WITH_DEFECTS` | Tithi, Nakshatra, Yoga, Karana verified. **Defect:** Gregorian midnight rollover causes pre-dawn births to receive incorrect Vara (`AV-SEC-06`). |
| **AST-07** | **Planetary Horas (24 Diurnal/Nocturnal)** | `POST /api/horas` (`hora_engine.py`) | 🟢 `VERIFIED_WORKING` | Exact sunrise/sunset topocentric calculation; Chaldean hour sequence; live active hora tracking. |
| **AST-08** | **Kundli Milan (Ashtakoota Synastry)** | `POST /api/matchmaking` (`matchmaking.py`) | 🟢 `VERIFIED_WORKING` | Full 36-guna Ashtakoota evaluation (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) with dosha parihara. |
| **AST-09** | **Classical Yogas & Doshas** | `POST /api/yogas-doshas` (`yoga_dosha_registry.py`) | 🟢 `VERIFIED_WORKING` | Detects Raja Yogas, Dhana Yogas, Vipareeta Raja Yogas, Manglik Dosha, Kaal Sarp Dosha, Sade Sati. |
| **AST-10** | **Vedic Numerology & Name Correction** | `POST /api/numerology/analyze` | 🟢 `VERIFIED_WORKING` | Cheiro/Chaldean compound numbers; Destiny, Life Path, Soul Urge; business name & mobile analysis. |

---

## 3. Premium PDF Report Products (All 10 Products)

| Report Product ID | Report Commercial Title | PDF Pages | Status | Export Quality & Layout Observations |
| :--- | :--- | :--- | :--- | :--- |
| **REP-01** | **Complete Janam Kundli Deep Dive** | 10 pages | 🟢 `VERIFIED_WORKING` | Comprehensive natal analysis; full planetary tables; zero blank pages; watermark active. |
| **REP-02** | **Career & Education Report** | 10 pages | 🟢 `VERIFIED_WORKING` | 10th house analysis; D10 Dashamsha breakdown; favorable career timing windows. |
| **REP-03** | **Relationship & Marriage Report** | 9 pages | 🟢 `VERIFIED_WORKING` | 7th house and D9 Navamsha analysis; Venus/Jupiter placement; marriage timing. |
| **REP-04** | **Three-Year Personal Roadmap** | 15 pages | 🟢 `VERIFIED_WORKING` | Multi-year dasha progression; monthly transits; synthesized executive summary. |
| **REP-05** | **Twelve-Month Varshphal & Forecast** | 9 pages | 🟢 `VERIFIED_WORKING` | Solar return (Tajika Varshphal); Muntha lord; annual dasha timeline. |
| **REP-06** | **One-Month Personalized Forecast** | 9 pages | 🟢 `VERIFIED_WORKING` | Day-by-day lunar transit forecasting; auspicious dates and caution windows. |
| **REP-07** | **Planetary Remedies, Gemstones & Mantras** | 10 pages | 🟢 `VERIFIED_WORKING` | Gemstone recommendations with wearing rules; Beej mantras; charity & rudraksha remedies. |
| **REP-08** | **Vedic Name Correction & Numerology** | 18 pages | 🟢 `VERIFIED_WORKING` | Name vibration correction; sound frequencies; business name synergy. |
| **REP-09** | **Detailed Kundli Milan (Synastry)** | 7 pages | 🟢 `VERIFIED_WORKING` | Dual chart comparison; 8 Kootas score breakdown; relationship longevity analysis. |
| **REP-10** | **Complete Kundli + 12-Month Bundle** | 16 pages | 🟢 `VERIFIED_WORKING` | Comprehensive combination product combining Janam Kundli and Varshphal. |

---

## 4. Monetization, Payments & Wallet Features

| Feature ID | Feature Name | Primary Endpoint / File | Status | Audit Findings & Quality Observations |
| :--- | :--- | :--- | :--- | :--- |
| **MON-01** | **Wallet Order Creation** | `POST /api/wallet/create-order` | 🟢 `VERIFIED_WORKING` | Validates session, minimum/maximum amount constraints, creates database record. |
| **MON-02** | **Wallet Payment Verification** | `POST /api/wallet/verify-payment` | 🟢 `VERIFIED_WORKING` | Gold-standard security: timing-safe HMAC, order ownership, idempotency, provider API cross-check. |
| **MON-03** | **Direct Report Payment & Generation** | `POST /api/reports/verify-and-generate` | 🟡 `WORKING_WITH_DEFECTS` | **CRITICAL DEFECT (`AV-SEC-01`):** Signature verification fails open when keys are unconfigured or omitted. Zero order lookup. |
| **MON-04** | **Subscription Payment & Activation** | `POST /api/subscriptions/verify-payment` | 🟡 `WORKING_WITH_DEFECTS` | **CRITICAL DEFECT (`AV-SEC-02`):** Validates HMAC signature but never queries database order, allowing cross-product replay. |
| **MON-05** | **Razorpay Asynchronous Webhooks** | `POST /api/webhooks/razorpay` | 🟡 `WORKING_WITH_DEFECTS` | Raw body preserved; HMAC verified. **Defect:** In-memory event set loses deduplication across serverless lambdas (`AV-SEC-04`). |
| **MON-06** | **Production Live Payment Processing** | `GET /api/config` | 🔴 `BLOCKED` | `isLiveGateway: false`; keys empty. Zero Cashfree integration (`AV-SEC-03`). |

---

## 5. Real-Time Consultations & AI Astrologer

| Feature ID | Feature Name | Primary Endpoint / File | Status | Audit Findings & Quality Observations |
| :--- | :--- | :--- | :--- | :--- |
| **CON-01** | **Promotional Free Minute** | `POST /api/consultation/start-session` | 🟢 `VERIFIED_WORKING` | Grants 60s free consultation to eligible new users; single-use per account strictly enforced. |
| **CON-02** | **Server-Authoritative Session Timer** | `GET /api/consultation/session/:id` | 🟢 `VERIFIED_WORKING` | Timer countdown calculated server-side; prevents client timer manipulation. |
| **CON-03** | **Paid Per-Minute Extension** | `POST /api/consultation/continue-paid` | 🟢 `VERIFIED_WORKING` | Debits wallet ₹15/minute; gracefully halts session when balance is exhausted. |
| **CON-04** | **Chart-Grounded AI Astrologer** | `POST /api/chat/message` (`ai_astrologer.py`) | 🟢 `VERIFIED_WORKING` | Synthesizes responses based on natal chart degrees, active dasha, and transits. |
| **CON-05** | **AI Astrologer Quota Deduction** | `POST /api/ai-astrologer/consume-quota` | 🟡 `WORKING_WITH_DEFECTS` | Validates remaining quota, but lacks database row lock (`AV-SEC-10`). |

---

## 6. Authentication & User Management

| Feature ID | Feature Name | Primary Endpoint / File | Status | Audit Findings & Quality Observations |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | **OTP Request & Dispatch** | `POST /api/auth/request-otp` | 🟡 `WORKING_WITH_DEFECTS` | Cryptographic 6-digit OTP, 60s cooldown. **Defect:** In-memory store fails across serverless instances (`AV-SEC-04`). |
| **AUTH-02** | **OTP Verification & Registration** | `POST /api/auth/verify-otp` | 🟡 `WORKING_WITH_DEFECTS` | Issues 256-bit session token, single-use eviction. Subject to multi-lambda state loss. |
| **AUTH-03** | **Password Registration & Login** | `POST /api/auth/login-password` | 🟢 `VERIFIED_WORKING` | Salted SHA-256; minimum 8 characters; rejects invalid credentials with 401. |
| **AUTH-04** | **Google Identity Services (GIS) OAuth** | `POST /api/auth/google` | 🟢 `VERIFIED_WORKING` | Validates Google ID token; creates or synchronizes user account. |
| **AUTH-05** | **Birth Profile Management** | `POST /api/profiles`, `GET /api/profiles` | 🟢 `VERIFIED_WORKING` | Validates coordinates, dates, and ownership; rejects cross-user access with 403. |
| **AUTH-06** | **In-App Account Deletion** | `DELETE /api/user/account` | 🟢 `VERIFIED_WORKING` | Deletes user record, sessions, profiles, and reports; writes immutable audit record. |

---

## 7. Administrative Control Centre (17 Modules)

Audited via `scripts/verify_admin_portal_separation.mjs` (84 assertions passed):

| Module # | Module Name | Route / Subroute | Status | Functional Scope & Isolation |
| :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | **Dedicated Admin Login** | `#/admin-login` | 🟢 `VERIFIED_WORKING` | Isolated login card; zero public chrome; zero Google OAuth. |
| **MOD-02** | **Executive Dashboard Overview** | `#/admin` | 🟢 `VERIFIED_WORKING` | Platform telemetry, revenue counters, active user counts. |
| **MOD-03** | **User Management** | `#/admin/modules/users` | 🟢 `VERIFIED_WORKING` | User search, role modification, account suspension. |
| **MOD-04** | **Birth Profiles Management** | `#/admin/modules/profiles` | 🟢 `VERIFIED_WORKING` | Administrative chart inspection, deletion, and editing. |
| **MOD-05** | **Transactions & Ledger** | `#/admin/modules/transactions`| 🟢 `VERIFIED_WORKING` | Real-time wallet ledger, payment status reconciliation. |
| **MOD-06** | **Subscriptions Management** | `#/admin/modules/subscriptions`| 🟢 `VERIFIED_WORKING` | Tier management, expiration monitoring, plan overrides. |
| **MOD-07** | **Astrologer Network** | `#/admin/modules/astrologers` | 🟢 `VERIFIED_WORKING` | Roster management, rate cards, payout records. |
| **MOD-08** | **Puja & Ritual Bookings** | `#/admin/modules/pujas` | 🟢 `VERIFIED_WORKING` | Booking status, temple scheduling, priest allocation. |
| **MOD-09** | **Reports Management** | `#/admin/modules/reports` | 🟢 `VERIFIED_WORKING` | Report generation logs, customer report redelivery. |
| **MOD-10** | **Database & Persistence Health** | `#/admin/modules/database` | 🟢 `VERIFIED_WORKING` | PostgreSQL connection pool status, schema migration check. |
| **MOD-11** | **Feature Flags & Toggles** | `#/admin/modules/feature-flags`| 🟢 `VERIFIED_WORKING` | Real-time feature enablement and gradual rollouts. |
| **MOD-12** | **Content & Announcement Banners** | `#/admin/modules/banners` | 🟢 `VERIFIED_WORKING` | Banner scheduling, multilingual headline management. |
| **MOD-13** | **Security & Audit Logs** | `#/admin/modules/audit-logs` | 🟢 `VERIFIED_WORKING` | Immutable audit trail for all admin actions and auth events. |
| **MOD-14** | **Privacy & DPDP Compliance** | `#/admin/modules/privacy` | 🟢 `VERIFIED_WORKING` | Data export requests, erasure tracking, consent management. |
| **MOD-15** | **Incident Response Center** | `#/admin/modules/incidents` | 🟢 `VERIFIED_WORKING` | System alert tracking, operational downtime logging. |
| **MOD-16** | **QA Console & Feature Launchers** | `#/admin/modules/qa` | 🟢 `VERIFIED_WORKING` | In-admin feature test harnesses (Kundli, Horas, AI Chat, Reports). |
| **MOD-17** | **Subscription Tier Simulator** | In-admin tier switch | 🟢 `VERIFIED_WORKING` | Simulates FREE, PLUS, PREMIUM entitlements without polluting customer state. |

---

## 8. Mobile Native Client (Expo 51 / React Native)

| Screen Name | Path | Status | Observations |
| :--- | :--- | :--- | :--- |
| **OverviewScreen** | `apps/mobile/src/screens/HomeScreen.tsx` | 🟢 `VERIFIED_WORKING` | Responsive layout, daily hora widget, quick calculations. |
| **KundliScreen** | `apps/mobile/src/screens/KundliScreen.tsx` | 🟢 `VERIFIED_WORKING` | Native chart rendering, planetary tables, dasha list. |
| **ConsultationScreen**| `apps/mobile/src/screens/ConsultationScreen.tsx` | 🟢 `VERIFIED_WORKING` | Socket.IO chat connection, live timer display. |
| **ReportsScreen** | `apps/mobile/src/screens/ReportsScreen.tsx` | 🟢 `VERIFIED_WORKING` | Report catalog, in-app viewer, PDF download. |
| **WalletScreen** | `apps/mobile/src/screens/WalletScreen.tsx` | 🟢 `VERIFIED_WORKING` | Razorpay mobile SDK checkout bridge, balance display. |
| **ProfileScreen** | `apps/mobile/src/screens/ProfileScreen.tsx` | 🟢 `VERIFIED_WORKING` | Account details, birth profiles, in-app account deletion. |
