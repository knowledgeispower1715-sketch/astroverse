# Astroverse Forensic Implementation Audit & Defect Catalog

**Audit Date**: October 2026  
**Auditor**: Principal Software Architect & QA Lead  
**Repository**: `E:\rea`  
**Classification**: PRE-REPAIR FORENSIC ANALYSIS & ACTION PLAN

---

## 1. Executive Summary & Inventory

The Astroverse application has been audited across all frontend controllers, calculation services, API contracts, database schemas, and integration points. While the underlying calculation libraries (Swiss Ephemeris `pyswisseph`) and normalized database schemas (`schema.prisma`) are established, critical defects were identified in the user interface layer, form default initializations, location resolution, hourly Hora calculations, Kundli matching defaults, and static horoscope outputs.

---

## 2. Module-by-Module Defect Log

### Defect 1: Hardcoded Form Defaults in Kundli & Birth Profile Modals
* **Severity**: HIGH (Blocks Section 2)
* **Files Involved**: `index.html` (lines 836–865, lines 1370–1405)
* **Observed Defect**:
  - Gender defaulted to "Male" (`id="g-male-btn"` active).
  - Time of birth defaulted to `"12:00"` (noon).
  - Birthplace defaulted to a fixed 10-city select with "New Delhi, India" selected.
  - Save New Profile modal defaulted relationship to "Self", time to `"12:00"`, and city to "New Delhi, India".
* **Root Cause**: Premature placeholder values baked into HTML markup without empty-state enforcement.
* **Remediation**:
  - Initialize all inputs as empty (`value=""`).
  - Set Gender unselected (`g-male-btn` and `g-female-btn` inactive until user selection).
  - Add explicit "Birth time unknown" toggle.
  - Set relationship dropdown to `<option value="" disabled selected>Select Relationship</option>`.
* **Verification Test**: Verify initial DOM state on fresh session; verify form validation fails when required fields are missing.

---

### Defect 2: Rigid 10-City Birthplace Dropdown & Lack of Worldwide Geocoding
* **Severity**: CRITICAL (Blocks Section 3)
* **Files Involved**: `index.html` (lines 853–866), `services/kundli-engine/main.py`
* **Observed Defect**: Users could only select from 10 hardcoded cities. Worldwide locations, small towns, villages, and exact coordinates were impossible to input.
* **Root Cause**: Absence of an autocomplete geocoding provider and dynamic location resolution pipeline.
* **Remediation**:
  - Implement a worldwide location search input connected to Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`).
  - Add debounced user typing (300ms) with `AbortController` cancellation for in-flight queries.
  - Display disambiguated suggestions: Locality, State/Province (`admin1`), Country, and IANA Timezone.
  - Store resolved `latitude`, `longitude`, `timezone` (IANA), and formatted display name.
  - Include an explicit manual coordinate/timezone override toggle for off-grid or custom coordinates.
* **Verification Test**: Test queries for "Jabalpur, Madhya Pradesh, India", "Springfield, Illinois, United States", and "London, United Kingdom". Confirm coordinates and timezones update dynamically.

---

### Defect 3: Fixed 60-Minute Planetary Horas & Hardcoded Sunrise/Sunset
* **Severity**: CRITICAL (Blocks Section 5)
* **Files Involved**: `services/kundli-engine/main.py` (lines 113–115), `services/kundli-engine/hora_engine.py`, `index.html` (lines 1659–1689)
* **Observed Defect**:
  - `main.py` used hardcoded `06:24:00` sunrise and `17:48:00` sunset.
  - `index.html` rendered 24 fixed 60-minute slots (`00:00–01:00`, `01:00–02:00`, etc.) while claiming they were calculated from sunrise and sunset.
  - Arbitrary percentages (90%, 88%, 75%, 35%) were displayed without mathematical basis.
* **Root Cause**: Client-side mockup loop over civil clock hours instead of true astronomical sunrise-to-sunset unequal division.
* **Remediation**:
  - Implement dynamic sunrise, sunset, and next sunrise calculation using Swiss Ephemeris (`swe.rise_trans`) in `services/kundli-engine/hora_engine.py`.
  - Compute 12 daylight horas ($T_{\text{day\_hora}} = (T_{\text{sunset}} - T_{\text{sunrise}}) / 12$) and 12 nocturnal horas ($T_{\text{night\_hora}} = (T_{\text{next\_sunrise}} - T_{\text{sunset}}) / 12$).
  - Sequence horas using Chaldean planetary order starting from the weekday solar ruler at sunrise.
  - Display actual calculated start/end timestamps formatted in the target location's timezone.
  - Replace unverified percentages with traditional Parashari productivity themes and separate Rahu Kaal, Yamaganda, and Gulika Kaal periods.
* **Verification Test**: Verify unequal durations (e.g. 56 min day hora vs 64 min night hora in winter); verify active hora detection.

---

### Defect 4: Static & Shared Horoscope Outputs across Different Zodiac Signs
* **Severity**: HIGH (Blocks Section 6)
* **Files Involved**: `index.html` (lines 1813–1820)
* **Observed Defect**: Selecting different zodiac signs changed only the heading and a single generic sentence. Lucky color ("Crimson Red"), lucky number ("9"), auspicious window ("10:30 AM – 12:15 PM"), and ruling planet ("Mars") remained identical across all 12 signs.
* **Root Cause**: `selectHoroscopeSign` omitted updating the detail elements in the DOM.
* **Remediation**:
  - Implement a complete 12-sign astronomical dataset with sign lords, elements, colors, numbers, transit influences, and distinct forecasts.
  - Ensure switching signs updates all 4 metadata boxes dynamically.
  - Explicitly label reports as "General Zodiac Transit Forecast" for the current date.
* **Verification Test**: Cycle through all 12 signs; assert that color, number, ruling planet, and forecast text are distinct.

---

### Defect 5: Blocking Browser `alert()` Calls
* **Severity**: MEDIUM (Blocks Section 7.6)
* **Files Involved**: `index.html` (lines 1698–1702, lines 1520–1522, lines 1836, 1851, 1864, 1871, 1893, 1910, 1917)
* **Observed Defect**: Blocking browser alert popups used for forecast horizons ("Weekly Forecast: Benefic Sun-Mercury conjunction...") and form validation.
* **Root Cause**: Primitive debug `alert()` calls left in production templates.
* **Remediation**:
  - Remove all `alert()` calls.
  - Implement an accessible non-blocking Toast Notification system and dedicated inline forecast cards.
* **Verification Test**: Trigger forecast buttons and form validation; confirm zero browser alerts appear.

---

### Defect 6: Default Moon Signs & Hardcoded 35.5/36 Score in Kundli Matching
* **Severity**: CRITICAL (Blocks Section 8)
* **Files Involved**: `index.html` (lines 1143, 1156, lines 1707–1754)
* **Observed Defect**:
  - Boy's Moon Sign defaulted to Sagittarius (`value="8"` selected).
  - Girl's Moon Sign defaulted to Aries (`value="0"` selected).
  - `calculate36GunasUI` hardcoded `varna = 1.0, vashya = 2.0, tara = 3.0, yoni = 3.5, maitri = 5.0, gana = 6.0, bhakoot = 7.0, nadi = 8.0`, yielding an arbitrary 35.5/36 score instead of calling the authentic 8-Koota engine.
* **Root Cause**: Placeholder client calculation mocking compatibility.
* **Remediation**:
  - Initialize both selects as unselected (`<option value="" disabled selected>Choose Moon Sign...</option>`).
  - Wire UI calculation to call `/api/matchmaking` (or execute the authoritative 8-Koota algorithm in `matchmaking.py`), computing real scores for all 8 Kootas.
  - Require valid selections before score computation.
* **Verification Test**: Verify initial state has no score; verify selection of incompatible signs triggers Nadi Dosha (0 pts) or Bhakoot Dosha (0 pts).

---

### Defect 7: Hardcoded ₹150.00 Wallet Balance & Demo Session Seeding
* **Severity**: HIGH (Blocks Section 10)
* **Files Involved**: `index.html` (line 739, line 1468)
* **Observed Defect**:
  - Header displayed hardcoded `₹150.00` on initial load.
  - `currentWalletBalance` initialized from `localStorage.getItem('astro_wallet_bal') || '150.00'`.
* **Root Cause**: Demo balance placeholder hardcoded into template.
* **Remediation**:
  - Initialize wallet balance to `0.00` for unauthenticated sessions.
  - Show "Guest / Sign In" status until authenticated.
  - Fetch balance dynamically from `/api/wallet/balance` upon successful OTP authentication.
* **Verification Test**: Clear `localStorage`; refresh page; verify balance displays `₹0.00` and authentication prompt is present.

---

### Defect 8: FreeAstrologyAPI Integration & External Verification Boundary
* **Severity**: HIGH (User Request Requirement)
* **Files Involved**: `services/kundli-engine/external_api.py`, `services/kundli-engine/main.py`
* **Observed Defect**: FreeAstrologyAPI key was provided (`TlI51pEPIW3hTnSI8ogDTR66j48B5D278ZH7Gbkh`) but not yet integrated into the calculation engine for external planetary coordinates and chart URLs.
* **Remediation**:
  - Implement `services/kundli-engine/external_api.py` connecting to `https://json.freeastrologyapi.com/planets`, `planets/extended`, and `horoscope-chart-url`.
  - Build hybrid failover: Query FreeAstrologyAPI when online; cross-verify and failover to Swiss Ephemeris (`pyswisseph`) for complete offline reliability.
* **Verification Test**: Test `/api/external-kundli` endpoint with live API key; assert 200 OK response with external ephemeris output.

---

## 3. Corrective Action Roadmap

1. **Step 2**: Implement `services/kundli-engine/external_api.py` with FreeAstrologyAPI integration (`TlI51pEPIW3hTnSI8ogDTR66j48B5D278ZH7Gbkh`) and test live connectivity.
2. **Step 3**: Rebuild `services/kundli-engine/hora_engine.py` using Swiss Ephemeris `swe.rise_trans` for true astronomical sunrise, sunset, and next sunrise with unequal 24-hour Horas, Chaldean planetary ruler order, and Rahu Kaal.
3. **Step 4**: Update `services/kundli-engine/main.py` with location endpoints, admin health monitoring, external API routes, and live Hora calculation.
4. **Step 5**: Rebuild `index.html`:
   - Empty form defaults, "Birth time unknown" toggle.
   - Worldwide Open-Meteo geocoding search with debouncing, suggestion dropdown, and IANA timezone resolution.
   - True 24-hour planetary Horas UI with live countdown and actual sunrise/sunset.
   - Distinct 12-sign daily horoscope engine.
   - Unselected Moon signs and authentic 8-Koota Ashtakoota matchmaking.
   - Personalization gate for AI Astrologer Guru with grounded Parashari reading.
   - Non-blocking toast notification system replacing all `alert()` calls.
   - Genuine wallet balance initialization (₹0.00 on guest session).
5. **Step 6**: Comprehensive automated testing, regression execution, and technical documentation generation.
