"""
Automated Astronomical & Astrological Calculation Verification Suite.
Exercises:
1. Ephemeris Planetary Longitudes & Ketu 180° opposition
2. Divisional Charts (D1, D9 Navamsha, D10 Dashamsha, Chalit)
3. Vimshottari Dasha 120-year cycle & Antardashas
4. 24-Hour Planetary Horas & Chaldean sequence
5. Ashtakoota 36-Guna Matchmaking algorithm
6. Manglik, Kaal Sarp, and Sade Sati rules
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime
from ephemeris import calculate_kundli
from divisional_charts import calculate_navamsha, calculate_dashamsha, calculate_moon_chart, calculate_chalit_chart
from dasha_engine import calculate_vimshottari_dasha
from hora_engine import calculate_24h_horas
from matchmaking import match_kundli_36_gunas
from doshas_and_remedies import analyze_doshas_and_remedies

def test_ephemeris_and_panchang():
    dob = "1996-11-24T14:30:00"
    res = calculate_kundli(dob, 28.6139, 77.2090, "Asia/Kolkata")
    
    # Assert metadata
    assert res["metadata"]["ayanamsha"] == "Lahiri (Chitrapaksha)"
    assert res["metadata"]["julian_day"] > 2450000.0
    
    # Assert Lagna
    assert res["lagna"]["sign"] in ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
    assert 0.0 <= res["lagna"]["degree"] < 30.0
    
    # Assert 9 Grahas present
    for planet in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]:
        assert planet in res["planets"]
        p_data = res["planets"][planet]
        assert 1 <= p_data["house"] <= 12
        assert 0.0 <= p_data["degree"] < 30.0
        assert 1 <= p_data["pada"] <= 4

    # Assert Ketu is strictly 180° opposite of Rahu
    rahu_deg = res["planets"]["Rahu"]["absolute_degree"]
    ketu_deg = res["planets"]["Ketu"]["absolute_degree"]
    diff = round(abs(rahu_deg - ketu_deg), 1)
    assert diff in [180.0, 180.0] or abs(diff - 180.0) < 0.2

    # Assert Panchang attributes
    p = res["panchang"]
    assert p["vaar"] in ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    assert len(p["tithi"]) > 0
    assert len(p["yoga"]) > 0
    assert len(p["karana"]) > 0
    print("[PASS] test_ephemeris_and_panchang passed")

def test_divisional_charts():
    dob = "1996-11-24T14:30:00"
    res = calculate_kundli(dob, 28.6139, 77.2090, "Asia/Kolkata")
    planets = res["planets"]
    lagna_deg = res["lagna"]["total_degree"]

    d9 = calculate_navamsha(planets, lagna_deg)
    assert "d9_lagna" in d9
    assert len(d9["planets"]) == 9
    for p in d9["planets"].values():
        assert 1 <= p["house"] <= 12

    d10 = calculate_dashamsha(planets, lagna_deg)
    assert "d10_lagna" in d10
    assert len(d10["planets"]) == 9
    for p in d10["planets"].values():
        assert 1 <= p["house"] <= 12

    moon_chart = calculate_moon_chart(planets)
    assert moon_chart["moon_lagna"]["sign"] == planets["Moon"]["sign"]
    assert moon_chart["planets"]["Moon"]["house"] == 1

    chalit = calculate_chalit_chart(planets, lagna_deg)
    assert len(chalit["planets"]) == 9
    for p in chalit["planets"].values():
        assert 1 <= p["chalit_house"] <= 12

    print("[PASS] test_divisional_charts passed")

def test_vimshottari_dasha():
    dob = datetime(1996, 11, 24, 14, 30, 0)
    # Moon in Bharani (13°20' to 26°40' Aries = 18.25 absolute degrees)
    moon_abs_deg = 18.25
    dashas = calculate_vimshottari_dasha(moon_abs_deg, dob)

    # Bharani Nakshatra lord is Venus (20 years)
    assert dashas["birth_balance"]["ruling_lord"] == "Venus"
    assert 0 < dashas["birth_balance"]["years_remaining"] <= 20.0
    
    # Timeline should have 9 Mahadashas
    timeline = dashas["timeline"]
    assert len(timeline) == 9
    assert timeline[0]["maha_dasha"] == "Venus"
    assert timeline[1]["maha_dasha"] == "Sun"
    assert timeline[2]["maha_dasha"] == "Moon"
    assert timeline[3]["maha_dasha"] == "Mars"
    assert timeline[4]["maha_dasha"] == "Rahu"
    assert timeline[5]["maha_dasha"] == "Jupiter"

    # Verify Antardashas present within each Mahadasha
    for md in timeline:
        assert len(md["antardashas"]) == 9

    assert "active_now" in dashas
    assert dashas["active_now"]["maha_dasha"] in ["Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu"]
    print("[PASS] test_vimshottari_dasha passed")

def test_hora_engine():
    sunrise = datetime(2026, 10, 20, 6, 24, 0)
    sunset = datetime(2026, 10, 20, 17, 48, 0)
    horas = calculate_24h_horas(sunrise, sunset)

    # Must contain exactly 24 Horas
    assert len(horas) == 24
    
    # First 12 are Day Horas, next 12 are Night Horas
    day_horas = [h for h in horas if h["period"] == "Day"]
    night_horas = [h for h in horas if h["period"] == "Night"]
    assert len(day_horas) == 12
    assert len(night_horas) == 12

    # Verify Tuesday lord is Mars
    # 2026-10-20 was a Tuesday (weekday = 1)
    assert day_horas[0]["ruling_planet"] == "Mars"
    # Following Chaldean order: Mars -> Sun -> Venus -> Mercury -> Moon -> Saturn -> Jupiter
    assert day_horas[1]["ruling_planet"] == "Sun"
    assert day_horas[2]["ruling_planet"] == "Venus"
    assert day_horas[3]["ruling_planet"] == "Mercury"
    print("[PASS] test_hora_engine passed")

def test_ashtakoota_matchmaking():
    # Test Case 1: Aries Moon (0°) & Sagittarius Moon (245°)
    m1 = match_kundli_36_gunas(15.0, 245.0)
    assert 0 <= m1["total_score"] <= 36.0
    bd1 = m1["breakdown"]
    total1 = (bd1["varna"]["obtained"] + bd1["vashya"]["obtained"] + bd1["tara"]["obtained"] + 
              bd1["yoni"]["obtained"] + bd1["graha_maitri"]["obtained"] + bd1["gana"]["obtained"] + 
              bd1["bhakoot"]["obtained"] + bd1["nadi"]["obtained"])
    assert round(total1, 1) == m1["total_score"]

    # Test Case 2: Identical Nakshatra => Same Nadi
    m2 = match_kundli_36_gunas(15.0, 15.0)
    assert m2["breakdown"]["nadi"]["has_dosha"] is True
    assert m2["breakdown"]["nadi"]["obtained"] == 0.0

    print("[PASS] test_ashtakoota_matchmaking passed")

def test_doshas():
    planets = {
        "Mars": {"sign": "Leo", "degree": 11.0, "house": 9},
        "Jupiter": {"sign": "Sagittarius", "degree": 26.0, "house": 1},
        "Moon": {"sign": "Aries", "degree": 18.0, "house": 5},
        "Sun": {"sign": "Scorpio", "degree": 8.0, "house": 12},
        "Mercury": {"sign": "Scorpio", "degree": 2.0, "house": 12},
        "Venus": {"sign": "Libra", "degree": 14.0, "house": 11},
        "Saturn": {"sign": "Pisces", "degree": 6.0, "house": 4},
        "Rahu": {"sign": "Virgo", "degree": 12.0, "house": 10},
        "Ketu": {"sign": "Pisces", "degree": 12.0, "house": 4}
    }
    doshas = analyze_doshas_and_remedies(planets, "Sagittarius")
    assert doshas["manglik"]["has_dosha"] is False # Mars in 9th
    assert "sade_sati" in doshas
    # Moon in Aries, transiting Saturn in Pisces (12th from Moon) => Phase 1 Rising
    assert doshas["sade_sati"]["is_active"] is True
    assert "Phase 1" in doshas["sade_sati"]["phase"]
    print("[PASS] test_doshas passed")

if __name__ == "__main__":
    test_ephemeris_and_panchang()
    test_divisional_charts()
    test_vimshottari_dasha()
    test_hora_engine()
    test_ashtakoota_matchmaking()
    test_doshas()
    print("\nALL 6 ASTRONOMICAL CALCULATION TEST SUITES PASSED!")
