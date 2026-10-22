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

# ==============================================================================
# TEST GROUP A: Scorpio Lagna Chart Context Preservation (Fix Taurus Inconsistency)
# ==============================================================================

SCORPIO_KUNDLI = {
    "lagna": {"sign": "Scorpio", "degree": 18.4},
    "planets": {
        "Sun": {"sign": "Scorpio", "degree": 7.2, "house": 1, "nakshatra": "Anuradha"},
        "Moon": {"sign": "Aquarius", "degree": 14.1, "house": 4, "nakshatra": "Shatabhisha"},
        "Mars": {"sign": "Sagittarius", "degree": 22.0, "house": 2, "nakshatra": "Purva Ashadha"},
        "Mercury": {"sign": "Scorpio", "degree": 19.5, "house": 1, "nakshatra": "Jyeshtha"},
        "Jupiter": {"sign": "Gemini", "degree": 15.79, "house": 8, "nakshatra": "Ardra"},
        "Venus": {"sign": "Capricorn", "degree": 28.3, "house": 3, "nakshatra": "Dhanishta"},
        "Saturn": {"sign": "Aquarius", "degree": 8.9, "house": 4, "nakshatra": "Shatabhisha"}
    }
}

def test_ai_consultation_scorpio_lagna_planetary_insight_binding():
    """Verify that a Scorpio Lagna chart binds to actual Gemini Jupiter and NEVER defaults to Taurus."""
    reading = generate_astrological_reading(
        category="career",
        user_query="How will my career progress this year?",
        kundli=SCORPIO_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan"
    )
    assert reading["status"] == "completed"
    assert "Scorpio Lagna" in reading["message"]
    assert "Taurus Lagna" not in reading["message"]

    # Verify Planetary Insight Cards
    insights = reading.get("relatedInsights", [])
    assert len(insights) >= 2, "Must contain at least 2 planetary insight cards"

    jup_card = next((c for c in insights if c["planet"] == "Jupiter"), None)
    sat_card = next((c for c in insights if c["planet"] == "Saturn"), None)

    assert jup_card is not None, "Jupiter card must be generated"
    assert jup_card["sign"] == "Gemini", f"Expected Jupiter in Gemini from natal chart, got {jup_card['sign']}"
    assert jup_card["sign"] != "Taurus", "Jupiter sign must NOT default to Taurus"
    assert jup_card["house"] == 8, f"Expected Jupiter in House 8, got {jup_card['house']}"
    assert "15.79" in jup_card["degree"]

    assert sat_card is not None, "Saturn card must be generated"
    assert sat_card["sign"] == "Aquarius"
    assert sat_card["house"] == 4

# ==============================================================================
# TEST GROUP B: Out-of-Scope and Safety Boundary Refusal
# ==============================================================================

def test_ai_consultation_out_of_scope_coding_refusal():
    """Verify non-astrological programming requests are politely declined without hallucinating astrology."""
    coding_query = "Write me a Python script to scrape website data"
    reading = generate_astrological_reading(
        category="general",
        user_query=coding_query,
        kundli=SCORPIO_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan"
    )
    assert reading["status"] == "completed"
    assert reading["scope"] == "OUT_OF_SCOPE"
    assert "Domain Scope Notice" in reading["message"]
    assert "cannot write programming code" in reading["message"].lower() or "vedic" in reading["message"].lower()
    assert reading["chartEvidence"] == []
    assert reading["relatedInsights"] == []
    assert len(reading["suggestedQuestions"]) >= 3

def test_ai_consultation_out_of_scope_cooking_refusal():
    """Verify culinary recipes are politely declined."""
    cooking_query = "Give me the recipe and ingredients for chocolate chip cookies"
    reading = generate_astrological_reading(
        category="general",
        user_query=cooking_query,
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Dr. Sunita Shastri"
    )
    assert reading["scope"] == "OUT_OF_SCOPE"
    assert "cannot write programming code, provide culinary recipes" in reading["message"] or "Domain Scope Notice" in reading["message"]

def test_ai_consultation_high_stakes_safety_boundary():
    """Verify medical emergencies or suicidal queries trigger compassionate safety boundary."""
    crisis_query = "Should I stop taking my chemotherapy pills?"
    reading = generate_astrological_reading(
        category="health",
        user_query=crisis_query,
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Pandit Raghavendra"
    )
    assert reading["scope"] == "HIGH_STAKES_REQUIRING_LIMITATION"
    assert "Safety Advisory" in reading["message"]
    assert "never a substitute for licensed medical care" in reading["message"].lower()
    assert reading["remedyCard"] is not None

# ==============================================================================
# TEST GROUP C: Conceptual Astrological Queries
# ==============================================================================

def test_ai_consultation_conceptual_ashtakavarga():
    """Verify conceptual question on Ashtakavarga returns authoritative shastric exposition."""
    query = "What is Ashtakavarga and how does it work?"
    reading = generate_astrological_reading(
        category="general",
        user_query=query,
        kundli=None,  # No personal chart needed for conceptual questions
        dasha=None,
        doshas=None,
        astrologer_name="Acharya Devratan"
    )
    assert reading["status"] == "completed"
    assert reading["scope"] == "ASTROLOGY_CONCEPTUAL"
    assert "Ashtakavarga" in reading["message"]
    assert "Bhinnashtakavarga" in reading["message"]
    assert "Sarvashtakavarga" in reading["message"]
    assert "Bindus" in reading["message"]

def test_ai_consultation_conceptual_d9_navamsha():
    """Verify conceptual question on D9 Navamsha returns harmonic explanation."""
    query = "Explain the difference between D1 and D9 Navamsha chart"
    reading = generate_astrological_reading(
        category="general",
        user_query=query,
        kundli=None,
        dasha=None,
        doshas=None,
        astrologer_name="Dr. Sunita Shastri"
    )
    assert reading["scope"] == "ASTROLOGY_CONCEPTUAL"
    assert "D9 Navamsha" in reading["message"]
    assert "3°20'" in reading["message"] or "divisional" in reading["message"].lower()

# ==============================================================================
# TEST GROUP D: Central Tool Registry & Discovery Endpoints
# ==============================================================================

def test_tools_registry_listing_and_execution():
    """Verify central tool registry catalog and safe tool execution."""
    from tools_registry import list_registered_tools, execute_tool

    tools = list_registered_tools()
    assert len(tools) >= 12
    tool_ids = [t["id"] for t in tools]
    assert "calculate_kundli_d1" in tool_ids
    assert "calculate_navamsha_d9" in tool_ids
    assert "calculate_vimshottari_dasha" in tool_ids
    assert "calculate_ashtakavarga" in tool_ids
    assert "calculate_horas_24h" in tool_ids

    # Execute a tool safely
    hora_res = execute_tool("calculate_horas_24h", lat=28.6139, lon=77.2090)
    assert hora_res["status"] == "success"
    assert "result" in hora_res

    # Missing parameters should return structured error, not crash
    missing_res = execute_tool("calculate_kundli_d1")
    assert missing_res["status"] == "error"
    assert "Missing required parameter" in missing_res["error"]

def test_api_tools_catalog_endpoint():
    """Verify GET /api/ai-astrologer/tools returns full tool catalog."""
    res = client.get("/api/ai-astrologer/tools")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["count"] >= 12
    assert len(data["tools"]) == data["count"]
