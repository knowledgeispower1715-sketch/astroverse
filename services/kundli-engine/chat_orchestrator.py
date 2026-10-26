"""
AstroVerse Chat Intelligence & Semantic Tool Orchestration Engine:
Implements open-ended conversational routing inspired by VedAstro's architecture:
- 9 distinct scope classification states
- Deterministic refusal for out-of-scope non-astrological queries
- Strict chart-grounded context binding (eliminating hardcoded defaults like Taurus Lagna)
- Context-aware follow-up resolution and multi-turn history continuity
- Differentiated persona delivery across Acharya Devratan, Dr. Sunita Shastri, and Pandit Raghavendra
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from tools_registry import ASTROLOGY_METHOD_REGISTRY, execute_tool

# The 9 Formal Scope States
SCOPE_ASTROLOGY_IN_SCOPE = "ASTROLOGY_IN_SCOPE"
SCOPE_ASTROLOGY_CONCEPTUAL = "ASTROLOGY_CONCEPTUAL"
SCOPE_ASTROLOGY_WITH_MISSING_INPUTS = "ASTROLOGY_WITH_MISSING_INPUTS"
SCOPE_FOLLOW_UP_REQUIRING_CONTEXT = "FOLLOW_UP_REQUIRING_CONTEXT"
SCOPE_SOCIAL_CONVERSATION = "SOCIAL_CONVERSATION"
SCOPE_CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"
SCOPE_OUT_OF_SCOPE = "OUT_OF_SCOPE"
SCOPE_HIGH_STAKES_REQUIRING_LIMITATION = "HIGH_STAKES_REQUIRING_LIMITATION"
SCOPE_UNSUPPORTED_ASTROLOGY_CAPABILITY = "UNSUPPORTED_ASTROLOGY_CAPABILITY"
SCOPE_APP_WALLET = "APP_WALLET"

HINDI_SIGNS = {
    "Aries": "मेष", "Taurus": "वृषभ", "Gemini": "मिथुन", "Cancer": "कर्क",
    "Leo": "सिंह", "Virgo": "कन्या", "Libra": "तुला", "Scorpio": "वृश्चिक",
    "Sagittarius": "धनु", "Capricorn": "मकर", "Aquarius": "कुंभ", "Pisces": "मीन"
}

ALL_SCOPES = [
    SCOPE_ASTROLOGY_IN_SCOPE,
    SCOPE_ASTROLOGY_CONCEPTUAL,
    SCOPE_ASTROLOGY_WITH_MISSING_INPUTS,
    SCOPE_FOLLOW_UP_REQUIRING_CONTEXT,
    SCOPE_SOCIAL_CONVERSATION,
    SCOPE_CLARIFICATION_REQUIRED,
    SCOPE_OUT_OF_SCOPE,
    SCOPE_HIGH_STAKES_REQUIRING_LIMITATION,
    SCOPE_UNSUPPORTED_ASTROLOGY_CAPABILITY,
    SCOPE_APP_WALLET
]

# Patterns for High Stakes Safety Boundaries
HIGH_STAKES_PATTERNS = [
    r"\b(suicid|kill myself|end my life|self harm|die now)\b",
    r"\b(stop taking|stop (my )?(\w+\s+)?(medication|pills|chemo|chemotherapy|insulin|treatment|drugs))\b",
    r"\b(chemo|chemotherapy|cure (my )?(cancer|tumor|diabetes|hiv|aids))\b",
    r"\b(invest (all )?(my )?(life savings|entire net worth) in)\b",
    r"\b(murder trial|court verdict|guilty or innocent|jail time)\b"
]

# Patterns for Unsupported Astrological Capabilities
UNSUPPORTED_ASTROLOGY_PATTERNS = [
    r"\b(tarot|tarot card|tarot spread|celtic cross)\b",
    r"\b(tropical zodiac|placidus houses|western astrology)\b",
    r"\b(coffee cup reading|tea leaves|palm reading image|face reading)\b",
    r"\b(chinese zodiac|bazi|four pillars of destiny|feng shui)\b",
    r"\b(mayan calendar|mayan astrology)\b"
]

# Patterns for Non-Astrological Out-of-Scope Queries
OUT_OF_SCOPE_PATTERNS = [
    r"\b(write|create|code|program|build|debug)\s+(me\s+)?(a\s+)?(python|javascript|java|c\+\+|html|css|sql|rust|php|bash|react|script|app|game|bot)\b",
    r"\b(recipe|how to cook|bake|ingredients for|chocolate cake|pasta|pizza)\b",
    r"\b(who won|score of|world cup|football match|cricket match|olympics)\b",
    r"\b(quantum computing|general relativity|theory of relativity|string theory|how does an engine work)\b",
    r"\b(tell me a joke|write a poem about cats|weather in tokyo|translate this to french)\b",
    r"\b(fix my (car|plumbing|toilet|laptop|wifi|printer))\b"
]

# Patterns for Conceptual Astrological Queries
CONCEPTUAL_PATTERNS = [
    r"\bwhat is (ashtakavarga|shadbala|vimshottari|navamsha|dashamsha|panchang|d9|d10|lagna|bhava|trikona|kendra|raja yoga|dhana yoga|sade sati|manglik|kaal sarp)\b",
    r"\bhow does (ashtakavarga|shadbala|vimshottari|dasha|retrograde|gochara|transit) work\b",
    r"\bdifference between (d1 and d9|parashari and jaimini|rashi and navamsha|sayana and nirayana|tropical and sidereal|bav and sav)\b",
    r"\bexplain (the 12 houses|shani sade sati|sade sati|manglik dosha|pancha mahapurusha|chara karaka|upagrahas|planetary horas|raja yoga|dhana yoga)\b",
    r"\bmeaning of (debilitated|exalted|combust|vargottama|atmakaraka)\b",
    r"\b(why is jupiter (considered )?auspicious|importance of jupiter|devaguru brihaspati)\b"
]

# Patterns for Social Greetings and Sign-offs
SOCIAL_PATTERNS = [
    r"^(hi|hello|hey|namaste|namaskar|pranam|pranaam|om namah shivaya|radhe radhe|jai shri krishna|good morning|good afternoon|good evening|good day)(\s+(there|astrologer|guruji|panditji|ji|acharya|acharyaji|sir|madam|dr|devratan|sunita|raghavendra))?[\s\.\!\?]*$",
    r"^(नमस्ते|नमस्कार|प्रणाम|ॐ नमः शिवाय|राधे राधे|जय श्री कृष्ण)(\s+.*)?[\s\.\!\?]*$",
    r"^(thank you|thanks|dhanyawad|shukriya|bye|goodbye|see you|take care)[\s\.\!\?]*$",
    r"^(धन्यवाद|शुक्रिया|अलविदा)[\s\.\!\?]*$",
    r"^(who are you|what can you do|introduce yourself|help)[\s\.\!\?]*$",
    r"^(आप कौन हैं|परिचय दें|मदद)[\s\.\!\?]*$"
]

# Patterns for Contextual Follow-up Messages
FOLLOW_UP_PATTERNS = [
    r"^(when will this happen|when will that happen|when\??|and when\??)[\s\.\!\?]*$",
    r"^(what about (my )?(saturn|jupiter|mars|venus|mercury|sun|moon|rahu|ketu|dasha)\??)[\s\.\!\?]*$",
    r"^(and (for|about) my (partner|spouse|career|job|health|marriage|wealth|finances)\??)[\s\.\!\?]*$",
    r"^(why\??|why do you say that\??|how so\??|tell me more|elaborate on that|can you explain further\??)[\s\.\!\?]*$",
    r"^(any remedies for this\??|what should i do about that\??|can you explain the remedies\??|what remedies\??)[\s\.\!\?]*$"
]

# Patterns for Application Wallet Inquiries (Scenario 9: Distinct from Astrological Wealth)
APP_WALLET_PATTERNS = [
    r"\b(wallet\s+balance|demo\s+credit|app\s+balance|account\s+balance|wallet\s+money)\b",
    r"\bhow\s+much\s+(?:money|balance|credit)\s+(?:do\s+i\s+have|in\s+my\s+wallet|is\s+in\s+my\s+wallet|remains|left)\b",
    r"\bcheck\s+(?:my\s+)?wallet\b",
    r"\bmy\s+wallet\s+balance\b"
]

def classify_user_query(
    query: str,
    session_history: Optional[List[Dict[str, Any]]] = None,
    has_chart: bool = False
) -> Dict[str, Any]:
    """
    Classifies the user query into one of the 9 formal scope states,
    with intent breakdown and required tool dependencies.
    """
    q_clean = (query or "").strip()
    q_lower = q_clean.lower()

    if not q_clean or len(q_clean) == 0:
        return {
            "scope": SCOPE_CLARIFICATION_REQUIRED,
            "intent": "clarification",
            "reason": "Empty query received."
        }

    # 1. High-Stakes Emergency / Safety Limitation
    for pat in HIGH_STAKES_PATTERNS:
        if re.search(pat, q_lower):
            return {
                "scope": SCOPE_HIGH_STAKES_REQUIRING_LIMITATION,
                "intent": "safety_boundary",
                "reason": "Query touches critical medical, legal, crisis, or speculative territory requiring professional human authority."
            }

    # 2. Out-of-Scope (Coding, cooking, sports, non-astrological tasks)
    for pat in OUT_OF_SCOPE_PATTERNS:
        if re.search(pat, q_lower):
            return {
                "scope": SCOPE_OUT_OF_SCOPE,
                "intent": "out_of_scope",
                "reason": "Query requests non-astrological services outside the Vedic Jyotish domain."
            }

    # 3. Unsupported Astrological Capabilities (Tarot, Tropical Placidus, BaZi, etc.)
    for pat in UNSUPPORTED_ASTROLOGY_PATTERNS:
        if re.search(pat, q_lower):
            return {
                "scope": SCOPE_UNSUPPORTED_ASTROLOGY_CAPABILITY,
                "intent": "unsupported_capability",
                "reason": "Query requests non-Vedic or unsupported divination systems."
            }

    # 4. Social Greetings, Courtesies, and Self-Introduction
    for pat in SOCIAL_PATTERNS:
        if re.search(pat, q_lower):
            return {
                "scope": SCOPE_SOCIAL_CONVERSATION,
                "intent": "greeting",
                "reason": "Courteous greeting or social salutation."
            }

    # 4b. Application Wallet & Account Balance Inquiries (Scenario 9)
    for pat in APP_WALLET_PATTERNS:
        if re.search(pat, q_lower):
            return {
                "scope": SCOPE_APP_WALLET,
                "intent": "app_wallet",
                "reason": "Query inquires about AstroVerse application wallet balance and account credits."
            }

    # 5. Follow-Up Requiring Conversational Context
    is_follow_up = False
    for pat in FOLLOW_UP_PATTERNS:
        if re.search(pat, q_lower):
            is_follow_up = True
            break
    
    if is_follow_up or (len(q_clean.split()) <= 4 and session_history and len(session_history) > 0):
        # Resolve topic from prior history
        prior_context = _extract_prior_intent(session_history)
        if prior_context:
            return {
                "scope": SCOPE_FOLLOW_UP_REQUIRING_CONTEXT,
                "intent": prior_context,
                "reason": f"Short follow-up grounded in prior conversation topic '{prior_context}'."
            }

    # 6. Conceptual Astrological Learning & Scriptural Questions
    for pat in CONCEPTUAL_PATTERNS:
        if re.search(pat, q_lower):
            return {
                "scope": SCOPE_ASTROLOGY_CONCEPTUAL,
                "intent": "conceptual",
                "reason": "Inquiry regarding astrological theory, mechanisms, or shastric definitions."
            }

    # If query mentions conceptual questions like "explain", "what is", "difference between"
    if any(q_lower.startswith(prefix) for prefix in ["what is ", "what are ", "explain ", "how does ", "why do we ", "difference between "]) and not any(p in q_lower for p in ["my chart", "my kundli", "my career", "my marriage", "will i", "when will i"]):
        return {
            "scope": SCOPE_ASTROLOGY_CONCEPTUAL,
            "intent": "conceptual",
            "reason": "General astrological concept inquiry."
        }

    # 7. Disambiguation / Clarification Required
    if len(q_clean) < 3 and not q_lower in ["hi", "om"]:
        return {
            "scope": SCOPE_CLARIFICATION_REQUIRED,
            "intent": "clarification",
            "reason": "Query is too brief or ambiguous to determine astrological focus."
        }

    # 8 & 9. Astrology Query (Personal or Chart-Specific)
    intent = _determine_astrological_intent(q_lower)

    if not has_chart:
        return {
            "scope": SCOPE_ASTROLOGY_WITH_MISSING_INPUTS,
            "intent": intent,
            "reason": "Astrological inquiry requires birth details to generate exact Lagna and planetary positions."
        }
    else:
        return {
            "scope": SCOPE_ASTROLOGY_IN_SCOPE,
            "intent": intent,
            "reason": "In-scope astrological inquiry supported by calculated birth chart."
        }


def _determine_astrological_intent(q: str) -> str:
    """Identify domain intent from astrological query."""
    if any(w in q for w in ["career", "job", "profession", "promotion", "business", "work", "10th", "boss", "salary", "office", "interview"]):
        return "career"
    elif any(w in q for w in ["marri", "love", "spouse", "partner", "relationship", "divorce", "7th", "husband", "wife", "synastry", "match"]):
        return "marriage"
    elif any(w in q for w in ["wealth", "money", "finance", "invest", "property", "rich", "2nd house", "11th house", "dhana", "asset"]) and not any(re.search(pat, q) for pat in APP_WALLET_PATTERNS):
        return "wealth"
    elif any(w in q for w in ["health", "disease", "illness", "vitality", "operation", "6th house", "8th house", "recovery", "diet"]):
        return "health"
    elif any(w in q for w in ["remed", "mantra", "gemstone", "gem", "rudraksha", "puja", "fasting", "shanti", "pacify"]):
        return "remedy"
    elif any(w in q for w in ["timing", "when", "dasha", "transit", "gochara", "muhurta", "window", "period", "phase", "year"]):
        return "timing"
    elif any(w in q for w in ["child", "progeny", "pregnancy", "son", "daughter", "5th house"]):
        return "children"
    elif any(w in q for w in ["spiritual", "moksha", "guru", "dharma", "meditation", "9th house", "12th house"]):
        return "spirituality"
    return "general"


def _extract_prior_intent(session_history: Optional[List[Dict[str, Any]]]) -> Optional[str]:
    """Inspect previous turns in session history to identify ongoing topic."""
    if not session_history:
        return None
    for msg in reversed(session_history[-6:]):
        if not isinstance(msg, dict):
            continue
        text = str(msg.get("content", "")).lower()
        if any(w in text for w in ["career", "job", "profession", "promotion", "work"]):
            return "career"
        if any(w in text for w in ["marri", "love", "partner", "relationship", "spouse"]):
            return "marriage"
        if any(w in text for w in ["wealth", "money", "finance", "invest"]):
            return "wealth"
        if any(w in text for w in ["remed", "mantra", "gemstone"]):
            return "remedy"
        if any(w in text for w in ["timing", "dasha", "period", "when"]):
            return "timing"
    return None


def resolve_tool_pipeline_for_intent(intent: str, has_chart: bool) -> List[str]:
    """Identify registered tools to invoke for a given intent."""
    if not has_chart:
        if intent == "timing":
            return ["calculate_horas_24h", "calculate_panchang"]
        return ["calculate_horas_24h"]
    
    mapping = {
        "career": ["calculate_kundli_d1", "calculate_dashamsha_d10", "calculate_vimshottari_dasha", "identify_planetary_yogas"],
        "marriage": ["calculate_kundli_d1", "calculate_navamsha_d9", "calculate_vimshottari_dasha", "analyze_doshas_and_remedies"],
        "wealth": ["calculate_kundli_d1", "calculate_vimshottari_dasha", "identify_planetary_yogas", "calculate_ashtakavarga"],
        "remedy": ["calculate_kundli_d1", "analyze_doshas_and_remedies", "calculate_shadbala"],
        "timing": ["calculate_kundli_d1", "calculate_vimshottari_dasha", "calculate_horas_24h"],
        "health": ["calculate_kundli_d1", "calculate_shadbala", "calculate_vimshottari_dasha"],
        "conceptual": ["search_classical_knowledge"],
        "general": ["calculate_kundli_d1", "calculate_vimshottari_dasha"]
    }
    return mapping.get(intent, ["calculate_kundli_d1"])


def generate_scope_grounded_response(
    classification: Dict[str, Any],
    query: str,
    kundli: Optional[dict] = None,
    dasha: Optional[dict] = None,
    doshas: Optional[dict] = None,
    astrologer_name: Optional[str] = None,
    lang: Optional[str] = "en"
) -> Dict[str, Any]:
    """
    Produces deterministic, scope-compliant astrological responses:
    - Out-of-scope: polite refusal without hallucinating astrology
    - High-stakes: safety disclaimer + referral
    - Conceptual: comprehensive shastric explanation
    - In-scope: strict chart grounding (no hardcoded Taurus Lagna defaults)
    """
    scope = classification["scope"]
    intent = classification["intent"]
    astro = (astrologer_name or "").lower()

    # Determine persona metadata
    if "shastri" in astro or "sunita" in astro:
        persona_id = "dr-sunita-shastri"
        persona_display = "Dr. Sunita Shastri"
        persona_role = "Relationship, D9 Navamsha & Jaimini Specialist"
        greeting_salutation = "Namaste!"
    elif "raghavendra" in astro or "pandit" in astro:
        persona_id = "pandit-raghavendra"
        persona_display = "Pandit Raghavendra"
        persona_role = "Classical Parashari, Vedic Remedies & Textual Jyotish"
        greeting_salutation = "Om Namah Shivaya!"
    else:
        persona_id = "acharya-devratan"
        persona_display = "Acharya Devratan"
        persona_role = "Career Architecture, Dhana Yogas & Parashari Strategy"
        greeting_salutation = "Pranam!"

    # 1. OUT OF SCOPE
    if scope == SCOPE_OUT_OF_SCOPE:
        message = (
            f"{greeting_salutation} I am {persona_display}, {persona_role} at AstroVerse.\n\n"
            f"### Domain Scope Notice\n"
            f"My expertise is dedicated specifically to classical Vedic Jyotish (Parashari, Jaimini, and traditional astronomical calculations). "
            f"I cannot write programming code, provide culinary recipes, answer general trivia, or perform non-astrological technical tasks.\n\n"
            f"### How I Can Guide You\n"
            f"I am ready to examine your Vedic astrological questions, including:\n"
            f"- **Career & Professional Authority:** 10th House analysis, D10 Dashamsha, and promotion timing.\n"
            f"- **Relationships & Synastry:** 7th House Kalatra evaluation and D9 Navamsha dynamics.\n"
            f"- **Dhana Yogas & Prosperity:** 2nd and 11th House financial compounding.\n"
            f"- **Karmic Timing & Remedies:** Active Vimshottari Dasha subperiods and traditional mantras.\n\n"
            f"Please let me know how you would like to explore your astrological path."
        )
        return {
            "status": "completed",
            "scope": scope,
            "intent": intent,
            "message": message,
            "chartEvidence": [],
            "relatedInsights": [],
            "suggestedQuestions": [
                "Analyze my 10th House of Career and active Dasha",
                "What does my chart indicate regarding marriage timing?",
                "Which planetary transits are influencing my finances?",
                "Explain the principles of Shani Sade Sati"
            ],
            "remedyCard": None
        }

    # 2. HIGH STAKES / CRISIS / MEDICAL / LEGAL
    if scope == SCOPE_HIGH_STAKES_REQUIRING_LIMITATION:
        message = (
            f"{greeting_salutation} I am {persona_display}.\n\n"
            f"### Ethical Boundary & Safety Advisory\n"
            f"Your inquiry touches on critical life safety, medical treatment, legal proceedings, or severe personal distress. "
            f"Classical Vedic Jyotish is a spiritual, symbolic, and contemplative discipline designed for inner mindfulness and self-reflection. "
            f"**It is never a substitute for licensed medical care, psychiatric assistance, legal representation, or certified financial advisory.**\n\n"
            f"### Immediate Action Recommendations\n"
            f"- **Medical or Psychological Support:** If you or a loved one are experiencing acute distress or thoughts of self-harm, please contact emergency healthcare services or a mental health helpline (such as Tele-MANAS at 14416 in India, or 988 in the US/Canada) immediately.\n"
            f"- **Legal & Financial Matters:** Consult certified attorneys or licensed financial fiduciaries for legal disputes or irreversible capital commitments.\n\n"
            f"May you find peace, clarity, and the appropriate earthly support."
        )
        return {
            "status": "completed",
            "scope": scope,
            "intent": intent,
            "message": message,
            "chartEvidence": [],
            "relatedInsights": [],
            "suggestedQuestions": [
                "What traditional mantras promote mental peace and tranquility?",
                "How does Vedic astrology conceptualize karmic discipline?",
                "Analyze my general Lagna strengths for personal resilience"
            ],
            "remedyCard": {
                "title": "Vedic Peace & Mental Serenity (Shanti Path)",
                "mantra": "Om Shanti Shanti Shanti (Chant with slow, centered breathing)",
                "gemstone_note": "Focus on grounded mindfulness practices rather than external talismans.",
                "charity_practice": "Practice selfless service and gentle acts of kindness toward living beings.",
                "disclaimer": "Traditional spiritual practices nurture inner peace; they are not medical interventions."
            }
        }

    # 3. UNSUPPORTED CAPABILITY (Tarot, Tropical Placidus, BaZi)
    if scope == SCOPE_UNSUPPORTED_ASTROLOGY_CAPABILITY:
        message = (
            f"{greeting_salutation} I am {persona_display}.\n\n"
            f"### Vedic Sidereal Tradition Notice\n"
            f"AstroVerse is founded strictly upon the **Vedic Sidereal (Nirayana) Jyotish** tradition using the authoritative **Chitrapaksha (Lahiri) Ayanamsha** and Parashari/Jaimini methodology.\n\n"
            f"We do not practice Western Tropical astrology (Placidus house system), Tarot card divinations, Chinese BaZi, or psychic mediumship. In Vedic doctrine, accurate cosmic insight is derived from exact mathematical astronomical ephemerides, 27 Nakshatras, 16 Divisional Vargas, and the Vimshottari Dasha system.\n\n"
            f"### Equivalent Vedic Capabilities Available in AstroVerse\n"
            f"- Rather than Tarot synastry: We calculate **D9 Navamsha synastry** and **Ashtakoota 36-Guna matching**.\n"
            f"- Rather than Western Tropical transits: We compute **Sidereal Nirayana Gochara transits** and **Ashtakavarga Bindu strength**.\n"
            f"- Rather than horary cards: We provide classical **Prashna Kundli** and **24-Hour Planetary Horas**."
        )
        return {
            "status": "completed",
            "scope": scope,
            "intent": intent,
            "message": message,
            "chartEvidence": [],
            "relatedInsights": [],
            "suggestedQuestions": [
                "Explain the difference between Vedic Sidereal and Western Tropical astrology",
                "How does D9 Navamsha evaluate relationship harmony?",
                "What is the significance of the Lahiri Ayanamsha in Jyotish?"
            ],
            "remedyCard": None
        }

    # 4. ASTROLOGY CONCEPTUAL LEARNING
    if scope == SCOPE_ASTROLOGY_CONCEPTUAL:
        from classical_knowledge import search_classical_knowledge
        shastra_snippets = search_classical_knowledge(query, limit=2)
        shastra_text = ""
        if shastra_snippets:
            first_snip = shastra_snippets[0]
            shastra_text = f"\n\n### Classical Shastric Reference\n> *\"{first_snip.get('translation', first_snip.get('text', ''))}\"*\n> — **{first_snip.get('source', 'Brihat Parashara Hora Shastra')}**, Chapter {first_snip.get('chapter', '1')}"

        if "ashtakavarga" in query.lower():
            explanation = (
                "### The Ashtakavarga System in Parashari Jyotish\n"
                "**Ashtakavarga** ('Eight-Fold Division') is one of the most objective quantitative evaluation tools in Vedic astrology. "
                "Synthesized by Sage Parashara, it measures the inherent benefic strength of each of the 12 signs by aggregating auspicious dots (*Bindus*) contributed by 7 physical Grahas (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) plus the Ascendant (Lagna).\n\n"
                "#### Key Components\n"
                "1. **Bhinnashtakavarga (BAV):** The individual Ashtakavarga table for each specific planet, showing how many points (0 to 8) that planet contributes to each of the 12 signs.\n"
                "2. **Sarvashtakavarga (SAV):** The composite sum of all 8 contributors across each sign (totaling 337 Bindus). Signs with **28 or more Bindus** are considered strong and supportive of positive transit outcomes; signs with fewer than 25 Bindus indicate areas requiring caution and disciplined perseverance.\n\n"
                "#### How Transits (Gochara) Interact with Ashtakavarga\n"
                "Even a naturally malefic planet like Saturn confers productive results when transiting a house blessed with high SAV Bindus (e.g., 30+ Bindus), whereas a benefic like Jupiter may struggle to deliver full blessings in a sign with depleted Bindus."
            )
        elif "d9" in query.lower() or "navamsha" in query.lower():
            explanation = (
                "### The D9 Navamsha Divisional Chart\n"
                "In Vedic astrology, the **D9 Navamsha** is revered as the spiritual companion and confirmation chart to the primary D1 Rashi chart. Each zodiac sign (30°) is divided into 9 equal harmonic segments of 3°20' (one Nakshatra Pada).\n\n"
                "#### Core Functions of Navamsha\n"
                "1. **Confirming Planetary Dignity (*Phala*):** A planet appearing exalted in D1 but falling into debilitation in D9 loses its real-world efficacy. Conversely, a planet debilitated in D1 that gains exaltation in D9 experiences *Neecha Bhanga* and spiritual elevation.\n"
                "2. **Marital Synastry & Partner Destiny:** Governs the inner psychic nature of the spouse, the psychological harmony of the marriage, and long-term domestic covenant.\n"
                "3. **Second Half of Life (Dharma):** Shows the evolution of consciousness and destiny maturation after age 32–36."
            )
        elif "shadbala" in query.lower():
            explanation = (
                "### Shadbala: Six-Fold Planetary Strength\n"
                "**Shadbala** is the mathematical measurement of a planet's actual power to deliver its promises, quantified in Rupas and Virupas. The six constituent strengths are:\n\n"
                "1. **Sthanabala (Positional):** Exaltation, Moolatrikona, friendly sign, and divisional varga placements.\n"
                "2. **Digbala (Directional):** Jupiter/Mercury in 1st house (East), Sun/Mars in 10th (South), Saturn in 7th (West), Venus/Moon in 4th (North).\n"
                "3. **Kaalabala (Temporal):** Day/night birth, lunar phase, planetary hora, and seasonal strength.\n"
                "4. **Cheshtabala (Motional):** Strength derived from retrogradation, speed, and planetary war victory.\n"
                "5. **Naisargikabala (Natural):** Intrinsic luminosity (Sun > Moon > Venus > Jupiter > Mercury > Mars > Saturn).\n"
                "6. **Drikbala (Aspectual):** Auspicious vs challenging aspectual rays received from other planets."
            )
        elif "sade sati" in query.lower():
            explanation = (
                "### Shani Sade Sati: The 7.5-Year Karmic Transit of Saturn\n"
                "In Vedic astrology, **Shani Sade Sati** ('Seven and a Half') refers to the transit of Saturn (*Shani Bhagavan*) through the three zodiac signs encompassing your natal Moon:\n\n"
                "1. **Rising Phase (12th House from Moon):** Expenditure, recalibration of priorities, and internal introspection.\n"
                "2. **Peak Phase (1st House / Natal Moon Sign):** Direct emotional testing, psychological maturation, and assumption of heavy responsibilities.\n"
                "3. **Setting Phase (2nd House from Moon):** Family responsibilities, financial restructuring, and consolidation of enduring wisdom.\n\n"
                "#### Classical Scriptural Understanding\n"
                "Sage Parashara emphasizes that Saturn is not an arbitrary punisher, but the *Karmaphala Data* (dispenser of karmic justice). "
                "Saturn strips away illusions, ego, and impatience to forge enduring inner strength. "
                "If your natal Moon or transited houses hold high **Ashtakavarga Bindus (28+)** or receive benefic aspects from Jupiter, Sade Sati often brings career elevation, public authority, and institutional stability rather than mere hardship."
            )
        elif "manglik" in query.lower() or "kuja" in query.lower():
            explanation = (
                "### Manglik Dosha (Kuja Dosha) in Vedic Astrology\n"
                "**Manglik Dosha** occurs when Mars (*Mangala*) occupies the 1st (Lagna), 4th, 7th, 8th, or 12th house in the natal Rashi chart. "
                "Because Mars represents intense fiery energy, assertiveness, and courage, its aspect upon the 7th House of partnership can manifest as interpersonal friction or impetuous decision-making if not tempered.\n\n"
                "#### Classical Cancellation Rules (Kuja Dosha Bhanga)\n"
                "Classical scriptures enumerate widespread exceptions where Manglik Dosha is neutralized:\n"
                "1. **Dignity of Mars:** Mars in its own signs (Aries, Scorpio) or exaltation (Capricorn) causes no affliction.\n"
                "2. **Benefic Aspects:** When Jupiter aspects Mars or the 7th house, the dosha is nullified.\n"
                "3. **Reciprocal Alignment:** When both partners possess Manglik placements, the fiery energies harmonize.\n"
                "4. **Maturity:** Parashari tradition notes that the acute volatility of Kuja Dosha softens significantly after age 28 as emotional maturity deepens."
            )
        elif "jupiter" in query.lower() and ("auspicious" in query.lower() or "benefic" in query.lower() or "guru" in query.lower() or "devaguru" in query.lower() or "why" in query.lower()):
            explanation = (
                "### Why Jupiter (Guru) is Considered the Supreme Benefic in Vedic Astrology\n"
                "In classical Vedic Jyotish, **Jupiter (*Devaguru Brihaspati*)** is revered as the greatest natural benefic (*Purna Shubha Graha*). "
                "Sage Parashara accords Jupiter paramount status for several foundational reasons:\n\n"
                "1. **Karaka of Higher Wisdom & Dharma:** Jupiter signifies divine grace, righteous conduct (*Dharma*), spiritual truth, and higher learning.\n"
                "2. **The Amrita Drishti (Nectarous Aspects):** While other planets cast aspects (7th house), Jupiter uniquely casts special 5th and 9th trine aspects (*Trikona Drishti*). Classical texts state that Jupiter's aspect acts like *Amrita* (nectar), revitalizing and shielding any house or planet it touches from destruction.\n"
                "3. **Significator of Progeny & Prosperity:** As the primary *Karaka* for children (5th house) and accumulated wealth (2nd and 11th houses), Jupiter bestows sustainable expansion rather than volatile spikes.\n"
                "4. **Preserver of Marital Harmony:** For individuals seeking long-term domestic peace, Jupiter represents noble character, forgiveness, and moral integrity."
            )
        elif "raja yoga" in query.lower() or "dhana yoga" in query.lower():
            explanation = (
                "### Raja Yogas and Dhana Yogas in Parashari Jyotish\n"
                "In *Brihat Parashara Hora Shastra*, planetary yogas represent geometric planetary covenants that elevate an individual's destiny.\n\n"
                "#### 1. Raja Yogas (Combinations for Authority and Honor)\n"
                "- Formed through the conjunction, mutual aspect, or sign exchange between the lord of a **Kendra (1st, 4th, 7th, 10th - Vishnu Sthanas)** and the lord of a **Trikona (1st, 5th, 9th - Lakshmi Sthanas)**.\n"
                "- When Vishnu (effort/action) unites with Lakshmi (grace/fortune), supreme public authority, executive leadership, and societal respect manifest during the operating Dasha.\n\n"
                "#### 2. Dhana Yogas (Combinations for Wealth Compounding)\n"
                "- Formed by relationships between the **1st house** (self), **2nd house** (accumulated capital), **5th house** (intellect/speculation), **9th house** (divine fortune), and **11th house** (recurring gains).\n"
                "- When the 2nd and 11th lords connect with 5th or 9th lords, the native enjoys compounding prosperity and financial independence."
            )
        else:
            explanation = (
                f"### Vedic Astrological Foundation\n"
                f"In the classical tradition of Sage Parashara (*Brihat Parashara Hora Shastra*), Vedic astrology evaluates destiny through three interdependent pillars:\n"
                f"1. **Bhava (House Geometries):** The 12 houses map the entirety of human existence from vitality (1st) to spiritual liberation (12th).\n"
                f"2. **Graha (Planetary Archetypes):** The 9 celestial lenses that focus karmic potentials through dignity, aspects, and friendship.\n"
                f"3. **Dasha (Karmic Timing):** The Vimshottari cycle that unlocks specific natal potentials when their allotted planetary season arrives."
            )

        message = (
            f"{greeting_salutation} I am {persona_display}.\n\n"
            f"{explanation}"
            f"{shastra_text}\n\n"
            f"Would you like to examine how these principles apply directly to your personal chart coordinates?"
        )
        return {
            "status": "completed",
            "scope": scope,
            "intent": intent,
            "message": message,
            "chartEvidence": [],
            "relatedInsights": [],
            "suggestedQuestions": [
                "Calculate my personal Ashtakavarga Bindu scores",
                "How does my D9 Navamsha modify my Lagna promises?",
                "What are my strongest planets according to Shadbala?",
                "Explain the active Vimshottari Dasha for my chart"
            ],
            "remedyCard": None
        }

    # 4b. APPLICATION WALLET & ACCOUNT INQUIRY (Scenario 9)
    if scope == SCOPE_APP_WALLET:
        message = (
            f"{greeting_salutation} I am {persona_display}.\n\n"
            f"### AstroVerse Account & Wallet Balance\n"
            f"You can view your real account balance, review past transaction ledger entries, or top up test credits directly in the **Wallet Section**.\n\n"
            f"- **Live Account Ledger:** Real money wallet balance and recharge statements.\n"
            f"- **Demo Credit Wallet:** Sandbox credits for testing and previewing full astrological reports.\n\n"
            f"To access your wallet, click the Wallet balance chip in the top navigation bar or visit your Account Dashboard.\n\n"
            f"If you have an astrological question regarding financial prospects or wealth compounding in your birth chart (2nd House of liquid wealth, 11th House of gains, or Jupiter's aspect), feel free to ask!"
        )
        return {
            "status": "completed",
            "scope": scope,
            "intent": intent,
            "message": message,
            "chartEvidence": [],
            "relatedInsights": [],
            "suggestedQuestions": [
                "Which planets form Dhana Yogas in my chart?",
                "Analyze my 2nd and 11th house financial axis",
                "How do I add demo credits for testing?",
                "What are the subscription benefits for AI chat?"
            ],
            "remedyCard": None
        }

    # 4c. SOCIAL GREETING & INTRODUCTIONS (Warm, courteous welcome; never dumps 10th house career analysis)
    if scope == SCOPE_SOCIAL_CONVERSATION or intent == "greeting":
        is_hi = bool(lang and lang.lower().startswith("hi")) or bool(re.search(r"[\u0900-\u097F]", query))
        lagna_s = kundli.get("lagna", {}).get("sign", "") if kundli else ""
        moon_s = kundli.get("planets", {}).get("Moon", {}).get("sign", "") if kundli else ""
        has_chart_grounded = bool(kundli and lagna_s and moon_s)

        if is_hi:
            lagna_s = HINDI_SIGNS.get(lagna_s, lagna_s)
            moon_s = HINDI_SIGNS.get(moon_s, moon_s)
            if persona_id == "dr-sunita-shastri":
                if has_chart_grounded:
                    chart_note = f"\n\n*(आपकी जन्म कुंडली — **{lagna_s} लग्न**, **{moon_s} चंद्र राशि** — संबंध व मुहूर्त विश्लेषण हेतु तैयार है।)*"
                else:
                    chart_note = "\n\n*(वर्तमान में सार्वभौमिक गोचर मोड सक्रिय है। व्यक्तिगत कुंडली मिलान और सूक्ष्म समय विश्लेषण हेतु जन्म कुंडली लिंक कर सकते हैं।)*"
                message = (
                    f"नमस्ते! मैं डॉ. सुनीता शास्त्री हूँ, दांपत्य समन्वय, नवमांश (D9) व जैमिनी ज्योतिष विशेषज्ञ।\n\n"
                    f"AstroVerse में आपका स्वागत है। संबंध और आंतरिक सामंजस्य हमारे जीवन के सबसे महत्वपूर्ण आधार हैं। "
                    f"चाहे आप विवाह के मुहूर्त, जीवनसाथी के साथ सामंजस्य, या नवमांश अनुकूलता के बारे में जानना चाहते हों, "
                    f"मैं सहानुभूति और प्रामाणिक शास्त्रीय दृष्टिकोण के साथ आपका मार्गदर्शन करने के लिए उपस्थित हूँ।{chart_note}\n\n"
                    f"आज आपके मन में संबंध या कुंडली से जुड़ा कौन सा प्रश्न है?"
                )
                suggested = [
                    "विवाह और मांगलिक कार्यों हेतु अनुकूल समय खिड़की कब है?",
                    "सप्तम भाव से जीवनसाथी के स्वभाव के बारे में क्या संकेत मिलते हैं?",
                    "D9 नवमांश कुंडली वैवाहिक सामंजस्य को कैसे प्रभावित करती है?",
                    "संबंधों में सौहार्द व शांति हेतु शास्त्रीय उपाय क्या हैं?"
                ]
            elif persona_id == "pandit-raghavendra":
                if has_chart_grounded:
                    chart_note = f"\n\n*(आपकी जन्म कुंडली — **{lagna_s} लग्न**, **{moon_s} चंद्र राशि** — वैदिक शांति उपायों हेतु तैयार है।)*"
                else:
                    chart_note = "\n\n*(वर्तमान में सार्वभौमिक गोचर मोड सक्रिय है। व्यक्तिगत दोष शांति और रत्न परामर्श हेतु जन्म कुंडली बनाएं।)*"
                message = (
                    f"ॐ नमः शिवाय! मैं पंडित राघवेंद्र हूँ, शास्त्रीय पराशरी, वैदिक शांति उपाय व प्रामाणिक मंत्र ज्योतिष का साधक।\n\n"
                    f"शुभ आशीर्वाद। प्राचीन ऋषियों का वचन है कि ग्रहीय गोचर हमारे संचित प्रारब्ध को प्रकट करते हैं, "
                    f"तथा नित्य प्रार्थना, स्तोत्र पाठ और सात्विक दान हमें हर कालखंड में आत्मिक शांति और धैर्य प्रदान करते हैं।{chart_note}\n\n"
                    f"आज आप किस आध्यात्मिक प्रश्न या पारंपरिक वैदिक उपाय पर मार्गदर्शन चाहते हैं?"
                )
                suggested = [
                    "वैदिक शांति उपायों और मंत्र साधना का शास्त्रीय आधार क्या है?",
                    "मेरी साढ़ेसाती और शनि गोचर की वर्तमान स्थिति बताएं",
                    "मेरे लग्नेश को बलवान करने वाले वैदिक मंत्र कौन से हैं?",
                    "ग्रह शांति और मानसिक स्थिरता हेतु पारंपरिक नियम क्या हैं?"
                ]
            else:
                if has_chart_grounded:
                    chart_note = f"\n\n*(आपकी जन्म कुंडली — **{lagna_s} लग्न**, **{moon_s} चंद्र राशि** — करियर और धन योगों के विश्लेषण हेतु तैयार है।)*"
                else:
                    chart_note = "\n\n*(वर्तमान में सार्वभौमिक गोचर मोड सक्रिय है। अपने सटीक लग्न और विंशोत्तरी दशा के अनुसार परामर्श हेतु किसी भी समय जन्म कुंडली लिंक कर सकते हैं।)*"
                message = (
                    f"प्रणाम! मैं आचार्य देवरात्न हूँ, शास्त्रीय पराशरी ज्योतिष, करियर मार्गदर्शन और रणनीतिक जीवन निर्णयों का विशेषज्ञ।\n\n"
                    f"AstroVerse में आपका स्वागत है। वैदिक ज्योतिष आपके धर्म, सामर्थ्य और कर्म के अनुकूल समय को प्रकाशित करने वाला पावन विज्ञान है। "
                    f"चाहे आप अपने करियर की दिशा, धन संचय के योग, या सामान्य ज्योतिषीय सिद्धांतों के विषय में मार्गदर्शन चाहते हों, "
                    f"मैं पूर्ण प्रामाणिकता और स्पष्टता से आपका मार्गदर्शन करने के लिए उपस्थित हूँ।{chart_note}\n\n"
                    f"आज मैं आपके जीवन पथ में किस प्रकार सहायता कर सकता हूँ?"
                )
                suggested = [
                    "मेरे दशम भाव (करियर) और पदोन्नति का समय बताएं",
                    "मेरे धन योगों और वित्तीय संचय का विश्लेषण करें",
                    "विंशोत्तरी महादशा जीवन के निर्णयों को कैसे प्रभावित करती है?",
                    "मेरे करियर और प्रगति को बल देने वाले वैदिक उपाय क्या हैं?"
                ]
        else:
            if persona_id == "dr-sunita-shastri":
                if has_chart_grounded:
                    chart_note = f"\n\n*(Your natal chart — **{lagna_s} Lagna**, Moon in **{moon_s}** — is loaded and ready whenever you wish to evaluate relationship timing or synastry.)*"
                else:
                    chart_note = "\n\n*(We are in universal transit mode. You can link your birth chart anytime to unlock personalized synastry and timing.)*"
                message = (
                    f"{greeting_salutation} I am {persona_display}, specializing in Jaimini astrology, relationship synastry, and D9 Navamsha harmony.\n\n"
                    f"Welcome to AstroVerse. Relationships and emotional harmony are central pillars of our life experience. "
                    f"Whether you are seeking clarity on partnership compatibility, marriage timing, family dynamics, or personal healing, "
                    f"I am here to explore your path with thoughtful empathy and analytical rigor.{chart_note}\n\n"
                    f"What relationship question or personal milestone is on your heart today?"
                )
                suggested = [
                    "When is an auspicious timing window for marriage?",
                    "What does my 7th house reveal about my partner?",
                    "How does D9 Navamsha support relationship harmony?",
                    "What classical practices bring peace to partnerships?"
                ]
            elif persona_id == "pandit-raghavendra":
                if has_chart_grounded:
                    chart_note = f"\n\n*(Your natal coordinates — **{lagna_s} Lagna**, Moon in **{moon_s}** — are verified for remedial and transit assessment.)*"
                else:
                    chart_note = "\n\n*(Operating in universal transit mode. Calculate your Janam Kundli whenever you wish to examine personalized doshas and gemstone suitability.)*"
                message = (
                    f"{greeting_salutation} I am {persona_display}, dedicated to classical Parashari scriptures, remedial Jyotish, and sacred Vedic mantras.\n\n"
                    f"Peace and auspicious blessings. The ancient rishis taught that planetary transits bring karmic lessons (*Prarabdha*), "
                    f"while disciplined prayer, sacred stotras, and selfless charity provide the spiritual fortitude to navigate all seasons with wisdom and serenity.{chart_note}\n\n"
                    f"What karmic inquiry, spiritual question, or traditional remedy would you like to explore today?"
                )
                suggested = [
                    "What is the classical scriptural basis for Vedic remedies?",
                    "Evaluate my Sade Sati and Saturn transit status",
                    "Which mantras harmonize my Lagna lord?",
                    "Explain traditional spiritual practices for planetary peace"
                ]
            else:
                if has_chart_grounded:
                    chart_note = f"\n\n*(Your calculated chart — **{lagna_s} Lagna**, Moon in **{moon_s}** — is loaded and ready whenever you wish to examine personal transits or dasha timings.)*"
                else:
                    chart_note = "\n\n*(Operating in universal transit mode. You can calculate your Janam Kundli anytime to ground our consultation in your exact natal Lagna and Vimshottari Dasha.)*"
                message = (
                    f"{greeting_salutation} I am {persona_display}, specializing in classical Parashari Jyotish, career architecture, and strategic life decisions.\n\n"
                    f"Welcome to AstroVerse. Vedic astrology is a profound sacred science designed to illuminate your dharma, timings of opportunity, and inner potential. "
                    f"Whether you seek strategic guidance on your career, insights into wealth compounding, or general astrological principles, I am here to guide you with clarity and scriptural integrity.{chart_note}\n\n"
                    f"How may I assist your astrological journey today?"
                )
                suggested = [
                    "Analyze my 10th House of Career & promotion timing",
                    "What does my chart reveal regarding Dhana Yogas?",
                    "How does Vimshottari Dasha influence life timing?",
                    "What gemstones or Vedic practices support my path?"
                ]
        return {
            "status": "completed",
            "scope": SCOPE_SOCIAL_CONVERSATION,
            "intent": "greeting",
            "message": message,
            "chartEvidence": [],
            "relatedInsights": [],
            "suggestedQuestions": suggested,
            "remedyCard": None
        }

    # 5. ASTROLOGY WITH MISSING INPUTS (Unpersonalized Universal Transit Mode)
    if scope == SCOPE_ASTROLOGY_WITH_MISSING_INPUTS or not kundli:
        message = (
            f"{greeting_salutation} I am {persona_display}, {persona_role}.\n\n"
            f"### Operating in Universal Transit Mode (Unpersonalized)\n"
            f"I have received your inquiry regarding **{intent.title()}**. Currently, no calculated birth chart is loaded into our session.\n\n"
            f"In classical Vedic Jyotish, accurate predictions require the exact **Date of Birth, Time of Birth, and Place of Birth** to establish your **Ascendant (Lagna)**, Moon Nakshatra, and active Vimshottari Dasha cycle. Without these coordinates, individual house lordships cannot be determined.\n\n"
            f"### Current Universal Planetary Climate\n"
            f"- **Saturn:** Transiting sidereal Aquarius / Pisces, encouraging structural discipline and deliberate patience.\n"
            f"- **Jupiter:** Transiting sidereal Taurus, illuminating institutional growth, wisdom, and measured financial consolidation.\n"
            f"- **Rahu-Ketu Axis:** Transiting sidereal Pisces-Virgo, prompting discernment between spiritual ideals and practical details.\n\n"
            f"To unlock personalized analysis with exact house lordships and planetary insights, please calculate your Kundli or select a saved profile."
        )
        return {
            "status": "completed",
            "scope": SCOPE_ASTROLOGY_WITH_MISSING_INPUTS,
            "intent": intent,
            "message": message,
            "chartEvidence": [],
            "relatedInsights": [],
            "suggestedQuestions": [
                "How do I calculate my birth chart (Kundli)?",
                "What is the significance of the Ascendant (Lagna)?",
                "Explain the general transit influence of Saturn this year"
            ],
            "remedyCard": None
        }

    # 6. IN-SCOPE & FOLLOW-UP (STRICTLY GROUNDED IN AUTHORITATIVE NATAL CHART)
    # Extract Real Chart Values (Never hardcode defaults)
    lagna_info = kundli.get("lagna", {})
    lagna_sign = lagna_info.get("sign", "Aries")
    lagna_deg = float(lagna_info.get("degree", 0.0))
    
    planets = kundli.get("planets", {})
    moon_info = planets.get("Moon", {})
    moon_sign = moon_info.get("sign", "Unknown")
    moon_nak = moon_info.get("nakshatra", "Unknown")
    
    dasha_active = dasha.get("active_now", {}) if dasha else {}
    dasha_maha = dasha_active.get("maha_dasha", "Active Cycle")
    dasha_antar = dasha_active.get("antar_dasha", "Current Sub-period")
    
    sadesati_phase = doshas.get("sade_sati", {}).get("phase", "Transit Analysis") if doshas else "Transit Analysis"
    manglik_verdict = doshas.get("manglik", {}).get("verdict", "No Manglik Dosha Present") if doshas else "No Manglik Dosha Present"

    # Assemble Chart Evidence Array
    chart_evidence = [
        {
            "factor": "Natal Ascendant (Lagna)",
            "placement": f"{lagna_sign} ({lagna_deg:.2f}°)",
            "interpretation": f"Establishes {lagna_sign} as the 1st House foundation of life trajectory, physical temperament, and primary focus."
        },
        {
            "factor": "Natal Moon (Chandra)",
            "placement": f"{moon_sign} ({moon_nak} Nakshatra)",
            "interpretation": "Mental baseline, instinctual reactions, and emotional decision-making framework."
        },
        {
            "factor": "Active Vimshottari Dasha",
            "placement": f"{dasha_maha} Mahadasha / {dasha_antar} Antardasha",
            "interpretation": "Primary planetary rulership driving current circumstances and karmic timing."
        }
    ]

    # Assemble Related Insights (Planetary Insight Cards strictly from real planets)
    related_insights: List[Dict[str, Any]] = []
    
    def add_planet_card(planet_name: str, fallback_significance: str):
        p_data = planets.get(planet_name)
        if p_data and isinstance(p_data, dict):
            p_sign = p_data.get("sign")
            p_house = p_data.get("house")
            p_deg = p_data.get("degree")
            if p_sign and p_house is not None:
                deg_str = f"{float(p_deg):.2f}°" if p_deg is not None else ""
                related_insights.append({
                    "planet": planet_name,
                    "sign": p_sign,
                    "house": p_house,
                    "degree": deg_str,
                    "significance": fallback_significance
                })

    if intent in ["career", "general"]:
        add_planet_card("Jupiter", "Natural Karaka of wisdom, executive guidance, and expansion.")
        add_planet_card("Saturn", "Lord of perseverance, discipline, and sustained professional foundations.")
    elif intent == "marriage":
        add_planet_card("Venus", "Significator of marital harmony, aesthetic connection, and partnership diplomacy.")
        add_planet_card("Jupiter", "Protector of marital ethics, family blessings, and long-term stability.")
    elif intent == "wealth":
        add_planet_card("Mercury", "Significator of commercial trade, analytical discernment, and liquid transactions.")
        add_planet_card("Jupiter", "Dhana Karaka conferring capital compounding and ethical abundance.")
    elif intent in ["remedy", "health"]:
        add_planet_card("Sun", "Source of vital prana, self-confidence, and physical vitality.")
        add_planet_card("Saturn", "Karmic balancing agent requiring structured routine and humility.")
    else:
        add_planet_card("Jupiter", "Guiding benefic influence.")

    # Persona-specific responses
    remedy_card = None

    if intent == "greeting" or scope == SCOPE_SOCIAL_CONVERSATION:
        if persona_id == "dr-sunita-shastri":
            message = (
                f"{greeting_salutation} I am {persona_display}.\n\n"
                f"I am attuned to your calculated chart: **{lagna_sign} Lagna**, Moon in **{moon_sign}** ({moon_nak} Nakshatra), "
                f"with active **{dasha_maha}-{dasha_antar} Dasha**.\n\n"
                f"### Relational & Emotional Geometry\n"
                f"Under your {lagna_sign} Ascendant, your interpersonal relationships and inner emotional core are guided by lunar {moon_sign}. "
                f"Whether you are seeking clarity on partnership compatibility, D9 Navamsha harmony, family understanding, or emotional healing, "
                f"I am here to explore your chart with deep empathy and scientific care.\n\n"
                f"What relationship inquiry or personal milestone would you like to explore today?"
            )
            suggested = [
                "When is an auspicious timing window for marriage?",
                "What does my 7th house reveal about my partner?",
                "How does D9 Navamsha support relationship harmony?",
                "What remedies bring peace in partnerships?"
            ]
        elif persona_id == "pandit-raghavendra":
            message = (
                f"{greeting_salutation} I am {persona_display}.\n\n"
                f"I have reviewed your sacred natal planetary coordinates: **{lagna_sign} Lagna** with Moon in **{moon_sign}** ({moon_nak} Nakshatra). "
                f"You are currently navigating your **{dasha_maha}-{dasha_antar}** Dasha, with Saturn transit status in **{sadesati_phase}**.\n\n"
                f"### Classical Shastra Foundation\n"
                f"In the sacred teachings of Sage Parashara, planetary cycles represent opportunities for spiritual refinement (*Sadhana*). "
                f"Scriptural mantras, disciplined fasting, and humble charity grant spiritual fortitude to navigate all karmic seasons.\n\n"
                f"What karmic inquiry, scriptural clarification, or traditional remedy would you like to explore?"
            )
            suggested = [
                "What classical remedies are prescribed for my active Dasha?",
                "Evaluate my Sade Sati and Saturn transit status",
                "Which gemstone fortifies my functional Lagna Lord?",
                "Explain traditional practices for mental peace"
            ]
        else:
            message = (
                f"{greeting_salutation} I am {persona_display}, specializing in classical Parashari Jyotish, career architecture, and strategic life decisions.\n\n"
                f"I am connected to your natal chart: **{lagna_sign} Lagna**, Moon in **{moon_sign}** ({moon_nak} Nakshatra), with active **{dasha_maha}-{dasha_antar} Dasha**.\n\n"
                f"### Astrological Foundation & Guidance\n"
                f"Under your {lagna_sign} Ascendant, your chart carries distinct potential for purposeful achievement and structured growth. "
                f"Whether you wish to examine professional direction, timing of opportunities, Dhana Yogas, or personal life balance, I am here to guide you with clarity and scriptural integrity.\n\n"
                f"What strategic milestone, question, or goal would you like to explore today?"
            )
            suggested = [
                "Analyze my 10th House of Career & promotion timing",
                "What does my chart reveal regarding Dhana Yogas?",
                "Which upcoming transit supports career acceleration?",
                "How should I navigate current professional stress?"
            ]

    elif intent == "career":
        if persona_id == "dr-sunita-shastri":
            message = (
                f"{greeting_salutation} I am {persona_display}.\n\n"
                f"Analyzing your professional trajectory through a psychological and Jaimini lens for **{lagna_sign} Lagna**:\n\n"
                f"### Astrological Diagnosis\n"
                f"Under your {lagna_sign} Ascendant, your professional direction is guided by active **{dasha_maha} Mahadasha** and **{dasha_antar} Antardasha**. "
                f"With Moon in {moon_sign} ({moon_nak} Nakshatra), your intuitive discernment and interpersonal diplomacy are your greatest professional assets. "
                f"Roles requiring stakeholder alignment, mentorship, and creative collaboration will bring the greatest fulfillment.\n\n"
                f"### Timing & Workplace Harmony\n"
                f"Transiting benefics aspecting your key angles indicate a supportive window over the next 4 to 8 months for expanded responsibility and team leadership. "
                f"Maintain transparent, composed communication during high-stakes evaluations.\n\n"
                f"### Mindful Reflection\n"
                f"Ensure career ambitions do not compromise your domestic peace. Enduring success flourishes from a centered spirit."
            )
        elif persona_id == "pandit-raghavendra":
            message = (
                f"{greeting_salutation} I am {persona_display}.\n\n"
                f"According to classical Parashari Jyotish for **{lagna_sign} Lagna**:\n\n"
                f"### Scriptural Evaluation of Karma Bhava\n"
                f"Sage Parashara states that the 10th house governs *Kirti* (reputation) and *Pratishtha* (authority). "
                f"In your chart, your active Dasha lord **{dasha_maha}** commands your current professional karma.\n\n"
                f"### Remedial Harmonization for Workplace Obstacles\n"
                f"If you encounter institutional friction: Recite the **Aditya Hridaya Stotra** every Sunday at dawn to fortify public authority. "
                f"For your {dasha_maha} cycle, chanting the **Vishnu Sahasranama** clears hidden impediments and clarifies decision-making.\n\n"
                f"### Karmic Principle\n"
                f"Astrology reveals auspicious windows; righteous diligence (*Purushartha*) remains the supreme prerequisite for lasting honor."
            )
            remedy_card = {
                "title": "Solar & Executive Authority Harmonization",
                "mantra": "Aditya Hridaya Stotra / Om Suryaya Namah (At sunrise)",
                "gemstone_note": "Consult Lagna Lord dignity before wearing gemstone talismans.",
                "charity_practice": "Offer clean water to Surya Deva in a copper vessel at dawn; feed wheat to birds.",
                "disclaimer": "Traditional spiritual disciplines cultivate clarity and focus; they carry no commercial guarantees."
            }
        else:
            message = (
                f"{greeting_salutation} I am {persona_display}.\n\n"
                f"Analyzing the executive trajectory of your **{lagna_sign} Lagna**:\n\n"
                f"### Professional Diagnosis & House Axis\n"
                f"Your professional authority is actively guided under **{dasha_maha} Mahadasha** and **{dasha_antar} Antardasha**. "
                f"In Parashari doctrine for {lagna_sign} Lagna, this cycle activates opportunities for public leadership, organizational elevation, and institutional consolidation.\n\n"
                f"### Strategic Milestones & Execution Timing\n"
                f"1. **Next 60–90 Days:** High-visibility window. Initiate salary reviews, major project proposals, and executive stakeholder alignment.\n"
                f"2. **Leadership Posture:** Maintain a composed, data-driven demeanor during high-pressure negotiations. Your {lagna_sign} Lagna commands respect when decisions are methodical.\n"
                f"3. **Risk Management:** Consolidate your core deliverables before pursuing lateral transitions.\n\n"
                f"### Practical Reflection\n"
                f"Align high-stakes negotiations with planetary Horas governed by functional benefics for optimal clarity."
            )
        suggested = [
            "How does my 10th house lord influence promotion timing?",
            "Which upcoming transit supports a career switch?",
            "How does my active Dasha period affect professional stability?",
            "What Vedic remedies strengthen workplace leadership?"
        ]

    elif intent == "marriage":
        if persona_id == "dr-sunita-shastri":
            message = (
                f"{greeting_salutation} I am {persona_display}.\n\n"
                f"Examining your relationship architecture through Jaimini and Parashari synastry for **{lagna_sign} Lagna**:\n\n"
                f"### Emotional & Partnership Geometry\n"
                f"Under your {lagna_sign} Lagna, your 7th House of partnership is illuminated. Marital verification status: **{manglik_verdict}**. "
                f"Your emotional baseline is rooted in **{moon_sign}** ({moon_nak} Nakshatra), conferring deep loyalty and empathy.\n\n"
                f"### D9 Navamsha & Partner Characteristics\n"
                f"Your D9 Navamsha indicators point toward a companion who is intellectually mature, emotionally grounded, and shares your core values. "
                f"Under active **{dasha_maha}-{dasha_antar}** Dasha, transiting benefics in Kendra houses activate an auspicious 6 to 12-month window for formalizing alliances or deepening relationship harmony.\n\n"
                f"### Mindful Guidance\n"
                f"Communicate openly regarding mutual expectations. Gentle transparency during lunar transits prevents needless misunderstandings."
            )
            remedy_card = {
                "title": "Venusian Harmony & Emotional Balance",
                "mantra": "Om Kleem Shukraya Namah (Chant 108 times on Friday mornings)",
                "gemstone_note": "Natural White Zircon or Diamond set in silver (subject to Lagna dignity trial)",
                "charity_practice": "Support women's education or offer white flowers at Lakshmi temples on Fridays",
                "disclaimer": "Traditional remedial practices cultivate inner mindfulness; they do not guarantee specific interpersonal outcomes."
            }
        elif persona_id == "pandit-raghavendra":
            message = (
                f"{greeting_salutation} I am {persona_display}.\n\n"
                f"In sacred classical Jyotish for **{lagna_sign} Lagna** and **{moon_sign} Moon**:\n\n"
                f"### Scriptural Evaluation of Kalatra Bhava\n"
                f"The 7th House governs sacred marital covenants (*Vivaha Samskara*). Your marital status verification reflects: **{manglik_verdict}**. "
                f"Your current cycle is guided by **{dasha_maha} Mahadasha** and **{dasha_antar} Antardasha**.\n\n"
                f"### Traditional Harmonization\n"
                f"To foster marital peace and attract a noble partner: Chant the **Gauri Shankar Mantra** or observe gentle fasts on Thursdays, offering yellow fruits to Vishnu and Lakshmi.\n\n"
                f"### Classical Limitations\n"
                f"A horoscope illuminates compatibility tendencies and timing windows; eternal marital blessing is sustained through mutual forgiveness and dharma."
            )
            remedy_card = {
                "title": "Classical Parashari Remedial Discipline",
                "mantra": "Gauri Shankar Mantra: Om Hreem Yoginim Yogini Yogeswari Yoga Bhayankari Sakala Sthavara Jangamasya Mukha Hridayam Mama Vasham Akarshaya Namah",
                "gemstone_note": "Consult Lagna Lord dignity before wearing gemstone talismans",
                "charity_practice": "Offer sweet milk or food to Brahmins on Mondays",
                "disclaimer": "Vedic remedies are sacred traditional disciplines for mental peace."
            }
        else:
            message = (
                f"{greeting_salutation} I am {persona_display}.\n\n"
                f"Evaluating relationship stability and marriage timing for **{lagna_sign} Lagna**:\n\n"
                f"### 7th House & Partnership Analysis\n"
                f"Your 7th House of Kalatra is reviewed under active **{dasha_maha}-{dasha_antar}** Dasha. Marital status verification reflects: **{manglik_verdict}**. "
                f"Planetary transits create a structured, supportive window over the next 6 to 12 months for formalizing alliances or stabilizing long-term commitments.\n\n"
                f"### Strategic Relationship Principles\n"
                f"Approach partnerships with the same diligence as long-term covenants: prioritize shared financial values, emotional integrity, and mutual respect."
            )
        suggested = [
            "What does my 7th house reveal about partner compatibility?",
            "How does the D9 Navamsha chart modify relationship timing?",
            "Are there favorable transits for marriage in the next 12 months?",
            "What classical practices promote peace and mutual understanding?"
        ]

    elif intent == "wealth":
        message = (
            f"{greeting_salutation} I am {persona_display}.\n\n"
            f"Analyzing wealth accumulation, Dhana Yogas, and liquidity for **{lagna_sign} Lagna**:\n\n"
            f"### Dhana Yogas & Wealth Axis (2nd & 11th Houses)\n"
            f"For your {lagna_sign} Lagna, the 2nd House of liquid wealth and the 11th House of recurring gains are evaluated under your active **{dasha_maha} Mahadasha** and **{dasha_antar} Antardasha**. "
            f"This planetary configuration activates wealth potential, indicating sustained compounding when capital is deployed with disciplined patience.\n\n"
            f"### Strategic Financial Directives\n"
            f"1. **Capital Allocation:** Favor proven index equity, debt instruments, and stable tangible assets over speculative trends.\n"
            f"2. **Speculative Cautions:** Avoid high-leverage trading during localized Rahu Kaal or volatile lunar transits.\n"
            f"3. **Long-Term Compounding:** The {dasha_maha} planetary vibration supports asset accumulation for long-term family security.\n\n"
            f"*Disclaimer: Astrological analysis reflects planetary timing indicators; it does not constitute registered financial advice.*"
        )
        suggested = [
            "Which planets form auspicious Dhana Yogas in my chart?",
            "What does my 2nd and 11th house axis indicate for capital growth?",
            "How should I navigate speculative risks under my current Dasha?",
            "What traditional remedies support ethical prosperity?"
        ]

    elif intent == "remedy":
        message = (
            f"{greeting_salutation} I am {persona_display}.\n\n"
            f"Examining classical Vedic remedial harmonization for **{lagna_sign} Lagna**:\n\n"
            f"### Planetary Evaluation & Saturn Transit\n"
            f"Your chart is navigating **{dasha_maha} Mahadasha** and **{dasha_antar} Antardasha**, with Saturn in **{sadesati_phase}**.\n\n"
            f"### Prescribed Classical Remedies\n"
            f"- **Maha Mrityunjaya Mantra:** Chanting 108 times at sunrise pacifies malefic transit friction and restores physical and mental vitality.\n"
            f"- **Saturnian Discipline:** On Saturdays, light a pure sesame or mustard oil lamp under a Peepal tree and practice selfless charity toward those in need.\n"
            f"- **Gemstone Guidance:** Always fortify your functional Lagna and Trikona lords only after inspecting natal house dignities.\n\n"
            f"### Ethical Scriptural Principle\n"
            f"Traditional remedies are cultural and spiritual practices intended to cultivate inner peace, discipline, and humility. They are not transactional commercial guarantees."
        )
        remedy_card = {
            "title": "Classical Parashari Remedial Discipline",
            "mantra": "Maha Mrityunjaya Mantra: Om Tryambakam Yajamahe Sugandhim Pushtivardhanam Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat (108 times at sunrise)",
            "gemstone_note": "Fortify functional Trikona lords only after inspecting natal house lordships.",
            "charity_practice": "Light a pure sesame oil lamp under a Peepal tree on Saturdays; feed cows with green fodder.",
            "disclaimer": "Vedic remedies are sacred traditional disciplines for mental peace; they carry no commercial guarantees."
        }
        suggested = [
            "What is the classical scriptural basis for this mantra?",
            "How can I pacify Saturn's transit without expensive stones?",
            "Explain the proper methodology for dawn planetary chanting",
            "Can you evaluate my Sade Sati timeline and precautions?"
        ]

    else:
        # General / default chart reading
        message = (
            f"{greeting_salutation} I am {persona_display}.\n\n"
            f"Comprehensive Vedic astrological analysis for **{lagna_sign} Lagna** and **{moon_sign} Moon**:\n\n"
            f"### Natal Constitution & Life Themes\n"
            f"With {lagna_sign} Lagna and Moon in {moon_sign} ({moon_nak} Nakshatra), your chart reflects distinct resilience and depth. "
            f"Your active **{dasha_maha}-{dasha_antar}** Dasha period emphasizes purposeful, structured growth and character maturation.\n\n"
            f"### Planetary Climate & Advice\n"
            f"Saturn in {sadesati_phase} teaches patience and long-term discipline. By maintaining composed focus and balanced daily routines, you navigate this period with grace and strength."
        )
        suggested = [
            "Analyze my career trajectory and promotion timing",
            "When does my chart indicate relationship consolidation?",
            "What does my active Dasha period signify for finances?",
            "Which traditional remedies bring balanced peace of mind?"
        ]

    return {
        "status": "completed",
        "scope": scope,
        "intent": intent,
        "message": message,
        "chartEvidence": chart_evidence,
        "relatedInsights": related_insights,
        "suggestedQuestions": suggested,
        "remedyCard": remedy_card
    }
