import swisseph as swe
from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

try:
    import pytz
except ImportError:
    pytz = None

PLANETS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
    "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS, "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE
}

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]
ZODIAC_SIGNS = SIGNS

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
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
    "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti (Bhadra)",
    "Shakuni", "Chatushpada", "Naga", "Kintughna"
]

def calculate_kundli(dob_iso: str, lat: float = 28.6139, lon: float = 77.2090, tz_str: str = "Asia/Kolkata"):
    """
    Computes high-precision Sidereal Vedic planetary longitudes, Ascendant,
    houses, Nakshatras, Jaimini Karakas, and complete Janam Panchang.
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    parsed_dt = datetime.fromisoformat(dob_iso)

    if ZoneInfo:
        try:
            tz = ZoneInfo(tz_str)
            dt = parsed_dt.replace(tzinfo=tz)
            utc_dt = dt.astimezone(timezone.utc)
        except Exception:
            utc_dt = parsed_dt.replace(tzinfo=timezone.utc)
    elif pytz:
        tz = pytz.timezone(tz_str)
        dt = tz.localize(parsed_dt)
        utc_dt = dt.astimezone(pytz.utc)
    else:
        # Default IST (+5:30) offset
        dt = parsed_dt.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
        utc_dt = dt.astimezone(timezone.utc)

    # Julian Day in UT
    jd_ut = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    )

    # Ascendant (Lagna) & Houses
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b'P', swe.FLG_SIDEREAL)
    lagna_deg = ascmc[0]
    lagna_sign_idx = int(lagna_deg / 30.0) % 12
    lagna_nak_idx = int(lagna_deg / (360.0 / 27.0)) % 27
    lagna_pada = int((lagna_deg % (360.0 / 27.0)) / (360.0 / 108.0)) + 1

    planets = {}
    raw_longitudes = {}

    for name, pid in PLANETS.items():
        res, _ = swe.calc_ut(jd_ut, pid, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        deg_360, speed = res[0], res[3]
        raw_longitudes[name] = deg_360

        sign_idx = int(deg_360 / 30.0) % 12
        house = ((sign_idx - lagna_sign_idx + 12) % 12) + 1
        nak_idx = int(deg_360 / (360.0 / 27.0)) % 27
        pada = int((deg_360 % (360.0 / 27.0)) / (360.0 / 108.0)) + 1
        deg_in_sign = deg_360 % 30.0

        planets[name] = {
            "degree": round(deg_in_sign, 2),
            "sign": SIGNS[sign_idx],
            "sign_index": sign_idx,
            "house": house,
            "nakshatra": NAKSHATRAS[nak_idx],
            "nakshatra_lord": NAKSHATRA_LORDS[nak_idx],
            "pada": pada,
            "is_retrograde": speed < 0,
            "absolute_degree": round(deg_360, 4)
        }

    # Ketu (True 180° opposite of Rahu)
    rahu_abs = raw_longitudes["Rahu"]
    ketu_abs = (rahu_abs + 180.0) % 360.0
    raw_longitudes["Ketu"] = ketu_abs
    ketu_sign_idx = int(ketu_abs / 30.0) % 12
    ketu_house = ((ketu_sign_idx - lagna_sign_idx + 12) % 12) + 1
    ketu_nak_idx = int(ketu_abs / (360.0 / 27.0)) % 27
    ketu_pada = int((ketu_abs % (360.0 / 27.0)) / (360.0 / 108.0)) + 1

    planets["Ketu"] = {
        "degree": round(ketu_abs % 30.0, 2),
        "sign": SIGNS[ketu_sign_idx],
        "sign_index": ketu_sign_idx,
        "house": ketu_house,
        "nakshatra": NAKSHATRAS[ketu_nak_idx],
        "nakshatra_lord": NAKSHATRA_LORDS[ketu_nak_idx],
        "pada": ketu_pada,
        "is_retrograde": True,
        "absolute_degree": round(ketu_abs, 4)
    }

    # Jaimini 7 Chara Karakas
    seven_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    sorted_by_deg = sorted(seven_planets, key=lambda p: planets[p]["degree"], reverse=True)
    karaka_names = [
        "Atmakaraka (AK)", "Amatyakaraka (AmK)", "Bhratrikaraka (BK)",
        "Matrikaraka (MK)", "Putrakaraka (PK)", "Gnatikaraka (GK)", "Darakaraka (DK)"
    ]
    for idx, p_name in enumerate(sorted_by_deg):
        planets[p_name]["karaka"] = karaka_names[idx]
    planets["Rahu"]["karaka"] = "Stree/Secondary Karaka"
    planets["Ketu"]["karaka"] = "Moksha Karaka"

    # Panchang calculations
    sun_lon = raw_longitudes["Sun"]
    moon_lon = raw_longitudes["Moon"]

    # Tithi: 12 degrees of difference
    diff_deg = (moon_lon - sun_lon + 360.0) % 360.0
    tithi_idx = int(diff_deg / 12.0) % 30
    tithi_name = TITHIS[tithi_idx]

    # Yoga: sum of longitudes in 27 parts
    yoga_deg = (sun_lon + moon_lon) % 360.0
    yoga_idx = int(yoga_deg / (360.0 / 27.0)) % 27
    yoga_name = YOGAS[yoga_idx]

    # Karana: half of a Tithi (6 degrees)
    karana_num = int(diff_deg / 6.0)
    if karana_num == 0:
        karana_name = "Kintughna"
    elif karana_num >= 57:
        fixed_idx = karana_num - 57
        fixed_karanas = ["Shakuni", "Chatushpada", "Naga"]
        karana_name = fixed_karanas[min(fixed_idx, 2)]
    else:
        karana_name = KARANAS[(karana_num - 1) % 7]

    # Vaar (Vedic Weekday reckoned from local sunrise)
    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    try:
        from hora_engine import calculate_sun_times
        ref_date = dt.date()
        s_rise, _, _ = calculate_sun_times(ref_date, lat, lon, tz_str)
        if dt < s_rise:
            # Birth occurred prior to local sunrise -> belongs to preceding Vedic day
            prev_date = ref_date - timedelta(days=1)
            weekday_idx = prev_date.weekday()
        else:
            weekday_idx = ref_date.weekday()
    except Exception:
        weekday_idx = dt.weekday()

    vaar_name = weekdays[weekday_idx]

    # Ayanamsha value
    ayanamsha_deg = swe.get_ayanamsa_ut(jd_ut)

    return {
        "metadata": {
            "dob": dob_iso,
            "latitude": lat,
            "longitude": lon,
            "timezone": tz_str,
            "ayanamsha": "Lahiri (Chitrapaksha)",
            "ayanamsha_degree": round(ayanamsha_deg, 4),
            "julian_day": round(jd_ut, 4)
        },
        "lagna": {
            "sign": SIGNS[lagna_sign_idx],
            "sign_index": lagna_sign_idx,
            "degree": round(lagna_deg % 30.0, 2),
            "nakshatra": NAKSHATRAS[lagna_nak_idx],
            "pada": lagna_pada,
            "total_degree": round(lagna_deg, 4)
        },
        "planets": planets,
        "panchang": {
            "vaar": vaar_name,
            "tithi": tithi_name,
            "yoga": yoga_name,
            "karana": karana_name,
            "moon_nakshatra": planets["Moon"]["nakshatra"],
            "moon_pada": planets["Moon"]["pada"]
        }
    }
