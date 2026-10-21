"""
Automated Test Suite for Advanced Vedic Astrological Methodologies:
Exercises:
1. Jaimini Chara Karakas, Arudha Lagna, Upapada Lagna, Rashi Drishti & Chara Dasha
2. Krishnamurti Padhdhati (KP): KP Ayanamsha, Placidus Cusps, Sub-Lord Table, 4-Fold Significators
3. Tajika Varshaphal: Solar Return Instant, Muntha, Panchadhikaris, Varsheshwara, Sahams
4. Panchang & Muhurtas: 5 Limbs, Rahu Kaal, Yamaganda, Gulika Kaal, Abhijit & Brahma Muhurta
5. Parashari Shadbala (Sixfold Strength) and Classical Yogas Detection
6. Explainable Multi-Method Comparison (Agreements & Divergences)
7. Standardized 9-Section Structured Prediction Report Verification
"""

import sys
import os
from datetime import datetime, date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ephemeris import calculate_kundli
from dasha_engine import calculate_vimshottari_dasha
from jaimini_engine import (
    calculate_chara_karakas,
    calculate_arudha_padas,
    calculate_rashi_drishti,
    calculate_chara_dasha,
    analyze_jaimini_system
)
from kp_engine import get_sub_lord_for_degree, calculate_kp_chart
from tajika_engine import calculate_muntha, calculate_varshaphal
from panchang_engine import calculate_full_panchang
from shadbala_and_yogas import detect_classical_yogas, calculate_shadbala
from multi_method_engine import build_multi_method_comparison
from ai_astrologer import generate_structured_prediction

# Canonical reference profile: 2005-08-20 14:05 IST, Jabalpur (23.1815, 79.9864)
DEMO_DOB = "2005-08-20T14:05:00"
DEMO_LAT = 23.1815
DEMO_LON = 79.9864
DEMO_TZ = "Asia/Kolkata"

def test_jaimini_engine():
    k = calculate_kundli(DEMO_DOB, DEMO_LAT, DEMO_LON, DEMO_TZ)
    planets = k["planets"]
    lagna_sign = k["lagna"]["sign"]

    jaimini = analyze_jaimini_system(planets, lagna_sign)

    # 1. 7 Chara Karakas
    karakas = jaimini["chara_karakas"]
    assert len(karakas) == 7
    expected_karakas = ["Atmakaraka", "Amatyakaraka", "Bhratrikaraka", "Matrikaraka", "Putrakaraka", "Gnatikaraka", "Darakaraka"]
    for ek in expected_karakas:
        assert ek in karakas
        assert karakas[ek]["planet"] in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
        assert 0.0 <= karakas[ek]["degree"] < 30.0

    # Degrees must be strictly non-increasing across the 7 karakas
    deg_list = [karakas[ek]["degree"] for ek in expected_karakas]
    for i in range(len(deg_list) - 1):
        assert deg_list[i] >= deg_list[i + 1]

    # 2. Arudha Padas
    arudhas = jaimini["arudha_padas"]
    assert "AL (Arudha Lagna)" in arudhas
    assert "UL (Upapada)" in arudhas
    for pada_key, pada_val in arudhas.items():
        assert 1 <= pada_val["house"] <= 12
        assert pada_val["sign"] in [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]

    # 3. Rashi Drishti
    drishti = jaimini["rashi_drishti"]
    assert "Sun" in drishti
    assert "Moon" in drishti
    for p, d_data in drishti.items():
        assert isinstance(d_data["aspected_signs"], list)
        assert len(d_data["aspected_signs"]) == 3  # Each sign aspects exactly 3 other signs

    # 4. Chara Dasha
    chara = jaimini["chara_dasha"]
    assert len(chara) == 12
    for slot in chara:
        assert slot["duration_years"] in range(1, 13)

def test_kp_engine():
    kp = calculate_kp_chart(DEMO_DOB, DEMO_LAT, DEMO_LON, DEMO_TZ)

    # Metadata
    assert kp["metadata"]["tradition"] == "Krishnamurti Padhdhati (KP System)"
    assert "KP" in kp["metadata"]["ayanamsha"]
    assert kp["metadata"]["house_system"] == "Placidus Semi-Arc"

    # House Cusps
    cusps = kp["house_cusps"]
    assert len(cusps) == 12
    for h in range(1, 13):
        c = cusps[h]
        assert c["house"] == h
        assert c["sign_lord"] in ["Mars", "Venus", "Mercury", "Moon", "Sun", "Jupiter", "Saturn"]
        assert c["star_lord"] in ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
        assert c["sub_lord"] in ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]

    # Planets
    planets = kp["planets"]
    for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]:
        assert p in planets
        assert 1 <= planets[p]["house"] <= 12
        assert planets[p]["sub_lord"] is not None

    # Significators
    sig = kp["significators"]
    assert len(sig) == 12
    for h in range(1, 13):
        assert "level_a_strongest" in sig[h]
        assert "level_d_house_lord" in sig[h]

def test_tajika_engine():
    # Test completed year 21 (2026 for 2005 native)
    tajika = calculate_varshaphal(DEMO_DOB, 2026, DEMO_LAT, DEMO_LON, DEMO_TZ)

    # Metadata
    assert tajika["metadata"]["completed_years"] == 21
    assert tajika["metadata"]["target_year"] == 2026

    # Varshaphal Lagna & Planets
    assert tajika["varsha_lagna"]["sign"] in [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    assert len(tajika["planets"]) == 9

    # Muntha
    muntha = tajika["muntha"]
    assert muntha["completed_years"] == 21
    assert 1 <= muntha["varsha_house"] <= 12

    # Panchadhikaris
    pancha = tajika["panchadhikaris"]
    assert "selected_varsheshwara" in pancha
    assert pancha["selected_varsheshwara"] in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

    # Sahams
    sahams = tajika["sahams"]
    assert "punya_saham" in sahams
    assert "vidya_saham" in sahams
    assert "karma_saham" in sahams
    assert 0.0 <= sahams["punya_saham"]["degree"] < 30.0

def test_panchang_and_muhurta_engine():
    panchang = calculate_full_panchang("2026-10-21", DEMO_LAT, DEMO_LON, DEMO_TZ)

    p = panchang["panchang"]
    assert p["vara"] == "Wednesday"
    assert p["day_lord"] == "Mercury"
    assert "Shukla" in p["tithi"]["paksha"] or "Krishna" in p["tithi"]["paksha"]
    assert p["tithi"]["number"] in range(1, 31)
    assert p["nakshatra"]["name"] in [
        "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
        "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
        "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
        "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
        "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
    ]
    assert p["yoga"]["number"] in range(1, 28)
    assert p["karana"]["name"] != ""

    # Solar Cycle
    assert "sunrise" in panchang["solar_cycle"]
    assert "sunset" in panchang["solar_cycle"]

    # Inauspicious & Auspicious Muhurtas
    inauspicious = panchang["inauspicious_windows"]
    assert "rahu_kaal" in inauspicious
    assert "yamaganda" in inauspicious
    assert "gulika_kaal" in inauspicious

    auspicious = panchang["auspicious_windows"]
    assert "abhijit_muhurta" in auspicious
    assert "brahma_muhurta" in auspicious

def test_shadbala_and_yogas():
    k = calculate_kundli(DEMO_DOB, DEMO_LAT, DEMO_LON, DEMO_TZ)
    planets = k["planets"]
    lagna_sign = k["lagna"]["sign"]

    yogas = detect_classical_yogas(planets, lagna_sign)
    assert isinstance(yogas, list)

    shadbala = calculate_shadbala(planets, lagna_sign)
    for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        assert p in shadbala
        assert shadbala[p]["total_virupas"] > 100.0
        assert shadbala[p]["total_rupas"] > 2.0
        assert "breakdown" in shadbala[p]
        assert "sthana_bala" in shadbala[p]["breakdown"]
        assert "dig_bala" in shadbala[p]["breakdown"]

def test_multi_method_comparison():
    k = calculate_kundli(DEMO_DOB, DEMO_LAT, DEMO_LON, DEMO_TZ)
    signs = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    moon_idx = signs.index(k["planets"]["Moon"]["sign"])
    moon_abs = (moon_idx * 30.0) + k["planets"]["Moon"]["degree"]
    dashas = calculate_vimshottari_dasha(moon_abs, datetime.fromisoformat(DEMO_DOB))

    jaimini = analyze_jaimini_system(k["planets"], k["lagna"]["sign"])
    kp = calculate_kp_chart(DEMO_DOB, DEMO_LAT, DEMO_LON, DEMO_TZ)
    tajika = calculate_varshaphal(DEMO_DOB, 2026, DEMO_LAT, DEMO_LON, DEMO_TZ)

    comparison = build_multi_method_comparison(k, dashas, jaimini, kp, tajika)

    assert comparison["title"] == "Explainable Multi-Method Astrological Comparison"
    assert len(comparison["methods"]) == 4
    method_ids = [m["method_id"] for m in comparison["methods"]]
    assert "parashari" in method_ids
    assert "jaimini" in method_ids
    assert "kp" in method_ids
    assert "tajika" in method_ids

    assert len(comparison["points_of_agreement"]) > 0
    assert len(comparison["points_of_divergence"]) > 0
    for d in comparison["points_of_divergence"]:
        assert "technical_reason" in d
    assert "epistemic_statement" in comparison

def test_nine_section_structured_prediction_report():
    k = calculate_kundli(DEMO_DOB, DEMO_LAT, DEMO_LON, DEMO_TZ)
    signs = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    moon_idx = signs.index(k["planets"]["Moon"]["sign"])
    moon_abs = (moon_idx * 30.0) + k["planets"]["Moon"]["degree"]
    dashas = calculate_vimshottari_dasha(moon_abs, datetime.fromisoformat(DEMO_DOB))
    doshas = {
        "manglik": {"has_dosha": False, "verdict": "No Manglik"},
        "kalsarp": {"has_dosha": False},
        "sade_sati": {"is_active": True, "phase": "Peak Phase (Janma Shani)"}
    }

    for horizon in ["hourly", "daily", "weekly", "monthly", "yearly", "mahadasha"]:
        report = generate_structured_prediction(
            horizon,
            "2026-10-21",
            k,
            dashas,
            doshas,
            active_hora_planet="Jupiter",
            hora_window="02:15 PM – 03:22 PM",
            category="career"
        )

        assert report["time_horizon"] == horizon
        sections = report["sections"]

        # Phase 5: Exactly 9 canonical sections must be present
        assert "executive_summary" in sections and len(sections["executive_summary"]) > 0
        assert "overall_outlook" in sections and len(sections["overall_outlook"]) > 0
        assert "supportive_themes" in sections and len(sections["supportive_themes"]) > 0
        assert "challenges_and_cautions" in sections and len(sections["challenges_and_cautions"]) > 0
        assert "key_time_windows" in sections and len(sections["key_time_windows"]) > 0
        assert "relevant_chart_facts" in sections and isinstance(sections["relevant_chart_facts"], dict)
        assert "applicable_traditional_rules" in sections and len(sections["applicable_traditional_rules"]) > 0
        assert "practical_reflection" in sections and len(sections["practical_reflection"]) > 0
        assert "limitations" in sections and len(sections["limitations"]) > 0

        # Backward compatibility aliases
        assert "supportive_developments" in sections
        assert "relevant_time_windows" in sections
        assert "why_this_applies" in sections
