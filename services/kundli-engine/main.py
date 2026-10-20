from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ephemeris import calculate_kundli
from hora_engine import calculate_24h_horas
from dasha_engine import calculate_vimshottari_dasha
from divisional_charts import (
    calculate_navamsha,
    calculate_dashamsha,
    calculate_moon_chart,
    calculate_chalit_chart
)
from doshas_and_remedies import analyze_doshas_and_remedies
from matchmaking import match_kundli_36_gunas
from muhurta_engine import calculate_daily_muhurta
from ai_astrologer import generate_astrological_reading

app = FastAPI(
    title="Astroverse Engine - High-Precision Vedic Astrology & AI Ephemeris Service",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BirthDetails(BaseModel):
    dob: str                  # ISO format: "1996-11-24T14:30:00"
    lat: float = 28.6139      # New Delhi default
    lon: float = 77.2090
    timezone: str = "Asia/Kolkata"

class AIQuestionRequest(BaseModel):
    category: str = "career"  # "career", "marriage", "wealth", "health", "general"
    question: str = "What are my prospects for promotion and growth?"
    dob: str = "1996-11-24T14:30:00"
    lat: float = 28.6139
    lon: float = 77.2090
    timezone: str = "Asia/Kolkata"
    time_horizon: str = "daily" # "hourly", "daily", "weekly", "monthly", "yearly"

class MatchmakingRequest(BaseModel):
    boy_moon_degree: float
    girl_moon_degree: float

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "kundli-engine",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/kundli")
def get_base_kundli(req: BirthDetails):
    """Calculates D1 Lagna, 9 planetary longitudes, Nakshatras & Panchang."""
    return calculate_kundli(req.dob, req.lat, req.lon, req.timezone)

@app.post("/api/complete-kundli")
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
def get_hourly_predictions(
    date_str: Optional[str] = None,
    lat: float = 28.6139,
    lon: float = 77.2090
):
    """Calculates true 24-hour planetary Horas, Rahu Kaal, and Abhijit Muhurta."""
    target_date = date_str or datetime.now().strftime("%Y-%m-%d")
    sunrise = datetime.fromisoformat(f"{target_date}T06:24:00")
    sunset = datetime.fromisoformat(f"{target_date}T17:48:00")

    return {
        "date": target_date,
        "latitude": lat,
        "longitude": lon,
        "timeline": calculate_24h_horas(sunrise, sunset),
        "muhurta": calculate_daily_muhurta(sunrise, sunset)
    }

@app.post("/api/ai-astrologer/ask")
def ask_ai_astrologer(req: AIQuestionRequest):
    """Generates an intelligent Parashari reading grounded in user's chart & transits."""
    d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
    SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    moon_sign_idx = SIGNS.index(d1["planets"]["Moon"]["sign"])
    moon_abs_deg = (moon_sign_idx * 30.0) + d1["planets"]["Moon"]["degree"]

    dashas = calculate_vimshottari_dasha(moon_abs_deg, datetime.fromisoformat(req.dob))
    doshas = analyze_doshas_and_remedies(d1["planets"], d1["lagna"]["sign"])

    return generate_astrological_reading(
        category=req.category,
        user_query=req.question,
        kundli=d1,
        dasha=dashas,
        doshas=doshas,
        time_horizon=req.time_horizon
    )

@app.post("/api/matchmaking")
def get_matchmaking(req: MatchmakingRequest):
    """Calculates complete Ashtakoota 36-Guna compatibility."""
    return match_kundli_36_gunas(req.boy_moon_degree, req.girl_moon_degree)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
