"""
AstroVerse Vedic Astrology Parity & Advanced Suite Tests
=========================================================
Tests for all native VedAstro parity modules:
1. Numerology Engine (Mulank, Bhagyank, Namank, Chaldean, Pythagorean)
2. Pancha Pakshi Engine (5 Birds, 5 Yamas, 5 Activities, Biorhythm)
3. Horary / Prashna Engine (Prashna Tantra, Ithasala, Ishrafa, Nakta, Tajika aspects)
4. Upagrahas Engine (5 Sun-based, 6 Time-based Kalavelas, Gulika, Maandi)
5. Birth Time Rectification (D1/D9/D60 Lagna shifts, Life event dasha alignment)
6. Classical Knowledge Layer (BPHS, Phaladeepika, Saravali sloka citations)
7. Planetary Avasthas (Baladi, Jagradadi, Lajjitadi) & Ishta/Kashta Phala
8. Versioned FastAPI endpoints under /api/v1/astrology/*
"""

import pytest
import math
from datetime import datetime
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from numerology_engine import (
    calculate_mulank,
    calculate_bhagyank,
    calculate_name_numbers,
    evaluate_number_compatibility,
    calculate_full_numerology
)
from pancha_pakshi_engine import (
    determine_birth_bird_from_nakshatra,
    determine_birth_bird_from_name,
    get_day_night_yamas,
    get_activity_for_yama,
    calculate_pancha_pakshi
)
from prashna_engine import (
    evaluate_prashna,
    _angular_distance,
    _sign_distance,
    _get_tajika_aspect_type
)
from upagraha_engine import calculate_upagrahas
from btr_engine import evaluate_btr_candidates
from classical_knowledge import search_classical_knowledge, get_sloka_by_id
from shadbala_and_yogas import calculate_planetary_avasthas, calculate_ishta_kashta_phala

client = TestClient(app)

# ==============================================================================
# 1. NUMEROLOGY ENGINE TESTS
# ==============================================================================

def test_mulank_calculation():
    # Day 1 -> 1
    assert calculate_mulank(1) == 1
    # Day 10 -> 1+0 = 1
    assert calculate_mulank(10) == 1
    # Day 28 -> 2+8 = 10 -> 1+0 = 1
    assert calculate_mulank(28) == 1
    # Day 29 -> 2+9 = 11 -> 1+1 = 2
    assert calculate_mulank(29) == 2
    # Day 9 -> 9
    assert calculate_mulank(9) == 9
    # Invalid day raises ValueError
    with pytest.raises(ValueError):
        calculate_mulank(32)

def test_bhagyank_calculation():
    # DOB: 1995-06-15 -> 1+9+9+5+0+6+1+5 = 36 -> 3+6 = 9
    res = calculate_bhagyank("1995-06-15")
    assert res["destiny_number"] == 9
    assert res["total_sum"] == 36

def test_name_numbers_chaldean_and_pythagorean():
    # Name: "RAMA"
    # Chaldean: R(2) + A(1) + M(4) + A(1) = 8
    # Pythagorean: R(9) + A(1) + M(4) + A(1) = 15 -> 1+5 = 6
    res = calculate_name_numbers("RAMA")
    assert res["chaldean_name_number"] == 8
    assert res["pythagorean_name_number"] == 6

def test_full_numerology_suite():
    res = calculate_full_numerology("Arjuna", "1990-05-14")
    assert res["birth_number"]["value"] == 5 # 1+4 = 5
    assert res["birth_number"]["governing_planet"] == "Mercury (Budha)"
    assert res["destiny_number"]["value"] == 2 # 1+9+9+0+0+5+1+4 = 29 -> 11 -> 2
    assert res["destiny_number"]["master_number"] == 11
    assert res["name_numbers"]["chaldean"]["number"] > 0
    assert "lucky_colors" in res["favorable_elements"]

# ==============================================================================
# 2. PANCHA PAKSHI ENGINE TESTS
# ==============================================================================

def test_birth_bird_determination():
    # Shukla Paksha
    # Nakshatra 1 (Ashwini) -> Vulture
    assert determine_birth_bird_from_nakshatra(1, is_waxing=True) == "Vulture"
    # Nakshatra 8 (Pushya) -> Owl
    assert determine_birth_bird_from_nakshatra(8, is_waxing=True) == "Owl"
    # Nakshatra 14 (Chitra) -> Crow
    assert determine_birth_bird_from_nakshatra(14, is_waxing=True) == "Crow"
    # Nakshatra 20 (Purva Ashadha) -> Cock
    assert determine_birth_bird_from_nakshatra(20, is_waxing=True) == "Cock"
    # Nakshatra 27 (Revati) -> Peacock
    assert determine_birth_bird_from_nakshatra(27, is_waxing=True) == "Peacock"

def test_birth_bird_name_fallback():
    assert determine_birth_bird_from_name("Anand") == "Vulture" # First vowel 'A'
    assert determine_birth_bird_from_name("Indira") == "Owl"    # First vowel 'I'
    assert determine_birth_bird_from_name("Umesh") == "Crow"    # First vowel 'U'
    assert determine_birth_bird_from_name("Omkar") == "Cock"    # First vowel 'O'

def test_pancha_pakshi_full_schedule():
    res = calculate_pancha_pakshi(
        birth_nakshatra_num=1,
        is_waxing=True,
        check_time_iso="2026-10-22T10:30:00+05:30",
        timezone_str="Asia/Kolkata"
    )
    assert res["birth_bird"] == "Vulture"
    assert res["current_evaluation"]["active_yama"] in (1, 2, 3, 4, 5)
    assert res["current_evaluation"]["current_activity"] in ["Ruling", "Eating", "Walking", "Sleeping", "Dying"]
    assert len(res["daily_biorhythm_schedule"]) == 10 # 5 Day + 5 Night yamas

# ==============================================================================
# 3. HORARY / PRASHNA ENGINE TESTS
# ==============================================================================

def test_prashna_angular_and_aspect_utilities():
    assert _angular_distance(10.0, 20.0) == 10.0
    assert _angular_distance(350.0, 10.0) == 20.0
    assert _sign_distance(0, 3) == 4 # Aries to Cancer = 4th
    assert "Pratyaksha" in _get_tajika_aspect_type(4)
    assert "Mitra" in _get_tajika_aspect_type(5)
    assert "Shatru" in _get_tajika_aspect_type(6)

def test_prashna_evaluation():
    res = evaluate_prashna(
        query_text="Will I receive the overseas job offer this month?",
        category="career",
        query_datetime_iso="2026-10-22T14:30:00+05:30",
        lat=28.6139,
        lon=77.2090,
        timezone_str="Asia/Kolkata"
    )
    assert res["query"]["category"] == "career"
    assert res["horary_chart_details"]["target_house"] == 10
    assert res["horary_chart_details"]["querent_lord_lagnesha"] != ""
    assert res["horary_chart_details"]["significator_karyesha"] != ""
    assert res["verdict"]["status"] in ["FAVORABLE", "CHALLENGING", "MODERATE", "UNFAVORABLE"]
    assert 0 <= res["verdict"]["confidence_score"] <= 100

# ==============================================================================
# 4. UPAGRAHAS ENGINE TESTS
# ==============================================================================

def test_upagrahas_sun_based_and_kalavelas():
    res = calculate_upagrahas(
        dob_iso="1995-06-15T10:30:00+05:30",
        lat=28.6139,
        lon=77.2090,
        timezone_str="Asia/Kolkata"
    )
    sun_based = res["sun_based_upagrahas"]
    time_based = res["time_based_kalavelas"]
    
    # 5 Sun-based
    assert "Dhuma" in sun_based
    assert "Vyatipaata" in sun_based
    assert "Parivesha" in sun_based
    assert "Indrachaapa" in sun_based
    assert "Upaketu" in sun_based
    
    # Mathematical invariant from BPHS: (Upaketu + 30 deg) % 360 == Sun Longitude
    sun_lon = res["birth_details"]["sun_nirayana_longitude"]
    upaketu_lon = sun_based["Upaketu"]["longitude"]
    cycle_sun = (upaketu_lon + 30.0) % 360.0
    assert math.isclose(cycle_sun, sun_lon, abs_tol=0.01)
    
    # 6 Time-based
    assert "Kaala" in time_based
    assert "Mrityu" in time_based
    assert "Arthaprahaara" in time_based
    assert "Yamaghantaka" in time_based
    assert "Gulika" in time_based
    assert "Maandi" in time_based
    assert len(res["all_upagrahas"]) == 11

# ==============================================================================
# 5. BIRTH TIME RECTIFICATION (BTR) TESTS
# ==============================================================================

def test_btr_candidate_finder():
    events = [
        {"type": "marriage", "date": "2020-11-25"},
        {"type": "career", "date": "2018-07-01"}
    ]
    res = evaluate_btr_candidates(
        nominal_dob_iso="1995-06-15T10:30:00+05:30",
        lat=28.6139,
        lon=77.2090,
        window_minutes=15,
        step_minutes=5,
        life_events=events,
        timezone_str="Asia/Kolkata"
    )
    assert res["search_window_minutes"] == 15
    assert len(res["candidate_ranking"]) > 0
    best = res["best_fit_candidate"]
    assert "d1_lagna_sign" in best
    assert "d9_navamsa_lagna" in best
    assert "d60_shashtyamsha_lagna" in best
    assert 0 <= best["confidence_score"] <= 100

# ==============================================================================
# 6. CLASSICAL KNOWLEDGE LAYER TESTS
# ==============================================================================

def test_classical_knowledge_search():
    # Search Gajakesari
    res = search_classical_knowledge(topic="gajakesari")
    assert len(res) >= 1
    assert "Gajakesari" in res[0]["translation"]
    
    # Search 10th house
    res_10 = search_classical_knowledge(house=10)
    assert len(res_10) >= 1
    
    # Retrieve by ID
    sloka = get_sloka_by_id("BPHS_YOGA_GAJAKESARI")
    assert sloka is not None
    assert sloka["source"] == "Brihat Parashara Hora Shastra"

# ==============================================================================
# 7. PLANETARY AVASTHAS & ISHTA/KASHTA TESTS
# ==============================================================================

def test_planetary_avasthas_and_ishta_kashta():
    dummy_planets = {
        "Sun": {"degree": 14.5, "sign": "Aries", "house": 1},      # Odd sign, 12-18 deg = Yuva
        "Moon": {"degree": 3.0, "sign": "Taurus", "house": 2},     # Even sign, 0-6 deg = Mrita
        "Jupiter": {"degree": 5.0, "sign": "Cancer", "house": 4}   # Exalted in Cancer
    }
    avasthas = calculate_planetary_avasthas(dummy_planets)
    assert avasthas["Sun"]["baladi_avastha"].startswith("Yuva")
    assert avasthas["Sun"]["baladi_potency_factor"] == 1.0
    assert avasthas["Moon"]["baladi_avastha"].startswith("Mrita")
    assert avasthas["Jupiter"]["jagradadi_avastha"].startswith("Jagrat")
    
    dummy_shadbala = {
        "Sun": {"breakdown": {"sthana_bala": 120.0, "cheshta_bala": 45.0}},
        "Moon": {"breakdown": {"sthana_bala": 100.0, "cheshta_bala": 30.0}}
    }
    ik = calculate_ishta_kashta_phala(dummy_shadbala)
    assert "Sun" in ik
    assert ik["Sun"]["ishta_phala"] >= 0.0
    assert ik["Sun"]["kashta_phala"] >= 0.0

# ==============================================================================
# 8. FASTAPI ENDPOINT INTEGRATION TESTS
# ==============================================================================

def test_api_numerology_endpoint():
    res = client.post("/api/v1/astrology/numerology", json={
        "name": "Mahatma Gandhi",
        "dob": "1869-10-02"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["birth_number"]["value"] == 2
    assert "destiny_number" in data
    assert "name_numbers" in data

def test_api_pancha_pakshi_endpoint():
    res = client.post("/api/v1/astrology/pancha-pakshi", json={
        "nakshatra_number": 4,
        "is_waxing": True
    })
    assert res.status_code == 200
    data = res.json()
    assert data["birth_bird"] == "Vulture"
    assert "current_evaluation" in data

def test_api_prashna_endpoint():
    res = client.post("/api/v1/astrology/prashna", json={
        "question": "Will our partnership venture succeed?",
        "category": "business",
        "query_time": "2026-10-22T15:00:00+05:30",
        "lat": 19.0760,
        "lon": 72.8777,
        "timezone": "Asia/Kolkata"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["query"]["category"] == "business"
    assert "verdict" in data

def test_api_upagrahas_endpoint():
    res = client.post("/api/v1/astrology/upagrahas", json={
        "dob": "1995-06-15T10:30:00+05:30",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata"
    })
    assert res.status_code == 200
    data = res.json()
    assert "all_upagrahas" in data
    assert len(data["all_upagrahas"]) == 11

def test_api_btr_endpoint():
    res = client.post("/api/v1/astrology/btr", json={
        "nominal_dob": "1995-06-15T10:30:00+05:30",
        "lat": 28.6139,
        "lon": 77.2090,
        "window_minutes": 10,
        "step_minutes": 5,
        "life_events": [{"type": "career", "date": "2021-05-10"}]
    })
    assert res.status_code == 200
    data = res.json()
    assert "best_fit_candidate" in data

def test_api_knowledge_endpoint():
    res = client.get("/api/v1/astrology/knowledge?topic=yoga")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1

def test_api_avasthas_endpoint():
    res = client.post("/api/v1/astrology/avasthas", json={
        "dob": "1995-06-15T10:30:00+05:30",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata"
    })
    assert res.status_code == 200
    data = res.json()
    assert "planetary_avasthas" in data
    assert "ishta_kashta_phala" in data
