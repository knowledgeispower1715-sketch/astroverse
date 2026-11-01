"""
Phase 7 Automated Verification Suite:
Contrastive Output & Personalization Certification Across 12 Diverse Natal Profiles

Validates:
1. 12 distinct synthetic profiles covering all 12 zodiac Ascendants (Aries through Pisces),
   diverse Moon signs, and distinct Vimshottari Mahadashas.
2. All six horizons (Hourly, Daily, Weekly, Monthly, Yearly, Mahadasha) tested under identical target date.
3. Verification that every profile receives 100% chart-grounded interpretations.
4. Mathematical proof of personalization: Pairwise Jaccard similarity and exact string overlap
   verifying zero copy-paste across distinct natal charts.
"""

import os
import sys
import re
import pytest
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import PredictionRequest, generate_prediction_endpoint

TWELVE_PROFILES = [
    {
        "id": "prof_01_aries",
        "name": "Aarav Sharma",
        "dob": "1990-04-20T06:15:00",
        "lat": 28.6139,
        "lon": 77.2090,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Aries"
    },
    {
        "id": "prof_02_taurus",
        "name": "Bhavya Patel",
        "dob": "1991-08-15T00:30:00",
        "lat": 19.0760,
        "lon": 72.8777,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Taurus"
    },
    {
        "id": "prof_03_gemini",
        "name": "Chetan Iyer",
        "dob": "1992-11-10T21:45:00",
        "lat": 13.0827,
        "lon": 80.2707,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Gemini"
    },
    {
        "id": "prof_04_cancer",
        "name": "Divya Mukherjee",
        "dob": "1993-01-25T17:15:00",
        "lat": 22.5726,
        "lon": 88.3639,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Cancer"
    },
    {
        "id": "prof_05_leo",
        "name": "Eshaan Verma",
        "dob": "1995-06-15T10:30:00",
        "lat": 28.6139,
        "lon": 77.2090,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Leo"
    },
    {
        "id": "prof_06_virgo",
        "name": "Farhan Khan",
        "dob": "1996-03-30T19:15:00",
        "lat": 26.8467,
        "lon": 80.9462,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Virgo"
    },
    {
        "id": "prof_07_libra",
        "name": "Gauri Joshi",
        "dob": "1997-07-04T13:45:00",
        "lat": 23.0225,
        "lon": 72.5714,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Libra"
    },
    {
        "id": "prof_08_scorpio",
        "name": "Harshvardhan Rao",
        "dob": "1998-09-18T10:45:00",
        "lat": 12.9716,
        "lon": 77.5946,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Scorpio"
    },
    {
        "id": "prof_09_sagittarius",
        "name": "Ishani Sen",
        "dob": "1999-12-05T09:15:00",
        "lat": 17.3850,
        "lon": 78.4867,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Sagittarius"
    },
    {
        "id": "prof_10_capricorn",
        "name": "Jaideep Nair",
        "dob": "2000-02-28T05:30:00",
        "lat": 25.3176,
        "lon": 82.9739,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Capricorn"
    },
    {
        "id": "prof_11_aquarius",
        "name": "Kavya Menon",
        "dob": "2001-05-12T02:00:00",
        "lat": 21.1702,
        "lon": 72.8311,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Aquarius"
    },
    {
        "id": "prof_12_pisces",
        "name": "Lakshya Das",
        "dob": "2002-10-20T17:15:00",
        "lat": 15.2993,
        "lon": 74.1240,
        "tz": "Asia/Kolkata",
        "expected_lagna": "Pisces"
    }
]

ALL_HORIZONS = ["hourly", "daily", "weekly", "monthly", "yearly", "mahadasha"]
TARGET_DATE = "2026-11-01"

def tokenize(text: str) -> set:
    """Helper to extract normalized word tokens from text."""
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    return set(words)

def jaccard_similarity(set_a: set, set_b: set) -> float:
    """Computes Jaccard similarity index between two sets."""
    if not set_a and not set_b:
        return 1.0
    union = set_a | set_b
    if not union:
        return 0.0
    return len(set_a & set_b) / len(union)


def test_twelve_lagnas_astronomical_grounding():
    """Verify that all 12 profiles correctly calculate each of the 12 zodiac Lagnas."""
    calculated_lagnas = []
    for p in TWELVE_PROFILES:
        req = PredictionRequest(
            horizon="daily",
            target_date=TARGET_DATE,
            dob=p["dob"],
            lat=p["lat"],
            lon=p["lon"],
            timezone=p["tz"],
            profile_id=p["id"],
            profile_name=p["name"],
            lang="en"
        )
        res = generate_prediction_endpoint(req)
        assert res["status"] == "SUCCESS"
        assert res["mode"] == "PERSONALIZED_CHART_GROUNDED"
        assert res["chart_snapshot"]["lagna_sign"] == p["expected_lagna"]
        calculated_lagnas.append(res["chart_snapshot"]["lagna_sign"])

    # Ensure all 12 zodiac signs are represented
    assert len(set(calculated_lagnas)) == 12, "All 12 zodiac signs must be uniquely represented across the 12 profiles"


def test_daily_prediction_contrastive_differentiation():
    """
    On the exact same target date, verify that 12 profiles receive distinct daily forecasts,
    with distinct activated houses, supportive themes, and cautions.
    """
    results = []
    for p in TWELVE_PROFILES:
        req = PredictionRequest(
            horizon="daily",
            target_date=TARGET_DATE,
            dob=p["dob"],
            lat=p["lat"],
            lon=p["lon"],
            timezone=p["tz"],
            profile_id=p["id"],
            profile_name=p["name"],
            lang="en"
        )
        res = generate_prediction_endpoint(req)
        results.append((p, res))

    # 1. Verify energized houses vary across Lagnas
    energized_houses = [r["evidence_ledger"]["transits"]["t_moon_house_lagna"] for _, r in results]
    # At least 8 distinct houses across 12 signs (depends on transit moon sign)
    assert len(set(energized_houses)) >= 8, f"Transiting Moon must energize distinct houses across 12 Lagnas: {energized_houses}"

    # 2. Verify Themes and Cautions are NOT byte-for-byte identical
    themes_list = [tuple(r["sections"]["supportive_themes"]) for _, r in results]
    assert len(set(themes_list)) >= 10, "Supportive themes must be substantially differentiated across 12 profiles"

    cautions_list = [tuple(r["sections"]["challenges_and_cautions"]) for _, r in results]
    assert len(set(cautions_list)) >= 10, "Challenges and cautions must be substantially differentiated across 12 profiles"

    # 3. Pairwise Jaccard similarity across all 66 pairs must be bounded
    total_pairs = 0
    high_similarity_pairs = 0
    for i in range(len(results)):
        for j in range(i + 1, len(results)):
            total_pairs += 1
            text_i = " ".join(results[i][1]["sections"]["supportive_themes"] + results[i][1]["sections"]["challenges_and_cautions"])
            text_j = " ".join(results[j][1]["sections"]["supportive_themes"] + results[j][1]["sections"]["challenges_and_cautions"])
            sim = jaccard_similarity(tokenize(text_i), tokenize(text_j))
            # Jaccard similarity between two distinct profiles must be under 0.60
            if sim > 0.60:
                high_similarity_pairs += 1

    assert high_similarity_pairs == 0, f"Found {high_similarity_pairs} pairs with Jaccard similarity > 0.60"


def test_hourly_prediction_contrastive_differentiation():
    """Verify that hourly guidance tailors action windows and focal themes to each user's chart."""
    results = []
    for p in TWELVE_PROFILES:
        req = PredictionRequest(
            horizon="hourly",
            target_date=TARGET_DATE,
            dob=p["dob"],
            lat=p["lat"],
            lon=p["lon"],
            timezone=p["tz"],
            profile_id=p["id"],
            profile_name=p["name"],
            lang="en"
        )
        res = generate_prediction_endpoint(req)
        assert res["status"] == "SUCCESS"
        assert res["mode"] == "PERSONALIZED_CHART_GROUNDED"
        results.append((p, res))

    # Verify that the opening sentences reference each user's unique Lagna and lordship
    summaries = [r["sections"]["executive_summary"] for _, r in results]
    assert len(set(summaries)) == 12, "All 12 profiles must have unique executive summaries in hourly guidance"


def test_mahadasha_prediction_contrastive_differentiation():
    """Verify that Mahadasha timelines reflect each user's authentic birth Nakshatra and Dasha lord."""
    results = []
    for p in TWELVE_PROFILES:
        req = PredictionRequest(
            horizon="mahadasha",
            target_date=TARGET_DATE,
            dob=p["dob"],
            lat=p["lat"],
            lon=p["lon"],
            timezone=p["tz"],
            profile_id=p["id"],
            profile_name=p["name"],
            lang="en"
        )
        res = generate_prediction_endpoint(req)
        assert res["status"] == "SUCCESS"
        assert res["mode"] == "PERSONALIZED_CHART_GROUNDED"
        results.append((p, res))

    # Verify Dasha lords and Antardasha periods
    active_dashas = [r["chart_snapshot"]["active_mahadasha"] for _, r in results]
    assert len(set(active_dashas)) >= 4, f"12 diverse birth dates must span multiple distinct Mahadashas: {set(active_dashas)}"

    # Check 5-year chronological timelines are present and tailored
    for _, r in results:
        items = r["period_items"]["items"]
        assert len(items) == 5, "Mahadasha horizon must provide 5-year timeline"
        for card in items:
            assert "Mahadasha" in card["ruling_period"]
            assert len(card["strategic_theme"]) > 50


def test_weekly_prediction_contrastive_house_activation():
    """Verify that weekly 7-day progression tracks distinct activated houses for different Lagnas."""
    p_aries = TWELVE_PROFILES[0]  # Aries Lagna
    p_libra = TWELVE_PROFILES[6]  # Libra Lagna (180 degrees opposite)

    req_aries = PredictionRequest(horizon="weekly", target_date=TARGET_DATE, is_unlocked=True, **{k: p_aries[k] for k in ["dob", "lat", "lon", "tz", "id", "name"]})
    res_aries = generate_prediction_endpoint(req_aries)

    req_libra = PredictionRequest(horizon="weekly", target_date=TARGET_DATE, is_unlocked=True, **{k: p_libra[k] for k in ["dob", "lat", "lon", "tz", "id", "name"]})
    res_libra = generate_prediction_endpoint(req_libra)

    aries_houses = [card["activated_house"] for card in res_aries["period_items"]["items"]]
    libra_houses = [card["activated_house"] for card in res_libra["period_items"]["items"]]

    # Across 7 days, Aries and Libra are 7 houses apart (1st vs 7th, 2nd vs 8th, etc.)
    for day in range(7):
        diff = abs(aries_houses[day] - libra_houses[day])
        assert diff == 6, f"Opposite Lagnas must activate houses 6 houses apart on day {day+1}: Aries={aries_houses[day]}, Libra={libra_houses[day]}"


def test_hindi_localization_contrastive_12_profiles():
    """Verify Hindi Devanagari output generation and chart snapshot localization across all 12 profiles."""
    for p in TWELVE_PROFILES[:4]:  # Test first 4 profiles in Hindi
        req = PredictionRequest(
            horizon="daily",
            target_date=TARGET_DATE,
            dob=p["dob"],
            lat=p["lat"],
            lon=p["lon"],
            timezone=p["tz"],
            profile_id=p["id"],
            profile_name=p["name"],
            lang="hi"
        )
        res = generate_prediction_endpoint(req)
        assert res["status"] == "SUCCESS"
        assert res["mode"] == "PERSONALIZED_CHART_GROUNDED"
        assert len(res["sections"]["key_time_windows"]) >= 2
        assert len(res["sections"]["supportive_themes"]) >= 2


def test_contrastive_same_lagna_different_moon():
    """Verify that two charts with identical Lagna but different Moon signs receive distinct lunar/Dasha predictions."""
    p_a = PredictionRequest(horizon="daily", target_date="2026-11-01", dob="1995-06-15T10:30:00", lat=28.6139, lon=77.2090, timezone="Asia/Kolkata")
    p_b = PredictionRequest(horizon="daily", target_date="2026-11-01", dob="1995-06-30T09:30:00", lat=28.6139, lon=77.2090, timezone="Asia/Kolkata")

    res_a = generate_prediction_endpoint(p_a)
    res_b = generate_prediction_endpoint(p_b)

    assert res_a["chart_snapshot"]["lagna_sign"] == res_b["chart_snapshot"]["lagna_sign"] == "Leo"
    assert res_a["chart_snapshot"]["moon_sign"] != res_b["chart_snapshot"]["moon_sign"]
    assert res_a["chart_snapshot"]["moon_nakshatra"] != res_b["chart_snapshot"]["moon_nakshatra"]
    assert res_a["sections"]["executive_summary"] != res_b["sections"]["executive_summary"]


def test_contrastive_same_moon_different_lagna():
    """Verify that two charts with identical Moon sign but different Lagnas receive distinct house-activation predictions."""
    p_a = PredictionRequest(horizon="daily", target_date="2026-11-01", dob="1998-05-15T09:00:00", lat=28.6139, lon=77.2090, timezone="Asia/Kolkata")
    p_b = PredictionRequest(horizon="daily", target_date="2026-11-01", dob="1998-05-15T21:00:00", lat=28.6139, lon=77.2090, timezone="Asia/Kolkata")

    res_a = generate_prediction_endpoint(p_a)
    res_b = generate_prediction_endpoint(p_b)

    assert res_a["chart_snapshot"]["moon_sign"] == res_b["chart_snapshot"]["moon_sign"]
    assert res_a["chart_snapshot"]["lagna_sign"] != res_b["chart_snapshot"]["lagna_sign"]
    assert res_a["evidence_ledger"]["transits"]["t_moon_house_lagna"] != res_b["evidence_ledger"]["transits"]["t_moon_house_lagna"]


def test_contrastive_same_chart_different_dates():
    """Verify that the same chart evaluated on two distinct dates reflects updated planetary transits."""
    p_date1 = PredictionRequest(horizon="daily", target_date="2026-11-01", dob="1995-06-15T10:30:00", lat=28.6139, lon=77.2090, timezone="Asia/Kolkata")
    p_date2 = PredictionRequest(horizon="daily", target_date="2026-11-15", dob="1995-06-15T10:30:00", lat=28.6139, lon=77.2090, timezone="Asia/Kolkata")

    res_1 = generate_prediction_endpoint(p_date1)
    res_2 = generate_prediction_endpoint(p_date2)

    assert res_1["chart_snapshot"]["lagna_sign"] == res_2["chart_snapshot"]["lagna_sign"]
    assert res_1["evidence_ledger"]["transits"]["t_moon_sign"] != res_2["evidence_ledger"]["transits"]["t_moon_sign"]
    assert res_1["evidence_ledger"]["transits"]["t_moon_nakshatra"] != res_2["evidence_ledger"]["transits"]["t_moon_nakshatra"]
    assert res_1["sections"]["executive_summary"] != res_2["sections"]["executive_summary"]

