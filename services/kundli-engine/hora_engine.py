"""
Planetary Hora and Vedic Timing Engine:
Calculates authentic 24-hour planetary Horas using exact solar sunrise, sunset,
and next sunrise derived from Swiss Ephemeris (pyswisseph).
Enforces traditional Chaldean planetary sequence and unequal diurnal/nocturnal intervals.
Computes distinct Rahu Kaal, Yamaganda, and Gulika Kaal periods.
"""
from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Dict, Any, List, Tuple, Optional
import swisseph as swe

# Classical Chaldean descending order (by geocentric distance/apparent velocity):
# Saturn -> Jupiter -> Mars -> Sun -> Venus -> Mercury -> Moon
CHALDEAN_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]

# Astrological Weekday Lord at Sunrise:
# 0 = Monday (Moon), 1 = Tuesday (Mars), 2 = Wednesday (Mercury),
# 3 = Thursday (Jupiter), 4 = Friday (Venus), 5 = Saturday (Saturn), 6 = Sunday (Sun)
WEEKDAY_LORDS = {
    0: "Moon",
    1: "Mars",
    2: "Mercury",
    3: "Jupiter",
    4: "Venus",
    5: "Saturn",
    6: "Sun"
}

# Traditional Parashari Hora Interpretive Attributes (No fabricated percentages)
# Canonical Qualitative Classification:
# Favorable: Jupiter, Venus, Mercury -> #10B981
# Authoritative / Moderate: Sun, Moon -> #F59E0B
# Caution: Mars, Saturn -> #EF4444
HORA_ATTRIBUTES = {
    "Jupiter": {
        "sanskrit": "Guru",
        "category": "Favorable",
        "category_code": "favorable",
        "recommendation": "Ideal for major financial investments, legal contracts, higher education, spiritual practices and auspicious ceremonies.",
        "avoid": "Trivial pursuits and routine manual labor.",
        "color_badge": "#10B981"
    },
    "Venus": {
        "sanskrit": "Shukra",
        "category": "Favorable",
        "category_code": "favorable",
        "recommendation": "Excellent for arts, design, romance, luxury acquisitions, social reconciliation, and client presentations.",
        "avoid": "Harsh negotiations and aggressive confrontation.",
        "color_badge": "#10B981"
    },
    "Mercury": {
        "sanskrit": "Budha",
        "category": "Favorable",
        "category_code": "favorable",
        "recommendation": "Ideal for commercial trade, analytics, accounting, contracts, technical writing, and strategic communication.",
        "avoid": "Over-emotional debates and impulsive decisions.",
        "color_badge": "#10B981"
    },
    "Moon": {
        "sanskrit": "Chandra",
        "category": "Authoritative / Moderate",
        "category_code": "authoritative_moderate",
        "recommendation": "Favorable for public relations, home affairs, maritime matters, wellness, and nurturing relationships.",
        "avoid": "High-risk speculative investments during waning phase.",
        "color_badge": "#F59E0B"
    },
    "Sun": {
        "sanskrit": "Surya",
        "category": "Authoritative / Moderate",
        "category_code": "authoritative_moderate",
        "recommendation": "Suitable for leadership meetings, government administrative work, career advancement discussions, and vital decisions.",
        "avoid": "Submissive compromise and personal artistic pursuits.",
        "color_badge": "#F59E0B"
    },
    "Mars": {
        "sanskrit": "Mangal",
        "category": "Caution",
        "category_code": "caution",
        "recommendation": "Suitable for intense physical exercise, engineering work, surgical operations, and decisive defensive action.",
        "avoid": "Signing sensitive partnerships and heated legal discussions.",
        "color_badge": "#EF4444"
    },
    "Saturn": {
        "sanskrit": "Shani",
        "category": "Caution",
        "category_code": "caution",
        "recommendation": "Favorable for routine labor, clearing backlog, mining, agriculture, long-term discipline, and meditation.",
        "avoid": "Initiating new speculative business ventures or matrimonial proposals.",
        "color_badge": "#EF4444"
    }
}

# Classical 8-Fold Daylight Divisions for Inauspicious / Special Periods:
# Index represents which 1/8th part of daylight (1-based: 1 to 8)
RAHU_KAAL_PARTS = {
    0: 2,  # Monday: 2nd part
    1: 7,  # Tuesday: 7th part
    2: 5,  # Wednesday: 5th part
    3: 6,  # Thursday: 6th part
    4: 4,  # Friday: 4th part
    5: 3,  # Saturday: 3rd part
    6: 8   # Sunday: 8th part
}

YAMAGANDA_PARTS = {
    0: 4,  # Monday: 4th part
    1: 3,  # Tuesday: 3rd part
    2: 2,  # Wednesday: 2nd part
    3: 1,  # Thursday: 1st part
    4: 7,  # Friday: 7th part
    5: 6,  # Saturday: 6th part
    6: 5   # Sunday: 5th part
}

GULIKA_PARTS = {
    0: 6,  # Monday: 6th part
    1: 5,  # Tuesday: 5th part
    2: 4,  # Wednesday: 4th part
    3: 3,  # Thursday: 3rd part
    4: 2,  # Friday: 2nd part
    5: 1,  # Saturday: 1st part
    6: 7   # Sunday: 7th part
}

def _jd_to_datetime(jd: float, tz_name: str) -> datetime:
    year, month, day, hour_float = swe.revjul(jd, swe.GREG_CAL)
    h = int(hour_float)
    rem_min = (hour_float - h) * 60.0
    m = int(rem_min)
    s = int(round((rem_min - m) * 60.0))
    if s >= 60:
        s = 0
        m += 1
    if m >= 60:
        m = 0
        h += 1
    utc_dt = datetime(year, month, day, h, m, s, tzinfo=timezone.utc)
    return utc_dt.astimezone(ZoneInfo(tz_name))

def calculate_sun_times(
    target_date: date,
    latitude: float,
    longitude: float,
    tz_name: str = "Asia/Kolkata"
) -> Tuple[datetime, datetime, datetime]:
    """
    Computes exact local solar sunrise, sunset, and next sunrise using Swiss Ephemeris.
    Returns localized (sunrise_dt, sunset_dt, next_sunrise_dt).
    """
    tz = ZoneInfo(tz_name)
    dummy_dt = datetime(target_date.year, target_date.month, target_date.day, 12, 0, tzinfo=tz)
    offset_hours = dummy_dt.utcoffset().total_seconds() / 3600.0

    # Start search from midnight local time converted to UT
    jd_midnight_ut = swe.julday(
        target_date.year, target_date.month, target_date.day,
        0.0 - offset_hours,
        swe.GREG_CAL
    )
    geopos = (longitude, latitude, 0.0)

    res_rise, tret_rise = swe.rise_trans(jd_midnight_ut, swe.SUN, swe.CALC_RISE, geopos)
    res_set, tret_set = swe.rise_trans(jd_midnight_ut, swe.SUN, swe.CALC_SET, geopos)

    if res_rise != 0 or res_set != 0:
        # Polar or extreme latitude fallback where sun does not rise/set normally
        s_rise = datetime(target_date.year, target_date.month, target_date.day, 6, 0, 0, tzinfo=tz)
        s_set = datetime(target_date.year, target_date.month, target_date.day, 18, 0, 0, tzinfo=tz)
        s_next = s_rise + timedelta(days=1)
        return s_rise, s_set, s_next

    res_next_rise, tret_next_rise = swe.rise_trans(tret_set[0], swe.SUN, swe.CALC_RISE, geopos)
    if res_next_rise != 0:
        tret_next_rise = (tret_rise[0] + 1.0,)

    sunrise_dt = _jd_to_datetime(tret_rise[0], tz_name)
    sunset_dt = _jd_to_datetime(tret_set[0], tz_name)
    next_sunrise_dt = _jd_to_datetime(tret_next_rise[0], tz_name)

    return sunrise_dt, sunset_dt, next_sunrise_dt

def calculate_special_periods(
    sunrise_dt: datetime,
    sunset_dt: datetime,
    weekday: int
) -> Dict[str, Any]:
    """Calculates Rahu Kaal, Yamaganda, and Gulika Kaal based on classical 8th-division of daylight."""
    daylight_seconds = (sunset_dt - sunrise_dt).total_seconds()
    part_duration = daylight_seconds / 8.0

    def get_period_times(part_num: int) -> Tuple[datetime, datetime]:
        s = sunrise_dt + timedelta(seconds=(part_num - 1) * part_duration)
        e = sunrise_dt + timedelta(seconds=part_num * part_duration)
        return s, e

    rahu_s, rahu_e = get_period_times(RAHU_KAAL_PARTS[weekday])
    yama_s, yama_e = get_period_times(YAMAGANDA_PARTS[weekday])
    guli_s, guli_e = get_period_times(GULIKA_PARTS[weekday])

    return {
        "rahu_kaal": {
            "name": "Rahu Kaal",
            "start": rahu_s.strftime("%I:%M %p"),
            "end": rahu_e.strftime("%I:%M %p"),
            "description": "Inauspicious window governed by Rahu. Avoid initiating major investments, contracts, journeys, or auspicious ceremonies."
        },
        "yamaganda": {
            "name": "Yamaganda Kaal",
            "start": yama_s.strftime("%I:%M %p"),
            "end": yama_e.strftime("%I:%M %p"),
            "description": "Period associated with Yama. Inauspicious for starting new business undertakings."
        },
        "gulika_kaal": {
            "name": "Gulika Kaal",
            "start": guli_s.strftime("%I:%M %p"),
            "end": guli_e.strftime("%I:%M %p"),
            "description": "Ruled by Gulika (son of Saturn). Favorable for routine work; avoid concluding ceremonies."
        }
    }

def calculate_24h_horas(
    sunrise_dt: datetime,
    sunset_dt: datetime,
    next_sunrise_dt: datetime,
    current_dt: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Computes complete 24-hour planetary Horas for a given solar day:
    - 12 Daylight Horas of equal duration ((sunset - sunrise) / 12)
    - 12 Nighttime Horas of equal duration ((next_sunrise - sunset) / 12)
    - Chaldean planetary sequence starting from the weekday ruler at sunrise.
    """
    if current_dt is None:
        current_dt = datetime.now(sunrise_dt.tzinfo)

    daylight_seconds = (sunset_dt - sunrise_dt).total_seconds()
    night_seconds = (next_sunrise_dt - sunset_dt).total_seconds()

    day_hora_duration = daylight_seconds / 12.0
    night_hora_duration = night_seconds / 12.0

    # Weekday of sunrise determines first hora ruler
    weekday = sunrise_dt.weekday()
    day_ruler = WEEKDAY_LORDS[weekday]
    start_idx = CHALDEAN_ORDER.index(day_ruler)

    timeline: List[Dict[str, Any]] = []
    active_hora: Optional[Dict[str, Any]] = None

    # 12 Daytime Horas
    for i in range(12):
        s_time = sunrise_dt + timedelta(seconds=i * day_hora_duration)
        e_time = sunrise_dt + timedelta(seconds=(i + 1) * day_hora_duration)
        planet = CHALDEAN_ORDER[(start_idx + i) % 7]
        is_active = (s_time <= current_dt < e_time)
        attrs = HORA_ATTRIBUTES[planet]

        hora_data = {
            "hora_number": i + 1,
            "period": "Day",
            "start_time": s_time.strftime("%I:%M %p"),
            "end_time": e_time.strftime("%I:%M %p"),
            "start_iso": s_time.isoformat(),
            "end_iso": e_time.isoformat(),
            "start_epoch_ms": int(s_time.timestamp() * 1000),
            "end_epoch_ms": int(e_time.timestamp() * 1000),
            "planet": planet,
            "ruling_planet": planet,
            "sanskrit_name": attrs["sanskrit"],
            "category": attrs["category"],
            "category_code": attrs["category_code"],
            "recommendation": attrs["recommendation"],
            "avoid": attrs["avoid"],
            "badge_color": attrs["color_badge"],
            "color": attrs["color_badge"],
            "is_active": is_active
        }
        timeline.append(hora_data)
        if is_active:
            active_hora = hora_data

    # 12 Nighttime Horas
    night_start_idx = (start_idx + 12) % 7
    for i in range(12):
        s_time = sunset_dt + timedelta(seconds=i * night_hora_duration)
        e_time = sunset_dt + timedelta(seconds=(i + 1) * night_hora_duration)
        planet = CHALDEAN_ORDER[(night_start_idx + i) % 7]
        is_active = (s_time <= current_dt < e_time)
        attrs = HORA_ATTRIBUTES[planet]

        hora_data = {
            "hora_number": i + 13,
            "period": "Night",
            "start_time": s_time.strftime("%I:%M %p"),
            "end_time": e_time.strftime("%I:%M %p"),
            "start_iso": s_time.isoformat(),
            "end_iso": e_time.isoformat(),
            "start_epoch_ms": int(s_time.timestamp() * 1000),
            "end_epoch_ms": int(e_time.timestamp() * 1000),
            "planet": planet,
            "ruling_planet": planet,
            "sanskrit_name": attrs["sanskrit"],
            "category": attrs["category"],
            "category_code": attrs["category_code"],
            "recommendation": attrs["recommendation"],
            "avoid": attrs["avoid"],
            "badge_color": attrs["color_badge"],
            "color": attrs["color_badge"],
            "is_active": is_active
        }
        timeline.append(hora_data)
        if is_active:
            active_hora = hora_data

    # Fallback if current_dt is outside the window (e.g. earlier than sunrise)
    if not active_hora and timeline:
        active_hora = timeline[0]

    now_epoch_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    if active_hora:
        active_hora["planet"] = active_hora["ruling_planet"]
        active_hora["category_code"] = active_hora.get("category_code", "favorable")
        active_hora["server_now_epoch_ms"] = now_epoch_ms
        active_hora["source"] = "swiss_ephemeris"
        active_hora["calculation_method"] = "traditional_chaldean_solar_hours"

    special_periods = calculate_special_periods(sunrise_dt, sunset_dt, weekday)

    return {
        "sunrise": sunrise_dt.strftime("%I:%M %p"),
        "sunset": sunset_dt.strftime("%I:%M %p"),
        "next_sunrise": next_sunrise_dt.strftime("%I:%M %p"),
        "sunrise_iso": sunrise_dt.isoformat(),
        "sunset_iso": sunset_dt.isoformat(),
        "day_hora_duration_minutes": round(day_hora_duration / 60.0, 1),
        "night_hora_duration_minutes": round(night_hora_duration / 60.0, 1),
        "day_ruler": day_ruler,
        "timeline": timeline,
        "active_hora": active_hora,
        "special_periods": special_periods,
        "planet": active_hora["ruling_planet"] if active_hora else "Sun",
        "category": active_hora.get("category_code", "favorable") if active_hora else "favorable",
        "start_epoch_ms": active_hora["start_epoch_ms"] if active_hora else int(sunrise_dt.timestamp() * 1000),
        "end_epoch_ms": active_hora["end_epoch_ms"] if active_hora else int((sunrise_dt + timedelta(seconds=day_hora_duration)).timestamp() * 1000),
        "server_now_epoch_ms": now_epoch_ms,
        "source": "swiss_ephemeris",
        "calculation_method": "traditional_chaldean_solar_hours"
    }
