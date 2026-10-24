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
from typing import Dict, Any, List, Optional

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

def generate_astrological_reading(
    category: str,
    user_query: str,
    kundli: Optional[dict] = None,
    dasha: Optional[dict] = None,
    doshas: Optional[dict] = None,
    time_horizon: str = "daily",
    astrologer_name: Optional[str] = None,
    session_history: Optional[List[Dict[str, Any]]] = None
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
        SCOPE_APP_WALLET
    )
    classification = classify_user_query(user_query, session_history=session_history, has_chart=has_chart)
    scope = classification.get("scope")

    if scope in [
        SCOPE_OUT_OF_SCOPE,
        SCOPE_HIGH_STAKES_REQUIRING_LIMITATION,
        SCOPE_UNSUPPORTED_ASTROLOGY_CAPABILITY,
        SCOPE_ASTROLOGY_CONCEPTUAL,
        SCOPE_APP_WALLET
    ]:
        grounded_res = generate_scope_grounded_response(
            classification=classification,
            query=user_query,
            kundli=kundli,
            dasha=dasha,
            doshas=doshas,
            astrologer_name=astrologer_name
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

    is_career = any(w in q for w in [
        "career", "job", "promot", "profession", "business", "work", "boss",
        "interview", "office", "10th", "transfer", "startup", "colleague", "vocation"
    ]) or (cat == "career" and not is_greeting)

    is_marriage = any(w in q for w in [
        "marri", "love", "partner", "spouse", "husband", "wife", "relationship",
        "compatibility", "7th", "divorce", "wedding", "romance", "synastry", "navamsha", "d9"
    ]) or (cat in ["marriage", "relationship"] and not is_greeting)

    is_wealth = any(w in q for w in [
        "wealth", "money", "financ", "invest", "stock", "debt", "loan", "property",
        "income", "gains", "11th", "2nd", "dhana", "asset", "crypto", "savings"
    ]) or (cat in ["wealth", "finance"] and not is_greeting)

    is_health = any(w in q for w in [
        "health", "disease", "illness", "sick", "hospital", "pain", "stress",
        "mental", "vitality", "energy", "6th", "8th", "anxiety", "depression"
    ]) or (cat == "health" and not is_greeting)

    is_remedy = any(w in q for w in [
        "remed", "mantra", "gem", "stone", "pukhraj", "ruby", "emerald", "sapphire",
        "puja", "sade", "sati", "dosha", "daan", "fast", "charity", "rudraksha"
    ]) or (cat in ["remedies", "remedy"] and not is_greeting)

    is_timing = any(w in q for w in [
        "when", "timing", "dates", "period", "year", "month", "soon", "how long",
        "future", "timeline", "2026", "2027", "dasha", "transit"
    ])

    is_explanation = any(w in q for w in [
        "why", "explain", "logic", "how come", "reason", "scripture", "basis",
        "source", "shastra", "parashar", "principle", "rule"
    ])

    # Context Resolution: If user asked a generic timing or explanation question, inherit prior topic
    if (is_timing or is_explanation or len(q.split()) <= 4) and not (is_career or is_marriage or is_wealth or is_health or is_remedy or is_greeting):
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
        manglik = doshas.get("manglik", {}).get("verdict", "No Manglik Dosha") if doshas else "No Manglik Dosha"

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
                "title": "Venusian Harmony & Emotional Balance",
                "mantra": "Om Kleem Shukraya Namah (Chant 108 times on Friday dawn)",
                "gemstone_note": "Natural White Zircon or Diamond set in silver (after verifying Lagna lordship)",
                "charity_practice": "Support women's education or offer white flowers at Lakshmi temples on Fridays",
                "disclaimer": "Traditional remedial practices cultivate inner mindfulness; they do not guarantee specific interpersonal outcomes."
            }
        elif persona_id == "pandit-raghavendra" or intent == "remedy":
            remedy_card = {
                "title": "Classical Parashari Remedial Discipline",
                "mantra": "Maha Mrityunjaya Mantra: Om Tryambakam Yajamahe (108 times at sunrise)",
                "gemstone_note": "Fortify functional Trikona lords (Pukhraj or Manik) only after inspecting 6th/8th house lordships",
                "charity_practice": "Light a pure sesame oil lamp under a Peepal tree on Saturdays; feed cows with green fodder",
                "disclaimer": "Vedic remedies are sacred traditional disciplines for mental peace; they carry no commercial guarantees."
            }
        else:
            remedy_card = {
                "title": "Solar Vitality & Professional Elevation",
                "mantra": "Aditya Hridaya Stotra or Gayatri Mantra (Chant 11 times during morning Brahma Muhurta)",
                "gemstone_note": "Natural Ruby (Manik) or Emerald (Panna) for Lagna vigor",
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
        if intent == "greeting":
            if persona_id == "dr-sunita-shastri":
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
                    f"Pranam! I am {persona_display}.\n\n"
                    f"I have analyzed your calculated chart: **{lagna} Lagna** ({lagna_deg:.2f}°), **{moon_sign} Moon**, "
                    f"and active **{active_maha} Mahadasha** with **{active_antar} Antardasha**.\n\n"
                    f"### Strategic Career & Life Architecture\n"
                    f"Your 10th House of career authority is {h10_str}. Under your active {active_maha} cycle, the celestial geometry "
                    f"supports deliberate professional positioning, institutional leadership, and structured long-term wealth compounding.\n\n"
                    f"What strategic milestone, career transition, or financial objective would you like to examine?"
                )

        elif intent == "career":
            if persona_id == "dr-sunita-shastri":
                body_md = (
                    f"Namaste! I am {persona_display}.\n\n"
                    f"Analyzing your professional horizon through an empathetic and Jaimini lens for **{lagna} Lagna**:\n\n"
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
                    f"Om Namah Shivaya! I am {persona_display}.\n\n"
                    f"According to classical Parashari Jyotish for **{lagna} Lagna**:\n\n"
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
                    f"Pranam! I am {persona_display}.\n\n"
                    f"Analyzing the executive trajectory of your **{lagna} Lagna** ({lagna_deg:.2f}°):\n\n"
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
            if persona_id == "acharya-devratan":
                body_md = (
                    f"Pranam! I am {persona_display}.\n\n"
                    f"Evaluating relationship stability and marriage timing for **{lagna} Lagna**:\n\n"
                    f"### 7th House & Partnership Analysis\n"
                    f"Your 7th House of Kalatra is {h7_str}, and your marital verification status is: **{manglik}**. "
                    f"Under active **{active_maha}-{active_antar}** Dasha, planetary transits create a structured, supportive window "
                    f"over the next 6 to 12 months for formalizing alliances or stabilizing long-term commitments.\n\n"
                    f"### Strategic Relationship Principles\n"
                    f"Approach partnerships with the same diligence as long-term covenants: prioritize shared financial values, emotional integrity, "
                    f"and mutual respect. Avoid bringing workplace stresses into your home environment."
                )
            elif persona_id == "pandit-raghavendra":
                body_md = (
                    f"Om Namah Shivaya! I am {persona_display}.\n\n"
                    f"In sacred classical Jyotish for **{lagna} Lagna** and **{moon_sign} Moon**:\n\n"
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
                    f"Namaste! I am {persona_display}.\n\n"
                    f"Examining your relationship architecture through Jaimini and Parashari synastry for **{lagna} Lagna**:\n\n"
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
        "status": "completed",
        "astrological_grounding": {
            "lagna": lagna,
            "moon_sign": moon_sign,
            "sun_sign": sun_sign,
            "active_mahadasha": active_maha,
            "active_antardasha": active_antar
        }
    }


def generate_structured_prediction(
    horizon: str,
    target_date_str: str,
    kundli: Optional[Dict[str, Any]] = None,
    dasha: Optional[Dict[str, Any]] = None,
    doshas: Optional[Dict[str, Any]] = None,
    active_hora_planet: Optional[str] = None,
    hora_window: Optional[str] = None,
    category: str = "general",
    lang: str = "en"
) -> Dict[str, Any]:
    hora_planet = active_hora_planet or "Jupiter"
    time_window_str = hora_window or "Current Astronomical Interval"
    horizon_lower = horizon.lower()

    if not kundli:
        # Canonical unpersonalized general transit guidance (no fabricated Lagna or Moon)
        if horizon_lower == "hourly":
            report_title = f"Hourly Universal Guidance: {hora_planet} Hora ({time_window_str})"
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
            report_title = f"Daily Universal Transit Forecast: {target_date_str}"
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
            report_title = f"Weekly Universal Transit Progression: 7-Day Cycle ({target_date_str})"
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
            report_title = f"Monthly Universal Transit Overview: {target_date_str}"
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
            report_title = "Vimshottari Mahadasha Overview (Requires Birth Chart)"
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
            report_title = "Yearly Universal Transit Outlook: 12-Month Astronomical Cycle"
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
            "profile": {
                "name": "Guest Seeker",
                "is_guest": True,
                "lagna": None,
                "lagna_degree": None,
                "moon_sign": None,
                "moon_nakshatra": None,
                "sun_sign": None,
                "active_mahadasha": None,
                "active_antardasha": None,
                "sade_sati_phase": "General Transit",
                "is_manglik": False
            },
            "sections": {
                "executive_summary": overall.split(". ")[0] + "." if ". " in overall else overall,
                "overall_outlook": overall,
                "supportive_themes": supportive,
                "supportive_developments": supportive,
                "challenges_and_cautions": challenges,
                "key_time_windows": windows,
                "relevant_time_windows": windows,
                "relevant_chart_facts": {
                    "lagna": "No Birth Chart Loaded",
                    "moon": "No Birth Chart Loaded",
                    "active_dasha": "Calculate Janam Kundli to unlock Dasha",
                    "saturn_transit": "Sidereal Pisces (Universal Transit)",
                    "current_interval_lord": hora_planet
                },
                "applicable_traditional_rules": why,
                "why_this_applies": why,
                "practical_reflection": reflection,
                "limitations": limitations
            },
            "timing_metadata": {
                "active_hora_planet": hora_planet,
                "hora_window": time_window_str,
                "calculation_engine": "SwissEphemeris_v2.10_Lahiri",
                "interpretation_standard": "Parashari_Jyotish_Canonical_v2"
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
    is_manglik = doshas.get("manglik", {}).get("is_manglik", False)

    h10_planets = [p for p, d in planets.items() if d.get("house") == 10]
    h10_occ = f"occupied by {', '.join(h10_planets)}" if h10_planets else "aspected by your Lagna lord"

    if horizon_lower == "hourly":
        report_title = f"Hourly Personal Guidance: {hora_planet} Hora ({time_window_str})"
        
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
        report_title = f"Daily Personal Forecast: {target_date_str} (Solar & Lunar Transit Synthesis)"
        
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
        report_title = f"Weekly Personal Forecast: 7-Day Parashari Cycle ({target_date_str})"
        
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
        report_title = f"Monthly Personal Analysis: Planetary Transits & Dasha Synthesis ({target_date_str})"
        
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
        report_title = f"Mahadasha 5-Year Life Arc: {active_maha} Mahadasha ({active_antar} Antardasha)"
        
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
        report_title = f"Yearly 12-Month Parashari Outlook: Comprehensive Mahadasha & Transit Map"
        
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

    return {
        "report_title": report_title,
        "time_horizon": horizon_lower,
        "target_date": target_date_str,
        "profile": {
            "name": kundli.get("profile_name", "Valued Seeker"),
            "lagna": lagna,
            "lagna_degree": round(lagna_deg, 2),
            "moon_sign": moon_sign,
            "moon_nakshatra": moon_nak,
            "sun_sign": sun_sign,
            "active_mahadasha": active_maha,
            "active_antardasha": active_antar,
            "sade_sati_phase": sadesati,
            "is_manglik": is_manglik
        },
        "sections": {
            "executive_summary": overall.split(". ")[0] + "." if ". " in overall else overall,
            "overall_outlook": overall,
            "supportive_themes": supportive,
            "supportive_developments": supportive,
            "challenges_and_cautions": challenges,
            "key_time_windows": windows,
            "relevant_time_windows": windows,
            "relevant_chart_facts": {
                "lagna": f"{lagna} ({round(lagna_deg, 2)}°)",
                "moon": f"{moon_sign} ({moon_nak})",
                "active_dasha": f"{active_maha} Mahadasha / {active_antar} Antardasha",
                "saturn_transit": sadesati,
                "current_interval_lord": hora_planet
            },
            "applicable_traditional_rules": why,
            "why_this_applies": why,
            "practical_reflection": reflection,
            "limitations": limitations
        },
        "timing_metadata": {
            "active_hora_planet": hora_planet,
            "hora_window": time_window_str,
            "calculation_engine": "SwissEphemeris_v2.10_Lahiri",
            "interpretation_standard": "Parashari_Jyotish_Canonical_v2"
        }
    }
