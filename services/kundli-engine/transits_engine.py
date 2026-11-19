"""
AstroVerse Planetary Transits, Ingress/Egress & Lunar Events Engine
===================================================================
Provides high-precision sidereal planetary transit (Gochar) calculations,
Newton-Raphson boundary solvers for sign ingress and egress, retrograde
station solvers, lunar phase detection (Amavasya, Purnima, Quarters), and
3-degree planetary conjunction detection using Swiss Ephemeris.

Methodologies:
- Sidereal Lahiri (Chitrapaksha) Ayanamsha (swe.SIDM_LAHIRI).
- 9 Vedic Grahas: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn,
  Rahu (Mean Node: swe.MEAN_NODE), Ketu (Rahu + 180°).
- Newton-Raphson boundary root-finding for exact ingress/egress timestamps.
- Stationary retrograde/direct turning point root-finding (speed = 0).
- Lunar phase elongation solvers: 0° (Amavasya), 90° (First Quarter),
  180° (Purnima), 270° (Third Quarter) with exact illumination %.
- Planetary conjunction detection within 3.0° sidereal orb.
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, date, timedelta, timezone
import math

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

import swisseph as swe

from panchang_engine import (
    jd_to_datetime_utc,
    datetime_to_jd_utc,
    format_iso_tz,
    format_time_tz,
)

from astrology_settings import (
    SIGNS,
    SIGNS_DETAILED,
    NAKSHATRAS,
    NAKSHATRAS_DETAILED,
)

# Vedic Grahas mapping to Swiss Ephemeris Planet IDs
GRAHAS_DEFINITION = [
    {
        "id": "Sun",
        "swe_id": swe.SUN,
        "name_en": "Sun",
        "name_hi": "सूर्य",
        "name_sa": "Surya",
        "lord_of": ["Leo"],
        "element": "Fire",
        "nature": "Malefic (Mild Krura)",
    },
    {
        "id": "Moon",
        "swe_id": swe.MOON,
        "name_en": "Moon",
        "name_hi": "चन्द्र",
        "name_sa": "Chandra",
        "lord_of": ["Cancer"],
        "element": "Water",
        "nature": "Benefic (Saumya)",
    },
    {
        "id": "Mars",
        "swe_id": swe.MARS,
        "name_en": "Mars",
        "name_hi": "मंगल",
        "name_sa": "Mangala",
        "lord_of": ["Aries", "Scorpio"],
        "element": "Fire",
        "nature": "Malefic (Krura)",
    },
    {
        "id": "Mercury",
        "swe_id": swe.MERCURY,
        "name_en": "Mercury",
        "name_hi": "बुध",
        "name_sa": "Budha",
        "lord_of": ["Gemini", "Virgo"],
        "element": "Earth",
        "nature": "Benefic (Variable/Neutral)",
    },
    {
        "id": "Jupiter",
        "swe_id": swe.JUPITER,
        "name_en": "Jupiter",
        "name_hi": "गुरु",
        "name_sa": "Guru",
        "lord_of": ["Sagittarius", "Pisces"],
        "element": "Ether",
        "nature": "Great Benefic (Subha)",
    },
    {
        "id": "Venus",
        "swe_id": swe.VENUS,
        "name_en": "Venus",
        "name_hi": "शुक्र",
        "name_sa": "Shukra",
        "lord_of": ["Taurus", "Libra"],
        "element": "Water",
        "nature": "Benefic (Subha)",
    },
    {
        "id": "Saturn",
        "swe_id": swe.SATURN,
        "name_en": "Saturn",
        "name_hi": "शनि",
        "name_sa": "Shani",
        "lord_of": ["Capricorn", "Aquarius"],
        "element": "Air",
        "nature": "Malefic (Manda/Krura)",
    },
    {
        "id": "Rahu",
        "swe_id": swe.MEAN_NODE,
        "name_en": "Rahu",
        "name_hi": "राहु",
        "name_sa": "Rahu",
        "lord_of": [],
        "element": "Air",
        "nature": "Chhaya Graha (Malefic)",
    },
    {
        "id": "Ketu",
        "swe_id": None,  # Calculated as Rahu + 180°
        "name_en": "Ketu",
        "name_hi": "केतु",
        "name_sa": "Ketu",
        "lord_of": [],
        "element": "Fire",
        "nature": "Chhaya Graha (Moksha Karaka)",
    },
]


def get_planet_position_at_jd(
    jd: float,
    graha_def: Dict[str, Any],
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Computes instantaneous sidereal longitude, speed, sign, and nakshatra
    for a given Graha at Julian Day `jd`.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL

    if graha_def["id"] == "Ketu":
        # Ketu is exactly opposite Rahu
        res, _ = swe.calc_ut(jd, swe.MEAN_NODE, flags)
        lon = (res[0] + 180.0) % 360.0
        lat = -res[1]
        dist = res[2]
        speed = res[3]  # Rahu speed
    else:
        res, _ = swe.calc_ut(jd, graha_def["swe_id"], flags)
        lon = res[0] % 360.0
        lat = res[1]
        dist = res[2]
        speed = res[3]

    sign_idx = int(lon / 30.0) % 12
    deg_in_sign = lon % 30.0
    deg_int = int(deg_in_sign)
    min_int = int((deg_in_sign - deg_int) * 60.0)
    sec_int = int(((deg_in_sign - deg_int) * 60.0 - min_int) * 60.0)

    # Nakshatra calculation: 360° / 27 = 13°20' (13.333333°)
    nakshatra_span = 360.0 / 27.0
    nakshatra_idx = int(lon / nakshatra_span) % 27
    pada_span = nakshatra_span / 4.0
    rem_nak = lon % nakshatra_span
    pada = int(rem_nak / pada_span) + 1

    nakshatra_info = NAKSHATRAS_DETAILED[nakshatra_idx]
    sign_info = SIGNS_DETAILED[sign_idx]

    is_retrograde = speed < 0.0
    motion_status = "Retrograde" if is_retrograde else "Direct"
    if abs(speed) < 0.001:
        motion_status = "Stationary"

    return {
        "id": graha_def["id"],
        "name": graha_def["name_en"],
        "name_en": graha_def["name_en"],
        "name_hi": graha_def["name_hi"],
        "name_sa": graha_def["name_sa"],
        "longitude": round(lon, 6),
        "latitude": round(lat, 6),
        "distance_au": round(dist, 6),
        "speed": round(speed, 6),
        "is_retrograde": is_retrograde,
        "motion_status": motion_status,
        "sign_index": sign_idx,
        "sign_name": sign_info["name_en"],
        "sign_name_en": sign_info["name_en"],
        "sign_name_hi": sign_info["name_hi"],
        "sign_name_sa": sign_info["name_sa"],
        "sign_lord": sign_info["lord"],
        "degree_in_sign": round(deg_in_sign, 6),
        "degree_formatted": f"{deg_int:02d}° {min_int:02d}' {sec_int:02d}\"",
        "nakshatra_index": nakshatra_idx,
        "nakshatra_name": nakshatra_info["name_en"],
        "nakshatra_name_hi": nakshatra_info["name_hi"],
        "nakshatra_name_sa": nakshatra_info["name_sa"],
        "nakshatra_pada": pada,
        "nakshatra_lord": nakshatra_info["lord"],
        "element": graha_def["element"],
        "nature": graha_def["nature"],
    }


def calculate_live_grahas(
    dt_utc: datetime,
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Computes current sidereal positions for all 9 Grahas.
    """
    jd = datetime_to_jd_utc(dt_utc)
    grahas = {}
    for g_def in GRAHAS_DEFINITION:
        grahas[g_def["id"]] = get_planet_position_at_jd(jd, g_def, ayanamsha_mode)

    return {
        "timestamp_utc": dt_utc.isoformat(),
        "jd": round(jd, 6),
        "ayanamsha_mode": ayanamsha_mode,
        "grahas": grahas,
    }


# =============================================================================
# NEWTON-RAPHSON INGRESS & EGRESS SOLVER
# =============================================================================

def _solve_planet_sign_boundary(
    planet_def: Dict[str, Any],
    target_boundary_deg: float,
    jd_initial: float,
    jd_min: float,
    jd_max: float,
    ayanamsha_mode: int = swe.SIDM_LAHIRI,
    max_iter: int = 15,
    tolerance_deg: float = 1e-6
) -> float:
    """
    Solves for the exact Julian Day when planet sidereal longitude reaches `target_boundary_deg`.
    Uses Newton-Raphson with bisection safety guarantee.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL

    jd_curr = max(jd_min, min(jd_max, jd_initial))
    low = jd_min
    high = jd_max

    for _ in range(max_iter):
        if planet_def["id"] == "Ketu":
            res, _ = swe.calc_ut(jd_curr, swe.MEAN_NODE, flags)
            lon = (res[0] + 180.0) % 360.0
            speed = res[3]
        else:
            res, _ = swe.calc_ut(jd_curr, planet_def["swe_id"], flags)
            lon = res[0] % 360.0
            speed = res[3]

        diff = (lon - target_boundary_deg + 180.0) % 360.0 - 180.0
        if abs(diff) < tolerance_deg:
            return jd_curr

        if abs(speed) < 1e-5:
            # Fallback to midpoint bisection if speed is virtually stationary
            jd_next = 0.5 * (low + high)
        else:
            step = diff / speed
            jd_next = jd_curr - step

        # Bracket check
        if jd_next < low or jd_next > high:
            jd_next = 0.5 * (low + high)

        if abs(jd_next - jd_curr) < 1e-7:  # < 0.01 second
            return jd_next

        # Update search bracket based on direction of motion
        if speed > 0:
            if diff < 0:
                low = max(low, jd_curr)
            else:
                high = min(high, jd_curr)
        else:
            if diff > 0:
                low = max(low, jd_curr)
            else:
                high = min(high, jd_curr)

        jd_curr = jd_next

    return jd_curr


def find_planetary_ingresses(
    start_jd: float,
    end_jd: float,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> List[Dict[str, Any]]:
    """
    Detects and refines all planetary sign ingress events across the interval [start_jd, end_jd].
    Finds exact ingress timestamp down to sub-second precision using Newton-Raphson.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL

    events: List[Dict[str, Any]] = []

    for g_def in GRAHAS_DEFINITION:
        # Select appropriate sampling step depending on planet velocity
        if g_def["id"] == "Moon":
            step_days = 0.25  # 6 hours
        elif g_def["id"] in ["Sun", "Mercury", "Venus", "Mars"]:
            step_days = 0.5   # 12 hours
        else:
            step_days = 1.0   # 24 hours (Jupiter, Saturn, Rahu, Ketu)

        t_curr = start_jd
        # Calculate initial sign
        p0 = get_planet_position_at_jd(t_curr, g_def, ayanamsha_mode)
        curr_sign = p0["sign_index"]

        while t_curr < end_jd:
            t_next = min(end_jd, t_curr + step_days)
            p_next = get_planet_position_at_jd(t_next, g_def, ayanamsha_mode)
            next_sign = p_next["sign_index"]

            if next_sign != curr_sign:
                # Sign boundary crossed!
                # Target boundary in degrees
                if p0["speed"] >= 0:
                    target_boundary = (next_sign * 30.0) % 360.0
                else:
                    target_boundary = (curr_sign * 30.0) % 360.0

                # Solve exact crossing time
                t_exact = _solve_planet_sign_boundary(
                    g_def, target_boundary,
                    0.5 * (t_curr + t_next),
                    t_curr, t_next,
                    ayanamsha_mode
                )

                dt_exact_utc = jd_to_datetime_utc(t_exact)
                p_exact = get_planet_position_at_jd(t_exact, g_def, ayanamsha_mode)

                events.append({
                    "planet": g_def["name_en"],
                    "planet_hi": g_def["name_hi"],
                    "planet_sa": g_def["name_sa"],
                    "from_sign_index": curr_sign,
                    "from_sign_name": SIGNS[curr_sign],
                    "from_sign_name_hi": SIGNS_DETAILED[curr_sign]["name_hi"],
                    "to_sign_index": next_sign,
                    "to_sign_name": SIGNS[next_sign],
                    "to_sign_name_hi": SIGNS_DETAILED[next_sign]["name_hi"],
                    "boundary_deg": round(target_boundary, 2),
                    "jd": round(t_exact, 6),
                    "timestamp_iso": format_iso_tz(dt_exact_utc, tz_str),
                    "timestamp_formatted": format_time_tz(dt_exact_utc, tz_str),
                    "speed_at_ingress": round(p_exact["speed"], 6),
                    "is_retrograde": p_exact["is_retrograde"],
                    "nakshatra": p_exact["nakshatra_name"],
                    "nakshatra_hi": p_exact["nakshatra_name_hi"],
                })

                curr_sign = next_sign

            t_curr = t_next

    # Sort events chronologically
    events.sort(key=lambda x: x["jd"])
    return events


# =============================================================================
# RETROGRADE STATION SOLVER (Speed = 0)
# =============================================================================

def find_planetary_stations(
    start_jd: float,
    end_jd: float,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> List[Dict[str, Any]]:
    """
    Finds stationary points where planetary speed crosses zero (transition between
    direct and retrograde motion).
    Evaluated for Mercury, Venus, Mars, Jupiter, Saturn.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL

    station_planets = [
        g for g in GRAHAS_DEFINITION
        if g["id"] in ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"]
    ]

    stations: List[Dict[str, Any]] = []
    step_days = 0.5

    for g_def in station_planets:
        t_curr = start_jd
        res0, _ = swe.calc_ut(t_curr, g_def["swe_id"], flags)
        v_prev = res0[3]

        while t_curr < end_jd:
            t_next = min(end_jd, t_curr + step_days)
            res1, _ = swe.calc_ut(t_next, g_def["swe_id"], flags)
            v_curr = res1[3]

            if v_prev * v_curr <= 0 and abs(v_prev - v_curr) > 1e-6:
                # Speed crossed zero! Stationary point in [t_curr, t_next]
                # Solve v(t) = 0 using bisection / secant
                t_low = t_curr
                t_high = t_next
                v_low = v_prev
                v_high = v_curr

                t_station = 0.5 * (t_low + t_high)
                for _ in range(25):
                    t_mid = 0.5 * (t_low + t_high)
                    res_m, _ = swe.calc_ut(t_mid, g_def["swe_id"], flags)
                    v_mid = res_m[3]

                    if abs(v_mid) < 1e-7 or (t_high - t_low) < 1e-7:
                        t_station = t_mid
                        break

                    if v_low * v_mid <= 0:
                        t_high = t_mid
                        v_high = v_mid
                    else:
                        t_low = t_mid
                        v_low = v_mid
                    t_station = t_mid

                dt_station_utc = jd_to_datetime_utc(t_station)
                p_station = get_planet_position_at_jd(t_station, g_def, ayanamsha_mode)

                if v_prev > 0 and v_curr < 0:
                    station_type = "Stationary Retrograde"
                    station_type_hi = "वक्री प्रारम्भ (Stationary Retrograde)"
                else:
                    station_type = "Stationary Direct"
                    station_type_hi = "मार्गी प्रारम्भ (Stationary Direct)"

                stations.append({
                    "planet": g_def["name_en"],
                    "planet_hi": g_def["name_hi"],
                    "planet_sa": g_def["name_sa"],
                    "station_type": station_type,
                    "station_type_hi": station_type_hi,
                    "jd": round(t_station, 6),
                    "timestamp_iso": format_iso_tz(dt_station_utc, tz_str),
                    "timestamp_formatted": format_time_tz(dt_station_utc, tz_str),
                    "longitude": p_station["longitude"],
                    "sign_index": p_station["sign_index"],
                    "sign_name": p_station["sign_name_en"],
                    "sign_name_hi": p_station["sign_name_hi"],
                    "degree_in_sign": p_station["degree_in_sign"],
                    "degree_formatted": p_station["degree_formatted"],
                    "nakshatra": p_station["nakshatra_name"],
                    "nakshatra_hi": p_station["nakshatra_name_hi"],
                    "nakshatra_pada": p_station["nakshatra_pada"],
                })

            v_prev = v_curr
            t_curr = t_next

    stations.sort(key=lambda x: x["jd"])
    return stations


# =============================================================================
# LUNAR PHASES SOLVER (Amavasya, Quarters, Purnima)
# =============================================================================

def find_monthly_lunar_phases(
    start_jd: float,
    end_jd: float,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> List[Dict[str, Any]]:
    """
    Finds exact timestamps for all 4 primary lunar phases across the requested interval:
    - 0° elongation: Amavasya (New Moon)
    - 90° elongation: First Quarter (Shukla Ashtami)
    - 180° elongation: Purnima (Full Moon)
    - 270° elongation: Third / Last Quarter (Krishna Ashtami)
    """
    swe.set_sid_mode(ayanamsha_mode)
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL

    phase_targets = [
        {
            "target_deg": 0.0,
            "key": "amavasya",
            "name": "Amavasya (New Moon)",
            "name_hi": "अमावस्या",
            "name_sa": "अमावास्या",
        },
        {
            "target_deg": 90.0,
            "key": "first_quarter",
            "name": "First Quarter (Shukla Ashtami)",
            "name_hi": "प्रथम पाद (शुक्ल अष्टमी)",
            "name_sa": "प्रथमचरणम्",
        },
        {
            "target_deg": 180.0,
            "key": "purnima",
            "name": "Purnima (Full Moon)",
            "name_hi": "पूर्णिमा",
            "name_sa": "पूर्णिमा",
        },
        {
            "target_deg": 270.0,
            "key": "third_quarter",
            "name": "Third Quarter (Krishna Ashtami)",
            "name_hi": "तृतीय पाद (कृष्ण अष्टमी)",
            "name_sa": "तृतीयचरणम्",
        },
    ]

    phases: List[Dict[str, Any]] = []
    step_days = 0.25  # 6 hours

    def get_elongation_and_speed(jd_val: float) -> Tuple[float, float]:
        m_res, _ = swe.calc_ut(jd_val, swe.MOON, flags)
        s_res, _ = swe.calc_ut(jd_val, swe.SUN, flags)
        elong = (m_res[0] - s_res[0]) % 360.0
        rel_speed = m_res[3] - s_res[3]
        return elong, rel_speed

    t_curr = start_jd
    e_prev, _ = get_elongation_and_speed(t_curr)

    while t_curr < end_jd:
        t_next = min(end_jd, t_curr + step_days)
        e_curr, _ = get_elongation_and_speed(t_next)

        for p_info in phase_targets:
            tgt = p_info["target_deg"]
            # Check if target crossed in interval [e_prev, e_curr]
            # Account for circular wrap around 0 / 360
            crossed = False
            if tgt == 0.0:
                if e_prev > 300.0 and e_curr < 60.0:
                    crossed = True
            else:
                if e_prev < tgt <= e_curr or (e_prev > 300.0 and e_curr >= tgt and tgt < 60.0):
                    crossed = True

            if crossed:
                # Solve using Newton-Raphson: f(t) = (elong(t) - tgt) % 360 = 0
                t_exact = 0.5 * (t_curr + t_next)
                for _ in range(12):
                    elong, rel_speed = get_elongation_and_speed(t_exact)
                    diff = (elong - tgt + 180.0) % 360.0 - 180.0
                    if abs(diff) < 1e-6:
                        break
                    t_exact -= diff / max(rel_speed, 10.0)

                dt_phase_utc = jd_to_datetime_utc(t_exact)
                pheno = swe.pheno_ut(t_exact, swe.MOON)
                illumination_pct = round(float(pheno[1]) * 100.0, 2)

                m_pos, _ = swe.calc_ut(t_exact, swe.MOON, flags)
                s_pos, _ = swe.calc_ut(t_exact, swe.SUN, flags)
                m_sign = int(m_pos[0] / 30.0) % 12
                s_sign = int(s_pos[0] / 30.0) % 12
                nak_idx = int(m_pos[0] / (360.0 / 27.0)) % 27

                phases.append({
                    "phase_key": p_info["key"],
                    "phase_name": p_info["name"],
                    "phase_name_hi": p_info["name_hi"],
                    "phase_name_sa": p_info["name_sa"],
                    "target_elongation_deg": tgt,
                    "jd": round(t_exact, 6),
                    "timestamp_iso": format_iso_tz(dt_phase_utc, tz_str),
                    "timestamp_formatted": format_time_tz(dt_phase_utc, tz_str),
                    "illumination_pct": illumination_pct,
                    "moon_rashi": SIGNS[m_sign],
                    "moon_rashi_hi": SIGNS_DETAILED[m_sign]["name_hi"],
                    "sun_rashi": SIGNS[s_sign],
                    "sun_rashi_hi": SIGNS_DETAILED[s_sign]["name_hi"],
                    "nakshatra": NAKSHATRAS_DETAILED[nak_idx]["name_en"],
                    "nakshatra_hi": NAKSHATRAS_DETAILED[nak_idx]["name_hi"],
                })

        e_prev = e_curr
        t_curr = t_next

    phases.sort(key=lambda x: x["jd"])
    return phases


# =============================================================================
# CONJUNCTION DETECTION (Within 3.0° Sidereal Orb)
# =============================================================================

def detect_planetary_conjunctions(
    jd: float,
    max_orb_deg: float = 3.0,
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> List[Dict[str, Any]]:
    """
    Detects planetary conjunctions between any pair of the 9 Grahas within `max_orb_deg` (default 3.0°).
    Calculates exact angular separation, applying/separating status, and sign placement.
    """
    positions = []
    for g_def in GRAHAS_DEFINITION:
        positions.append(get_planet_position_at_jd(jd, g_def, ayanamsha_mode))

    conjunctions: List[Dict[str, Any]] = []

    for i in range(len(positions)):
        for j in range(i + 1, len(positions)):
            p1 = positions[i]
            p2 = positions[j]

            # Angular difference on circle
            diff = abs(p1["longitude"] - p2["longitude"])
            if diff > 180.0:
                diff = 360.0 - diff

            if diff <= max_orb_deg:
                # Check applying vs separating
                # Relative speed towards each other
                # Evaluate positions slightly in future (0.05 days = 1.2 hrs)
                future_jd = jd + 0.05
                f_p1 = get_planet_position_at_jd(future_jd, GRAHAS_DEFINITION[i], ayanamsha_mode)
                f_p2 = get_planet_position_at_jd(future_jd, GRAHAS_DEFINITION[j], ayanamsha_mode)
                future_diff = abs(f_p1["longitude"] - f_p2["longitude"])
                if future_diff > 180.0:
                    future_diff = 360.0 - future_diff

                is_applying = future_diff < diff

                deg_int = int(diff)
                min_int = int((diff - deg_int) * 60.0)

                conjunctions.append({
                    "graha1": p1["name"],
                    "graha1_hi": p1["name_hi"],
                    "graha2": p2["name"],
                    "graha2_hi": p2["name_hi"],
                    "orb_deg": round(diff, 4),
                    "orb_formatted": f"{deg_int:02d}° {min_int:02d}'",
                    "is_exact": diff < 0.5,
                    "is_applying": is_applying,
                    "status": "Applying" if is_applying else "Separating",
                    "status_hi": "समीपस्थ (Applying)" if is_applying else "पृथकगामी (Separating)",
                    "sign_index": p1["sign_index"],
                    "sign_name": p1["sign_name_en"],
                    "sign_name_hi": p1["sign_name_hi"],
                })

    conjunctions.sort(key=lambda x: x["orb_deg"])
    return conjunctions


# =============================================================================
# MONTHLY TRANSITS COMPOSITE SERVICE
# =============================================================================

def calculate_monthly_transits(
    year: int,
    month: int,
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Computes complete monthly transit overview:
    - 9 Graha Gochar positions at month reference midpoint.
    - All sign ingress events during the month with exact timestamps.
    - Direct and retrograde station turning points.
    - Lunar phase events: Amavasya, Purnima, First/Third Quarters with illumination %.
    - Active planetary conjunctions within 3° orb.
    """
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)

    start_dt = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=timezone.utc)
    end_dt = datetime(end_date.year, end_date.month, end_date.day, 0, 0, 0, tzinfo=timezone.utc)

    start_jd = datetime_to_jd_utc(start_dt)
    end_jd = datetime_to_jd_utc(end_dt)
    mid_jd = 0.5 * (start_jd + end_jd)

    # 1. Planetary positions at midpoint of month
    live_positions = {}
    for g_def in GRAHAS_DEFINITION:
        live_positions[g_def["id"]] = get_planet_position_at_jd(mid_jd, g_def, ayanamsha_mode)

    # 2. Ingress & Egress events
    ingresses = find_planetary_ingresses(start_jd, end_jd, tz_str, ayanamsha_mode)

    # 3. Retrograde / Direct stations
    stations = find_planetary_stations(start_jd, end_jd, tz_str, ayanamsha_mode)

    # 4. Lunar Phases
    lunar_phases = find_monthly_lunar_phases(start_jd, end_jd, tz_str, ayanamsha_mode)

    # 5. Conjunctions within 3° orb
    conjunctions = detect_planetary_conjunctions(mid_jd, max_orb_deg=3.0, ayanamsha_mode=ayanamsha_mode)

    # Summary highlights
    highlights = []
    if stations:
        for st in stations:
            highlights.append(f"{st['planet']} turns {st['station_type']} on {st['timestamp_formatted']}.")
    for ing in ingresses:
        if ing["planet"] in ["Sun", "Mars", "Jupiter", "Saturn"]:
            highlights.append(f"{ing['planet']} enters {ing['to_sign_name']} on {ing['timestamp_formatted']}.")
    for conj in conjunctions:
        highlights.append(f"{conj['graha1']}-{conj['graha2']} Conjunction in {conj['sign_name']} (orb: {conj['orb_formatted']}).")

    return {
        "year": year,
        "month": month,
        "month_name": start_date.strftime("%B"),
        "reference_jd": round(mid_jd, 6),
        "reference_timestamp_iso": format_iso_tz(jd_to_datetime_utc(mid_jd), tz_str),
        "planets": live_positions,
        "ingresses": ingresses,
        "stations": stations,
        "lunar_phases": lunar_phases,
        "conjunctions": conjunctions,
        "highlights": highlights,
    }
