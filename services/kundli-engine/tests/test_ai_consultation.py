import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from ai_astrologer import generate_astrological_reading

client = TestClient(app)

SAMPLE_KUNDLI = {
    "lagna": {"sign": "Leo", "degree": 14.5},
    "planets": {
        "Sun": {"sign": "Aries", "degree": 10.0, "house": 9, "nakshatra": "Ashwini"},
        "Moon": {"sign": "Taurus", "degree": 3.0, "house": 10, "nakshatra": "Krittika"},
        "Mars": {"sign": "Capricorn", "degree": 28.0, "house": 6, "nakshatra": "Dhanishta"},
        "Mercury": {"sign": "Pisces", "degree": 15.0, "house": 8, "nakshatra": "Uttara Bhadrapada"},
        "Jupiter": {"sign": "Cancer", "degree": 5.0, "house": 12, "nakshatra": "Pushya"},
        "Venus": {"sign": "Pisces", "degree": 27.0, "house": 8, "nakshatra": "Revati"},
        "Saturn": {"sign": "Libra", "degree": 20.0, "house": 3, "nakshatra": "Vishakha"}
    }
}

SAMPLE_DASHA = {
    "active_now": {
        "maha_dasha": "Jupiter",
        "antar_dasha": "Venus"
    }
}

SAMPLE_DOSHAS = {
    "sade_sati": {"phase": "Setting Phase"},
    "manglik": {"verdict": "No Manglik Dosha Present"}
}

def test_ai_consultation_universal_transit_mode():
    """Verify unpersonalized universal transit mode when no chart is loaded."""
    reading = generate_astrological_reading(
        category="career",
        user_query="How will my career progress?",
        kundli=None,
        dasha=None,
        doshas=None,
        astrologer_name="Acharya Devratan"
    )
    assert reading["status"] == "completed"
    assert reading["intent"] == "career"
    assert "Acharya Devratan" in reading["astrologer_name"]
    assert "transit mode" in reading["message"].lower() or "universal" in reading["message"].lower()
    assert len(reading["suggestedQuestions"]) >= 3
    assert reading["chartEvidence"] == []

def test_ai_consultation_greeting_distinct_from_career():
    """Verify greeting receives a warm conversational welcome, not a canned career paragraph."""
    reading = generate_astrological_reading(
        category="general",
        user_query="Namaste Acharya ji",
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan"
    )
    assert reading["intent"] == "greeting"
    assert "Pranam!" in reading["message"]
    assert "Leo Lagna" in reading["message"]
    assert len(reading["suggestedQuestions"]) >= 3
    # Distinct from career reading
    career_reading = generate_astrological_reading(
        category="career",
        user_query="Analyze my 10th house of career and promotion prospects",
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan"
    )
    assert career_reading["intent"] == "career"
    assert reading["message"] != career_reading["message"]
    assert "Professional Diagnosis & 10th House Axis" in career_reading["message"]

def test_ai_consultation_personas_produce_distinct_perspectives():
    """Verify Acharya Devratan, Dr. Sunita Shastri, and Pandit Raghavendra provide distinct voices."""
    query = "What should I focus on for marriage and relationship stability?"

    # Sunita: Empathetic relationship synastry
    sunita = generate_astrological_reading(
        category="marriage",
        user_query=query,
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Dr. Sunita Shastri"
    )
    assert "Sunita Shastri" in sunita["astrologer_name"]
    assert "Namaste!" in sunita["message"]
    assert "D9 Navamsha" in sunita["message"]
    assert sunita["remedyCard"] is not None
    assert "Venusian Harmony" in sunita["remedyCard"]["title"]

    # Raghavendra: Classical scripture & traditional remedies
    raghavendra = generate_astrological_reading(
        category="marriage",
        user_query=query,
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Pandit Raghavendra"
    )
    assert "Pandit Raghavendra" in raghavendra["astrologer_name"]
    assert "Om Namah Shivaya!" in raghavendra["message"]
    assert "Kalatra Bhava" in raghavendra["message"]
    assert raghavendra["remedyCard"] is not None

    # Devratan: Strategic covenants & clear milestones
    devratan = generate_astrological_reading(
        category="marriage",
        user_query=query,
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan"
    )
    assert "Acharya Devratan" in devratan["astrologer_name"]
    assert "7th House of Kalatra" in devratan["message"]

    # All three must produce different response texts
    assert sunita["message"] != raghavendra["message"]
    assert sunita["message"] != devratan["message"]
    assert raghavendra["message"] != devratan["message"]

def test_ai_consultation_history_context_continuity():
    """Verify that a brief follow-up ('when will this happen?') inherits prior topic from history."""
    history = [
        {"role": "user", "content": "I am concerned about my career switch and promotion timing."},
        {"role": "assistant", "content": "Your 10th house indicates strong momentum under Jupiter Dasha."}
    ]
    followup = generate_astrological_reading(
        category="general",
        user_query="When will this happen?",
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan",
        session_history=history
    )
    assert followup["status"] == "completed"
    # Should resolve to timing or career instead of an ungrounded generic answer
    assert followup["intent"] in ["timing", "career"]
    assert "dasha" in followup["message"].lower() or "month" in followup["message"].lower() or "timing" in followup["message"].lower()

def test_ai_astrologer_api_endpoint():
    """Verify POST /api/ai-astrologer/ask returns structured response."""
    payload = {
        "category": "career",
        "question": "What is my career direction for this year?",
        "dob": "1992-04-14T08:30:00",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata",
        "astrologer_name": "Acharya Devratan",
        "session_history": []
    }
    res = client.post("/api/ai-astrologer/ask", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "PERSONALIZED_CHART_GROUNDED"
    assert data["profile_loaded"] is True
    assert "message" in data
    assert len(data["chartEvidence"]) > 0
    assert len(data["suggestedQuestions"]) >= 3
    assert data["status"] == "completed"
