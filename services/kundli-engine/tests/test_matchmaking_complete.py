"""
AstroVerse Automated Test Suite: Dual-Profile Kundli Milan & Module Smoke Tests
Verifies:
1. Clean import of all kundli-engine modules without ImportError
2. fetch_external_navamsa backward-compatible adapter
3. calculate_full_kundli_milan dual profile calculation via Swiss Ephemeris
4. Ashtakoota 8-fold score bounds (0.0 to 36.0)
5. Nadi & Bhakoot classical cancellation logic
6. Supplementary compatibility report (7th house, D9, Manglik, Dasha, Darakaraka)
7. Coordinate and date boundary validation
"""

import pytest
import sys
import os

# Ensure services/kundli-engine is on sys.path
engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if engine_dir not in sys.path:
    sys.path.insert(0, engine_dir)

from external_api import (
    fetch_external_navamsa,
    fetch_external_planets,
    fetch_external_chart_url,
    get_api_key
)
from matchmaking import (
    calculate_full_kundli_milan,
    match_kundli_36_gunas,
    calculate_nadi_with_exceptions,
    calculate_bhakoot_detailed
)
from main import app

def test_module_imports_and_navamsa():
    """Verify clean import of external_api and fetch_external_navamsa."""
    assert callable(fetch_external_navamsa), "fetch_external_navamsa must be an exposed callable"
    assert callable(fetch_external_planets), "fetch_external_planets must be an exposed callable"
    assert callable(fetch_external_chart_url), "fetch_external_chart_url must be an exposed callable"
    
    # Test adapter call with standard coordinates
    res = fetch_external_navamsa(1995, 6, 15, 10, 30, 0, 28.6139, 77.2090, 5.5)
    assert isinstance(res, dict)
    assert "statusCode" in res or "error" in res

def test_dual_profile_kundli_milan_success():
    """Verify complete Kundli Milan with dual full birth profiles."""
    boy_profile = {
        "name": "Aarav Sharma",
        "dob": "1994-04-12T06:30:00",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata"
    }
    girl_profile = {
        "name": "Priya Patel",
        "dob": "1996-09-24T14:45:00",
        "lat": 19.0760,
        "lon": 72.8777,
        "timezone": "Asia/Kolkata"
    }

    result = calculate_full_kundli_milan(boy_profile, girl_profile)
    assert result["status"] == "SUCCESS"
    assert result["method"] == "DUAL_PROFILE_EPHEMERIS_ASHTAKOOTA"
    assert 0.0 <= result["total_score"] <= 36.0
    assert result["max_score"] == 36.0
    assert result["verdict"]

    # Verify all 8 Kootas exist and sum up to total_score
    breakdown = result["ashtakoota_breakdown"]
    expected_kootas = ["varna", "vashya", "tara", "yoni", "graha_maitri", "gana", "bhakoot", "nadi"]
    sum_gunas = 0.0
    for k in expected_kootas:
        assert k in breakdown
        k_data = breakdown[k]
        assert "obtained" in k_data
        assert "max" in k_data
        assert k_data["obtained"] <= k_data["max"]
        sum_gunas += k_data["obtained"]
    assert round(sum_gunas, 1) == result["total_score"]

    # Verify supplementary report sections
    supp = result["supplementary_compatibility_report"]
    assert "seventh_house_analysis" in supp
    assert "navamsha_d9_analysis" in supp
    assert "manglik_dosha_analysis" in supp
    assert "vimshottari_dasha_analysis" in supp
    assert "jaimini_darakaraka_analysis" in supp
    assert "synthesis_and_limitations" in supp

def test_bhakoot_and_nadi_cancellations():
    """Verify classical cancellation logic for Bhakoot and Nadi."""
    # Same sign lord 6/8 cancellation: Aries (Mars) and Scorpio (Mars)
    # Aries = 0, Scorpio = 7 -> diff = 8 (6/8 pair)
    pts, has_dosha, cancelled, reason = calculate_bhakoot_detailed(0, 7)
    assert pts == 7.0, "Aries-Scorpio 6/8 must be cancelled due to shared Mars rulership"
    assert cancelled is True
    assert has_dosha is False

    # Nadi cancellation: Same Rashi, Different Nakshatras
    # e.g., Sign 0 (Aries), Nak 0 (Ashwini) vs Nak 1 (Bharani)
    # Ashwini is Adi Nadi (0), Bharani is Madhya Nadi (1) -> different nadi
    # But if same Nadi in same sign with different nakshatras:
    # Krittika (Antya) and Rohini (Antya)
    # Krittika is in Taurus (sign 1), Rohini is in Taurus (sign 1)
    # Krittika nak_idx = 2, Rohini nak_idx = 3 (both Antya Nadi, same Taurus Rashi)
    nadi_pts, nadi_dosha, nadi_canc, nadi_reason = calculate_nadi_with_exceptions(
        boy_nak=2, girl_nak=3, boy_sign=1, girl_sign=1, boy_pada=2, girl_pada=1
    )
    assert nadi_pts == 8.0, "Same Rashi different Nakshatra must cancel Nadi Dosha"
    assert nadi_canc is True
    assert nadi_dosha is False

def test_profile_validation_rejects_malformed_inputs():
    """Verify input validation rejects invalid coordinates or datetime."""
    valid_boy = {
        "dob": "1994-04-12T06:30:00",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata"
    }

    # Invalid latitude > 90
    invalid_girl_lat = {
        "dob": "1996-09-24T14:45:00",
        "lat": 95.0,
        "lon": 72.8777,
        "timezone": "Asia/Kolkata"
    }
    with pytest.raises(ValueError, match="latitude"):
        calculate_full_kundli_milan(valid_boy, invalid_girl_lat)

    # Invalid longitude < -180
    invalid_girl_lon = {
        "dob": "1996-09-24T14:45:00",
        "lat": 19.0760,
        "lon": -195.0,
        "timezone": "Asia/Kolkata"
    }
    with pytest.raises(ValueError, match="longitude"):
        calculate_full_kundli_milan(valid_boy, invalid_girl_lon)

    # Malformed datetime string
    invalid_boy_dob = {
        "dob": "not-a-datetime",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata"
    }
    with pytest.raises(ValueError, match="datetime"):
        calculate_full_kundli_milan(invalid_boy_dob, valid_boy)
