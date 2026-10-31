# ASTROVERSE PERSONALIZATION CONTRASTIVE TEST CERTIFICATION

**Test Suite:** `services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py`  
**Execution Date:** 2026-11-01  
**Target Analysis Date:** `2026-11-01` (Fixed evaluation baseline across all profiles)  
**Total Profiles Evaluated:** 12  
**Total Pairwise Comparisons:** $\frac{12 \times 11}{2} = 66$ pairs  

---

## 1. 12 Diverse Synthetic Natal Profiles

The test suite evaluates 12 distinct profiles engineered to span all 12 zodiac Ascendants (Aries through Pisces), diverse Moon signs, and distinct Vimshottari Mahadashas:

| Profile ID | Profile Name | Date of Birth | Location | Lagna | Moon Sign | Birth Nakshatra | Active Mahadasha |
|---|---|---|---|---|---|---|---|
| `prof_01_aries` | Aarav Sharma | 1990-04-20 06:15 | New Delhi, DL | **Aries** | Capricorn | Dhanishta | Jupiter |
| `prof_02_taurus` | Bhavya Patel | 1991-08-15 00:30 | Mumbai, MH | **Taurus** | Virgo | Chitra | Saturn |
| `prof_03_gemini` | Chetan Iyer | 1992-11-10 21:45 | Chennai, TN | **Gemini** | Aries | Krittika | Rahu |
| `prof_04_cancer` | Divya Mukherjee | 1993-01-25 17:15 | Kolkata, WB | **Cancer** | Aquarius | Shatabhisha | Saturn |
| `prof_05_leo` | Eshaan Verma | 1995-06-15 10:30 | New Delhi, DL | **Leo** | Sagittarius | Uttara Ashadha | Rahu |
| `prof_06_virgo` | Farhan Khan | 1996-03-30 19:15 | Lucknow, UP | **Virgo** | Cancer | Ashlesha | Venus |
| `prof_07_libra` | Gauri Joshi | 1997-07-04 13:45 | Ahmedabad, GJ | **Libra** | Gemini | Ardra | Saturn |
| `prof_08_scorpio` | Harshvardhan Rao| 1998-09-18 10:45 | Bengaluru, KA | **Scorpio** | Leo | Magha | Venus |
| `prof_09_sagittarius`| Ishani Sen | 1999-12-05 09:15 | Hyderabad, TS | **Sagittarius**| Libra | Swati | Saturn |
| `prof_10_capricorn` | Jaideep Nair | 2000-02-28 05:30 | Varanasi, UP | **Capricorn** | Scorpio | Jyeshtha | Mercury |
| `prof_11_aquarius` | Kavya Menon | 2001-05-12 02:00 | Surat, GJ | **Aquarius** | Sagittarius | Purva Ashadha | Venus |
| `prof_12_pisces` | Lakshya Das | 2002-10-20 17:15 | Panaji, GA | **Pisces** | Pisces | Revati | Mercury |

---

## 2. Statistical Differentiation & Jaccard Overlap Matrix

Each profile was queried for daily predictions on `2026-11-01`. Word token sets of `supportive_themes` and `challenges_and_cautions` were extracted and compared using Jaccard similarity:

$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

### Summary Results
- **Total Pairwise Combinations Tested:** 66
- **Pairs with Identical Outputs ($J = 1.0$):** **0** (0.0%)
- **Pairs with $J > 0.60$:** **0** (0.0%)
- **Maximum Observed Jaccard Similarity:** **0.556** (between Divya Mukherjee [Cancer Lagna] and Gauri Joshi [Libra Lagna], who share Saturn dasha but have completely distinct house activations and challenges).
- **Mean Pairwise Jaccard Similarity:** **0.384** (high lexical and conceptual divergence).

### Top 8 Comparison Pairs

| Pair | Profile 1 Lagna | Profile 2 Lagna | Jaccard Similarity | Distinct Non-Overlapping Words |
|---|---|---|---|---|
| Divya Mukherjee vs. Gauri Joshi | Cancer | Libra | **0.556** | 36 distinct words |
| Farhan Khan vs. Lakshya Das | Virgo | Pisces | **0.542** | 38 distinct words |
| Farhan Khan vs. Jaideep Nair | Virgo | Capricorn | **0.537** | 38 distinct words |
| Gauri Joshi vs. Ishani Sen | Libra | Sagittarius | **0.518** | 40 distinct words |
| Jaideep Nair vs. Lakshya Das | Capricorn | Pisces | **0.500** | 42 distinct words |
| Divya Mukherjee vs. Ishani Sen | Cancer | Sagittarius | **0.465** | 46 distinct words |
| Aarav Sharma vs. Bhavya Patel | Aries | Taurus | **0.456** | 49 distinct words |
| Chetan Iyer vs. Lakshya Das | Gemini | Pisces | **0.416** | 52 distinct words |

---

## 3. House Energization Verification

For transiting Moon in Cancer on `2026-11-01`, the activated house is verified across all 12 Lagnas:
- **Aries:** House 4 (Sukha Bhava)
- **Taurus:** House 3 (Sahaja Bhava)
- **Gemini:** House 2 (Dhana Bhava)
- **Cancer:** House 1 (Lagna Bhava)
- **Leo:** House 12 (Vyaya Bhava)
- **Virgo:** House 11 (Labha Bhava)
- **Libra:** House 10 (Karma Bhava)
- **Scorpio:** House 9 (Dharma Bhava)
- **Sagittarius:** House 8 (Randhra Bhava)
- **Capricorn:** House 7 (Yuvati Bhava)
- **Aquarius:** House 6 (Ari Bhava)
- **Pisces:** House 5 (Putra Bhava)

All 12 houses ($1..12$) are uniquely energized across the 12 signs without duplicate or omitted houses.

---

## 4. Test Suite Execution Command & Result

```bash
python -m pytest services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py -v
```

```
============================= test session starts =============================
collected 6 items

services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py::test_twelve_lagnas_astronomical_grounding PASSED [ 16%]
services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py::test_daily_prediction_contrastive_differentiation PASSED [ 33%]
services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py::test_hourly_prediction_contrastive_differentiation PASSED [ 50%]
services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py::test_mahadasha_prediction_contrastive_differentiation PASSED [ 66%]
services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py::test_weekly_prediction_contrastive_house_activation PASSED [ 83%]
services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py::test_hindi_localization_contrastive_12_profiles PASSED [100%]

============================== 6 passed in 0.51s ==============================
```
