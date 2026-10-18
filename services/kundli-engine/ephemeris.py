import swisseph as swe
from datetime import datetime
import pytz

PLANETS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
    "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS, "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE
}

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
         "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

def calculate_kundli(dob_iso: str, lat: float, lon: float, tz_str: str = "Asia/Kolkata"):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    tz = pytz.timezone(tz_str)
    dt = tz.localize(datetime.fromisoformat(dob_iso))
    utc_dt = dt.astimezone(pytz.utc)

    # Julian Day calculation
    jd_ut = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day,
                       utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0)

    # Ascendant (Lagna) & Houses (Bhavas)
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b'P', swe.FLG_SIDEREAL)
    lagna_deg = ascmc[0]
    lagna_sign_idx = int(lagna_deg / 30)

    planets = {}
    for name, pid in PLANETS.items():
        res, _ = swe.calc_ut(jd_ut, pid, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        deg, speed = res[0], res[3]
        sign_idx = int(deg / 30)
        house = ((sign_idx - lagna_sign_idx) % 12) + 1
        nak_idx = int(deg / (360.0 / 27.0))
        pada = int((deg % (360.0 / 27.0)) / (360.0 / 108.0)) + 1

        planets[name] = {
            "degree": round(deg % 30, 2),
            "sign": SIGNS[sign_idx],
            "house": house,
            "nakshatra": NAKSHATRAS[nak_idx],
            "pada": pada,
            "is_retrograde": speed < 0
        }

    # Ketu (180 opposite Rahu)
    rahu_deg = planets["Rahu"]["degree"]
    ketu_house = ((planets["Rahu"]["house"] + 5) % 12) + 1
    planets["Ketu"] = {
        "degree": rahu_deg,
        "sign": SIGNS[(SIGNS.index(planets["Rahu"]["sign"]) + 6) % 12],
        "house": ketu_house,
        "nakshatra": NAKSHATRAS[(NAKSHATRAS.index(planets["Rahu"]["nakshatra"]) + 13) % 27],
        "pada": planets["Rahu"]["pada"],
        "is_retrograde": True
    }

    # Yogas & Doshas
    is_manglik = planets["Mars"]["house"] in [1, 4, 7, 8, 12]
    has_gajakesari = abs(planets["Jupiter"]["house"] - planets["Moon"]["house"]) in [0, 3, 6, 9]

    return {
        "lagna": {"sign": SIGNS[lagna_sign_idx], "degree": round(lagna_deg % 30, 2)},
        "planets": planets,
        "doshas": {"manglik": is_manglik},
        "yogas": {"gajakesari": has_gajakesari}
    }
