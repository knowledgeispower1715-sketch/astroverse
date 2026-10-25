from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
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
    calculate_chalit_chart,
    calculate_hora,
    calculate_drekkana,
    calculate_saptamsha,
    calculate_dwadashamsha,
    calculate_shashtyamsha,
    calculate_all_vargas
)
from ashtakavarga_engine import calculate_ashtakavarga
from timing_tools import (
    calculate_tarabala,
    calculate_chandrabala,
    get_ghataka_chakra,
    evaluate_transit_timing
)
from doshas_and_remedies import analyze_doshas_and_remedies
from matchmaking import match_kundli_36_gunas, calculate_full_kundli_milan
from ai_astrologer import generate_astrological_reading, generate_structured_prediction
from jaimini_engine import analyze_jaimini_system
from kp_engine import calculate_kp_chart
from tajika_engine import calculate_varshaphal
from panchang_engine import calculate_full_panchang
from shadbala_and_yogas import (
    detect_classical_yogas,
    calculate_shadbala,
    calculate_planetary_avasthas,
    calculate_ishta_kashta_phala
)
from numerology_engine import (
    calculate_full_numerology,
    calculate_mulank,
    calculate_bhagyank,
    calculate_naamank,
    calculate_harmony_score,
    generate_name_correction_candidates,
    get_signature_guidance,
    analyze_business_name,
    analyze_mobile_number
)
from pancha_pakshi_engine import calculate_pancha_pakshi
from prashna_engine import evaluate_prashna
from upagraha_engine import calculate_upagrahas
from btr_engine import evaluate_btr_candidates
from classical_knowledge import search_classical_knowledge, get_sloka_by_id
from multi_method_engine import build_multi_method_comparison
from external_api import (
    fetch_external_planets,
    fetch_external_chart_url,
    fetch_external_navamsa,
    fetch_external_vedic_chart,
    fetch_external_visual_chart,
    fetch_external_natal_calculate,
    get_api_key
)
from prokerala_api import (
    get_client_credentials,
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
    session_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Recent conversation turns")

class PartnerBirthProfile(BaseModel):
    name: Optional[str] = "Partner"
    dob: str = Field(..., description="ISO 8601 birth datetime, e.g. '1995-06-15T10:30:00'")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude")
    timezone: str = Field(..., description="IANA Timezone Identifier, e.g. 'Asia/Kolkata'")

class AuthoritativeMatchmakingRequest(BaseModel):
    boy: PartnerBirthProfile = Field(..., description="Full groom birth profile")
    girl: PartnerBirthProfile = Field(..., description="Full bride birth profile")

class PreliminaryMatchRequest(BaseModel):
    boy_moon_sign_idx: Optional[int] = Field(None, ge=0, le=11)
    girl_moon_sign_idx: Optional[int] = Field(None, ge=0, le=11)
    boy_moon_degree: Optional[float] = None
    girl_moon_degree: Optional[float] = None

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
    lang: str = Field("en", description="Output language: 'en' or 'hi'")

class TajikaRequest(BirthDetails):
    target_year: Optional[int] = Field(None, description="Target year for solar return calculation, e.g. 2026")

class MultiMethodRequest(BirthDetails):
    target_year: Optional[int] = Field(None, description="Target year for annual comparison, e.g. 2026")

class TimingEvaluationRequest(BaseModel):
    birth_details: BirthDetails
    target_time: str = Field(..., description="Target ISO datetime to evaluate for Muhurta, e.g. '2026-10-25T10:30:00'")
    target_lat: float = Field(28.6139, ge=-90.0, le=90.0)
    target_lon: float = Field(77.2090, ge=-180.0, le=180.0)
    target_timezone: str = Field("Asia/Kolkata", description="Target IANA Timezone")

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "kundli-engine",
        "engine_version": "2.1.0",
        "ephemeris_engine": "Swiss Ephemeris (pyswisseph 2.10.3.2) + FreeAstrologyAPI",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/ready")
def ready_check():
    return {
        "status": "READY",
        "service": "kundli-engine",
        "ephemeris": "Swiss Ephemeris 2.10.3.2"
    }

@app.get("/api/admin/health")
def admin_health_check():
    """
    Operational Diagnostics & Management Intelligence (Section 11):
    Tracks Swiss Ephemeris, FreeAstrologyAPI connection, Geocoding provider, and engine health.
    """
    # 1. Test FreeAstrologyAPI connectivity
    api_key_configured = bool(get_api_key())
    external_api_status = "UNCONFIGURED_MISSING_API_KEY" if not api_key_configured else "UNKNOWN"
    if api_key_configured:
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
    prokerala_cid, prokerala_csec = get_client_credentials()
    prokerala_status = "UNCONFIGURED_MISSING_CREDENTIALS" if (not prokerala_cid or not prokerala_csec) else "UNKNOWN"
    if prokerala_cid and prokerala_csec:
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
    - All Divisional Charts (D1, D2 Hora, D3 Drekkana, D7 Saptamsha, D9 Navamsha, D10 Dashamsha, D12, D60)
    - Parashari Ashtakavarga (Bhinnashtakavarga & Sarvashtakavarga 337 bindus)
    - Moon Chart (Chandra Lagna)
    - Bhava Chalit Chart
    - Complete Vimshottari Dasha with Antardashas
    - Advanced Manglik, Kaal Sarp & Shani Sade Sati analysis
    - Ghataka Chakra personalized timing factors
    """
    d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
    lagna_total_deg = d1["lagna"]["total_degree"]

    d9 = calculate_navamsha(d1["planets"], lagna_total_deg)
    d10 = calculate_dashamsha(d1["planets"], lagna_total_deg)
    moon_chart = calculate_moon_chart(d1["planets"])
    chalit = calculate_chalit_chart(d1["planets"], lagna_total_deg)
    all_vargas = calculate_all_vargas(d1["planets"], lagna_total_deg)
    ashtakavarga = calculate_ashtakavarga(d1["planets"], d1["lagna"]["sign"])

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
    ghataka = get_ghataka_chakra(moon_sign_idx)

    return {
        "d1_rashi_chart": d1,
        "d9_navamsha_chart": d9,
        "d10_dashamsha_chart": d10,
        "all_vargas": all_vargas,
        "ashtakavarga": ashtakavarga,
        "moon_chart": moon_chart,
        "chalit_chart": chalit,
        "vimshottari_dasha": dashas,
        "doshas_and_remedies": doshas,
        "yogas": yogas,
        "shadbala": shadbala,
        "ghataka_chakra": ghataka
    }

@app.post("/api/kundli/ashtakavarga")
def get_ashtakavarga_endpoint(req: BirthDetails):
    """Calculates classical Parashari Bhinnashtakavarga and Sarvashtakavarga (337 bindus)."""
    try:
        d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
        return calculate_ashtakavarga(d1["planets"], d1["lagna"]["sign"])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/kundli/vargas")
def get_vargas_endpoint(req: BirthDetails):
    """Calculates all 8 foundational classical divisional charts (D1, D2, D3, D7, D9, D10, D12, D60)."""
    try:
        d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
        return calculate_all_vargas(d1["planets"], d1["lagna"]["total_degree"])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/timing/evaluate")
def evaluate_timing_endpoint(req: TimingEvaluationRequest):
    """
    Evaluates personal transit timing / Muhurta window uniting:
    - Tarabala (9-fold Star strength across 3 cycles)
    - Chandrabala (Lunar transit strength relative to Janma Rasi)
    - Ghataka Chakra (Affliction checks on Moon sign, Tithi group, Weekday, Nakshatra, Lagna)
    """
    try:
        # 1. Native birth chart
        b_d1 = calculate_kundli(req.birth_details.dob, req.birth_details.lat, req.birth_details.lon, req.birth_details.timezone)
        SIGNS = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]
        b_moon_sign_idx = SIGNS.index(b_d1["planets"]["Moon"]["sign"])
        b_moon_deg = (b_moon_sign_idx * 30.0) + b_d1["planets"]["Moon"]["degree"]
        b_nak_idx = int(b_moon_deg / (360.0 / 27.0)) % 27

        # 2. Transit instant chart
        clean_target_time = req.target_time.replace("Z", "").replace(" ", "T")
        t_date_str = clean_target_time.split("T")[0]
        t_d1 = calculate_kundli(clean_target_time, req.target_lat, req.target_lon, req.target_timezone)
        t_panchang = calculate_full_panchang(t_date_str, req.target_lat, req.target_lon, req.target_timezone)

        t_moon_sign_idx = SIGNS.index(t_d1["planets"]["Moon"]["sign"])
        t_moon_deg = (t_moon_sign_idx * 30.0) + t_d1["planets"]["Moon"]["degree"]
        t_nak_idx = int(t_moon_deg / (360.0 / 27.0)) % 27
        t_lagna_idx = SIGNS.index(t_d1["lagna"]["sign"])

        # Weekday: Sunday=0 ... Saturday=6
        t_dt = datetime.fromisoformat(clean_target_time)
        t_weekday = (t_dt.weekday() + 1) % 7 # Python weekday() Mon=0...Sun=6 -> Sun=0...Sat=6
        t_tithi_num = t_panchang.get("tithi", {}).get("number", 1)

        return evaluate_transit_timing(
            birth_rasi_idx=b_moon_sign_idx,
            birth_nak_idx=b_nak_idx,
            transit_rasi_idx=t_moon_sign_idx,
            transit_nak_idx=t_nak_idx,
            transit_tithi_num=t_tithi_num,
            transit_weekday_idx=t_weekday,
            transit_lagna_idx=t_lagna_idx
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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

@app.get("/api/ai-astrologer/tools")
def get_ai_astrologer_tools():
    """
    Returns the central catalog of verified astrology tools
    registered in AstroVerse's calculation method registry.
    """
    from tools_registry import list_registered_tools
    return {
        "status": "success",
        "count": len(list_registered_tools()),
        "tools": list_registered_tools()
    }

@app.post("/api/ai-astrologer/ask")
def ask_ai_astrologer(req: AIQuestionRequest):
    """
    AI Astrologer Guru:
    Personalization-gated reading grounded in calculated birth chart, active dasha, and transits,
    with multi-turn context awareness, intent classification, and structured insights.
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

        try:
            dt_clean = req.dob.replace("Z", "+00:00") if "Z" in req.dob else req.dob
            b_dt = datetime.fromisoformat(dt_clean)
        except Exception:
            b_dt = datetime.now()

        dashas = calculate_vimshottari_dasha(moon_abs_deg, b_dt)
        doshas = analyze_doshas_and_remedies(d1["planets"], d1["lagna"]["sign"])

        reading = generate_astrological_reading(
            category=req.category,
            user_query=req.question,
            kundli=d1,
            dasha=dashas,
            doshas=doshas,
            time_horizon=req.time_horizon,
            astrologer_name=req.astrologer_name,
            session_history=req.session_history
        )
        return {
            "mode": "PERSONALIZED_CHART_GROUNDED",
            "profile_loaded": True,
            "category": reading.get("intent", req.category),
            "reading": reading,
            "message": reading.get("message", reading.get("reading", "")),
            "intent": reading.get("intent", req.category),
            "chartEvidence": reading.get("chartEvidence", []),
            "relatedInsights": reading.get("relatedInsights", []),
            "suggestedQuestions": reading.get("suggestedQuestions", []),
            "remedyCard": reading.get("remedyCard"),
            "status": "completed"
        }
    else:
        # General astrological guidance path (clearly labeled as unpersonalized universal transit mode)
        reading = generate_astrological_reading(
            category=req.category,
            user_query=req.question,
            kundli=None,
            dasha=None,
            doshas=None,
            time_horizon=req.time_horizon,
            astrologer_name=req.astrologer_name,
            session_history=req.session_history
        )
        return {
            "mode": "GENERAL_TRANSIT_UNPERSONALIZED",
            "profile_loaded": False,
            "category": reading.get("intent", req.category),
            "reading": reading,
            "message": reading.get("message", reading.get("reading", "")),
            "intent": reading.get("intent", req.category),
            "chartEvidence": reading.get("chartEvidence", []),
            "relatedInsights": reading.get("relatedInsights", []),
            "suggestedQuestions": reading.get("suggestedQuestions", []),
            "remedyCard": reading.get("remedyCard"),
            "status": "completed"
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
            category=req.category,
            lang=req.lang
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
            category=req.category,
            lang=req.lang
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
def get_matchmaking(req: AuthoritativeMatchmakingRequest):
    """
    Authoritative Ashtakoota 36-Guna Kundli Milan:
    Requires complete dual birth profiles (dob, lat, lon, timezone) for groom and bride.
    Computes authentic Swiss Ephemeris 8-Kootas, classical dosha exceptions, and synastry.
    For ungrounded preliminary sign-only estimates, use POST /api/matchmaking/preliminary-estimate.
    """
    try:
        boy_dict = req.boy.model_dump() if hasattr(req.boy, "model_dump") else req.boy.dict()
        girl_dict = req.girl.model_dump() if hasattr(req.girl, "model_dump") else req.girl.dict()
        return calculate_full_kundli_milan(boy_dict, girl_dict)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@app.post("/api/matchmaking/preliminary-estimate")
def get_preliminary_matchmaking(req: PreliminaryMatchRequest):
    """
    Preliminary / Legacy Moon Sign or Degree Approximation:
    Only provides an approximate preliminary indicator. Explicitly discloses limitations.
    """
    if req.boy_moon_degree is not None and req.girl_moon_degree is not None:
        boy_deg = req.boy_moon_degree
        girl_deg = req.girl_moon_degree
    elif req.boy_moon_sign_idx is not None and req.girl_moon_sign_idx is not None:
        boy_deg = (req.boy_moon_sign_idx * 30.0) + 15.0
        girl_deg = (req.girl_moon_sign_idx * 30.0) + 15.0
    else:
        raise HTTPException(
            status_code=400,
            detail="Preliminary matchmaking requires either boy_moon_sign_idx and girl_moon_sign_idx (0-11) or boy_moon_degree and girl_moon_degree."
        )

    result = match_kundli_36_gunas(boy_deg, girl_deg)
    result["is_preliminary_estimate"] = True
    result["method"] = "SIGN_DEGREE_PRELIMINARY_APPROXIMATION"
    result["warning"] = "This is an ungrounded preliminary sign/degree approximation. Authoritative compatibility with dosha cancellations and full synastry requires dual birth profiles at POST /api/matchmaking."
    return result

@app.post("/api/external-kundli")
def get_external_kundli(req: BirthDetails):
    """
    FreeAstroAPI Integration:
    Queries third-party ephemeris and returns planetary coordinates alongside SVG chart URLs.
    Fails closed when credentials are missing or external provider fails.
    """
    dt = datetime.fromisoformat(req.dob)

    chart_data = fetch_external_vedic_chart(
        year=dt.year, month=dt.month, day=dt.day,
        hour=dt.hour, minute=dt.minute,
        lat=req.lat, lng=req.lon, tz_str=req.timezone
    )
    if isinstance(chart_data, dict) and chart_data.get("error"):
        status_code = chart_data.get("statusCode", 503)
        if not isinstance(status_code, int) or status_code < 400 or status_code > 599:
            status_code = 503
        raise HTTPException(
            status_code=status_code,
            detail=chart_data.get("message", "External astrology provider request failed.")
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

@app.post("/api/external/natal")
@app.post("/api/external-natal")
def get_external_natal(req: BirthDetails):
    """
    FreeAstroAPI Minimal Natal Endpoint:
    POST /api/v1/natal/calculate
    Documentation: https://www.freeastroapi.com/llms.txt
    Fails closed when credentials are missing or external provider fails.
    """
    dt = datetime.fromisoformat(req.dob)
    natal_data = fetch_external_natal_calculate(
        year=dt.year, month=dt.month, day=dt.day,
        hour=dt.hour, minute=dt.minute,
        lat=req.lat, lng=req.lon, tz_str=req.timezone
    )
    if isinstance(natal_data, dict) and natal_data.get("error"):
        status_code = natal_data.get("statusCode", 503)
        if not isinstance(status_code, int) or status_code < 400 or status_code > 599:
            status_code = 503
        raise HTTPException(
            status_code=status_code,
            detail=natal_data.get("message", "External astrology provider request failed.")
        )
    return {
        "provider": "FreeAstroAPI",
        "endpoint": "/api/v1/natal/calculate",
        "data": natal_data
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

# ==============================================================================
# SECTION 12 & 13: ADVANCED ASTROLOGY SUITE & EXTENDED CALCULATION APIS
# ==============================================================================

class NumerologyRequest(BaseModel):
    name: str = Field(..., description="Full person or entity name")
    dob: str = Field(..., description="ISO 8601 birth date, e.g. '1995-06-15'")

class NumerologyAnalyzeRequest(BaseModel):
    name: str = Field(..., description="Full person or entity name")
    birthDate: str = Field(..., description="ISO 8601 birth date, e.g. '2005-08-20'")
    calculationSpelling: Optional[str] = Field(None, description="Explicit calculation spelling if different")
    gender: Optional[str] = Field(None, description="Optional gender")
    moonNakshatra: Optional[str] = Field(None, description="Optional Moon Nakshatra")
    language: str = Field("en", description="Output language: 'en' or 'hi'")
    analysisTarget: str = Field("personal_name", description="personal_name, business_name, or mobile_number")
    phoneNumber: Optional[str] = Field(None, description="Optional phone number for mobile analysis")

class NameCorrectionRequest(BaseModel):
    name: str = Field(..., description="Full person name")
    birthDate: str = Field(..., description="ISO 8601 birth date, e.g. '2005-08-20'")
    calculationSpelling: Optional[str] = Field(None, description="Explicit calculation spelling")
    gender: Optional[str] = Field(None, description="Optional gender")
    moonNakshatra: Optional[str] = Field(None, description="Optional Moon Nakshatra")
    language: str = Field("en", description="Output language: 'en' or 'hi'")
    candidateCount: int = Field(5, ge=1, le=10, description="Number of candidates to generate (max 10, default 5)")

class PanchaPakshiRequest(BaseModel):
    nakshatra_number: Optional[int] = Field(None, ge=1, le=27, description="Birth nakshatra number (1-27)")
    name: Optional[str] = Field(None, description="Name for phonetic first vowel fallback")
    is_waxing: bool = Field(True, description="True for Shukla Paksha (Waxing), False for Krishna Paksha (Waning)")
    check_time: Optional[str] = Field(None, description="ISO datetime to evaluate active yama & activity")
    sunrise: Optional[str] = Field(None, description="Local sunrise ISO datetime")
    sunset: Optional[str] = Field(None, description="Local sunset ISO datetime")
    timezone: str = Field("Asia/Kolkata", description="IANA timezone")

class PrashnaRequest(BaseModel):
    question: str = Field(..., description="The horary inquiry / question")
    category: str = Field("general", description="career, marriage, wealth, health, property, travel, lost_object")
    query_time: str = Field(..., description="ISO datetime when question was posed")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude")
    timezone: str = Field("Asia/Kolkata", description="IANA timezone")

class BTRRequest(BaseModel):
    nominal_dob: str = Field(..., description="Reported ISO birth datetime")
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    window_minutes: int = Field(30, ge=5, le=120, description="Search window in minutes (+/-)")
    step_minutes: int = Field(3, ge=1, le=10, description="Scan step in minutes")
    life_events: List[Dict[str, str]] = Field([], description="List of milestone events e.g. [{'type': 'marriage', 'date': '2020-11-20'}]")
    timezone: str = Field("Asia/Kolkata", description="IANA timezone")


@app.post("/api/numerology/analyze")
@app.post("/api/v1/numerology/analyze")
def analyze_numerology_endpoint(req: NumerologyAnalyzeRequest):
    """
    Public Numerology Analysis API:
    Calculates Moolank, Bhagyank, Chaldean and Pythagorean Naamank,
    Compound number interpretation, 9x9 planetary friendship matrix,
    weighted harmony score, favorable elements, and signature guidance.
    """
    try:
        target_name = (req.calculationSpelling or req.name).strip()
        if not target_name:
            raise HTTPException(status_code=400, detail="Name is required and cannot be empty.")

        if req.analysisTarget == "mobile_number":
            if not req.phoneNumber:
                raise HTTPException(status_code=400, detail="Phone number is required for mobile_number target.")
            return analyze_mobile_number(req.phoneNumber)
        elif req.analysisTarget == "business_name":
            return analyze_business_name(target_name, owner_dob_iso=req.birthDate)
        else:
            base_data = calculate_full_numerology(name=target_name, dob_iso=req.birthDate)
            moolank = base_data["birth_number"]["value"]
            c_root = base_data["name_numbers"]["chaldean"]["naamank"]
            sig_guidance = get_signature_guidance(moolank=moolank, naamank=c_root)
            base_data["signature_guidance"] = sig_guidance
            base_data["language"] = req.language
            return base_data
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Numerology analysis error: {str(e)}")


@app.post("/api/numerology/correct-name")
@app.post("/api/v1/numerology/correct-name")
def correct_name_endpoint(req: NameCorrectionRequest):
    """
    Name Correction Recommendation API:
    Generates 3 to 5 bounded, realistic, natural spelling alternatives that
    maximize planetary harmony with Moolank and Bhagyank and hit auspicious
    Chaldean compound numbers (e.g. 19, 23, 24, 32, 33, 37, 41, 42).
    """
    try:
        target_name = (req.calculationSpelling or req.name).strip()
        if not target_name:
            raise HTTPException(status_code=400, detail="Name is required and cannot be empty.")

        candidates = generate_name_correction_candidates(
            full_name=target_name,
            dob_iso=req.birthDate,
            target_count=min(max(req.candidateCount, 1), 10),
            moon_nakshatra=req.moonNakshatra,
            gender=req.gender
        )

        base_data = calculate_full_numerology(name=target_name, dob_iso=req.birthDate)

        return {
            "original_name": req.name,
            "calculation_spelling": target_name,
            "birth_date": req.birthDate,
            "baseline_moolank": base_data["birth_number"]["value"],
            "baseline_bhagyank": base_data["destiny_number"]["value"],
            "baseline_chaldean_compound": base_data["name_numbers"]["chaldean"]["compound_total"],
            "baseline_harmony_score": base_data["harmony"]["score"],
            "baseline_alignment_tier_en": base_data["harmony"]["alignment_tier_en"],
            "baseline_alignment_tier_hi": base_data["harmony"]["alignment_tier_hi"],
            "candidates_count": len(candidates),
            "candidates": candidates,
            "language": req.language
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Name correction error: {str(e)}")


@app.post("/api/v1/astrology/numerology")
def get_numerology(req: NumerologyRequest):
    """
    Computes Chaldean and Pythagorean Numerology:
    Mulank (Psychic No), Bhagyank (Destiny/Life Path No), Namank (Name No),
    Soul Urge No, Personality No, planetary vibrations, and compatibility.
    """
    try:
        return calculate_full_numerology(name=req.name, dob_iso=req.dob)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Numerology calculation failed: {str(e)}")


@app.get("/api/v1/astrology/numerology")
def get_numerology_get(
    name: str = Query(..., description="Full person or entity name"),
    dob: str = Query(..., description="ISO 8601 birth date, e.g. '1995-06-15'")
):
    try:
        return calculate_full_numerology(name=name, dob_iso=dob)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Numerology calculation failed: {str(e)}")


@app.post("/api/v1/astrology/pancha-pakshi")
def get_pancha_pakshi(req: PanchaPakshiRequest):
    """
    Computes ancient Tamil Pancha Pakshi (Five Birds) biorhythm timing:
    Identifies birth bird, active daytime/nighttime yama, current diurnal activity,
    strength score, and the complete 24-hour biorhythm schedule.
    """
    try:
        return calculate_pancha_pakshi(
            birth_nakshatra_num=req.nakshatra_number,
            name=req.name,
            is_waxing=req.is_waxing,
            check_time_iso=req.check_time,
            sunrise_iso=req.sunrise,
            sunset_iso=req.sunset,
            timezone_str=req.timezone
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Pancha Pakshi calculation failed: {str(e)}")


@app.post("/api/v1/astrology/prashna")
def get_prashna(req: PrashnaRequest):
    """
    Horary Astrology (Prashna Kundli):
    Casts query-time chart, calculates Lagnesha (Querent) and Karyesha (Significator),
    analyzes Tajika aspects and yogas (Ithasala, Ishrafa, Nakta, Yamaya, Kamboola),
    and produces outcome determination with classical textual rationale.
    """
    try:
        return evaluate_prashna(
            query_text=req.question,
            category=req.category,
            query_datetime_iso=req.query_time,
            lat=req.lat,
            lon=req.lon,
            timezone_str=req.timezone
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prashna evaluation failed: {str(e)}")


@app.post("/api/v1/astrology/upagrahas")
def get_upagrahas(req: BirthDetails):
    """
    Calculates the 11 Classical Upagrahas (Non-Luminous Sub-Planets):
    - 5 Sun-based: Dhuma, Vyatipaata, Parivesha, Indrachaapa, Upaketu
    - 6 Time-based Kalavelas: Kaala, Mrityu, Arthaprahaara, Yamaghantaka, Gulika, Maandi
    """
    try:
        return calculate_upagrahas(
            dob_iso=req.dob,
            lat=req.lat,
            lon=req.lon,
            timezone_str=req.timezone
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upagrahas calculation failed: {str(e)}")


@app.post("/api/v1/astrology/btr")
def get_birth_time_rectification(req: BTRRequest):
    """
    Birth Time Rectification (BTR) Candidate Finder:
    Scans candidate birth times across a window (+/- minutes), tracking D1, D9 Navamsa,
    and D60 Shashtyamsha Lagna boundary shifts and dasha event alignments.
    """
    try:
        return evaluate_btr_candidates(
            nominal_dob_iso=req.nominal_dob,
            lat=req.lat,
            lon=req.lon,
            window_minutes=req.window_minutes,
            step_minutes=req.step_minutes,
            life_events=req.life_events,
            timezone_str=req.timezone
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"BTR evaluation failed: {str(e)}")


@app.get("/api/v1/astrology/knowledge")
def search_knowledge(
    q: Optional[str] = Query(None, description="General search keyword"),
    topic: Optional[str] = Query(None, description="Topic e.g. yoga, house, saturn, jaimini, prashna"),
    house: Optional[int] = Query(None, ge=1, le=12, description="House number 1-12"),
    planet: Optional[str] = Query(None, description="Planet name e.g. Jupiter, Moon, Saturn"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Searches the authentic Classical Sanskrit Astrology Knowledge Base:
    Includes Brihat Parashara Hora Shastra, Phaladeepika, Saravali,
    Jaimini Upadesha Sutras, and Prashna Tantra with slokas, translations, and implications.
    """
    try:
        return {
            "query": q,
            "topic": topic,
            "house": house,
            "planet": planet,
            "count": len(search_classical_knowledge(q, topic, house, planet, limit)),
            "results": search_classical_knowledge(q, topic, house, planet, limit)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Knowledge retrieval failed: {str(e)}")


@app.post("/api/v1/astrology/avasthas")
def get_avasthas(req: BirthDetails):
    """
    Calculates Classical Planetary States (Avasthas) & Ishta/Kashta Phalas:
    - Baladi Avasthas (Bala, Kumara, Yuva, Vriddha, Mrita)
    - Jagradadi Avasthas (Jagrat, Swapna, Sushupti)
    - Lajjitadi Avasthas (Garvita, Mudita, Lajjita, Trashita, Shanta)
    - Ishta Phala & Kashta Phala ratings
    """
    try:
        d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
        planets = d1.get("planets", {})
        avasthas = calculate_planetary_avasthas(planets)
        shadbala = calculate_shadbala(planets, d1["lagna"]["sign"])
        ishta_kashta = calculate_ishta_kashta_phala(shadbala)
        return {
            "birth_details": req.model_dump() if hasattr(req, "model_dump") else req.dict(),
            "planetary_avasthas": avasthas,
            "ishta_kashta_phala": ishta_kashta
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Avasthas calculation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
