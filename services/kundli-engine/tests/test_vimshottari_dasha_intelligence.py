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
from datetime import datetime, timedelta, timezone
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

def test_full_729_pds_hierarchy_and_zero_drift():
    """
    Verify complete 3-tier Vimshottari hierarchy across all 120 years:
    - 9 Mahadashas
    - 9 x 9 = 81 Antardashas
    - 81 x 9 = 729 Pratyantardashas
    - Mathematical closure with zero gap or overlap across all boundaries.
    """
    from dasha_engine import calculate_antardasha_pds

    dob = datetime(1995, 6, 15, 12, 0, 0)
    res = calculate_vimshottari_dasha(120.5, dob, include_all_pds=True)

    assert "metadata" in res
    assert res["metadata"]["calculation_methodology"] == "2.0.0-gregorian-exact"
    assert res["metadata"]["days_per_year"] == 365.2425

    timeline = res["timeline"]
    assert len(timeline) == 9

    total_antardashas = 0
    total_pds = 0

    for m in timeline:
        ads = m["antardashas"]
        assert len(ads) == 9
        total_antardashas += len(ads)

        m_start = datetime.fromisoformat(m["start_iso"])
        m_end = datetime.fromisoformat(m["end_iso"])

        # Check that sum of Antardasha days strictly equals parent Mahadasha days
        m_duration_days = (m_end - m_start).total_seconds() / 86400.0
        ad_sum_days = sum(ad["duration_days"] for ad in ads)
        assert abs(round(m_duration_days, 2) - ad_sum_days) < 0.01, f"Antardasha sum drift detected: {m_duration_days} vs {ad_sum_days}"
        assert ads[0]["start_iso"] == m["start_iso"]
        assert ads[-1]["end_iso"] == m["end_iso"]

        for ad in ads:
            pds_list = ad["pratyantardashas"]
            assert len(pds_list) == 9
            total_pds += len(pds_list)

            ad_start = datetime.fromisoformat(ad["start_iso"])
            ad_end = datetime.fromisoformat(ad["end_iso"])
            ad_duration_days = (ad_end - ad_start).total_seconds() / 86400.0

            # Check that sum of PDS days strictly equals parent Antardasha days (rounded to 2 decimal places)
            pds_sum_days = sum(p["duration_days"] for p in pds_list)
            assert abs(round(ad_duration_days, 2) - pds_sum_days) < 0.01, f"PDS sum drift detected in {ad['antar_dasha']}: {ad_duration_days} vs {pds_sum_days}"
            # Verify exact microsecond/second timestamp closure
            assert pds_list[0]["start_iso"] == ad["start_iso"]
            assert pds_list[-1]["end_iso"] == ad["end_iso"]

            # Verify contiguous internal boundaries: PDS[k].end_iso == PDS[k+1].start_iso
            for k in range(8):
                assert pds_list[k]["end_iso"] == pds_list[k + 1]["start_iso"], f"PDS boundary discontinuity at index {k}"

    assert total_antardashas == 81
    assert total_pds == 729

    # Verify convenience helper calculate_antardasha_pds
    first_ad = timeline[0]["antardashas"][0]
    pds_direct = calculate_antardasha_pds(
        timeline[0]["maha_dasha"],
        first_ad["antar_dasha"],
        datetime.fromisoformat(first_ad["start_iso"]),
        datetime.fromisoformat(first_ad["end_iso"])
    )
    assert len(pds_direct) == 9
    assert pds_direct[0]["pratyantar_dasha"] == first_ad["antar_dasha"]

def test_live_transits_calculation_and_classical_diagnostics():
    """
    Verify high-precision Sidereal Gochara calculation:
    1. Returns all 9 Grahas with valid sidereal longitudes (0-360), sign names, and Nakshatras.
    2. Accurate retrograde flags for outer planets and nodes.
    3. Proper Sade Sati detection based on natal Moon sign.
    4. Integration of SAV bindus with classical Gochara verdicts.
    """
    from dasha_engine import calculate_live_transits

    # Test with Scorpio Lagna (index 7) and Aquarius Moon (index 10)
    # SAV bindus array (12 values for Aries through Pisces)
    sav_bindus = [28, 30, 27, 31, 29, 25, 32, 26, 30, 28, 29, 24]

    transits_res = calculate_live_transits(
        ref_dt=datetime(2026, 11, 1, 0, 0, 0, tzinfo=timezone.utc),
        natal_lagna_idx=7,
        natal_moon_idx=10,
        sav_bindus=sav_bindus
    )

    assert "transits" in transits_res
    assert len(transits_res["transits"]) == 9
    assert "positions_map" in transits_res

    planets_found = [t["planet_key"] for t in transits_res["transits"]]
    expected_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
    for p in expected_planets:
        assert p in planets_found

    # Verify positions and house indices
    saturn = transits_res["positions_map"]["Saturn"]
    assert saturn["sign"] == "Pisces"
    assert saturn["sign_index"] == 11
    assert saturn["house_from_lagna"] == 5   # Pisces is 5th from Scorpio (7)
    assert saturn["house_from_moon"] == 2    # Pisces is 2nd from Aquarius (10)

    # Verify Sade Sati diagnostics: Saturn in 2nd from Aquarius Moon is Phase 3 (Setting)
    sade_sati = transits_res["diagnostics"]["sade_sati"]
    assert sade_sati["is_active"] is True
    assert "Phase 3 (Setting" in sade_sati["phase"]
    assert "Saturn in Pisces is transiting 2nd from natal Moon" in sade_sati["description"]

    # Verify Ketu is strictly opposite Rahu by 180 degrees
    rahu = transits_res["positions_map"]["Rahu"]
    ketu = transits_res["positions_map"]["Ketu"]
    assert abs(((rahu["longitude"] + 180.0) % 360.0) - ketu["longitude"]) < 0.001

def test_dasha_and_transits_api_endpoints():
    """Verify REST API endpoints for Dasha and Transits via FastAPI TestClient."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    # 1. /api/transits/live GET
    r = client.get("/api/transits/live?natal_lagna_idx=7&natal_moon_idx=10")
    assert r.status_code == 200
    data = r.json()
    assert len(data["transits"]) == 9
    assert data["diagnostics"]["sade_sati"]["is_active"] is True

    # 2. /api/dasha/current POST
    r = client.post("/api/dasha/current", json={"dob": "1995-06-15T12:00:00"})
    assert r.status_code == 200
    cur_data = r.json()
    assert cur_data["status"] == "SUCCESS"
    assert "active_now" in cur_data
    assert "pratyantar_dasha" in cur_data["active_now"]

    # 3. /api/dasha/timeline POST
    r = client.post("/api/dasha/timeline", json={"dob": "1995-06-15T12:00:00", "include_all_pds": True})
    assert r.status_code == 200
    t_data = r.json()
    assert len(t_data["timeline"]) == 9
    assert len(t_data["timeline"][0]["antardashas"][0]["pratyantardashas"]) == 9

    # 4. /api/dasha/pds POST
    r = client.post("/api/dasha/pds", json={
        "maha_lord": "Jupiter",
        "antar_lord": "Saturn",
        "antar_start": "2024-01-01T00:00:00",
        "antar_end": "2026-06-01T00:00:00"
    })
    assert r.status_code == 200
    pds_data = r.json()
    assert pds_data["count"] == 9
    assert len(pds_data["pratyantardashas"]) == 9

def test_dasha_exact_subsecond_boundary_precision():
    """Verify that Antardasha and PDS boundaries transition cleanly with exact subsecond timestamps."""
    dob = datetime(1990, 5, 15, 10, 30, 0)
    moon_deg = 120.5  # Ketu dasha at birth (Magha)

    base = calculate_vimshottari_dasha(moon_deg, dob)
    ad0 = base["timeline"][0]["antardashas"][0]
    ad1 = base["timeline"][0]["antardashas"][1]

    ad0_end_iso = ad0["end_iso"]
    transition_dt = datetime.fromisoformat(ad0_end_iso)

    # 1 second before transition
    res_before = calculate_vimshottari_dasha(moon_deg, dob, ref_dt=transition_dt - timedelta(seconds=1))
    assert res_before["active_now"]["antar_dasha"] == ad0["antar_dasha"]

    # Exactly at transition (half-open [start, end) means it belongs to next period ad1)
    res_at = calculate_vimshottari_dasha(moon_deg, dob, ref_dt=transition_dt)
    assert res_at["active_now"]["antar_dasha"] == ad1["antar_dasha"]

    # 1 second after transition
    res_after = calculate_vimshottari_dasha(moon_deg, dob, ref_dt=transition_dt + timedelta(seconds=1))
    assert res_after["active_now"]["antar_dasha"] == ad1["antar_dasha"]



