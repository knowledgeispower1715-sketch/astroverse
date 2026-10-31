# ASTROVERSE AI — COMPLETE PLATFORM FEATURE INVENTORY

**Classification:** Platform Capability & Functional Catalog  
**Verification Standard:** Verified via Chrome DevTools Protocol & Test Suites  
**Platform Version:** 1.0.0-production  

---

## 1. Executive Capability Overview

AstroVerse AI offers an exhaustive suite of authentic Parashari Vedic astrology calculations, Chaldean numerology, AI-driven astrologer consultations, digital and printable PDF report generation, and an enterprise administrative operations center.

---

## 2. Core Vedic Astrology Engine (Drik Ganita)

| Feature Module | Technical Implementation | Status |
| :--- | :--- | :--- |
| **Birth Chart (D1 Rashi)** | Lahiri Ayanamsha (Chitra Paksha), True Planets, Ascendant (Lagna) calculation, Bhava Chalita | ✅ Production Ready |
| **Navamsha (D9)** | 1/9th division, planetary vargottama detection, marital & spiritual strength | ✅ Production Ready |
| **Shodashavarga (16 Vargas)** | D2 (Hora), D3 (Drekkana), D4 (Chaturthamsha), D7 (Saptamsha), D10 (Dashamsha), D12 (Dwadashamsha), D16 (Shodashamsha), D20 (Vimshamsha), D24 (Chaturvimshamsha), D27 (Saptavimshamsha), D30 (Trimshamsha), D40 (Khavedamsha), D45 (Akshavedamsha), D60 (Shashtiamsha) | ✅ Production Ready |
| **Vimshottari Dasha Engine** | 120-year cycle: Mahadasha, Antardasha, and Pratyantardasha (PDS) with exact sub-period boundary timestamps | ✅ Production Ready |
| **Ashtakavarga System** | Bhinnashtakavarga (BAV) for 7 grahas, Sarvashtakavarga (SAV) with 337 canonical total bindus, transit triggers | ✅ Production Ready |
| **Shadbala (6-fold Strength)** | Sthana Bala, Dik Bala, Kala Bala, Chesta Bala, Naisargika Bala, Drik Bala (Rupas and Virupas) | ✅ Production Ready |
| **Yoga Detection Engine** | 400+ classical yogas: Raja Yogas, Dhana Yogas, Pancha Mahapurusha, Gajakesari, Budhaditya, Neechbhanga Raja Yoga, Viparita Raja Yogas, Kemadruma | ✅ Production Ready |
| **Dosha Identification** | Manglik Dosha (Kuja Dosha) with cancellation checks, Kaal Sarp Dosha (12 types), Pitra Dosha, Sade Sati | ✅ Production Ready |
| **Transit Engine (Gochara)** | Live planetary transits against natal Moon/Lagna, Sade Sati (Rising, Peak, Setting), Kantaka Shani, Ashtama Shani, Chandrashtama | ✅ Production Ready |
| **Panchanga Engine** | Tithi, Nakshatra, Yoga, Karana, Vaara, Sunrise/Sunset, Rahu Kalam, Yamaganda, Gulika Kalam, Abhijit Muhurta, Choghadiya, Hora | ✅ Production Ready |
| **Kundli Milan (Synastry)** | Ashtakoota 36-Guna matching (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) + Dosha synastry | ✅ Production Ready |

---

## 3. Chaldean & Pythagorean Numerology Studio

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Name Numerology** | Chaldean sound-vibration compound and single number calculation | ✅ Production Ready |
| **Life Path / Destiny Number** | Complete reduction of date of birth with Master Number preservation (11, 22, 33) | ✅ Production Ready |
| **Soul Urge & Personality** | Vowels (Heart's Desire) vs Consonants (Outer Persona) vibrational analysis | ✅ Production Ready |
| **Karmic Lessons & Debts** | Identification of missing digits (1-9) and debt numbers (13, 14, 16, 19) | ✅ Production Ready |
| **Business & Brand Name Synergy**| Corporate name compatibility matching founder birth chart and Life Path | ✅ Production Ready |
| **Lucky Alignments** | Favorable numbers, dates, colors, days of the week, and remedial gemstones | ✅ Production Ready |

---

## 4. AI Astrologer Consultations & Voice Synthesis

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Curated Personas** | 6 distinct specialized AI astrologers (Vedic Parashari, Career/Finance, Matchmaking, Lal Kitab/Remedies, KP/Horary, Spiritual) | ✅ Production Ready |
| **Bilingual Dialogue** | Natural Hindi (`hi-IN`) and English (`en-IN`) fluid translation and script rendering | ✅ Production Ready |
| **Real-Time Billing Engine** | Rate per minute tracking (₹15/min), live countdown, auto-disconnect on zero balance | ✅ Production Ready |
| **Promotional Free Minute** | Single-use 60-second complimentary session granted to every new account | ✅ Production Ready |
| **Live Subtitles & Captions** | Real-time synchronized text streaming with audio generation | ✅ Production Ready |

---

## 5. Monetization Catalog & SKU Pricing

Defined canonically in `services/wallet-service/src/monetization/catalog.ts`:

### 5.1 Subscriptions
| SKU | Name | Price | Daily AI Consultation Quota | Key Features |
| :--- | :--- | :--- | :--- | :--- |
| `sub_plus` | **Plus Membership** | ₹149 / mo | 15 Consultations / day | 10% report discounts, full Kundli charts, ad-free |
| `sub_premium` | **Premium Membership** | ₹299 / mo | 30 Consultations / day | 20% report discounts, priority AI response, full Shodashavarga |

### 5.2 Astrological & Numerology Reports
| SKU | Report Name | Price | Page Count | Format |
| :--- | :--- | :--- | :--- | :--- |
| `report_basic_summary` | Basic Kundli Summary | ₹0 (Free) | 3 Pages | Web / Digital |
| `report_janam_kundli` | Complete Janam Kundli Life Report | ₹199 | 25+ Pages | Comprehensive PDF + Web |
| `report_career_astrology`| Career & Financial Destiny Forecast | ₹149 | 15+ Pages | Comprehensive PDF + Web |
| `report_relationship_love`| Love, Marriage & Compatibility | ₹149 | 15+ Pages | Comprehensive PDF + Web |
| `report_kundli_milan` | Ashtakoota 36-Guna Kundli Milan | ₹149 | 12+ Pages | Comprehensive PDF + Web |
| `report_transit_forecast_1m`| 1-Month Transit Horizon Forecast | ₹49 | 6 Pages | Digital / PDF |
| `report_transit_forecast_12m`| 12-Month Varshphal Annual Forecast | ₹249 | 20+ Pages | Comprehensive PDF + Web |
| `report_transit_forecast_3y`| 3-Year Strategic Astrological Roadmap | ₹499 | 35+ Pages | Premium Executive PDF |
| `report_complete_bundle` | All-in-One Comprehensive Master Dossier| ₹399 | 45+ Pages | Premium Executive PDF |
| `report_vedic_name_numerology`| Chaldean & Pythagorean Numerology Report| ₹199 | 15 Pages | Comprehensive PDF + Web |
| `report_remedial_gemstones`| Vedic Gemstones & Remedial Upay | ₹149 | 10 Pages | Comprehensive PDF + Web |

### 5.3 Wallet Top-Up Packs
| SKU | Name | Recharge Value | Bonus Credit |
| :--- | :--- | :--- | :--- |
| `wallet_pack_100` | Explorer Pack | ₹100 | ₹0 |
| `wallet_pack_250` | Seeker Pack | ₹250 | ₹25 Bonus |
| `wallet_pack_500` | Devotee Pack | ₹500 | ₹75 Bonus |
| `wallet_custom` | Custom Recharge | Min ₹50 - Max ₹10,000 | Dynamic Tier Bonuses |

---

## 6. Administrative Control Centre (`admin.html`)

| Module | Operational Capability | Access Roles |
| :--- | :--- | :--- |
| **Platform Health Dashboard**| Real-time CPU, RAM, Postgres connection pool, and error rate monitoring | All Staff |
| **Customer 360 CRM** | Search customer by phone/email, view wallet ledger, saved reports, active subscriptions | All Staff |
| **Entitlement & Subscription**| Manually grant, revoke, or extend PLUS and PREMIUM subscriptions | OWNER, ADMIN |
| **Financial Adjustments** | Issue refunds, debit adjustments, credit adjustments with mandatory audit reason | FINANCE_ADMIN, OWNER |
| **Promotions Manager** | Create flat and percentage coupon codes, set expiration dates and SKU filters | ADMIN, OWNER |
| **Tier Preview Simulator** | Test customer experience across FREE, PLUS, and PREMIUM tiers safely | ADMIN, OWNER |
| **Audit Log Trail** | Immutable log of staff actions with client IP, timestamp, and target user | SECURITY_ADMIN, OWNER |
