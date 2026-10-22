from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
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
from matchmaking import match_kundli_36_gunas, calculate_full_kundli_milan
from ai_astrologer import generate_astrological_reading, generate_structured_prediction
from jaimini_engine import analyze_jaimini_system
from kp_engine import calculate_kp_chart
from tajika_engine import calculate_varshaphal
from panchang_engine import calculate_full_panchang
from shadbala_and_yogas import detect_classical_yogas, calculate_shadbala
from multi_method_engine import build_multi_method_comparison
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

class PartnerBirthProfile(BaseModel):
    name: Optional[str] = "Partner"
    dob: str = Field(..., description="ISO 8601 birth datetime, e.g. '1995-06-15T10:30:00'")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude")
    timezone: str = Field("Asia/Kolkata", description="IANA Timezone Identifier")

class MatchmakingRequest(BaseModel):
    boy: Optional[PartnerBirthProfile] = None
    girl: Optional[PartnerBirthProfile] = None
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

class TajikaRequest(BirthDetails):
    target_year: Optional[int] = Field(None, description="Target year for solar return calculation, e.g. 2026")

class MultiMethodRequest(BirthDetails):
    target_year: Optional[int] = Field(None, description="Target year for annual comparison, e.g. 2026")

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
    yogas = detect_classical_yogas(d1["planets"], d1["lagna"]["sign"])
    shadbala = calculate_shadbala(d1["planets"], d1["lagna"]["sign"])

    return {
        "d1_rashi_chart": d1,
        "d9_navamsha_chart": d9,
        "d10_dashamsha_chart": d10,
        "moon_chart": moon_chart,
        "chalit_chart": chalit,
        "vimshottari_dasha": dashas,
        "doshas_and_remedies": doshas,
        "yogas": yogas,
        "shadbala": shadbala
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
    Strictly preserves Vedic solar-day boundaries (sunrise-to-sunrise).
    """
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90, longitude between -180 and 180.")

    try:
        tz_obj = ZoneInfo(timezone)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid IANA timezone: '{timezone}'")

    if current_instant:
        try:
            curr_dt = datetime.fromisoformat(current_instant)
            if curr_dt.tzinfo is None:
                curr_dt = curr_dt.replace(tzinfo=tz_obj)
            else:
                curr_dt = curr_dt.astimezone(tz_obj)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid current_instant format: {str(e)}")
    else:
        curr_dt = datetime.now(tz_obj)

    queried_date: Optional[date] = None
    if date_str:
        try:
            queried_date = date.fromisoformat(date_str)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid date_str format. Expected YYYY-MM-DD: {str(e)}")

    # Distinguish active Hora request for the current instant vs explicit distinct historical/future calendar date
    if queried_date is None or queried_date == curr_dt.date():
        # In Vedic solar reckoning, a solar cycle runs from sunrise(D) to sunrise(D+1).
        # Determine whether curr_dt precedes today's sunrise:
        s_rise, s_set, s_next = calculate_sun_times(curr_dt.date(), lat, lon, timezone)
        if curr_dt < s_rise:
            # Pre-sunrise: belongs to the preceding day's nocturnal solar cycle
            target_date = curr_dt.date() - timedelta(days=1)
            sunrise_dt, sunset_dt, next_sunrise_dt = calculate_sun_times(target_date, lat, lon, timezone)
        elif curr_dt >= s_next:
            target_date = curr_dt.date() + timedelta(days=1)
            sunrise_dt, sunset_dt, next_sunrise_dt = calculate_sun_times(target_date, lat, lon, timezone)
        else:
            target_date = curr_dt.date()
            sunrise_dt, sunset_dt, next_sunrise_dt = s_rise, s_set, s_next
    else:
        # Explicit distinct calendar date requested
        target_date = queried_date
        sunrise_dt, sunset_dt, next_sunrise_dt = calculate_sun_times(target_date, lat, lon, timezone)

    horas_data = calculate_24h_horas(
        sunrise_dt=sunrise_dt,
        sunset_dt=sunset_dt,
        next_sunrise_dt=next_sunrise_dt,
        current_dt=curr_dt
    )

    now_epoch_ms = int(datetime.now(ZoneInfo("UTC")).timestamp() * 1000)

    return {
        "date": target_date.isoformat(),
        "latitude": lat,
        "longitude": lon,
        "timezone": timezone,
        "planet": horas_data.get("planet"),
        "category": horas_data.get("category"),
        "start_epoch_ms": horas_data.get("start_epoch_ms"),
        "end_epoch_ms": horas_data.get("end_epoch_ms"),
        "server_now_epoch_ms": horas_data.get("server_now_epoch_ms", now_epoch_ms),
        "source": "swiss_ephemeris",
        "calculation_method": "traditional_chaldean_solar_hours",
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
        # Canonical unpersonalized transit baseline for guest users without birth profile
        result = generate_structured_prediction(
            horizon=req.horizon,
            target_date_str=target_date_str,
            kundli=None,
            dasha=None,
            doshas=None,
            active_hora_planet=req.active_hora_planet,
            hora_window=req.hora_window,
            category=req.category
        )
        result["mode"] = "GENERAL_TRANSIT_UNPERSONALIZED"
        result["profile_loaded"] = False
        result["sections"]["limitations"] = (
            "This prediction is an unpersonalized transit baseline because no birth chart was loaded. "
            "Enter your birth details or sign in to calculate your Janam Kundli for 100% chart-grounded Parashari predictions."
        )
        return result


@app.post("/api/matchmaking")
@app.post("/api/kundli/matching")
def get_matchmaking(req: MatchmakingRequest):
    """
    Ashtakoota 36-Guna Matchmaking:
    Supports full dual birth profiles with independent Swiss Ephemeris calculations,
    or legacy Moon degree/sign inputs.
    """
    if req.boy and req.girl:
        return calculate_full_kundli_milan(req.boy.dict(), req.girl.dict())

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
            detail="Either complete birth profiles for boy and girl or moon particulars must be provided."
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

# ==================== ADVANCED METHODOLOGY MODULES ====================

@app.get("/api/panchang/calculate")
def get_panchang_calculation(
    date_str: Optional[str] = Query(None, alias="date", description="Target date YYYY-MM-DD"),
    lat: float = Query(28.6139, ge=-90.0, le=90.0),
    lon: float = Query(77.2090, ge=-180.0, le=180.0),
    timezone: str = Query("Asia/Kolkata")
):
    """
    Computes authentic Vedic Panchang (5 Limbs) & Muhurtas:
    - Tithi, Vara, Nakshatra, Yoga, Karana
    - Solar Sunrise, Sunset, Day Length
    - Rahu Kaal, Yamaganda, Gulika Kaal
    - Abhijit Muhurta & Brahma Muhurta
    """
    target = date_str or date.today().isoformat()
    return calculate_full_panchang(target, lat, lon, timezone)

@app.post("/api/jaimini/calculate")
def get_jaimini_calculation(req: BirthDetails):
    """
    Computes Jaimini Astrology analysis:
    - 7 Chara Karakas (AK, AmK, BK, MK, PK, GK, DK)
    - Arudha Lagna (AL) & 12 Bhava Arudhas with cancellation rules
    - Upapada Lagna (UL)
    - Rashi Drishti (Sign Aspects)
    - Chara Dasha progression
    """
    d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
    return analyze_jaimini_system(d1["planets"], d1["lagna"]["sign"])

@app.post("/api/kp/calculate")
def get_kp_calculation(req: BirthDetails):
    """
    Computes Krishnamurti Padhdhati (KP System) analysis:
    - KP Ayanamsha (swe.SIDM_KRISHNAMURTI)
    - Placidus Semi-Arc unequal house cusps
    - 249-Sub table with Star-Lord & Sub-Lord hierarchy
    - 4-Fold Significators (Levels A, B, C, D)
    """
    return calculate_kp_chart(req.dob, req.lat, req.lon, req.timezone)

@app.post("/api/tajika/varshaphal")
def get_tajika_varshaphal(req: TajikaRequest):
    """
    Computes Tajika Varshaphal (Annual Solar Return):
    - Exact instant when transiting Sun returns to natal sidereal degree
    - Varshaphal Lagna & Planetary positions
    - Moving Muntha calculation
    - 5 Office Bearers (Panchadhikaris) & Varsheshwara (Year Lord)
    - Major Sahams (Punya, Vidya, Karma)
    """
    target_year = req.target_year or datetime.now().year
    return calculate_varshaphal(req.dob, target_year, req.lat, req.lon, req.timezone)

@app.post("/api/astrology/multi-method-comparison")
def get_multi_method_comparison(req: MultiMethodRequest):
    """
    Phase 7 Explainable Multi-Method Astrological Comparison:
    Synthesizes and compares findings across Parashari, Jaimini, KP, and Tajika.
    Discloses points of agreement, points of divergence, technical rationale, and limitations.
    """
    # 1. Parashari
    d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
    signs = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    moon_sign_idx = signs.index(d1["planets"]["Moon"]["sign"])
    moon_abs_deg = (moon_sign_idx * 30.0) + d1["planets"]["Moon"]["degree"]
    dashas = calculate_vimshottari_dasha(moon_abs_deg, datetime.fromisoformat(req.dob))

    # 2. Jaimini
    jaimini = analyze_jaimini_system(d1["planets"], d1["lagna"]["sign"])

    # 3. KP
    kp = calculate_kp_chart(req.dob, req.lat, req.lon, req.timezone)

    # 4. Tajika
    target_year = req.target_year or datetime.now().year
    tajika = calculate_varshaphal(req.dob, target_year, req.lat, req.lon, req.timezone)

    return build_multi_method_comparison(d1, dashas, jaimini, kp, tajika)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
