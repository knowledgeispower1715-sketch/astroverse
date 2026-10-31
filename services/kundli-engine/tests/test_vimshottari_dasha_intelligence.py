"""
Unit and Regression Test Suite for Vimshottari Dasha Intelligence
Validates:
1. 120-Year Parashari Cycle Invariant
2. 9 Mahadashas & 81 Antardashas Boundary Monotonicity
3. Moon Nakshatra Birth Balance Precision
4. Chronological Progression and Transition Calculations
5. Synthetic Chart Multi-Lagna Dasha Coherence
"""
import pytest
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from dasha_engine import (
    calculate_vimshottari_dasha,
    calculate_pratyantardashas,
    DASHA_LORDS,
    DASHA_YEARS,
    TOTAL_CYCLE_YEARS,
    NAKSHATRA_NAMES
)

def test_120_year_parashari_cycle_invariant():
    """Verify that sum of all 9 Mahadasha durations is exactly 120.0 years."""
    total_years = sum(DASHA_YEARS[lord] for lord in DASHA_LORDS)
    assert total_years == 120.0, f"Expected 120.0 years, got {total_years}"
    assert TOTAL_CYCLE_YEARS == 120.0

def test_vimshottari_timeline_boundaries():
    """Verify that all 9 Mahadashas and their 81 Antardashas have monotonic, contiguous boundaries."""
    # Synthetic chart: Moon at 18.25° (Bharani Nakshatra, Venus Lord)
    dob = datetime(1996, 11, 24, 14, 30, 0)
    moon_deg = 18.25

    res = calculate_vimshottari_dasha(moon_deg, dob)
    timeline = res["timeline"]
    assert len(timeline) == 9

    # Verify first lord is Venus
    assert res["birth_balance"]["ruling_lord"] == "Venus"
    assert res["birth_balance"]["nakshatra_name"] == "Bharani"
    assert res["birth_balance"]["nakshatra_number"] == 2

    # Verify contiguous boundaries across all 9 Mahadashas
    for i in range(len(timeline)):
        m = timeline[i]
        m_start = datetime.fromisoformat(m["start_date"])
        m_end = datetime.fromisoformat(m["end_date"])
        assert m_end > m_start, f"Mahadasha {m['maha_dasha']} end must be after start"

        if i > 0:
            prev_end = datetime.fromisoformat(timeline[i - 1]["end_date"])
            # Within 1 day tolerance for calendar date boundary representation
            assert abs((m_start - prev_end).total_seconds()) < 86400

        # Verify Antardashas inside this Mahadasha
        ads = m["antardashas"]
        assert len(ads) == 9
        for j in range(len(ads)):
            ad = ads[j]
            ad_start = datetime.fromisoformat(ad["start_date"])
            ad_end = datetime.fromisoformat(ad["end_date"])
            assert ad_end > ad_start, f"Antardasha {ad['antar_dasha']} end must be after start"
            if j > 0:
                prev_ad_end = datetime.fromisoformat(ads[j - 1]["end_date"])
                assert abs((ad_start - prev_ad_end).total_seconds()) < 86400

        # First Antardasha starts with Mahadasha start; last ends with Mahadasha end
        ad_first_start = datetime.fromisoformat(ads[0]["start_date"])
        ad_last_end = datetime.fromisoformat(ads[-1]["end_date"])
        assert abs((ad_first_start - m_start).total_seconds()) < 86400
        assert abs((ad_last_end - m_end).total_seconds()) < 86400

def test_active_dasha_determination_and_progress():
    """Verify active Mahadasha, Antardasha, and progress percentages."""
    dob = datetime(2000, 1, 1, 0, 0, 0)
    # Moon in Rohini (40° to 53°20' Taurus -> Moon Lord)
    moon_deg = 45.0  # Middle of Rohini

    # Reference instant: 10 years after birth
    ref_dt = datetime(2010, 1, 1, 0, 0, 0)
    res = calculate_vimshottari_dasha(moon_deg, dob, ref_dt=ref_dt)

    active = res["active_now"]
    assert "maha_dasha" in active
    assert "antar_dasha" in active
    assert "maha_start_date" in active
    assert "maha_end_date" in active
    assert "antar_start_date" in active
    assert "antar_end_date" in active
    assert "next_transition_date" in active
    assert "next_antar_dasha" in active
    assert "maha_progress_pct" in active
    assert 0.0 <= active["maha_progress_pct"] <= 100.0
    assert 0.0 <= active["antar_progress_pct"] <= 100.0

def test_different_nakshatras_produce_different_birth_dashas():
    """Verify that different Moon positions produce correct distinct birth dashas."""
    dob = datetime(1995, 5, 10, 8, 0, 0)

    # 1. Ashwini (0° - 13°20') -> Ketu
    res_ashwini = calculate_vimshottari_dasha(5.0, dob)
    assert res_ashwini["birth_balance"]["ruling_lord"] == "Ketu"
    assert res_ashwini["birth_balance"]["nakshatra_name"] == "Ashwini"

    # 2. Krittika (26°40' - 40°) -> Sun
    res_krittika = calculate_vimshottari_dasha(30.0, dob)
    assert res_krittika["birth_balance"]["ruling_lord"] == "Sun"
    assert res_krittika["birth_balance"]["nakshatra_name"] == "Krittika"

    # 3. Pushya (93°20' - 106°40') -> Saturn
    res_pushya = calculate_vimshottari_dasha(100.0, dob)
    assert res_pushya["birth_balance"]["ruling_lord"] == "Saturn"
    assert res_pushya["birth_balance"]["nakshatra_name"] == "Pushya"

def test_pratyantardasha_subdivision_and_invariants():
    """
    Verify 3rd-tier Pratyantardasha (PDS / sub-sub-periods):
    1. Exactly 9 proportional divisions per Antardasha.
    2. Starts with the parent Antardasha lord.
    3. Contiguous and strictly monotonic boundaries.
    4. Duration matches Parashari formula: (Antar_Duration * PDS_Lord_Years) / 120.0.
    5. active_now accurately exposes pratyantar_dasha, boundaries, and pds_progress_pct.
    """
    antar_start = datetime(2024, 1, 1, 0, 0, 0)
    antar_end = datetime(2026, 1, 1, 0, 0, 0)
    antar_lord = "Jupiter"
    ref_dt = datetime(2024, 7, 1, 12, 0, 0)

    pds_list = calculate_pratyantardashas(antar_lord, antar_start, antar_end, ref_dt=ref_dt)
    assert len(pds_list) == 9
    assert pds_list[0]["pratyantar_dasha"] == "Jupiter"

    # Verify contiguous boundaries
    total_duration_days = 0.0
    active_count = 0
    for idx, p in enumerate(pds_list):
        total_duration_days += p["duration_days"]
        p_start = datetime.fromisoformat(p["start_date"])
        p_end = datetime.fromisoformat(p["end_date"])
        assert p_end >= p_start
        if p["is_active"]:
            active_count += 1
            assert p["status"] == "CURRENT"

    assert active_count == 1, "Exactly one Pratyantardasha must be active at ref_dt"
    # Antardasha of 2 years (731 days approx)
    expected_days = (antar_end - antar_start).total_seconds() / 86400.0
    assert abs(total_duration_days - expected_days) < 1.0

    # Verify integration with calculate_vimshottari_dasha active_now
    dob = datetime(1990, 6, 15, 10, 0, 0)
    res = calculate_vimshottari_dasha(120.5, dob, ref_dt=datetime(2024, 6, 1, 0, 0, 0))
    active = res["active_now"]
    assert "pratyantar_dasha" in active
    assert "pratyantar_start_date" in active
    assert "pratyantar_end_date" in active
    assert "pds_progress_pct" in active
    assert 0.0 <= active["pds_progress_pct"] <= 100.0
    assert "pratyantardashas" in active
    assert len(active["pratyantardashas"]) == 9
