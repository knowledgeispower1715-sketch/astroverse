"""
Integration and Regression Tests for VedAstro-Inspired Enhancements:
1. Parashari Ashtakavarga Engine (BAV, SAV 337 bindus invariant, BV Raman benchmark).
2. Extended 12-Kuta Matchmaking (Rajju, Vedha, Mahendra, Stree Deergha).
3. Timing & Election Tools (Tarabala 9-fold & 3-cycle, Chandrabala, Ghataka Chakra).
4. Full Shodashavarga Divisional Charts (D1, D2, D3, D7, D9, D10, D12, D60).
5. FastAPI route integration.
"""

import os
import sys
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ashtakavarga_engine import calculate_ashtakavarga, TOTAL_SAV_BINDUS, PLANET_EXPECTED_TOTALS, SIGNS
from divisional_charts import (
    calculate_hora,
    calculate_drekkana,
    calculate_saptamsha,
    calculate_dwadashamsha,
    calculate_shashtyamsha,
    calculate_all_vargas
)
from matchmaking import (
    get_rajju,
    check_vedha_kuta,
    check_mahendra_kuta,
    check_stree_deergha_kuta,
    calculate_full_kundli_milan
)
from timing_tools import (
    calculate_tarabala,
    calculate_chandrabala,
    get_ghataka_chakra,
    evaluate_transit_timing
)
from ephemeris import calculate_kundli
from main import app

client = TestClient(app)

# ==================== 1. ASHTAKAVARGA TESTS ====================

def test_ashtakavarga_raman_benchmark_and_invariant():
    """
    Validates BV Raman's benchmark chart:
    Date: 16 Oct 1918 14:20 Bangalore (Lat: 12.9716, Lon: 77.5946)
    Verifies that the Sarvashtakavarga sum across all 12 signs is strictly 337.
    """
    d1 = calculate_kundli("1918-10-16T14:20:00", 12.9716, 77.5946, "Asia/Kolkata")
    av = calculate_ashtakavarga(d1["planets"], d1["lagna"]["sign"])

    # 1. Total SAV bindus invariant
    assert av["total_bindus"] == 337, f"Expected 337 total bindus, got {av['total_bindus']}"

    # 2. Total bindus per planet
    for planet, expected in PLANET_EXPECTED_TOTALS.items():
        assert av["planet_totals"][planet] == expected, f"{planet} total expected {expected}, got {av['planet_totals'][planet]}"

    # 3. Sum of SAV dictionary matches
    sav_dict = av["sarvashtakavarga"]
    assert len(sav_dict) == 12
    assert sum(sav_dict.values()) == 337

    # 4. Invariant: Sun in Virgo (6th from Aries, index 5)
    sun_bav = av["bhinnashtakavarga"]["Sun"]
    assert sum(sun_bav.values()) == 48

    # 5. House mapping structure
    sav_by_house = av["sarvashtakavarga_by_house"]
    assert len(sav_by_house) == 12
    # Lagna is Capricorn -> House 1 sign must be Capricorn
    assert sav_by_house[1]["sign"] == "Capricorn"
    assert sav_by_house[1]["house"] == 1


# ==================== 2. DIVISIONAL CHARTS (VARGAS) TESTS ====================

def test_divisional_charts_calculations():
    """
    Validates mathematical precision of D2, D3, D7, D12, and D60 charts.
    """
    # Sample planets
    planets = {
        "Sun": {"sign": "Aries", "degree": 5.0, "house": 1},      # Aries 0°-15° (Odd) -> Sun (Leo)
        "Moon": {"sign": "Aries", "degree": 20.0, "house": 1},    # Aries 15°-30° (Odd) -> Moon (Cancer)
        "Mars": {"sign": "Taurus", "degree": 5.0, "house": 2},    # Taurus 0°-15° (Even) -> Moon (Cancer)
        "Jupiter": {"sign": "Gemini", "degree": 15.0, "house": 3} # Gemini 10°-20° (D3: 5th from Gemini -> Libra)
    }
    lagna_deg = 15.0  # Aries 15.0°

    # D2 Hora test
    d2 = calculate_hora(planets, lagna_deg)
    assert d2["planets"]["Sun"]["sign"] == "Leo"
    assert d2["planets"]["Moon"]["sign"] == "Cancer"
    assert d2["planets"]["Mars"]["sign"] == "Cancer"

    # D3 Drekkana test
    d3 = calculate_drekkana(planets, lagna_deg)
    # Gemini (index 2) part 1 (10-20 deg) -> (2 + 4) = 6 = Libra
    assert d3["planets"]["Jupiter"]["sign"] == "Libra"

    # D7 Saptamsha test
    d7 = calculate_saptamsha(planets, lagna_deg)
    assert len(d7["planets"]) == 4

    # D12 Dwadashamsha test
    d12 = calculate_dwadashamsha(planets, lagna_deg)
    assert len(d12["planets"]) == 4

    # D60 Shashtyamsha test
    d60 = calculate_shashtyamsha(planets, lagna_deg)
    assert len(d60["planets"]) == 4

    # All vargas combined
    all_vargas = calculate_all_vargas(planets, lagna_deg)
    for v in ["D1", "D2", "D3", "D7", "D9", "D10", "D12", "D60"]:
        assert v in all_vargas


# ==================== 3. 12-KUTA MATCHMAKING TESTS ====================

def test_extended_12_kutas():
    """
    Tests Rajju, Vedha, Mahendra, and Stree Deergha Kuta evaluations.
    """
    # 1. Rajju Kuta
    # Ashwini (0) is Pada; Dhanishta (22) is Siras -> Different cords -> No Rajju Dosha
    grp1, aff1 = get_rajju(0)
    grp2, aff2 = get_rajju(22)
    assert grp1 == "Pada (Feet)"
    assert grp2 == "Siras (Head)"
    assert grp1 != grp2

    # Same cord: Ashwini (0) and Revati (26) both belong to Pada
    grp_revati, _ = get_rajju(26)
    assert grp1 == grp_revati

    # 2. Vedha Kuta
    # Ashwini (0) and Jyeshtha (17) are a known afflicted Vedha pair
    has_vedha, _ = check_vedha_kuta(0, 17)
    assert has_vedha is True

    # Ashwini (0) and Rohini (3) are non-conflicting
    no_vedha, _ = check_vedha_kuta(0, 3)
    assert no_vedha is False

    # 3. Mahendra Kuta
    # Count from girl nak to boy nak in [4, 7, 10, 13, 16, 19, 22, 25]
    # Girl = 0 (Ashwini), Boy = 3 (Rohini) -> Count = 4 -> Auspicious
    has_mahendra, count, _ = check_mahendra_kuta(boy_nak=3, girl_nak=0)
    assert has_mahendra is True
    assert count == 4

    # 4. Stree Deergha Kuta
    # Girl = 0, Boy = 15 -> Count = 16 (>= 15) -> Highly Auspicious
    has_stree, count_stree, _ = check_stree_deergha_kuta(boy_nak=15, girl_nak=0)
    assert has_stree is True
    assert count_stree == 16


def test_full_kundli_milan_includes_12_kutas():
    """Validates that dual-profile Kundli Milan embeds the 12-Kuta diagnostic report."""
    boy_profile = {
        "name": "Arjun",
        "dob": "1995-06-15T10:30:00",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata"
    }
    girl_profile = {
        "name": "Priya",
        "dob": "1997-08-20T14:15:00",
        "lat": 19.0760,
        "lon": 72.8777,
        "timezone": "Asia/Kolkata"
    }

    result = calculate_full_kundli_milan(boy_profile, girl_profile)
    assert result["status"] == "SUCCESS"
    assert "extended_12_kutas" in result
    ext = result["extended_12_kutas"]
    assert "rajju" in ext
    assert "vedha" in ext
    assert "mahendra" in ext
    assert "stree_deergha" in ext


# ==================== 4. TIMING TOOLS TESTS ====================

def test_timing_tools():
    """
    Validates Tarabala, Chandrabala, and Ghataka Chakra timing calculations.
    """
    # 1. Tarabala
    # Ashwini (0) to Rohini (3) -> distance 4 -> Kshema (1.0)
    tara = calculate_tarabala(0, 3)
    assert tara["tarabala_name"] == "Kshema"
    assert tara["score"] == 1.0
    assert tara["is_auspicious"] is True

    # Ashwini (0) to Krittika (2) -> distance 3 -> Vipat (0.0)
    tara_vipat = calculate_tarabala(0, 2)
    assert tara_vipat["tarabala_name"] == "Vipat"
    assert tara_vipat["score"] == 0.0
    assert tara_vipat["is_auspicious"] is False

    # 2. Chandrabala
    # Janma Rasi Aries (0) to Transit Moon Gemini (2) -> House 3 -> Favorable
    chandra = calculate_chandrabala(0, 2)
    assert chandra["status"] == "Favorable"
    assert chandra["house_from_moon"] == 3
    assert chandra["is_favorable"] is True

    # Janma Rasi Aries (0) to Transit Moon Scorpio (7) -> House 8 -> Chandrashtama
    chandra_8 = calculate_chandrabala(0, 7)
    assert chandra_8["is_chandrashtama"] is True
    assert chandra_8["status"] == "Inauspicious"

    # 3. Ghataka Chakra
    ghataka_aries = get_ghataka_chakra(0)
    assert ghataka_aries["janma_rasi"] == "Aries"
    assert ghataka_aries["ghataka_moon_sign"] == "Aries"
    assert ghataka_aries["ghataka_weekday"] == "Sunday"
    assert ghataka_aries["ghataka_nakshatra"] == "Magha"


# ==================== 5. FASTAPI ROUTES INTEGRATION ====================

def test_fastapi_endpoints():
    """Validates HTTP endpoints for Ashtakavarga, Vargas, and Timing evaluation."""
    payload = {
        "dob": "1995-06-15T10:30:00",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata"
    }

    # 1. /api/kundli/ashtakavarga
    res_av = client.post("/api/kundli/ashtakavarga", json=payload)
    assert res_av.status_code == 200
    body_av = res_av.json()
    assert body_av["total_bindus"] == 337
    assert "bhinnashtakavarga" in body_av
    assert "sarvashtakavarga" in body_av

    # 2. /api/kundli/vargas
    res_vg = client.post("/api/kundli/vargas", json=payload)
    assert res_vg.status_code == 200
    body_vg = res_vg.json()
    assert "D2" in body_vg
    assert "D3" in body_vg
    assert "D7" in body_vg
    assert "D12" in body_vg
    assert "D60" in body_vg

    # 3. /api/complete-kundli returns ashtakavarga & all_vargas
    res_comp = client.post("/api/complete-kundli", json=payload)
    assert res_comp.status_code == 200
    body_comp = res_comp.json()
    assert "ashtakavarga" in body_comp
    assert body_comp["ashtakavarga"]["total_bindus"] == 337
    assert "all_vargas" in body_comp
    assert "ghataka_chakra" in body_comp

    # 4. /api/timing/evaluate
    timing_payload = {
        "birth_details": payload,
        "target_time": "2026-10-25T11:00:00",
        "target_lat": 28.6139,
        "target_lon": 77.2090,
        "target_timezone": "Asia/Kolkata"
    }
    res_tm = client.post("/api/timing/evaluate", json=timing_payload)
    assert res_tm.status_code == 200
    body_tm = res_tm.json()
    assert "tarabala" in body_tm
    assert "chandrabala" in body_tm
    assert "ghataka_chakra" in body_tm
    assert "overall_quality" in body_tm

    # 5. Error handling and fail-closed validation tests
    res_bad_time = client.post("/api/timing/evaluate", json={**timing_payload, "target_time": "invalid-time-format"})
    assert res_bad_time.status_code == 422

    res_empty_av = client.post("/api/kundli/ashtakavarga", json={})
    assert res_empty_av.status_code == 422

    res_empty_vg = client.post("/api/kundli/vargas", json={})
    assert res_empty_vg.status_code == 422
