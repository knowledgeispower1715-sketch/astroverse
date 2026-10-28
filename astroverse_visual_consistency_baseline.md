# ASTROVERSE — VISUAL CONSISTENCY & DEFECT BASELINE AUDIT

**Audit Date**: 2026-10-28 22:30 IST  
**Repository**: `E:\rea`  
**Active Branch**: `feature/premium-reports-and-subscriptions`  
**Base Commit**: `4f2bc172787b29444da71cb16cd1b7208bed1f05`  
**Inspected Assets**:
- `media_1793205500262_5b180538.png` (Overview / Homepage)
- `media_1793205585761_f7c23399.png` (Consult Vedic AI Astrologer Personas `#astrologers`)
- `media_1793205678069_92f59d5d.png` (Free Janam Kundli & Forecast Horizons `#kundli`)
- `media_1793205754008_1156e7e9.png` (AI Astrologer Consultation Modal `#ai-astrologer-modal`)

---

## 1. COMPONENT-LEVEL DEFECT LEDGER

| # | Screenshot Reference | Affected Feature / Area | Actual Source Selector | Confirmed Root Cause | Severity | Corrective Plan |
|---|---|---|---|---|---|---|
| **1** | Image 1 (`5b180538`) | **Today's Cosmic Rhythm Panchang Cards** | `#daily-guidance-overview-card > div > div` (lines 5293–5310) | Hardcoded `background: rgba(56, 7, 16, 0.75)` (maroon) inside white card. Subtitles inherit `--av-text-subtle: #566074`, causing unreadable **1.3:1 contrast** on dark maroon. | **CRITICAL** | Refactor to refined `--av-brand-raised` (`#293452`) or clean `--av-surface-subtle` with explicit `#FFFFFF` / `--av-text-primary` high-contrast text (>= 7:1). |
| **2** | Image 1 (`5b180538`) | **Panchang Card Heading** | `#daily-guidance-overview-card h3` (line 5280) | Hardcoded `color: var(--av-text-light, #FFFFFF)` inside white card `.overview-daily-guidance-card` causing invisible/pale heading. | **CRITICAL** | Set explicit `--av-text-primary` (`#20263A`) on light surface. |
| **3** | Image 1 (`5b180538`) | **12 Rashi Quick Horoscope Strip** | `.rashi-quick-pill` (lines 512–527) | `background: rgba(56, 7, 16, 0.85)` (maroon) with gold border clashes with Midnight Indigo theme. | **MEDIUM** | Style pills with luxury navy brand background (`#18213A`) and crisp gold accents. |
| **4** | Image 1 (`5b180538`) | **Service Directory Art Headers** | `.cosmic-card-art-wrap` (line 673) | `background: linear-gradient(135deg, #180307 0%, #380710 50%, #4A0E17 100%)` (maroon gradient) creates disjoint look. | **MEDIUM** | Unify art wrap to Midnight Indigo gradient (`linear-gradient(135deg, #0F172A 0%, #18213A 60%, #293452 100%)`). |
| **5** | Image 2 (`f7c23399`) | **Astrologer Persona Cards** | `.astrologer-profile-card` (lines 1754–1770) | `background: var(--av-maroon-gradient, linear-gradient(145deg, #4A0E17 0%, #6B1D2F 55%, #380710 100%))` creates heavy maroon blocks on warm ivory canvas. Dim description text. | **HIGH** | Unify persona cards into clean luxury surfaces (`#FFFFFF` or deep brand `#18213A`), with gold badges, crisp Devanagari/English typography, and WCAG AAA contrast. |
| **6** | Image 3 (`92f59d5d`) | **Kundli Forecast Containers** | Remedies, Precautions, Yogas containers in `#forecast-outlook-container` | Inconsistent pastel backgrounds (pale yellow `#FFFBEB`, pale green `#ECFDF5`, pale pink `#FEF2F2`) without shared card elevation. | **MEDIUM** | Standardize around `--av-surface` (`#FFFFFF`), with consistent border-radius (`14px`), subtle shadow, and semantic status borders (Emerald for remedies, Amber/Ruby for precautions). |
| **7** | Image 4 (`1156e7e9`) | **AI Astrologer Header Language Toggle** | `#ai-astrologer-modal` header (lines 6200–6250) | Missing compact segmented control **English \| हिंदी**. User cannot choose response language within the consultation. | **CRITICAL** | Add accessible, keyboard-navigable segmented control in modal header. Send `lang` with every API request and sync with voice narration. |
| **8** | Image 4 (`1156e7e9`) | **AI Astrologer Modal Header Styling** | `#ai-astrologer-modal .ai-chat-header` | Styled in dark maroon (`#4A0E17`) with gold accents; user message bubbles also dark maroon. | **MEDIUM** | Refactor modal header to Midnight Indigo `--av-brand` (`#18213A`), with user bubbles in `--av-brand-raised` (`#293452`). |
| **9** | Image 4 (`1156e7e9`) | **Overly Verbose Greeting on "Hi"** | `chat_orchestrator.py` & `generateClientAstrologicalResponse` | Responds to simple "hi" with long 4-paragraph generic essay instead of a warm, concise greeting and prompt to ask a question. | **HIGH** | Make greeting concise, warm, and natural in both English and Hindi. |
| **10** | Image 4 (`1156e7e9`) | **Speech Narration & Transcript Synchronization** | `AstroVerseVoiceEngine` / chat voice handler | Voice narration does not adapt to `hi-IN` when Hindi conversation is selected. | **HIGH** | Ensure `hi-IN` voice is preferred for Hindi responses and `en-IN` for English responses. |

---

## 2. CENTRAL THEME TOKEN MAPPING

```css
:root {
  /* Brand */
  --av-brand: #18213A;
  --av-brand-raised: #293452;
  --av-brand-border: #414967;

  /* Canvas and surfaces */
  --av-canvas: #F7F5EF;
  --av-surface: #FFFFFF;
  --av-surface-subtle: #F0EEE8;
  --av-border: #D9DDE5;

  /* Light-surface text */
  --av-text-primary: #20263A;
  --av-text-secondary: #566074;

  /* Dark-surface text */
  --av-text-inverse: #FFFFFF;
  --av-text-inverse-secondary: #E2E7F0;

  /* Accent */
  --av-gold: #D4AF37;
  --av-gold-hover: #C49A32;
  --av-gold-cta: #E2B64B;
  --av-gold-cta-text: #211B0D;

  /* Restrained blue accent */
  --av-blue: #3B82F6;

  /* Semantic status */
  --av-success-text: #176B55;
  --av-success-bg: #E2F3EA;

  --av-warning-text: #85520B;
  --av-warning-bg: #FFF1CC;

  --av-error-text: #991B1B;
  --av-error-bg: #FEE2E2;

  /* Layout */
  --av-page-gutter: clamp(16px, 3vw, 36px);
  --av-content-max: 1360px;
  --av-reading-max: 1040px;

  /* Shape and elevation */
  --av-radius-sm: 8px;
  --av-radius-md: 14px;
  --av-radius-lg: 20px;

  --av-shadow-card: 0 8px 24px rgba(24, 33, 58, 0.07);
  --av-shadow-elevated: 0 18px 44px rgba(24, 33, 58, 0.13);

  --av-control-height: 46px;
  --av-focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.38);
}
```
