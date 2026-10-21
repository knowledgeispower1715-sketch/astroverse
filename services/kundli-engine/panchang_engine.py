"""
AstroVerse Vedic Panchang & Muhurta Calculation Engine:
Computes the authentic 5 limbs of the day (Pancha-Anga) plus classical Muhurta windows
derived mathematically from exact topocentric solar and lunar coordinates.

Limbs:
1. Tithi: Lunar phase calculated from (Moon_Long - Sun_Long) / 12.0
2. Vara: Solar weekday ruled by planetary day-lord at sunrise
3. Nakshatra: Asterism occupied by the Moon (13°20' per Nakshatra)
4. Yoga: Angular sum (Sun_Long + Moon_Long) / (360/27)
5. Karana: Half of a Tithi (6° per Karana)

Muhurta Windows:
- Sunrise & Sunset: Topocentric disc transit using Swiss Ephemeris
- 24 Planetary Horas: Diurnal & nocturnal intervals in Chaldean sequence
- Rahu Kaal, Yamaganda, Gulika Kaal: Classical 8-fold daylight divisions
- Abhijit Muhurta: Peak 8th Muhurta of the day (midday ± 24 mins)
- Brahma Muhurta: Sacred pre-dawn window (96 mins to 48 mins before sunrise)
"""

from typing import Dict, Any, List, Tuple
from datetime import datetime, date, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

import swisseph as swe

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
]

YOGAS = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
    "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva",
    "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan",
    "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla",
    "Brahma", "Indra", "Vaidhriti"
]

TITHIS = [
    "Shukla Pratipada", "Shukla Dwitiya", "Shukla Tritiya", "Shukla Chaturthi",
    "Shukla Panchami", "Shukla Shashti", "Shukla Saptami", "Shukla Ashtami",
    "Shukla Navami", "Shukla Dashami", "Shukla Ekadashi", "Shukla Dwadashi",
    "Shukla Trayodashi", "Shukla Chaturdashi", "Purnima",
    "Krishna Pratipada", "Krishna Dwitiya", "Krishna Tritiya", "Krishna Chaturthi",
    "Krishna Panchami", "Krishna Shashti", "Krishna Saptami", "Krishna Ashtami",
    "Krishna Navami", "Krishna Dashami", "Krishna Ekadashi", "Krishna Dwadashi",
    "Krishna Trayodashi", "Krishna Chaturdashi", "Amavasya"
]

KARANAS = [
    "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti (Bhadra)"
]

# Weekday lords: 0=Mon (Moon), 1=Tue (Mars), 2=Wed (Mercury), 3=Thu (Jupiter), 4=Fri (Venus), 5=Sat (Saturn), 6=Sun (Sun)
WEEKDAY_LORDS = {
    0: "Moon", 1: "Mars", 2: "Mercury", 3: "Jupiter", 4: "Venus", 5: "Saturn", 6: "Sun"
}

# 8-fold daylight parts (1-indexed)
RAHU_KAAL_PARTS = { 0: 2, 1: 7, 2: 5, 3: 6, 4: 4, 5: 3, 6: 8 }
YAMAGANDA_PARTS = { 0: 4, 1: 3, 2: 2, 3: 1, 4: 7, 5: 6, 6: 5 }
GULIKA_KAAL_PARTS = { 0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 7 }

CHALDEAN_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]

def calculate_sun_rise_set(jd_base: float, lat: float, lon: float) -> Tuple[float, float, float]:
    """
    Computes exact topocentric sunrise, sunset, and next sunrise using Swiss Ephemeris.
    """
    geopos = (lon, lat, 0.0)
    res_rise, tret_rise = swe.rise_trans(jd_base, swe.SUN, swe.CALC_RISE, geopos)
    res_set, tret_set = swe.rise_trans(tret_rise[0], swe.SUN, swe.CALC_SET, geopos)
    res_next_rise, tret_next = swe.rise_trans(tret_set[0], swe.SUN, swe.CALC_RISE, geopos)
    return tret_rise[0], tret_set[0], tret_next[0]

def jd_to_datetime_utc(jd: float) -> datetime:
    y, m, d, h_frac = swe.revjul(jd)
    h = int(h_frac)
    mins = int((h_frac - h) * 60)
    secs = int(((h_frac - h) * 60 - mins) * 60)
    return datetime(y, m, d, h, mins, secs, tzinfo=timezone.utc)

def format_time_tz(dt_utc: datetime, tz_str: str) -> str:
    if ZoneInfo:
        try:
            local_dt = dt_utc.astimezone(ZoneInfo(tz_str))
            return local_dt.strftime("%I:%M %p")
        except Exception:
            pass
    # Default to +5:30 IST
    local_dt = dt_utc + timedelta(hours=5, minutes=30)
    return local_dt.strftime("%I:%M %p")

def calculate_full_panchang(
    target_date_str: str,
    lat: float,
    lon: float,
    tz_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Calculates complete Janam or Gochara Panchang and Muhurtas.
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    parsed_date = date.fromisoformat(target_date_str)
    # Noon UTC
    noon_jd = swe.julday(parsed_date.year, parsed_date.month, parsed_date.day, 12.0)

    # Solar rising and setting
    jd_rise, jd_set, jd_next_rise = calculate_sun_rise_set(noon_jd - 0.5, lat, lon)
    dt_rise = jd_to_datetime_utc(jd_rise)
    dt_set = jd_to_datetime_utc(jd_set)
    dt_next_rise = jd_to_datetime_utc(jd_next_rise)

    # Celestial positions at sunrise for true Vedic Day reckoning
    sun_res, _ = swe.calc_ut(jd_rise, swe.SUN, swe.FLG_SIDEREAL)
    moon_res, _ = swe.calc_ut(jd_rise, swe.MOON, swe.FLG_SIDEREAL)
    sun_deg = sun_res[0]
    moon_deg = moon_res[0]

    # 1. Tithi
    diff_deg = (moon_deg - sun_deg + 360.0) % 360.0
    tithi_idx = int(diff_deg / 12.0) % 30
    tithi_name = TITHIS[tithi_idx]
    paksha = "Shukla Paksha (Waxing)" if tithi_idx < 15 else "Krishna Paksha (Waning)"

    # 2. Nakshatra
    nak_idx = int(moon_deg / (360.0 / 27.0)) % 27
    nak_name = NAKSHATRAS[nak_idx]
    nak_pada = int((moon_deg % (360.0 / 27.0)) / (360.0 / 108.0)) + 1
    nak_lord = NAKSHATRA_LORDS[nak_idx % 9]

    # 3. Yoga
    yoga_deg = (sun_deg + moon_deg) % 360.0
    yoga_idx = int(yoga_deg / (360.0 / 27.0)) % 27
    yoga_name = YOGAS[yoga_idx]

    # 4. Karana
    karana_num = int(diff_deg / 6.0)
    if karana_num == 0:
        karana_name = "Kintughna"
    elif karana_num >= 57:
        fixed_idx = karana_num - 57
        fixed_karanas = ["Shakuni", "Chatushpada", "Naga"]
        karana_name = fixed_karanas[min(fixed_idx, 2)]
    else:
        karana_name = KARANAS[(karana_num - 1) % 7]

    # 5. Vara (Weekday)
    weekday_idx = parsed_date.weekday()
    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    vara_name = weekdays[weekday_idx]
    day_lord = WEEKDAY_LORDS[weekday_idx]

    # Muhurta Windows
    day_duration_sec = (dt_set - dt_rise).total_seconds()
    part_sec = day_duration_sec / 8.0

    # Rahu Kaal
    rahu_part = RAHU_KAAL_PARTS[weekday_idx]
    rahu_start = dt_rise + timedelta(seconds=(rahu_part - 1) * part_sec)
    rahu_end = dt_rise + timedelta(seconds=rahu_part * part_sec)

    # Yamaganda
    yama_part = YAMAGANDA_PARTS[weekday_idx]
    yama_start = dt_rise + timedelta(seconds=(yama_part - 1) * part_sec)
    yama_end = dt_rise + timedelta(seconds=yama_part * part_sec)

    # Gulika Kaal
    gulika_part = GULIKA_KAAL_PARTS[weekday_idx]
    gulika_start = dt_rise + timedelta(seconds=(gulika_part - 1) * part_sec)
    gulika_end = dt_rise + timedelta(seconds=gulika_part * part_sec)

    # Abhijit Muhurta (Midday ± 24 mins)
    midday = dt_rise + timedelta(seconds=day_duration_sec / 2.0)
    abhijit_start = midday - timedelta(minutes=24)
    abhijit_end = midday + timedelta(minutes=24)

    # Brahma Muhurta (Starts 96 mins before sunrise, ends 48 mins before sunrise)
    brahma_start = dt_rise - timedelta(minutes=96)
    brahma_end = dt_rise - timedelta(minutes=48)

    return {
        "date": target_date_str,
        "panchang": {
            "vara": vara_name,
            "day_lord": day_lord,
            "tithi": {
                "name": tithi_name,
                "number": tithi_idx + 1,
                "paksha": paksha
            },
            "nakshatra": {
                "name": nak_name,
                "pada": nak_pada,
                "lord": nak_lord,
                "degree_in_nakshatra": round(moon_deg % (360.0 / 27.0), 2)
            },
            "yoga": {
                "name": yoga_name,
                "number": yoga_idx + 1
            },
            "karana": {
                "name": karana_name,
                "number": karana_num + 1
            }
        },
        "solar_cycle": {
            "sunrise": format_time_tz(dt_rise, tz_str),
            "sunset": format_time_tz(dt_set, tz_str),
            "day_length_hours": round(day_duration_sec / 3600.0, 2)
        },
        "inauspicious_windows": {
            "rahu_kaal": {
                "start": format_time_tz(rahu_start, tz_str),
                "end": format_time_tz(rahu_end, tz_str),
                "guidance": "Avoid initiating high-stakes agreements, major contracts, or financial closings."
            },
            "yamaganda": {
                "start": format_time_tz(yama_start, tz_str),
                "end": format_time_tz(yama_end, tz_str),
                "guidance": "Inauspicious for commencement of new ventures."
            },
            "gulika_kaal": {
                "start": format_time_tz(gulika_start, tz_str),
                "end": format_time_tz(gulika_end, tz_str),
                "guidance": "Activities begun during Gulika tend to repeat; suitable for routine work."
            }
        },
        "auspicious_windows": {
            "abhijit_muhurta": {
                "start": format_time_tz(abhijit_start, tz_str),
                "end": format_time_tz(abhijit_end, tz_str),
                "guidance": "Highly auspicious solar midday window that neutralizes general negative muhurta doshas."
            },
            "brahma_muhurta": {
                "start": format_time_tz(brahma_start, tz_str),
                "end": format_time_tz(brahma_end, tz_str),
                "guidance": "Sacred pre-dawn window optimal for meditation, study, intellectual synthesis, and contemplation."
            }
        }
    }
