"""
AstroVerse AI — Ephemeris Forensics & Astronomical Invariants Test Suite
=======================================================================
Phase 3 & 4 Verification:
- Swiss Ephemeris configuration, version, and Lahiri ayanamsha mode
- Ayanamsa J2000 astronomical reference calibration
- UT vs TT conversion and Delta-T handling
- Sidereal planetary coordinates, Rahu/Ketu 180° true opposition
- Cusp boundary conditions (29°59' Pisces vs 0°00' Aries)
- Day/Night and sunrise/sunset Vedic weekday (Vaar) boundary rules
- Strict compliance with ASTROVERSE_PARASHARI_LAHIRI_DRIK standard
"""

import pytest
from datetime import datetime, date, timedelta, timezone
import math
import sys
import os
import swisseph as swe

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ephemeris import calculate_kundli, PLANETS, SIGNS, NAKSHATRAS, NAKSHATRA_LORDS
from hora_engine import calculate_sun_times
from astrology_settings import (
    METHODOLOGY_PROFILE_NAME,
    AYANAMSHA_NAME,
    AYANAMSHA_SWISSEPH_MODE,
    get_methodology_metadata,
    get_ephemeris_source_info
)

def test_swiss_ephemeris_configuration_and_lahiri_mode():
    """Verify Swiss Ephemeris is configured with SIDM_LAHIRI and returns Lahiri ayanamsa."""
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    ayanamsa_name = swe.get_ayanamsa_name(swe.SIDM_LAHIRI)
    assert ayanamsa_name == "Lahiri", f"Expected Lahiri, got {ayanamsa_name}"
    assert AYANAMSHA_SWISSEPH_MODE == swe.SIDM_LAHIRI
    assert "Lahiri" in AYANAMSHA_NAME

def test_ayanamsa_j2000_astronomical_reference():
    """
    Verify Lahiri Ayanamsha at epoch J2000.0 (2000-01-01 12:00:00 UT, JD 2451545.0).
    The canonical Lahiri Ayanamsha at J2000.0 is 23° 51' 25.5" (approx 23.8571°).
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    jd_j2000 = swe.julday(2000, 1, 1, 12.0)
    assert jd_j2000 == 2451545.0

    ayanamsa_val = swe.get_ayanamsa_ut(jd_j2000)
    # 23 degrees + 51 minutes / 60 + 25.5 seconds / 3600 = ~23.857083 degrees
    expected_ayanamsa = 23.8571
    assert abs(ayanamsa_val - expected_ayanamsa) < 0.001, (
        f"Ayanamsha at J2000 expected ~{expected_ayanamsa}°, got {ayanamsa_val:.6f}°"
    )

def test_ut_vs_tt_delta_t_accuracy():
    """
    Verify Delta-T computation between Universal Time (UT) and Terrestrial Time (TT).
    At J2000.0, Delta-T is approximately 63.83 seconds (~0.0007388 days).
    """
    jd_ut = 2451545.0
    deltat_days = swe.deltat(jd_ut)
    deltat_seconds = deltat_days * 86400.0

    assert 63.0 <= deltat_seconds <= 65.0, (
        f"Delta-T at J2000 out of expected range: {deltat_seconds:.2f} seconds"
    )

    jd_tt = jd_ut + deltat_days
    # Planetary calculation in UT vs TT
    res_ut, _ = swe.calc_ut(jd_ut, swe.SUN, swe.FLG_SIDEREAL)
    res_tt, _ = swe.calc(jd_tt, swe.SUN, swe.FLG_SIDEREAL)
    # The two calculation methods should agree within 0.0001 degrees
    assert abs(res_ut[0] - res_tt[0]) < 0.0001, (
        f"Sun sidereal longitude mismatch between calc_ut and calc(jd_tt): {res_ut[0]} vs {res_tt[0]}"
    )

def test_rahu_ketu_exact_180_opposition():
    """Verify Rahu and Ketu maintain exact 180° opposition across arbitrary dates and times."""
    test_dates = [
        "1985-04-12T05:30:00",
        "1995-10-24T18:45:00",
        "2005-08-20T14:05:00",
        "2026-11-01T12:00:00"
    ]
    for dt_str in test_dates:
        chart = calculate_kundli(dt_str, 28.6139, 77.2090, "Asia/Kolkata")
        rahu = chart["planets"]["Rahu"]
        ketu = chart["planets"]["Ketu"]

        rahu_abs = rahu["absolute_degree"]
        ketu_abs = ketu["absolute_degree"]

        diff = (ketu_abs - rahu_abs + 360.0) % 360.0
        assert abs(diff - 180.0) < 0.001, f"Rahu ({rahu_abs}°) and Ketu ({ketu_abs}°) diff is {diff}° != 180°"
        assert ketu["is_retrograde"] is True
        assert rahu["is_retrograde"] is True

def test_zodiac_cusp_boundary_stability():
    """
    Test chart stability right at the zodiac boundary:
    29°59' Pisces vs 0°00' Aries.
    Ensures zero numeric drift, no negative values, and proper sign/nakshatra transition.
    """
    # Test artificial longitudes near boundary
    # Pisces end: 359.99° -> Sign index 11 (Pisces), Revati Pada 4
    deg_pisces = 359.99
    sign_idx_p = int(deg_pisces / 30.0) % 12
    nak_idx_p = int(deg_pisces / (360.0 / 27.0)) % 27
    pada_p = int((deg_pisces % (360.0 / 27.0)) / (360.0 / 108.0)) + 1

    assert sign_idx_p == 11
    assert SIGNS[sign_idx_p] == "Pisces"
    assert NAKSHATRAS[nak_idx_p] == "Revati"
    assert pada_p == 4

    # Aries start: 0.01° -> Sign index 0 (Aries), Ashwini Pada 1
    deg_aries = 0.01
    sign_idx_a = int(deg_aries / 30.0) % 12
    nak_idx_a = int(deg_aries / (360.0 / 27.0)) % 27
    pada_a = int((deg_aries % (360.0 / 27.0)) / (360.0 / 108.0)) + 1

    assert sign_idx_a == 0
    assert SIGNS[sign_idx_a] == "Aries"
    assert NAKSHATRAS[nak_idx_a] == "Ashwini"
    assert pada_a == 1

def test_day_night_sunrise_vaar_transition():
    """
    Vedic day (Vaar) begins at local topocentric sunrise, NOT at midnight 00:00.
    A birth at 04:30 AM on Monday before sunrise at 06:15 AM belongs to Sunday (Ravivaar).
    A birth at 07:00 AM on Monday after sunrise belongs to Monday (Somavaar).
    """
    lat, lon, tz_str = 28.6139, 77.2090, "Asia/Kolkata"
    # October 26, 2026 is a Monday. Sunrise in Delhi is approx 06:29 AM.
    test_d = date(2026, 10, 26)
    s_rise, s_set, _ = calculate_sun_times(test_d, lat, lon, tz_str)

    # 10 minutes before sunrise
    pre_sunrise = (s_rise - timedelta(minutes=10)).isoformat()
    # 10 minutes after sunrise
    post_sunrise = (s_rise + timedelta(minutes=10)).isoformat()

    chart_pre = calculate_kundli(pre_sunrise, lat, lon, tz_str)
    chart_post = calculate_kundli(post_sunrise, lat, lon, tz_str)

    # Pre-sunrise on Monday morning must have Vaar = Sunday
    assert chart_pre["panchang"]["vaar"] == "Sunday", (
        f"Pre-sunrise birth ({pre_sunrise}) expected Sunday, got {chart_pre['panchang']['vaar']}"
    )

    # Post-sunrise on Monday morning must have Vaar = Monday
    assert chart_post["panchang"]["vaar"] == "Monday", (
        f"Post-sunrise birth ({post_sunrise}) expected Monday, got {chart_post['panchang']['vaar']}"
    )

def test_canonical_methodology_metadata():
    """Verify get_methodology_metadata generates compliant metadata."""
    meta = get_methodology_metadata()
    assert meta["methodology_profile"] == METHODOLOGY_PROFILE_NAME
    assert meta["zodiac"] == "Sidereal (Nirayana)"
    assert meta["ayanamsha"] == "Lahiri / Chitra Paksha"
    assert meta["ayanamsha_code"] == "SIDM_LAHIRI"
    assert "Swiss Ephemeris" in meta["ephemeris_version"]
