"""
AstroVerse Upagrahas Engine
===========================
Calculates the 11 Classical Non-Luminous Sub-Planets (Aprakasha Grahas & Kalavelas)
based on Brihat Parashara Hora Shastra (BPHS):

1. Sun-Based Upagrahas:
   - Dhuma = Sun + 133°20'
   - Vyatipaata = 360° - Dhuma
   - Parivesha = Vyatipaata + 180°
   - Indrachaapa (Kodhika) = 360° - Parivesha
   - Upaketu (Sikhi) = Indrachaapa + 16°40'

2. Time-Based Kalavelas (Eighth-portions of Day/Night):
   - Kaala (Sun's portion)
   - Mrityu (Mars's portion)
   - Arthaprahaara (Mercury's portion)
   - Yamaghantaka (Jupiter's portion)
   - Gulika (Saturn's portion mid/end)
   - Maandi (Saturn's portion start)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo
import swisseph as swe

from hora_engine import calculate_sun_times
from ephemeris import SIGNS as ZODIAC_SIGNS, NAKSHATRAS

# Standard Weekday Lords (0=Monday ... 6=Sunday)
WEEKDAY_LORDS = [
    "Moon",     # Monday
    "Mars",     # Tuesday
    "Mercury",  # Wednesday
    "Jupiter",  # Thursday
    "Venus",    # Friday
    "Saturn",   # Saturday
    "Sun"       # Sunday
]

PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

def _normalize_degrees(deg: float) -> float:
    return deg % 360.0

def _get_sign_and_deg(lon: float):
    norm = _normalize_degrees(lon)
    sign_idx = int(norm // 30)
    deg_in_sign = norm % 30.0
    return sign_idx, deg_in_sign

def _get_nakshatra_and_pada(lon: float):
    norm = _normalize_degrees(lon)
    nak_span = 360.0 / 27.0 # 13.333333333333334
    nak_idx = int(norm // nak_span)
    deg_in_nak = norm % nak_span
    pada = int(deg_in_nak // (nak_span / 4.0)) + 1
    nak_name = NAKSHATRAS[nak_idx] if nak_idx < len(NAKSHATRAS) else "Revati"
    return nak_idx + 1, nak_name, pada

def calculate_upagrahas(
    dob_iso: str,
    lat: float,
    lon: float,
    timezone_str: str = "Asia/Kolkata",
    sun_longitude: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes all 11 Upagrahas for a given birth/event datetime and location.
    """
    tz = ZoneInfo(timezone_str)
    dt = datetime.fromisoformat(dob_iso.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    else:
        dt = dt.astimezone(tz)
        
    ref_date = dt.date()
    
    # 1. Sunrise / Sunset times
    s_rise, s_set, next_s_rise = calculate_sun_times(ref_date, lat, lon, timezone_str)
    
    # Check if birth is before sunrise (belongs to previous Vedic day)
    if dt < s_rise:
        prev_date = ref_date - timedelta(days=1)
        s_rise, s_set, next_s_rise = calculate_sun_times(prev_date, lat, lon, timezone_str)
        weekday_idx = prev_date.weekday()
    else:
        weekday_idx = ref_date.weekday()
        
    is_day_birth = s_rise <= dt < s_set
    
    # 2. Get Sun Longitude if not provided
    swe.set_ephe_path("")
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    
    utc_dt = dt.astimezone(ZoneInfo("UTC"))
    tjd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, utc_dt.hour + utc_dt.minute/60.0 + utc_dt.second/3600.0)
    ayanamsa = swe.get_ayanamsa_ut(tjd)
    
    if sun_longitude is None:
        flags = swe.FLG_SWIEPH | swe.FLG_SPEED
        res, _ = swe.calc_ut(tjd, swe.SUN, flags)
        sayana_sun = res[0]
        sun_longitude = _normalize_degrees(sayana_sun - ayanamsa)
        
    # 3. Calculate 5 Sun-based Upagrahas
    dhuma = _normalize_degrees(sun_longitude + 133.33333333333334) # 133°20'
    vyatipaata = _normalize_degrees(360.0 - dhuma)
    parivesha = _normalize_degrees(vyatipaata + 180.0)
    indrachaapa = _normalize_degrees(360.0 - parivesha)
    upaketu = _normalize_degrees(indrachaapa + 16.666666666666668) # 16°40'
    
    sun_based = {}
    for name, val, desc in [
        ("Dhuma", dhuma, "Smoke - First son of Mars; creates sudden intensity and zeal."),
        ("Vyatipaata", vyatipaata, "Calamity - Great churning; indicates unforeseen turnaround."),
        ("Parivesha", parivesha, "Halo - Boundary marker; indicates circumspection."),
        ("Indrachaapa", indrachaapa, "Rainbow (Kodhika) - Illusory beauty and worldly honor."),
        ("Upaketu", upaketu, "Comet (Sikhi) - Ascetic detachment and karmic resolution.")
    ]:
        s_idx, deg_s = _get_sign_and_deg(val)
        nak_no, nak_name, pada = _get_nakshatra_and_pada(val)
        sun_based[name] = {
            "name": name,
            "longitude": round(val, 4),
            "sign": ZODIAC_SIGNS[s_idx],
            "sign_index": s_idx,
            "degree_in_sign": round(deg_s, 4),
            "nakshatra_number": nak_no,
            "nakshatra_name": nak_name,
            "pada": pada,
            "significance": desc
        }
        
    # 4. Calculate 6 Time-based Kalavelas
    if is_day_birth:
        span_seconds = (s_set - s_rise).total_seconds()
        part_seconds = span_seconds / 8.0
        start_anchor = s_rise
        day_lord_name = WEEKDAY_LORDS[weekday_idx]
        start_idx = PLANET_ORDER.index(day_lord_name)
        lord_sequence = [PLANET_ORDER[(start_idx + i) % 7] for i in range(7)] + ["None"]
    else:
        span_seconds = (next_s_rise - s_set).total_seconds()
        part_seconds = span_seconds / 8.0
        start_anchor = s_set
        day_lord_name = WEEKDAY_LORDS[weekday_idx]
        start_idx = (PLANET_ORDER.index(day_lord_name) + 4) % 7 # 5th from weekday lord
        lord_sequence = [PLANET_ORDER[(start_idx + i) % 7] for i in range(7)] + ["None"]
        
    def _compute_lagna_at(dt_moment: datetime) -> float:
        u_dt = dt_moment.astimezone(ZoneInfo("UTC"))
        t_jd = swe.julday(u_dt.year, u_dt.month, u_dt.day, u_dt.hour + u_dt.minute/60.0 + u_dt.second/3600.0)
        ayan = swe.get_ayanamsa_ut(t_jd)
        houses_res, ascmc = swe.houses(t_jd, lat, lon, b'P')
        tropical_asc = ascmc[0]
        return _normalize_degrees(tropical_asc - ayan)
        
    # Find portion index for each planet
    def _get_planet_portion_moment(planet_target: str, at_fraction: float = 0.5) -> datetime:
        try:
            p_idx = lord_sequence.index(planet_target)
        except ValueError:
            p_idx = 0
        part_start = start_anchor + timedelta(seconds=p_idx * part_seconds)
        return part_start + timedelta(seconds=part_seconds * at_fraction)

    # Kalavelas definitions
    kala_dt = _get_planet_portion_moment("Sun", 0.5)
    mrityu_dt = _get_planet_portion_moment("Mars", 0.5)
    artha_dt = _get_planet_portion_moment("Mercury", 0.5)
    yama_dt = _get_planet_portion_moment("Jupiter", 0.5)
    gulika_dt = _get_planet_portion_moment("Saturn", 0.5)
    maandi_dt = _get_planet_portion_moment("Saturn", 0.0) # Beginning of Saturn's part
    
    time_based = {}
    for name, mom_dt, desc in [
        ("Kaala", kala_dt, "Son of Sun; karmic time indicator and authority tests."),
        ("Mrityu", mrityu_dt, "Son of Mars; crisis points, surgery, and defensive vigilance."),
        ("Arthaprahaara", artha_dt, "Son of Mercury; intellectual commerce and material resources."),
        ("Yamaghantaka", yama_dt, "Son of Jupiter; benevolence, grace, and life preservation."),
        ("Gulika", gulika_dt, "Son of Saturn; highly influential karmic shadow planet."),
        ("Maandi", maandi_dt, "Root of Saturn's portion; poison-remover and decisive transition.")
    ]:
        lon_deg = _compute_lagna_at(mom_dt)
        s_idx, deg_s = _get_sign_and_deg(lon_deg)
        nak_no, nak_name, pada = _get_nakshatra_and_pada(lon_deg)
        time_based[name] = {
            "name": name,
            "longitude": round(lon_deg, 4),
            "sign": ZODIAC_SIGNS[s_idx],
            "sign_index": s_idx,
            "degree_in_sign": round(deg_s, 4),
            "nakshatra_number": nak_no,
            "nakshatra_name": nak_name,
            "pada": pada,
            "rising_time": mom_dt.isoformat(),
            "significance": desc
        }
        
    return {
        "birth_details": {
            "dob": dob_iso,
            "is_day_birth": is_day_birth,
            "weekday_lord": WEEKDAY_LORDS[weekday_idx],
            "sunrise": s_rise.isoformat(),
            "sunset": s_set.isoformat(),
            "sun_nirayana_longitude": round(sun_longitude, 4)
        },
        "sun_based_upagrahas": sun_based,
        "time_based_kalavelas": time_based,
        "all_upagrahas": {**sun_based, **time_based}
    }
