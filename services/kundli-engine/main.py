from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from ephemeris import calculate_kundli
from hora_engine import calculate_24h_horas
from dasha_engine import calculate_vimshottari_dasha
from divisional_charts import calculate_navamsha
from doshas_and_remedies import analyze_doshas_and_remedies
from matchmaking import match_kundli_36_gunas
from muhurta_engine import calculate_daily_muhurta
from ai_astrologer import generate_astrological_reading

app = FastAPI(title="Astrotalk Pro - Vedic Ephemeris & Prediction Engine")

class BirthDetails(BaseModel):
    dob: str               # "1996-11-24T14:30:00"
    lat: float = 28.6139   # New Delhi
    lon: float = 77.2090
    timezone: str = "Asia/Kolkata"

class AIQuestionRequest(BaseModel):
    category: str          # "career", "marriage", "wealth", "health"
    question: str          # "Will I get a promotion?"
    dob: str = "1996-11-24T14:30:00"
    lat: float = 28.6139
    lon: float = 77.2090

class MatchmakingRequest(BaseModel):
    boy_moon_degree: float
    girl_moon_degree: float

@app.post("/api/kundli")
def get_base_kundli(req: BirthDetails):
    return calculate_kundli(req.dob, req.lat, req.lon, req.timezone)

@app.post("/api/complete-kundli")
def get_complete_kundli(req: BirthDetails):
    d1 = calculate_kundli(req.dob, req.lat, req.lon, req.timezone)
    d9 = calculate_navamsha(d1["planets"], d1["lagna"]["degree"])
    
    SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
    moon_deg = (SIGNS.index(d1["planets"]["Moon"]["sign"]) * 30.0) + d1["planets"]["Moon"]["degree"]
    dashas = calculate_vimshottari_dasha(moon_deg, datetime.fromisoformat(req.dob))
    doshas = analyze_doshas_and_remedies(d1["planets"], d1["lagna"]["sign"])

    return {
        "d1_rashi_chart": d1,
        "d9_navamsha_chart": d9,
        "vimshottari_dasha": dashas,
        "doshas_and_remedies": doshas
    }

@app.get("/api/hourly-predictions")
def get_hourly_predictions(date_str: str = "2026-10-18"):
    sunrise = datetime.fromisoformat(f"{date_str}T06:24:00")
    sunset = datetime.fromisoformat(f"{date_str}T17:48:00")
    return {
        "date": date_str,
        "timeline": calculate_24h_horas(sunrise, sunset),
        "muhurta": calculate_daily_muhurta(sunrise, sunset)
    }

@app.post("/api/ai-astrologer/ask")
def ask_ai_astrologer(req: AIQuestionRequest):
    d1 = calculate_kundli(req.dob, req.lat, req.lon)
    SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
    moon_deg = (SIGNS.index(d1["planets"]["Moon"]["sign"]) * 30.0) + d1["planets"]["Moon"]["degree"]
    dashas = calculate_vimshottari_dasha(moon_deg, datetime.fromisoformat(req.dob))
    doshas = analyze_doshas_and_remedies(d1["planets"], d1["lagna"]["sign"])

    return generate_astrological_reading(req.category, req.question, d1, dashas, doshas)

@app.post("/api/matchmaking")
def get_matchmaking(req: MatchmakingRequest):
    return match_kundli_36_gunas(req.boy_moon_degree, req.girl_moon_degree)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
