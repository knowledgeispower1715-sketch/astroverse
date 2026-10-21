"""
AstroVerse Krishnamurti Padhdhati (KP System) Astrology Engine:
Specialized calculation module applying KP principles:
1. KP Ayanamsha (swe.SIDM_KRISHNAMURTI).
2. Placidus Semi-Arc Unequal House Cusp division.
3. Complete 249-Sub division table (Star-Lord & Sub-Lord hierarchy).
4. KP 4-Fold Significators (Levels A, B, C, D).
"""

from typing import Dict, Any, List, Tuple
from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

import swisseph as swe

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
}

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

VIMSHOTTARI_YEARS = {
    "Ketu": 7.0, "Venus": 20.0, "Sun": 6.0, "Moon": 10.0,
    "Mars": 7.0, "Rahu": 18.0, "Jupiter": 16.0, "Saturn": 19.0, "Mercury": 17.0
}
TOTAL_VIMSHOTTARI_YEARS = 120.0
NAKSHATRA_SPAN_DEG = 360.0 / 27.0  # 13.333333° = 13°20'

def get_sub_lord_for_degree(absolute_degree: float) -> Tuple[str, str, str, float]:
    """
    Computes (Sign Lord, Star Lord, Sub Lord, Sub Span) for any absolute ecliptic degree (0-360).
    Divides the 13°20' Nakshatra into 9 unequal sub-periods starting from the Star Lord itself.
    """
    norm_deg = ((absolute_degree % 360.0) + 360.0) % 360.0
    sign_idx = int(norm_deg / 30.0) % 12
    sign_name = SIGNS[sign_idx]
    sign_lord = SIGN_LORDS[sign_name]

    nak_idx = int(norm_deg / NAKSHATRA_SPAN_DEG) % 27
    star_name = NAKSHATRAS[nak_idx]
    star_lord = NAKSHATRA_LORDS[nak_idx % 9]

    # Degree elapsed inside this specific nakshatra
    deg_in_nak = norm_deg % NAKSHATRA_SPAN_DEG

    # Start sub-lord loop from the star lord
    start_lord_idx = NAKSHATRA_LORDS.index(star_lord)
    current_offset_deg = 0.0
    selected_sub_lord = star_lord

    for i in range(9):
        current_sub = NAKSHATRA_LORDS[(start_lord_idx + i) % 9]
        # Span = (Years / 120) * 13.333333°
        sub_span_deg = (VIMSHOTTARI_YEARS[current_sub] / TOTAL_VIMSHOTTARI_YEARS) * NAKSHATRA_SPAN_DEG
        next_offset = current_offset_deg + sub_span_deg

        if current_offset_deg <= deg_in_nak < next_offset or i == 8:
            selected_sub_lord = current_sub
            break
        current_offset_deg = next_offset

    return sign_lord, star_lord, selected_sub_lord, round(sub_span_deg, 4)

def calculate_kp_chart(
    dob_iso: str,
    lat: float,
    lon: float,
    tz_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Computes authentic KP Chart using KP Ayanamsha and Placidus Cusps:
    - Sets Swiss Ephemeris to swe.SIDM_KRISHNAMURTI.
    - Computes 12 Placidus house cusps (b'P').
    - Computes Star-Lord and Sub-Lord for each house cusp.
    - Computes Star-Lord and Sub-Lord for each planet.
    - Computes KP 4-Fold Significators.
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI)

    parsed_dt = datetime.fromisoformat(dob_iso)
    if ZoneInfo:
        try:
            tz = ZoneInfo(tz_str)
            dt = parsed_dt.replace(tzinfo=tz)
            utc_dt = dt.astimezone(timezone.utc)
        except Exception:
            utc_dt = parsed_dt.replace(tzinfo=timezone.utc)
    else:
        dt = parsed_dt.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
        utc_dt = dt.astimezone(timezone.utc)

    jd_ut = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    )

    kp_ayanamsha = swe.get_ayanamsa_ut(jd_ut)

    # Placidus Cusps with KP Sidereal Ayanamsha
    # swe.houses_ex returns (cusps, ascmc) where cusps[0..11] are house cusps
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b'P', swe.FLG_SIDEREAL)

    house_cusps = {}
    for h in range(1, 13):
        cusp_deg = cusps[h - 1]
        sign_lord, star_lord, sub_lord, _ = get_sub_lord_for_degree(cusp_deg)
        sign_idx = int(cusp_deg / 30.0) % 12
        house_cusps[h] = {
            "house": h,
            "degree": round(cusp_deg % 30.0, 2),
            "total_degree": round(cusp_deg, 4),
            "sign": SIGNS[sign_idx],
            "sign_lord": sign_lord,
            "star_lord": star_lord,
            "sub_lord": sub_lord
        }

    # Planet longitudes in KP
    kp_planets = {}
    planet_pids = {
        "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
        "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER,
        "Venus": swe.VENUS, "Saturn": swe.SATURN,
        "Rahu": swe.MEAN_NODE
    }

    raw_planet_degs = {}
    for p_name, pid in planet_pids.items():
        res, _ = swe.calc_ut(jd_ut, pid, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        deg_360 = res[0]
        raw_planet_degs[p_name] = deg_360
        sign_lord, star_lord, sub_lord, _ = get_sub_lord_for_degree(deg_360)
        sign_idx = int(deg_360 / 30.0) % 12

        # In KP, planet house is determined by Placidus cusp boundaries
        p_house = 12
        for h in range(1, 13):
            c_curr = cusps[h - 1]
            c_next = cusps[h % 12]
            if c_curr < c_next:
                if c_curr <= deg_360 < c_next:
                    p_house = h
                    break
            else:  # Crosses 0° Aries
                if deg_360 >= c_curr or deg_360 < c_next:
                    p_house = h
                    break

        kp_planets[p_name] = {
            "sign": SIGNS[sign_idx],
            "degree": round(deg_360 % 30.0, 2),
            "total_degree": round(deg_360, 4),
            "house": p_house,
            "sign_lord": sign_lord,
            "star_lord": star_lord,
            "sub_lord": sub_lord,
            "is_retrograde": res[3] < 0
        }

    # Ketu (180° opposite of Rahu)
    ketu_deg = (raw_planet_degs["Rahu"] + 180.0) % 360.0
    k_sign_lord, k_star_lord, k_sub_lord, _ = get_sub_lord_for_degree(ketu_deg)
    k_sign_idx = int(ketu_deg / 30.0) % 12
    k_house = 12
    for h in range(1, 13):
        c_curr = cusps[h - 1]
        c_next = cusps[h % 12]
        if c_curr < c_next:
            if c_curr <= ketu_deg < c_next:
                k_house = h
                break
        else:
            if ketu_deg >= c_curr or ketu_deg < c_next:
                k_house = h
                break

    kp_planets["Ketu"] = {
        "sign": SIGNS[k_sign_idx],
        "degree": round(ketu_deg % 30.0, 2),
        "total_degree": round(ketu_deg, 4),
        "house": k_house,
        "sign_lord": k_sign_lord,
        "star_lord": k_star_lord,
        "sub_lord": k_sub_lord,
        "is_retrograde": True
    }

    # Reset sidereal mode back to Lahiri default after calculation
    swe.set_sid_mode(swe.SIDM_LAHIRI)

    # 4-Fold Significators
    # Level A: Planets in star of occupant
    # Level B: Occupant of house
    # Level C: Planets in star of house lord
    # Level D: House lord
    significators = {}
    for h in range(1, 13):
        h_data = house_cusps[h]
        h_lord = h_data["sign_lord"]
        occupants = [p for p, pd in kp_planets.items() if pd["house"] == h]

        level_a = [p for p, pd in kp_planets.items() if pd["star_lord"] in occupants]
        level_b = occupants
        level_c = [p for p, pd in kp_planets.items() if pd["star_lord"] == h_lord]
        level_d = [h_lord]

        significators[h] = {
            "house": h,
            "level_a_strongest": list(set(level_a)),
            "level_b_occupants": list(set(level_b)),
            "level_c_star_of_lord": list(set(level_c)),
            "level_d_house_lord": list(set(level_d))
        }

    return {
        "metadata": {
            "tradition": "Krishnamurti Padhdhati (KP System)",
            "ayanamsha": "KP (Krishnamurti)",
            "ayanamsha_degree": round(kp_ayanamsha, 4),
            "house_system": "Placidus Semi-Arc",
            "birth_time_accuracy_requirement": "Exact birth time within 1-2 minutes required for reliable sub-lord cusps."
        },
        "house_cusps": house_cusps,
        "planets": kp_planets,
        "significators": significators
    }
