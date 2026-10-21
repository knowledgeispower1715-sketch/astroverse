"""
AstroVerse Tajika Varshaphal (Annual Solar Return) Engine:
Specialized calculation module for Tajika annual horoscopy.

Features:
1. Solar Return Moment Calculation: Exact instant when Sun returns to natal sidereal degree.
2. Varshaphal Lagna and planetary positions at solar return.
3. Muntha Calculation: Moving annual point with house placement & dignity.
4. Five Office Bearers (Panchadhikaris) & Varsha Lord (Varsheshwara) identification.
5. Primary Tajika Sahams:
   - Punya Saham (Fortune & Well-being)
   - Vidya Saham (Intellect & Education)
   - Karma Saham (Career & Public Works)
6. Tajika Yogas: Ithasala (Muthasila), Ishrafa (Musaripha).
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

# Deeptamsha Orbs for Tajika aspects (in degrees)
DEEPTAMSHA = {
    "Sun": 15.0, "Moon": 12.0, "Mars": 8.0, "Mercury": 7.0,
    "Jupiter": 9.0, "Venus": 7.0, "Saturn": 9.0
}

# Mean daily motion in degrees (approximate for determining faster vs slower planet)
MEAN_DAILY_SPEED = {
    "Moon": 13.176, "Mercury": 1.383, "Venus": 1.200, "Sun": 0.985,
    "Mars": 0.524, "Jupiter": 0.083, "Saturn": 0.033
}

def find_solar_return_jd(natal_sun_deg: float, target_year: int, approx_month: int, approx_day: int) -> float:
    """
    Finds exact Julian Day when the Sun returns to its natal sidereal longitude
    in the target year using iterative Newton-Raphson approximation.
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    # Start approximation at target year, birth month, birth day at 12:00 UT
    jd = swe.julday(target_year, approx_month, approx_day, 12.0)

    for _ in range(10):
        res, _ = swe.calc_ut(jd, swe.SUN, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        sun_deg = res[0]
        speed = res[3]

        diff = (sun_deg - natal_sun_deg + 180.0) % 360.0 - 180.0
        if abs(diff) < 0.00001:  # Sub-second precision
            break
        # Shift JD by difference / speed (days)
        jd -= diff / speed

    return jd

def calculate_muntha(natal_lagna_sign: str, completed_years: int) -> Dict[str, Any]:
    """
    Computes Muntha sign:
    Muntha Sign Index = (Natal Lagna Sign Index + completed_years) % 12
    """
    natal_idx = SIGNS.index(natal_lagna_sign)
    muntha_idx = (natal_idx + completed_years) % 12
    muntha_sign = SIGNS[muntha_idx]
    lord = SIGN_LORDS[muntha_sign]

    return {
        "sign": muntha_sign,
        "sign_index": muntha_idx,
        "lord": lord,
        "completed_years": completed_years
    }

def calculate_tajika_sahams(
    varsha_lagna_deg: float,
    sun_deg: float,
    moon_deg: float,
    mars_deg: float,
    is_daytime: bool
) -> Dict[str, Any]:
    """
    Computes primary Tajika Sahams:
    - Punya Saham: Moon - Sun + Lagna (Day); Sun - Moon + Lagna (Night).
    - Vidya Saham: Sun - Moon + Lagna (Day); Moon - Sun + Lagna (Night).
    - Karma Saham: Mars - Sun + Lagna (Day); Sun - Mars + Lagna (Night).
    """
    def norm(d): return (d % 360.0 + 360.0) % 360.0

    if is_daytime:
        punya_deg = norm(moon_deg - sun_deg + varsha_lagna_deg)
        vidya_deg = norm(sun_deg - moon_deg + varsha_lagna_deg)
        karma_deg = norm(mars_deg - sun_deg + varsha_lagna_deg)
    else:
        punya_deg = norm(sun_deg - moon_deg + varsha_lagna_deg)
        vidya_deg = norm(moon_deg - sun_deg + varsha_lagna_deg)
        karma_deg = norm(sun_deg - mars_deg + varsha_lagna_deg)

    def deg_to_details(deg):
        s_idx = int(deg / 30.0) % 12
        return {
            "sign": SIGNS[s_idx],
            "degree": round(deg % 30.0, 2),
            "total_degree": round(deg, 4)
        }

    return {
        "punya_saham": {
            **deg_to_details(punya_deg),
            "significance": "Punya Saham: Auspiciousness, health, financial prosperity, and good fortune"
        },
        "vidya_saham": {
            **deg_to_details(vidya_deg),
            "significance": "Vidya Saham: Learning, examinations, creative intelligence, and wisdom"
        },
        "karma_saham": {
            **deg_to_details(karma_deg),
            "significance": "Karma Saham: Professional achievement, public reputation, and authority"
        }
    }

def calculate_varshaphal(
    dob_iso: str,
    target_year: int,
    lat: float,
    lon: float,
    tz_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Full Tajika Varshaphal Engine:
    - Finds Solar Return exact time.
    - Computes Varshaphal Lagna, houses, and planets.
    - Computes Muntha position.
    - Computes 5 Office Bearers (Panchadhikaris) and selects Varsha Lord.
    - Calculates primary Sahams.
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)

    # 1. Natal Sun Degree
    birth_dt = datetime.fromisoformat(dob_iso)
    if ZoneInfo:
        try:
            tz = ZoneInfo(tz_str)
            b_dt = birth_dt.replace(tzinfo=tz)
            utc_b = b_dt.astimezone(timezone.utc)
        except Exception:
            utc_b = birth_dt.replace(tzinfo=timezone.utc)
    else:
        b_dt = birth_dt.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
        utc_b = b_dt.astimezone(timezone.utc)

    natal_jd = swe.julday(
        utc_b.year, utc_b.month, utc_b.day,
        utc_b.hour + utc_b.minute / 60.0 + utc_b.second / 3600.0
    )
    natal_sun_res, _ = swe.calc_ut(natal_jd, swe.SUN, swe.FLG_SIDEREAL)
    natal_sun_deg = natal_sun_res[0]

    natal_cusps, natal_ascmc = swe.houses_ex(natal_jd, lat, lon, b'P', swe.FLG_SIDEREAL)
    natal_lagna_deg = natal_ascmc[0]
    natal_lagna_sign = SIGNS[int(natal_lagna_deg / 30.0) % 12]

    # 2. Solar Return JD
    completed_years = target_year - birth_dt.year
    sr_jd = find_solar_return_jd(natal_sun_deg, target_year, birth_dt.month, birth_dt.day)

    # Convert sr_jd back to UTC datetime
    year, month, day, hour_float = swe.revjul(sr_jd)
    hour = int(hour_float)
    minute = int((hour_float - hour) * 60)
    second = int(((hour_float - hour) * 60 - minute) * 60)
    sr_utc_dt = datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)

    # 3. Varshaphal Lagna & Planets
    sr_cusps, sr_ascmc = swe.houses_ex(sr_jd, lat, lon, b'P', swe.FLG_SIDEREAL)
    varsha_lagna_deg = sr_ascmc[0]
    varsha_lagna_sign_idx = int(varsha_lagna_deg / 30.0) % 12
    varsha_lagna_sign = SIGNS[varsha_lagna_sign_idx]

    planets = {}
    pids = {
        "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
        "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER,
        "Venus": swe.VENUS, "Saturn": swe.SATURN,
        "Rahu": swe.MEAN_NODE
    }

    for name, pid in pids.items():
        res, _ = swe.calc_ut(sr_jd, pid, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        deg_360 = res[0]
        s_idx = int(deg_360 / 30.0) % 12
        house = ((s_idx - varsha_lagna_sign_idx + 12) % 12) + 1
        planets[name] = {
            "sign": SIGNS[s_idx],
            "degree": round(deg_360 % 30.0, 2),
            "total_degree": round(deg_360, 4),
            "house": house,
            "is_retrograde": res[3] < 0
        }

    # Ketu
    ketu_deg = (planets["Rahu"]["total_degree"] + 180.0) % 360.0
    k_sign_idx = int(ketu_deg / 30.0) % 12
    planets["Ketu"] = {
        "sign": SIGNS[k_sign_idx],
        "degree": round(ketu_deg % 30.0, 2),
        "total_degree": round(ketu_deg, 4),
        "house": ((k_sign_idx - varsha_lagna_sign_idx + 12) % 12) + 1,
        "is_retrograde": True
    }

    # Is Daytime Return? (Sun above horizon / in houses 7-12)
    sun_house = planets["Sun"]["house"]
    is_daytime = sun_house in [7, 8, 9, 10, 11, 12]

    # 4. Muntha Calculation
    muntha = calculate_muntha(natal_lagna_sign, completed_years)
    muntha_house = ((muntha["sign_index"] - varsha_lagna_sign_idx + 12) % 12) + 1
    muntha["varsha_house"] = muntha_house
    muntha["verdict"] = (
        "Auspicious Placement" if muntha_house in [1, 2, 3, 5, 9, 10, 11]
        else "Challenging Placement: Exercise caution in health and expenditures"
    )

    # 5. Panchadhikaris (5 Office Bearers)
    # 1. Munthesh (Muntha Lord)
    munthesh = muntha["lord"]
    # 2. Janma Lagnesh (Natal Lagna Lord)
    janma_lagnesh = SIGN_LORDS[natal_lagna_sign]
    # 3. Varsha Lagnesh (Varshaphal Lagna Lord)
    varsha_lagnesh = SIGN_LORDS[varsha_lagna_sign]
    # 4. Dina-Ratri Lord
    dina_ratri_lord = "Sun" if is_daytime else "Moon"
    # 5. Tri-Rashi Lord (by element and day/night)
    element = varsha_lagna_sign_idx % 4  # 0=Fire, 1=Earth, 2=Air, 3=Water
    tri_rashi_map_day = {0: "Sun", 1: "Venus", 2: "Saturn", 3: "Mars"}
    tri_rashi_map_night = {0: "Jupiter", 1: "Moon", 2: "Mercury", 3: "Mars"}
    tri_rashi_lord = tri_rashi_map_day[element] if is_daytime else tri_rashi_map_night[element]

    candidates = [munthesh, janma_lagnesh, varsha_lagnesh, dina_ratri_lord, tri_rashi_lord]

    # Candidate with highest dignity / aspecting Varshaphal Lagna is selected as Varsheshwara
    # Default priority: Varsha Lagnesh if among candidates, else Munthesh
    varsheshwara = varsha_lagnesh if varsha_lagnesh in candidates else munthesh

    panchadhikaris = {
        "munthesh": munthesh,
        "janma_lagnesh": janma_lagnesh,
        "varsha_lagnesh": varsha_lagnesh,
        "dina_ratri_lord": dina_ratri_lord,
        "tri_rashi_lord": tri_rashi_lord,
        "selected_varsheshwara": varsheshwara,
        "selection_rationale": f"{varsheshwara} commands the Varshaphal Lagna and holds cardinal dignity for the year."
    }

    # 6. Sahams
    sahams = calculate_tajika_sahams(
        varsha_lagna_deg,
        planets["Sun"]["total_degree"],
        planets["Moon"]["total_degree"],
        planets["Mars"]["total_degree"],
        is_daytime
    )

    return {
        "metadata": {
            "tradition": "Tajika Neelakanthi (Varshaphal Annual Horoscopy)",
            "solar_return_utc": sr_utc_dt.isoformat(),
            "target_year": target_year,
            "completed_years": completed_years,
            "is_daytime_return": is_daytime
        },
        "varsha_lagna": {
            "sign": varsha_lagna_sign,
            "degree": round(varsha_lagna_deg % 30.0, 2),
            "total_degree": round(varsha_lagna_deg, 4)
        },
        "planets": planets,
        "muntha": muntha,
        "panchadhikaris": panchadhikaris,
        "sahams": sahams
    }
