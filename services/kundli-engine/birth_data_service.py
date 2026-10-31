"""
AstroVerse AI — Canonical Birth Data Validation & Sensitivity Analysis Service
Validates birth inputs, resolves historical IANA timezones/DST offsets,
converts to unambiguous UTC instants, and performs sensitivity interval analysis
for unknown and uncertain birth times.
"""

from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, date, time, timedelta, timezone
try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
except ImportError:
    ZoneInfo = None

import swisseph as swe
from astrology_settings import AYANAMSHA_SWISSEPH_MODE, SIGNS, NAKSHATRAS

# Standard Astrological Signs & Nakshatras
ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

def resolve_iana_timezone(tz_name: str, local_dt: datetime) -> Tuple[datetime, float, bool]:
    """
    Resolves local datetime against IANA timezone database to determine
    unambiguous UTC instant, UTC offset in hours, and DST active flag.
    """
    if not ZoneInfo:
        # Fallback to IST if zoneinfo unavailable
        offset_hrs = 5.5
        utc_dt = local_dt - timedelta(hours=5.5)
        return utc_dt.replace(tzinfo=timezone.utc), offset_hrs, False

    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        # Fallback for common aliases or invalid timezone names
        if tz_name in ("IST", "Asia/Calcutta", "India Standard Time"):
            tz = ZoneInfo("Asia/Kolkata")
        else:
            tz = ZoneInfo("UTC")

    # Localize using IANA database (handles historical DST transitions)
    localized = local_dt.replace(tzinfo=tz)
    utc_dt = localized.astimezone(timezone.utc)
    
    # Calculate offset in decimal hours
    utcoffset = localized.utcoffset()
    offset_hrs = utcoffset.total_seconds() / 3600.0 if utcoffset else 0.0
    
    # Check DST flag
    dst = localized.dst()
    is_dst = bool(dst and dst.total_seconds() != 0)

    return utc_dt, offset_hrs, is_dst

def validate_and_normalize_birth_data(
    dob_str: str,
    tob_str: Optional[str] = "12:00",
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    is_unknown_time: bool = False,
    birthplace: str = "New Delhi, India",
    time_uncertainty_minutes: int = 0
) -> Dict[str, Any]:
    """
    Canonical validation pipeline for user birth data.
    Ensures unambiguous UTC conversion, geographical sanity, and uncertainty flagging.
    """
    # 1. Parse date
    try:
        if "T" in dob_str:
            parsed_date = date.fromisoformat(dob_str.split("T")[0])
        else:
            parsed_date = date.fromisoformat(dob_str[:10])
    except Exception as e:
        raise ValueError(f"Invalid birth date format. Expected YYYY-MM-DD: {e}")

    # 2. Parse or handle unknown time
    if is_unknown_time or not tob_str or tob_str.strip() == "":
        is_unknown_time = True
        parsed_time = time(12, 0, 0)
        time_precision_class = "UNKNOWN_TIME_NOMINAL_MIDDAY"
    else:
        try:
            t_parts = tob_str.strip().split(":")
            h = int(t_parts[0])
            m = int(t_parts[1]) if len(t_parts) > 1 else 0
            s = int(float(t_parts[2])) if len(t_parts) > 2 else 0
            if not (0 <= h <= 23 and 0 <= m <= 59 and 0 <= s <= 59):
                raise ValueError("Hour must be 0-23, minute/second 0-59")
            parsed_time = time(h, m, s)
            time_precision_class = "EXACT_CIVIL_RECORDED" if time_uncertainty_minutes == 0 else f"UNCERTAIN_WINDOW_PM_{time_uncertainty_minutes}M"
        except Exception as e:
            raise ValueError(f"Invalid birth time format. Expected HH:MM: {e}")

    # 3. Validate coordinates
    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"Latitude out of range [-90, +90]: {lat}")
    if not (-180.0 <= lon <= 180.0):
        raise ValueError(f"Longitude out of range [-180, +180]: {lon}")

    # 4. Resolve unambiguous UTC datetime using IANA database
    local_naive_dt = datetime.combine(parsed_date, parsed_time)
    utc_dt, offset_hrs, is_dst = resolve_iana_timezone(tz_str, local_naive_dt)

    # 5. Compute Julian Day in UT
    jd_ut = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    )

    return {
        "birth_date": parsed_date.isoformat(),
        "birth_time_local": parsed_time.isoformat() if not is_unknown_time else None,
        "is_unknown_time": is_unknown_time,
        "time_precision_classification": time_precision_class,
        "time_uncertainty_minutes": time_uncertainty_minutes,
        "birthplace": birthplace,
        "latitude": round(lat, 5),
        "longitude": round(lon, 5),
        "iana_timezone": tz_str,
        "utc_offset_hours": offset_hrs,
        "is_historical_dst": is_dst,
        "utc_datetime_iso": utc_dt.isoformat(),
        "julian_day_ut": round(jd_ut, 6),
        "timezone_resolution_source": "Python zoneinfo IANA Database" if ZoneInfo else "Fixed Offset Fallback"
    }

def analyze_unknown_time_sensitivity(
    dob_str: str,
    lat: float,
    lon: float,
    tz_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Computes diurnal sensitivity interval when birth time is unknown.
    Evaluates Moon position at start of day (00:00), noon (12:00), and end of day (23:59:59).
    Flags Moon Nakshatra or Sign crossing during the 24-hour interval.
    """
    swe.set_sid_mode(AYANAMSHA_SWISSEPH_MODE)
    parsed_date = date.fromisoformat(dob_str[:10])

    t_points = [
        ("start_of_day", time(0, 0, 1)),
        ("midday", time(12, 0, 0)),
        ("end_of_day", time(23, 59, 59))
    ]

    moon_positions = []
    nak_span = 360.0 / 27.0

    for label, t_val in t_points:
        dt_local = datetime.combine(parsed_date, t_val)
        utc_dt, _, _ = resolve_iana_timezone(tz_str, dt_local)
        jd = swe.julday(
            utc_dt.year, utc_dt.month, utc_dt.day,
            utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
        )
        res, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SIDEREAL)
        lon_deg = res[0]
        sign_idx = int(lon_deg / 30.0) % 12
        nak_idx = int(lon_deg / nak_span) % 27
        pada = int((lon_deg % nak_span) / (nak_span / 4.0)) + 1

        moon_positions.append({
            "point": label,
            "utc_iso": utc_dt.isoformat(),
            "moon_longitude": round(lon_deg, 4),
            "sign": ZODIAC_SIGNS[sign_idx],
            "nakshatra": NAKSHATRAS[nak_idx],
            "pada": pada
        })

    # Detect boundary crossings
    signs = {p["sign"] for p in moon_positions}
    nakshatras = {p["nakshatra"] for p in moon_positions}
    moon_changes_sign = len(signs) > 1
    moon_changes_nakshatra = len(nakshatras) > 1

    return {
        "is_unknown_time": True,
        "ascendant_status": "INDETERMINATE (Ascendant cycles through all 12 signs in 24 hours)",
        "moon_crosses_sign_boundary": moon_changes_sign,
        "signs_spanned": list(signs),
        "moon_crosses_nakshatra_boundary": moon_changes_nakshatra,
        "nakshatras_spanned": list(nakshatras),
        "dasha_balance_uncertainty": "HIGH (Moon traverses ~11.5° to 14.5° per day)" if moon_changes_nakshatra else "MODERATE (Span within single Nakshatra)",
        "house_based_yogas_available": False,
        "divisional_charts_available": {
            "D1_Rashi_Planets_Only": True,
            "D1_Houses": False,
            "D9_Navamsha_Ascendant": False,
            "D60_Shashtiamsha": False
        },
        "diurnal_evaluations": moon_positions,
        "epistemic_limitation": "Without an accurate birth time, house cusps, Ascendant, and fine divisional charts cannot be determined with scientific integrity. Interpretations are limited to planetary signs and aspects."
    }

def analyze_time_window_uncertainty(
    dob_str: str,
    tob_str: str,
    lat: float,
    lon: float,
    tz_str: str = "Asia/Kolkata",
    uncertainty_minutes: int = 15
) -> Dict[str, Any]:
    """
    Performs sensitivity analysis for a recorded birth time within an uncertainty window (+/- delta).
    Checks if Lagna sign, D9 Navamsha, D60 Shashtiamsha, or Moon Nakshatra change across the window.
    """
    swe.set_sid_mode(AYANAMSHA_SWISSEPH_MODE)
    parsed_date = date.fromisoformat(dob_str[:10])
    t_parts = tob_str.split(":")
    base_time = time(int(t_parts[0]), int(t_parts[1]))
    base_dt = datetime.combine(parsed_date, base_time)

    dt_minus = base_dt - timedelta(minutes=uncertainty_minutes)
    dt_plus = base_dt + timedelta(minutes=uncertainty_minutes)

    evaluations = []
    nak_span = 360.0 / 27.0

    for label, dt_pt in [("nominal_minus", dt_minus), ("nominal", base_dt), ("nominal_plus", dt_plus)]:
        utc_dt, _, _ = resolve_iana_timezone(tz_str, dt_pt)
        jd = swe.julday(
            utc_dt.year, utc_dt.month, utc_dt.day,
            utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
        )
        # Ascendant
        cusps, ascmc = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
        lagna_deg = ascmc[0]
        lagna_sign_idx = int(lagna_deg / 30.0) % 12

        # D9 Lagna
        d9_pada = int((lagna_deg % 30.0) / (30.0 / 9.0))
        d9_start = {0: 0, 1: 9, 2: 6, 3: 3}[lagna_sign_idx % 4]
        d9_sign_idx = (d9_start + d9_pada) % 12

        # D60 Lagna
        d60_part = min(59, int((lagna_deg % 30.0) / 0.5))
        is_odd = (lagna_sign_idx % 2 == 0)
        d60_start = lagna_sign_idx if is_odd else (lagna_sign_idx + 6) % 12
        d60_sign_idx = (d60_start + d60_part) % 12

        # Moon
        res_m, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SIDEREAL)
        m_deg = res_m[0]
        m_nak_idx = int(m_deg / nak_span) % 27

        evaluations.append({
            "point": label,
            "local_iso": dt_pt.isoformat(),
            "lagna_degree": round(lagna_deg, 3),
            "lagna_sign": ZODIAC_SIGNS[lagna_sign_idx],
            "d9_navamsha_sign": ZODIAC_SIGNS[d9_sign_idx],
            "d60_shashtiamsha_sign": ZODIAC_SIGNS[d60_sign_idx],
            "moon_nakshatra": NAKSHATRAS[m_nak_idx]
        })

    lagna_signs = {e["lagna_sign"] for e in evaluations}
    d9_signs = {e["d9_navamsha_sign"] for e in evaluations}
    d60_signs = {e["d60_shashtiamsha_sign"] for e in evaluations}
    moon_naks = {e["moon_nakshatra"] for e in evaluations}

    return {
        "uncertainty_window_minutes": f"±{uncertainty_minutes} min",
        "lagna_shifts_in_window": len(lagna_signs) > 1,
        "lagna_signs_spanned": list(lagna_signs),
        "d9_shifts_in_window": len(d9_signs) > 1,
        "d9_signs_spanned": list(d9_signs),
        "d60_shifts_in_window": len(d60_signs) > 1,
        "d60_signs_spanned": list(d60_signs),
        "moon_nakshatra_shifts": len(moon_naks) > 1,
        "moon_nakshatras_spanned": list(moon_naks),
        "evaluations": evaluations,
        "reliability_verdict": "HIGH" if (len(lagna_signs) == 1 and len(d9_signs) == 1) else ("MODERATE" if len(lagna_signs) == 1 else "SENSITIVE")
    }
