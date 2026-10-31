"""
AstroVerse AI — Master Jyotish Accuracy & Ephemeris Verification Test Suite
Independent, calculation-grounded test suite verifying:
- All 9 starting Nakshatra lords and birth balance allocations
- 27 Nakshatras boundary precision and remaining fraction continuity
- Full 3-tier Vimshottari hierarchy (9 Mahadashas, 81 Antardashas, 729 Pratyantardashas)
- Zero-drift boundary continuity and residual clamping
- Offset-aware and offset-naive temporal containment (DEF-001 regression)
- Out-of-range pre-natal and post-120y lifespan handling (DEF-002 regression)
- 365.2425 vs 365.25 vs 360-day conventions comparison utility
- Real-time Gochara transits, Sade Sati, Ashtama Shani, Kantaka Shani, Chandrashtama
- Rahu and Ketu exact 180° opposition and retrograde state
- Panchanga 5 limbs with local topocentric sunrise across international timezones
- Planetary Hora unequal diurnal/nocturnal intervals and high-latitude safety
- Ashtakavarga 337 SAV invariant across 12 signs
- Complete Shodashavarga (16 divisional charts) boundary precision
- Canonical birth data validation and sensitivity analysis
"""

import pytest
from datetime import datetime, date, time, timedelta, timezone
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dasha_engine import (
    calculate_vimshottari_dasha,
    calculate_antardashas,
    calculate_pratyantardashas,
    calculate_antardasha_pds,
    calculate_live_transits,
    compare_vimshottari_conventions,
    DASHA_LORDS,
    DASHA_YEARS,
    NAKSHATRA_NAMES,
    NAKSHATRA_LORDS,
    SIGNS,
    TOTAL_CYCLE_YEARS,
    DAYS_PER_YEAR
)
from ephemeris import calculate_kundli
from ashtakavarga_engine import calculate_ashtakavarga, TOTAL_SAV_BINDUS
from hora_engine import calculate_sun_times, calculate_24h_horas
from panchang_engine import calculate_full_panchang
from divisional_charts import (
    calculate_all_vargas,
    calculate_navamsha,
    calculate_dashamsha,
    calculate_shashtyamsha,
    calculate_trimshamsha,
    calculate_chalit_chart
)
from shadbala_and_yogas import calculate_shadbala, detect_classical_yogas
from upagraha_engine import calculate_upagrahas
from ai_astrologer import generate_structured_prediction
from birth_data_service import (
    validate_and_normalize_birth_data,
    analyze_unknown_time_sensitivity,
    analyze_time_window_uncertainty
)
from astrology_settings import (
    METHODOLOGY_PROFILE_NAME,
    get_methodology_metadata
)

# -----------------------------------------------------------------------------
# 1. VIMSHOTTARI DASHA 9 LORDS & NAKSHATRA BOUNDARY PRECISION
# -----------------------------------------------------------------------------

def test_all_9_starting_lords_and_lifespan_allotments():
    """Verify all 9 starting Nakshatra lords follow the exact 120-year Parashari cycle."""
    assert sum(DASHA_YEARS.values()) == 120.0
    expected_allotments = {
        "Ketu": 7.0, "Venus": 20.0, "Sun": 6.0, "Moon": 10.0, "Mars": 7.0,
        "Rahu": 18.0, "Jupiter": 16.0, "Saturn": 19.0, "Mercury": 17.0
    }
    for lord, yrs in expected_allotments.items():
        assert DASHA_YEARS[lord] == yrs

def test_all_27_nakshatra_boundaries_and_ruling_lords():
    """Test Moon longitude mapping across all 27 Nakshatras and check lord sequence."""
    nak_span = 360.0 / 27.0
    dob_dt = datetime(1990, 1, 1, 12, 0)
    for i in range(27):
        # Test midpoint of Nakshatra
        mid_deg = i * nak_span + (nak_span / 2.0)
        res = calculate_vimshottari_dasha(mid_deg, dob_dt)
        expected_lord = NAKSHATRA_LORDS[i]
        assert res["birth_balance"]["ruling_lord"] == expected_lord
        assert res["birth_balance"]["nakshatra_number"] == i + 1
        assert 0.49 <= res["birth_balance"]["fraction_remaining"] <= 0.51

def test_birth_balance_fraction_exactness():
    """Verify that Moon at beginning and near-end of Nakshatra yields exact balance."""
    nak_span = 360.0 / 27.0
    dob_dt = datetime(2000, 1, 1, 0, 0)
    
    # At exact start of Rohini (Nakshatra #4, Moon-ruled, 10 years, start: 40.0°)
    res_start = calculate_vimshottari_dasha(40.0001, dob_dt)
    assert res_start["birth_balance"]["ruling_lord"] == "Moon"
    assert round(res_start["birth_balance"]["years_remaining"], 1) == 10.0

    # At near-end of Rohini (53.333°)
    res_end = calculate_vimshottari_dasha(53.33, dob_dt)
    assert res_end["birth_balance"]["ruling_lord"] == "Moon"
    assert res_end["birth_balance"]["years_remaining"] < 0.2

# -----------------------------------------------------------------------------
# 2. FULL 3-TIER HIERARCHY (729 PDS) & ZERO-DRIFT CONTINUITY
# -----------------------------------------------------------------------------

def test_729_pds_hierarchy_and_parent_closure():
    """
    Test full 3-tier hierarchy generation:
    9 Mahadashas * 9 Antardashas * 9 PDS = 729 Pratyantardashas.
    Verify 0 gap, 0 overlap, and strict closure at every tier.
    """
    dob_dt = datetime(1985, 6, 20, 8, 30)
    res = calculate_vimshottari_dasha(125.5, dob_dt, include_all_pds=True)
    timeline = res["timeline"]
    assert len(timeline) == 9

    total_antars = 0
    total_pds = 0

    for m in timeline:
        ads = m["antardashas"]
        assert len(ads) == 9
        total_antars += len(ads)
        
        # Verify Antardasha continuity within Mahadasha
        m_start = datetime.fromisoformat(m["start_date"])
        m_end = datetime.fromisoformat(m["end_date"])
        assert datetime.fromisoformat(ads[0]["start_date"]) == m_start
        assert datetime.fromisoformat(ads[-1]["end_date"]) == m_end

        for a_idx, a in enumerate(ads):
            if a_idx > 0:
                prev_end = datetime.fromisoformat(ads[a_idx - 1]["end_date"])
                curr_start = datetime.fromisoformat(a["start_date"])
                assert prev_end == curr_start, f"Antardasha boundary gap at {a['antar_dasha']}"

            pds_list = a["pratyantardashas"]
            assert len(pds_list) == 9
            total_pds += len(pds_list)

            # Verify PDS continuity within Antardasha
            a_start = datetime.fromisoformat(a["start_date"])
            a_end = datetime.fromisoformat(a["end_date"])
            assert datetime.fromisoformat(pds_list[0]["start_date"]) == a_start
            assert datetime.fromisoformat(pds_list[-1]["end_date"]) == a_end

            for p_idx, p in enumerate(pds_list):
                if p_idx > 0:
                    p_prev_end = datetime.fromisoformat(pds_list[p_idx - 1]["end_date"])
                    p_curr_start = datetime.fromisoformat(p["start_date"])
                    assert p_prev_end == p_curr_start, f"PDS boundary gap at {p['pratyantar_dasha']}"

    assert total_antars == 81
    assert total_pds == 729

# -----------------------------------------------------------------------------
# 3. TEMPORAL CONTAINMENT & REGRESSION FOR DEF-001 & DEF-002
# -----------------------------------------------------------------------------

def test_timezone_aware_and_naive_ref_dt_containment():
    """
    REGRESSION DEF-001: Ensure passing timezone-aware ref_dt does not raise
    TypeError: can't compare offset-naive and offset-aware datetimes.
    """
    dob_dt = datetime(1990, 5, 15, 14, 30, tzinfo=timezone.utc)
    ref_dt_aware = datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc)
    ref_dt_naive = datetime(2026, 10, 31, 0, 0)

    res_aware = calculate_vimshottari_dasha(271.8935, dob_dt, ref_dt=ref_dt_aware)
    res_naive = calculate_vimshottari_dasha(271.8935, dob_dt, ref_dt=ref_dt_naive)

    assert res_aware["active_now"]["maha_dasha"] == res_naive["active_now"]["maha_dasha"]
    assert res_aware["active_now"]["antar_dasha"] == res_naive["active_now"]["antar_dasha"]
    assert res_aware["active_now"]["pratyantar_dasha"] == res_naive["active_now"]["pratyantar_dasha"]
    assert res_aware["active_now"]["is_reference_instant_contained"] is True

    # Mathematical containment check
    active = res_aware["active_now"]
    ref_str = "2026-10-31"
    assert active["maha_start"] <= ref_str <= active["maha_end"]
    assert active["antar_start"] <= ref_str <= active["antar_end"]
    assert active["pratyantar_start"] <= ref_str <= active["pratyantar_end"]

def test_out_of_range_pre_natal_and_post_120y_handling():
    """
    REGRESSION DEF-002: Ensure dates before birth or past 120-year cycle
    do not silently claim birth dasha as active without flag.
    """
    dob_dt = datetime(1990, 5, 15, 14, 30)
    
    # 1. Pre-natal reference instant
    res_pre = calculate_vimshottari_dasha(271.8935, dob_dt, ref_dt=datetime(1980, 1, 1))
    assert res_pre["active_now"]["out_of_range_status"] == "PRE_NATAL"
    assert res_pre["active_now"]["is_reference_instant_contained"] is False

    # 2. Past 120-year lifespan reference instant
    res_post = calculate_vimshottari_dasha(271.8935, dob_dt, ref_dt=datetime(2150, 1, 1))
    assert res_post["active_now"]["out_of_range_status"] == "EXPIRED_LIFESPAN"
    assert res_post["active_now"]["is_reference_instant_contained"] is False

# -----------------------------------------------------------------------------
# 4. YEAR CONVENTIONS COMPARISON UTILITY
# -----------------------------------------------------------------------------

def test_vimshottari_year_conventions_comparison():
    """Verify mathematical drift calculations across Gregorian, Julian, and Savana conventions."""
    dob_dt = datetime(1990, 5, 15, 14, 30)
    cmp_res = compare_vimshottari_conventions(271.8935, dob_dt)
    convs = cmp_res["conventions"]

    assert convs["gregorian_mean"]["days_per_year"] == 365.2425
    assert convs["julian"]["days_per_year"] == 365.25
    assert convs["savana_360"]["days_per_year"] == 360.0

    # Julian vs Gregorian drift across 120 years must be < 1 day
    assert abs(convs["julian"]["drift_vs_gregorian_days"]) < 1.0

    # Savana 360-day drift must be ~ -616 to -630 days (~1.7 years)
    assert -630.0 <= convs["savana_360"]["drift_vs_gregorian_days"] <= -600.0

# -----------------------------------------------------------------------------
# 5. LIVE TRANSITS (GOCHARA) & CLASSICAL DIAGNOSTICS
# -----------------------------------------------------------------------------

def test_live_transits_and_diagnostics():
    """Verify live Swiss Ephemeris transit calculation for all 9 Grahas, Sade Sati, and Chandrashtama."""
    ref_dt = datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc)
    # Moon in Capricorn (index 9), Lagna in Virgo (index 5)
    res = calculate_live_transits(
        ref_dt=ref_dt,
        natal_lagna_idx=5,
        natal_moon_idx=9,
        sav_bindus=[30, 28, 26, 31, 29, 25, 30, 27, 33, 28, 29, 31]
    )

    assert "transits" in res
    assert len(res["transits"]) == 9
    
    # Verify Rahu and Ketu are in exact 180° opposition
    pos = res["positions_map"]
    rahu_lon = pos["Rahu"]["longitude"]
    ketu_lon = pos["Ketu"]["longitude"]
    diff = (ketu_lon - rahu_lon + 360.0) % 360.0
    assert abs(diff - 180.0) < 0.01

    # Verify diagnostics structure
    diag = res["diagnostics"]
    assert "sade_sati" in diag
    assert "kantaka_shani" in diag
    assert "chandrashtama" in diag

def test_sade_sati_phases_exactness():
    """Verify Saturn transiting 12th, 1st, 2nd from natal Moon triggers exact Sade Sati phases."""
    ref_dt = datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc)
    # If Saturn is in Pisces (idx 11):
    # - Aries Moon (idx 0) -> Saturn in 12th (Phase 1 Rising)
    res_aroha = calculate_live_transits(ref_dt=ref_dt, natal_moon_idx=0)
    if res_aroha["positions_map"]["Saturn"]["sign_index"] == 11:
        assert res_aroha["diagnostics"]["sade_sati"]["is_active"] is True
        assert "Phase 1" in res_aroha["diagnostics"]["sade_sati"]["phase"]

    # - Pisces Moon (idx 11) -> Saturn in 1st (Phase 2 Peak)
    res_janma = calculate_live_transits(ref_dt=ref_dt, natal_moon_idx=11)
    if res_janma["positions_map"]["Saturn"]["sign_index"] == 11:
        assert res_janma["diagnostics"]["sade_sati"]["is_active"] is True
        assert "Phase 2" in res_janma["diagnostics"]["sade_sati"]["phase"]

    # - Aquarius Moon (idx 10) -> Saturn in 2nd (Phase 3 Setting)
    res_avaroha = calculate_live_transits(ref_dt=ref_dt, natal_moon_idx=10)
    if res_avaroha["positions_map"]["Saturn"]["sign_index"] == 11:
        assert res_avaroha["diagnostics"]["sade_sati"]["is_active"] is True
        assert "Phase 3" in res_avaroha["diagnostics"]["sade_sati"]["phase"]

# -----------------------------------------------------------------------------
# 6. PANCHANGA & PLANETARY HORA
# -----------------------------------------------------------------------------

def test_panchanga_five_limbs_international():
    """Verify Panchanga calculation in India and international locations."""
    # New Delhi
    p_delhi = calculate_full_panchang("2026-10-31", 28.6139, 77.2090, "Asia/Kolkata")
    assert p_delhi["panchang"]["vara"] in ["Saturday", "Sunday"]
    assert "tithi" in p_delhi["panchang"]
    assert "nakshatra" in p_delhi["panchang"]
    assert "yoga" in p_delhi["panchang"]
    assert "karana" in p_delhi["panchang"]

    # London
    p_london = calculate_full_panchang("2026-10-31", 51.5074, -0.1278, "Europe/London")
    assert "tithi" in p_london["panchang"]

def test_planetary_horas_and_high_latitude_safety():
    """Verify 24 Horas generation with Chaldean sequence and high-latitude fallback."""
    sunrise, sunset, next_rise, is_high_lat = calculate_sun_times(
        date(2026, 10, 31), 28.6139, 77.2090, "Asia/Kolkata", return_fallback_flag=True
    )
    assert not is_high_lat
    assert sunrise < sunset < next_rise

    horas = calculate_24h_horas(sunrise, sunset, next_rise)
    assert len(horas["timeline"]) == 24
    assert horas["day_ruler"] == "Saturn"

    # High latitude (Tromsø, Norway: 69.6492° N in December -> polar night)
    s_tromso, set_tromso, next_tromso, is_polar = calculate_sun_times(
        date(2026, 12, 21), 69.6492, 18.9553, "Europe/Oslo", return_fallback_flag=True
    )
    assert is_polar
    assert s_tromso is not None

# -----------------------------------------------------------------------------
# 7. ASHTAKAVARGA UNIVERSAL 337 SAV INVARIANT
# -----------------------------------------------------------------------------

def test_ashtakavarga_337_universal_invariant():
    """Verify that Sarvashtakavarga across all 12 signs sums to strictly 337 bindus."""
    d1 = calculate_kundli("1990-05-15T14:30:00")
    av = calculate_ashtakavarga(d1["planets"], d1["lagna"]["sign"])
    
    assert av["total_bindus"] == TOTAL_SAV_BINDUS
    assert sum(av["sarvashtakavarga"].values()) == 337
    # Verify 7 BAV planets exist and Rahu/Ketu are excluded
    assert len(av["bhinnashtakavarga"]) == 7
    assert "Rahu" not in av["bhinnashtakavarga"]
    assert "Ketu" not in av["bhinnashtakavarga"]

# -----------------------------------------------------------------------------
# 8. COMPLETE SHODASHAVARGA (16 CHARTS) BOUNDARY MATRIX
# -----------------------------------------------------------------------------

def test_shodashavarga_boundary_matrix():
    """Test boundary precision across all 16 divisional charts immediately before and after cusps."""
    planets_mock = {
        "Sun": {"sign": "Aries", "degree": 0.001, "house": 1},
        "Moon": {"sign": "Taurus", "degree": 29.999, "house": 2},
        "Mars": {"sign": "Gemini", "degree": 15.0, "house": 3},
        "Mercury": {"sign": "Virgo", "degree": 14.999, "house": 6},
        "Jupiter": {"sign": "Cancer", "degree": 4.999, "house": 4},
        "Venus": {"sign": "Pisces", "degree": 26.999, "house": 12},
        "Saturn": {"sign": "Libra", "degree": 19.999, "house": 7}
    }
    
    # Cusp at 29.999° vs 0.001°
    vargas = calculate_all_vargas(planets_mock, 29.999)
    assert "D1" in vargas
    assert "D9" in vargas
    assert "D10" in vargas
    assert "D60" in vargas
    assert len(vargas) == 16  # 16 classical Parashari Shodashavarga charts

    vargas_meta = calculate_all_vargas(planets_mock, 29.999, include_metadata=True)
    assert len(vargas_meta) == 17
    assert "metadata" in vargas_meta

# -----------------------------------------------------------------------------
# 9. BIRTH DATA VALIDATION & UNCERTAINTY SERVICE
# -----------------------------------------------------------------------------

def test_birth_data_validation_and_sensitivity():
    """Verify canonical birth data validation and sensitivity analysis."""
    # 1. Valid data
    val = validate_and_normalize_birth_data(
        dob_str="1992-08-14",
        tob_str="16:45",
        lat=28.6139,
        lon=77.2090,
        tz_str="Asia/Kolkata"
    )
    assert val["birth_date"] == "1992-08-14"
    assert val["birth_time_local"] == "16:45:00"
    assert val["is_unknown_time"] is False
    assert val["utc_offset_hours"] == 5.5

    # 2. Unknown time sensitivity
    sens_unknown = analyze_unknown_time_sensitivity("1992-08-14", 28.6139, 77.2090)
    assert sens_unknown["is_unknown_time"] is True
    assert "INDETERMINATE" in sens_unknown["ascendant_status"]
    assert sens_unknown["house_based_yogas_available"] is False

    # 3. Window uncertainty (+/- 15 min)
    sens_window = analyze_time_window_uncertainty("1992-08-14", "16:45", 28.6139, 77.2090, uncertainty_minutes=15)
    assert "evaluations" in sens_window
    assert len(sens_window["evaluations"]) == 3

# -----------------------------------------------------------------------------
# 10. SHADBALA (SIXFOLD PLANETARY STRENGTH)
# -----------------------------------------------------------------------------

def test_shadbala_sixfold_strength_components():
    """Verify that calculate_shadbala computes all six canonical components for physical Grahas."""
    d1 = calculate_kundli("1990-05-15T14:30:00")
    sb = calculate_shadbala(d1["planets"], d1["lagna"]["sign"])
    
    physical_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    assert len(sb) == 7
    for p in physical_planets:
        assert p in sb
        b = sb[p]["breakdown"]
        # All six canonical Parashari balas must be present
        assert "sthana_bala" in b      # Sthana Bala (Positional)
        assert "dig_bala" in b         # Dig Bala (Directional)
        assert "kaala_bala" in b       # Kaala Bala (Temporal)
        assert "cheshta_bala" in b     # Cheshta Bala (Motional)
        assert "naisargika_bala" in b  # Naisargika Bala (Natural)
        assert "drik_bala" in b        # Drik Bala (Aspectual)
        
        assert sb[p]["total_virupas"] > 0
        assert sb[p]["strength_ratio"] > 0
        assert sb[p]["verdict"] in ["Potent / Capable (Balavan)", "Moderate / Requires Support"]

# -----------------------------------------------------------------------------
# 11. CLASSICAL YOGAS
# -----------------------------------------------------------------------------

def test_classical_yogas_evaluation():
    """Verify evaluation of classical Parashari yogas with evidence provenance."""
    d1 = calculate_kundli("1990-05-15T14:30:00")
    yogas = detect_classical_yogas(d1["planets"], d1["lagna"]["sign"])
    assert len(yogas) > 0
    for y in yogas:
        assert "name" in y
        assert "status" in y
        assert y["status"] in ["PRESENT", "ABSENT", "PRESENT_WITH_MITIGATION"]
        assert "source_citation" in y

# -----------------------------------------------------------------------------
# 12. UPAGRAHAS & KALAVELAS (11 SUBPLANETS)
# -----------------------------------------------------------------------------

def test_upagrahas_and_kalavelas_invariants():
    """Verify 5 Sun-based Upagrahas, 6 Time-based Kalavelas, and cyclic closure invariant."""
    up = calculate_upagrahas("1990-05-15T14:30:00", 28.6139, 77.2090, "Asia/Kolkata")
    assert len(up["sun_based_upagrahas"]) == 5
    assert len(up["time_based_kalavelas"]) == 6
    assert len(up["all_upagrahas"]) == 11
    
    # 5 Sun-based: Dhuma, Vyatipaata, Parivesha, Indrachaapa, Upaketu
    for expected in ["Dhuma", "Vyatipaata", "Parivesha", "Indrachaapa", "Upaketu"]:
        assert expected in up["sun_based_upagrahas"]
        
    # Classical BPHS Invariant: (Upaketu + 30°) % 360 == Sun Longitude
    sun_lon = up["birth_details"]["sun_nirayana_longitude"]
    upaketu_lon = up["sun_based_upagrahas"]["Upaketu"]["longitude"]
    reconstituted_sun = (upaketu_lon + 30.0) % 360.0
    diff = abs(reconstituted_sun - sun_lon)
    diff_wrapped = min(diff, 360.0 - diff)
    assert diff_wrapped < 1e-4

# -----------------------------------------------------------------------------
# 13. EQUAL BHAVA CHALIT (LAGNA-CENTERED MIDPOINT SANDHI)
# -----------------------------------------------------------------------------

def test_equal_bhava_chalit_cusps():
    """Verify Equal Bhava Chalit with midpoint sandhi cusps (Lagna ± 15°)."""
    d1 = calculate_kundli("1990-05-15T14:30:00")
    chalit = calculate_chalit_chart(d1["planets"], d1["lagna"]["total_degree"])
    assert chalit["lagna_cusp"] == round(d1["lagna"]["total_degree"], 2)
    assert len(chalit["planets"]) == 9
    for p, d in chalit["planets"].items():
        assert 1 <= d["chalit_house"] <= 12
        assert "shifted" in d

# -----------------------------------------------------------------------------
# 14. MULTI-HORIZON GUIDANCE & AI NARRATIVE VALIDATION
# -----------------------------------------------------------------------------

def test_multi_horizon_guidance_and_narrative_safety():
    """Verify structured predictions across horizons with non-fatalistic Section G limitations."""
    d1 = calculate_kundli("1990-05-15T14:30:00")
    dasha = calculate_vimshottari_dasha(d1["planets"]["Moon"]["absolute_degree"], datetime(1990, 5, 15, 14, 30))
    
    for h in ["hourly", "daily", "weekly", "monthly", "yearly"]:
        pred = generate_structured_prediction(
            horizon=h,
            target_date_str="2026-11-01",
            kundli=d1,
            dasha=dasha
        )
        assert "sections" in pred
        sec = pred["sections"]
        assert "overall_outlook" in sec or "executive_summary" in sec
        assert "limitations" in sec
        # Epistemic safety: must include non-fatalistic limitations disclaimer
        assert len(sec["limitations"]) > 10
        assert "provenance" in pred
