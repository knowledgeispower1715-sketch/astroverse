"""
AstroVerse High-Precision Vedic Panchang, Celestial Ephemeris & Muhurta Engine
==============================================================================
Provides mathematically rigorous, deterministic Panchang calculations using Swiss
Ephemeris (swisseph) in Sidereal Lahiri (Chitrapaksha) mode (swe.SIDM_LAHIRI).

Key Modules & Methodologies:
1. Newton-Raphson Transition Solvers:
   Computes exact sub-second start and end transition timestamps and percentage
   elapsed for:
   - Tithi: Angular difference (Moon - Sun) in 12° intervals (0°..360°)
   - Nakshatra: Moon sidereal longitude in 13°20' intervals (27 Nakshatras & 108 Padas)
   - Yoga: Combined sidereal longitude (Sun + Moon) in 13°20' intervals (27 Yogas)
   - Karana: Half-tithi intervals of 6° (7 repeating movable + 4 fixed)
   - Moon Rashi Ingress & Egress: Moon sidereal longitude in 30° zodiac signs
2. Celestial Timings:
   - Topocentric Sunrise, Sunset & Next Sunrise using swe.rise_trans with elevation dip
   - Exact Solar Noon via meridian transit (swe.CALC_MTRANSIT), eliminating midpoint errors
   - Topocentric Moonrise & Moonset, handling days without moonrise/moonset
   - Day Duration & Night Duration (seconds, hours, formatted)
   - Moon phase illumination fraction & phase classification (swe.pheno_ut)
3. Classical Proportional Muhurtas (Surya Siddhanta 15-fold Diurnal/Nocturnal Divisions):
   - Brahma Muhurta: 14th nocturnal Muhurta [T_rise - 2*(T_night/15), T_rise - 1*(T_night/15)]
   - Abhijit Muhurta: 8th diurnal Muhurta [T_rise + 7*(T_day/15), T_rise + 8*(T_day/15)]
   - Rahu Kaal, Yamaganda, Gulika Kalam: Classical 8-fold daytime planetary divisions
   - Durmuhurta: Weekday-specific inauspicious 15-fold diurnal Muhurtas
   - Amrit Kaal & Varjyam: Authentic Nakshatra-based starting Ghatika calculations
   - Day and Night Choghadiya: 8-part daytime and 8-part nighttime sequences
4. Lunar Month & Samvat Conventions:
   - Amanta (mukhya / new moon ending) & Purnimanta (gauna / full moon ending)
   - Solar Sankranti tracking between conjunctions
   - Adhika Masa (intercalary month) & Kshaya Masa (suppressed month) detection
   - Shaka Samvat (National Indian Calendar, starts Chaitra Sukladi)
   - Vikram Samvat: Chaitradi (North Indian) & Kartikadi (Gujarati/Western Indian)
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, date, timedelta, timezone
import math

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

import swisseph as swe

# Import detailed registries from astrology_settings
from astrology_settings import (
    SIGNS,
    NAKSHATRAS,
    SIGNS_DETAILED,
    NAKSHATRAS_DETAILED,
    TITHIS_DETAILED,
    YOGAS_DETAILED,
    KARANAS_DETAILED,
    LUNAR_MONTHS,
    WEEKDAYS_DETAILED,
    CHOGHADIYA_TYPES,
    VARJYAM_START_GHATIKAS,
    AYANAMSHA_SWISSEPH_MODE,
)

# Preserve legacy collections for complete backward compatibility
NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
]

YOGAS = [item["name_en"] for item in YOGAS_DETAILED]
TITHIS = [item["name_en"] for item in TITHIS_DETAILED]
KARANAS = [item["name_en"] for item in KARANAS_DETAILED if not item["is_fixed"]]

WEEKDAY_LORDS = {
    0: "Moon", 1: "Mars", 2: "Mercury", 3: "Jupiter", 4: "Venus", 5: "Saturn", 6: "Sun"
}

# 8-fold daylight parts (1-indexed)
RAHU_KAAL_PARTS = {0: 2, 1: 7, 2: 5, 3: 6, 4: 4, 5: 3, 6: 8}
YAMAGANDA_PARTS = {0: 4, 1: 3, 2: 2, 3: 1, 4: 7, 5: 6, 6: 5}
GULIKA_KAAL_PARTS = {0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 7}

CHALDEAN_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]

# Safe alias for Swiss Ephemeris Meridian Transit
CALC_MTRANSIT = getattr(swe, "CALC_MTRANSIT", getattr(swe, "CALC_MTRANS", 4))

# Weekday-specific Durmuhurta 15-fold day Muhurta numbers (1-indexed)
DURMUHURTA_PARTS = {
    0: [8, 12],     # Monday
    1: [4, 11],     # Tuesday
    2: [8],         # Wednesday (coincides with Abhijit)
    3: [6, 13],     # Thursday
    4: [4, 9],      # Friday
    5: [2, 3],      # Saturday
    6: [14],        # Sunday
}

# Day Choghadiya Sequences by Weekday (0=Mon, 1=Tue, ..., 6=Sun)
DAY_CHOGHADIYA_SEQUENCES = {
    0: ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit"],
    1: ["Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog"],
    2: ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh"],
    3: ["Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh"],
    4: ["Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char"],
    5: ["Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal"],
    6: ["Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"],
}

# Night Choghadiya Sequences by Weekday (0=Mon, 1=Tue, ..., 6=Sun)
NIGHT_CHOGHADIYA_SEQUENCES = {
    0: ["Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char"],
    1: ["Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal"],
    2: ["Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg"],
    3: ["Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit"],
    4: ["Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog"],
    5: ["Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh"],
    6: ["Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh"],
}


# =============================================================================
# TIME & JULIAN DAY CONVERSION UTILITIES
# =============================================================================

def jd_to_datetime_utc(jd: float) -> datetime:
    """Converts a Julian Day number to a timezone-aware UTC datetime."""
    y, m, d, h_frac = swe.revjul(jd, swe.GREG_CAL)
    h = int(h_frac)
    mins_frac = (h_frac - h) * 60.0
    mins = int(mins_frac)
    secs_frac = (mins_frac - mins) * 60.0
    secs = int(secs_frac)
    microsecs = int(round((secs_frac - secs) * 1_000_000))
    if microsecs >= 1_000_000:
        microsecs = 999_999
    return datetime(y, m, d, h, mins, secs, microsecs, tzinfo=timezone.utc)

def datetime_to_jd_utc(dt: datetime) -> float:
    """Converts any datetime to Julian Day in UT."""
    if dt.tzinfo is not None:
        dt_utc = dt.astimezone(timezone.utc)
    else:
        dt_utc = dt.replace(tzinfo=timezone.utc)
    h_frac = dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0 + dt_utc.microsecond / 3.6e9
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, h_frac, swe.GREG_CAL)

def format_time_tz(dt_utc: datetime, tz_str: str) -> str:
    """Formats UTC datetime into localized 12-hour AM/PM string."""
    if ZoneInfo:
        try:
            local_dt = dt_utc.astimezone(ZoneInfo(tz_str))
            return local_dt.strftime("%I:%M %p")
        except Exception:
            pass
    # Fallback: +5:30 IST
    local_dt = dt_utc + timedelta(hours=5, minutes=30)
    return local_dt.strftime("%I:%M %p")

def format_iso_tz(dt_utc: datetime, tz_str: str) -> str:
    """Formats UTC datetime into localized ISO 8601 string."""
    if ZoneInfo:
        try:
            local_dt = dt_utc.astimezone(ZoneInfo(tz_str))
            return local_dt.isoformat()
        except Exception:
            pass
    local_dt = dt_utc + timedelta(hours=5, minutes=30)
    return local_dt.isoformat()

def format_duration(seconds: float) -> str:
    """Formats duration in seconds into 'HHh MMm SSs' string."""
    total_sec = int(round(seconds))
    h = total_sec // 3600
    m = (total_sec % 3600) // 60
    s = total_sec % 60
    return f"{h:02d}h {m:02d}m {s:02d}s"


# =============================================================================
# CELESTIAL TIMINGS ENGINE: SUNRISE, SUNSET, MOONRISE, MOONSET, SOLAR NOON
# =============================================================================

def calculate_sun_rise_set(
    jd_base: float,
    lat: float,
    lon: float,
    altitude_m: float = 0.0
) -> Tuple[float, float, float]:
    """
    Computes exact topocentric sunrise, sunset, and next sunrise using Swiss Ephemeris.
    Maintains exact legacy 3-tuple return signature for backward compatibility.
    """
    geopos = (lon, lat, float(altitude_m))
    res_rise, tret_rise = swe.rise_trans(jd_base, swe.SUN, swe.CALC_RISE, geopos)
    res_set, tret_set = swe.rise_trans(tret_rise[0], swe.SUN, swe.CALC_SET, geopos)
    res_next_rise, tret_next = swe.rise_trans(tret_set[0], swe.SUN, swe.CALC_RISE, geopos)
    return tret_rise[0], tret_set[0], tret_next[0]

def calculate_sun_times_elevated(
    jd_midnight_ut: float,
    lat: float,
    lon: float,
    altitude_m: float = 0.0
) -> Tuple[float, float, float, float, bool]:
    """
    Calculates topocentric Sunrise, Sunset, Next Sunrise, and exact Solar Noon
    via meridian transit (swe.CALC_MTRANSIT) with elevation dip.
    Returns: (jd_rise, jd_set, jd_next_rise, jd_solar_noon, is_polar_fallback)
    """
    geopos = (lon, lat, float(altitude_m))
    res_rise, tret_rise = swe.rise_trans(jd_midnight_ut, swe.SUN, swe.CALC_RISE, geopos)
    res_set, tret_set = swe.rise_trans(jd_midnight_ut, swe.SUN, swe.CALC_SET, geopos)

    if res_rise != 0 or res_set != 0:
        # Polar or extreme latitude fallback where sun does not rise/set normally
        jd_rise = jd_midnight_ut + 0.25  # ~06:00
        jd_set = jd_midnight_ut + 0.75   # ~18:00
        jd_next_rise = jd_rise + 1.0
        jd_noon = jd_midnight_ut + 0.5   # ~12:00
        return jd_rise, jd_set, jd_next_rise, jd_noon, True

    jd_rise_val = tret_rise[0]
    res_set_actual, tret_set_actual = swe.rise_trans(jd_rise_val, swe.SUN, swe.CALC_SET, geopos)
    jd_set_val = tret_set_actual[0] if res_set_actual == 0 else tret_set[0]

    res_next_rise, tret_next = swe.rise_trans(jd_set_val, swe.SUN, swe.CALC_RISE, geopos)
    jd_next_rise_val = tret_next[0] if res_next_rise == 0 else (jd_rise_val + 1.0)

    # Solar Noon via Meridian Transit (swe.CALC_MTRANSIT)
    res_noon, tret_noon = swe.rise_trans(jd_midnight_ut, swe.SUN, CALC_MTRANSIT, geopos)
    if res_noon == 0:
        jd_noon_val = tret_noon[0]
    else:
        # Fallback to midpoint if meridian transit search fails
        jd_noon_val = jd_rise_val + (jd_set_val - jd_rise_val) / 2.0

    return jd_rise_val, jd_set_val, jd_next_rise_val, jd_noon_val, False

def calculate_moon_rise_set(
    jd_midnight_ut: float,
    lat: float,
    lon: float,
    altitude_m: float = 0.0
) -> Tuple[Optional[float], Optional[float]]:
    """
    Calculates topocentric Moonrise and Moonset for the local 24-hour day
    starting at jd_midnight_ut. Handles days where the Moon does not rise
    or does not set due to lunar daily lag.
    """
    geopos = (lon, lat, float(altitude_m))
    res_rise, tret_rise = swe.rise_trans(jd_midnight_ut, swe.MOON, swe.CALC_RISE, geopos)
    res_set, tret_set = swe.rise_trans(jd_midnight_ut, swe.MOON, swe.CALC_SET, geopos)

    jd_moonrise = None
    if res_rise == 0:
        if jd_midnight_ut <= tret_rise[0] < jd_midnight_ut + 1.0:
            jd_moonrise = tret_rise[0]

    jd_moonset = None
    if res_set == 0:
        if jd_midnight_ut <= tret_set[0] < jd_midnight_ut + 1.0:
            jd_moonset = tret_set[0]

    return jd_moonrise, jd_moonset

def calculate_celestial_timings(
    target_date: date,
    lat: float,
    lon: float,
    altitude_m: float = 0.0,
    tz_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Comprehensive celestial calculation for a given date and location:
    Sunrise, Sunset, Moonrise, Moonset, Solar Noon, Day & Night Duration, Moon Phase.
    """
    if ZoneInfo:
        try:
            tz = ZoneInfo(tz_str)
        except Exception:
            tz = timezone(timedelta(hours=5, minutes=30))
    else:
        tz = timezone(timedelta(hours=5, minutes=30))

    # Local midnight UT
    dummy_dt = datetime(target_date.year, target_date.month, target_date.day, 12, 0, tzinfo=tz)
    offset_hours = dummy_dt.utcoffset().total_seconds() / 3600.0
    jd_midnight_ut = swe.julday(
        target_date.year, target_date.month, target_date.day,
        0.0 - offset_hours,
        swe.GREG_CAL
    )

    jd_rise, jd_set, jd_next_rise, jd_noon, is_polar = calculate_sun_times_elevated(
        jd_midnight_ut, lat, lon, altitude_m
    )
    jd_moonrise, jd_moonset = calculate_moon_rise_set(
        jd_midnight_ut, lat, lon, altitude_m
    )

    dt_rise = jd_to_datetime_utc(jd_rise)
    dt_set = jd_to_datetime_utc(jd_set)
    dt_next_rise = jd_to_datetime_utc(jd_next_rise)
    dt_noon = jd_to_datetime_utc(jd_noon)

    day_duration_sec = (dt_set - dt_rise).total_seconds()
    night_duration_sec = (dt_next_rise - dt_set).total_seconds()

    # Moon Phase & Illumination at Noon UTC
    noon_jd = swe.julday(target_date.year, target_date.month, target_date.day, 12.0)
    pheno = swe.pheno_ut(noon_jd, swe.MOON)
    illumination_frac = float(pheno[1])

    m_pos, _ = swe.calc_ut(noon_jd, swe.MOON, swe.FLG_SWIEPH if False else swe.FLG_MOSEPH)
    s_pos, _ = swe.calc_ut(noon_jd, swe.SUN, swe.FLG_SWIEPH if False else swe.FLG_MOSEPH)
    elongation = (m_pos[0] - s_pos[0]) % 360.0
    is_waxing = elongation < 180.0

    if illumination_frac < 0.02:
        phase_name = "New Moon (Amavasya)"
    elif illumination_frac > 0.98:
        phase_name = "Full Moon (Purnima)"
    elif is_waxing:
        if 0.45 <= illumination_frac <= 0.55:
            phase_name = "First Quarter"
        elif illumination_frac < 0.50:
            phase_name = "Waxing Crescent"
        else:
            phase_name = "Waxing Gibbous"
    else:
        if 0.45 <= illumination_frac <= 0.55:
            phase_name = "Third Quarter"
        elif illumination_frac > 0.50:
            phase_name = "Waning Gibbous"
        else:
            phase_name = "Waning Crescent"

    return {
        "date": target_date.isoformat(),
        "sunrise_iso": format_iso_tz(dt_rise, tz_str),
        "sunset_iso": format_iso_tz(dt_set, tz_str),
        "next_sunrise_iso": format_iso_tz(dt_next_rise, tz_str),
        "solar_noon_iso": format_iso_tz(dt_noon, tz_str),
        "sunrise_formatted": format_time_tz(dt_rise, tz_str),
        "sunset_formatted": format_time_tz(dt_set, tz_str),
        "solar_noon_formatted": format_time_tz(dt_noon, tz_str),
        "moonrise_iso": format_iso_tz(jd_to_datetime_utc(jd_moonrise), tz_str) if jd_moonrise else None,
        "moonset_iso": format_iso_tz(jd_to_datetime_utc(jd_moonset), tz_str) if jd_moonset else None,
        "moonrise_formatted": format_time_tz(jd_to_datetime_utc(jd_moonrise), tz_str) if jd_moonrise else "No Moonrise",
        "moonset_formatted": format_time_tz(jd_to_datetime_utc(jd_moonset), tz_str) if jd_moonset else "No Moonset",
        "day_duration_sec": day_duration_sec,
        "day_hours": round(day_duration_sec / 3600.0, 4),
        "day_duration_formatted": format_duration(day_duration_sec),
        "night_duration_sec": night_duration_sec,
        "night_hours": round(night_duration_sec / 3600.0, 4),
        "night_duration_formatted": format_duration(night_duration_sec),
        "moon_phase": {
            "name": phase_name,
            "illumination_pct": round(illumination_frac * 100.0, 2),
            "is_waxing": is_waxing,
            "elongation_deg": round(elongation, 2)
        },
        "is_polar_fallback": is_polar,
        "jd_rise": jd_rise,
        "jd_set": jd_set,
        "jd_next_rise": jd_next_rise,
        "jd_noon": jd_noon
    }


# =============================================================================
# MATHEMATICAL ROOT-FINDING & PANCHANG TRANSITION SOLVERS
# =============================================================================

def _solve_nr_boundary(
    jd_approx: float,
    target_deg: float,
    mode: str = "tithi",
    ayanamsha_mode: int = swe.SIDM_LAHIRI,
    max_iter: int = 15,
    tolerance_deg: float = 1e-6
) -> float:
    """
    Newton-Raphson boundary solver for celestial transitions.
    mode:
      - 'tithi': (Moon - Sun) = target_deg (derivative = omega_Moon - omega_Sun)
      - 'nakshatra': Moon = target_deg (derivative = omega_Moon)
      - 'yoga': (Sun + Moon) = target_deg (derivative = omega_Sun + omega_Moon)
      - 'karana': (Moon - Sun) = target_deg (derivative = omega_Moon - omega_Sun)
      - 'rashi': Moon = target_deg (derivative = omega_Moon)
    """
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    jd = jd_approx
    for _ in range(max_iter):
        m_res, _ = swe.calc_ut(jd, swe.MOON, flag)
        s_res, _ = swe.calc_ut(jd, swe.SUN, flag)

        if mode in ("tithi", "karana"):
            cur_deg = (m_res[0] - s_res[0]) % 360.0
            speed = m_res[3] - s_res[3]
        elif mode == "yoga":
            cur_deg = (s_res[0] + m_res[0]) % 360.0
            speed = s_res[3] + m_res[3]
        else:  # 'nakshatra', 'rashi'
            cur_deg = m_res[0] % 360.0
            speed = m_res[3]

        err = (cur_deg - target_deg + 180.0) % 360.0 - 180.0
        if abs(err) < tolerance_deg:
            return jd

        if abs(speed) < 1e-4:
            # Fallback to analytical bisection step if speed is near zero
            speed = 12.0 if mode in ("tithi", "karana") else 13.0

        jd -= err / speed

    return jd

def solve_tithi_boundary(
    jd_ref: float,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Solves current Tithi, exact start instant, end instant, next tithi,
    and percentage elapsed at jd_ref using Newton-Raphson.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    m, _ = swe.calc_ut(jd_ref, swe.MOON, flag)
    s, _ = swe.calc_ut(jd_ref, swe.SUN, flag)
    diff = (m[0] - s[0]) % 360.0
    tithi_idx = int(diff / 12.0) % 30

    start_target = tithi_idx * 12.0
    end_target = (tithi_idx + 1) * 12.0

    jd_start = _solve_nr_boundary(jd_ref, start_target, mode="tithi", ayanamsha_mode=ayanamsha_mode)
    jd_end = _solve_nr_boundary(jd_ref, end_target, mode="tithi", ayanamsha_mode=ayanamsha_mode)

    # Percentage elapsed
    total_span = max(1e-5, jd_end - jd_start)
    elapsed_pct = min(100.0, max(0.0, ((jd_ref - jd_start) / total_span) * 100.0))

    t_detail = TITHIS_DETAILED[tithi_idx]
    next_idx = (tithi_idx + 1) % 30
    next_detail = TITHIS_DETAILED[next_idx]

    dt_start = jd_to_datetime_utc(jd_start)
    dt_end = jd_to_datetime_utc(jd_end)

    return {
        "index": tithi_idx,
        "number": tithi_idx + 1,
        "name": t_detail["name_en"],
        "name_en": t_detail["name_en"],
        "name_hi": t_detail["name_hi"],
        "name_sa": t_detail["name_sa"],
        "paksha": "Shukla Paksha (Waxing)" if tithi_idx < 15 else "Krishna Paksha (Waning)",
        "paksha_code": t_detail["paksha"],
        "tithi_day_in_paksha": (tithi_idx % 15) + 1,
        "start_jd": jd_start,
        "end_jd": jd_end,
        "start_time_iso": format_iso_tz(dt_start, tz_str),
        "end_time_iso": format_iso_tz(dt_end, tz_str),
        "start_time_formatted": format_time_tz(dt_start, tz_str),
        "end_time_formatted": format_time_tz(dt_end, tz_str),
        "elapsed_percentage": round(elapsed_pct, 2),
        "next_tithi": {
            "index": next_idx,
            "number": next_idx + 1,
            "name_en": next_detail["name_en"],
            "name_hi": next_detail["name_hi"],
            "name_sa": next_detail["name_sa"],
        }
    }

def solve_nakshatra_boundary(
    jd_ref: float,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Solves current Nakshatra, Pada, exact start instant, end instant,
    and percentage elapsed at jd_ref using Newton-Raphson.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    m, _ = swe.calc_ut(jd_ref, swe.MOON, flag)
    span = 360.0 / 27.0
    nak_idx = int(m[0] / span) % 27

    start_target = nak_idx * span
    end_target = (nak_idx + 1) * span

    jd_start = _solve_nr_boundary(jd_ref, start_target, mode="nakshatra", ayanamsha_mode=ayanamsha_mode)
    jd_end = _solve_nr_boundary(jd_ref, end_target, mode="nakshatra", ayanamsha_mode=ayanamsha_mode)

    total_span = max(1e-5, jd_end - jd_start)
    elapsed_pct = min(100.0, max(0.0, ((jd_ref - jd_start) / total_span) * 100.0))

    deg_in_nak = m[0] % span
    pada = int(deg_in_nak / (span / 4.0)) + 1

    n_detail = NAKSHATRAS_DETAILED[nak_idx]
    next_idx = (nak_idx + 1) % 27
    next_detail = NAKSHATRAS_DETAILED[next_idx]

    dt_start = jd_to_datetime_utc(jd_start)
    dt_end = jd_to_datetime_utc(jd_end)

    return {
        "index": nak_idx,
        "number": nak_idx + 1,
        "name": n_detail["name_en"],
        "name_en": n_detail["name_en"],
        "name_hi": n_detail["name_hi"],
        "name_sa": n_detail["name_sa"],
        "pada": pada,
        "lord": n_detail["lord"],
        "deity": n_detail["deity"],
        "degree_in_nakshatra": round(deg_in_nak, 2),
        "start_jd": jd_start,
        "end_jd": jd_end,
        "start_time_iso": format_iso_tz(dt_start, tz_str),
        "end_time_iso": format_iso_tz(dt_end, tz_str),
        "start_time_formatted": format_time_tz(dt_start, tz_str),
        "end_time_formatted": format_time_tz(dt_end, tz_str),
        "elapsed_percentage": round(elapsed_pct, 2),
        "next_nakshatra": {
            "index": next_idx,
            "number": next_idx + 1,
            "name_en": next_detail["name_en"],
            "name_hi": next_detail["name_hi"],
            "name_sa": next_detail["name_sa"],
            "lord": next_detail["lord"]
        }
    }

def solve_yoga_boundary(
    jd_ref: float,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Solves current Yoga, exact start instant, end instant, and percentage elapsed.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    m, _ = swe.calc_ut(jd_ref, swe.MOON, flag)
    s, _ = swe.calc_ut(jd_ref, swe.SUN, flag)
    yoga_span = 360.0 / 27.0
    tot = (s[0] + m[0]) % 360.0
    yoga_idx = int(tot / yoga_span) % 27

    start_target = yoga_idx * yoga_span
    end_target = (yoga_idx + 1) * yoga_span

    jd_start = _solve_nr_boundary(jd_ref, start_target, mode="yoga", ayanamsha_mode=ayanamsha_mode)
    jd_end = _solve_nr_boundary(jd_ref, end_target, mode="yoga", ayanamsha_mode=ayanamsha_mode)

    total_span = max(1e-5, jd_end - jd_start)
    elapsed_pct = min(100.0, max(0.0, ((jd_ref - jd_start) / total_span) * 100.0))

    y_detail = YOGAS_DETAILED[yoga_idx]
    next_idx = (yoga_idx + 1) % 27
    next_detail = YOGAS_DETAILED[next_idx]

    dt_start = jd_to_datetime_utc(jd_start)
    dt_end = jd_to_datetime_utc(jd_end)

    return {
        "index": yoga_idx,
        "number": yoga_idx + 1,
        "name": y_detail["name_en"],
        "name_en": y_detail["name_en"],
        "name_hi": y_detail["name_hi"],
        "name_sa": y_detail["name_sa"],
        "nature": y_detail["nature"],
        "start_jd": jd_start,
        "end_jd": jd_end,
        "start_time_iso": format_iso_tz(dt_start, tz_str),
        "end_time_iso": format_iso_tz(dt_end, tz_str),
        "start_time_formatted": format_time_tz(dt_start, tz_str),
        "end_time_formatted": format_time_tz(dt_end, tz_str),
        "elapsed_percentage": round(elapsed_pct, 2),
        "next_yoga": {
            "index": next_idx,
            "number": next_idx + 1,
            "name_en": next_detail["name_en"],
            "name_hi": next_detail["name_hi"],
            "name_sa": next_detail["name_sa"],
        }
    }

def solve_karana_boundary(
    jd_ref: float,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Solves current Karana (half-tithi 6°), exact start instant, end instant,
    and properly maps the 7 repeating movable + 4 fixed Karanas.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    m, _ = swe.calc_ut(jd_ref, swe.MOON, flag)
    s, _ = swe.calc_ut(jd_ref, swe.SUN, flag)
    diff = (m[0] - s[0]) % 360.0
    karana_num = int(diff / 6.0) % 60

    start_target = karana_num * 6.0
    end_target = (karana_num + 1) * 6.0

    jd_start = _solve_nr_boundary(jd_ref, start_target, mode="karana", ayanamsha_mode=ayanamsha_mode)
    jd_end = _solve_nr_boundary(jd_ref, end_target, mode="karana", ayanamsha_mode=ayanamsha_mode)

    total_span = max(1e-5, jd_end - jd_start)
    elapsed_pct = min(100.0, max(0.0, ((jd_ref - jd_start) / total_span) * 100.0))

    def _get_karana_detail(k_num: int) -> Dict[str, Any]:
        if k_num == 0:
            return KARANAS_DETAILED[10]  # Kintughna (fixed)
        elif k_num == 57:
            return KARANAS_DETAILED[7]   # Shakuni (fixed)
        elif k_num == 58:
            return KARANAS_DETAILED[8]   # Chatushpada (fixed)
        elif k_num == 59:
            return KARANAS_DETAILED[9]   # Naga (fixed)
        else:
            movable_idx = (k_num - 1) % 7
            return KARANAS_DETAILED[movable_idx]

    k_detail = _get_karana_detail(karana_num)
    next_num = (karana_num + 1) % 60
    next_detail = _get_karana_detail(next_num)

    dt_start = jd_to_datetime_utc(jd_start)
    dt_end = jd_to_datetime_utc(jd_end)

    return {
        "index": karana_num,
        "number": karana_num + 1,
        "name": k_detail["name_en"],
        "name_en": k_detail["name_en"],
        "name_hi": k_detail["name_hi"],
        "name_sa": k_detail["name_sa"],
        "is_fixed": k_detail["is_fixed"],
        "lord": k_detail["lord"],
        "start_jd": jd_start,
        "end_jd": jd_end,
        "start_time_iso": format_iso_tz(dt_start, tz_str),
        "end_time_iso": format_iso_tz(dt_end, tz_str),
        "start_time_formatted": format_time_tz(dt_start, tz_str),
        "end_time_formatted": format_time_tz(dt_end, tz_str),
        "elapsed_percentage": round(elapsed_pct, 2),
        "next_karana": {
            "index": next_num,
            "number": next_num + 1,
            "name_en": next_detail["name_en"],
            "name_hi": next_detail["name_hi"],
            "name_sa": next_detail["name_sa"],
            "is_fixed": next_detail["is_fixed"]
        }
    }

def solve_moon_rashi_boundary(
    jd_ref: float,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Solves Moon's current sidereal Rashi, ingress timestamp, egress timestamp,
    and degree occupied inside the sign.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    m, _ = swe.calc_ut(jd_ref, swe.MOON, flag)
    rashi_idx = int(m[0] / 30.0) % 12
    deg_in_rashi = m[0] % 30.0

    start_target = rashi_idx * 30.0
    end_target = (rashi_idx + 1) * 30.0

    jd_ingress = _solve_nr_boundary(jd_ref, start_target, mode="rashi", ayanamsha_mode=ayanamsha_mode)
    jd_egress = _solve_nr_boundary(jd_ref, end_target, mode="rashi", ayanamsha_mode=ayanamsha_mode)

    total_span = max(1e-5, jd_egress - jd_ingress)
    elapsed_pct = min(100.0, max(0.0, ((jd_ref - jd_ingress) / total_span) * 100.0))

    r_detail = SIGNS_DETAILED[rashi_idx]
    next_idx = (rashi_idx + 1) % 12
    next_detail = SIGNS_DETAILED[next_idx]

    dt_ingress = jd_to_datetime_utc(jd_ingress)
    dt_egress = jd_to_datetime_utc(jd_egress)

    return {
        "index": rashi_idx,
        "rashi": r_detail["name_en"],
        "rashi_en": r_detail["name_en"],
        "rashi_hi": r_detail["name_hi"],
        "rashi_sa": r_detail["name_sa"],
        "lord": r_detail["lord"],
        "element": r_detail["element"],
        "degree_in_rashi": round(deg_in_rashi, 4),
        "sidereal_longitude": round(m[0], 4),
        "ingress_jd": jd_ingress,
        "egress_jd": jd_egress,
        "ingress_time_iso": format_iso_tz(dt_ingress, tz_str),
        "egress_time_iso": format_iso_tz(dt_egress, tz_str),
        "ingress_time_formatted": format_time_tz(dt_ingress, tz_str),
        "egress_time_formatted": format_time_tz(dt_egress, tz_str),
        "elapsed_percentage": round(elapsed_pct, 2),
        "next_rashi": {
            "index": next_idx,
            "rashi_en": next_detail["name_en"],
            "rashi_hi": next_detail["name_hi"],
            "rashi_sa": next_detail["name_sa"],
            "lord": next_detail["lord"]
        }
    }


# =============================================================================
# LUNAR MONTH, ADHIKA MASA & SAMVAT CONVENTIONS ENGINE
# =============================================================================

def find_new_moon_before(jd_ref: float, ayanamsha_mode: int = swe.SIDM_LAHIRI) -> float:
    """Finds the instant of the New Moon immediately preceding or at jd_ref."""
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    m, _ = swe.calc_ut(jd_ref, swe.MOON, flag)
    s, _ = swe.calc_ut(jd_ref, swe.SUN, flag)
    diff = (m[0] - s[0]) % 360.0
    approx_jd = jd_ref - (diff / 12.19)
    jd = approx_jd

    for _ in range(15):
        m, _ = swe.calc_ut(jd, swe.MOON, flag)
        s, _ = swe.calc_ut(jd, swe.SUN, flag)
        err = (m[0] - s[0] + 180.0) % 360.0 - 180.0
        speed = m[3] - s[3]
        if abs(err) < 1e-6:
            if jd > jd_ref + 0.0001:
                return find_new_moon_before(jd_ref - 29.53, ayanamsha_mode)
            return jd
        jd -= err / speed

    return jd

def find_new_moon_after(jd_ref: float, ayanamsha_mode: int = swe.SIDM_LAHIRI) -> float:
    """Finds the instant of the New Moon immediately following or at jd_ref."""
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    m, _ = swe.calc_ut(jd_ref, swe.MOON, flag)
    s, _ = swe.calc_ut(jd_ref, swe.SUN, flag)
    diff = (m[0] - s[0]) % 360.0
    approx_jd = jd_ref + ((360.0 - diff) / 12.19)
    jd = approx_jd

    for _ in range(15):
        m, _ = swe.calc_ut(jd, swe.MOON, flag)
        s, _ = swe.calc_ut(jd, swe.SUN, flag)
        err = (m[0] - s[0] + 180.0) % 360.0 - 180.0
        speed = m[3] - s[3]
        if abs(err) < 1e-6:
            if jd < jd_ref - 0.0001:
                return find_new_moon_after(jd_ref + 29.53, ayanamsha_mode)
            return jd
        jd -= err / speed

    return jd

def calculate_lunar_month_and_samvat(
    jd_ref: float,
    target_date: date,
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Computes Amanta and Purnimanta month designations, Adhika/Kshaya masa,
    and Shaka & Vikram Samvats (Chaitradi and Kartikadi).
    """
    swe.set_sid_mode(ayanamsha_mode)
    flag = swe.FLG_SIDEREAL | swe.FLG_SPEED

    nm_prev = find_new_moon_before(jd_ref, ayanamsha_mode)
    nm_next = find_new_moon_after(jd_ref, ayanamsha_mode)

    s_prev, _ = swe.calc_ut(nm_prev, swe.SUN, flag)
    s_next, _ = swe.calc_ut(nm_next, swe.SUN, flag)

    r_prev = int(s_prev[0] / 30.0) % 12
    r_next = int(s_next[0] / 30.0) % 12

    # Check for Adhika and Kshaya Masa
    is_adhika = (r_prev == r_next)
    is_kshaya = ((r_next - r_prev) % 12 == 2)

    if is_adhika:
        month_idx = (r_prev + 1) % 12
    else:
        month_idx = r_next

    m_detail = LUNAR_MONTHS[month_idx]
    amanta_name_en = f"Adhika {m_detail['name_en']}" if is_adhika else m_detail["name_en"]
    amanta_name_hi = f"अधिक {m_detail['name_hi']}" if is_adhika else m_detail["name_hi"]
    amanta_name_sa = f"Adhika {m_detail['name_sa']}" if is_adhika else m_detail["name_sa"]

    # Determine Paksha
    m_now, _ = swe.calc_ut(jd_ref, swe.MOON, flag)
    s_now, _ = swe.calc_ut(jd_ref, swe.SUN, flag)
    diff = (m_now[0] - s_now[0]) % 360.0
    is_shukla = diff < 180.0
    paksha_str = "Shukla" if is_shukla else "Krishna"

    # Purnimanta convention:
    # During Adhika Masa, both Shukla and Krishna Pakshas belong to the Adhika month.
    # During Shukla Paksha of normal months, Purnimanta month name is identical to Amanta month.
    # During Krishna Paksha of normal months, Purnimanta month belongs to the NEXT month's name.
    if is_adhika:
        purnimanta_name_en = amanta_name_en
        purnimanta_name_hi = amanta_name_hi
        purnimanta_name_sa = amanta_name_sa
    elif is_shukla:
        purnimanta_name_en = amanta_name_en
        purnimanta_name_hi = amanta_name_hi
        purnimanta_name_sa = amanta_name_sa
    else:
        next_month_idx = (month_idx + 1) % 12
        pm_detail = LUNAR_MONTHS[next_month_idx]
        purnimanta_name_en = pm_detail["name_en"]
        purnimanta_name_hi = pm_detail["name_hi"]
        purnimanta_name_sa = pm_detail["name_sa"]

    # Samvat Calculations:
    # 1. Chaitra Sukladi: New Moon preceding Mesha Sankranti in target_date.year
    jd_mesha_approx = swe.julday(target_date.year, 4, 14, 12.0)
    jd_mesha = jd_mesha_approx
    for _ in range(10):
        s_m, _ = swe.calc_ut(jd_mesha, swe.SUN, flag)
        err_m = (s_m[0] + 180.0) % 360.0 - 180.0
        if abs(err_m) < 1e-6:
            break
        jd_mesha -= err_m / s_m[3]
    jd_chaitra_sukladi = find_new_moon_before(jd_mesha, ayanamsha_mode)

    # 2. Kartika Sukladi: New Moon preceding Vrishchika Sankranti in target_date.year
    jd_vrish_approx = swe.julday(target_date.year, 11, 16, 12.0)
    jd_vrish = jd_vrish_approx
    for _ in range(10):
        s_v, _ = swe.calc_ut(jd_vrish, swe.SUN, flag)
        err_v = (s_v[0] - 210.0 + 180.0) % 360.0 - 180.0
        if abs(err_v) < 1e-6:
            break
        jd_vrish -= err_v / s_v[3]
    jd_kartika_sukladi = find_new_moon_before(jd_vrish, ayanamsha_mode)

    # Shaka Samvat:
    # Epoch 78 CE. Changes on Chaitra Shukla Pratipada.
    if jd_ref >= jd_chaitra_sukladi:
        shaka_samvat = target_date.year - 78
    else:
        shaka_samvat = target_date.year - 79

    # Vikram Samvat (Chaitradi - North Indian):
    # Epoch 57 BCE. Changes on Chaitra Shukla Pratipada.
    if jd_ref >= jd_chaitra_sukladi:
        vikram_samvat_chaitradi = target_date.year + 57
    else:
        vikram_samvat_chaitradi = target_date.year + 56

    # Vikram Samvat (Kartikadi - Gujarati / Western Indian):
    # Epoch 57 BCE. Changes on Kartika Shukla Pratipada.
    if jd_ref >= jd_kartika_sukladi:
        vikram_samvat_kartikadi = target_date.year + 57
    else:
        vikram_samvat_kartikadi = target_date.year + 56

    return {
        "amanta_month": amanta_name_en,
        "amanta_month_hi": amanta_name_hi,
        "amanta_month_sa": amanta_name_sa,
        "purnimanta_month": purnimanta_name_en,
        "purnimanta_month_hi": purnimanta_name_hi,
        "purnimanta_month_sa": purnimanta_name_sa,
        "is_adhika": is_adhika,
        "is_kshaya": is_kshaya,
        "paksha": paksha_str,
        "shaka_samvat": shaka_samvat,
        "vikram_samvat": vikram_samvat_chaitradi,
        "vikram_samvat_chaitradi": vikram_samvat_chaitradi,
        "vikram_samvat_kartikadi": vikram_samvat_kartikadi,
        "chaitra_sukladi_jd": jd_chaitra_sukladi,
        "kartika_sukladi_jd": jd_kartika_sukladi
    }


# =============================================================================
# PROPORTIONAL CLASSICAL MUHURATS & CHOGHADIYA ENGINE
# =============================================================================

def calculate_proportional_muhurtas(
    dt_rise: datetime,
    dt_set: datetime,
    dt_next_rise: datetime,
    dt_prev_set: datetime,
    weekday_idx: int,
    tz_str: str = "Asia/Kolkata",
    nakshatra_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes authentic proportional 15-fold and 8-fold Muhurtas:
    - Brahma Muhurta: 14th nocturnal Muhurta [T_rise - 2*(T_night_prev/15), T_rise - 1*(T_night_prev/15)]
    - Abhijit Muhurta: 8th diurnal Muhurta [T_rise + 7*(T_day/15), T_rise + 8*(T_day/15)]
    - Rahu Kaal, Yamaganda, Gulika Kalam: Classical 8-fold daylight divisions
    - Durmuhurta: Weekday-specific 15-fold daylight inauspicious Muhurtas
    - Amrit Kaal & Varjyam: Computed from prevailing Nakshatra starting Ghatikas
    """
    day_duration_sec = (dt_set - dt_rise).total_seconds()
    night_prev_sec = (dt_rise - dt_prev_set).total_seconds()
    if night_prev_sec <= 0:
        night_prev_sec = 43200.0  # 12h fallback

    diurnal_muhurta_sec = day_duration_sec / 15.0
    nocturnal_muhurta_sec = night_prev_sec / 15.0

    # 1. Brahma Muhurta (14th nocturnal Muhurta)
    brahma_start = dt_rise - timedelta(seconds=2 * nocturnal_muhurta_sec)
    brahma_end = dt_rise - timedelta(seconds=1 * nocturnal_muhurta_sec)

    # 2. Abhijit Muhurta (8th diurnal Muhurta)
    abhijit_start = dt_rise + timedelta(seconds=7 * diurnal_muhurta_sec)
    abhijit_end = dt_rise + timedelta(seconds=8 * diurnal_muhurta_sec)

    # 3. 8-fold Daylight Divisions: Rahu Kaal, Yamaganda, Gulika Kaal
    part_8_sec = day_duration_sec / 8.0

    rahu_p = RAHU_KAAL_PARTS[weekday_idx]
    rahu_start = dt_rise + timedelta(seconds=(rahu_p - 1) * part_8_sec)
    rahu_end = dt_rise + timedelta(seconds=rahu_p * part_8_sec)

    yama_p = YAMAGANDA_PARTS[weekday_idx]
    yama_start = dt_rise + timedelta(seconds=(yama_p - 1) * part_8_sec)
    yama_end = dt_rise + timedelta(seconds=yama_p * part_8_sec)

    gulika_p = GULIKA_KAAL_PARTS[weekday_idx]
    gulika_start = dt_rise + timedelta(seconds=(gulika_p - 1) * part_8_sec)
    gulika_end = dt_rise + timedelta(seconds=gulika_p * part_8_sec)

    # 4. Durmuhurta Windows
    durmuhurta_windows = []
    dur_parts = DURMUHURTA_PARTS.get(weekday_idx, [])
    for p in dur_parts:
        dur_s = dt_rise + timedelta(seconds=(p - 1) * diurnal_muhurta_sec)
        dur_e = dt_rise + timedelta(seconds=p * diurnal_muhurta_sec)
        durmuhurta_windows.append({
            "muhurta_number": p,
            "start": format_time_tz(dur_s, tz_str),
            "end": format_time_tz(dur_e, tz_str),
            "start_iso": format_iso_tz(dur_s, tz_str),
            "end_iso": format_iso_tz(dur_e, tz_str),
        })

    # 5. Varjyam and Amrit Kaal
    varjyam_dict = None
    amrit_kaal_dict = None
    if nakshatra_info:
        nak_idx = nakshatra_info.get("index", 0)
        start_jd = nakshatra_info.get("start_jd")
        end_jd = nakshatra_info.get("end_jd")
        if start_jd and end_jd:
            dt_nak_start = jd_to_datetime_utc(start_jd)
            dt_nak_end = jd_to_datetime_utc(end_jd)
            nak_span_sec = (dt_nak_end - dt_nak_start).total_seconds()
            ghatika_sec = nak_span_sec / 60.0

            g_v = VARJYAM_START_GHATIKAS[nak_idx % 27]
            v_start = dt_nak_start + timedelta(seconds=g_v * ghatika_sec)
            v_end = dt_nak_start + timedelta(seconds=(g_v + 4) * ghatika_sec)

            amr_start = dt_nak_start + timedelta(seconds=(g_v + 14) * ghatika_sec)
            amr_end = dt_nak_start + timedelta(seconds=(g_v + 18) * ghatika_sec)

            varjyam_dict = {
                "start": format_time_tz(v_start, tz_str),
                "end": format_time_tz(v_end, tz_str),
                "start_iso": format_iso_tz(v_start, tz_str),
                "end_iso": format_iso_tz(v_end, tz_str),
                "guidance": "Inauspicious window within the Nakshatra; avoid critical commencement."
            }
            amrit_kaal_dict = {
                "start": format_time_tz(amr_start, tz_str),
                "end": format_time_tz(amr_end, tz_str),
                "start_iso": format_iso_tz(amr_start, tz_str),
                "end_iso": format_iso_tz(amr_end, tz_str),
                "guidance": "Nectar period; highly auspicious for important ceremonies and spiritual endeavors."
            }

    return {
        "brahma_muhurta": {
            "start": format_time_tz(brahma_start, tz_str),
            "end": format_time_tz(brahma_end, tz_str),
            "start_iso": format_iso_tz(brahma_start, tz_str),
            "end_iso": format_iso_tz(brahma_end, tz_str),
            "duration_minutes": round(nocturnal_muhurta_sec / 60.0, 1),
            "guidance": "Sacred pre-dawn window optimal for meditation, study, intellectual synthesis, and contemplation."
        },
        "abhijit_muhurta": {
            "start": format_time_tz(abhijit_start, tz_str),
            "end": format_time_tz(abhijit_end, tz_str),
            "start_iso": format_iso_tz(abhijit_start, tz_str),
            "end_iso": format_iso_tz(abhijit_end, tz_str),
            "duration_minutes": round(diurnal_muhurta_sec / 60.0, 1),
            "is_wednesday_warning": (weekday_idx == 2),
            "guidance": "Highly auspicious solar midday window that neutralizes general negative muhurta doshas."
                        + (" (Note: traditionally avoided on Wednesdays)." if weekday_idx == 2 else "")
        },
        "rahu_kaal": {
            "start": format_time_tz(rahu_start, tz_str),
            "end": format_time_tz(rahu_end, tz_str),
            "start_iso": format_iso_tz(rahu_start, tz_str),
            "end_iso": format_iso_tz(rahu_end, tz_str),
            "part_number": rahu_p,
            "guidance": "Avoid initiating high-stakes agreements, major contracts, or financial closings."
        },
        "yamaganda": {
            "start": format_time_tz(yama_start, tz_str),
            "end": format_time_tz(yama_end, tz_str),
            "start_iso": format_iso_tz(yama_start, tz_str),
            "end_iso": format_iso_tz(yama_end, tz_str),
            "part_number": yama_p,
            "guidance": "Inauspicious for commencement of new ventures."
        },
        "gulika_kaal": {
            "start": format_time_tz(gulika_start, tz_str),
            "end": format_time_tz(gulika_end, tz_str),
            "start_iso": format_iso_tz(gulika_start, tz_str),
            "end_iso": format_iso_tz(gulika_end, tz_str),
            "part_number": gulika_p,
            "guidance": "Activities begun during Gulika tend to repeat; suitable for routine work."
        },
        "durmuhurta": durmuhurta_windows,
        "varjyam": varjyam_dict,
        "amrit_kaal": amrit_kaal_dict
    }

def calculate_choghadiya(
    dt_rise: datetime,
    dt_set: datetime,
    dt_next_rise: datetime,
    weekday_idx: int,
    tz_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Computes complete Day and Night Choghadiya schedules for the given weekday.
    Day: 8 equal divisions from Sunrise to Sunset.
    Night: 8 equal divisions from Sunset to Next Sunrise.
    """
    day_sec = (dt_set - dt_rise).total_seconds()
    night_sec = (dt_next_rise - dt_set).total_seconds()

    day_part = day_sec / 8.0
    night_part = night_sec / 8.0

    day_names = DAY_CHOGHADIYA_SEQUENCES[weekday_idx]
    night_names = NIGHT_CHOGHADIYA_SEQUENCES[weekday_idx]

    day_schedule = []
    for i, name in enumerate(day_names):
        p_start = dt_rise + timedelta(seconds=i * day_part)
        p_end = dt_rise + timedelta(seconds=(i + 1) * day_part)
        meta = CHOGHADIYA_TYPES.get(name, {})
        day_schedule.append({
            "order": i + 1,
            "name": name,
            "name_hi": meta.get("name_hi", name),
            "quality": meta.get("quality", ""),
            "lord": meta.get("lord", ""),
            "start": format_time_tz(p_start, tz_str),
            "end": format_time_tz(p_end, tz_str),
            "start_iso": format_iso_tz(p_start, tz_str),
            "end_iso": format_iso_tz(p_end, tz_str),
        })

    night_schedule = []
    for i, name in enumerate(night_names):
        p_start = dt_set + timedelta(seconds=i * night_part)
        p_end = dt_set + timedelta(seconds=(i + 1) * night_part)
        meta = CHOGHADIYA_TYPES.get(name, {})
        night_schedule.append({
            "order": i + 1,
            "name": name,
            "name_hi": meta.get("name_hi", name),
            "quality": meta.get("quality", ""),
            "lord": meta.get("lord", ""),
            "start": format_time_tz(p_start, tz_str),
            "end": format_time_tz(p_end, tz_str),
            "start_iso": format_iso_tz(p_start, tz_str),
            "end_iso": format_iso_tz(p_end, tz_str),
        })

    return {
        "day": day_schedule,
        "night": night_schedule
    }


# =============================================================================
# HIGH-PRECISION INTEGRATED PANCHANG ORCHESTRATORS
# =============================================================================

def calculate_advanced_panchang(
    dt_utc: datetime,
    lat: float,
    lon: float,
    altitude_m: float = 0.0,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI,
    month_convention: str = "amanta"
) -> Dict[str, Any]:
    """
    Fulfills the Master Project Plan interface contract for the 3D Vedic Calendar:
    Returns complete 5-Anga Panchang with exact transition root-finding,
    celestial timings, lunar months, Samvats, and proportional Muhurtas.
    """
    swe.set_sid_mode(ayanamsha_mode)

    if ZoneInfo:
        try:
            tz = ZoneInfo(tz_str)
        except Exception:
            tz = timezone(timedelta(hours=5, minutes=30))
    else:
        tz = timezone(timedelta(hours=5, minutes=30))

    if dt_utc.tzinfo is not None:
        local_dt = dt_utc.astimezone(tz)
    else:
        local_dt = dt_utc.replace(tzinfo=timezone.utc).astimezone(tz)

    target_date = local_dt.date()

    # Celestial Timings for the local date
    celestial = calculate_celestial_timings(target_date, lat, lon, altitude_m, tz_str)
    dt_rise = jd_to_datetime_utc(celestial["jd_rise"]).astimezone(tz)
    dt_set = jd_to_datetime_utc(celestial["jd_set"]).astimezone(tz)
    dt_next_rise = jd_to_datetime_utc(celestial["jd_next_rise"]).astimezone(tz)

    # Previous sunset for accurate nocturnal Muhurta scaling
    prev_date = target_date - timedelta(days=1)
    prev_celestial = calculate_celestial_timings(prev_date, lat, lon, altitude_m, tz_str)
    dt_prev_set = jd_to_datetime_utc(prev_celestial["jd_set"]).astimezone(tz)

    # Invariant AV-SEC-06: Pre-sunrise birth/event belongs to preceding Vedic day
    is_pre_sunrise = (local_dt < dt_rise)
    vedic_date = target_date - timedelta(days=1) if is_pre_sunrise else target_date
    weekday_idx = vedic_date.weekday()
    w_detail = WEEKDAYS_DETAILED[weekday_idx]

    # Reference instant for continuous limbs is the query instant dt_utc
    jd_ref = datetime_to_jd_utc(dt_utc)

    # 1-5 Angas solved via Newton-Raphson boundary solvers
    tithi = solve_tithi_boundary(jd_ref, tz_str, ayanamsha_mode)
    nakshatra = solve_nakshatra_boundary(jd_ref, tz_str, ayanamsha_mode)
    yoga = solve_yoga_boundary(jd_ref, tz_str, ayanamsha_mode)
    karana = solve_karana_boundary(jd_ref, tz_str, ayanamsha_mode)
    moon_rashi = solve_moon_rashi_boundary(jd_ref, tz_str, ayanamsha_mode)

    # Lunar Month & Samvats
    lunar_month = calculate_lunar_month_and_samvat(jd_ref, vedic_date, ayanamsha_mode)

    # Muhurtas & Choghadiya
    muhurats = calculate_proportional_muhurtas(
        dt_rise, dt_set, dt_next_rise, dt_prev_set, weekday_idx, tz_str, nakshatra
    )
    choghadiya = calculate_choghadiya(
        dt_rise, dt_set, dt_next_rise, weekday_idx, tz_str
    )

    # Select primary month name according to user preference
    month_name_selected = (
        lunar_month["amanta_month"] if month_convention == "amanta" else lunar_month["purnimanta_month"]
    )
    month_hi_selected = (
        lunar_month["amanta_month_hi"] if month_convention == "amanta" else lunar_month["purnimanta_month_hi"]
    )
    month_sa_selected = (
        lunar_month["amanta_month_sa"] if month_convention == "amanta" else lunar_month["purnimanta_month_sa"]
    )

    return {
        "vaar": {
            "name_en": w_detail["name_en"],
            "name_hi": w_detail["name_hi"],
            "name_sa": w_detail["name_sa"],
            "lord": w_detail["lord"],
            "is_pre_sunrise": is_pre_sunrise,
            "vedic_date": vedic_date.isoformat(),
        },
        "tithi": tithi,
        "nakshatra": nakshatra,
        "yoga": yoga,
        "karana": karana,
        "celestial": celestial,
        "lunar_month": {
            "name_en": month_name_selected,
            "name_hi": month_hi_selected,
            "name_sa": month_sa_selected,
            "convention": month_convention,
            "amanta_month": lunar_month["amanta_month"],
            "purnimanta_month": lunar_month["purnimanta_month"],
            "paksha": lunar_month["paksha"],
            "is_adhika": lunar_month["is_adhika"],
            "is_kshaya": lunar_month["is_kshaya"],
            "vikram_samvat": lunar_month["vikram_samvat_chaitradi"],
            "vikram_samvat_chaitradi": lunar_month["vikram_samvat_chaitradi"],
            "vikram_samvat_kartikadi": lunar_month["vikram_samvat_kartikadi"],
            "shaka_samvat": lunar_month["shaka_samvat"]
        },
        "muhurats": muhurats,
        "choghadiya": choghadiya,
        "moon_rashi": moon_rashi
    }

def calculate_full_panchang(
    target_date_str: str,
    lat: float,
    lon: float,
    tz_str: str = "Asia/Kolkata",
    altitude_m: float = 0.0,
    ayanamsha_mode: int = swe.SIDM_LAHIRI,
    month_convention: str = "amanta"
) -> Dict[str, Any]:
    """
    Legacy and main entry point. Fully backward compatible with existing test suites
    while enriching output with transition times, celestial timings, and classical Muhurtas.
    """
    swe.set_sid_mode(ayanamsha_mode)

    if ZoneInfo:
        try:
            tz = ZoneInfo(tz_str)
        except Exception:
            tz = timezone(timedelta(hours=5, minutes=30))
    else:
        tz = timezone(timedelta(hours=5, minutes=30))

    has_time = ("T" in target_date_str or " " in target_date_str)
    if has_time:
        try:
            base_dt = datetime.fromisoformat(target_date_str.replace("Z", "+00:00"))
            if base_dt.tzinfo is None:
                base_dt = base_dt.replace(tzinfo=tz)
            parsed_date = base_dt.astimezone(tz).date()
        except Exception:
            parsed_date = date.fromisoformat(target_date_str[:10])
            base_dt = None
    else:
        parsed_date = date.fromisoformat(target_date_str[:10])
        base_dt = None

    target_local_date = parsed_date

    # Calculate celestial timings for parsed date
    celestial = calculate_celestial_timings(target_local_date, lat, lon, altitude_m, tz_str)
    jd_rise = celestial["jd_rise"]
    jd_set = celestial["jd_set"]
    jd_next_rise = celestial["jd_next_rise"]

    dt_rise = jd_to_datetime_utc(jd_rise)
    dt_set = jd_to_datetime_utc(jd_set)
    dt_next_rise = jd_to_datetime_utc(jd_next_rise)

    # Invariant AV-SEC-06: Pre-sunrise birth/event belongs to preceding Vedic day
    is_pre_sunrise = False
    if base_dt is not None:
        dt_rise_local = dt_rise.astimezone(base_dt.tzinfo)
        if base_dt < dt_rise_local:
            is_pre_sunrise = True

    vedic_date = target_local_date - timedelta(days=1) if is_pre_sunrise else target_local_date

    # Previous sunset for nocturnal Muhurta scaling (relative to target_local_date)
    prev_date = target_local_date - timedelta(days=1)
    prev_celestial = calculate_celestial_timings(prev_date, lat, lon, altitude_m, tz_str)
    dt_prev_set = jd_to_datetime_utc(prev_celestial["jd_set"])

    # Reference instant for Panchang limbs:
    # If explicit time provided, use base_dt; otherwise calculate at local sunrise
    if base_dt is not None:
        jd_eval = datetime_to_jd_utc(base_dt)
    else:
        jd_eval = jd_rise

    # Evaluate 5 Angas via root-finding solvers
    tithi = solve_tithi_boundary(jd_eval, tz_str, ayanamsha_mode)
    nakshatra = solve_nakshatra_boundary(jd_eval, tz_str, ayanamsha_mode)
    yoga = solve_yoga_boundary(jd_eval, tz_str, ayanamsha_mode)
    karana = solve_karana_boundary(jd_eval, tz_str, ayanamsha_mode)
    moon_rashi = solve_moon_rashi_boundary(jd_eval, tz_str, ayanamsha_mode)

    # Vara (Weekday)
    weekday_idx = vedic_date.weekday()
    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    vara_name = weekdays[weekday_idx]
    day_lord = WEEKDAY_LORDS[weekday_idx]

    # Lunar Month & Samvats
    lunar_month = calculate_lunar_month_and_samvat(jd_eval, vedic_date, ayanamsha_mode)

    # Proportional Muhurtas & Choghadiya
    muhurats = calculate_proportional_muhurtas(
        dt_rise, dt_set, dt_next_rise, dt_prev_set, weekday_idx, tz_str, nakshatra
    )
    choghadiya = calculate_choghadiya(
        dt_rise, dt_set, dt_next_rise, weekday_idx, tz_str
    )

    return {
        "date": target_date_str,
        "panchang": {
            "vara": vara_name,
            "day_lord": day_lord,
            "is_pre_sunrise": is_pre_sunrise,
            "tithi": {
                "name": tithi["name"],
                "name_hi": tithi["name_hi"],
                "name_sa": tithi["name_sa"],
                "number": tithi["number"],
                "paksha": tithi["paksha"],
                "start_time": tithi["start_time_formatted"],
                "end_time": tithi["end_time_formatted"],
                "start_time_iso": tithi["start_time_iso"],
                "end_time_iso": tithi["end_time_iso"],
                "elapsed_percentage": tithi["elapsed_percentage"],
                "next_tithi": tithi["next_tithi"]
            },
            "nakshatra": {
                "name": nakshatra["name"],
                "name_hi": nakshatra["name_hi"],
                "name_sa": nakshatra["name_sa"],
                "pada": nakshatra["pada"],
                "lord": nakshatra["lord"],
                "deity": nakshatra["deity"],
                "degree_in_nakshatra": nakshatra["degree_in_nakshatra"],
                "start_time": nakshatra["start_time_formatted"],
                "end_time": nakshatra["end_time_formatted"],
                "start_time_iso": nakshatra["start_time_iso"],
                "end_time_iso": nakshatra["end_time_iso"],
                "elapsed_percentage": nakshatra["elapsed_percentage"],
                "next_nakshatra": nakshatra["next_nakshatra"]
            },
            "yoga": {
                "name": yoga["name"],
                "name_hi": yoga["name_hi"],
                "name_sa": yoga["name_sa"],
                "number": yoga["number"],
                "nature": yoga["nature"],
                "start_time": yoga["start_time_formatted"],
                "end_time": yoga["end_time_formatted"],
                "start_time_iso": yoga["start_time_iso"],
                "end_time_iso": yoga["end_time_iso"],
                "elapsed_percentage": yoga["elapsed_percentage"],
                "next_yoga": yoga["next_yoga"]
            },
            "karana": {
                "name": karana["name"],
                "name_hi": karana["name_hi"],
                "name_sa": karana["name_sa"],
                "number": karana["number"],
                "is_fixed": karana["is_fixed"],
                "lord": karana["lord"],
                "start_time": karana["start_time_formatted"],
                "end_time": karana["end_time_formatted"],
                "start_time_iso": karana["start_time_iso"],
                "end_time_iso": karana["end_time_iso"],
                "elapsed_percentage": karana["elapsed_percentage"],
                "next_karana": karana["next_karana"]
            }
        },
        "solar_cycle": {
            "sunrise": celestial["sunrise_formatted"],
            "sunset": celestial["sunset_formatted"],
            "solar_noon": celestial["solar_noon_formatted"],
            "day_length_hours": celestial["day_hours"],
            "night_length_hours": celestial["night_hours"],
            "day_duration_formatted": celestial["day_duration_formatted"],
            "night_duration_formatted": celestial["night_duration_formatted"],
            "moonrise": celestial["moonrise_formatted"],
            "moonset": celestial["moonset_formatted"],
            "moon_phase": celestial["moon_phase"]["name"],
            "moon_illumination_pct": celestial["moon_phase"]["illumination_pct"]
        },
        "celestial_timings": celestial,
        "lunar_month": lunar_month,
        "moon_rashi": moon_rashi,
        "inauspicious_windows": {
            "rahu_kaal": muhurats["rahu_kaal"],
            "yamaganda": muhurats["yamaganda"],
            "gulika_kaal": muhurats["gulika_kaal"],
            "durmuhurta": muhurats["durmuhurta"],
            "varjyam": muhurats["varjyam"]
        },
        "auspicious_windows": {
            "abhijit_muhurta": muhurats["abhijit_muhurta"],
            "brahma_muhurta": muhurats["brahma_muhurta"],
            "amrit_kaal": muhurats["amrit_kaal"]
        },
        "choghadiya": choghadiya
    }

def calculate_daily_panchang(
    date_str: str,
    lat: float,
    lon: float,
    tz_str: str = "Asia/Kolkata",
    altitude_m: float = 0.0
) -> Dict[str, Any]:
    """
    Convenience alias for tools_registry.py compatibility.
    """
    return calculate_full_panchang(date_str, lat, lon, tz_str, altitude_m)
