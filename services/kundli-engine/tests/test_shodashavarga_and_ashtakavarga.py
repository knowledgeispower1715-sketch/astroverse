"""
AstroVerse Shodashavarga & Ashtakavarga Engine Test Suite
=========================================================
Tests:
1. Parashari Ashtakavarga 337 total bindus invariant and 7 planetary BAV sums.
2. Complete Shodashavarga suite (all 16 divisional charts: D1 through D60).
3. Upagrahas engine (11 classical sub-planets).
4. Shadbala and planetary Avasthas.
5. /api/complete-kundli endpoint completeness.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import datetime
from ashtakavarga_engine import calculate_ashtakavarga, TOTAL_SAV_BINDUS, PLANET_EXPECTED_TOTALS, SIGNS
from divisional_charts import (
    calculate_all_vargas,
    calculate_hora,
    calculate_drekkana,
    calculate_chaturthamsha,
    calculate_saptamsha,
    calculate_navamsha,
    calculate_dashamsha,
    calculate_dwadashamsha,
    calculate_shodashamsha,
    calculate_vimshamsha,
    calculate_chaturvimshamsha,
    calculate_saptavimshamsha,
    calculate_trimshamsha,
    calculate_khavedamsha,
    calculate_akshavedamsha,
    calculate_shashtyamsha
)
from ephemeris import calculate_kundli
from upagraha_engine import calculate_upagrahas

SAMPLE_DOB = "2005-08-20T14:05:00"
LAT = 23.1815
LON = 79.9864
TZ = "Asia/Kolkata"

@pytest.fixture
def sample_d1():
    return calculate_kundli(SAMPLE_DOB, LAT, LON, TZ)

def test_ashtakavarga_total_337_invariant(sample_d1):
    """Verifies that Sarvashtakavarga sum across all 12 signs is exactly 337."""
    res = calculate_ashtakavarga(sample_d1["planets"], sample_d1["lagna"]["sign"])
    assert res["total_bindus"] == TOTAL_SAV_BINDUS == 337
    
    # Check sum of individual signs
    sav = res["sarvashtakavarga"]
    assert len(sav) == 12
    assert sum(sav.values()) == 337

def test_bhinnashtakavarga_planetary_totals(sample_d1):
    """Verifies that all 7 physical planets have exact classical Parashari total bindus."""
    res = calculate_ashtakavarga(sample_d1["planets"], sample_d1["lagna"]["sign"])
    planet_totals = res["planet_totals"]
    bav = res["bhinnashtakavarga"]

    for planet, expected in PLANET_EXPECTED_TOTALS.items():
        assert planet in bav, f"Missing BAV for {planet}"
        planet_sum = sum(bav[planet].values())
        assert planet_sum == expected, f"{planet} BAV total mismatch: expected {expected}, got {planet_sum}"
        assert planet_totals[planet] == expected

def test_ashtakavarga_rejects_static_uniform_distribution(sample_d1):
    """Verifies that SAV scores vary by sign according to authentic chart longitudes (not 12 uniform 28s)."""
    res = calculate_ashtakavarga(sample_d1["planets"], sample_d1["lagna"]["sign"])
    sav = res["sarvashtakavarga"]
    unique_scores = set(sav.values())
    assert len(unique_scores) > 1, "SAV scores must not be uniform identical numbers across 12 signs"
    assert sum(sav.values()) == 337

def test_complete_shodashavarga_suite_16_charts(sample_d1):
    """Verifies that calculate_all_vargas returns all 16 classical Parashari divisional charts."""
    lagna_deg = sample_d1["lagna"]["total_degree"]
    vargas = calculate_all_vargas(sample_d1["planets"], lagna_deg)
    
    expected_vargas = [
        "D1", "D2", "D3", "D4", "D7", "D9", "D10", "D12",
        "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60"
    ]
    for v in expected_vargas:
        assert v in vargas, f"Missing divisional chart: {v}"
        v_chart = vargas[v]
        assert "planets" in v_chart or (v == "D1" and "planets" in v_chart), f"Missing planets in {v}"
        
        # Check all 9 classical planets present in each varga
        for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]:
            assert p in v_chart["planets"], f"Planet {p} missing from {v}"
            p_data = v_chart["planets"][p]
            assert "sign" in p_data, f"Sign missing for {p} in {v}"
            assert p_data["sign"] in SIGNS, f"Invalid sign for {p} in {v}: {p_data['sign']}"

def test_upagrahas_11_subplanets():
    """Verifies that calculate_upagrahas computes all 11 classical non-luminous Upagrahas."""
    up = calculate_upagrahas(SAMPLE_DOB, LAT, LON, TZ)
    assert "all_upagrahas" in up
    all_ups = up["all_upagrahas"]
    assert len(all_ups) == 11
    
    up_names = list(all_ups.keys())
    for expected in ["Dhuma", "Vyatipaata", "Parivesha", "Indrachaapa", "Upaketu", "Gulika", "Maandi"]:
        assert any(expected in name for name in up_names), f"Missing Upagraha: {expected}"

def test_complete_kundli_api_payload():
    """Verifies that /api/complete-kundli returns ashtakavarga, all_vargas, upagrahas, avasthas."""
    from fastapi.testclient import TestClient
    from main import app
    
    client = TestClient(app)
    response = client.post("/api/complete-kundli", json={
        "dob": SAMPLE_DOB,
        "lat": LAT,
        "lon": LON,
        "timezone": TZ
    })
    assert response.status_code == 200
    data = response.json()
    
    assert "ashtakavarga" in data
    assert data["ashtakavarga"]["total_bindus"] == 337
    assert "all_vargas" in data
    assert len(data["all_vargas"]) == 16
    assert "upagrahas" in data
    assert "avasthas" in data
    assert "shadbala" in data
