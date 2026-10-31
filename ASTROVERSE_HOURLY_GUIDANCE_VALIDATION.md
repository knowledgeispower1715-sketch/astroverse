# ASTROVERSE HOURLY GUIDANCE VALIDATION REPORT

**Horizon:** Hourly Astrological Guidance  
**Calculation Module:** `services/kundli-engine/personalization_engine.py` (`generate_hourly_guidance`)  
**Methodology:** Unequal Astronomical Solar Horas & Hora Lord Parashari Relationship  

---

## 1. Mathematical Grounding: Unequal Solar Horas

Unlike naive 60-minute clock hour systems, classical Parashari Jyotish reckons Horas as unequal divisions of diurnal and nocturnal arcs:
- **Diurnal Arc:** $\text{Duration}_{day} = \text{Sunset} - \text{Sunrise}$; each day Hora = $\text{Duration}_{day} / 12$.
- **Nocturnal Arc:** $\text{Duration}_{night} = \text{Next Sunrise} - \text{Sunset}$; each night Hora = $\text{Duration}_{night} / 12$.
- **Hora Sequence:** Based on Chaldean order in descending orbital speed:  
  $\text{Saturn} \to \text{Jupiter} \to \text{Mars} \to \text{Sun} \to \text{Venus} \to \text{Mercury} \to \text{Moon}$.

---

## 2. Personalization Engine Implementation

`personalization_engine.py` personalizes each hourly window using:
1. **Hora Lord Functional Dignity:** Looks up whether the Hora ruler is a functional benefic, malefic, or Yogakaraka for the user's specific Lagna.
2. **Natal House Lordships:** Determines which specific life departments are activated during that hour.
3. **Dasha Harmony:** Evaluates whether the Hora ruler is friendly, neutral, or inimical to the active Mahadasha lord.
4. **Action Windows:**
   - **Peak Mid-Interval Execution:** Minutes 15–45 of the Hora offer the highest leverage.
   - **Hora Sandhi:** The initial 5 minutes and trailing 5 minutes are flagged as transitional cusps where impulsive actions should be deferred.
5. **Vedic Mantra Remediation:** Supplies the exact Beej Mantra corresponding to the active Hora ruler.

---

## 3. Contrastive Verification Evidence

Tested across distinct natal profiles during identical astronomical Hora (Sun Hora):

### Profile A: Anand Sharma (Leo Lagna, Sun is Lagnesha)
- **Title:** `Hourly Personal Guidance: Sun Hora (06:00 AM – 07:00 AM)`
- **Evaluation:** Sun is the direct Lagna lord (Lagnesha) placed in 10th house.
- **Guidance:** Direct executive authority, administrative clarity, high-stakes decision making.
- **Supportive Theme:** "Sun functions as your Lagnesha (ruler of House 1), illuminating direct initiative, personal conviction, and professional clarity."

### Profile B: Divya Mukherjee (Cancer Lagna, Sun rules 2nd House)
- **Title:** `Hourly Personal Guidance: Sun Hora (06:00 AM – 07:00 AM)`
- **Evaluation:** Sun rules House 2 (Dhana Bhava - liquid wealth and speech).
- **Guidance:** Financial reviews, family treasury allocations, diplomatic oral communication.
- **Supportive Theme:** "Sun commands your House 2 (Dhana Bhava), directing mental sharpness into financial consolidation and measured speech."

### Profile C: Kavya Menon (Aquarius Lagna, Sun rules 7th House)
- **Title:** `Hourly Personal Guidance: Sun Hora (06:00 AM – 07:00 AM)`
- **Evaluation:** Sun rules House 7 (Yuvati Bhava - Maraka and partner house).
- **Guidance:** Public negotiations, contractual diplomacy, balancing marital and commercial agreements without ego friction.
- **Supportive Theme:** "Sun commands your House 7 (Yuvati Bhava), focusing attention on one-on-one agreements, contractual alignment, and diplomatic partnerships."

---

## 4. Test Suite Certification

- **Unit Test:** `test_hourly_prediction_contrastive_differentiation` in `services/kundli-engine/tests/test_contrastive_personalization_12_profiles.py` **PASSED**.
- **Browser Live Verification:** Executed and confirmed in live Chrome DevTools session.
- **Screenshot Evidence:** `screenshots/01_guidance_hourly_grounded.png`.
