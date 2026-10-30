"""
AstroVerse Intelligent Parashari Vedic AI & Prediction Engine:
Generates deterministic, calculation-grounded multi-horizon astrological guidance:
- Section A: OVERALL OUTLOOK
- Section B: POTENTIALLY SUPPORTIVE DEVELOPMENTS
- Section C: POSSIBLE CHALLENGES AND CAUTIONS
- Section D: RELEVANT TIME WINDOWS
- Section E: WHY THIS INTERPRETATION APPLIES
- Section F: PRACTICAL REFLECTION
- Section G: LIMITATIONS & UNCERTAINTY

All interpretations are strictly grounded in validated calculations:
- Natal Lagna and Lagna Lord dignity
- 10th House (Karma/Profession) & 11th House (Labha/Gains)
- 7th House (Kalatra/Partnership) & D9 Navamsha
- 2nd House (Dhana/Liquid Wealth) & 5th/9th Trikonas
- 6th House (Roga/Obstacles) & 8th House (Ayu/Transformation)
- Active Vimshottari Mahadasha and Antardasha periods
- Shani Sade Sati phase and Rahu-Ketu transit axis
- Real 24-Hour solar Hora intervals and Chaldean sequence
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple

PLANET_FRIENDS = {
    "Sun": {"friends": ["Moon", "Mars", "Jupiter"], "neutrals": ["Mercury"], "enemies": ["Venus", "Saturn"]},
    "Moon": {"friends": ["Sun", "Mercury"], "neutrals": ["Mars", "Jupiter", "Venus", "Saturn"], "enemies": []},
    "Mars": {"friends": ["Sun", "Moon", "Jupiter"], "neutrals": ["Venus", "Saturn"], "enemies": ["Mercury"]},
    "Mercury": {"friends": ["Sun", "Venus"], "neutrals": ["Mars", "Jupiter", "Saturn"], "enemies": ["Moon"]},
    "Jupiter": {"friends": ["Sun", "Moon", "Mars"], "neutrals": ["Saturn"], "enemies": ["Mercury", "Venus"]},
    "Venus": {"friends": ["Mercury", "Saturn"], "neutrals": ["Mars", "Jupiter"], "enemies": ["Sun", "Moon"]},
    "Saturn": {"friends": ["Mercury", "Venus"], "neutrals": ["Jupiter"], "enemies": ["Sun", "Moon", "Mars"]}
}

HOUSE_SIGNIFICATORS = {
    1: "Physical vitality, self-identity, and general health",
    2: "Wealth accumulation, speech, and family lineage",
    3: "Courage, initiative, siblings, and short communications",
    4: "Domestic peace, mother, property, and conveyances",
    5: "Intellect, creativity, children, and past-life merit (Purva Punya)",
    6: "Overcoming debts, competition, workplace dynamics, and immune resilience",
    7: "Marriage, contractual alliances, and business partnerships",
    8: "Longevity, sudden transformations, research, and occult knowledge",
    9: "Higher wisdom, spirituality, dharma, and patron fortune",
    10: "Career authority, leadership, professional standing, and public reputation",
    11: "Recurring financial gains, influential networks, and aspiration fulfillment",
    12: "Rest, foreign travels, expenditure, and spiritual liberation (Moksha)"
}

HINDI_PLANETS = {
    "Sun": "सूर्य", "Moon": "चंद्र", "Mars": "मंगल", "Mercury": "बुध",
    "Jupiter": "बृहस्पति", "Venus": "शुक्र", "Saturn": "शनि",
    "Rahu": "राहु", "Ketu": "केतु"
}

HINDI_SIGNS = {
    "Aries": "मेष", "Taurus": "वृषभ", "Gemini": "मिथुन", "Cancer": "कर्क",
    "Leo": "सिंह", "Virgo": "कन्या", "Libra": "तुला", "Scorpio": "वृश्चिक",
    "Sagittarius": "धनु", "Capricorn": "मकर", "Aquarius": "कुंभ", "Pisces": "मीन"
}

BEEJ_MANTRAS = {
    "Sun": {"mantra": "ॐ ह्रीं ह्रीं सूर्याय नमः", "transliteration": "Om Hreem Hreem Suryaya Namah"},
    "Moon": {"mantra": "ॐ सों सोमाय नमः", "transliteration": "Om Som Somaya Namah"},
    "Mars": {"mantra": "ॐ क्रां क्रीं क्रौं सः भौमाय नमः", "transliteration": "Om Kraam Kreem Kraum Sah Bhaumaya Namah"},
    "Mercury": {"mantra": "ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः", "transliteration": "Om Braam Breem Braum Sah Budhaya Namah"},
    "Jupiter": {"mantra": "ॐ ग्रां ग्रीं ग्रौं सः गुरुवे नमः", "transliteration": "Om Graam Greem Graum Sah Guruve Namah"},
    "Venus": {"mantra": "ॐ द्रां द्रीं द्रौं सः शुक्राय नमः", "transliteration": "Om Draam Dreem Draum Sah Shukraya Namah"},
    "Saturn": {"mantra": "ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः", "transliteration": "Om Praam Preem Praum Sah Shanaishcharaya Namah"},
    "Rahu": {"mantra": "ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः", "transliteration": "Om Bhraam Bhreem Bhraum Sah Rahave Namah"},
    "Ketu": {"mantra": "ॐ स्रां स्रीं स्रौं सः केतवे नमः", "transliteration": "Om Sraam Sreem Sraum Sah Ketave Namah"}
}

CHALDEAN_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]
WEEKDAY_RULERS = ["Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Sun"]
WEEKDAY_NAMES_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAY_NAMES_HI = ["सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार", "रविवार"]
WEEKDAY_AUSPICIOUS_WINDOWS_EN = {
    0: "Amrit Muhurta (06:30 AM – 08:00 AM)",
    1: "Abhijit Muhurta (11:45 AM – 12:35 PM)",
    2: "Labh Choghadiya (06:30 AM – 08:00 AM)",
    3: "Shubh Choghadiya (06:30 AM – 08:00 AM)",
    4: "Amrit Choghadiya (09:00 AM – 10:30 AM)",
    5: "Abhijit Muhurta (11:45 AM – 12:35 PM)",
    6: "Shubh Choghadiya (01:30 PM – 03:00 PM)"
}
WEEKDAY_AUSPICIOUS_WINDOWS_HI = {
    0: "प्रातः 06:30 AM – 08:00 AM (अमृत वेला)",
    1: "मध्याह्न 11:45 AM – 12:35 PM (अभिजित मुहूर्त)",
    2: "प्रातः 06:30 AM – 08:00 AM (लाभ वेला)",
    3: "प्रातः 06:30 AM – 08:00 AM (शुभ वेला)",
    4: "प्रातः 09:00 AM – 10:30 AM (अमृत मुहूर्त)",
    5: "मध्याह्न 11:45 AM – 12:35 PM (अभिजित मुहूर्त)",
    6: "अपराह्न 01:30 PM – 03:00 PM (शुभ वेला)"
}
SIGNS_LIST = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
}

SIGN_LORDS_ORDER = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
]

def get_planet_lordships(planet: str, lagna_sign: str) -> List[int]:
    lagna_idx = SIGNS_LIST.index(lagna_sign) if lagna_sign in SIGNS_LIST else 0
    houses = []
    for h in range(12):
        s_idx = (lagna_idx + h) % 12
        if SIGN_LORDS_ORDER[s_idx] == planet:
            houses.append(h + 1)
    return houses

def generate_astrological_reading(
    category: str,
    user_query: str,
    kundli: Optional[dict] = None,
    dasha: Optional[dict] = None,
    doshas: Optional[dict] = None,
    time_horizon: str = "daily",
    astrologer_name: Optional[str] = None,
    session_history: Optional[List[Dict[str, Any]]] = None,
    lang: Optional[str] = "en"
) -> Dict[str, Any]:
    """
    Intelligent, multi-turn, chart-grounded Vedic astrological response generator.
    Distinguishes greetings, career, relationships, wealth, health, remedies, timing,
    and explanations. Grounded in natal coordinates, active Dasha, and transits.
    """
    query_raw = (user_query or "").strip()
    q = query_raw.lower()
    cat = (category or "").lower()
    astro = (astrologer_name or "").lower()

    # Determine persona configuration
    if "shastri" in astro or "sunita" in astro:
        persona_id = "dr-sunita-shastri"
        persona_display = "Dr. Sunita Shastri (AI Astrologer)"
        persona_title = "Relationship, D9 Navamsha & Jaimini Specialist"
    elif "raghavendra" in astro or "pandit" in astro:
        persona_id = "pandit-raghavendra"
        persona_display = "Pandit Raghavendra (AI Astrologer)"
        persona_title = "Classical Parashari, Vedic Remedies & Textual Jyotish"
    else:
        persona_id = "acharya-devratan"
        persona_display = "Acharya Devratan (AI Astrologer)"
        persona_title = "Career Architecture, Dhana Yogas & Parashari Strategy"

    # Check chart presence
    has_chart = bool(kundli and isinstance(kundli, dict) and "lagna" in kundli and "planets" in kundli)

    # Classify conversational scope and route non-astrological or specialized conceptual inquiries
    from chat_orchestrator import (
        classify_user_query,
        generate_scope_grounded_response,
        SCOPE_OUT_OF_SCOPE,
        SCOPE_HIGH_STAKES_REQUIRING_LIMITATION,
        SCOPE_UNSUPPORTED_ASTROLOGY_CAPABILITY,
        SCOPE_ASTROLOGY_CONCEPTUAL,
        SCOPE_APP_WALLET,
        SCOPE_SOCIAL_CONVERSATION,
        SCOPE_ASTROLOGY_WITH_MISSING_INPUTS
    )
    classification = classify_user_query(user_query, session_history=session_history, has_chart=has_chart)
    scope = classification.get("scope")

    if scope in [
        SCOPE_OUT_OF_SCOPE,
        SCOPE_HIGH_STAKES_REQUIRING_LIMITATION,
        SCOPE_UNSUPPORTED_ASTROLOGY_CAPABILITY,
        SCOPE_ASTROLOGY_CONCEPTUAL,
        SCOPE_APP_WALLET,
        SCOPE_SOCIAL_CONVERSATION,
        SCOPE_ASTROLOGY_WITH_MISSING_INPUTS
    ] or classification.get("is_why") or classification.get("intent") in [
        "hourly_hora", "daily_forecast", "weekly_forecast", "monthly_forecast",
        "yearly_forecast", "mahadasha_guidance", "progressive_birth_data",
        "personal_introduction", "daily_routine"
    ]:
        grounded_res = generate_scope_grounded_response(
            classification=classification,
            query=user_query,
            kundli=kundli,
            dasha=dasha,
            doshas=doshas,
            astrologer_name=astrologer_name,
            lang=lang,
            session_history=session_history
        )
        grounded_res["astrologer_name"] = persona_display
        grounded_res["scope"] = scope
        return grounded_res

    # Analyze conversation history for context continuity
    prior_user_topics = []
    if session_history and isinstance(session_history, list):
        for msg in session_history[-6:]:
            if isinstance(msg, dict) and msg.get("role") == "user":
                prior_user_topics.append(str(msg.get("content", "")).lower())

    # Helper to check if any prior message touched a domain
    def prior_touched(*words):
        for past_text in prior_user_topics:
            if any(w in past_text for w in words):
                return True
        return False

    # Intent Classification
    is_greeting = any(q.startswith(g) or q == g for g in [
        "hi", "hello", "hey", "pranam", "namaste", "namaskar",
        "good morning", "good evening", "good afternoon", "greetings", "om"
    ]) and len(q.split()) <= 4

    q_trimmed = q.strip()
    is_ambiguous_future = q_trimmed in ["future", "bhavishya", "mera bhavishya", "भविष्य", "मेरा भविष्य"] or (("future" in q or "भविष्य" in q) and len(q.split()) <= 2)
    is_career_transit = any(w in q for w in ["transit", "gochar", "गोचर"]) and any(w in q for w in ["career", "switch", "job", "business", "नौकरी", "व्यापार", "व्यवसाय", "परिवर्तन"])
    is_dasha_stability = any(w in q for w in ["dasha", "दशा"]) and any(w in q for w in ["stability", "career", "professional", "work", "job", "स्थिरता", "कार्यक्षेत्र", "नौकरी"])

    is_career = not is_career_transit and not is_dasha_stability and not is_ambiguous_future and (any(w in q for w in [
        "career", "job", "promot", "profession", "business", "work", "boss",
        "interview", "office", "10th", "transfer", "startup", "colleague", "vocation", "करियर", "नौकरी", "पदोन्नति"
    ]) or (cat == "career" and not is_greeting))

    is_marriage = any(w in q for w in [
        "marri", "love", "partner", "spouse", "husband", "wife", "relationship",
        "compatibility", "7th", "divorce", "wedding", "romance", "synastry", "navamsha", "d9", "विवाह", "शादी", "जीवनसाथी"
    ]) or (cat in ["marriage", "relationship"] and not is_greeting)

    is_wealth = any(w in q for w in [
        "wealth", "money", "financ", "invest", "stock", "debt", "loan", "property",
        "income", "gains", "11th", "2nd", "dhana", "asset", "crypto", "savings", "धन", "दौलत", "निवेश"
    ]) or (cat in ["wealth", "finance"] and not is_greeting)

    is_health = any(w in q for w in [
        "health", "disease", "illness", "sick", "hospital", "pain", "stress",
        "mental", "vitality", "energy", "6th", "8th", "anxiety", "depression", "स्वास्थ्य", "रोग"
    ]) or (cat == "health" and not is_greeting)

    is_remedy = any(w in q for w in [
        "remed", "mantra", "gem", "stone", "pukhraj", "ruby", "emerald", "sapphire",
        "puja", "sade", "sati", "dosha", "daan", "fast", "charity", "rudraksha", "उपाय", "मन्त्र", "रत्न"
    ]) or (cat in ["remedies", "remedy"] and not is_greeting)

    is_timing = not is_career_transit and not is_dasha_stability and any(w in q for w in [
        "when", "timing", "dates", "period", "year", "month", "soon", "how long",
        "future", "timeline", "2026", "2027", "dasha", "transit", "कब", "समय"
    ])

    is_explanation = any(w in q for w in [
        "why", "explain", "logic", "how come", "reason", "scripture", "basis",
        "source", "shastra", "parashar", "principle", "rule", "क्यों", "समझाएं"
    ])

    # Context Resolution: If user asked a generic timing or explanation question, inherit prior topic
    if (is_timing or is_explanation or len(q.split()) <= 4) and not (is_career or is_marriage or is_wealth or is_health or is_remedy or is_greeting or is_ambiguous_future or is_career_transit or is_dasha_stability):
        if prior_touched("career", "job", "work", "promot", "business"):
            is_career = True
        elif prior_touched("marri", "love", "partner", "spouse", "relationship"):
            is_marriage = True
        elif prior_touched("wealth", "money", "invest", "financ"):
            is_wealth = True
        elif prior_touched("remed", "gem", "mantra", "sade", "dosha"):
            is_remedy = True

    # Determine primary intent
    if is_greeting:
        intent = "greeting"
    elif is_ambiguous_future:
        intent = "ambiguous_future"
    elif is_career_transit:
        intent = "career_transit_timing"
    elif is_dasha_stability:
        intent = "dasha_career_stability"
    elif is_career:
        intent = "career"
    elif is_marriage:
        intent = "marriage"
    elif is_wealth:
        intent = "wealth"
    elif is_remedy:
        intent = "remedy"
    elif is_health:
        intent = "health"
    elif is_timing:
        intent = "timing"
    elif is_explanation:
        intent = "explanation"
    else:
        intent = "general"

    # Extract Chart Information if present
    has_chart = bool(kundli and isinstance(kundli, dict) and "lagna" in kundli and "planets" in kundli)
    
    if has_chart:
        lagna = kundli["lagna"]["sign"]
        lagna_deg = float(kundli["lagna"].get("degree", 0.0))
        moon_sign = kundli["planets"]["Moon"]["sign"]
        moon_nak = kundli["planets"]["Moon"].get("nakshatra", "Shravana")
        sun_sign = kundli["planets"]["Sun"]["sign"]

        active_maha = dasha.get("active_now", {}).get("maha_dasha", "Jupiter") if dasha else "Jupiter"
        active_antar = dasha.get("active_now", {}).get("antar_dasha", active_maha) if dasha else "Venus"

        sadesati = doshas.get("sade_sati", {}).get("phase", "Free") if doshas else "Free"
        raw_manglik = doshas.get("manglik", {}).get("verdict", "No Manglik Dosha") if doshas else "No Manglik Dosha"
        is_manglik_mitigated = False
        if doshas and isinstance(doshas, dict):
            m_info = doshas.get("manglik", {})
            if isinstance(m_info, dict):
                is_manglik_mitigated = m_info.get("is_mitigated", False) or "mitigated" in str(raw_manglik).lower() or m_info.get("status") == "PRESENT_WITH_MITIGATION"

        if is_manglik_mitigated:
            manglik = "Mitigated / Pacified (Aries Swakshetra BPHS Cancellation)"
        elif doshas and doshas.get("manglik", {}).get("has_dosha", False):
            manglik = "Manglik Dosha Detected (Unmitigated)"
        else:
            manglik = "No Manglik Dosha Present"

        planets = kundli.get("planets", {})
        h10_planets = [p for p, d in planets.items() if d.get("house") == 10]
        h7_planets = [p for p, d in planets.items() if d.get("house") == 7]
        h2_planets = [p for p, d in planets.items() if d.get("house") == 2]
        h11_planets = [p for p, d in planets.items() if d.get("house") == 11]
        h6_planets = [p for p, d in planets.items() if d.get("house") == 6]

        h10_str = f"occupied by {', '.join(h10_planets)}" if h10_planets else "aspected by natural functional benefics"
        h7_str = f"graced by {', '.join(h7_planets)}" if h7_planets else "clear of immediate affliction"
        h2_str = f"tenanted by {', '.join(h2_planets)}" if h2_planets else "governed by your 2nd lord"
        h11_str = f"occupied by {', '.join(h11_planets)}" if h11_planets else "energized by your 11th lord"
    else:
        lagna = "Universal Transit"
        lagna_deg = 0.0
        moon_sign = "Universal Lunar Transit"
        moon_nak = "Universal Nakshatra"
        sun_sign = "Universal Sun"
        active_maha = "Current Transit Cycle"
        active_antar = "Active Sub-period"
        sadesati = "Transit Observation"
        manglik = "N/A (Requires Birth Chart)"
        h10_str = "governed by universal Saturn & Jupiter transits"
        h7_str = "guided by universal Venusian alignments"
        h2_str = "influenced by general planetary Horas"
        h11_str = "linked to general Jupiter transits"

    # Assemble Chart Evidence Array
    chart_evidence: List[Dict[str, str]] = []
    if has_chart:
        chart_evidence.append({
            "factor": "Natal Ascendant (Lagna)",
            "placement": f"{lagna} ({lagna_deg:.2f}°)",
            "interpretation": "Foundational constitutional temperament, vitality, and primary life focus."
        })
        chart_evidence.append({
            "factor": "Natal Moon (Chandra)",
            "placement": f"{moon_sign} ({moon_nak} Nakshatra)",
            "interpretation": "Mental baseline, emotional perceptions, and intuitive decision-making lens."
        })
        chart_evidence.append({
            "factor": "Active Vimshottari Dasha",
            "placement": f"{active_maha} Mahadasha / {active_antar} Antardasha",
            "interpretation": "Primary planetary rulership driving current circumstances and karmic timing."
        })
        if intent in ["career", "timing"]:
            chart_evidence.append({
                "factor": "10th House (Karma Bhava)",
                "placement": h10_str,
                "interpretation": "Professional status, executive authority, and reputation trajectory."
            })
        elif intent in ["marriage", "relationship"]:
            chart_evidence.append({
                "factor": "7th House (Kalatra Bhava)",
                "placement": h7_str,
                "interpretation": "Contractual alliances, romantic commitment, and D9 relationship synastry."
            })
        elif intent == "wealth":
            chart_evidence.append({
                "factor": "2nd & 11th House (Dhana Axis)",
                "placement": f"2nd House {h2_str}; 11th House {h11_str}",
                "interpretation": "Liquid reserves, capital preservation, and compounding gains."
            })
        elif intent == "remedy":
            chart_evidence.append({
                "factor": "Saturn Transit (Shani Sade Sati)",
                "placement": f"Phase: {sadesati}",
                "interpretation": "Karmic discipline cycle requiring patience and structured routine."
            })

    # Assemble Related Insights (Planetary Insight Cards strictly from computed chart coordinates)
    related_insights: List[Dict[str, Any]] = []
    if has_chart:
        planets = kundli.get("planets", {})

        def _add_planet_insight(p_name: str, significance: str):
            p = planets.get(p_name)
            if p and isinstance(p, dict) and p.get("sign") and p.get("house") is not None:
                deg_val = p.get("degree")
                deg_str = f"{float(deg_val):.2f}°" if deg_val is not None else ""
                related_insights.append({
                    "planet": p_name,
                    "sign": p["sign"],
                    "house": p["house"],
                    "degree": deg_str,
                    "significance": significance
                })

        if intent in ["career", "timing", "greeting", "general"]:
            _add_planet_insight("Jupiter", "Natural Karaka of wisdom, expansion, and institutional recognition.")
            _add_planet_insight("Saturn", "Lord of discipline, perseverance, and sustainable professional structures.")
        elif intent == "marriage":
            _add_planet_insight("Venus", "Significator of marital harmony, emotional aesthetics, and partnership diplomacy.")
            _add_planet_insight("Jupiter", "Protector of marital ethics, family blessings, and long-term stability.")
        elif intent in ["wealth", "finance"]:
            _add_planet_insight("Mercury", "Commercial acumen, analytical trade, and liquid capital liquidity.")
            _add_planet_insight("Jupiter", "Dhana Karaka conferring compounded gains and philanthropic balance.")
        elif intent in ["remedy", "health"]:
            _add_planet_insight("Saturn", "Karmic balancing agent; pacified by humility, service, and disciplined dawn mantras.")
            _add_planet_insight("Sun", "Source of vital prana and physical resilience; strengthened through solar dawn rituals.")

    # Prepare Remedy Card if applicable
    remedy_card: Optional[Dict[str, str]] = None
    if intent in ["remedy", "health", "marriage", "career"]:
        if persona_id == "dr-sunita-shastri" or intent == "marriage":
            remedy_card = {
                "title": f"Venusian Harmony & Emotional Balance ({lagna} Lagna)",
                "mantra": "Om Kleem Shukraya Namah (Chant 108 times on Friday dawn)",
                "gemstone_note": f"Natural White Zircon set in silver (subject to Lagna dignity trial). Note: Emerald (Panna) is strictly contraindicated for {lagna} Lagna as Mercury rules the 8th & 11th houses." if lagna.lower() == "scorpio" else "Natural White Zircon or Diamond set in silver (after verifying Lagna lordship)",
                "charity_practice": "Support women's education or offer white flowers at Lakshmi temples on Fridays",
                "disclaimer": "Traditional remedial practices cultivate inner mindfulness; they do not guarantee specific interpersonal outcomes."
            }
        elif persona_id == "pandit-raghavendra" or intent == "remedy":
            remedy_card = {
                "title": f"Classical Parashari Remedial Discipline ({lagna} Lagna)",
                "mantra": "Maha Mrityunjaya Mantra: Om Tryambakam Yajamahe (108 times at sunrise)",
                "gemstone_note": f"Red Coral (Mars, Lagna Lord) or Yellow Sapphire (Jupiter, 5th Lord). Emerald is strictly contraindicated for {lagna} Lagna." if lagna.lower() == "scorpio" else "Fortify functional Trikona lords (Pukhraj or Manik) only after inspecting 6th/8th house lordships",
                "charity_practice": "Light a pure sesame oil lamp under a Peepal tree on Saturdays; feed cows with green fodder",
                "disclaimer": "Vedic remedies are sacred traditional disciplines for mental peace; they carry no commercial guarantees."
            }
        else:
            remedy_card = {
                "title": f"Solar Vitality & Professional Elevation ({lagna} Lagna)",
                "mantra": "Aditya Hridaya Stotra or Gayatri Mantra (Chant 11 times during morning Brahma Muhurta)",
                "gemstone_note": f"Natural Ruby (Manik) or Red Coral (Moonga). Emerald is strictly contraindicated for {lagna} Lagna as Mercury rules 8th/11th houses." if lagna.lower() == "scorpio" else "Natural Ruby (Manik) or functional benefic gemstone",
                "charity_practice": "Offer copper water vessel Arghya to the rising Sun; maintain ethical workplace leadership",
                "disclaimer": "Spiritual remedies align focus and discipline; they do not replace diligent professional execution."
            }

    # Generate Dynamic Follow-up Suggestions
    suggested_questions: List[str] = []
    if intent == "career":
        suggested_questions = [
            "What does my 10th house lord indicate for promotion timing?",
            "Which upcoming transit supports a career switch or business?",
            "How does my active Dasha period affect professional stability?",
            "What Vedic remedies strengthen workplace leadership?"
        ]
    elif intent == "marriage":
        suggested_questions = [
            "What does my 7th house reveal about partner compatibility?",
            "How does the D9 Navamsha chart modify relationship timing?",
            "Are there favorable transits for marriage in the next 12 months?",
            "What classical practices promote peace and mutual understanding?"
        ]
    elif intent == "wealth":
        suggested_questions = [
            "Which planets form auspicious Dhana Yogas in my chart?",
            "What does my 2nd and 11th house axis indicate for capital growth?",
            "How should I navigate speculative risks under my current Dasha?",
            "What traditional remedies support ethical prosperity?"
        ]
    elif intent == "remedy":
        suggested_questions = [
            "What is the classical scriptural basis for this mantra?",
            "How can I pacify Saturn's transit without expensive stones?",
            "Explain the proper methodology for dawn planetary chanting.",
            "Can you evaluate my Sade Sati timeline and precautions?"
        ]
    elif intent == "timing":
        suggested_questions = [
            "What are the key transit milestones over the next 6 months?",
            "How does my upcoming Antardasha differ from the current cycle?",
            "When is the most auspicious window for new initiatives?",
            "How can I align important decisions with positive planetary Horas?"
        ]
    elif intent == "explanation":
        suggested_questions = [
            "How do Parashari rules evaluate functional benefics vs malefics?",
            "Explain how the Navamsha D9 chart confirms natal promises.",
            "What is the role of Shadbala in determining real planetary strength?",
            "How do Gochara transits interact with natal Dasha lords?"
        ]
    elif intent == "greeting":
        if persona_id == "dr-sunita-shastri":
            suggested_questions = [
                "Examine my 7th house and relationship prospects.",
                "How does my D9 chart support marital harmony?",
                "What timing window favors finding a compatible partner?",
                "How does my active Dasha impact personal relationships?"
            ]
        elif persona_id == "pandit-raghavendra":
            suggested_questions = [
                "What classical remedies are prescribed for my active Dasha?",
                "Evaluate my Sade Sati and Saturn transit status.",
                "Which mantras harmonize my Lagna lord?",
                "Explain the traditional spiritual practices for planetary peace."
            ]
        else:
            suggested_questions = [
                "Analyze my 10th House of Career and leadership timing.",
                "What does my chart reveal regarding Dhana Yogas and wealth?",
                "How does my active Vimshottari Dasha influence this year?",
                "What gemstones or Vedic practices support my path?"
            ]
    else:
        suggested_questions = [
            "Analyze my career trajectory and promotion timing.",
            "When does my chart indicate relationship consolidation?",
            "What does my active Dasha period signify for finances?",
            "Which traditional remedies bring balanced peace of mind?"
        ]

    # Generate Grounded Response Text tailored by Persona and Intent
    if not has_chart:
        # Canonical Universal Transit Mode for Guest Visitors
        if persona_id == "dr-sunita-shastri":
            greeting_line = f"Namaste! I am {persona_display}. Welcome to our personal Vedic consultation."
            body_md = (
                f"{greeting_line}\n\n"
                f"### Universal Transit Alignment\n"
                f"As you have not yet loaded a personal birth chart, I am interpreting today's universal celestial alignments. "
                f"Currently, transiting Jupiter in Gemini fosters intellectual curiosity and empathetic dialogue, while Venusian "
                f"transits encourage diplomatic partnership.\n\n"
                f"### Relationship Reflection\n"
                f"Regarding your inquiry: In Vedic astrology, relationship dynamics depend essentially on your **7th House of Kalatra**, "
                f"the dignity of **Venus and Jupiter**, and your **D9 Navamsha chart**. For universal guidance, fostering transparent "
                f"communication and emotional patience during evening Venus Horas supports genuine bonding.\n\n"
                f"> **Personalize Your Guidance:** To receive 100% chart-grounded timing for engagement, marriage, and partner "
                f"compatibility, please calculate or load your Janam Kundli."
            )
        elif persona_id == "pandit-raghavendra":
            greeting_line = f"Om Namah Shivaya! I am {persona_display}. Peace and auspicious blessings to you."
            body_md = (
                f"{greeting_line}\n\n"
                f"### Classical Scriptural Perspective\n"
                f"Without a loaded natal Janam Kundli, I evaluate current macrocosmic transits through Brihat Parashara Hora Shastra principles. "
                f"Currently, Saturn transiting sidereal Pisces invites deep introspection, patience, and karmic service.\n\n"
                f"### Universal Remedial Practice\n"
                f"For universal protection and mental clarity: Reciting the sacred **Gayatri Mantra** at sunrise and practicing selfless "
                f"charity (Daan) on planetary days harmonizes subtle karmic currents.\n\n"
                f"> **Personalize Your Guidance:** Exact gemstone compatibility and specific Dosha assessments (such as Manglik Dosha or "
                f"Sade Sati phase) strictly require your birth time and coordinates. Load your Janam Kundli for verified analysis."
            )
        else:
            greeting_line = f"Pranam! I am {persona_display}. Welcome to your strategic Vedic consultation."
            body_md = (
                f"{greeting_line}\n\n"
                f"### Universal Strategic Transits\n"
                f"Operating in universal transit mode: Macro-astrological currents show Jupiter transiting Gemini, supporting structured "
                f"communication, technical innovation, and strategic re-organization.\n\n"
                f"### Professional & Life Counsel\n"
                f"Regarding your query: In Parashari Jyotish, professional authority and financial elevation are governed by the **10th House of Karma** "
                f"and active **Vimshottari Dasha**. Aligning high-leverage execution with diurnal Sun and Jupiter Horas maximizes mental clarity.\n\n"
                f"> **Personalize Your Guidance:** For precise quarterly milestones, promotion windows, and personalized Dhana Yogas, "
                f"calculate your Janam Kundli in the Kundli section."
            )
    else:
        # Personalized, Chart-Grounded Mode
        has_prior_turn = bool(session_history and any(isinstance(m, dict) and m.get("role") == "assistant" for m in session_history))
        is_hi = (lang == "hi")

        if has_prior_turn:
            greeting_prefix = ""
        else:
            if persona_id == "dr-sunita-shastri":
                greeting_salutation = "नमस्ते!" if is_hi else "Namaste!"
            elif persona_id == "pandit-raghavendra":
                greeting_salutation = "ॐ नमः शिवाय!" if is_hi else "Om Namah Shivaya!"
            else:
                greeting_salutation = "प्रणाम!" if is_hi else "Pranam!"

            greeting_prefix = (
                f"{greeting_salutation} मैं {persona_display} हूँ।\n\n"
                if is_hi else
                f"{greeting_salutation} I am {persona_display}.\n\n"
            )

        lagna_display = HINDI_SIGNS.get(lagna, lagna) if is_hi else lagna
        moon_display = HINDI_SIGNS.get(moon_sign, moon_sign) if is_hi else moon_sign
        dasha_maha_display = HINDI_PLANETS.get(active_maha, active_maha) if is_hi else active_maha
        dasha_antar_display = HINDI_PLANETS.get(active_antar, active_antar) if is_hi else active_antar

        if intent == "greeting":
            if has_prior_turn:
                if is_hi:
                    body_md = f"प्रणाम! मैं आपकी क्या सहायता कर सकता हूँ? आप अपनी **{lagna_display} लग्न** पत्रिका (सक्रिय **{dasha_maha_display}-{dasha_antar_display} दशा**) के आधार पर करियर, विवाह, धन योग अथवा शास्त्रीय उपायों पर प्रश्न पूछ सकते हैं।"
                else:
                    body_md = f"Pranam! How may I assist your astrological exploration today? Feel free to ask about your career, marriage timing, Dhana Yogas, or remedies for your **{lagna} Lagna** chart (**{active_maha}-{active_antar}** Dasha)."
            else:
                if is_hi:
                    body_md = (
                        f"{greeting_prefix}मैंने आपकी जन्म कुंडली (**{lagna_display} लग्न**, **{moon_display} राशि**, सक्रिय **{dasha_maha_display}-{dasha_antar_display} दशा**) का विश्लेषण कर लिया है।\n\n"
                        f"### जीवन एवं करियर मार्गदर्शन\n"
                        f"आपकी जन्म कुंडली हमारे परामर्श सत्र से जुड़ चुकी है। मैं करियर, निर्णय, व्यापार और वित्तीय प्रगति में आपका शास्त्रीय मार्गदर्शन करने के लिए तैयार हूँ।\n\n"
                        f"आज आप किस विषय, कार्ययोजना या जीवन के प्रश्न पर विचार करना चाहते हैं?"
                    )
                elif persona_id == "dr-sunita-shastri":
                    body_md = (
                        f"Namaste! I am {persona_display}.\n\n"
                        f"I have connected to your natal chart: **{lagna} Lagna** ({lagna_deg:.2f}°), Moon in **{moon_sign}** "
                        f"({moon_nak} Nakshatra), under active **{active_maha} Mahadasha** and **{active_antar} Antardasha**.\n\n"
                        f"### Relational & Emotional Geometry\n"
                        f"Your 7th House of partnership is {h7_str}, and your emotional perception is anchored in lunar {moon_sign}. "
                        f"Whether you are seeking guidance on romantic timing, partner compatibility, marital harmony, or emotional healing, "
                        f"I am here to explore your chart's geometry with empathy and respect.\n\n"
                        f"What specific relationship question or personal milestone can I illuminate for you today?"
                    )
                elif persona_id == "pandit-raghavendra":
                    body_md = (
                        f"Om Namah Shivaya! I am {persona_display}.\n\n"
                        f"I have reviewed your sacred natal planetary coordinates: **{lagna} Lagna** with Sun in **{sun_sign}** and "
                        f"Moon in **{moon_sign}** ({moon_nak} Nakshatra). You are currently navigating your **{active_maha}-{active_antar}** Dasha, "
                        f"with Saturn in **{sadesati}**.\n\n"
                        f"### Classical Shastra Foundation\n"
                        f"In Brihat Parashara Hora Shastra, every planetary placement reflects accumulated Prarabdha Karma. "
                        f"Classical remedies, stotras, and disciplined fasting do not erase destiny; rather, they grant spiritual resilience "
                        f"and divine grace to navigate life with wisdom.\n\n"
                        f"What karmic inquiry, remedial clarification, or traditional practice would you like to explore?"
                    )
                else:
                    body_md = (
                        f"Pranam! I am {persona_display}, specializing in classical Parashari Jyotish, career architecture, and strategic life decisions.\n\n"
                        f"I have connected to your calculated chart: **{lagna} Lagna** ({lagna_deg:.2f}°), **{moon_sign} Moon**, "
                        f"and active **{active_maha} Mahadasha** with **{active_antar} Antardasha**.\n\n"
                        f"### Astrological Foundation & Guidance\n"
                        f"Under your {lagna} Ascendant, your chart carries distinct potential for purposeful achievement and structured growth. "
                        f"Whether you wish to examine professional direction, timing of opportunities, Dhana Yogas, or personal life balance, I am here to guide you with clarity and scriptural integrity.\n\n"
                        f"What strategic milestone, question, or goal would you like to explore today?"
                    )

        elif intent == "ambiguous_future":
            if is_hi:
                body_md = (
                    f"{greeting_prefix}आपकी जन्म कुंडली (**{lagna_display} लग्न**, **{moon_display} चंद्र राशि**, सक्रिय **{dasha_maha_display}-{dasha_antar_display} दशा**) के आधार पर सटीक और सार्थक फलादेश हेतु, आप भविष्य के किस विशिष्ट क्षेत्र पर पहले विचार करना चाहते हैं?\n\n"
                    f"1. **करियर एवं आजीविका:** पदोन्नति का समय, नेतृत्व की भूमिका और व्यापार या नौकरी में परिवर्तन।\n"
                    f"2. **आर्थिक स्थिति एवं धन योग:** आय में वृद्धि, निवेश का समय और संपत्ति संचय।\n"
                    f"3. **विवाह एवं पारिवारिक सामंजस्य:** विवाह का समय, जीवनसाथी का स्वभाव और वैवाहिक स्थिरता।\n"
                    f"4. **ग्रह गोचर एवं आध्यात्मिक उपाय:** मीन राशि में शनि गोचर, साढ़े साती की स्थिति और सुरक्षात्मक शास्त्रीय उपाय।"
                )
            else:
                body_md = (
                    f"{greeting_prefix}To give you the most accurate and meaningful astrological forecast from your chart (**{lagna} Lagna**, **{moon_sign} Moon**, active **{active_maha}-{active_antar}** Dasha), which specific domain of your future would you like to explore first?\n\n"
                    f"1. **Career & Professional Trajectory:** Promotion timing, leadership roles, and business switch.\n"
                    f"2. **Financial Accumulation & Dhana Yogas:** Income growth, investment timing, and asset stability.\n"
                    f"3. **Marriage & Relationship Milestones:** Partnership timing, compatibility, and family harmony.\n"
                    f"4. **Spiritual Path & Transit Remedies:** Saturn in Pisces transit, Sade Sati phase, and protective mantras."
                )

        elif intent == "career_transit_timing":
            if is_hi:
                body_md = (
                    f"{greeting_prefix}**{lagna_display} लग्न** हेतु कार्यक्षेत्र परिवर्तन एवं व्यापार संवर्धन में आगामी ग्रहीय गोचर का सूक्ष्म विश्लेषण:\n\n"
                    f"### 1. वृहस्पति (गुरु) का गोचर चक्र\n"
                    f"वर्तमान में वृहस्पति आपके सप्तम भाव (वृषभ राशि) से संचरण करते हुए आपके लग्न ({lagna_display}), तृतीय भाव (पराक्रम) और एकादश भाव (लाभ) पर अमृतमय दृष्टि डाल रहे हैं। इसके पश्चात मिथुन और विशेष रूप से कर्क राशि (नवम भाव - उच्च राशि) में गुरु का आगामी गोचर आपके भाग्य को जागृत करेगा और नए स्वतंत्र उपक्रम अथवा पदोन्नति हेतु अत्यंत शुभ समय खिड़की का निर्माण करेगा।\n\n"
                    f"### 2. शनि देव का मीन राशि में गोचर (पंचम भाव)\n"
                    f"शनि देव आपकी कुंडली के पंचम भाव से गोचर करते हुए एकादश भाव (आय), द्वितीय भाव (संचित धन) और सप्तम भाव पर दृष्टि डाल रहे हैं। यह गोचर स्पष्ट संदेश देता है कि बिना सोचे-समझे नौकरी छोड़ने के बजाय सुविचारित, योजनाबद्ध और अनुशासित कौशल उन्नयन के साथ ही करियर परिवर्तन करें।\n\n"
                    f"### 3. राहु-केतु अक्ष का प्रभाव\n"
                    f"राहु-केतु का संचरण कर्म भाव (दशम) और सुख भाव (चतुर्थ) के अक्ष को प्रभावित करता है, जो पारंपरिक सीमाओं से बाहर निकलकर नवीन तकनीकी अथवा दूरस्थ क्षेत्रों में विस्तार की प्रेरणा देता है।\n\n"
                    f"### रणनीतिक सिफारिश एवं शुभ समय\n"
                    f"व्यापार आरंभ करने अथवा नौकरी में बड़े परिवर्तन हेतु मई 2026 से आगे का समय, जब गुरु कर्क राशि में उच्च के होंगे, सर्वाधिक स्थिर और लाभदायक सिद्ध होगा।"
                )
            else:
                body_md = (
                    f"{greeting_prefix}Evaluating upcoming planetary transits supporting a career switch or business venture for **{lagna} Lagna**:\n\n"
                    f"### 1. Jupiter (Guru) Transit Dynamics\n"
                    f"Currently, Jupiter transits through your 7th house (Taurus), casting auspicious trinal aspects on your 11th house of gains (Virgo) and 1st house ({lagna} Lagna). As Jupiter advances into Gemini and subsequently enters Cancer (your 9th house of Bhagya / Divine Fortune, where Jupiter is exalted in mid-2026), it initiates the prime strategic window for professional transitions, leadership elevation, and entrepreneurial ventures.\n\n"
                    f"### 2. Saturn (Shani) in Pisces (5th House)\n"
                    f"Saturn transiting Pisces in your 5th house casts its 10th aspect upon your 2nd house of accumulated wealth and its 7th aspect upon the 11th house of liquid gains. Parashari principles indicate that impulsive leaps without runway capital must be avoided; structured, phased transitions backed by disciplined preparation will yield enduring stability.\n\n"
                    f"### 3. Rahu-Ketu Axis & Professional Alignment\n"
                    f"The nodal axis transiting your 4th/10th and 5th/11th houses sparks ambition for innovative, tech-enabled, or cross-border ventures.\n\n"
                    f"### Strategic Timing Window\n"
                    f"The strongest window for formalizing an independent enterprise or executing a lateral career leap activates when Jupiter approaches its exaltation sign (Cancer in your 9th house). Focus current efforts on network building and financial buffer accumulation."
                )

        elif intent == "dasha_career_stability":
            if is_hi:
                body_md = (
                    f"{greeting_prefix}आपकी सक्रिय **{dasha_maha_display} महादशा** एवं **{dasha_antar_display} अंतर्दशा** का व्यावसायिक स्थिरता पर शास्त्रीय पाराशरी विश्लेषण:\n\n"
                    f"### 1. विंशोत्तरी दशा स्वामियों का संबंध (गुरु-शुक्र)\n"
                    f"आपके **{lagna_display} लग्न** हेतु:\n"
                    f"- **वृहस्पति (गुरु):** द्वितीय भाव (धन, वाणी) एवं पंचम भाव (बुद्धि, पूर्व पुण्य) के शुभ स्वामी हैं।\n"
                    f"- **शुक्र देव:** सप्तम भाव (साझेदारी, व्यापार) एवं द्वादश भाव (व्यय, दूरस्थ संबंध) के स्वामी होकर एकादश भाव में स्थित हैं।\n"
                    f"गुरु और शुक्र दोनों नैसर्गिक शुभ ग्रह हैं, परंतु तत्कालीन संबंध में कार्यक्षेत्र में बौद्धिक विस्तार के साथ-साथ कूटनीतिक संतुलन की आवश्यकता होती है।\n\n"
                    f"### 2. व्यावसायिक स्थिरता पर प्रत्यक्ष प्रभाव\n"
                    f"- **सकारात्मक पक्ष:** गुरु का पंचमेश होना आपकी बौद्धिक क्षमता, निर्णय लेने की शक्ति और रणनीतिक दृष्टिकोण को बढ़ाता है।\n"
                    f"- **सावधानी के बिंदु:** शुक्र का द्वादशेश होना यह दर्शाता है कि कार्यस्थल पर अनावश्यक राजनीति अथवा गोपनीय असंतोष से बचें। वित्तीय खर्चों पर कठोर नियंत्रण रखें।\n\n"
                    f"### 3. स्थिरता बनाए रखने के व्यावहारिक सूत्र\n"
                    f"1. संस्थागत नीतियों और लिखित समझौतों का पूर्ण पालन करें।\n"
                    f"2. कार्यस्थल पर मौखिक वादों के बजाय पारदर्शी ईमेल और लिखित रिकॉर्ड रखें।"
                )
            else:
                body_md = (
                    f"{greeting_prefix}Scriptural Parashari evaluation of professional stability under your active **{active_maha} Mahadasha** and **{active_antar} Antardasha**:\n\n"
                    f"### 1. Planetary Lordship Dynamics for {lagna} Lagna\n"
                    f"In your natal chart:\n"
                    f"- **Jupiter (Guru):** Rules the 2nd House (accumulated wealth, speech) and 5th House (intellect, discernment, Purva Punya), functioning as a premier functional benefic.\n"
                    f"- **Venus (Shukra):** Rules the 7th House (partnerships, contracts) and 12th House (expenditures, foreign relations), placed in your 11th House of gains (Virgo).\n"
                    f"The interaction between 2nd/5th lord Jupiter and 11th house Venus activates significant commercial intuition and financial acumen, but requires mindful navigation of Venus's 12th lordship.\n\n"
                    f"### 2. Concrete Impact on Professional Stability\n"
                    f"- **Strengths & Growth:** Jupiter's 5th lordship fortifies strategic advisory capabilities, conceptual leadership, and mentorship roles. Your counsel carries institutional weight.\n"
                    f"- **Vulnerabilities to Manage:** Because Venus governs the 12th house of hidden dynamics and outlays, interpersonal misalignment with peers or unvetted contractual commitments can cause temporary friction. Avoid workplace gossip and lateral distractions.\n\n"
                    f"### 3. Actionable Directives for Maximum Stability\n"
                    f"1. **Consolidate Core Authority:** Focus on delivering measurable institutional outcomes before petitioning for external expansions.\n"
                    f"2. **Written Documentation:** Keep commercial and operational agreements strictly documented in writing.\n"
                    f"3. **Disciplined Boundaries:** Maintain ethical neutrality during departmental reorganizations."
                )

        elif intent == "career":
            if is_hi:
                body_md = (
                    f"{greeting_prefix}**{lagna_display} लग्न** हेतु आपकी आजीविका एवं करियर का सूक्ष्म विश्लेषण:\n\n"
                    f"### ज्योतिषीय निदान एवं 10th House (दशम भाव)\n"
                    f"आपकी व्यावसायिक दिशा सक्रिय **{dasha_maha_display} महादशा** एवं **{dasha_antar_display} अंतर्दशा** से निर्देशित हो रही है। {lagna_display} लग्न हेतु दशम भाव (सिंह राशि) के स्वामी सूर्य देव हैं। {moon_display} राशि में चंद्र देव की स्थिति आपको स्वाभाविक कूटनीति, गहन बौद्धिक एकाग्रता और रणनीतिक सूझबूझ प्रदान करती है।\n\n"
                    f"### पदोन्नति एवं सामंजस्य का समय\n"
                    f"आगामी 3 से 6 महीनों में शुभ ग्रहों का गोचर आपके कार्यक्षेत्र में उत्तरदायित्व वृद्धि के संकेत दे रहा है। महत्वपूर्ण संवाद में विनम्रता और धैर्य बनाए रखें।\n\n"
                    f"### व्यावहारिक परामर्श\n"
                    f"काम के साथ-साथ अपने व्यक्तिगत स्वास्थ्य का भी ध्यान रखें। स्थाई व्यावसायिक सफलता संतुलित और शांत मन से ही संभव है।"
                )
            elif persona_id == "dr-sunita-shastri":
                body_md = (
                    f"{greeting_prefix}Analyzing your professional horizon through an empathetic and Jaimini lens for **{lagna} Lagna**:\n\n"
                    f"### Astrological Diagnosis\n"
                    f"Your 10th House of career is {h10_str}, guided under your active **{active_maha} Mahadasha** and **{active_antar} Antardasha**. "
                    f"With your Moon in {moon_sign} ({moon_nak} Nakshatra), your intuitive intelligence and interpersonal diplomacy are your greatest professional assets. "
                    f"In Jaimini astrology, roles demanding high emotional intelligence, stakeholder alignment, and ethical communication will bear the richest fulfillment.\n\n"
                    f"### Timing & Workplace Harmony\n"
                    f"Transiting benefics aspecting your professional houses indicate an opening window over the next 3 to 6 months for "
                    f"expanded responsibility. When navigating workplace tensions, prioritize transparent dialogue over silent endurance.\n\n"
                    f"### Practical Reflection\n"
                    f"Ensure you protect your personal well-being. True career success flourishes when your inner emotional life remains calm and nourished."
                )
            elif persona_id == "pandit-raghavendra":
                body_md = (
                    f"{greeting_prefix}According to classical Parashari Jyotish for **{lagna} Lagna**:\n\n"
                    f"### Scriptural Evaluation of the 10th House (Karma Bhava)\n"
                    f"Sage Parashara states that the 10th house governs *Kirti* (reputation), *Pratishtha* (authority), and *Vyapara* (commerce). "
                    f"In your chart, the 10th house is {h10_str}. Your active Dasha lord **{active_maha}** commands current professional karma.\n\n"
                    f"### Remedial Harmonization for Career Obstacles\n"
                    f"If you experience bureaucratic delays or office politics: Recite the **Aditya Hridaya Stotra** every Sunday morning at dawn "
                    f"and offer clean water with red kumkum to Surya Deva. For your {active_maha} cycle, chanting the **Vishnu Sahasranama** "
                    f"clears hidden impediments and restores executive dignity.\n\n"
                    f"### Karmic Boundaries\n"
                    f"Astrology indicates favorable timing, but righteous diligence (*Purushartha*) remains the supreme prerequisite for sustainable success."
                )
            else:
                body_md = (
                    f"{greeting_prefix}Analyzing the executive trajectory of your **{lagna} Lagna** ({lagna_deg:.2f}°):\n\n"
                    f"### Professional Diagnosis & 10th House Axis\n"
                    f"Your 10th House of professional authority is {h10_str}. You are operating under the influential **{active_maha} Mahadasha** "
                    f"and **{active_antar} Antardasha**. In Parashari doctrine, this planetary combination acts as an institutional accelerator, "
                    f"activating opportunities for public leadership, team expansion, and structured organizational elevation.\n\n"
                    f"### Strategic Milestones & Execution Timing\n"
                    f"1. **Next 60–90 Days:** High-visibility window. Initiate salary reviews, major project proposals, and executive stakeholder alignment.\n"
                    f"2. **Leadership Posture:** Maintain composed, analytical demeanor during high-pressure meetings. Your {lagna} Lagna commands respect when decisions are data-driven.\n"
                    f"3. **Risk Management:** Consolidate your core deliverables before pursuing lateral transitions.\n\n"
                    f"### Practical Reflection\n"
                    f"Align your high-stakes negotiations with planetary Horas governed by functional benefics for optimum clarity."
                )

        elif intent == "marriage":
            if is_hi:
                body_md = (
                    f"{greeting_prefix}**{lagna_display} लग्न** हेतु संबंध एवं वैवाहिक विश्लेषण:\n\n"
                    f"### 7th House of Kalatra एवं वैवाहिक संरचना\n"
                    f"आपके {lagna_display} लग्न में सप्तम भाव (वृषभ राशि) साझेदारी एवं वैवाहिक अनुबंध को दर्शाता है, जिसके स्वामी शुक्र देव हैं।\n"
                    f"- **मांगलिक सत्यापन स्थिति:** **{manglik}**। आपकी कुंडली में मंगल देव अपनी स्वराशि मेष में विराजमान हैं, जिससे वृहत् पाराशर होरा शास्त्र (अध्याय 81) के अनुसार स्वतः शास्त्रीय परिहार (दोष शमन) प्राप्त होता है।\n"
                    f"- **चंद्र स्थिति:** आपका चंद्र **{moon_display}** में स्थित है, जो निष्ठा और संवेदनशीलता प्रदान करता है।\n\n"
                    f"### D9 नवांश एवं जीवनसाथी के गुण\n"
                    f"आपका D9 नवांश चक्र दर्शाता है कि आपके जीवनसाथी बौद्धिक रूप से परिपक्व, व्यावहारिक और पारिवारिक मूल्यों के प्रति समर्पित होंगे। सक्रिय **{dasha_maha_display}-{dasha_antar_display}** दशा में आगामी 8 से 14 महीनों का समय संबंध प्रगाढ़ करने अथवा विवाह के लिए अनुकूल समय खिड़की प्रदान करता है।\n\n"
                    f"### व्यावहारिक परामर्श\n"
                    f"आपसी संवाद में पारदर्शिता रखें। सौम्य संवाद से संबंधों में मधुरता बनी रहती है।"
                )
            elif persona_id == "acharya-devratan":
                body_md = (
                    f"{greeting_prefix}Evaluating relationship stability and marriage timing for **{lagna} Lagna**:\n\n"
                    f"### 7th House of Kalatra & Partnership Analysis\n"
                    f"Your 7th House of Kalatra is {h7_str}, and your marital verification status is: **{manglik}**. "
                    f"Under active **{active_maha}-{active_antar}** Dasha, planetary transits create a structured, supportive window "
                    f"over the next 6 to 12 months for formalizing alliances or stabilizing long-term commitments.\n\n"
                    f"### Strategic Relationship Principles\n"
                    f"Approach partnerships with the same diligence as long-term covenants: prioritize shared financial values, emotional integrity, "
                    f"and mutual respect. Avoid bringing workplace stresses into your home environment."
                )
            elif persona_id == "pandit-raghavendra":
                body_md = (
                    f"{greeting_prefix}In sacred classical Jyotish for **{lagna} Lagna** and **{moon_sign} Moon**:\n\n"
                    f"### Scriptural Evaluation of Kalatra Bhava\n"
                    f"The 7th House governs sacred marital vows (*Vivaha Samskara*). Your 7th house is {h7_str}, and dosha evaluation reflects: **{manglik}**. "
                    f"Your current cycle is guided by **{active_maha} Mahadasha** and **{active_antar} Antardasha**.\n\n"
                    f"### Traditional Harmonization\n"
                    f"To foster marital peace and attract a noble partner: Chant the **Gauri Shankar Mantra** or observe gentle fasts on Thursdays "
                    f"offering yellow fruits to Vishnu and Lakshmi. Keep your conduct truthful and transparent in all domestic affairs.\n\n"
                    f"### Classical Limitations\n"
                    f"A horoscope illuminates compatibility tendencies and timing windows; eternal marital blessing is sustained through mutual forgiveness and dharma."
                )
            else:
                body_md = (
                    f"{greeting_prefix}Examining your relationship architecture through Jaimini and Parashari synastry for **{lagna} Lagna**:\n\n"
                    f"### Emotional & Partnership Geometry\n"
                    f"Under your {lagna} Lagna, your 7th House of partnership is {h7_str}. Regarding marital doshas: **{manglik}**. "
                    f"Your emotional core is rooted in **{moon_sign}** ({moon_nak} Nakshatra), giving you deep empathy, loyalty, and discernment.\n\n"
                    f"### D9 Navamsha & Partner Characteristics\n"
                    f"Your D9 Navamsha indicators point toward a companion who is intellectually mature, emotionally grounded, and shares your core values. "
                    f"Under active **{active_maha}-{active_antar}** Dasha, transiting benefics in Kendra houses activate an auspicious 8 to 14-month window "
                    f"for formalizing partnerships or deepening relationship harmony.\n\n"
                    f"### Mindful Guidance\n"
                    f"Communicate openly about expectations and emotional needs. Gentle transparency during lunar transits prevents needless misunderstandings."
                )

        elif intent == "wealth":
            body_md = (
                f"Analyzing wealth accumulation, Dhana Yogas, and liquidity for **{lagna} Lagna**:\n\n"
                f"### Dhana Yogas & Wealth Axis (2nd & 11th Houses)\n"
                f"In your chart, the 2nd House of liquid wealth is {h2_str}, while the 11th House of recurring gains is {h11_str}. "
                f"Your active **{active_maha} Mahadasha** with **{active_antar} Antardasha** activates auspicious wealth combinations, "
                f"indicating sustained compounding potential when capital is invested with disciplined patience.\n\n"
                f"### Strategic Financial Directives\n"
                f"1. **Capital Allocation:** Favor proven index equity, debt instruments, and stable tangible assets over speculative trends.\n"
                f"2. **Speculative Cautions:** Avoid high-leverage intraday trading during localized Rahu Kaal or volatile lunar aspects.\n"
                f"3. **Long-Term Compounding:** The {active_maha} planetary vibration supports asset accumulation for retirement and family legacy.\n\n"
                f"*Disclaimer: Astrological analysis reflects planetary timing indicators; it does not constitute registered financial or investment advice.*"
            )

        elif intent == "remedy":
            body_md = (
                f"Examining classical Vedic remedial harmonization for **{lagna} Lagna**:\n\n"
                f"### Planetary Evaluation & Saturn Transit\n"
                f"Your chart is currently operating under **{active_maha} Mahadasha** and **{active_antar} Antardasha**, "
                f"with Saturn transiting in **{sadesati}**. The constitutional vitality of your chart is centered in {lagna} Lagna ({lagna_deg:.2f}°).\n\n"
                f"### Prescribed Classical Remedies\n"
                f"- **Maha Mrityunjaya Mantra:** Chanting 108 times at sunrise pacifies malefic transit friction and strengthens the nervous system.\n"
                f"- **Saturnian Discipline:** On Saturdays, light a pure sesame or mustard oil lamp under a Peepal tree and practice selfless charity toward those in need.\n"
                f"- **Gemstone Guidance:** Always fortify your functional Lagna and Trikona lords (such as Yellow Sapphire or Emerald) only after verifying natal house lordships.\n\n"
                f"### Ethical Scriptural Principle\n"
                f"Traditional remedies are cultural and spiritual practices intended to cultivate inner peace, discipline, and humility. They are not transactional commercial guarantees."
            )

        elif intent == "timing":
            body_md = (
                f"Evaluating astrological timing windows and planetary periods for **{lagna} Lagna**:\n\n"
                f"### Active Dasha Subperiods\n"
                f"You are currently navigating **{active_maha} Mahadasha** with **{active_antar} Antardasha**. "
                f"In Parashari Jyotish, the Mahadasha lord sets the broad life theme, while the Antardasha lord governs near-term events and psychological focus.\n\n"
                f"### Near-Term Astrological Windows\n"
                f"- **Current Phase (0–3 Months):** Consolidation and strategic preparation. Ideal for completing backlog and refining plans.\n"
                f"- **Upcoming Phase (3–9 Months):** Enhanced planetary support as transiting benefics transit your supportive houses. Optimal for launches, interviews, and relationship commitments.\n"
                f"- **Long-Term Projection:** The remainder of your {active_maha} cycle provides foundational growth for enduring authority."
            )

        elif intent == "explanation":
            body_md = (
                f"Explaining the classical Parashari principles behind your reading for **{lagna} Lagna**:\n\n"
                f"### The Foundations of Parashari Jyotish\n"
                f"In the Brihat Parashara Hora Shastra, astrological interpretation relies on three synchronized pillars:\n"
                f"1. **Bhava (House Geometry):** Your {lagna} Lagna establishes the 12 Bhavas, determining functional benefics (Lagna and Trikona lords) and malefics (Dusthana lords of 6, 8, 12).\n"
                f"2. **Graha (Planetary Dignity):** Planets express their energies through their exaltation, own signs, and mutual planetary friendships.\n"
                f"3. **Dasha (Karmic Fruition):** Your active **{active_maha}-{active_antar}** Vimshottari cycle dictates exactly when natal promises manifest in chronological time.\n\n"
                f"Every insight shared in your consultation is directly derived from these immutable mathematical coordinates."
            )

        else:
            # General comprehensive reading
            body_md = (
                f"Comprehensive Vedic astrological analysis for **{lagna} Lagna** and **{moon_sign} Moon**:\n\n"
                f"### Natal Constitution & Life Themes\n"
                f"With {lagna} Lagna ({lagna_deg:.2f}°) and Moon in {moon_sign} ({moon_nak} Nakshatra), your chart reflects intellectual depth, "
                f"perseverance, and an innate capacity to manage complex responsibilities. "
                f"Your active **{active_maha}-{active_antar}** Dasha period emphasizes purpose, structured growth, and character maturation.\n\n"
                f"### Planetary Climate & Advice\n"
                f"Saturn in {sadesati} teaches patience and long-term discipline. By maintaining composed focus, establishing balanced daily routines, "
                f"and approaching relationships with clarity, you navigate this period with graceful resilience.\n\n"
                f"Feel free to ask about specific career milestones, relationship harmony, financial compounding, or traditional remedies."
            )

    return {
        "title": f"Vedic Consultation: {persona_display}",
        "query": user_query,
        "category": intent,
        "intent": intent,
        "scope": scope,
        "astrologer_name": persona_display,
        "persona_id": persona_id,
        "message": body_md,
        "reading": body_md,  # Backward compatibility
        "remedy": remedy_card.get("mantra") if remedy_card else "Chant Gayatri Mantra 11 times at dawn.",
        "prescribed_gemstone": remedy_card.get("gemstone_note") if remedy_card else "Consult Lagna Lord dignity before wearing gems.",
        "time_horizon": time_horizon,
        "chartEvidence": chart_evidence,
        "relatedInsights": related_insights,
        "suggestedQuestions": suggested_questions,
        "remedyCard": remedy_card,
        "bilingual_summary": {
            "en": f"Astrological analysis for {lagna} Lagna and {moon_sign} Moon under active {active_maha}-{active_antar} Dasha focused on {intent}.",
            "hi": f"{HINDI_SIGNS.get(lagna, lagna)} लग्न एवं {HINDI_SIGNS.get(moon_sign, moon_sign)} चंद्र हेतु सक्रिय {active_maha}-{active_antar} दशा के अंतर्गत {intent} का विश्लेषण।"
        },
        "status": "completed",
        "astrological_grounding": {
            "lagna": lagna,
            "moon_sign": moon_sign,
            "sun_sign": sun_sign,
            "active_mahadasha": active_maha,
            "active_antardasha": active_antar
        }
    }


def _build_period_items(
    horizon_lower: str,
    target_dt: date,
    is_hi: bool,
    has_chart: bool,
    kundli: Optional[Dict[str, Any]],
    dasha: Optional[Dict[str, Any]],
    doshas: Optional[Dict[str, Any]],
    active_hora_planet: str,
    hora_window: str,
    is_unlocked: bool
) -> Dict[str, Any]:
    lagna = kundli["lagna"]["sign"] if has_chart and kundli and "lagna" in kundli else "Aries"
    lagna_hi = HINDI_SIGNS.get(lagna, lagna)
    moon_sign = kundli["planets"]["Moon"]["sign"] if has_chart and kundli and "planets" in kundli and "Moon" in kundli["planets"] else "Aries"
    moon_hi = HINDI_SIGNS.get(moon_sign, moon_sign)
    moon_nak = kundli["planets"]["Moon"]["nakshatra"] if has_chart and kundli and "planets" in kundli and "Moon" in kundli["planets"] else "Ashwini"
    dasha = dasha or {}
    doshas = doshas or {}
    active_maha = dasha.get("active_now", {}).get("maha_dasha", "Jupiter")
    active_antar = dasha.get("active_now", {}).get("antar_dasha", active_maha)
    maha_hi = HINDI_PLANETS.get(active_maha, active_maha)
    antar_hi = HINDI_PLANETS.get(active_antar, active_antar)

    # 1. HOURLY HORAS (3 Consecutive Intervals)
    if horizon_lower == "hourly":
        h_planet = active_hora_planet or "Jupiter"
        start_idx = CHALDEAN_ORDER.index(h_planet) if h_planet in CHALDEAN_ORDER else 1
        cards = []
        for offset in range(3):
            p = CHALDEAN_ORDER[(start_idx + offset) % len(CHALDEAN_ORDER)]
            p_hi = HINDI_PLANETS.get(p, p)
            mantra_data = BEEJ_MANTRAS.get(p, {})
            energy = "Favorable & Expansive" if p in ["Jupiter", "Venus", "Mercury"] else ("Authoritative & Vital" if p in ["Sun", "Moon"] else "Cautious & Disciplined")
            energy_hi = "शुभ एवं विस्तारक" if p in ["Jupiter", "Venus", "Mercury"] else ("आधिकारिक एवं तेजस्वी" if p in ["Sun", "Moon"] else "सावधानी एवं अनुशासित")
            win = hora_window if offset == 0 else (f"Upcoming Hour (+{offset}h)" if not is_hi else f"आगामी होरा (+{offset} घंटा)")

            lordship_str = None
            lordship_hi = None
            friendship_str = None
            friendship_hi = None
            if has_chart:
                lagnesha = SIGN_LORDS.get(lagna, "Sun")
                is_friend = lagnesha in PLANET_FRIENDS.get(p, {}).get("friends", [])
                is_enemy = lagnesha in PLANET_FRIENDS.get(p, {}).get("enemies", [])
                friendship_str = f"Mitra (Harmonious Friend of Lagnesha {lagnesha})" if is_friend else (f"Shatru (Challenging to Lagnesha {lagnesha})" if is_enemy else f"Sama (Neutral to Lagnesha {lagnesha})")
                friendship_hi = f"मित्र (लग्नेश {HINDI_PLANETS.get(lagnesha, lagnesha)} के अनुकूल)" if is_friend else (f"शत्रु (लग्नेश {HINDI_PLANETS.get(lagnesha, lagnesha)} हेतु सतर्कता)" if is_enemy else f"सम (लग्नेश {HINDI_PLANETS.get(lagnesha, lagnesha)} से तटस्थ)")
                p_houses = get_planet_lordships(p, lagna)
                p_houses_str = f"Houses {', '.join(str(h) for h in p_houses)}" if p_houses else "Chhaya Graha"
                p_houses_hi = f"{', '.join(str(h) for h in p_houses)} भाव" if p_houses else "छाया ग्रह"
                lordship_str = f"Commands {p_houses_str} in {lagna} Lagna"
                lordship_hi = f"{lagna_hi} लग्न में {p_houses_hi} का आधिपत्य"

            if is_hi:
                title = f"{p_hi} होरा ({'सक्रिय' if offset == 0 else f'आगामी +{offset} घंटा'})"
                rec = (
                    f"इस {p_hi} काल में {p_hi} से संबंधित विषयों — "
                    f"{'ज्ञान, वित्तीय परामर्श, और शुभ अनुबंध' if p == 'Jupiter' else ('सौंदर्य, संबंध, कला और सुलह' if p == 'Venus' else ('व्यापार, गणित, संचार और विश्लेषण' if p == 'Mercury' else ('प्रशासन, नेतृत्व और उच्च अधिकारी संवाद' if p == 'Sun' else ('पारिवारिक समन्वय और जनसंपर्क' if p == 'Moon' else ('तकनीकी, साहस और भूमि कार्य' if p == 'Mars' else 'दीर्घकालिक कार्य, अनुशासन और श्रम')))))} — "
                    f"को प्राथमिकता दें। {lordship_hi if lordship_hi else ''}"
                )
                avoid = "उतावलेपन, आक्रोश और अनिर्णय की स्थिति से बचें।" if p in ["Mars", "Saturn"] else "समय का अपव्यय और अनावश्यक विवाद टालें।"
            else:
                title = f"{p} Hora ({'Active Now' if offset == 0 else f'Upcoming +{offset}h'})"
                rec = (
                    f"Prioritize activities resonant with {p}: "
                    f"{'wealth expansion, legal counsel, and sacred studies' if p == 'Jupiter' else ('creative arts, alliances, luxury and social accord' if p == 'Venus' else ('commercial trade, documentation, analytics and writing' if p == 'Mercury' else ('executive leadership, government matters and vital decisions' if p == 'Sun' else ('public relations, domestic wellness and nurturing ties' if p == 'Moon' else ('technical initiative, decisive action and physical tasks' if p == 'Mars' else 'patient structural labor, organization and grounding')))))}. "
                    f"{lordship_str if lordship_str else ''}"
                )
                avoid = "Avoid impulsive haste, contentious debates, or speculative volatility." if p in ["Mars", "Saturn"] else "Avoid trivial distractions and delay of core duties."

            cards.append({
                "period_index": offset + 1,
                "title": title,
                "time_window": win,
                "planet": p,
                "planet_hi": p_hi,
                "energy_category": energy,
                "energy_category_hi": energy_hi,
                "lordship_summary": lordship_str,
                "lordship_summary_hi": lordship_hi,
                "friendship_with_lagna": friendship_str,
                "friendship_with_lagna_hi": friendship_hi,
                "beej_mantra": mantra_data.get("mantra", ""),
                "transliteration": mantra_data.get("transliteration", ""),
                "action_recommendation": rec,
                "avoid": avoid,
                "is_preview_locked": False
            })
        return {"items": cards}

    # 2. DAILY FORECAST (3 DIURNAL PHASES: Pratah, Madhyahna, Nisha)
    if horizon_lower == "daily":
        phases = []
        phases.append({
            "period_index": 1,
            "phase_key": "morning_pratah",
            "title": "प्रातः काल: सूर्योदय से मध्याह्न (06:00 AM – 12:00 PM)" if is_hi else "Morning Phase: Pratah Kala (Dawn to Solar Noon)",
            "time_window": "06:00 AM – 12:00 PM",
            "governing_energy": "सूर्य तेज एवं प्रातःकालीन शुभ होरा" if is_hi else "Solar Vitality & Auspicious Morning Horas",
            "focus_theme": "उच्च प्राथमिकता कार्य, रणनीतिक योजना एवं एकाग्रता" if is_hi else "High-Leverage Strategic Inception & Deep Focus",
            "guidance": (
                f"प्रातःकाल में सूर्योदय के साथ सौर प्राण और शुभ होराएं सक्रिय होती हैं। "
                f"{'आपकी जन्म कुंडली के ' + lagna_hi + ' लग्न और ' + moon_hi + ' चंद्र राशि के लिए यह समय मानसिक स्पष्टता का शिखर है।' if has_chart else 'यह वेला नए कार्यों के शुभारंभ और गहन चिंतन के लिए सर्वाधिक उपयुक्त है।'}"
            ) if is_hi else (
                f"Solar prana and benefic diurnal Horas harmonize conscious focus during morning hours. "
                f"{'For your natal ' + lagna + ' Lagna and ' + moon_sign + ' Moon, this window supports authoritative execution.' if has_chart else 'Auspicious atmospheric alignment for deep intellectual output before operational interruptions.'}"
            ),
            "recommendation": "दिन के सबसे चुनौतीपूर्ण कार्य को 11:30 AM से पूर्व संपन्न करें।" if is_hi else "Complete your most demanding objective before solar noon.",
            "cautions": "दिन के आरंभ में बिखरे हुए डिजिटल संदेशों में समय नष्ट न करें।" if is_hi else "Guard against reactive digital communications during initial focus hours.",
            "auspicious_window": "प्रातः 07:30 AM – 09:30 AM" if is_hi else "07:30 AM – 09:30 AM (Benefic Window)",
            "is_preview_locked": False
        })
        phases.append({
            "period_index": 2,
            "phase_key": "midday_madhyahna",
            "title": "मध्याह्न काल: अभिजित मुहूर्त एवं कर्म संपादन (12:00 PM – 05:30 PM)" if is_hi else "Midday Phase: Madhyahna & Abhijit Muhurta (~11:45 AM – 12:35 PM)",
            "time_window": "12:00 PM – 05:30 PM",
            "governing_energy": "अभिजित मुहूर्त एवं व्यावसायिक गति" if is_hi else "Abhijit Muhurta & Executive Momentum",
            "focus_theme": "बैठकें, सहयोगात्मक समझौते एवं तकनीकी कार्य" if is_hi else "Collaborative Reviews, Contract Negotiation & Execution",
            "guidance": (
                "मध्याह्न वेला में अभिजित मुहूर्त (~11:45 AM – 12:35 PM) अशुभ गोचर दोषों का शमन करता है। "
                "महत्वपूर्ण वार्ताओं, ग्राहक संवाद और समझौतों को अंतिम रूप देने के लिए यह समय श्रेष्ठ है।"
            ) if is_hi else (
                "Midday peak cosmic radiation supports collaborative ventures. The classical Abhijit Muhurta window "
                "(~11:45 AM – 12:35 PM) mitigates ambient transit impurities, favoring pivotal business negotiations."
            ),
            "recommendation": "अनुबंधों पर हस्ताक्षर और टीम समन्वय मध्याह्न में करें।" if is_hi else "Finalize vetted contracts and conduct client negotiations during the afternoon.",
            "cautions": "दैनिक राहुकाल अवधि में सट्टेबाजी या जल्दबाजी के समझौतों से बचें।" if is_hi else "Avoid speculative agreements during the localized Rahu Kaal window.",
            "auspicious_window": "अभिजित मुहूर्त (~11:45 AM – 12:35 PM)" if is_hi else "Abhijit Muhurta (~11:45 AM – 12:35 PM)",
            "is_preview_locked": False
        })
        phases.append({
            "period_index": 3,
            "phase_key": "evening_nisha",
            "title": "सायंकाल एवं निशा: पारिवारिक सौहार्द व विश्राम (05:30 PM – रात्रि)" if is_hi else "Evening & Night Phase: Sayankala & Nisha (Sunset Onward)",
            "time_window": "05:30 PM – 11:30 PM",
            "governing_energy": "चंद्र शांति एवं संध्या होरा" if is_hi else "Lunar Tranquility & Evening Restorative Grahas",
            "focus_theme": "पारिवारिक सौहार्द, स्वाध्याय, ध्यान एवं शांति" if is_hi else "Domestic Well-being, Philosophical Study & Rest",
            "guidance": (
                "सूर्यास्त उपरांत चंद्र ऊर्जा मानसिक शांति और भावनात्मक संतुलन प्रदान करती है। "
                "पारिवारिक सौहार्द, आध्यात्मिक वाचन और आगामी दिन की प्राथमिकताओं के निर्धारण का यह शुभ समय है।"
            ) if is_hi else (
                "Post-sunset lunar transitions soothe neurological intensity. Ideal for domestic connection, "
                "reflective reading, and synthesizing insights from the completed day."
            ),
            "recommendation": "कार्य से औपचारिक विराम लें और सायं ध्यान अथवा स्वाध्याय करें।" if is_hi else "Deliberately disconnect from professional channels; cultivate mindfulness.",
            "cautions": "देर रात गरिष्ठ भोजन और अत्यधिक स्क्रीन समय से बचें।" if is_hi else "Minimize late-night screen exposure to preserve deep sleep cycles.",
            "auspicious_window": "सायं 06:30 PM – 07:45 PM" if is_hi else "06:30 PM – 07:45 PM (Twilight Window)",
            "is_preview_locked": False
        })
        return {"items": phases}

    # 3. WEEKLY FORECAST (7 DATED DAILY CARDS)
    if horizon_lower == "weekly":
        cards = []
        base_moon_idx = SIGNS_LIST.index(moon_sign) if moon_sign in SIGNS_LIST else 0
        lagna_idx = SIGNS_LIST.index(lagna) if lagna in SIGNS_LIST else 0
        day_focus_en = [
            ("Executive Direction & Leadership", "Direct energy toward core goals; communicate with authority and clarity."),
            ("Financial Planning & Resource Allocation", "Review liquidity and budgets; align expenditures with tangible returns."),
            ("Courageous Initiatives & Creative Drive", "Execute bold technical actions; resolve lingering obstacles with vigor."),
            ("Intellectual Analysis & Documentation", "Draft agreements, optimize digital workflows, and deliberate strategic details."),
            ("Wisdom, Mentorship & Institutional Alliances", "Consult seniors, formalize strategic pacts, and study long-term investments."),
            ("Diplomacy, Social Accord & Creative Balance", "Harmonize relationships, foster creative projects, and reward collaborator loyalty."),
            ("Discipline, Restructuring & Contemplative Rest", "Consolidate achievements, practice ethical duty (Dharma), and rest mindfully.")
        ]
        day_focus_hi = [
            ("नेतृत्व एवं आधिकारिक संवाद", "मूल लक्ष्यों पर ऊर्जा केंद्रित करें; आत्मविश्वास और स्पष्टता से संवाद करें।"),
            ("वित्तीय योजना एवं संसाधन प्रबंधन", "बजट और व्यय की समीक्षा करें; संसाधनों का विवेकपूर्ण उपयोग सुनिश्चित करें।"),
            ("साहसिक पहल एवं तकनीकी कर्म", "साहस और संकल्प के साथ लंबित कार्यों को पूर्ण करें; बाधाओं का समाधान करें।"),
            ("बौद्धिक विश्लेषण एवं प्रलेखन", "अनुबंधों का प्रारूप तैयार करें, विश्लेषणात्मक कार्य संपन्न करें और सतर्क रहें।"),
            ("मार्गदर्शन, विद्या एवं संस्थागत सहयोग", "वरिष्ठों से परामर्श लें, दूरगामी योजनाओं को औपचारिक रूप दें और धर्म का पालन करें।"),
            ("सौहार्द, कला एवं सामाजिक सामंजस्य", "संबंधों में प्रगाढ़ता लाएं, कलात्मक कार्यों में संलग्न हों और सहयोगियों का सम्मान करें।"),
            ("अनुशासन, समीक्षा एवं आध्यात्मिक विश्राम", "साप्ताहिक उपलब्धियों का लेखा-जोखा करें, आत्म-मंथन करें और विश्राम लें।")
        ]
        for i in range(7):
            cur = target_dt + timedelta(days=i)
            w_idx = cur.weekday()
            ruler = WEEKDAY_RULERS[w_idx]
            ruler_disp = HINDI_PLANETS.get(ruler, ruler) if is_hi else ruler
            day_name = WEEKDAY_NAMES_HI[w_idx] if is_hi else WEEKDAY_NAMES_EN[w_idx]
            t_moon_idx = (base_moon_idx + int(i / 2.25)) % 12
            t_moon = SIGNS_LIST[t_moon_idx]
            t_moon_disp = HINDI_SIGNS.get(t_moon, t_moon) if is_hi else t_moon
            if has_chart:
                h_num = ((t_moon_idx - lagna_idx + 12) % 12) + 1
                h_meaning = HOUSE_SIGNIFICATORS.get(h_num, "Personal development")
            else:
                h_num = None
                h_meaning = None

            is_locked = (not is_unlocked) and (i >= 2)
            theme, details = (day_focus_hi[i % 7] if is_hi else day_focus_en[i % 7])
            mantra_data = BEEJ_MANTRAS.get(ruler, {}) if has_chart else {}
            auspicious_win = WEEKDAY_AUSPICIOUS_WINDOWS_HI[w_idx] if is_hi else WEEKDAY_AUSPICIOUS_WINDOWS_EN[w_idx]

            # Compute authentic Tara Bala & Chandra Bala when chart is available
            tara_info = None
            chandra_info = None
            if has_chart and moon_nak:
                try:
                    from timing_tools import calculate_tarabala, calculate_chandrabala, NAKSHATRAS
                    b_nak_idx = NAKSHATRAS.index(moon_nak) if moon_nak in NAKSHATRAS else 0
                    t_nak_idx = (b_nak_idx + int(i * 1.5)) % 27
                    tara_res = calculate_tarabala(b_nak_idx, t_nak_idx)
                    chandra_res = calculate_chandrabala(base_moon_idx, t_moon_idx)
                    tara_info = {
                        "name": tara_res["tarabala_name"],
                        "number": tara_res["tarabala_number"],
                        "is_auspicious": tara_res["is_auspicious"],
                        "meaning": tara_res["meaning"]
                    }
                    chandra_info = {
                        "house_from_moon": chandra_res["house_from_moon"],
                        "status": chandra_res["status"],
                        "is_favorable": chandra_res["is_favorable"]
                    }
                except Exception:
                    pass

            if is_locked:
                if has_chart:
                    teaser = (
                        f"🔒 दिवस {i+1} ({day_name}, {cur.strftime('%d %b')}): चंद्र का {t_moon_disp} राशि में गोचर "
                        f"आपके {h_num}वें भाव ({h_meaning.split(',')[0]}) को सक्रिय करेगा। "
                        f"शुभ वेला: {auspicious_win}। संपूर्ण 7-दिवसीय सटीक होरा, अनुकूल मुहूर्त और उपाय ₹49 में अनलॉक करें।"
                    ) if is_hi else (
                        f"🔒 Day {i+1} ({day_name}, {cur.strftime('%b %d')}): Moon transits into sidereal {t_moon}, "
                        f"energizing House {h_num} ({h_meaning.split(',')[0]}). "
                        f"Auspicious Window: {auspicious_win}. Unlock full ₹49 All-Horizons pass for exact hour-by-hour windows, Tara Bala, and remedies."
                    )
                else:
                    teaser = (
                        f"🔒 दिवस {i+1} ({day_name}, {cur.strftime('%d %b')}): सार्वभौमिक चंद्र का {t_moon_disp} राशि में संचरण। "
                        f"शुभ वेला: {auspicious_win}। संपूर्ण 7-दिवसीय विश्लेषण ₹49 में अनलॉक करें।"
                    ) if is_hi else (
                        f"🔒 Day {i+1} ({day_name}, {cur.strftime('%b %d')}): Universal Moon transit into sidereal {t_moon}. "
                        f"Auspicious Window: {auspicious_win}. Unlock full 7-day transit timeline for ₹49."
                    )
                cards.append({
                    "period_index": i + 1,
                    "date": cur.strftime("%Y-%m-%d"),
                    "day_name": day_name,
                    "weekday_ruler": ruler_disp,
                    "transiting_moon": t_moon_disp,
                    "activated_house": h_num,
                    "focus_theme": theme,
                    "auspicious_window": auspicious_win,
                    "tarabala": tara_info,
                    "chandrabala": chandra_info,
                    "is_preview_locked": True,
                    "teaser": teaser
                })
            else:
                if has_chart:
                    guidance_text = (
                        f"आपकी {lagna_hi} लग्न कुंडली अनुसार, आज चंद्र का {t_moon_disp} राशि में संचरण आपके "
                        f"{h_num}वें भाव ({h_meaning}) को प्रकाशित करता है। {ruler_disp} द्वारा शासित इस दिन में {details}"
                    ) if is_hi else (
                        f"Personalized to your chart: Transiting Moon in sidereal {t_moon} activates your "
                        f"natal House {h_num} ({h_meaning}). Governed by {ruler}, {details}"
                    )
                else:
                    guidance_text = (
                        f"सार्वभौमिक गोचर: आज चंद्र का {t_moon_disp} राशि में संचरण {ruler_disp} के दिन-स्वामी प्रभाव में है। "
                        f"सामान्य खगोलीय वायुमंडल {theme} का समर्थन करता है। व्यक्तिगत भाव प्रभाव जानने हेतु जन्म कुंडली बनाएं।"
                    ) if is_hi else (
                        f"Universal transit: Moon traverses sidereal {t_moon} under {ruler}'s weekday governance. "
                        f"General celestial current supports {theme}. Calculate your Janam Kundli to ground in your natal houses."
                    )
                cards.append({
                    "period_index": i + 1,
                    "date": cur.strftime("%Y-%m-%d"),
                    "day_name": day_name,
                    "weekday_ruler": ruler_disp,
                    "transiting_moon": t_moon_disp,
                    "activated_house": h_num,
                    "house_signification": h_meaning,
                    "focus_theme": theme,
                    "guidance": guidance_text,
                    "auspicious_window": auspicious_win,
                    "tarabala": tara_info,
                    "chandrabala": chandra_info,
                    "beej_mantra": mantra_data.get("mantra", ""),
                    "transliteration": mantra_data.get("transliteration", ""),
                    "is_preview_locked": False
                })
        return {"items": cards}

    # 4. MONTHLY FORECAST (4 WEEKS)
    if horizon_lower == "monthly":
        weeks = []
        week_templates_en = [
            ("Week 1: Strategic Inception & Alignment", "Shukla Paksha (Waxing Phase)", "Focus on establishing foundations, launching core milestones, and executive mentorship.", "Favorable for inaugurations and crucial agreements.", "Tuesday & Thursday mornings"),
            ("Week 2: Execution Momentum & Visibility", "Shukla Paksha toward Purnima", "Peak operational momentum. Step into public visibility and pitch key stakeholders.", "Watch interpersonal sensitivity around peak lunar full phase.", "Monday & Friday midday"),
            ("Week 3: Capital Consolidation & Audits", "Krishna Paksha (Waning Phase)", "Focus on budget rationalization, asset audits, and settling pending liabilities.", "Avoid unvetted speculative purchases.", "Wednesday & Thursday afternoons"),
            ("Week 4: Review, Completion & Rejuvenation", "Krishna Paksha toward Amavasya", "Wrap up open commitments, clear mental clutter, and engage in restorative study.", "Take added rest to prevent burnout before new cycle.", "Tuesday evening & Saturday morning")
        ]
        week_templates_hi = [
            ("सप्ताह १: रणनीतिक आधारशिला एवं शुभारंभ", "शुक्ल पक्ष (आरंभिक चरण)", "नई योजनाओं का शिलान्यास, प्राथमिक लक्ष्यों का क्रियान्वयन और वरिष्ठों का मार्गदर्शन।", "नए उपक्रमों और अनुबंधों हेतु अत्यंत शुभ।", "मंगलवार व गुरुवार प्रातः"),
            ("सप्ताह २: कर्म दक्षता एवं सामाजिक विस्तार", "शुक्ल पक्ष (पूर्णिमा की ओर)", "कार्यक्षेत्र में दृश्यता, नेतृत्व और सहयोगियों संग सशक्त समन्वय।", "पूर्णिमा के आसपास भावनात्मक उद्वेग से बचें।", "सोमवार व शुक्रवार मध्याह्न"),
            ("सप्ताह ३: पूंजी संचय एवं परिसंपत्ति समीक्षा", "कृष्ण पक्ष (घटता चंद्रमा)", "वित्तीय समीक्षा, बजट संतुलन, बकाया दायित्वों की पूर्णता।", "जोखिम भरे सट्टेबाजी के सौदों से परहेज करें।", "बुधवार व गुरुवार अपराह्न"),
            ("सप्ताह ४: समीक्षा, पूर्णता एवं आत्म-मंथन", "कृष्ण पक्ष (अमावस्या की ओर)", "पुराने कार्यों का समापन, मानसिक शांति और आध्यात्मिक पुनर्नवा।", "थकान से बचने हेतु पर्याप्त विश्राम और सात्विक आहार लें।", "मंगलवार सायं व शनिवार प्रातः")
        ]
        for w in range(4):
            w_start = target_dt + timedelta(days=w * 7)
            w_end = target_dt + timedelta(days=(w + 1) * 7 - 1)
            is_locked = (not is_unlocked) and (w >= 1)
            tpl = week_templates_hi[w] if is_hi else week_templates_en[w]

            focus_g = tpl[2]
            if has_chart:
                if is_hi:
                    focus_g = f"आपकी {lagna_hi} लग्न कुंडली एवं {maha_hi} महादशा अंतर्गत: " + tpl[2]
                else:
                    focus_g = f"For your {lagna} Lagna under {active_maha} Mahadasha: " + tpl[2]

            if is_locked:
                teaser = (
                    f"🔒 सप्ताह {w+1} ({w_start.strftime('%d %b')} – {w_end.strftime('%d %b')}): "
                    f"{tpl[1]} अंतर्गत करियर और वित्तीय गोचर। संपूर्ण मासिक विश्लेषण ₹49 में अनलॉक करें।"
                ) if is_hi else (
                    f"🔒 Week {w+1} ({w_start.strftime('%b %d')} – {w_end.strftime('%b %d')}): "
                    f"Deep transit analysis for {tpl[1]}. Unlock complete 4-week blueprint for ₹49."
                )
                weeks.append({
                    "period_index": w + 1,
                    "date_range": f"{w_start.strftime('%Y-%m-%d')} to {w_end.strftime('%Y-%m-%d')}",
                    "title": tpl[0],
                    "lunar_phase": tpl[1],
                    "is_preview_locked": True,
                    "teaser": teaser
                })
            else:
                weeks.append({
                    "period_index": w + 1,
                    "date_range": f"{w_start.strftime('%Y-%m-%d')} to {w_end.strftime('%Y-%m-%d')}",
                    "title": tpl[0],
                    "lunar_phase": tpl[1],
                    "focus_guidance": focus_g,
                    "opportunities": tpl[3],
                    "favorable_windows": tpl[4],
                    "is_preview_locked": False
                })
        return {"items": weeks}

    # 5. YEARLY FORECAST (12 MONTHS + 4 QUARTERS)
    if horizon_lower == "yearly":
        months = []
        month_names_en = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        month_names_hi = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"]
        quarters_en = [
            {"quarter": "Q1", "title": "Foundation & Strategic Realignment", "theme": "Restructure workflows, consolidate reputation, and establish sustainable momentum."},
            {"quarter": "Q2", "title": "Capital Growth & Asset Compounding", "theme": "Compound investments, optimize tax and budget lines, and negotiate major partnerships."},
            {"quarter": "Q3", "title": "Intellectual Mastery & Expansion", "theme": "Deepen professional mastery, publish works, or undertake pilgrimage/auspicious travel."},
            {"quarter": "Q4", "title": "Domestic Consolidation & Celebration", "theme": "Celebrate family milestones, consolidate property, and conduct annual charitable reflection."}
        ]
        quarters_hi = [
            {"quarter": "Q1", "title": "प्रथम त्रैमास: आधारशिला एवं पुनर्गठन", "theme": "कार्यशैली का पुनर्गठन, प्रतिष्ठा संवर्धन और सतत प्रगति की नींव।"},
            {"quarter": "Q2", "title": "द्वितीय त्रैमास: पूंजी संचय एवं वित्तीय मजबूती", "theme": "विवेकपूर्ण निवेश, बजट अनुशासन और रणनीतिक साझेदारियों का लाभ।"},
            {"quarter": "Q3", "title": "तृतीय त्रैमास: विद्या, शोध एवं आध्यात्मिक उन्नति", "theme": "बौद्धिक विकास, उच्च अध्ययन, तीर्थाटन और ज्ञानार्जन।"},
            {"quarter": "Q4", "title": "चतुर्थ त्रैमास: गृह सुख, पारिवारिक मांगलिक कार्य", "theme": "पारिवारिक सौहार्द, संपत्ति स्थिरीकरण और वार्षिक परोपकार।"}
        ]
        lagna_idx = SIGNS_LIST.index(lagna) if lagna in SIGNS_LIST else 0

        for m in range(12):
            cal_month_idx = (target_dt.month - 1 + m) % 12
            cal_year = target_dt.year + ((target_dt.month - 1 + m) // 12)
            m_name = month_names_hi[cal_month_idx] if is_hi else month_names_en[cal_month_idx]
            q_num = (m // 3) + 1
            is_locked = (not is_unlocked) and (m >= 3)
            solar_sign_idx = (cal_month_idx + 9) % 12
            s_sign = SIGNS_LIST[solar_sign_idx]
            s_sign_disp = HINDI_SIGNS.get(s_sign, s_sign) if is_hi else s_sign
            h_num = ((solar_sign_idx - lagna_idx + 12) % 12) + 1 if has_chart else None
            h_meaning = HOUSE_SIGNIFICATORS.get(h_num, "Personal evolution") if h_num else None

            if is_locked:
                teaser = (
                    f"🔒 माह {m+1} ({m_name} {cal_year}): सूर्य का {s_sign_disp} संक्रांति गोचर। "
                    f"Q{q_num} के अंतर्गत संपूर्ण 12-माह फलादेश व शुभ मुहूर्त ₹49 में अनलॉक करें।"
                ) if is_hi else (
                    f"🔒 Month {m+1} ({m_name} {cal_year}): Sun ingress into sidereal {s_sign}. "
                    f"Unlock complete 12-month transit map and timings with the ₹49 All-Horizons pass."
                )
                months.append({
                    "period_index": m + 1,
                    "month_name": f"{m_name} {cal_year}",
                    "quarter": f"Q{q_num}",
                    "solar_sign": s_sign_disp,
                    "activated_house": h_num,
                    "is_preview_locked": True,
                    "teaser": teaser
                })
            else:
                if has_chart and h_num:
                    guidance_m = (
                        f"{m_name} {cal_year} में सूर्य का {s_sign_disp} राशि में गोचर आपके जन्म लग्न से {h_num}वें भाव ({h_meaning.split(',')[0]}) को प्रकाशित करता है। "
                        f"आपकी {maha_hi} महादशा के सहयोग से, यह कालखंड "
                        f"{'व्यावसायिक प्रतिष्ठा, नेतृत्व और आधिकारिक संवाद' if h_num in [1, 9, 10] else ('पूंजी संचय, वित्तीय स्थिरता और संपत्ति नियोजन' if h_num in [2, 4, 11] else ('रचनात्मक नवाचार, समझौते और बौद्धिक अनुसंधान' if h_num in [3, 5, 7] else 'दैनिक अनुशासन, स्वास्थ्य सुधार और आध्यात्मिक साधना'))} "
                        f"हेतु अनुकूलता देगा।"
                    ) if is_hi else (
                        f"In {m_name} {cal_year}, the Sun traverses sidereal {s_sign}, activating your natal House {h_num} ({h_meaning.split(',')[0]}). "
                        f"Supported by your {active_maha} Dasha, focus is directed toward "
                        f"{'executive authority, vocational milestone delivery, and senior mentorship' if h_num in [1, 9, 10] else ('balance sheet consolidation, treasury growth, and asset security' if h_num in [2, 4, 11] else ('strategic partnerships, creative breakthroughs, and collaborative pacts' if h_num in [3, 5, 7] else 'operational efficiency, health optimization, and disciplined service'))}."
                    )
                else:
                    guidance_m = (
                        f"{m_name} {cal_year} में सौर गोचर {s_sign_disp} राशि में रहेगा। "
                        f"यह खगोलीय अवधि करियर में निरंतरता, वित्तीय स्थिरता और व्यवस्थित कर्म का समर्थन करती है।"
                    ) if is_hi else (
                        f"Sun traverses sidereal {s_sign} during {m_name} {cal_year}. "
                        f"Universal transit alignment favors steady professional compounding, structured labor, and ethical integrity."
                    )
                months.append({
                    "period_index": m + 1,
                    "month_name": f"{m_name} {cal_year}",
                    "quarter": f"Q{q_num}",
                    "solar_sign": s_sign_disp,
                    "activated_house": h_num,
                    "guidance": guidance_m,
                    "focus_theme": f"Q{q_num} Strategic Execution",
                    "is_preview_locked": False
                })
        return {
            "items": months,
            "quarters": quarters_hi if is_hi else quarters_en
        }

    # 6. MAHADASHA (5-YEAR TIMELINE)
    if horizon_lower in ["mahadasha", "5year", "five_year"]:
        if not has_chart:
            return {
                "items": [],
                "requires_chart": True,
                "message": (
                    "विंशोत्तरी महादशा कालखंड आपकी जन्म कालीन चंद्र राशि और नक्षत्र पर आधारित होता है। सटीक 5-वर्षीय विंशोत्तरी कालखंड देखने के लिए अपनी जन्म कुंडली बनाएं।"
                    if is_hi else
                    "Personalized 5-year Vimshottari Mahadasha timeline requires a calculated birth chart. Vimshottari Dasha calculations depend on the exact degree of your natal Moon at birth. Please calculate your Janam Kundli to unlock your active Mahadasha and 5-year subperiod timeline."
                )
            }

        years = []
        year_themes_en = [
            ("Year 1: Foundation Building & Mentorship", "Consolidating core reputation, securing reliable sponsors, and organizing routines.", "Avoid scattered multi-tasking.", "Recite active Mahadasha Lord Beej Mantra on designated weekday."),
            ("Year 2: Capital Compounding & Asset Growth", "Prudent investment compounding, property stabilization, and high-trust alliances.", "Guard against over-leveraged loans.", "Practice Saturday charity (Daan) of black sesame or mustard oil."),
            ("Year 3: Intellectual Mastery & Spiritual Expansion", "Scholarly achievements, philosophical depth, publication, and purposeful journeying.", "Keep pride in check during triumphs.", "Recite Vishnu Sahasranama or Gayatri Mantra at sunrise."),
            ("Year 4: Domestic Peace & Generational Harmony", "Deepening family bonds, matrimonial harmony, domestic property enhancements.", "Maintain clear financial boundaries with relatives.", "Light a ghee lamp before family altar daily."),
            ("Year 5: Karmic Fruition & Advisory Leadership", "Transition into respected consultative authority, fulfillment of major milestones.", "Prepare humbly for subsequent Dasha shift.", "Support educational or healthcare causes for the underprivileged.")
        ]
        year_themes_hi = [
            ("वर्ष १: आधारशिला निर्माण एवं मार्गदर्शन", "व्यावसायिक साख को सुदृढ़ करना, वरिष्ठ गुरुओं का सानिध्य और दिनचर्या में स्थिरता।", "एक साथ अनेक कार्यों में ऊर्जा न बिखेरें।", "सक्रिय महादशा स्वामी के बीज मंत्र का नियमित जप करें।"),
            ("वर्ष २: पूंजी संचय एवं परिसंपत्ति विस्तार", "विवेकपूर्ण निवेश, संपत्ति सुरक्षा और विश्वस्त व्यावसायिक साझेदारियों का निर्माण।", "अनावश्यक ऋण या वित्तीय जोखिम से बचें।", "शनिवार को काले तिल अथवा सरसों के तेल का दान करें।"),
            ("वर्ष ३: बौद्धिक उत्कर्ष एवं आध्यात्मिक ज्ञान", "ज्ञानार्जन, शोध, दार्शनिक परिपक्वता, लेखन अथवा मांगलिक यात्राएं।", "सफलता के क्षणों में अहंकार से बचें।", "सूर्योदय काल में श्री विष्णु सहस्रनाम अथवा गायत्री मंत्र का पाठ करें।"),
            ("वर्ष ४: पारिवारिक सौहार्द एवं दांपत्य सुख", "घरेलू शांति, दांपत्य सामंजस्य, आवास में सुधार और सामाजिक मान-प्रतिष्ठा।", "पारिवारिक मामलों में वित्तीय पारदर्शिता रखें।", "नियमित रूप से घर में शुद्ध घी का दीपक प्रज्वलित करें।"),
            ("वर्ष ५: कर्म सिद्धि एवं सलाहकार नेतृत्व", "सलाहकार पद, जीवन के प्रमुख लक्ष्यों की पूर्ति और दीर्घकालिक कृतज्ञता।", "आगामी दशा संक्रमण हेतु विनम्रतापूर्वक तैयारी करें।", "विद्यार्थियों अथवा निर्धनों की शिक्षा व स्वास्थ्य में सहयोग दें।")
        ]
        start_year = target_dt.year
        for y in range(5):
            lbl = f"Year {y+1} ({start_year + y}–{start_year + y + 1})" if not is_hi else f"वर्ष {y+1} ({start_year + y}–{start_year + y + 1})"
            is_locked = (not is_unlocked) and (y >= 1)
            yt = year_themes_hi[y] if is_hi else year_themes_en[y]

            if is_locked:
                teaser = (
                    f"🔒 {lbl}: {active_maha if not is_hi else maha_hi} महादशा अंतर्गत "
                    f"{yt[0].split(':')[1] if ':' in yt[0] else yt[0]}। संपूर्ण 5-वर्षीय विंशोत्तरी कालखंड ₹49 में अनलॉक करें।"
                ) if is_hi else (
                    f"🔒 {lbl}: Under {active_maha} Mahadasha — {yt[0]}. "
                    f"Unlock complete 5-year chronological timeline and remedies with ₹49 pass."
                )
                years.append({
                    "period_index": y + 1,
                    "year_label": lbl,
                    "ruling_period": f"{active_maha} Mahadasha" if not is_hi else f"{maha_hi} महादशा",
                    "is_preview_locked": True,
                    "teaser": teaser
                })
            else:
                years.append({
                    "period_index": y + 1,
                    "year_label": lbl,
                    "ruling_period": f"{active_maha} Mahadasha / {active_antar} Antardasha" if not is_hi else f"{maha_hi} महादशा / {antar_hi} अंतर्दशा",
                    "title": yt[0],
                    "strategic_theme": yt[1],
                    "cautions": yt[2],
                    "vedic_remedy": yt[3],
                    "is_preview_locked": False
                })
        return {"items": years}

    return {"items": []}


def _build_remedies_and_precautions(
    horizon_lower: str,
    is_hi: bool,
    hora_planet: str,
    active_maha: Optional[str] = None,
    challenges: Optional[List[str]] = None,
    reflection: Optional[str] = None,
    has_chart: bool = False
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Constructs shastric remedies and precautions grounded in active hora or dasha ruler."""
    if not has_chart:
        active_remedy_planet = hora_planet or "Sun"
        remedy_planet_disp = HINDI_PLANETS.get(active_remedy_planet, active_remedy_planet) if is_hi else active_remedy_planet
        remedy_mantra_info = BEEJ_MANTRAS.get(active_remedy_planet, BEEJ_MANTRAS.get("Sun", {}))
        remedy_payload = {
            "title": "सामान्य खगोलीय चिंतन" if is_hi else "Universal Transit Reflection",
            "trigger": f"सार्वभौमिक {remedy_planet_disp} गोचर/होरा प्रभाव" if is_hi else f"Universal {active_remedy_planet} Transit/Hora resonance",
            "planet": active_remedy_planet,
            "mantra": remedy_mantra_info.get("mantra", ""),
            "transliteration": remedy_mantra_info.get("transliteration", ""),
            "japa_count": 1,
            "practice_timing": "प्रातः सूर्योदय अथवा शांत समय में" if is_hi else "At sunrise or during quiet contemplation",
            "charity": "सार्वभौमिक सात्विक परोपकार एवं पक्षियों/जीवों को अन्न-जल दें।" if is_hi else "General sattvic charity and sharing food with those in need.",
            "gemstone_guidance": (
                "व्यक्तिगत रत्न धारण हेतु जन्म कुंडली के लग्न, पंचम व नवम भावों का विश्लेषण अनिवार्य है। केवल गोचर अथवा होरा आधार पर रत्न कभी धारण न करें।" if is_hi
                else "Gemstone prescriptions strictly require authentic natal chart analysis. Never wear gemstones based on universal transits."
            ),
            "provenance": "Classical Vedic Contemplation Baseline",
            "is_personalized": False
        }
        precaution_payload = {
            "title": "सामान्य खगोलीय समय निर्देश" if is_hi else "General Astronomical Timing Guidance",
            "rahu_kaal_guidance": (
                "स्थानीय दैनिक राहुकाल के दौरान महत्वपूर्ण अनुबंधों या सट्टेबाजी के सौदों से परहेज करें।" if is_hi
                else "Avoid initiating major speculative trades or signing contentious contracts during local Rahu Kaal."
            ),
            "yamaganda_guidance": (
                "यमगंड काल में लंबी यात्रा अथवा महत्वपूर्ण वार्ताओं में अतिरिक्त सतर्कता बरतें।" if is_hi
                else "Exercise deliberate patience during Yamaganda; double-check transit documentation."
            ),
            "transit_warnings": challenges or [],
            "behavioral_advice": reflection or "",
            "disclaimer": (
                "यह सामान्य खगोलीय गोचर मार्गदर्शन है, व्यक्तिगत कुंडली फलादेश नहीं। व्यक्तिगत प्रभाव जानने हेतु अपनी जन्म कुंडली बनाएं।" if is_hi
                else "This is universal astronomical transit guidance, not a personalized birth chart prediction. Calculate your Janam Kundli for chart-grounded interpretations."
            )
        }
        return remedy_payload, precaution_payload

    if horizon_lower == "hourly":
        active_remedy_planet = hora_planet
        remedy_planet_disp = HINDI_PLANETS.get(active_remedy_planet, active_remedy_planet) if is_hi else active_remedy_planet
        trigger = f"सक्रिय {remedy_planet_disp} होरा प्रभाव" if is_hi else f"Active {active_remedy_planet} Hora resonance"
        practice_timing = (
            f"वर्तमान {remedy_planet_disp} होरा काल अथवा प्रातः सूर्योदय में १०८ बार जप करें।" if is_hi
            else f"Recite 108 times during this {active_remedy_planet} Hora window or at dawn."
        )
    elif has_chart and active_maha:
        active_remedy_planet = active_maha
        remedy_planet_disp = HINDI_PLANETS.get(active_remedy_planet, active_remedy_planet) if is_hi else active_remedy_planet
        trigger = f"सक्रिय {remedy_planet_disp} महादशा प्रभाव" if is_hi else f"Active {active_remedy_planet} Mahadasha resonance"
        practice_timing = (
            f"प्रातः सूर्योदय अथवा {remedy_planet_disp} होरा में १०८ बार जप करें।" if is_hi
            else f"Recite 108 times at sunrise or during {active_remedy_planet} Hora."
        )
    else:
        active_remedy_planet = hora_planet
        remedy_planet_disp = HINDI_PLANETS.get(active_remedy_planet, active_remedy_planet) if is_hi else active_remedy_planet
        trigger = f"सार्वभौमिक {remedy_planet_disp} गोचर/होरा प्रभाव" if is_hi else f"Universal {active_remedy_planet} Transit/Hora resonance"
        practice_timing = (
            f"प्रातः सूर्योदय अथवा {remedy_planet_disp} होरा में १०८ बार जप करें।" if is_hi
            else f"Recite 108 times at sunrise or during {active_remedy_planet} Hora."
        )

    remedy_mantra_info = BEEJ_MANTRAS.get(active_remedy_planet, BEEJ_MANTRAS.get("Jupiter", {}))

    remedy_payload = {
        "title": "शुभ वैदिक उपाय" if is_hi else "Auspicious Vedic Remedies",
        "trigger": trigger,
        "planet": active_remedy_planet,
        "mantra": remedy_mantra_info.get("mantra", ""),
        "transliteration": remedy_mantra_info.get("transliteration", ""),
        "japa_count": 108,
        "practice_timing": practice_timing,
        "charity": (
            f"{remedy_planet_disp} के दिन सात्विक अन्न, काले तिल, फल अथवा वस्त्रों का दान करें।" if is_hi
            else f"Perform sattvic charity (Daan) of food, grain, fruits, or clothing on {active_remedy_planet}'s day."
        ),
        "gemstone_guidance": (
            "व्यक्तिगत रत्न धारण हेतु जन्म कुंडली के लग्न, पंचम व नवम भावों का विश्लेषण अनिवार्य है। केवल गोचर अथवा होरा आधार पर रत्न धारण न करें; जप और दान सुरक्षित व प्रभावी हैं।" if is_hi
            else "Chart-specific gemstone prescriptions require verified D1/D9 assessment. Avoid wearing gemstones based solely on daily transit Horas; reliance on Beej Mantra and Daan is recommended."
        ),
        "provenance": "Classical Parashari Jyotish Mantrokt Vidhi"
    }

    precaution_payload = {
        "title": "ज्योतिषीय सावधानियां एवं गोचर चेतावनी" if is_hi else "Astrological Precautions & Transit Warnings",
        "rahu_kaal_guidance": (
            "स्थानीय दैनिक राहुकाल के दौरान नवीन वित्तीय अनुबंध, भूमि क्रय-विक्रय अथवा सट्टेबाजी के सौदों से परहेज करें।" if is_hi
            else "Avoid initiating major speculative trades or signing contentious contracts during local Rahu Kaal."
        ),
        "yamaganda_guidance": (
            "यमगंड काल में लंबी यात्रा अथवा महत्वपूर्ण वार्ताओं के शुभारंभ में विशेष सावधानी रखें।" if is_hi
            else "Exercise deliberate patience during Yamaganda; double-check transit documentation."
        ),
        "transit_warnings": challenges or [],
        "behavioral_advice": reflection or "",
        "disclaimer": (
            "ज्योतिषीय गोचर एवं होरा प्रवृत्तियां शुभ व सतर्कता कालखंड का मार्गदर्शन करती हैं, किसी निश्चित अनिष्ट का नहीं। सचेत पुरुषार्थ, नीति और एकाग्रता सर्वोच्च हैं।" if is_hi
            else "Vedic planetary cautions outline qualitative atmospheric tendencies rather than deterministic harm. Personal diligence, ethical conduct, and clear priorities govern lived outcomes."
        )
    }
    return remedy_payload, precaution_payload


def generate_structured_prediction(
    horizon: str,
    target_date_str: str,
    kundli: Optional[Dict[str, Any]] = None,
    dasha: Optional[Dict[str, Any]] = None,
    doshas: Optional[Dict[str, Any]] = None,
    active_hora_planet: Optional[str] = None,
    hora_window: Optional[str] = None,
    category: str = "general",
    lang: str = "en",
    is_unlocked: bool = False,
    preview_tier: str = "FREE"
) -> Dict[str, Any]:
    hora_planet = active_hora_planet or "Jupiter"
    time_window_str = hora_window or "Current Astronomical Interval"
    horizon_lower = horizon.lower()
    is_hi = bool(lang and lang.lower().startswith("hi"))
    hora_hi = HINDI_PLANETS.get(hora_planet, hora_planet)

    try:
        target_dt = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except Exception:
        target_dt = date.today()

    period_start = target_dt.strftime("%Y-%m-%d")
    if horizon_lower == "weekly":
        period_end = (target_dt + timedelta(days=6)).strftime("%Y-%m-%d")
    elif horizon_lower == "monthly":
        period_end = (target_dt + timedelta(days=27)).strftime("%Y-%m-%d")
    elif horizon_lower == "yearly":
        period_end = (target_dt + timedelta(days=364)).strftime("%Y-%m-%d")
    elif horizon_lower in ["mahadasha", "5year", "five_year"]:
        period_end = f"{target_dt.year + 5}-{target_dt.month:02d}-{target_dt.day:02d}"
    else:
        period_end = period_start

    period_info = {
        "start_date": period_start,
        "end_date": period_end,
        "timezone": "Asia/Kolkata",
        "horizon": horizon_lower
    }

    is_preview = not is_unlocked if horizon_lower in ["weekly", "monthly", "yearly", "mahadasha", "5year", "five_year"] else False
    preview_info = {
        "is_preview": is_preview,
        "unlocked": is_unlocked if horizon_lower in ["weekly", "monthly", "yearly", "mahadasha", "5year", "five_year"] else True,
        "preview_scope": (
            "100% Full Access" if (is_unlocked or horizon_lower in ["hourly", "daily"])
            else ("Days 1–2 Full Preview (Days 3–7 Gated)" if horizon_lower == "weekly"
            else ("Week 1 Full Preview (Weeks 2–4 Gated)" if horizon_lower == "monthly"
            else ("Q1 Full Preview (Q2–Q4 Gated)" if horizon_lower == "yearly"
            else "Year 1 Full Preview (Years 2–5 Gated)")))
        )
    }

    period_items = _build_period_items(
        horizon_lower=horizon_lower,
        target_dt=target_dt,
        is_hi=is_hi,
        has_chart=bool(kundli and isinstance(kundli, dict) and "lagna" in kundli and "planets" in kundli),
        kundli=kundli,
        dasha=dasha,
        doshas=doshas,
        active_hora_planet=hora_planet,
        hora_window=time_window_str,
        is_unlocked=is_unlocked
    )

    if not kundli:
        # Canonical unpersonalized general transit guidance (no fabricated Lagna or Moon)
        if horizon_lower == "hourly":
            if is_hi:
                report_title = f"प्रति घंटा सार्वभौमिक मार्गदर्शन: {hora_hi} होरा ({time_window_str})"
                summary = (
                    f"सक्रिय {hora_hi} होरा ({time_window_str}) सार्वभौमिक खगोलीय कालखंड में रणनीतिक विवेक, एकाग्रता और अनुशासित संवाद को शक्ति प्रदान करती है। "
                    f"शास्त्रीय होरा चक्र के अनुसार, यह अवधि बौद्धिक योजना, महत्वपूर्ण प्रपत्रों की समीक्षा और प्राथमिकताओं के संपादन हेतु अत्यंत अनुकूल है। "
                    f"होरा का मध्यवर्ती समय सर्वोच्च स्पष्टता प्रदान करता है, जबकि संधिकाल में उतावलेपन से बचना चाहिए। "
                    f"व्यक्तिगत लग्न व भाव प्रभाव जानने हेतु जन्म कुंडली की गणना करें।"
                )
                overall = (
                    f"इस सार्वभौमिक {hora_hi} होरा के दौरान, आकाशीय ऊर्जाएं रणनीतिक योजना, विश्लेषणात्मक विवेक और "
                    f"सार्थक संवाद को सशक्त बनाती हैं। शास्त्रीय वैदिक ज्योतिष में ग्रहीय होरा समय के अनुकूल उपयोग का मार्गदर्शन करती है।"
                )
                supportive = [
                    f"{hora_hi} के प्रभाव वाले कार्यों (योजना, वार्ता और संगठित कार्य) में उच्च मानसिक एकाग्रता।",
                    "विश्लेषणात्मक कार्यों की समीक्षा और महत्वपूर्ण संदेशों के प्रारूपण के लिए अनुकूल समय।",
                    "गंभीर विचार-विमर्श और अनुशासित कार्य निष्पादन के लिए शुभ आकाशीय अवधि।"
                ]
                challenges = [
                    "होरा संक्रमण काल के दौरान जल्दबाजी या प्रतिक्रियात्मक निर्णय लेने से बचें।",
                    "महत्वपूर्ण चर्चाओं में शांत चित्त बनाए रखें ताकि किसी प्रकार का तनाव उत्पन्न न हो।",
                    "मानसिक थकान से बचने के लिए महत्वपूर्ण कार्यों के बीच 5 मिनट का विराम लें।"
                ]
                windows = [
                    f"सक्रिय होरा काल: {time_window_str} ({hora_hi} द्वारा शासित)",
                    "सर्वोत्तम एकाग्रता खिड़की: महत्वपूर्ण वार्तालाप हेतु होरा के मध्य 30 मिनट",
                    "सावधानी अवधि: स्थानीय दैनिक राहुकाल के दौरान अतिरिक्त सतर्कता बरतें"
                ]
                why = (
                    f"यह फलादेश स्विस एफिमेरिस द्वारा गणना की गई {hora_hi} होरा के सार्वभौमिक गुणों पर आधारित है। "
                    "अपने जन्म लग्न और विंशोत्तरी दशा के अनुसार व्यक्तिगत मार्गदर्शन के लिए टैब 1 में जन्म कुंडली बनाएं।"
                )
                reflection = f"इस {hora_hi} होरा में अपने सबसे महत्वपूर्ण कार्य को प्राथमिकता दें और एकाग्रता से पूर्ण करें।"
                limitations = "सार्वभौमिक गोचर सामान्य खगोलीय समय को दर्शाता है। व्यक्तिगत परिणाम आपकी जन्म कुंडली और पुरुषार्थ पर निर्भर करते हैं।"
            else:
                report_title = f"Hourly Universal Guidance: {hora_planet} Hora ({time_window_str})"
                summary = (
                    f"Active {hora_planet} Hora ({time_window_str}) provides a focused universal astronomical window for disciplined execution, analytical discernment, and structured planning. "
                    f"In classical Jyotish, diurnal planetary hours attune conscious effort with the natural significations of the governing planetary ruler. "
                    f"The central 30 minutes of this Hora interval offer maximum intellectual throughput for high-priority tasks, while impulsive commitments should be deferred. "
                    f"To ground these planetary hours in your natal houses, calculate your Janam Kundli."
                )
                overall = (
                    f"During this universal {hora_planet} Hora, celestial energies emphasize focused strategic action, "
                    f"analytical discernment, and purposeful communication. In classical Vedic astrology, planetary Horas "
                    f"delineate qualitative atmospheric currents that assist in timing activities constructively."
                )
                supportive = [
                    f"Enhanced mental focus for initiatives aligned with {hora_planet} significations (planning, negotiation, and structured organization).",
                    "Constructive window for reviewing analytical projects, composing important messages, or taking structured breaks.",
                    "Favorable planetary window for thoughtful deliberation and disciplined execution."
                ]
                challenges = [
                    "Avoid hasty, reactive conclusions during transitions between diurnal Hora intervals.",
                    "Maintain emotional poise during high-stakes discussions to mitigate transitory astral tension.",
                    "Prevent mental exhaustion by taking intentional 5-minute pauses between major tasks."
                ]
                windows = [
                    f"Active Hora Interval: {time_window_str} (Governed by {hora_planet})",
                    "Recommended Focus Window: Peak middle 30 minutes of the active Hora for vital communications",
                    "Cautionary Window: Exercise added diligence during localized daily Rahu Kaal intervals"
                ]
                why = (
                    f"This guidance reflects the universal qualities of the active {hora_planet} Hora as calculated via Swiss Ephemeris. "
                    "To receive 100% chart-grounded interpretations derived from your personal Ascendant, Moon sign, and Vimshottari Dasha, "
                    "calculate your Janam Kundli in Tab 1."
                )
                reflection = f"Choose one primary priority during this {hora_planet} hour. Complete it with deliberate care before taking on secondary obligations."
                limitations = "Universal transit interpretations represent general celestial timing. Individual outcomes are shaped by your personal birth chart, conscious initiative, and practical diligence."

        elif horizon_lower == "daily":
            if is_hi:
                report_title = f"दैनिक सार्वभौमिक गोचर पूर्वानुमान: {target_date_str}"
                summary = (
                    f"स्विस एफिमेरिस द्वारा संगणित {target_date_str} का दैनिक खगोलीय गोचर चक्र सौर ऊर्जा, चंद्र स्थिति और अहोरात्र होराओं के सामंजस्य को प्रकट करता है। "
                    f"यह चक्र प्रातःकालीन एकाग्रता, मध्याह्न अभिजित मुहूर्त (~11:45 AM – 12:35 PM) में व्यावसायिक गति और सायंकाल में विश्राम का समर्थन करता है। "
                    f"स्थानीय दैनिक राहुकाल के दौरान सट्टेबाजी अथवा अपरीक्षित अनुबंधों से बचना चाहिए। "
                    f"व्यक्तिगत जन्म लग्न व भाव सक्रियता देखने के लिए जन्म कुंडली लोड करें।"
                )
                overall = (
                    "आज की आकाशीय स्थिति अनुशासित कर्म, स्पष्ट संवाद और व्यवस्थित प्रगति का संकेत देती है। "
                    "शास्त्रीय ज्योतिष दैनिक शुभ होरा के अनुसार मुख्य कार्य आरंभ करने का परामर्श देता है।"
                )
                supportive = [
                    "प्रातःकाल: शुभ सौर व ग्रहीय होरा में उच्च-प्राथमिकता वाले कार्यों हेतु श्रेष्ठ एकाग्रता।",
                    "मध्याह्न: टीम समन्वय, विश्लेषण और आवश्यक दस्तावेजी समीक्षा के लिए अनुकूल वातावरण।",
                    "सायंकाल: चंद्र प्रभाव के कारण मानसिक शांति, अध्ययन और परिवार के साथ चिंतन हेतु शुभ समय।"
                ]
                challenges = [
                    "दैनिक राहुकाल के दौरान जोखिम भरे या सट्टेबाजी वाले समझौतों पर हस्ताक्षर करने से बचें।",
                    "दोपहर के समय जल का पर्याप्त सेवन करें और शारीरिक ऊर्जा को संतुलित रखें।",
                    "महत्वपूर्ण समझौतों और शर्तों को लिखित रूप में स्पष्ट रखें।"
                ]
                windows = [
                    "शुभ कार्य खिड़की: प्रातःकालीन शुभ होरा काल (बृहस्पति/शुक्र/बुध शासित)",
                    "मध्याह्न श्रेष्ठ मुहूर्त: अभिजित मुहूर्त (~11:45 AM - 12:35 PM)",
                    "सावधानी काल: दैनिक स्थानीय राहुकाल अवधि"
                ]
                why = "यह स्विस एफिमेरिस द्वारा परिकलित सार्वभौमिक गोचर पर आधारित है। अपनी लग्न कुंडली अनुसार प्रभाव जानने हेतु टैब 1 में कुंडली देखें।"
                reflection = "आज के अपने तीन सबसे महत्वपूर्ण लक्ष्यों का चयन करें और मध्याह्न से पूर्व मुख्य कार्य संपन्न करें।"
                limitations = "दैनिक गोचर सामान्य वातावरणीय ऊर्जा का वर्णन करता है। व्यक्तिगत परिणाम जन्मकालीन ग्रहों पर निर्भर करते हैं।"
            else:
                report_title = f"Daily Universal Transit Forecast: {target_date_str}"
                summary = (
                    f"Universal daily transit progression for {target_date_str} computed via Swiss Ephemeris maps solar prana, lunar position, and planetary hora currents across the 24-hour cycle. "
                    f"Atmospheric geometry emphasizes morning strategic inception, midday collaborative momentum during Abhijit Muhurta (~11:45 AM – 12:35 PM), and restorative evening reflection. "
                    f"Heightened awareness is advised during the localized daily Rahu Kaal window to guard against unhedged speculation. "
                    f"Calculate your birth chart in Tab 1 to ground this celestial weather in your natal houses."
                )
                overall = (
                    f"Today's planetary transit geometry highlights disciplined focus, practical communication, and measured execution "
                    f"under sidereal astronomical currents. Classical Jyotish encourages aligning major activities with favorable daily planetary hours."
                )
                supportive = [
                    "Morning: Heightened clarity for high-leverage responsibilities during benefic solar intervals.",
                    "Mid-Day: Productive atmospheric momentum for team coordination and analytical reviews.",
                    "Evening: Grounding planetary alignment encourages domestic calm, study, and restorative rest."
                ]
                challenges = [
                    "Avoid signing high-stakes speculative agreements during the localized daily Rahu Kaal window.",
                    "Maintain hydration and mindful pacing to preserve physical vitality throughout the afternoon.",
                    "Keep key expectations and agreements clearly documented in writing."
                ]
                windows = [
                    "Auspicious Action Window: Morning benefic Hora intervals (governed by Jupiter/Venus/Mercury)",
                    "Mid-Day Peak Focus: Abhijit Muhurta (~11:45 AM - 12:35 PM local solar window)",
                    "Cautionary Period: Daily localized Rahu Kaal interval"
                ]
                why = "Derived from universal Gochara planetary transits computed via Swiss Ephemeris. Calculate your Janam Kundli in Tab 1 to see how these transits specifically aspect your natal houses."
                reflection = "Focus on your three core responsibilities for today. Finish the most demanding task during peak morning hours."
                limitations = "General transit overviews describe ambient celestial conditions. Exact personal impacts depend on your unique birth chart."

        elif horizon_lower == "weekly":
            if is_hi:
                report_title = f"साप्ताहिक सार्वभौमिक गोचर चक्र: 7 दिवसीय विश्लेषण ({target_date_str})"
                summary = (
                    f"यह ७-दिवसीय सार्वभौमिक गोचर चक्र राशिचक्र में चंद्रमा के विभिन्न नक्षत्रों और राशियों में भ्रमण को दर्शाता है। "
                    f"सप्ताह का पूर्वार्ध व्यावहारिक नियोजन व आधिकारिक संचार, मध्य भाग वित्तीय सुदृढ़ीकरण और सप्ताहांत पारिवारिक सौहार्द व आत्म-मंथन की प्रेरणा देता है। "
                    f"मंगलवार व गुरुवार प्रातःकालीन होराएं महत्वपूर्ण कार्यों हेतु शुभ अवसर प्रस्तुत करती हैं, जबकि बुधवार अपराह्न में संवाद में धैर्य अपेक्षित है। "
                    f"अपनी जन्म कुंडली के विशिष्ट भाव प्रभावों को जानने हेतु जन्म विवरण दर्ज करें।"
                )
                overall = "यह सात दिवसीय चक्र राशिचक्र में चंद्र संचरण को दर्शाता है, जिसमें सप्ताह के आरंभ में व्यावसायिक सुदृढ़ता और सप्ताहांत में पारिवारिक शांति प्रमुख रहेगी।"
                supportive = [
                    "दिन 1–3: आधिकारिक संचार, परियोजना योजना और अनुशासित कार्य के लिए श्रेष्ठ गति।",
                    "दिन 4–5: वित्तीय बजट समीक्षा, संसाधन आवंटन और व्यवस्थित प्राथमिकताओं के लिए उत्तम।",
                    "दिन 6–7: घरेलू सौहार्द, विश्राम और दार्शनिक अध्ययन के लिए अनुकूल आकाशीय योग।"
                ]
                challenges = [
                    "सप्ताह के मध्य में चंद्र परिवर्तन से अस्पष्ट संचार के कारण भ्रम हो सकता है; स्पष्टता बनाए रखें।",
                    "नींद और स्वास्थ्य की रक्षा के लिए देर रात तक स्क्रीन देखने से बचें।",
                    "प्रशासनिक या संस्थागत प्रक्रियाओं में धैर्य का अभ्यास करें।"
                ]
                windows = [
                    "रणनीतिक सफलता खिड़की: मंगलवार और गुरुवार प्रातःकालीन सूर्य व गुरु होरा",
                    "सावधानी खिड़की: बुधवार दोपहर स्थानीय राहुकाल के दौरान",
                    "पारिवारिक सौहार्द खिड़की: शुक्रवार सायं शुक्र होरा काल"
                ]
                why = "स्विस एफिमेरिस द्वारा परिकलित 7 दिवसीय गोचर चक्र पर आधारित। जन्म कुंडली लोड कर व्यक्तिगत भाव प्रभाव देखें।"
                reflection = "सप्ताह की शुरुआत में तीन स्पष्ट प्राथमिकताएं निर्धारित करें और प्रतिदिन उनकी समीक्षा करें।"
                limitations = "साप्ताहिक गोचर सामान्य दिशा प्रदान करता है। व्यक्तिगत घटनाएं आपकी महादशा चक्र पर निर्भर करती हैं।"
            else:
                report_title = f"Weekly Universal Transit Progression: 7-Day Cycle ({target_date_str})"
                summary = (
                    f"Seven-day universal lunar transit cycle traces the collective progression of the Moon across sidereal constellations via Swiss Ephemeris. "
                    f"The overarching weekly geometry guides early-week structured planning, mid-week operational consolidation, and weekend domestic harmony and philosophical reflection. "
                    f"Peak breakthrough windows occur during Tuesday and Thursday morning benefic Horas, while transient mid-week lunar shifts call for clear, documented communication. "
                    f"Ground these daily lunar transits in your natal Lagna by generating your Janam Kundli."
                )
                overall = "This seven-day transit cycle traces lunar movements across the zodiac, emphasizing professional consolidation early in the week and personal harmony toward the weekend."
                supportive = [
                    "Days 1–3: Strong momentum for executive communications, project scheduling, and structured work.",
                    "Days 4–5: Clarification of financial budgets, resource planning, and methodical audits.",
                    "Days 6–7: Favorable planetary aspects for domestic stability, relaxation, and philosophical reflection."
                ]
                challenges = [
                    "Mid-week lunar transit shifts may bring temporary communication misunderstandings if requirements are vague.",
                    "Avoid unnecessary late-night screen fatigue to protect sleep quality.",
                    "Practice patience when interacting with institutional or bureaucratic procedures."
                ]
                windows = [
                    "Strategic Breakthrough Window: Tuesday and Thursday mornings during Sun and Jupiter Horas",
                    "Cautionary Window: Wednesday afternoon during localized Rahu Kaal",
                    "Social Harmony Window: Friday evening during Venus Hora"
                ]
                why = "Grounded in universal 7-day Gochara transit cycles computed via Swiss Ephemeris. Generate your Janam Kundli to ground this in your natal houses."
                reflection = "Set three clear priorities for the week. Review them daily to ensure sustained focus."
                limitations = "Weekly transit progressions provide a general compass. Personal manifestation depends on natal planetary dignity and dasha cycles."

        elif horizon_lower == "monthly":
            if is_hi:
                report_title = f"मासिक सार्वभौमिक गोचर समीक्षा: {target_date_str}"
                summary = (
                    f"स्विस एफिमेरिस द्वारा संगणित ४-सप्ताह का मासिक गोचर चक्र शुक्ल पक्ष एवं कृष्ण पक्ष की चंद्र कलाओं और ग्रहीय राशि प्रवेश का विश्लेषण करता है। "
                    f"प्रथम दो सप्ताह नए उपक्रमों, व्यावसायिक दृश्यता और रणनीतिक गठबंधनों के लिए अनुकूल हैं, जबकि अंतिम दो सप्ताह वित्तीय ऑडिट, पूंजी संचय और आंतरिक संतुलन का समर्थन करते हैं। "
                    f"पूर्णिमा काल मानसिक स्पष्टता लाता है, जबकि अमावस्या के निकट जोखिम भरे सट्टेबाजी से बचना चाहिए। "
                    f"व्यक्तिगत भाव फल जानने हेतु जन्म कुंडली बनाएं।"
                )
                overall = "यह मासिक चक्र व्यवस्थित प्रगति, संस्थागत स्थिरता और दीर्घकालिक पूंजी संचय पर बल देता है।"
                supportive = [
                    "सप्ताह 1 व 2: शुक्ल पक्ष नए उद्यमों, व्यावसायिक दृश्यता और रणनीतिक गठबंधनों के लिए अनुकूल है।",
                    "सप्ताह 3: वित्तीय सुदृढ़ता, बजट अनुकूलन और लंबित दायित्वों के निपटान के लिए श्रेष्ठ।",
                    "सप्ताह 4: आत्मनिरीक्षण, पुरानी योजनाओं के समापन और घरेलू शांति का समय।"
                ]
                challenges = [
                    "ग्रह परिवर्तन के दौरान अत्यधिक वादों या सट्टा जोखिमों से बचें।",
                    "संतुलित खान-पान और विश्राम से शारीरिक ऊर्जा बनाए रखें।",
                    "महत्वपूर्ण समझौतों के दस्तावेजीकरण में सतर्क रहें।"
                ]
                windows = [
                    "शुक्ल पक्ष: नए कार्यों के शुभारंभ हेतु शुभ",
                    "पूर्णिमा काल: भावनात्मक स्पष्टता और सामाजिक मेलजोल",
                    "कृष्ण पक्ष: समीक्षा, आंतरिक चिंतन और कार्यों को पूर्ण करने हेतु उपयुक्त"
                ]
                why = "स्विस एफिमेरिस द्वारा परिकलित मासिक ग्रहीय राशि प्रवेश और चंद्र चक्र पर आधारित। जन्म कुंडली बनाकर सटीक विश्लेषण प्राप्त करें।"
                reflection = "माह के आरंभ में अपने वित्तीय और व्यक्तिगत लक्ष्यों का पुनर्मूल्यांकन करें।"
                limitations = "मासिक गोचर व्यापक ऋतुवत वातावरण बताते हैं; व्यक्तिगत घटनाएं जन्म कुंडली से निर्धारित होती हैं।"
            else:
                report_title = f"Monthly Universal Transit Overview: {target_date_str}"
                summary = (
                    f"Four-week universal transit progression synthesizes the 28-day solar-lunar cycle across waxing Shukla Paksha and waning Krishna Paksha via Swiss Ephemeris. "
                    f"Cosmic alignments support foundational launches and stakeholder visibility in Weeks 1–2, followed by capital consolidation, budget audits, and reflective restructuring in Weeks 3–4. "
                    f"Optimal momentum aligns with the waxing Moon toward Purnima, while speculative overextension should be avoided during the dark-moon phase. "
                    f"Enter birth details to map these monthly transit movements to your natal chart houses."
                )
                overall = "This monthly lunar cycle brings focus to methodical progress, institutional stability, and capital preservation across sidereal transits."
                supportive = [
                    "Weeks 1 & 2: Waxing Moon supports initiating new ventures, professional visibility, and strategic alliances.",
                    "Week 3: Consolidation of assets, budget review, and settlement of obligations.",
                    "Week 4: Reflective introspection, conclusion of legacy tasks, and domestic rejuvenation."
                ]
                challenges = [
                    "Avoid overextending commitments or taking speculative financial risks during planetary transitions.",
                    "Maintain healthy dietary and rest habits to sustain stamina across the 4-week cycle.",
                    "Ensure critical agreements are documented clearly in writing."
                ]
                windows = [
                    "Shukla Paksha (Waxing Moon): Auspicious for launching new initiatives",
                    "Purnima (Full Moon): Peak emotional clarity and social engagement",
                    "Krishna Paksha (Waning Moon): Optimal for audit, review, and completion"
                ]
                why = "Derived from monthly planetary ingress and solar-lunar cycles via Swiss Ephemeris. Enter birth details to unlock your natal house analysis."
                reflection = "Conduct a monthly audit of your key goals and financial plans. Cultivate quiet morning contemplation."
                limitations = "Monthly planetary transits indicate broad environmental seasons. Personal life events depend upon natal chart placements."

        elif horizon_lower in ["mahadasha", "5year", "five_year"]:
            if is_hi:
                report_title = "विंशोत्तरी महादशा अवलोकन (जन्म कुंडली आवश्यक)"
                summary = (
                    f"विंशोत्तरी १२०-वर्षीय शास्त्रीय दशा प्रणाली जातक के जन्म कालीन चंद्र नक्षत्र और देशांतर अंशों पर आधारित एक सूक्ष्म कालचक्र है। "
                    f"यह पद्धति जीवन के प्रमुख अध्यायों, महादशा स्वामियों और कर्मिक संक्रमण कालखंडों का सटीक मानचित्र प्रस्तुत करती है। "
                    f"चूँकि विंशोत्तरी गणना पूर्णतः जन्म समय की सटीकता पर निर्भर करती है, अतः सार्वभौमिक रूप से इसका व्यक्तिगत अनुमान संभव नहीं है। "
                    f"अपनी सक्रिय महादशा और ५-वर्षीय उप-अवधि समयरेखा देखने के लिए टैब १ में जन्म कुंडली बनाएं।"
                )
                overall = "विंशोत्तरी महादशा जन्म के समय चंद्र के सूक्ष्म नक्षत्र अंशों से निर्धारित 120 वर्षीय व्यक्तिगत कालचक्र है। बिना जन्म कुंडली के सटीक महादशा फलादेश संभव नहीं है।"
                supportive = [
                    "टैब 1 में अपनी जन्म तिथि, समय और स्थान दर्ज कर सक्रिय महादशा जानें।",
                    "जानें कि वर्तमान में कौन सा ग्रह आपके करियर, धन और संबंधों का स्वामी है।",
                    "जीवन के महत्वपूर्ण मोड़ों को समझने के लिए अंतर्दशा चक्र अनलॉक करें।"
                ]
                challenges = [
                    "सामान्य राशियों के भ्रामक दशा फलादेश पर निर्भर न रहें।",
                    "सटीक दशा गणना के लिए जन्म समय की सूक्ष्म शुद्धता अनिवार्य है।"
                ]
                windows = [
                    "चरण 1: टैब 1 (जन्म कुंडली) खोलें",
                    "चरण 2: सही जन्म समय और नगर दर्ज करें",
                    "चरण 3: संपूर्ण 120 वर्षीय विंशोत्तरी समयरेखा देखें"
                ]
                why = "विंशोत्तरी दशा के लिए चंद्र के देशांतर और नक्षत्र चरण की सटीक गणना आवश्यक होती है।"
                reflection = "सटीक आत्मज्ञान प्रामाणिक खगोलीय गणनाओं से प्रारंभ होता है। अपनी कुंडली बनाकर व्यक्तिगत चक्र देखें।"
                limitations = "सत्यापित जन्म विवरण के बिना दशा समयरेखा की गणना नहीं की जा सकती।"
            else:
                report_title = "Vimshottari Mahadasha Overview (Requires Birth Chart)"
                summary = (
                    f"Vimshottari 120-year canonical timeline framework maps overarching karmic epochs derived from the exact sidereal longitude of the natal Moon at birth. "
                    f"Under classical Parashari Jyotish, this system delineates the primary planetary rulers governing personal career, vitality, wealth, and relationship progression. "
                    f"Because Vimshottari calculations require high-precision natal Moon coordinates, personal dasha timelines cannot be inferred without an authenticated birth chart. "
                    f"Calculate your Janam Kundli in Tab 1 to unlock your active Mahadasha, Antardasha, and 5-year chronological progression."
                )
                overall = "Vimshottari Dasha is an intensely personalized 120-year karmic timeline derived from the exact degree of your natal Moon at the moment of birth. Without a calculated birth chart, personal Dasha periods cannot be inferred."
                supportive = [
                    "Enter your date, time, and city of birth in Tab 1 to calculate your active Mahadasha.",
                    "Discover which planetary ruler currently governs your career, relationships, and life progression.",
                    "Unlock sub-period (Antardasha) timings to understand current life seasons."
                ]
                challenges = [
                    "Do not rely on generic horoscope Dasha predictions that ignore your actual birth degrees.",
                    "Birth time accuracy is vital for precise Dasha start and end dates."
                ]
                windows = [
                    "Step 1: Open Tab 1 (Birth Chart)",
                    "Step 2: Enter exact birth time and location",
                    "Step 3: View full 120-year Vimshottari timeline"
                ]
                why = "Vimshottari Dasha calculations require exact natal Moon longitude down to minutes of arc."
                reflection = "Accurate self-knowledge begins with authentic astronomical coordinates. Calculate your chart to discover your personal timeline."
                limitations = "Dasha timelines cannot be computed without verified birth details."

        else:
            if is_hi:
                report_title = "वार्षिक सार्वभौमिक गोचर परिदृश्य: 12-माह खगोलीय चक्र"
                summary = (
                    f"१२-माह का वार्षिक सार्वभौमिक गोचर मानचित्र देवगुरु बृहस्पति, कर्मफलदाता शनि और सूर्य संक्रांति के वृहद खगोलीय चक्रों को प्रदर्शित करता है। "
                    f"यह वार्षिक समयरेखा करियर में अनुशासन, वित्तीय स्वावलंबन और दीर्घकालिक प्रतिष्ठा के नए आयाम स्थापित करती है। "
                    f"चारों त्रैमासों में सौर व ग्रहीय परिवर्तन योजनाबद्ध कर्म और नैतिक आचरण का फल प्रदान करते हैं। "
                    f"अपनी जन्म कुंडली के सापेक्ष इन वार्षिक संक्रांतियों का सटीक फल जानने हेतु कुंडली बनाएं।"
                )
                overall = (
                    "आगामी 12-माह का चक्र देवगुरु बृहस्पति और कर्मफलदाता शनि के प्रमुख गोचर से संचालित रहेगा। "
                    "गुरु का प्रभाव ज्ञान, विवेक और विस्तार लाएगा, जबकि शनि का गोचर अनुशासन, नैतिक दायित्व और स्थिरता की मांग करेगा।"
                )
                supportive = [
                    "प्रथम तिमाही: दीर्घकालिक योजनाओं का पुनर्गठन, व्यावसायिक निरंतरता और साख निर्माण।",
                    "द्वितीय तिमाही: वित्तीय अनुशासन, पूंजी संचय और विवेकपूर्ण निवेश।",
                    "तृतीय तिमाही: बौद्धिक विकास, दार्शनिक अध्ययन और गुरुजनों का मार्गदर्शन।",
                    "चतुर्थ तिमाही: पारिवारिक स्थिरता, उत्सव और वार्षिक उपलब्धियों का चिंतन।"
                ]
                challenges = [
                    "शनि के मंद गति गोचर में धैर्य रखें, जल्दबाजी या अनुचित शॉर्टकट से बचें।",
                    "थकान से बचने के लिए कार्य और निजी जीवन में संतुलन बनाए रखें।",
                    "अस्थिर ग्रहीय युतियों के दौरान सट्टेबाजी के आकर्षण से सावधान रहें।"
                ]
                windows = [
                    "विषुव उपरांत काल: रणनीतिक करियर योजना और दीर्घकालिक परियोजनाओं हेतु शुभ",
                    "मध्य-वर्षीय शुभ चरण: वित्तीय समीक्षा और ठोस समझौतों के लिए अनुकूल",
                    "वर्ष-अंत चिंतन: वार्षिक समीक्षा, दान-पुण्य और आध्यात्मिक शांति हेतु उत्तम"
                ]
                why = "स्विस एफिमेरिस द्वारा परिकलित प्रमुख बाहरी ग्रहों (गुरु, शनि, राहु-केतु) के गोचर पर आधारित।"
                reflection = "वर्ष भर निरंतरता, धर्म और अपने समय व संसाधनों के सजग प्रबंधन पर केंद्रित रहें।"
                limitations = "वार्षिक गोचर व्यापक सामाजिक ऋतुएं दर्शाता है; निजी जीवन हेतु व्यक्तिगत कुंडली अनिवार्य है।"
            else:
                report_title = "Yearly Universal Transit Outlook: 12-Month Astronomical Cycle"
                summary = (
                    f"Twelve-month planetary transit stations and solar ingress cycles define major thematic seasons for career discipline, structural governance, and long-term stability via Swiss Ephemeris. "
                    f"Major transits of Jupiter, Saturn, and the solar cardinal ingress across all four quarters establish opportune phases for compounding professional and financial initiatives. "
                    f"Spring equinox transitions favor strategic expansion, while eclipse portals demand emotional grounding and prudent risk management. "
                    f"Calculate your Janam Kundli to map these 12-month solar and planetary transits against your natal Lagna."
                )
                overall = (
                    "The upcoming twelve-month cycle is governed by the major sidereal transits of Jupiter and Saturn. "
                    "Jupiter's movements bring themes of wisdom, mentorship, and structural expansion, while Saturn's transit "
                    "through sidereal Pisces demands steady discipline, ethical responsibility, and long-term consolidation."
                )
                supportive = [
                    "Quarter 1: Restructuring long-term plans, establishing professional consistency, and building reputation.",
                    "Quarter 2: Financial prudence, capital compounding, and prudent investments.",
                    "Quarter 3: Intellectual growth, philosophical studies, and constructive mentorship.",
                    "Quarter 4: Domestic stability, familial celebration, and annual reflection."
                ]
                challenges = [
                    "Avoid impatient shortcuts when navigating slow-moving Saturnian transit lessons.",
                    "Maintain healthy work-life balance to avoid cumulative fatigue.",
                    "Guard against speculative euphoria during volatile planetary alignments."
                ]
                windows = [
                    "Post-Equinox Window: Favorable for strategic career planning and long-term projects",
                    "Mid-Year Auspicious Phase: Favorable for financial audits and foundational agreements",
                    "Year-End Reflection: Ideal for annual review, charitable deeds (Daan), and spiritual grounding"
                ]
                why = "Calculated from authoritative Swiss Ephemeris planetary ephemerides for major outer planet transits (Jupiter, Saturn, Rahu-Ketu). Calculate your Janam Kundli in Tab 1 to see exact natal house activations."
                reflection = "Adopt an annual theme centered on consistency, ethical duty (Dharma), and mindful stewardship of your time and resources."
                limitations = "Yearly transit outlooks outline broad collective astrological seasons. Personal life trajectory requires a personalized Janam Kundli with exact birth coordinates."

        return {
            "report_title": report_title,
            "time_horizon": horizon_lower,
            "target_date": target_date_str,
            "period": period_info,
            "calculation_context": {
                "lagna_sign": None,
                "lagna_degree": None,
                "moon_sign": None,
                "moon_nakshatra": None,
                "active_mahadasha": None,
                "active_antardasha": None,
                "saturn_classification": "Universal Sidereal Pisces Transit",
                "sade_sati_phase": "सार्वभौमिक गोचर" if is_hi else "General Transit",
                "active_hora_planet": hora_planet,
                "active_hora_window": time_window_str
            },
            "preview": preview_info,
            "profile": {
                "name": "प्रिय साधक" if is_hi else "Guest Seeker",
                "is_guest": True,
                "lagna": None,
                "lagna_degree": None,
                "moon_sign": None,
                "moon_nakshatra": None,
                "sun_sign": None,
                "active_mahadasha": None,
                "active_antardasha": None,
                "sade_sati_phase": "सार्वभौमिक गोचर" if is_hi else "General Transit",
                "is_manglik": False
            },
            "sections": {
                "executive_summary": summary,
                "overall_outlook": overall,
                "supportive_themes": supportive,
                "supportive_developments": supportive,
                "challenges_and_cautions": challenges,
                "key_time_windows": windows,
                "relevant_time_windows": windows,
                "relevant_chart_facts": {
                    "lagna": "जन्म कुंडली लोड नहीं है" if is_hi else "No Birth Chart Loaded",
                    "moon": "जन्म कुंडली लोड नहीं है" if is_hi else "No Birth Chart Loaded",
                    "active_dasha": "दशा देखने हेतु जन्म कुंडली बनाएं" if is_hi else "Calculate Janam Kundli to unlock Dasha",
                    "saturn_transit": "मीन राशि (सार्वभौमिक गोचर)" if is_hi else "Sidereal Pisces (Universal Transit)",
                    "current_interval_lord": hora_hi if is_hi else hora_planet
                },
                "applicable_traditional_rules": why,
                "why_this_applies": why,
                "practical_reflection": reflection,
                "limitations": limitations
            },
            "period_items": period_items,
            "remedies": _build_remedies_and_precautions(
                horizon_lower, is_hi, hora_planet, None, challenges, reflection, has_chart=False
            )[0],
            "precautions": _build_remedies_and_precautions(
                horizon_lower, is_hi, hora_planet, None, challenges, reflection, has_chart=False
            )[1],
            "timing_metadata": {
                "active_hora_planet": hora_planet,
                "hora_window": time_window_str,
                "calculation_engine": "SwissEphemeris_v2.10_Lahiri",
                "interpretation_standard": "Parashari_Jyotish_Canonical_v2"
            },
            "provenance": {
                "calculation_engine": "SwissEphemeris_v2.10_Lahiri",
                "ephemeris_mode": "Sidereal_Lahiri_Ayanamsha",
                "dasha_system": "Vimshottari_120_Year",
                "saturn_classification": "Universal Sidereal Pisces Transit",
                "time_horizon": horizon_lower
            }
        }

    # Natal chart is provided: extract authoritative positions
    dasha = dasha or {}
    doshas = doshas or {}
    lagna = kundli["lagna"]["sign"]
    lagna_deg = kundli["lagna"]["degree"]
    moon_sign = kundli["planets"]["Moon"]["sign"]
    moon_nak = kundli["planets"]["Moon"]["nakshatra"]
    sun_sign = kundli["planets"]["Sun"]["sign"]
    
    active_maha = dasha.get("active_now", {}).get("maha_dasha", "Jupiter")
    active_antar = dasha.get("active_now", {}).get("antar_dasha", active_maha)

    planets = kundli["planets"]
    sadesati = doshas.get("sade_sati", {}).get("phase", "Free")
    saturn_classification = doshas.get("sade_sati", {}).get("classification") or sadesati
    is_manglik = doshas.get("manglik", {}).get("is_manglik", False)

    lagna_hi = HINDI_SIGNS.get(lagna, lagna)
    moon_hi = HINDI_SIGNS.get(moon_sign, moon_sign)
    sun_hi = HINDI_SIGNS.get(sun_sign, sun_sign)
    maha_hi = HINDI_PLANETS.get(active_maha, active_maha)
    antar_hi = HINDI_PLANETS.get(active_antar, active_antar)

    h10_planets = [p for p, d in planets.items() if d.get("house") == 10]
    h10_occ = f"occupied by {', '.join(h10_planets)}" if h10_planets else "aspected by your Lagna lord"

    if horizon_lower == "hourly":
        if is_hi:
            report_title = f"प्रति घंटा व्यक्तिगत मार्गदर्शन: {hora_hi} होरा ({time_window_str})"
            summary = (
            f"आपकी {lagna_hi} लग्न कुंडली में, जहाँ चंद्र {moon_hi} राशि ({moon_nak} नक्षत्र) में स्थित हैं और सक्रिय {maha_hi} महादशा ({antar_hi} अंतर्दशा) चल रही है, "
            f"यह {hora_hi} होरा आपके प्रमुख कर्म भावों को सक्रिय करती है। आकाशीय ऊर्जाएं बौद्धिक निर्णय और रणनीतिक नियोजन को सशक्त बनाती हैं, "
            f"जिससे कार्यों की समयबद्ध पूर्णता में सहायता मिलती है। इस होरा का मध्यवर्ती ३० मिनट का समय महत्वपूर्ण वार्ताओं और योजनाबद्ध निर्णयों हेतु सर्वोत्तम अवसर प्रदान करता है, "
            f"जबकि होरा संधिकाल में जल्दबाजी से बचना चाहिए। एकाग्रता संवर्धन हेतु {hora_hi} के बीज मंत्र का शांत भाव से स्मरण करें।"
        )
            overall = (
                f"इस सक्रिय {hora_hi} होरा के दौरान, आकाशीय प्रभाव आपके जन्म {lagna_hi} लग्न "
                f"और वर्तमान {maha_hi}-{antar_hi} दशा चक्र से जुड़ते हैं। "
                f"शास्त्रीय मान्यता अनुसार {hora_hi} होरा विचारशील निर्णय, कर्म दक्षता "
                f"और प्राथमिकताओं के सटीक संपादन के लिए उपयुक्त है।"
            )
            supportive = [
                f"{hora_hi} के प्रभाव वाले कार्यों (योजना, वार्तालाप और संगठित दायित्वों) में उच्च मानसिक एकाग्रता।",
                f"आपकी {moon_hi} चंद्र राशि पर शुभ ग्रहों का गोचरीय सामंजस्य संतुलित निर्णय लेने में सहायक है।",
                "वरिष्ठों से परामर्श, महत्वपूर्ण प्रपत्रों की समीक्षा और वित्तीय योजना के लिए शुभ समय।"
            ]
            challenges = [
                "होरा परिवर्तन के समय उतावलेपन या प्रतिक्रियात्मक संवाद से बचें।",
                "तकनीकी मतभेदों में शांति बनाए रखें ताकि अनावश्यक मानसिक अशांति न हो।",
                "होरा के अंतिम भाग में थकान से बचने हेतु संक्षिप्त विश्राम लें।"
            ]
            windows = [
                f"सक्रिय होरा काल: {time_window_str} ({hora_hi} द्वारा शासित)",
                "श्रेष्ठ एकाग्रता खिड़की: महत्वपूर्ण वार्ता हेतु होरा के मध्य 30 मिनट",
                "सावधानी काल: स्थानीय राहुकाल के दौरान अतिरिक्त सतर्कता रखें"
            ]
            why = (
                f"यह फलादेश आपके जन्म लग्न {lagna_hi} ({lagna_deg:.2f}°), "
                f"चंद्र राशि {moon_hi} ({moon_nak} नक्षत्र), और सक्रिय विंशोत्तरी महादशा {maha_hi} के अनुसार परिकलित है। "
                f"इस समयावधि का स्वामी ग्रह ({hora_hi}) आपके लग्नेश और चंद्रेश के साथ शास्त्रीय संबंध बनाए हुए है।"
            )
            reflection = (
                f"इस {hora_hi} होरा में अपने सबसे महत्वपूर्ण दायित्व पर ध्यान केंद्रित करें। "
                f"महत्वपूर्ण संदेश भेजने से पूर्व शांत होकर तीन गहरी सांसें लें।"
            )
            limitations = (
                "ज्योतिषीय होरा प्रवृत्तियों और शुभ समय का संकेतक है; स्वतंत्र इच्छा, विवेक और पुरुषार्थ ही निर्णायक हैं।"
            )
        else:
            report_title = f"Hourly Personal Guidance: {hora_planet} Hora ({time_window_str})"
            summary = (
            f"In your natal {lagna} Lagna nativity with Moon stationed in {moon_sign} ({moon_nak} Nakshatra), this {hora_planet} Hora activates your "
            f"functional houses under the prevailing governance of {active_maha} Mahadasha ({active_antar} Antardasha). "
            f"The prevailing planetary resonance sharpens strategic discernment and purposeful task completion across key vocational sectors. "
            f"Your highest-leverage opportunity falls within the central 30 minutes of this Hora for vital communications and deal deliberations, while impulsive commitments during transitional sandhi should be strictly avoided. "
            f"Attune your focus by reciting the {hora_planet} Beej Mantra."
        )
            overall = (
                f"During this active {hora_planet} Hora, celestial influences interact with your natal {lagna} Lagna "
                f"and current {active_maha}-{active_antar} Dasha cycle. "
                f"Traditionally, the {hora_planet} Hora emphasizes focused strategic execution, analytical discernment, "
                f"and aligning mental priorities with your core life responsibilities."
            )
            supportive = [
                f"High mental focus for tasks aligned with {hora_planet} significations (planning, negotiation, and structured dialogue).",
                f"Supportive synergy between your {moon_sign} Moon and transiting benefics, aiding composed decision-making.",
                f"Auspicious window for consulting seniors, signing documentation, or reviewing long-term financial plans."
            ]
            challenges = [
                f"Avoid rash, reactive speech or hasty commitments during transitions between diurnal Hora intervals.",
                f"If handling technical disputes or litigation, maintain emotional neutrality to mitigate temporary Mars-Rahu transit tension.",
                f"Be mindful of fatigue during the final quarter of the Hora window; schedule brief reflective breaks."
            ]
            windows = [
                f"Active Hora Interval: {time_window_str} (Governed by {hora_planet})",
                f"Recommended Focus Peak: Middle 30 minutes of the active Hora for vital communications",
                f"Cautionary Period: Maintain heightened care during localized Rahu Kaal intervals"
            ]
            why = (
                f"This interpretation applies because your natal Ascendant is {lagna} ({lagna_deg:.2f}°), "
                f"your Moon resides in {moon_sign} ({moon_nak} Nakshatra), and your active Vimshottari Mahadasha is {active_maha}. "
                f"The planetary ruler of this interval ({hora_planet}) maintains a classical relationship with your Lagna/Moon lords, "
                f"amplifying clarity while Saturn transits {sadesati} in sidereal Pisces."
            )
            reflection = (
                f"Direct your conscious effort toward one high-priority responsibility during this {hora_planet} window. "
                f"Take three mindful breaths before sending critical messages, and verify all numerical details."
            )
            limitations = (
                "Astrological Horas represent traditional qualitative tendencies and auspicious time windows rather than deterministic fatalism. "
                "Free will, situational ethics, and practical diligence remain the decisive drivers of all outcomes."
            )

    elif horizon_lower == "daily":
        if is_hi:
            report_title = f"दैनिक व्यक्तिगत फलादेश: {target_date_str} (सौर व चंद्र गोचर विश्लेषण)"
            summary = (
            f"आपके {lagna_hi} लग्न और {moon_hi} चंद्र ({moon_nak} नक्षत्र) हेतु, आज का खगोलीय गोचर {maha_hi} महादशा ({antar_hi} अंतर्दशा) के अंतर्गत आपके प्रमुख भावों को ऊर्जावान बना रहा है। "
            f"सौर व चंद्र गोचर का सामंजस्य कार्यक्षेत्र में अनुशासित कर्म, स्पष्ट संवाद और स्थिर प्रगति का मार्ग प्रशस्त करता है। "
            f"प्रातःकालीन शुभ होरा एवं अभिजित मुहूर्त (~11:45 AM – 12:35 PM) दिन की सबसे महत्वपूर्ण पहलों के क्रियान्वयन हेतु सर्वोच्च खिड़की प्रदान करते हैं, "
            f"जबकि स्थानीय राहुकाल में सट्टेबाजी या जल्दबाजी के समझौतों से बचना अनिवार्य है। दिन-स्वामी ग्रह के बीज मंत्र का जप और सात्विक दिनचर्या का पालन करें।"
        )
            overall = (
                f"आपके {lagna_hi} लग्न और {moon_hi} चंद्र राशि के लिए, आज का ग्रहीय गोचर "
                f"{maha_hi}-{antar_hi} दशा के अंतर्गत आपके प्रमुख भावों को ऊर्जावान बना रहा है। "
                f"आज का दिन अनुशासित कर्म, स्पष्ट संवाद और स्थिर प्रगति के लिए अनुकूल है।"
            )
            supportive = [
                "प्रातःकाल (सूर्योदय से मध्याह्न): शुभ होरा में उच्च-महत्व वाले कार्यों के लिए उत्कृष्ट एकाग्रता।",
                "मध्याह्न: सहयोगी समझौतों, समीक्षा और तकनीकी कार्यों के लिए उत्तम ग्रह स्थिति।",
                "सायंकाल (सूर्यास्त उपरांत): चंद्र अनुकूलता से पारिवारिक सौहार्द, ज्ञानार्जन और मानसिक शांति।"
            ]
            challenges = [
                "दैनिक राहुकाल के दौरान जोखिम भरे या अपरीक्षित अनुबंधों पर हस्ताक्षर करने से बचें।",
                "शारीरिक ऊर्जा और स्वास्थ्य संतुलन के लिए खान-पान व जल का ध्यान रखें।",
                "संवाद में पारदर्शिता रखें ताकि किसी प्रकार की गलतफहमी उत्पन्न न हो।"
            ]
            windows = [
                "शुभ कार्य खिड़की: प्रातःकालीन शुभ होरा काल (बृहस्पति/शुक्र/बुध शासित)",
                "मध्याह्न मुख्य एकाग्रता: अभिजित मुहूर्त (~11:45 AM - 12:35 PM)",
                "सावधानी काल: दैनिक राहुकाल अवधि"
            ]
            why = (
                f"आज का गोचर आपके {lagna_hi} लग्न ({lagna_deg:.2f}°), "
                f"{moon_hi} चंद्र राशि ({moon_nak}), और सक्रिय {maha_hi}-{antar_hi} विंशोत्तरी दशा से सामंजस्य रखता है।"
            )
            reflection = (
                "आज के अपने तीन सबसे महत्वपूर्ण कार्यों को चुनें और मध्याह्न से पूर्व मुख्य लक्ष्य प्राप्त करें।"
            )
            limitations = (
                "दैनिक फलादेश वातावरणीय प्रवृत्तियां प्रस्तुत करता है। सचेत नैतिक संकल्प और सक्रिय प्रयास परिणामों को दिशा देते हैं।"
            )
        else:
            report_title = f"Daily Personal Forecast: {target_date_str} (Solar & Lunar Transit Synthesis)"
            summary = (
            f"For your natal {lagna} Lagna and {moon_sign} Moon ({moon_nak} Nakshatra), today's planetary transit geometry energizes your core functional houses under the {active_maha} Mahadasha ({active_antar} Antardasha) cycle. "
            f"The daily cosmic currents favor disciplined execution, lucid communication, and steady professional advancement. "
            f"Morning benefic Hora windows and the classical Abhijit Muhurta (~11:45 AM – 12:35 PM) offer your highest-leverage windows for signing agreements and closing deliverables, whereas unvetted speculative commitments must be avoided during localized Rahu Kaal. "
            f"Harmonize your vitality with mindful hydration and recitation of the governing planetary mantra."
        )
            overall = (
                f"For your natal {lagna} Lagna and {moon_sign} Moon, today's planetary transit geometry energizes your "
                f"core functional houses under the {active_maha}-{active_antar} Dasha cycle. "
                f"The daily cosmic currents favor disciplined execution, lucid communication, and steady progress."
            )
            supportive = [
                f"Morning (Dawn to Solar Noon): Heightened focus for high-leverage initiatives during benefic Hora windows.",
                f"Mid-Day Momentum: Supportive planetary aspects assist in collaborative agreements, negotiations, and technical reviews.",
                f"Evening (Sunset onward): Calming lunar alignment encourages domestic harmony, intellectual study, and contemplative rest."
            ]
            challenges = [
                f"Maintain heightened awareness during the localized Rahu Kaal window; avoid signing unvetted speculative contracts.",
                f"Stay mindful of digestive balance and hydration to harmonize natural Pitta and Vata energies.",
                f"Keep communication direct and transparent to prevent minor misunderstandings in team communications."
            ]
            windows = [
                f"Auspicious Action Window: Morning benefic Hora periods (governed by Jupiter/Venus/Mercury)",
                f"Mid-Day Peak Focus: Abhijit Muhurta (~11:45 AM - 12:35 PM local solar window)",
                f"Cautionary Period: Daily Rahu Kaal interval (refer to Horas schedule for exact timings)"
            ]
            why = (
                f"Today's transit interacts with your natal {lagna} Lagna ({lagna_deg:.2f}°), "
                f"your Moon in {moon_sign} ({moon_nak}), and active Vimshottari period of {active_maha}-{active_antar}."
            )
            reflection = (
                "Select your three most consequential responsibilities for today. Complete the primary milestone before midday."
            )
            limitations = (
                "Daily forecasts represent qualitative atmospheric trends. Conscious moral resolve and proactive initiative govern daily outcomes."
            )

    elif horizon_lower == "weekly":
        if is_hi:
            report_title = f"साप्ताहिक व्यक्तिगत फलादेश: 7 दिवसीय पराशरी चक्र ({target_date_str})"
            summary = (
            f"यह सात दिवसीय पारशरी गोचर चक्र आपकी {lagna_hi} लग्न कुंडली एवं {moon_hi} चंद्र के केंद्र व त्रिकोण भावों को {maha_hi} महादशा ({antar_hi} अंतर्दशा) के संरक्षण में प्रकाशित करता है। "
            f"चंद्रमा का क्रमिक नक्षत्र संचरण सप्ताह के पूर्वार्ध में आधिकारिक पहल व व्यावसायिक सुदृढ़ता और सप्ताहांत में पारिवारिक सौहार्द का संतुलन बनाता है। "
            f"सफलता के मुख्य अवसर मंगलवार व गुरुवार प्रातःकालीन सूर्य व गुरु होरा में प्राप्त होंगे, जबकि बुधवार अपराह्न में संवाद में किसी भी अस्पष्टता से बचें। "
            f"साप्ताहिक ऊर्जा संतुलन हेतु अपने दशा स्वामी के अनुकूल सात्विक दान और धर्म का आचरण करें।"
        )
            overall = (
                f"यह सात दिवसीय अवधि आपके {lagna_hi} लग्न के केंद्र व त्रिकोण भावों में चंद्र संचरण और "
                f"{maha_hi}-{antar_hi} दशा के प्रभाव से युक्त है। "
                f"सप्ताह के मध्य में व्यावसायिक स्थिरता और सप्ताहांत में पारिवारिक आनंद के सुंदर योग हैं।"
            )
            supportive = [
                "सप्ताह का प्रारंभ (दिन 1–3): व्यावसायिक प्रस्तुतियों, अनुबंधों को अंतिम रूप देने और नेतृत्व संवाद हेतु अनुकूल।",
                "सप्ताह का मध्य (दिन 4–5): व्यय और निवेश की सावधानीपूर्वक समीक्षा से वित्तीय स्पष्टता प्राप्त होगी।",
                "सप्ताहांत (दिन 6–7): आत्मीय संबंधों में मजबूती, दार्शनिक अध्ययन और परिवार संग आनंददायक समय।"
            ]
            challenges = [
                "सप्ताह के मध्य में षष्ठ भाव में चंद्र प्रभाव के कारण कार्यस्थल पर अस्पष्ट संवाद से बचें।",
                "ऊर्जा बनाए रखने के लिए देर रात के खान-पान और स्क्रीन उपयोग से बचें।",
                "प्रशासनिक या सरकारी कार्यों में धैर्य रखें।"
            ]
            windows = [
                "मुख्य सफलता खिड़की: मंगलवार और गुरुवार प्रातःकालीन सूर्य व गुरु होरा",
                "सावधानी खिड़की: बुधवार दोपहर (राहुकाल के दौरान)",
                "पारिवारिक सौहार्द खिड़की: शुक्रवार सायंकाल शुक्र होरा"
            ]
            why = (
                f"आपके {lagna_hi} लग्न और {moon_hi} चंद्र पर आधारित: दशम/एकादश भाव पर गोचरीय प्रभाव "
                f"और {maha_hi} महादशा की संस्थागत स्थिरता।"
            )
            reflection = (
                "सप्ताह की शुरुआत में तीन स्पष्ट लक्ष्य निर्धारित करें और प्रातःकाल गहरी रणनीति बनाएं।"
            )
            limitations = (
                "साप्ताहिक फलादेश जन्म दशा पर गोचर के प्रभाव को दर्शाता है। सटीक परिणाम जन्म समय की प्रामाणिकता पर निर्भर करते हैं।"
            )
        else:
            report_title = f"Weekly Personal Forecast: 7-Day Parashari Cycle ({target_date_str})"
            summary = (
            f"Across this 7-day Parashari cycle, lunar transits traverse your natal {lagna} Lagna's Kendra and Trikona houses under the stabilizing governance of {active_maha} Mahadasha ({active_antar} Antardasha). "
            f"The celestial arc favors early-week professional presentations and executive momentum, followed by mid-week balance sheet audits and weekend domestic rejuvenation. "
            f"Primary breakthrough windows open during Tuesday and Thursday morning benefic Horas, while Wednesday afternoon demands deliberate patience during transient communication shifts. "
            f"Strengthen your weekly karmic alignment through ethical duty (Dharma) and dedicated philanthropy."
        )
            overall = (
                f"This seven-day forecast period is energized by lunar transits activating your {lagna} Lagna's "
                f"Kendra and Trikona houses under the {active_maha}-{active_antar} Dasha. "
                f"Mid-week movements highlight professional consolidation, while the weekend encourages intellectual rejuvenation and family harmony."
            )
            supportive = [
                "Early week (Days 1–3): Favorable for professional presentations, contract finalization, and executive dialogue.",
                "Mid-week (Days 4–5): Financial clarity emerges through careful review of expenditure and investment allocations.",
                "Weekend (Days 6–7): Relationship bonding and reflective philosophical reading receive strong celestial support."
            ]
            challenges = [
                "Mid-week lunar transit across your 6th house suggests possible workplace friction if communication is ambiguous.",
                "Watch dietary habits and sleep rhythms during late evening hours to preserve physical vitality.",
                "Exercise added patience when dealing with administrative delays or bureaucratic processes."
            ]
            windows = [
                f"Primary Breakthrough Window: Tuesday and Thursday mornings during Sun and Jupiter Horas",
                f"Reflective / Cautionary Window: Wednesday afternoon (during Rahu Kaal)",
                f"Social & Familial Auspicious Window: Friday evening during Venus Hora"
            ]
            why = (
                f"Grounded in your {lagna} Lagna and {moon_sign} Moon: Transiting Sun and Mercury illuminate your 10th/11th house axis, "
                f"while your active {active_maha} Mahadasha ensures institutional stability against transitory planetary fluctuations."
            )
            reflection = (
                "Establish three clear milestones at the beginning of the week. "
                "Dedicate early morning hours to deep strategic work before opening digital channels."
            )
            limitations = (
                "Weekly forecasts trace planetary transits (Gochara) overlaid upon natal dasha cycles. "
                "Individual daily events depend on exact birth time accuracy and personal proactive choices."
            )

    elif horizon_lower == "monthly":
        if is_hi:
            report_title = f"मासिक व्यक्तिगत विश्लेषण: ग्रहीय गोचर व दशा संश्लेषण ({target_date_str})"
            summary = (
            f"आगामी ४-सप्ताह का मासिक गोचर चक्र आपके {lagna_hi} लग्न के दशम कर्म भाव और लाभ अक्ष को {maha_hi} महादशा के अधीन सुदृढ़ संबल प्रदान करता है। "
            f"शुक्ल पक्ष के दौरान नई पहलों और व्यावसायिक विस्तार को गति मिलेगी, जबकि कृष्ण पक्ष पूंजी संचय, बजट संतुलन और देनदारियों के निपटान का समर्थन करता है। "
            f"पूर्णिमा काल महत्वपूर्ण समझौतों व सहयोग हेतु सर्वोत्तम समय सिद्ध होगा, जबकि अमावस्या के निकट किसी भी प्रकार के सट्टा जोखिम से बचना चाहिए। "
            f"प्रातःकालीन ध्यान नियमित रखें और {maha_hi} महादशा स्वामी के बीज मंत्र का जप करें।"
        )
            overall = (
                f"यह मासिक चक्र सामाजिक प्रतिष्ठा में वृद्धि और पूंजी संचय का एक सुव्यवस्थित चरण प्रस्तुत करता है। "
                f"आपके {lagna_hi} लग्न और सक्रिय {maha_hi} महादशा के अंतर्गत "
                f"आगामी चार सप्ताह धैर्य, व्यवस्थित श्रम और दूरगामी निवेश का पुरस्कार देंगे।"
            )
            supportive = [
                "सप्ताह 1 व 2: कार्यक्षेत्र में विस्तार, नेतृत्व की मान्यता और वरिष्ठों का मार्गदर्शन।",
                "सप्ताह 3: वित्तीय सुदृढ़ता, लंबित कार्यों का समाधान और परिसंपत्ति योजना।",
                "सप्ताह 4: सौहार्दपूर्ण पारिवारिक वातावरण, व्यक्तिगत नवजीवन और आध्यात्मिक शांति।"
            ]
            challenges = [
                "सप्ताह 2 व 3: मानसिक व्यय अधिक रहेगा; अनचाहे दायित्व अपने ऊपर न लें।",
                "खान-पान और पाचन स्वास्थ्य का विशेष ध्यान रखें।",
                "साझेदारी वाले कार्यों में सभी नियमों और शर्तों को लिखित में रखें।"
            ]
            windows = [
                "शुक्ल पक्ष: नए उपक्रम प्रारंभ करने और महत्वपूर्ण समझौतों हेतु श्रेष्ठ",
                "पूर्णिमा काल: भावनात्मक स्पष्टता और व्यक्तिगत संबंधों में प्रगाढ़ता",
                "कृष्ण पक्ष: आत्ममंथन, ऑडिट और पुराने कार्यों के समापन हेतु उत्तम"
            ]
            why = (
                f"आपके {lagna_hi} लग्नेश का शुभ प्रभाव और नवम भाव पर गुरु की दृष्टि शनि के प्रभाव को संतुलित करती है।"
            )
            reflection = (
                "माह के प्रारंभ में अपने त्रैमासिक बजट और करियर लक्ष्यों की समीक्षा करें। प्रातःकालीन ध्यान नियमित रखें।"
            )
            limitations = (
                "मासिक फलादेश व्यापक खगोलीय परिस्थितियों को व्यक्त करता है, भाग्यवादी अनिवार्यता को नहीं।"
            )
        else:
            report_title = f"Monthly Personal Analysis: Planetary Transits & Dasha Synthesis ({target_date_str})"
            summary = (
            f"This 4-week transit arc stabilizes your natal {lagna} Lagna's 10th house vocational axis and financial sectors under ongoing {active_maha} Mahadasha governance. "
            f"Waxing Shukla Paksha currents catalyze career expansion, leadership visibility, and stakeholder endorsement across Weeks 1–2, transitioning into capital audits and asset consolidation in Weeks 3–4. "
            f"Peak opportunities coincide with the waxing Moon for formalizing alliances, whereas high-volatility financial speculation must be strictly avoided during dark-moon Amavasya. "
            f"Incorporate regular morning contemplation to maintain emotional poise and nervous equilibrium."
        )
            overall = (
                f"This monthly cycle presents a structured phase of institutional elevation and capital consolidation. "
                f"With your 10th House {h10_occ} and your active {active_maha} Mahadasha progressing steadily, "
                f"the upcoming four weeks reward patience, systematic labor, and measured long-term investments."
            )
            supportive = [
                "Weeks 1 & 2: Career expansion, leadership visibility, and endorsement from senior mentors.",
                "Week 3: Financial optimization, settlement of pending obligations, and property/asset deliberations.",
                "Week 4: Harmonious domestic atmosphere, personal rejuvenation, and spiritual grounding."
            ]
            challenges = [
                "Weeks 2 & 3: Elevated mental expenditure; avoid taking on unvetted commitments.",
                "Slight digestive sensitivity during Saturn-aspect transit windows; prioritize whole foods.",
                "Manage expectations in collaborative projects by ensuring deliverables are explicitly documented in writing."
            ]
            windows = [
                "Waxing Moon (Shukla Paksha): Ideal for inaugurating new ventures and signing agreements",
                "Full Moon Phase: Heightened intuition and clarity regarding personal relationships",
                "Waning Moon (Krishna Paksha): Optimal for introspection, audit, and concluding legacy projects"
            ]
            why = (
                f"Your {lagna} Lagna lord establishes strong functional support. "
                f"Jupiter's trine aspects reinforce your 9th house of fortune, mitigating the restrictive pressure of Saturn in {sadesati}."
            )
            reflection = (
                "Review your quarterly budget and professional goals at the start of the month. "
                "Incorporate a regular morning contemplation or meditation practice to maintain emotional poise."
            )
            limitations = (
                "Monthly evaluations synthesize major planetary ingress and nakshatra transits against natal bhava cusps. "
                "Predictions indicate broad environmental seasons rather than unavoidable personal occurrences."
            )

    elif horizon_lower in ["mahadasha", "5year", "five_year"]:
        if is_hi:
            report_title = f"विंशोत्तरी महादशा 5-वर्षीय जीवन चक्र: {maha_hi} महादशा ({antar_hi} अंतर्दशा)"
            summary = (
            f"आपकी {lagna_hi} लग्न कुंडली में {moon_hi} चंद्र ({moon_nak} नक्षत्र) से संगणित यह ५-वर्षीय विंशोत्तरी समयरेखा {maha_hi} महादशा ({antar_hi} अंतर्दशा) के युगांतरकारी कर्म चक्र को उद्घाटित करती है। "
            f"यह वृहद कालखंड प्रथम व द्वितीय वर्ष में आधारशिला निर्माण व साख संवर्धन से प्रारंभ होकर तृतीय से पंचम वर्ष में बौद्धिक उत्कर्ष, परिसंपत्ति विस्तार और सलाहकार नेतृत्व की ओर अग्रसर होता है। "
            f"आपकी सर्वोच्च सफलता नैतिक सत्यनिष्ठा और संस्थागत मर्यादाओं के पालन से सुनिश्चित होगी, जबकि प्रमुख अंतर्दशा संधिकाल में वित्तीय विस्तार में उतावलेपन से बचना अनिवार्य है। "
            f"प्रतिदिन प्रातःकाल {maha_hi} महादशा स्वामी के बीज मंत्र का १०८ बार जप कर जीवन के ध्येय को संरेखित करें।"
        )
            overall = (
                f"वर्तमान में आप {maha_hi} महादशा और {antar_hi} अंतर्दशा के महत्वपूर्ण कालखंड से गुजर रहे हैं। "
                f"आपके {lagna_hi} लग्न के लिए {maha_hi} वृद्धि, ज्ञान और सिद्धि के प्रमुख भावों का संचालन करता है। "
                f"आगामी पांच वर्ष परिपक्वता, प्रभाव विस्तार और स्थायी प्रतिष्ठा के निर्माण का मार्ग प्रशस्त करेंगे।"
            )
            supportive = [
                "वर्ष 1: आधारशिला निर्माण — व्यावसायिक साख को सुदृढ़ करना और रणनीतिक मार्गदर्शन प्राप्त करना।",
                "वर्ष 2: पूंजी व संपदा विस्तार — विवेकपूर्ण निवेश, संपत्ति निर्णय और लाभदायक साझेदारी।",
                "वर्ष 3: बौद्धिक व रचनात्मक उन्नति — अध्ययन, दार्शनिक परिपक्वता और ज्ञानवर्धक यात्राएं।",
                "वर्ष 4: पारिवारिक व दांपत्य सुख — पारिवारिक सौहार्द, स्थायी आवास और सामाजिक सम्मान।",
                "वर्ष 5: महत्वपूर्ण उपलब्धियों की प्राप्ति — परामर्शदाता पद, सिद्धि और जीवन के प्रमुख लक्ष्यों की पूर्ति।"
            ]
            challenges = [
                "अंतर्दशा संधि: प्रमुख ग्रहीय अवधियों के संधिकाल में विशेष धैर्य और विवेक बनाए रखें।",
                "अत्यधिक आशावाद में आकर संसाधनों का असंतुलित विस्तार न करें।",
                "पांच वर्षीय चक्र में निरंतर ऊर्जा बनाए रखने हेतु नियमित दिनचर्या और स्वास्थ्य का ध्यान रखें।"
            ]
            windows = [
                f"सक्रिय अंतर्दशा चरमोत्कर्ष: {maha_hi}-{antar_hi} का वर्तमान शुभ चक्र",
                "प्रमुख गोचर मील का पत्थर: केंद्र व त्रिकोण भावों में देवगुरु बृहस्पति का गोचर",
                f"कर्म शुद्धि काल: शनि का अनुशासित गोचर ({sadesati})"
            ]
            why = (
                f"यह 5-वर्षीय जीवन रूपरेखा आपकी {moon_hi} चंद्र राशि ({moon_nak} नक्षत्र) से "
                f"120-वर्षीय प्रामाणिक विंशोत्तरी दशा पद्धति द्वारा निकाली गई है।"
            )
            reflection = (
                f"अपने पांच वर्षीय व्यक्तिगत दृष्टिकोण को {maha_hi} के मूल स्वभाव (ज्ञान, धर्म, सत्यनिष्ठा और सतत प्रगति) से संरेखित करें।"
            )
            limitations = (
                "महादशा जीवन के वृहद अध्यायों को प्रकाशित करती है। दैनिक विकल्प और पुरुषार्थ ही पूर्ण क्षमता को फलित करते हैं।"
            )
        else:
            report_title = f"Mahadasha 5-Year Life Arc: {active_maha} Mahadasha ({active_antar} Antardasha)"
            summary = (
            f"Your 5-year chronological Vimshottari roadmap unfolds the sovereign karmic epoch of {active_maha} Mahadasha ({active_antar} Antardasha) for your {lagna} Lagna nativity, derived from natal Moon in {moon_sign} ({moon_nak} Nakshatra). "
            f"This multi-year trajectory transitions from foundational systems-building and reputation consolidation in Years 1–2 to capital compounding, intellectual mastery, and advisory leadership across Years 3–5. "
            f"Peak fruition arrives through ethical institutional stewardship, while periods of Antardasha Sandhi require patience against over-leveraging assets or rushing corporate pivots. "
            f"Harmonize your multi-year arc with consistent morning recitation of 108 repetitions of the {active_maha} Beej Mantra and charitable service."
        )
            overall = (
                f"You are currently traversing the transformative cycle of {active_maha} Mahadasha, "
                f"with the active sub-period (Antardasha) of {active_antar}. "
                f"For your {lagna} Lagna, {active_maha} acts as a vital functional ruler, governing key houses of growth, wisdom, and material manifestation. "
                f"The upcoming five-year window brings structural maturity, expansion of influence, and lasting legacy development."
            )
            supportive = [
                f"Year 1: Foundation Building — Consolidating professional reputation and securing strategic mentorship.",
                f"Year 2: Capital & Wealth Expansion — Compounding investments, property decisions, and business alliances.",
                f"Year 3: Intellectual & Creative Elevation — Academic, philosophical, or spiritual mastery; valuable travel.",
                f"Year 4: Relational & Family Fulfillment — Deepening marital bonding, domestic stability, and community respect.",
                f"Year 5: Fruition of Karmic Milestones — Transition into advisory authority and celebratory life achievements."
            ]
            challenges = [
                f"Antardasha Sandhi: Navigate the transition boundaries between major planetary sub-periods with deliberate patience.",
                f"Avoid over-expansion or over-leveraging assets during peak optimistic planetary cycles.",
                f"Honor consistent spiritual discipline and daily health maintenance to sustain high vitality across the 5-year cycle."
            ]
            windows = [
                f"Active Antardasha Peak: Current cycle of {active_maha}-{active_antar}",
                f"Major Transit Milestone: Jupiter transit across Kendra and Trikona houses",
                f"Karmic Recalibration Phase: Saturn transit completion in sidereal Pisces ({sadesati})"
            ]
            why = (
                f"This 5-year arc is derived from your natal Moon in {moon_sign} ({moon_nak} Nakshatra, Pada {kundli['planets']['Moon'].get('pada', 1)}) "
                f"under the canonical 120-year Vimshottari Dasha system."
            )
            reflection = (
                f"Align your five-year personal vision with the core nature of {active_maha}: wisdom, ethics, mentorship, and sustainable growth."
            )
            limitations = (
                "Mahadasha analysis illuminates broad karmic seasons and major developmental chapters. Daily choices and moral resolve shape the realization of your highest potential."
            )

    else:
        if is_hi:
            report_title = f"वार्षिक 12-माह पराशरी परिदृश्य: व्यापक महादशा व गोचर विश्लेषण"
            summary = (
            f"आगामी १२-माह का वार्षिक सौर व ग्रहीय चक्र आपके {lagna_hi} लग्न एवं {moon_hi} चंद्र हेतु {maha_hi} महादशा ({antar_hi} अंतर्दशा) अंतर्गत व्यावसायिक स्वावलंबन और स्थायी प्रतिष्ठा का युगांतरकारी अध्याय प्रस्तुत करता है। "
            f"गोचरीय देवगुरु बृहस्पति एवं कर्मफलदाता शनि के प्रमुख प्रभाव आपके केंद्र व त्रिकोण भावों को संबल प्रदान कर अनुशासित पुरुषार्थ का श्रेष्ठ फल देंगे। "
            f"वसंतोपरांत का कालखंड रणनीतिक विस्तार हेतु सर्वाधिक अनुकूल रहेगा, जबकि ग्रहण काल व राहु-केतु संधिकाल में सट्टा व जोखिम से बचना अनिवार्य है। "
            f"वर्ष भर में नियमित रूप से धर्म, सत्य और परोपकार का पालन करें।"
        )
            overall = (
                f"आगामी 12 महीनों का चक्र आपके जीवन में एक महत्वपूर्ण परिवर्तनकारी युग है। "
                f"आपकी {maha_hi} महादशा और {antar_hi} अंतर्दशा के संचालन में "
                f"करियर, वित्तीय स्वायत्तता और आत्म-ज्ञान में किया गया कार्य ठोस परिणाम देगा।"
            )
            supportive = [
                "प्रथम तिमाही (माह 1–3): करियर पुनर्गठन, उच्च-दृश्यता वाले कार्य और व्यावसायिक मान्यता।",
                "द्वितीय तिमाही (माह 4–6): अनुशासित पूंजी संचय और रणनीतिक साझेदारी से आर्थिक समृद्धि।",
                "तृतीय तिमाही (माह 7–9): शैक्षणिक, आध्यात्मिक और बौद्धिक प्रगति; शुभ यात्रा के योग।",
                "चतुर्थ तिमाही (माह 10–12): घरेलू स्थिरता, संपत्ति का विस्तार और पारिवारिक मांगलिक कार्य।"
            ]
            challenges = [
                "करियर की महत्वाकांक्षा और घरेलू सुख-शांति के मध्य स्वस्थ संतुलन बनाए रखना।",
                "शनि के अनुशासित गोचर में बिना किसी शॉर्टकट के नियमित दिनचर्या का पालन करना।",
                "ग्रहण काल अथवा प्रतिकूल गोचर के दौरान सट्टा या जल्दबाजी के निवेश से बचना।"
            ]
            windows = [
                "वसंत / विषुव उपरांत काल: रणनीतिक करियर परिवर्तन और नई शुरुआत हेतु सर्वोत्तम खिड़की",
                "शरद चंद्र चक्र: धन संचय और औपचारिक समझौतों हेतु अत्यंत अनुकूल",
                "शीत संक्रांति चरण: आध्यात्मिक साधना, स्वास्थ्य सुधार और वार्षिक समीक्षा हेतु आदर्श"
            ]
            why = (
                f"जन्म लग्न {lagna_hi} और {moon_hi} चंद्र एक दृढ़ आधार प्रदान करते हैं। "
                f"गुरु और शनि का गोचर D1 और D9 कुंडलियों के साथ अनुकूल सामंजस्य बना रहा है।"
            )
            reflection = (
                "कठोर चेकलिस्ट के स्थान पर एक वार्षिक थीम निर्धारित करें। "
                "दैनिक अनुशासन, नियमित दान और नैतिक मूल्यों का पालन करें।"
            )
            limitations = (
                "वार्षिक फलादेश शास्त्रीय पराशरी दशा और गोचर पर आधारित रणनीतिक दिशा देता है। वास्तविक परिणाम व्यक्तिगत कर्म और विवेक पर निर्भर हैं."
            )
        else:
            report_title = f"Yearly 12-Month Parashari Outlook: Comprehensive Mahadasha & Transit Map"
            summary = (
            f"The upcoming 12-month solar and transit journey for {lagna} Lagna and {moon_sign} Moon marks a transformative epoch of professional sovereignty and asset compounding under {active_maha} Mahadasha ({active_antar} Antardasha). "
            f"Major planetary stations of transiting Jupiter and Saturn activate your natal Kendra and Trikona axes, rewarding disciplined perseverance and systematic foundation-building across all four quarters. "
            f"Optimal strategic acceleration opens post-spring equinox, while eclipse portals and nodal transits require emotional composure and avoidance of unhedged financial commitments. "
            f"Anchor your annual trajectory by dedicating regular contemplative study to your Ishta Devata and practicing ethical duty (Dharma)."
        )
            overall = (
                f"The upcoming twelve-month cycle marks a pivotal transformative epoch in your life trajectory. "
                f"Under the governance of your {active_maha} Mahadasha and {active_antar} Antardasha, "
                f"foundations laid in career, financial sovereignty, and personal wisdom will compound substantially."
            )
            supportive = [
                "Quarter 1 (Months 1–3): Career restructuring, high-visibility assignments, and professional recognition.",
                "Quarter 2 (Months 4–6): Financial growth through disciplined capital accumulation and strategic partnerships.",
                "Quarter 3 (Months 7–9): Academic, spiritual, and philosophical advancement; possible auspicious travel.",
                "Quarter 4 (Months 10–12): Domestic consolidation, property stability, and celebration of family milestones."
            ]
            challenges = [
                "Maintaining balance between relentless career ambition and domestic well-being.",
                "Navigating Saturn's disciplined transit requires consistent daily routine without shortcuts.",
                "Avoiding speculative investments during eclipse seasons or Rahu transit shifts."
            ]
            windows = [
                "Spring / Post-Equinox: Optimal window for strategic career transitions and business launches",
                "Autumn Lunar Cycle: Favorable for wealth consolidation and formalizing personal commitments",
                "Winter Solstice Phase: Ideal for spiritual retreats, health recalibration, and annual audits"
            ]
            why = (
                f"Natal Lagna {lagna} with {moon_sign} Moon provides an enduring constitutional foundation. "
                f"The major transits of Jupiter and Saturn align harmoniously with your D1 and D9 charts, "
                f"providing structural endurance to overcome transient challenges."
            )
            reflection = (
                "Adopt an annual thematic intention rather than rigid checklists. "
                "Cultivate disciplined daily habits, practice regular philanthropy (Daan), and honor generational commitments."
            )
            limitations = (
                "Annual forecasts provide a high-level strategic compass grounded in classical Parashari Dasha and Gochara rules. "
                "Outcomes require conscious personal initiative, moral discernment, and environmental cooperation."
            )

    sade_sati_dict = doshas.get("sade_sati", {}) if doshas else {}
    sade_sati_status_clean = sade_sati_dict.get("sade_sati_status", "Clear of Sade Sati") if kundli else ("सार्वभौमिक गोचर" if is_hi else "Universal Transit")
    dhaiya_status_clean = sade_sati_dict.get("dhaiya_status", "Inactive: No Active Dhaiya") if kundli else ("सामान्य गोचर" if is_hi else "General Transit")

    remedy_payload, precaution_payload = _build_remedies_and_precautions(
        horizon_lower, is_hi, hora_planet, active_maha, challenges, reflection, has_chart=True
    )

    return {
        "report_title": report_title,
        "time_horizon": horizon_lower,
        "target_date": target_date_str,
        "period": period_info,
        "calculation_context": {
            "lagna_sign": lagna,
            "lagna_degree": round(lagna_deg, 2) if lagna_deg is not None else None,
            "moon_sign": moon_sign,
            "moon_nakshatra": moon_nak,
            "active_mahadasha": active_maha,
            "active_antardasha": active_antar,
            "saturn_classification": saturn_classification,
            "sade_sati_status": sade_sati_status_clean,
            "dhaiya_status": dhaiya_status_clean,
            "sade_sati_phase": sadesati,
            "active_hora_planet": hora_planet,
            "active_hora_window": time_window_str
        },
        "preview": preview_info,
        "profile": {
            "name": kundli.get("profile_name", "Valued Seeker"),
            "lagna": lagna,
            "lagna_degree": round(lagna_deg, 2),
            "moon_sign": moon_sign,
            "moon_nakshatra": moon_nak,
            "sun_sign": sun_sign,
            "active_mahadasha": active_maha,
            "active_antardasha": active_antar,
            "sade_sati_status": sade_sati_status_clean,
            "dhaiya_status": dhaiya_status_clean,
            "sade_sati_phase": sadesati,
            "saturn_classification": saturn_classification,
            "is_manglik": is_manglik
        },
        "sections": {
            "executive_summary": summary,
            "overall_outlook": overall,
            "supportive_themes": supportive,
            "supportive_developments": supportive,
            "challenges_and_cautions": challenges,
            "key_time_windows": windows,
            "relevant_time_windows": windows,
            "relevant_chart_facts": {
                "lagna": f"{lagna_hi} ({round(lagna_deg, 2)}°)" if is_hi else f"{lagna} ({round(lagna_deg, 2)}°)",
                "moon": f"{moon_hi} ({moon_nak})" if is_hi else f"{moon_sign} ({moon_nak})",
                "active_dasha": f"{maha_hi} महादशा / {antar_hi} अंतर्दशा" if is_hi else f"{active_maha} Mahadasha / {active_antar} Antardasha",
                "saturn_transit": f"शनि गोचर: {saturn_classification}" if is_hi else saturn_classification,
                "sade_sati_status": sade_sati_status_clean,
                "dhaiya_status": dhaiya_status_clean,
                "current_interval_lord": hora_hi if is_hi else hora_planet
            },
            "applicable_traditional_rules": why,
            "why_this_applies": why,
            "practical_reflection": reflection,
            "limitations": limitations
        },
        "period_items": period_items,
        "remedies": remedy_payload,
        "precautions": precaution_payload,
        "timing_metadata": {
            "active_hora_planet": hora_planet,
            "hora_window": time_window_str,
            "calculation_engine": "SwissEphemeris_v2.10_Lahiri",
            "interpretation_standard": "Parashari_Jyotish_Canonical_v2"
        },
        "provenance": {
            "calculation_engine": "SwissEphemeris_v2.10_Lahiri",
            "ephemeris_mode": "Sidereal_Lahiri_Ayanamsha",
            "dasha_system": "Vimshottari_120_Year",
            "saturn_classification": saturn_classification,
            "sade_sati_status": sade_sati_status_clean,
            "dhaiya_status": dhaiya_status_clean,
            "time_horizon": horizon_lower
        }
    }
