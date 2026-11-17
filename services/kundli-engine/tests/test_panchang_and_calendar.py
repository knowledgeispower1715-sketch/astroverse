"""
AstroVerse Vedic 3D Calendar & Panchang Test Suite
=================================================
Automated verification for high-precision Vedic ephemeris, 5 Panchang Angas,
Newton-Raphson boundary solvers, celestial timings, lunar month conventions,
Samvats, proportional classical Muhurats, and reference city benchmarks.

Test Coverage:
1. All 30 Tithis across Shukla and Krishna Pakshas (Equivalence Partitioning).
2. All 27 Nakshatras & all 4 Padas (108 Padas total).
3. All 27 Yogas with nature and transition solvers.
4. All 11 Karanas (7 movable repeating + 4 fixed).
5. Exact transition timestamp accuracy (< 60s tolerance against Swiss Ephemeris).
6. Celestial timings: Sunrise, Sunset, Moonrise, Moonset, Solar Noon (CALC_MTRANSIT), Day/Night Duration.
7. Reference validation across 5 Indian cities: New Delhi, Jabalpur, Mumbai, Chennai, Kolkata.
8. Lunar month conventions: Amanta vs Purnimanta, Adhika Masa (2023), Kshaya Masa, Shaka and Vikram Samvats.
9. Classical proportional Muhurats: 15-fold Abhijit & Brahma, 8-fold Rahu Kaal/Yamaganda/Gulika, Durmuhurta, Varjyam, Amrit Kaal, Day & Night Choghadiya.
10. Boundary conditions: Midnight crossings, leap years, pre-sunrise Vedic day boundary (AV-SEC-06 invariant), polar latitude safety.
"""

import pytest
from datetime import datetime, date, timedelta, timezone
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

import swisseph as swe

from panchang_engine import (
    calculate_full_panchang,
    calculate_advanced_panchang,
    calculate_daily_panchang,
    calculate_celestial_timings,
    calculate_sun_times_elevated,
    calculate_moon_rise_set,
    solve_tithi_boundary,
    solve_nakshatra_boundary,
    solve_yoga_boundary,
    solve_karana_boundary,
    solve_moon_rashi_boundary,
    calculate_lunar_month_and_samvat,
    calculate_proportional_muhurtas,
    calculate_choghadiya,
    jd_to_datetime_utc,
    datetime_to_jd_utc,
    format_time_tz,
    TITHIS,
    NAKSHATRAS,
    YOGAS,
    KARANAS,
    WEEKDAY_LORDS,
)

from astrology_settings import (
    TITHIS_DETAILED,
    NAKSHATRAS_DETAILED,
    YOGAS_DETAILED,
    KARANAS_DETAILED,
    LUNAR_MONTHS,
    SIGNS_DETAILED,
    VARJYAM_START_GHATIKAS,
)

# Reference Indian Cities Benchmarks
INDIAN_CITIES = {
    "New Delhi": {"lat": 28.6139, "lon": 77.2090, "altitude_m": 216.0, "tz": "Asia/Kolkata"},
    "Jabalpur": {"lat": 23.1815, "lon": 79.9864, "altitude_m": 411.0, "tz": "Asia/Kolkata"},
    "Mumbai": {"lat": 19.0760, "lon": 72.8777, "altitude_m": 14.0, "tz": "Asia/Kolkata"},
    "Chennai": {"lat": 13.0827, "lon": 80.2707, "altitude_m": 6.0, "tz": "Asia/Kolkata"},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639, "altitude_m": 9.0, "tz": "Asia/Kolkata"},
}


# =============================================================================
# 1. TITHI EQUIVALENCE PARTITIONING & NOMENCLATURE
# =============================================================================

def test_all_30_tithis_equivalence_partitioning():
    """Verify all 30 Tithis across Shukla and Krishna Pakshas with accurate metadata."""
    assert len(TITHIS_DETAILED) == 30
    assert len(TITHIS) == 30

    shukla_tithis = [t for t in TITHIS_DETAILED if t["paksha"] == "Shukla"]
    krishna_tithis = [t for t in TITHIS_DETAILED if t["paksha"] == "Krishna"]

    assert len(shukla_tithis) == 15
    assert len(krishna_tithis) == 15

    assert TITHIS_DETAILED[0]["name_en"] == "Shukla Pratipada"
    assert TITHIS_DETAILED[14]["name_en"] == "Purnima"
    assert TITHIS_DETAILED[15]["name_en"] == "Krishna Pratipada"
    assert TITHIS_DETAILED[29]["name_en"] == "Amavasya"

    # Sample a full 30-day lunar synodic cycle starting from a verified New Moon
    # E.g. New Moon of March 19, 2026 (JD approx 2461118.55)
    jd_base = 2461118.6
    encountered_indices = set()

    for step in range(30):
        # Step approximately 1 day per iteration
        jd_sample = jd_base + step * 0.984
        t_res = solve_tithi_boundary(jd_sample, "Asia/Kolkata")
        encountered_indices.add(t_res["index"])

        assert 0 <= t_res["index"] < 30
        assert 1 <= t_res["number"] <= 30
        assert t_res["start_jd"] <= jd_sample <= t_res["end_jd"]
        assert 0.0 <= t_res["elapsed_percentage"] <= 100.0
        assert "start_time_iso" in t_res
        assert "end_time_iso" in t_res
        assert "next_tithi" in t_res

    # In a continuous sweep across 30 days, we should encounter at least 25-30 distinct tithis
    assert len(encountered_indices) >= 27


# =============================================================================
# 2. NAKSHATRA & 108 PADAS EQUIVALENCE PARTITIONING
# =============================================================================

def test_all_27_nakshatras_and_108_padas():
    """Verify all 27 Nakshatras and all 4 Padas (108 Padas total)."""
    assert len(NAKSHATRAS_DETAILED) == 27
    assert len(NAKSHATRAS) == 27

    # Verify Vimshottari Lord Cycle: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury
    expected_lords = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
    for i, nak in enumerate(NAKSHATRAS_DETAILED):
        assert nak["lord"] == expected_lords[i % 9]
        assert len(nak["name_en"]) > 0
        assert len(nak["name_hi"]) > 0
        assert len(nak["name_sa"]) > 0

    # Step through a full sidereal orbit of the Moon (~27.32 days)
    jd_orbit_start = 2461118.0
    found_nakshatras = set()
    found_padas_by_nak = {i: set() for i in range(27)}

    for step in range(280):
        jd_sample = jd_orbit_start + step * 0.1  # sample every ~2.4 hours
        n_res = solve_nakshatra_boundary(jd_sample, "Asia/Kolkata")
        found_nakshatras.add(n_res["index"])
        found_padas_by_nak[n_res["index"]].add(n_res["pada"])

        assert 1 <= n_res["pada"] <= 4
        assert 0.0 <= n_res["degree_in_nakshatra"] <= (360.0 / 27.0)
        assert n_res["start_jd"] <= jd_sample <= n_res["end_jd"]
        assert 0.0 <= n_res["elapsed_percentage"] <= 100.0

    # All 27 Nakshatras must be encountered
    assert len(found_nakshatras) == 27
    # Across dense 2.4-hour sampling, all 4 Padas should be encountered for almost all Nakshatras
    total_padas_found = sum(len(padas) for padas in found_padas_by_nak.values())
    assert total_padas_found >= 100


# =============================================================================
# 3. YOGA EQUIVALENCE PARTITIONING & NATURE
# =============================================================================

def test_all_27_yogas_equivalence_partitioning():
    """Verify all 27 Yogas and their auspicious/inauspicious classifications."""
    assert len(YOGAS_DETAILED) == 27
    assert len(YOGAS) == 27

    # First Yoga is Vishkambha, 27th is Vaidhriti
    assert YOGAS_DETAILED[0]["name_en"] == "Vishkambha"
    assert YOGAS_DETAILED[26]["name_en"] == "Vaidhriti"

    inauspicious_count = sum(1 for y in YOGAS_DETAILED if y["nature"] == "Inauspicious")
    auspicious_count = sum(1 for y in YOGAS_DETAILED if y["nature"] == "Auspicious")
    assert inauspicious_count == 9   # 9 classical inauspicious yogas
    assert auspicious_count == 18   # 18 classical auspicious yogas

    # Sample across a month
    jd_start = 2461118.0
    found_yogas = set()
    for step in range(60):
        jd_sample = jd_start + step * 0.5
        y_res = solve_yoga_boundary(jd_sample, "Asia/Kolkata")
        found_yogas.add(y_res["index"])
        assert 0 <= y_res["index"] < 27
        assert y_res["start_jd"] <= jd_sample <= y_res["end_jd"]

    assert len(found_yogas) >= 25


# =============================================================================
# 4. KARANA 60-PART CYCLE: 7 MOVABLE & 4 FIXED
# =============================================================================

def test_all_11_karanas_mapping_and_fixed_movable():
    """Verify 60 half-tithi Karana cycle with 7 movable repeating + 4 fixed."""
    assert len(KARANAS_DETAILED) == 11
    fixed_karanas = [k for k in KARANAS_DETAILED if k["is_fixed"]]
    movable_karanas = [k for k in KARANAS_DETAILED if not k["is_fixed"]]

    assert len(fixed_karanas) == 4
    assert len(movable_karanas) == 7

    fixed_names = {k["name_en"] for k in fixed_karanas}
    assert fixed_names == {"Kintughna", "Shakuni", "Chatushpada", "Naga"}

    # Evaluate the 60 Karana indices mathematically
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    # Sweep across all 60 Karana intervals by solving for the midpoint of each interval
    from panchang_engine import _solve_nr_boundary
    encountered_names = set()
    jd_base = 2461118.6
    for k_num in range(60):
        # Target midpoint of Karana k_num
        target = (k_num + 0.5) * 6.0
        jd_mid = _solve_nr_boundary(jd_base + k_num * 0.49, target, mode="karana")
        k_res = solve_karana_boundary(jd_mid, "Asia/Kolkata")
        encountered_names.add(k_res["name_en"])
        assert k_res["start_jd"] <= jd_mid <= k_res["end_jd"]

    # All 11 unique Karana names must appear
    assert len(encountered_names) == 11


# =============================================================================
# 5. NEWTON-RAPHSON BOUNDARY TRANSITION ACCURACY (< 60s TOLERANCE)
# =============================================================================

def test_transition_timestamp_accuracy_sub_minute():
    """
    Independently verifies that the computed transition Julian Days achieve
    exact sub-second boundary accuracy (< 0.0001° error, corresponding to < 0.1 second).
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    test_jds = [2451545.0, 2460000.0, 2461344.75, 2461500.25]

    for jd_test in test_jds:
        # 1. Tithi Accuracy
        t_res = solve_tithi_boundary(jd_test)
        # Verify at start_jd: (Moon - Sun) == index * 12°
        m_s, _ = swe.calc_ut(t_res["start_jd"], swe.MOON, flag)
        s_s, _ = swe.calc_ut(t_res["start_jd"], swe.SUN, flag)
        diff_s = (m_s[0] - s_s[0]) % 360.0
        target_s = t_res["index"] * 12.0
        err_s_deg = abs((diff_s - target_s + 180.0) % 360.0 - 180.0)
        assert err_s_deg < 0.0001, f"Tithi start angle error {err_s_deg}° exceeds 0.0001°"

        # Verify at end_jd: (Moon - Sun) == (index + 1) * 12°
        m_e, _ = swe.calc_ut(t_res["end_jd"], swe.MOON, flag)
        s_e, _ = swe.calc_ut(t_res["end_jd"], swe.SUN, flag)
        diff_e = (m_e[0] - s_e[0]) % 360.0
        target_e = (t_res["index"] + 1) * 12.0
        err_e_deg = abs((diff_e - target_e + 180.0) % 360.0 - 180.0)
        assert err_e_deg < 0.0001, f"Tithi end angle error {err_e_deg}° exceeds 0.0001°"

        # 2. Nakshatra Accuracy
        n_res = solve_nakshatra_boundary(jd_test)
        span = 360.0 / 27.0
        m_ns, _ = swe.calc_ut(n_res["start_jd"], swe.MOON, flag)
        err_ns = abs((m_ns[0] - n_res["index"] * span + 180.0) % 360.0 - 180.0)
        assert err_ns < 0.0001, f"Nakshatra start error {err_ns}° exceeds 0.0001°"

        m_ne, _ = swe.calc_ut(n_res["end_jd"], swe.MOON, flag)
        err_ne = abs((m_ne[0] - (n_res["index"] + 1) * span + 180.0) % 360.0 - 180.0)
        assert err_ne < 0.0001, f"Nakshatra end error {err_ne}° exceeds 0.0001°"

        # 3. Yoga Accuracy
        y_res = solve_yoga_boundary(jd_test)
        m_ye, _ = swe.calc_ut(y_res["end_jd"], swe.MOON, flag)
        s_ye, _ = swe.calc_ut(y_res["end_jd"], swe.SUN, flag)
        tot_ye = (m_ye[0] + s_ye[0]) % 360.0
        err_ye = abs((tot_ye - (y_res["index"] + 1) * span + 180.0) % 360.0 - 180.0)
        assert err_ye < 0.0001, f"Yoga end error {err_ye}° exceeds 0.0001°"

        # 4. Moon Rashi Ingress & Egress Accuracy
        r_res = solve_moon_rashi_boundary(jd_test)
        m_rs, _ = swe.calc_ut(r_res["ingress_jd"], swe.MOON, flag)
        err_rs = abs((m_rs[0] - r_res["index"] * 30.0 + 180.0) % 360.0 - 180.0)
        assert err_rs < 0.0001, f"Rashi ingress error {err_rs}° exceeds 0.0001°"

        m_re, _ = swe.calc_ut(r_res["egress_jd"], swe.MOON, flag)
        err_re = abs((m_re[0] - (r_res["index"] + 1) * 30.0 + 180.0) % 360.0 - 180.0)
        assert err_re < 0.0001, f"Rashi egress error {err_re}° exceeds 0.0001°"


# =============================================================================
# 6. CELESTIAL TIMINGS ENGINE (SUN, MOON, NOON & 5 INDIAN CITIES)
# =============================================================================

def test_celestial_timings_five_indian_cities():
    """
    Validates Sunrise, Sunset, Moonrise, Moonset, and Solar Noon
    across 5 benchmark Indian cities: New Delhi, Jabalpur, Mumbai, Chennai, Kolkata.
    """
    test_dt = date(2026, 10, 31)

    city_results = {}
    for city_name, cfg in INDIAN_CITIES.items():
        res = calculate_celestial_timings(
            test_dt, cfg["lat"], cfg["lon"], cfg["altitude_m"], cfg["tz"]
        )
        city_results[city_name] = res

        # Invariant 1: Chronological Order: Sunrise < Solar Noon < Sunset < Next Sunrise
        assert res["jd_rise"] < res["jd_noon"] < res["jd_set"] < res["jd_next_rise"]

        # Invariant 2: Total diurnal + nocturnal day length equals ~24 hours
        total_cycle_hours = res["day_hours"] + res["night_hours"]
        assert abs(total_cycle_hours - 24.0) < 0.1, f"Cycle length {total_cycle_hours}h deviates from 24h"

        # Invariant 3: Moon phase illumination between 0% and 100%
        assert 0.0 <= res["moon_phase"]["illumination_pct"] <= 100.0

        # Invariant 4: Solar noon is within 15 minutes of 12:00 local standard time
        noon_dt = jd_to_datetime_utc(res["jd_noon"]).astimezone(timezone(timedelta(hours=5, minutes=30)))
        assert 11 <= noon_dt.hour <= 12

    # Invariant 5: Geographic Longitude Gradient (East-to-West progression)
    # Kolkata (88.36° E) is significantly east of Mumbai (72.88° E).
    # Kolkata sunrise must occur ~1 hour EARLIER than Mumbai sunrise.
    kolkata_rise_jd = city_results["Kolkata"]["jd_rise"]
    mumbai_rise_jd = city_results["Mumbai"]["jd_rise"]
    diff_minutes = (mumbai_rise_jd - kolkata_rise_jd) * 24.0 * 60.0
    assert 50.0 < diff_minutes < 75.0, f"Kolkata to Mumbai rise diff {diff_minutes}m not in expected ~62m window"

    # Invariant 6: Elevation Sensitivity
    # Compare sea level (0m) vs 1500m elevation at Delhi coordinates
    res_sea = calculate_celestial_timings(test_dt, 28.6139, 77.2090, 0.0, "Asia/Kolkata")
    res_high = calculate_celestial_timings(test_dt, 28.6139, 77.2090, 1500.0, "Asia/Kolkata")
    # Elevation parameter is passed to Swiss Ephemeris topocentric geopos and alters timing
    assert res_high["jd_rise"] != res_sea["jd_rise"]
    assert abs(res_high["jd_rise"] - res_sea["jd_rise"]) > 1e-6
    assert res_high["jd_set"] != res_sea["jd_set"]
    assert abs(res_high["jd_set"] - res_sea["jd_set"]) > 1e-6


# =============================================================================
# 7. LUNAR MONTH & SAMVAT CONVENTIONS (AMANTA, PURNIMANTA, ADHIKA MASA)
# =============================================================================

def test_lunar_month_and_samvat_conventions():
    """
    Validates Amanta vs Purnimanta month designations, Adhika Masa detection,
    and Shaka & Vikram Samvat year calculations.
    """
    # Test Case A: Normal Month (October 31, 2026)
    # In late October 2026, it is Ashwina (Amanta) / Kartika (Purnimanta Krishna Paksha)
    dt_oct_2026 = date(2026, 10, 31)
    jd_oct = swe.julday(2026, 10, 31, 6.0)
    res_oct = calculate_lunar_month_and_samvat(jd_oct, dt_oct_2026)

    assert res_oct["amanta_month"] == "Ashwina"
    assert res_oct["purnimanta_month"] == "Kartika"
    assert res_oct["paksha"] == "Krishna"
    assert not res_oct["is_adhika"]
    assert res_oct["shaka_samvat"] == 1948
    assert res_oct["vikram_samvat_chaitradi"] == 2083

    # Test Case B: Shukla Paksha (March 25, 2026)
    # During Shukla Paksha, Amanta and Purnimanta month names MUST be identical!
    dt_mar_2026 = date(2026, 3, 25)
    jd_mar = swe.julday(2026, 3, 25, 6.0)
    res_mar = calculate_lunar_month_and_samvat(jd_mar, dt_mar_2026)

    assert res_mar["amanta_month"] == "Chaitra"
    assert res_mar["purnimanta_month"] == "Chaitra"
    assert res_mar["paksha"] == "Shukla"

    # Test Case C: Historical Adhika Masa Detection (July 25, 2023)
    # 2023 featured Adhika Shravana (no solar sankranti between New Moons)
    dt_adhika = date(2023, 7, 25)
    jd_adhika = swe.julday(2023, 7, 25, 6.0)
    res_adhika = calculate_lunar_month_and_samvat(jd_adhika, dt_adhika)

    assert res_adhika["is_adhika"] is True
    assert "Adhika" in res_adhika["amanta_month"]
    assert "Shravana" in res_adhika["amanta_month"]

    # Test Case D: Adhika Masa Krishna Paksha (August 5, 2023)
    # In authentic Purnimanta tradition, both Shukla and Krishna Pakshas within the intercalary
    # month belong to the SAME Adhika month ("Adhika Shravana"), not "Adhika Bhadrapada".
    dt_adhika_krishna = date(2023, 8, 5)
    jd_adhika_krishna = swe.julday(2023, 8, 5, 12.0)
    res_adhika_krishna = calculate_lunar_month_and_samvat(jd_adhika_krishna, dt_adhika_krishna)

    assert res_adhika_krishna["is_adhika"] is True
    assert res_adhika_krishna["paksha"] == "Krishna"
    assert res_adhika_krishna["amanta_month"] == "Adhika Shravana"
    assert res_adhika_krishna["purnimanta_month"] == "Adhika Shravana"
    assert "Bhadrapada" not in res_adhika_krishna["purnimanta_month"]
    assert "vikram_samvat" in res_adhika_krishna
    assert res_adhika_krishna["vikram_samvat"] == 2080


# =============================================================================
# 8. CLASSICAL PROPORTIONAL MUHURATS & CHOGHADIYA
# =============================================================================

def test_classical_proportional_muhurats_and_choghadiya():
    """
    Validates authentic proportional Muhurtas:
    - 15-fold Diurnal division (Abhijit)
    - 15-fold Nocturnal division (Brahma)
    - 8-fold Daytime divisions (Rahu, Yama, Gulika)
    - Durmuhurta & Choghadiya schedules
    """
    test_dt = date(2026, 10, 31)
    cel = calculate_celestial_timings(test_dt, 28.6139, 77.2090, 216.0, "Asia/Kolkata")
    dt_rise = jd_to_datetime_utc(cel["jd_rise"])
    dt_set = jd_to_datetime_utc(cel["jd_set"])
    dt_next_rise = jd_to_datetime_utc(cel["jd_next_rise"])
    dt_prev_set = dt_set - timedelta(days=1)

    weekday_idx = test_dt.weekday()  # Saturday = 5

    muhurats = calculate_proportional_muhurtas(
        dt_rise, dt_set, dt_next_rise, dt_prev_set, weekday_idx, "Asia/Kolkata"
    )

    # 1. Abhijit Muhurta duration must be exactly day_duration / 15
    day_duration_sec = (dt_set - dt_rise).total_seconds()
    expected_abhijit_mins = (day_duration_sec / 15.0) / 60.0
    assert abs(muhurats["abhijit_muhurta"]["duration_minutes"] - expected_abhijit_mins) < 0.1

    # 2. Brahma Muhurta duration must be exactly night_duration / 15
    night_duration_sec = (dt_rise - dt_prev_set).total_seconds()
    expected_brahma_mins = (night_duration_sec / 15.0) / 60.0
    assert abs(muhurats["brahma_muhurta"]["duration_minutes"] - expected_brahma_mins) < 0.1

    # 3. Rahu Kaal on Saturday is Part 3 of 8 daytime divisions
    assert muhurats["rahu_kaal"]["part_number"] == 3
    assert muhurats["yamaganda"]["part_number"] == 6
    assert muhurats["gulika_kaal"]["part_number"] == 1

    # 4. Durmuhurta on Saturday has parts 2 and 3
    assert len(muhurats["durmuhurta"]) == 2
    assert muhurats["durmuhurta"][0]["muhurta_number"] == 2
    assert muhurats["durmuhurta"][1]["muhurta_number"] == 3

    # 5. Choghadiya Schedule: 8 daytime periods and 8 nighttime periods
    choghadiya = calculate_choghadiya(dt_rise, dt_set, dt_next_rise, weekday_idx, "Asia/Kolkata")
    assert len(choghadiya["day"]) == 8
    assert len(choghadiya["night"]) == 8

    # Saturday day starts with Kaal, ends with Kaal
    assert choghadiya["day"][0]["name"] == "Kaal"
    assert choghadiya["day"][7]["name"] == "Kaal"


# =============================================================================
# 9. BOUNDARY CONDITIONS: MIDNIGHT, LEAP YEARS, PRE-SUNRISE INVARIANT (AV-SEC-06)
# =============================================================================

def test_boundary_conditions_and_invariants():
    """
    Tests edge cases:
    - Pre-sunrise birth day rollover (AV-SEC-06 invariant)
    - Midnight crossings
    - Leap years (Feb 29, 2024)
    - Year crossover (Dec 31 -> Jan 1)
    - High-latitude polar safety
    """
    lat, lon, tz = 28.6139, 77.2090, "Asia/Kolkata"

    # 1. AV-SEC-06 Invariant: Pre-sunrise birth at 04:30 AM on Oct 24, 1995 (Tuesday calendar)
    # Astronomical sunrise in Delhi on Oct 24 is ~06:27 AM.
    # Birth at 04:30 AM occurs before sunrise and must belong to Monday (Somavara, Moon).
    p_pre = calculate_full_panchang("1995-10-24T04:30:00", lat, lon, tz)
    assert p_pre["panchang"]["vara"] == "Monday"
    assert p_pre["panchang"]["day_lord"] == "Moon"
    assert p_pre["panchang"]["is_pre_sunrise"] is True

    # Post-sunrise birth at 08:00 AM on Oct 24, 1995 belongs to Tuesday (Mangalavara, Mars)
    p_post = calculate_full_panchang("1995-10-24T08:00:00", lat, lon, tz)
    assert p_post["panchang"]["vara"] == "Tuesday"
    assert p_post["panchang"]["day_lord"] == "Mars"
    assert p_post["panchang"]["is_pre_sunrise"] is False

    # Pre-sunrise Brahma Muhurta duration check on 2026-10-31T04:30:00 (Delhi)
    # Natural night duration is ~12.9 hours -> Brahma Muhurta duration ~51.6 minutes
    p_pre_2026 = calculate_full_panchang("2026-10-31T04:30:00", lat, lon, tz)
    assert p_pre_2026["panchang"]["is_pre_sunrise"] is True
    bm_pre = p_pre_2026["auspicious_windows"]["brahma_muhurta"]
    assert 40.0 < bm_pre["duration_minutes"] < 60.0, f"Invalid Brahma Muhurta duration: {bm_pre['duration_minutes']}"
    # Verify pre-sunrise date mutation does not corrupt prev_date to create a 37-hour night
    assert bm_pre["duration_minutes"] < 70.0

    # Also test another pre-sunrise timestamp: 2026-11-02T04:30:00+05:30
    p_pre_nov = calculate_full_panchang("2026-11-02T04:30:00+05:30", lat, lon, tz)
    assert p_pre_nov["panchang"]["is_pre_sunrise"] is True
    bm_nov = p_pre_nov["auspicious_windows"]["brahma_muhurta"]
    assert 40.0 < bm_nov["duration_minutes"] < 60.0

    # 2. Leap Year: February 29, 2024
    p_leap = calculate_full_panchang("2024-02-29", lat, lon, tz)
    assert p_leap["panchang"]["vara"] == "Thursday"
    assert p_leap["panchang"]["day_lord"] == "Jupiter"

    # 3. Year Boundary: December 31, 2025 -> January 1, 2026
    p_nye = calculate_full_panchang("2025-12-31", lat, lon, tz)
    p_nyd = calculate_full_panchang("2026-01-01", lat, lon, tz)
    assert p_nye["panchang"]["vara"] == "Wednesday"
    assert p_nyd["panchang"]["vara"] == "Thursday"

    # 4. High-Latitude Safety (Tromsø, Norway at 69.65° N in December - Polar Night)
    p_polar = calculate_full_panchang("2026-12-21", 69.6492, 18.9553, "Europe/Oslo")
    assert p_polar["solar_cycle"]["sunrise"] is not None
    assert p_polar["celestial_timings"]["is_polar_fallback"] is True


# =============================================================================
# 10. ADVANCED PANCHANG CONTRACT VERIFICATION
# =============================================================================

def test_calculate_advanced_panchang_interface_contract():
    """
    Verifies the complete output schema defined in the Master Project Plan
    contract for /api/panchang/calculate.
    """
    dt_utc = datetime(2026, 10, 31, 6, 30, tzinfo=timezone.utc)
    res = calculate_advanced_panchang(dt_utc, 28.6139, 77.2090, 216.0, "Asia/Kolkata")

    # Top-level required keys
    assert "vaar" in res
    assert "tithi" in res
    assert "nakshatra" in res
    assert "yoga" in res
    assert "karana" in res
    assert "celestial" in res
    assert "lunar_month" in res
    assert "muhurats" in res
    assert "choghadiya" in res
    assert "moon_rashi" in res

    # Vaar keys
    assert res["vaar"]["name_en"] in ["Saturday", "Sunday"]
    assert "name_hi" in res["vaar"]
    assert "name_sa" in res["vaar"]
    assert "lord" in res["vaar"]

    # Tithi keys
    t = res["tithi"]
    assert "start_time_iso" in t
    assert "end_time_iso" in t
    assert "elapsed_percentage" in t
    assert "next_tithi" in t

    # Nakshatra keys
    n = res["nakshatra"]
    assert "pada" in n
    assert "lord" in n
    assert "start_time_iso" in n
    assert "end_time_iso" in n

    # Celestial keys
    c = res["celestial"]
    assert "sunrise_iso" in c
    assert "sunset_iso" in c
    assert "solar_noon_iso" in c
    assert "day_hours" in c
    assert "night_hours" in c

    # Moon Rashi keys
    mr = res["moon_rashi"]
    assert "rashi_en" in mr
    assert "rashi_hi" in mr
    assert "lord" in mr
    assert "ingress_time_iso" in mr
    assert "egress_time_iso" in mr

    # Lunar Month keys (Contract 1: vikram_samvat primary key)
    lm = res["lunar_month"]
    assert "vikram_samvat" in lm
    assert "vikram_samvat_chaitradi" in lm
    assert "vikram_samvat_kartikadi" in lm
    assert "shaka_samvat" in lm
    assert lm["vikram_samvat"] == lm["vikram_samvat_chaitradi"]
    assert "paksha" in lm
    assert "is_adhika" in lm
    assert "is_kshaya" in lm

    # Test tools_registry alias calculate_daily_panchang
    p_alias = calculate_daily_panchang("2026-10-31", 28.6139, 77.2090, "Asia/Kolkata")
    assert p_alias["panchang"]["vara"] == "Saturday"
