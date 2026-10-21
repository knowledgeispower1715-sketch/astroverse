# AstroVerse Mobile Feature Scope Specification

**Document Version**: 1.0.0  
**Scope Status**: APPROVED FOR IMPLEMENTATION  
**Target Platforms**: iOS (15.0+) and Android (API Level 26+)  
**App Framework**: React Native + Expo + TypeScript  

---

## 1. Feature Classification Rationale

The desktop web application contains numerous secondary features, experimental modules, and promotional components. Shrinking all desktop modules into a smartphone viewport creates overwhelming clutter, cognitive overload, and navigation friction.

The mobile product strictly enforces a clean 4-tab mobile operating system:
1. **Today**: Immediate daily guidance and active Hora countdown.
2. **My Chart**: High-resolution Vedic chart visualization and planetary ephemeris data.
3. **Predictions**: Deep multi-horizon temporal intelligence (Hourly, Daily, Weekly, Monthly, Yearly, Mahadasha).
4. **Profile**: Account management, saved birth profiles, saved reports history, wallet balance, and privacy.

---

## 2. Comprehensive Feature Matrix

| Feature | Scope Category | Justification & Mobile Architecture |
| :--- | :--- | :--- |
| **Personal Hourly Guidance (Hero)** | `CORE` | **Primary differentiating feature.** Displayed prominently at the top of the Today tab with active Hora planet, live countdown without drift, start/end times, and chart-grounded Parashari interpretation. |
| **Vedic Janam Kundli (D1)** | `CORE` | Essential Vedic requirement. Rendered via native scalable vector graphics (`react-native-svg`) with dynamic house numbers and Grahas. |
| **Divisional Charts (D9, D10, Moon, Chalit)** | `CORE` | Critical for serious astrologers and users. Accessible via 1-tap sub-tabs inside the My Chart view. |
| **Planetary Ephemeris Table** | `CORE` | Detailed tabular view of degrees, signs, Nakshatra, Pada, and Chara Karakas. Wrapped in smooth touch-scrolling containers. |
| **Vimshottari Dasha Timeline** | `CORE` | Calculated 120-year cycle with active Mahadasha and Antardasha dates and percentage progress indicator. |
| **Classical Dosha Analysis** | `CORE` | Manglik Dosha, Kaal Sarp Yoga, and Shani Sade Sati transit phase analysis with traditional remedies. |
| **Multi-Horizon Predictions (6 Horizons)** | `CORE` | Structured 7-section reports for Hourly, Daily, Weekly, Monthly, Yearly, and 5-Year Mahadasha. |
| **Interactive AI Astrologer Consultation** | `CORE` | Live conversational modal with 3 distinct Vedic personas (Acharya Devratan, Dr. Sunita Shastri, Pandit Raghavendra), session timer, and wallet metering. |
| **Persistent User Accounts & Multi-Profiles** | `CORE` | Session persistence via secure local storage; ability to add, edit, and switch between family birth profiles. |
| **Saved Reports Dashboard** | `CORE` | Ability to save any prediction report and view/retrieve historical readings after restart or re-login. |
| **Wallet Management & Balance Display** | `CORE` | Transparent wallet balance display with ₹ recharge options and atomic ledger reconciliation. |
| **Freemium & Premium Report Gating** | `CORE` | Free Hourly and Daily previews; ₹49 one-time wallet unlock for deep Weekly, Monthly, Yearly, and Mahadasha reports. |
| **Ashtakoota 36-Guna Matchmaking** | `OPTIONAL / SECONDARY` | Accessible via secondary action without cluttering the primary 4-tab navigation dock. |
| **Worldwide City Geocoding Search** | `CORE` | Interactive auto-suggest for latitude, longitude, and IANA timezone resolution during profile creation. |
| **Large Promotional Banners** | `REMOVED FROM MOBILE` | Purged. Desktop-style advertising banners consume valuable vertical screen estate on smartphones. |
| **Fake Livestreams & Viewer Counts** | `REMOVED FROM MOBILE` | Purged. Misleading static "LIVE" indicators and fake viewer counters violate App Store guidelines. |
| **Unimplemented Astromall / E-Commerce** | `DEFERRED` | Deferred. No physical goods fulfillment pipeline exists in the backend; purchase buttons removed to prevent user frustration. |
| **Unimplemented Puja Booking** | `DEFERRED` | Deferred. Temple rituals require confirmed offline priest coordination; placeholder forms removed from mobile nav. |
| **Administrative Management Console** | `RESTRICTED TO WEB` | Restricted. Platform KPI metrics, user suspension, and audit logs belong exclusively to the secure web admin console. |

---

## 3. Screen Navigation Architecture

```
[ Root Navigation Container ]
 ├── SplashScreen (Branded Cosmic Splash)
 └── MainTabNavigator (4 Bottom Tabs)
      ├── Tab 1: TodayScreen (Hero Hourly Guidance, Panchang, Quick Advice)
      ├── Tab 2: ChartScreen (D1/D9/D10/Moon/Chalit, Ephemeris Table, Dasha, Doshas)
      ├── Tab 3: PredictionsScreen (Hourly, Daily, Weekly, Monthly, Yearly, Mahadasha)
      └── Tab 4: ProfileScreen (User Account, Birth Profiles, Saved Reports, Wallet)
 ├── Modal: ConsultationModal (Interactive AI Astrologer Chat Room)
 ├── Modal: AuthModal (Password & OTP Login/Register)
 ├── Modal: BirthProfileModal (Create/Edit Birth Particulars)
 └── Modal: PaywallModal (Transparent ₹49 Report Unlock)
```
