import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from ai_astrologer import generate_astrological_reading, generate_structured_prediction

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
    from tools_registry import list_registered_tools, execute_tool, ALL_VALIDATION_STATUSES

    tools = list_registered_tools()
    assert len(tools) == 20
    tool_ids = [t["toolId"] for t in tools]
    expected_tools = [
        "planet_longitude",
        "calculate_kundli_d1",
        "calculate_navamsha_d9",
        "calculate_dashamsha_d10",
        "calculate_all_vargas",
        "calculate_vimshottari_dasha",
        "calculate_ashtakavarga",
        "calculate_shadbala",
        "identify_planetary_yogas",
        "analyze_doshas_and_remedies",
        "calculate_horas_24h",
        "calculate_panchang",
        "match_kundli_36_gunas",
        "search_classical_knowledge",
        "calculate_upagrahas",
        "calculate_numerology",
        "calculate_pancha_pakshi",
        "evaluate_prashna",
        "calculate_avasthas",
        "evaluate_btr_candidates"
    ]
    for tid in expected_tools:
        assert tid in tool_ids, f"Expected {tid} to be registered in tool catalog"

    # Verify standard schema conformance on all 20 tools
    required_keys = [
        "toolId", "displayName", "category", "description",
        "inputSchema", "outputSchema", "requiredContext", "calculationMethod",
        "engineVersion", "provenance", "validationStatus", "availability",
        "limitations"
    ]
    for t in tools:
        for k in required_keys:
            assert k in t, f"Tool {t.get('toolId')} missing required key {k}"
        assert t["validationStatus"] in ALL_VALIDATION_STATUSES, f"Tool {t['toolId']} has invalid validationStatus: {t['validationStatus']}"
        assert t["availability"] in ["enabled", "restricted", "disabled"]

    # Execute a tool safely
    hora_res = execute_tool("calculate_horas_24h", lat=28.6139, lon=77.2090)
    assert hora_res["status"] == "success"
    assert "result" in hora_res

    # Missing parameters should return structured error, not crash
    missing_res = execute_tool("calculate_kundli_d1")
    assert missing_res["status"] == "error"
    assert "Missing required parameter" in missing_res["error"]

def test_tools_registry_native_tools_execution():
    """Verify safe execution of newly registered native calculation tools."""
    from tools_registry import execute_tool

    # 1. Planetary longitude
    p_res = execute_tool("planet_longitude", dob_iso="1995-10-24T12:00:00", lat=28.6139, lon=77.2090, planet_name="Sun")
    assert p_res["status"] == "success"
    assert "sign" in p_res["result"]
    assert "degree" in p_res["result"]

    # 2. Numerology
    num_res = execute_tool("calculate_numerology", dob="1995-10-24", name="Arjun")
    assert num_res["status"] == "success"
    assert "destiny_number" in num_res["result"]

    # 3. Pancha Pakshi
    pp_res = execute_tool("calculate_pancha_pakshi", birth_nakshatra_num=1)
    assert pp_res["status"] == "success"
    assert "birth_bird" in pp_res["result"]

    # 4. Prashna Tantra
    prashna_res = execute_tool("evaluate_prashna", query_text="Will my venture succeed?", lat=28.6139, lon=77.2090)
    assert prashna_res["status"] == "success"
    assert "verdict" in prashna_res["result"] or "horary_chart_details" in prashna_res["result"]

    # 5. Planetary Avasthas
    avasthas_res = execute_tool("calculate_avasthas", planets=SAMPLE_KUNDLI["planets"])
    assert avasthas_res["status"] == "success"
    assert "Sun" in avasthas_res["result"]

    # 6. Upagrahas
    upagraha_res = execute_tool("calculate_upagrahas", dob_iso="1995-10-24T12:00:00", lat=28.6139, lon=77.2090)
    assert upagraha_res["status"] == "success"
    assert "all_upagrahas" in upagraha_res["result"]

    # 7. Birth-Time Rectification (BTR)
    btr_res = execute_tool("evaluate_btr_candidates", nominal_dob_iso="1995-10-24T12:00:00", lat=28.6139, lon=77.2090)
    assert btr_res["status"] == "success"
    assert "candidate_results" in btr_res["result"] or "best_fit_candidate" in btr_res["result"]

def test_ai_consultation_unsupported_divination_refusal():
    """Verify non-Vedic divination systems (Tarot, Western Tropical, BaZi) are refused with Vedic alternatives."""
    reading = generate_astrological_reading(
        category="general",
        user_query="Can you give me a 3-card Tarot reading for my relationship?",
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan"
    )
    assert reading["status"] == "completed"
    assert reading["scope"] == "UNSUPPORTED_ASTROLOGY_CAPABILITY"
    assert "Vedic Sidereal (Nirayana) Jyotish" in reading["message"]
    assert "Tarot" in reading["message"]
    assert "D9 Navamsha" in reading["message"]

def test_ai_consultation_missing_inputs_universal_mode():
    """Verify personal question without chart enters universal transit mode."""
    reading = generate_astrological_reading(
        category="career",
        user_query="Will I get promoted in my job soon?",
        kundli=None,
        dasha=None,
        doshas=None,
        astrologer_name="Dr. Sunita Shastri"
    )
    assert reading["status"] == "completed"
    assert reading["scope"] in ["ASTROLOGY_WITH_MISSING_INPUTS", "ASTROLOGY_IN_SCOPE"]
    assert "transit" in reading["message"].lower() or "universal" in reading["message"].lower()
    assert "Janam Kundli" in reading["message"] or "Ascendant" in reading["message"]
    assert reading["chartEvidence"] == []

def test_api_tools_catalog_endpoint():
    """Verify GET /api/ai-astrologer/tools returns full tool catalog."""
    res = client.get("/api/ai-astrologer/tools")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["count"] == 20
    assert len(data["tools"]) == 20

def test_ai_consultation_greetings_never_dump_career_and_warm_for_all_personas():
    """Verify greetings on Acharya, Sunita, and Raghavendra never dump career reports."""
    personas = [
        ("Acharya Devratan", "Pranam!"),
        ("Dr. Sunita Shastri", "Namaste!"),
        ("Pandit Raghavendra", "Om Namah Shivaya!")
    ]
    for persona, salutation in personas:
        # 1. Chart-grounded mode
        res = generate_astrological_reading(
            category="general",
            user_query="Hi there",
            kundli=SAMPLE_KUNDLI,
            dasha=SAMPLE_DASHA,
            doshas=SAMPLE_DOSHAS,
            astrologer_name=persona
        )
        assert res["intent"] == "greeting"
        assert salutation in res["message"]
        assert "Strategic Career & Life Architecture" not in res["message"]
        assert "10th House" not in res["message"]
        assert len(res["suggestedQuestions"]) >= 3

        # 2. Universal unpersonalized transit mode
        res_univ = generate_astrological_reading(
            category="general",
            user_query="Hello",
            kundli=None,
            dasha=None,
            doshas=None,
            astrologer_name=persona
        )
        assert res_univ["intent"] == "greeting"
        assert salutation in res_univ["message"]
        assert "Strategic Career & Life Architecture" not in res_univ["message"]
        assert "10th House" not in res_univ["message"]
        assert len(res_univ["suggestedQuestions"]) >= 3

def test_ai_consultation_conceptual_deep_shastric_explanations():
    """Verify conceptual inquiries return dedicated shastric explanations without career summaries."""
    # Jupiter inquiry
    jup_res = generate_astrological_reading(
        category="general",
        user_query="Why is Jupiter auspicious in Vedic astrology?",
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan"
    )
    assert jup_res["scope"] == "ASTROLOGY_CONCEPTUAL"
    assert "Devaguru Brihaspati" in jup_res["message"]
    assert "Amrita Drishti" in jup_res["message"]
    assert "Strategic Career & Life Architecture" not in jup_res["message"]

    # Sade Sati inquiry
    ss_res = generate_astrological_reading(
        category="general",
        user_query="Explain Shani Sade Sati",
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Pandit Raghavendra"
    )
    assert ss_res["scope"] == "ASTROLOGY_CONCEPTUAL"
    assert "Sade Sati" in ss_res["message"]
    assert "Saturn" in ss_res["message"]

    # Raja & Dhana Yoga inquiry
    yoga_res = generate_astrological_reading(
        category="wealth",
        user_query="What are Raja Yogas and Dhana Yogas?",
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan"
    )
    assert yoga_res["scope"] == "ASTROLOGY_CONCEPTUAL"
    assert "Kendra" in yoga_res["message"]
    assert "Trikona" in yoga_res["message"]

def test_structured_predictions_hindi_bilingual_parity():
    """Verify generate_structured_prediction returns authentic Devanagari Hindi strings across all horizons."""
    horizons = ["hourly", "daily", "weekly", "monthly", "mahadasha", "yearly"]

    # 1. Universal Mode Hindi
    for h in horizons:
        pred_univ_hi = generate_structured_prediction(
            horizon=h,
            target_date_str="2026-10-25",
            kundli=None,
            lang="hi"
        )
        assert pred_univ_hi["time_horizon"] == h
        assert len(pred_univ_hi["report_title"]) > 0
        secs = pred_univ_hi["sections"]
        assert len(secs["executive_summary"]) > 0
        assert len(secs["overall_outlook"]) > 0
        assert len(secs["supportive_developments"]) >= 3
        assert len(secs["challenges_and_cautions"]) >= 2
        assert len(secs["key_time_windows"]) >= 3
        assert len(secs["why_this_applies"]) > 0
        assert len(secs["practical_reflection"]) > 0
        assert len(secs["limitations"]) > 0
        # Ensure Devanagari characters are present
        import re
        assert re.search(r"[\u0900-\u097F]", secs["overall_outlook"]) is not None

    # 2. Personalized Chart-Grounded Hindi
    for h in horizons:
        pred_ground_hi = generate_structured_prediction(
            horizon=h,
            target_date_str="2026-10-25",
            kundli=SAMPLE_KUNDLI,
            dasha=SAMPLE_DASHA,
            doshas=SAMPLE_DOSHAS,
            lang="hi"
        )
        assert pred_ground_hi["time_horizon"] == h
        secs = pred_ground_hi["sections"]
        assert len(secs["overall_outlook"]) > 0
        assert re.search(r"[\u0900-\u097F]", secs["overall_outlook"]) is not None
        # Facts contain translated sign/planet
        assert "सिंह" in secs["relevant_chart_facts"]["lagna"]
        assert "महादशा" in secs["relevant_chart_facts"]["active_dasha"]

def test_ai_consultation_hindi_greeting_response():
    """Verify querying in Hindi returns authentic Devanagari greeting responses."""
    # Acharya Devratan
    res_acharya = generate_astrological_reading(
        category="general",
        user_query="नमस्ते आचार्य जी",
        kundli=SAMPLE_KUNDLI,
        dasha=SAMPLE_DASHA,
        doshas=SAMPLE_DOSHAS,
        astrologer_name="Acharya Devratan",
        lang="hi"
    )
    assert res_acharya["intent"] == "greeting"
    assert "प्रणाम!" in res_acharya["message"]
    assert "आचार्य देवरात्न" in res_acharya["message"]
    assert "सिंह लग्न" in res_acharya["message"]

    # Dr. Sunita Shastri
    res_sunita = generate_astrological_reading(
        category="general",
        user_query="प्रणाम",
        kundli=None,
        astrologer_name="Dr. Sunita Shastri",
        lang="hi"
    )
    assert res_sunita["intent"] == "greeting"
    assert "नमस्ते!" in res_sunita["message"]
    assert "सुनीता शास्त्री" in res_sunita["message"]
