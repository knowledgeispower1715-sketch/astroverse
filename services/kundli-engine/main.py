from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, date
import urllib.request
import urllib.parse
import json

from ephemeris import calculate_kundli
from hora_engine import calculate_sun_times, calculate_24h_horas
from dasha_engine import calculate_vimshottari_dasha
from divisional_charts import (
    calculate_navamsha,
    calculate_dashamsha,
    calculate_moon_chart,
    calculate_chalit_chart
)
from doshas_and_remedies import analyze_doshas_and_remedies
from matchmaking import match_kundli_36_gunas
from ai_astrologer import generate_astrological_reading, generate_structured_prediction
from external_api import (
    fetch_external_planets,
    fetch_external_chart_url,
    fetch_external_navamsa,
    fetch_external_vedic_chart,
    fetch_external_visual_chart,
    get_api_key
)
from prokerala_api import (
    get_access_token,
    get_prokerala_planet_position,
    get_prokerala_kundli,
    get_prokerala_panchang
)

app = FastAPI(
    title="Astroverse Engine - High-Precision Vedic Astrology & Ephemeris Service",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BirthDetails(BaseModel):
    dob: str = Field(..., description="ISO 8601 birth datetime, e.g. '1995-06-15T10:30:00'")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude")
    timezone: str = Field("Asia/Kolkata", description="IANA Timezone Identifier")
    unknown_time: bool = Field(False, description="Flag indicating if birth time is unknown")

class AIQuestionRequest(BaseModel):
    category: str = Field("career", description="Category: career, marriage, wealth, health, general")
    question: str = Field(..., description="User's query")
    dob: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    timezone: str = "Asia/Kolkata"
    time_horizon: str = Field("daily", description="hourly, daily, weekly, monthly, yearly, mahadasha")
    astrologer_name: Optional[str] = Field(None, description="Astrologer persona name")

class MatchmakingRequest(BaseModel):
    boy_moon_sign_idx: Optional[int] = Field(None, ge=0, le=11)
    girl_moon_sign_idx: Optional[int] = Field(None, ge=0, le=11)
    boy_moon_degree: Optional[float] = None
    girl_moon_degree: Optional[float] = None

class PredictionRequest(BaseModel):
    horizon: str = Field("hourly", description="hourly, weekly, monthly, yearly")
    target_date: Optional[str] = Field(None, description="ISO target date string, e.g. '2026-10-21'")
    dob: Optional[str] = Field(None, description="ISO 8601 birth datetime, e.g. '1995-06-15T10:30:00'")
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Latitude")
    lon: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Longitude")
    timezone: str = Field("Asia/Kolkata", description="IANA Timezone Identifier")
    active_hora_planet: Optional[str] = Field(None, description="Active planetary hora ruler")
    hora_window: Optional[str] = Field(None, description="Hora time window string")
    category: str = Field("general", description="Category: general, career, wealth, health, relationships")

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "kundli-engine",
        "engine_version": "2.1.0",
        "ephemeris_engine": "Swiss Ephemeris (pyswisseph 2.10.3.2) + FreeAstrologyAPI",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/admin/health")
def admin_health_check():
    """
    Operational Diagnostics & Management Intelligence (Section 11):
    Tracks Swiss Ephemeris, FreeAstrologyAPI connection, Geocoding provider, and engine health.
    """
    # 1. Test FreeAstrologyAPI connectivity
    api_key_configured = bool(get_api_key())
    external_api_status = "UNKNOWN"
    try:
        ext_res = fetch_external_planets(2026, 1, 1, 12, 0, 0, 28.6139, 77.2090, 5.5)
        if ext_res.get("statusCode") == 200:
            external_api_status = "HEALTHY"
        else:
            external_api_status = f"DEGRADED_{ext_res.get('error', 'ERR')}"
    except Exception as e:
        external_api_status = f"FAILED_{str(e)[:30]}"

    # 2. Test Swiss Ephemeris native calculations
    swe_status = "HEALTHY"
    try:
        s_rise, s_set, s_next = calculate_sun_times(date.today(), 28.6139, 77.2090, "Asia/Kolkata")
    except Exception as e:
        swe_status = f"FAILED_{str(e)[:30]}"

    # 3. Geocoding provider status
    geo_status = "HEALTHY"
    try:
        test_url = "https://geocoding-api.open-meteo.com/v1/search?name=Delhi&count=1&format=json"
        req = urllib.request.Request(test_url, headers={"User-Agent": "Astroverse-HealthCheck/1.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            if r.status != 200:
                geo_status = f"HTTP_{r.status}"
    except Exception as e:
        geo_status = f"DEGRADED_{str(e)[:30]}"

    # 4. Prokerala API status
    prokerala_status = "UNKNOWN"
    try:
        token = get_access_token()
        if token and len(token) > 10:
            prokerala_status = "HEALTHY"
        else:
            prokerala_status = "NO_TOKEN"
    except Exception as e:
        prokerala_status = f"FAILED_{str(e)[:30]}"

    return {
        "status": "OPERATIONAL",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "swiss_ephemeris_engine": {
                "status": swe_status,
                "version": "2.10.3.2",
                "ayanamsha": "Lahiri (SE_SIDM_LAHIRI)"
            },
            "free_astro_api": {
                "status": external_api_status,
                "api_key_configured": api_key_configured,
                "endpoint": "https://api.freeastroapi.com"
            },
            "prokerala_api": {
                "status": prokerala_status,
                "auth_type": "OAuth 2.0 Bearer",
                "endpoint": "https://api.prokerala.com/v2/astrology"
            },
            "geocoding_provider": {
                "status": geo_status,
                "provider": "Open-Meteo Geocoding",
                "rate_limit": "Free / Fair-Use Global"
            }
        }
    }

@app.get("/api/geocode")
def geocode_location(q: str = Query(..., min_length=2, description="City, town, or region query")):
    """
    Location Intelligence Autocomplete (Section 3):
    Proxies queries to Open-Meteo Geocoding API with error handling and disambiguation.
    """
    encoded_q = urllib.parse.quote(q)
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded_q}&count=10&language=en&format=json"
    req = urllib.request.Request(url, headers={"User-Agent": "Astroverse-Geocoding/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode("utf-8"))
            results = data.get("results", [])
            formatted = []
            for r in results:
                name = r.get("name", "")
                admin1 = r.get("admin1", "")
                country = r.get("country", "")
                tz = r.get("timezone", "UTC")
                display_parts = [p for p in [name, admin1, country] if p]
                display_name = ", ".join(display_parts)
                formatted.append({
                    "id": r.get("id"),
                    "name": name,
                    "display_name": display_name,
                    "latitude": r.get("latitude"),
                    "longitude": r.get("longitude"),
                    "country": country,
                    "region": admin1,
                    "timezone": tz
                })
            return {"query": q, "results": formatted}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoding service unavailable: {str(e)}")

@app.post("/api/kundli")
def get_base_kundli(req: BirthDetails):
    """Calculates D1 Lagna, 9 planetary longitudes, Nakshatras & Panchang."""
    return calculate_kundli(req.dob, req.lat, req.lon, req.timezone)

@app.post("/api/complete-kundli")
@app.post("/api/kundli/calculate")
def get_complete_kundli(req: BirthDetails):
    """
    Computes full Vedic profile:
    - D1 Lagna Chart
    - D9 Navamsha Chart
    - D10 Dashamsha Career Chart
    - Moon Chart (Chandra Lagna)
    - Bhava Chalit Chart
    - Complete Vimshottari Dasha with Antardashas
    - Advanced Manglik, Kaal Sarp & Shani Sade Sati analysis
    """
    d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
    lagna_total_deg = d1["lagna"]["total_degree"]

    d9 = calculate_navamsha(d1["planets"], lagna_total_deg)
    d10 = calculate_dashamsha(d1["planets"], lagna_total_deg)
    moon_chart = calculate_moon_chart(d1["planets"])
    chalit = calculate_chalit_chart(d1["planets"], lagna_total_deg)

    SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    moon_sign_idx = SIGNS.index(d1["planets"]["Moon"]["sign"])
    moon_abs_deg = (moon_sign_idx * 30.0) + d1["planets"]["Moon"]["degree"]

    dashas = calculate_vimshottari_dasha(moon_abs_deg, datetime.fromisoformat(req.dob))
    doshas = analyze_doshas_and_remedies(d1["planets"], d1["lagna"]["sign"])

    return {
        "d1_rashi_chart": d1,
        "d9_navamsha_chart": d9,
        "d10_dashamsha_chart": d10,
        "moon_chart": moon_chart,
        "chalit_chart": chalit,
        "vimshottari_dasha": dashas,
        "doshas_and_remedies": doshas
    }

@app.get("/api/hourly-predictions")
@app.get("/api/hora")
def get_hourly_predictions(
    date_str: Optional[str] = None,
    lat: float = 28.6139,
    lon: float = 77.2090,
    timezone: str = "Asia/Kolkata",
    current_instant: Optional[str] = None
):
    """
    Calculates authentic 24-hour planetary Horas, Rahu Kaal, and Yamaganda (Section 5)
    using exact solar sunrise and sunset computed via Swiss Ephemeris for the given location & date.
    """
    try:
        target_date = date.fromisoformat(date_str) if date_str else date.today()
    except Exception:
        target_date = date.today()

    sunrise_dt, sunset_dt, next_sunrise_dt = calculate_sun_times(
        target_date=target_date,
        latitude=lat,
        longitude=lon,
        tz_name=timezone
    )

    curr_dt = None
    if current_instant:
        try:
            curr_dt = datetime.fromisoformat(current_instant)
        except Exception:
            curr_dt = None

    horas_data = calculate_24h_horas(
        sunrise_dt=sunrise_dt,
        sunset_dt=sunset_dt,
        next_sunrise_dt=next_sunrise_dt,
        current_dt=curr_dt
    )

    return {
        "date": target_date.isoformat(),
        "latitude": lat,
        "longitude": lon,
        "timezone": timezone,
        **horas_data
    }

@app.post("/api/ai-astrologer/ask")
def ask_ai_astrologer(req: AIQuestionRequest):
    """
    AI Astrologer Guru (Section 7):
    Personalization-gated reading grounded in calculated birth chart, active dasha, and transits.
    """
    if req.dob and req.lat is not None and req.lon is not None:
        # Personalized calculation-grounded path
        d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
        SIGNS = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]
        moon_sign_idx = SIGNS.index(d1["planets"]["Moon"]["sign"])
        moon_abs_deg = (moon_sign_idx * 30.0) + d1["planets"]["Moon"]["degree"]

        dashas = calculate_vimshottari_dasha(moon_abs_deg, datetime.fromisoformat(req.dob))
        doshas = analyze_doshas_and_remedies(d1["planets"], d1["lagna"]["sign"])

        reading = generate_astrological_reading(
            category=req.category,
            user_query=req.question,
            kundli=d1,
            dasha=dashas,
            doshas=doshas,
            time_horizon=req.time_horizon,
            astrologer_name=req.astrologer_name
        )
        return {
            "mode": "PERSONALIZED_CHART_GROUNDED",
            "profile_loaded": True,
            "category": req.category,
            "reading": reading
        }
    else:
        # General astrological guidance path (clearly labeled as unpersonalized)
        general_reading = {
            "executive_summary": "General Vedic Transit Guidance (No Birth Chart Loaded)",
            "analysis": f"Regarding your question about {req.category}: In universal planetary transit analysis, Saturn transiting sidereal Pisces advises steadfast discipline, while Jupiter in Gemini supports structured intellectual communications. For personal house lordship and Dasha timing, please calculate or select your Janam Kundli.",
            "career_guidance": "Focus on high-leverage execution during Mercury and Jupiter Horas of the day.",
            "remedial_measures": "Chant the Gayatri Mantra or Aditya Hridaya Stotra at sunrise for mental clarity.",
            "time_horizon": req.time_horizon,
            "disclaimer": "This is a general transit interpretation. Save your birth profile to unlock 100% chart-grounded Parashari analysis."
        }
        return {
            "mode": "GENERAL_TRANSIT_UNPERSONALIZED",
            "profile_loaded": False,
            "category": req.category,
            "reading": general_reading
        }

@app.post("/api/predictions/generate")
def generate_prediction_endpoint(req: PredictionRequest):
    """
    Structured Personalized Prediction API:
    Generates standardized 7-section prediction reports (A. Overall Outlook,
    B. Supportive Developments, C. Challenges/Cautions, D. Relevant Time Windows,
    E. Why This Applies, F. Practical Reflection, G. Limitations)
    for Hourly, Weekly, Monthly, and Yearly horizons grounded in Parashari Jyotish.
    """
    target_date_str = req.target_date or date.today().isoformat()

    if req.dob and req.lat is not None and req.lon is not None:
        d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
        SIGNS = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]
        moon_sign_idx = SIGNS.index(d1["planets"]["Moon"]["sign"])
        moon_abs_deg = (moon_sign_idx * 30.0) + d1["planets"]["Moon"]["degree"]

        dashas = calculate_vimshottari_dasha(moon_abs_deg, datetime.fromisoformat(req.dob))
        doshas = analyze_doshas_and_remedies(d1["planets"], d1["lagna"]["sign"])

        result = generate_structured_prediction(
            horizon=req.horizon,
            target_date_str=target_date_str,
            kundli=d1,
            dasha=dashas,
            doshas=doshas,
            active_hora_planet=req.active_hora_planet,
            hora_window=req.hora_window,
            category=req.category
        )
        result["mode"] = "PERSONALIZED_CHART_GROUNDED"
        result["profile_loaded"] = True
        return result
    else:
        # Fallback for guest users without birth profile
        default_kundli = {
            "profile_name": "Guest Seeker",
            "lagna": {"sign": "Aries", "degree": 15.0},
            "planets": {
                "Moon": {"sign": "Taurus", "nakshatra": "Rohini", "degree": 10.0, "house": 2},
                "Sun": {"sign": "Libra", "nakshatra": "Swati", "degree": 5.0, "house": 7},
                "Jupiter": {"sign": "Gemini", "degree": 18.0, "house": 3},
                "Saturn": {"sign": "Pisces", "degree": 22.0, "house": 12}
            }
        }
        default_dasha = {
            "active_now": {
                "maha_dasha": "Jupiter",
                "antar_dasha": "Saturn"
            }
        }
        default_doshas = {
            "sade_sati": {"phase": "Generic Transit"},
            "manglik": {"is_manglik": False}
        }
        result = generate_structured_prediction(
            horizon=req.horizon,
            target_date_str=target_date_str,
            kundli=default_kundli,
            dasha=default_dasha,
            doshas=default_doshas,
            active_hora_planet=req.active_hora_planet,
            hora_window=req.hora_window,
            category=req.category
        )
        result["mode"] = "GENERAL_TRANSIT_UNPERSONALIZED"
        result["profile_loaded"] = False
        result["sections"]["limitations"] = (
            "This prediction is an unpersonalized transit baseline because no birth chart was loaded. "
            "Sign in and calculate your Janam Kundli to unlock 100% chart-grounded Parashari predictions."
        )
        return result


@app.post("/api/matchmaking")
@app.post("/api/kundli/matching")
def get_matchmaking(req: MatchmakingRequest):
    """
    Ashtakoota 36-Guna Matchmaking (Section 8):
    Computes all 8 Kootas strictly summing to <= 36.0 with Nadi & Bhakoot Dosha evaluation.
    """
    if req.boy_moon_degree is not None and req.girl_moon_degree is not None:
        boy_deg = req.boy_moon_degree
        girl_deg = req.girl_moon_degree
    elif req.boy_moon_sign_idx is not None and req.girl_moon_sign_idx is not None:
        # Midpoint of sign (15 degrees into sign)
        boy_deg = (req.boy_moon_sign_idx * 30.0) + 15.0
        girl_deg = (req.girl_moon_sign_idx * 30.0) + 15.0
    else:
        raise HTTPException(
            status_code=400,
            detail="Either moon degrees or both moon signs must be explicitly selected."
        )

    return match_kundli_36_gunas(boy_deg, girl_deg)

@app.post("/api/external-kundli")
def get_external_kundli(req: BirthDetails):
    """
    FreeAstroAPI Integration:
    Queries third-party ephemeris and returns planetary coordinates alongside SVG chart URLs.
    """
    dt = datetime.fromisoformat(req.dob)

    chart_data = fetch_external_vedic_chart(
        year=dt.year, month=dt.month, day=dt.day,
        hour=dt.hour, minute=dt.minute,
        lat=req.lat, lng=req.lon, tz_str=req.timezone
    )

    svg_data = fetch_external_visual_chart(
        year=dt.year, month=dt.month, day=dt.day,
        hour=dt.hour, minute=dt.minute,
        lat=req.lat, lng=req.lon, tz_str=req.timezone,
        chart_style="north_indian"
    )

    return {
        "provider": "FreeAstroAPI",
        "chart": chart_data,
        "svg": svg_data
    }

# ==================== PROKERALA API V2 ENDPOINTS ====================

@app.get("/api/prokerala/planet-position")
def prokerala_planet_position(
    datetime_str: str = Query(..., alias="datetime", description="ISO 8601 datetime with tz offset, e.g. 2005-08-20T14:05:00+05:30"),
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    ayanamsa: int = Query(1, description="1 = Lahiri")
):
    """Prokerala API v2: Planetary Longitudes & Rashi placements."""
    return get_prokerala_planet_position(datetime_str, lat, lon, ayanamsa)

@app.get("/api/prokerala/kundli")
def prokerala_kundli(
    datetime_str: str = Query(..., alias="datetime", description="ISO 8601 datetime with tz offset"),
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    ayanamsa: int = Query(1)
):
    """Prokerala API v2: Nakshatra details, Mangal dosha, and Yogas."""
    return get_prokerala_kundli(datetime_str, lat, lon, ayanamsa)

@app.get("/api/prokerala/panchang")
def prokerala_panchang(
    datetime_str: str = Query(..., alias="datetime", description="ISO 8601 datetime with tz offset"),
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    ayanamsa: int = Query(1)
):
    """Prokerala API v2: Complete Vedic Panchang (Tithi, Vaara, Nakshatra, Yoga, Karana)."""
    return get_prokerala_panchang(datetime_str, lat, lon, ayanamsa)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
