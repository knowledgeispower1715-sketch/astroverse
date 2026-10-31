# ASTROVERSE DAILY GUIDANCE VALIDATION REPORT

**Horizon:** Daily Personal Forecast (24-Hour Horizon)  
**Calculation Module:** `services/kundli-engine/personalization_engine.py` (`generate_daily_guidance`)  
**Methodology:** Sidereal Moon Gochara (Lagna & Chandra), Tara Bala, Chandrashtama, and Dasha  

---

## 1. Daily Jyotish Mechanics

Daily forecasts are synthesized from 5 interacting celestial layers:
1. **Lagna-Gochara:** Transiting Moon sign mapped to the house it activates from the natal Ascendant ($1..12$).
2. **Chandra-Gochara:** Transiting Moon sign mapped relative to the natal Moon (Chandra Bala).
3. **Tara Bala:** Relationship between natal Moon Nakshatra and transit Moon Nakshatra (Navatara system).
4. **Chandrashtama & Shani Status:** Flags if transiting Moon is 8th from natal Moon or under active Sade Sati / Kantaka Shani.
5. **Mahadasha Cycle Influence:** Filters general transits through the user's active Mahadasha lord.

---

## 2. Personalization Differentiation Logic

Unlike the legacy implementation which presented static boilerplate lists, `personalization_engine.py` constructs completely differentiated daily forecasts:

### Supportive Themes
- **Bullet 1 (Energized House Domain):** Specific to the house activated by transiting Moon for that Lagna (12 unique domains).
- **Bullet 2 (Mahadasha Lord Directive):** Specific Parashari operational guidance corresponding to the ruling Mahadasha lord (9 distinct planetary directives).
- **Bullet 3 (Lagna Yogakaraka / Benefic Alignment):** Identifies the auspicious supporting planet for that specific Ascendant (12 distinct rules).

### Challenges & Cautions
- **Bullet 1 (House Risk Mitigation):** House-specific risk mitigation ($1..12$).
- **Bullet 2 (Tara Bala / Chandrashtama Warning):** Evaluates exact Navatara condition (Vipat / Pratyak / Naidhana) or Chandrashtama protective guidance.
- **Bullet 3 (Action & Timing Advice):** Localized Rahu Kaal and discipline advice.

---

## 3. Contrastive Statistical Verification Across 12 Lagnas

Tested on target date `2026-11-01` (Transit Moon in Cancer):

| Profile | Lagna | Moon Sign | Activated House | Tara Bala | Jaccard Overlap with Other Profiles |
|---|---|---|---|---|---|
| **Aarav Sharma** | Aries | Capricorn | House 4 (Sukha) | Kshema (Favorable) | $\le 0.456$ |
| **Bhavya Patel** | Taurus | Virgo | House 3 (Sahaja) | Sadhana (Favorable) | $\le 0.456$ |
| **Chetan Iyer** | Gemini | Aries | House 2 (Dhana) | Vipat (Guarded) | $\le 0.416$ |
| **Divya Mukherjee** | Cancer | Aquarius | House 1 (Lagna) | Naidhana (Guarded) | $\le 0.556$ |
| **Eshaan Verma** | Leo | Sagittarius | House 12 (Vyaya) | Mitra (Favorable) | $\le 0.412$ |
| **Farhan Khan** | Virgo | Cancer | House 11 (Labha) | Janma (Neutral) | $\le 0.542$ |
| **Gauri Joshi** | Libra | Gemini | House 10 (Karma) | Vipat (Guarded) | $\le 0.556$ |
| **Harshvardhan Rao** | Scorpio | Leo | House 9 (Dharma) | Sadhana (Favorable) | $\le 0.420$ |
| **Ishani Sen** | Sagittarius | Libra | House 8 (Randhra) | Vipat (Guarded) | $\le 0.518$ |
| **Jaideep Nair** | Capricorn | Scorpio | House 7 (Yuvati) | Mitra (Favorable) | $\le 0.537$ |
| **Kavya Menon** | Aquarius | Sagittarius | House 6 (Ari) | Mitra (Favorable) | $\le 0.395$ |
| **Lakshya Das** | Pisces | Pisces | House 5 (Putra) | Kshema (Favorable) | $\le 0.542$ |

- **Exact Duplicate Sets:** **0%** (zero identical outputs across all 66 pairs).
- **Maximum Pairwise Token Jaccard Similarity:** **0.556** (well below the 0.60 threshold).

---

## 4. Test Suite Certification

- **Pytest:** `test_daily_prediction_contrastive_differentiation` in `services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py` **PASSED**.
- **Browser Live Verification:** Executed and confirmed in live Chrome DevTools session.
- **Screenshot Evidence:** `screenshots/02_guidance_daily_grounded.png`.
