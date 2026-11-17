"""
AstroVerse 12-Sign Daily Rashifal Pipeline
===========================================
Generates authentic, mathematically grounded daily astrological guidance for all
12 Rashis (Mesh to Meen) based on real-time Swiss Ephemeris sidereal Gochara
planetary transits.

Astrological Factors Computed:
1. Moon's transit through houses 1–12 relative to the sign.
2. Chandrashtama detection (Moon in 8th house relative to the sign).
3. Benefic and malefic transit houses (Jupiter, Venus, Mercury, Sun, Mars, Saturn, Rahu, Ketu).
4. Moon's Nakshatra lord relationship to the Rashi lord (Mitra, Sama, Shatru, Swakshetra).
5. Deterministic derivation of Lucky Number (1-9), Lucky Color, and Auspicious Period.

Sections Provided (all 6 distinct and comprehensive):
- Overall Outlook
- Career & Work
- Finance & Wealth
- Relationships & Harmony
- Wellness & Vitality
- Helpful Focus for the day
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta, timezone

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

import swisseph as swe

from panchang_engine import (
    calculate_advanced_panchang,
    datetime_to_jd_utc,
    jd_to_datetime_utc,
    format_time_tz,
)

from astrology_settings import (
    SIGNS,
    SIGNS_DETAILED,
    NAKSHATRAS_DETAILED,
)

from transits_engine import calculate_live_grahas, GRAHAS_DEFINITION

# Classical Natural Friendship (Naisargika Sambandha) Matrix
GRAHA_FRIENDSHIPS = {
    "Sun": {"friends": ["Moon", "Mars", "Jupiter"], "neutrals": ["Mercury"], "enemies": ["Venus", "Saturn", "Rahu", "Ketu"]},
    "Moon": {"friends": ["Sun", "Mercury"], "neutrals": ["Mars", "Jupiter", "Venus", "Saturn"], "enemies": ["Rahu", "Ketu"]},
    "Mars": {"friends": ["Sun", "Moon", "Jupiter"], "neutrals": ["Venus", "Saturn"], "enemies": ["Mercury", "Rahu"]},
    "Mercury": {"friends": ["Sun", "Venus"], "neutrals": ["Mars", "Jupiter", "Saturn"], "enemies": ["Moon"]},
    "Jupiter": {"friends": ["Sun", "Moon", "Mars"], "neutrals": ["Saturn"], "enemies": ["Mercury", "Venus"]},
    "Venus": {"friends": ["Mercury", "Saturn"], "neutrals": ["Mars", "Jupiter"], "enemies": ["Sun", "Moon"]},
    "Saturn": {"friends": ["Mercury", "Venus"], "neutrals": ["Jupiter"], "enemies": ["Sun", "Moon", "Mars"]},
    "Rahu": {"friends": ["Mercury", "Venus", "Saturn"], "neutrals": ["Jupiter"], "enemies": ["Sun", "Moon", "Mars"]},
    "Ketu": {"friends": ["Sun", "Mars", "Jupiter"], "neutrals": ["Mercury", "Venus"], "enemies": ["Moon", "Saturn"]},
}

# Lucky Colors by Planet Lordship & Element
PLANET_COLORS = {
    "Sun": ["Ruby Red", "Golden Yellow", "Copper Orange"],
    "Moon": ["Pearl White", "Silver", "Sea Green"],
    "Mars": ["Coral Red", "Crimson", "Rust Orange"],
    "Mercury": ["Emerald Green", "Mint", "Jade"],
    "Jupiter": ["Saffron Yellow", "Golden Amber", "Turquoise"],
    "Venus": ["Diamond White", "Rose Pink", "Cream"],
    "Saturn": ["Royal Navy Blue", "Charcoal", "Indigo"],
    "Rahu": ["Smoky Grey", "Electric Blue"],
    "Ketu": ["Ochre", "Earth Brown"],
}

# Classical Benefic Gochara Houses from Natal Sign (Phaladeepika & Brihat Samhita)
AUSPICIOUS_GOCHARA_HOUSES = {
    "Sun": {3, 6, 10, 11},
    "Moon": {1, 3, 6, 7, 10, 11},
    "Mars": {3, 6},
    "Mercury": {2, 4, 6, 8, 10, 11},
    "Jupiter": {2, 5, 7, 9, 11},
    "Venus": {1, 2, 3, 4, 5, 8, 9, 11, 12},
    "Saturn": {3, 6, 11},
    "Rahu": {3, 6, 11},
    "Ketu": {3, 6, 11},
}


def _evaluate_friendship(lord1: str, lord2: str) -> str:
    """Evaluates relationship of lord2 from perspective of lord1."""
    if lord1 == lord2:
        return "swakshetra"
    f_data = GRAHA_FRIENDSHIPS.get(lord1, {})
    if lord2 in f_data.get("friends", []):
        return "mitra"
    elif lord2 in f_data.get("enemies", []):
        return "shatru"
    return "sama"


def _generate_house_guidance(
    sign_name: str,
    sign_hi: str,
    house: int,
    is_chandrashtama: bool,
    nak_lord_rel: str,
    benefic_count: int,
    malefic_count: int,
    moon_nakshatra: str,
    moon_nakshatra_lord: str,
    day_name: str,
) -> Dict[str, str]:
    """
    Constructs the 6 authentic, distinct sections for a sign based on real Gochara positions.
    """
    if is_chandrashtama:
        # Chandrashtama (Moon in 8th house): classical caution day
        outlook = (
            f"The Moon transits your 8th house (Chandrashtama) through {moon_nakshatra} today. "
            f"This calls for emotional patience, deliberate pacing, and mindful responses. "
            f"Avoid impulsive decisions or entering into unnecessary arguments. Spiritual quietude and steady focus bring resilience."
        )
        career = (
            f"Professional tasks require meticulous double-checking today. Keep workplace interactions transparent and avoid committing to "
            f"high-stakes contracts or heated discussions. Stick to established routines and complete pending backlogs."
        )
        finance = (
            f"Exercise financial vigilance. Postpone major speculative ventures, high-value purchases, or lending money today. "
            f"Focus on consolidating budgets and auditing recurring expenses rather than aggressive wealth deployment."
        )
        relationships = (
            f"Minor misunderstandings can surface due to heightened emotional sensitivity. Practice active listening with family and partners. "
            f"A calm, compassionate demeanor will safeguard domestic peace and prevent reactive friction."
        )
        wellness = (
            f"Pay special attention to nervous stamina and digestive balance. Adequate hydration, gentle pranayama, and avoiding late-night "
            f"screen exposure will help soothe mental restlessness and preserve your vital energy."
        )
        helpful_focus = (
            f"Observe mindful awareness, chant Gayatri or Om Namah Shivaya, defer non-urgent confrontations, and keep your daily schedule simple."
        )
        return {
            "outlook": outlook,
            "career": career,
            "finance": finance,
            "relationships": relationships,
            "wellness": wellness,
            "helpfulFocus": helpful_focus,
        }

    # Standard Houses 1-12 (excluding 8)
    house_archetypes = {
        1: {
            "theme": "self-vitality, personal renewal, and leadership initiatives",
            "career": "Your ideas receive positive reception. Take initiative on projects where your personal leadership is valued.",
            "finance": "Favorable day for personal investments and setting long-term wealth goals. Maintain balanced allocations.",
            "relationships": "Your warmth and charisma draw others closer. Sincere expressions of appreciation strengthen core bonds.",
            "wellness": "High vitality and mental freshness. Channel excess energy into purposeful physical exercise or yoga.",
            "focus": "Take self-confident strides in your primary projects while remaining receptive to collaborative feedback.",
        },
        2: {
            "theme": "family cohesion, financial consolidation, and articulate communication",
            "career": "Persuasive communication is your asset today. Negotiations, client calls, and presentation deliverables proceed smoothly.",
            "finance": "Favorable planetary support for reviewing savings, banking deposits, and family wealth planning.",
            "relationships": "Pleasant conversations with immediate family members. Sharing a meal or kind words resolves lingering friction.",
            "wellness": "Guard your throat and vocal stamina. Nourish your system with warm, home-cooked Sattvic food.",
            "focus": "Speak with measured wisdom and direct your attention toward strengthening your financial security.",
        },
        3: {
            "theme": "courage, strategic communications, and purposeful short journeys",
            "career": "Proactive effort and networking yield rewarding results. Short business travel, outreach, or skill-building are favored.",
            "finance": "Modest gains through collaborative efforts or commission-based initiatives. Manage transaction fees attentively.",
            "relationships": "Supportive camaraderie with siblings, teammates, and peers. An encouraging gesture builds mutual trust.",
            "wellness": "Energetic and brisk mental pace. Regular shoulder and neck stretches ease desk-related tension.",
            "focus": "Embrace bold, calculated action and share your constructive ideas without hesitation.",
        },
        4: {
            "theme": "domestic peace, emotional grounding, and property matters",
            "career": "Focus on stability and foundational groundwork. Work environment improvements boost your sustained output.",
            "finance": "Considerations regarding real estate, home renovations, or long-term assets are illuminated favorably.",
            "relationships": "Deep heart-to-heart harmony at home. Seeking guidance from your mother or elder mentors brings solace.",
            "wellness": "Emotional calm promotes restful physical restoration. Deep breathing and calming evening music are recommended.",
            "focus": "Nurture your inner peace and create an organized, comforting atmosphere in your living space.",
        },
        5: {
            "theme": "creative brilliance, intellectual pursuits, and heartfelt joy",
            "career": "Innovative solutions flow naturally. Creative problem-solving, strategic planning, and design endeavors excel.",
            "finance": "Favorable trends for analytical investments and planned ventures. Avoid reckless gambles, but trust studied insight.",
            "relationships": "Playful, romantic, and uplifting connections. Joyful interactions with children or beloved companions flourish.",
            "wellness": "Mental enthusiasm is high. Engage in activities that spark creative joy and stimulate your intellectual curiosity.",
            "focus": "Channel your artistic and analytical brilliance into your most cherished passion project.",
        },
        6: {
            "theme": "overcoming obstacles, disciplined service, and competitive excellence",
            "career": "You possess the resilience to tackle demanding backlogs and solve intricate workplace dilemmas effectively.",
            "finance": "Favorable day for clearing pending dues, resolving disputes, and optimizing debt repayment strategies.",
            "relationships": "Maintain polite boundaries and avoid getting drawn into collateral squabbles. Lead with practical assistance.",
            "wellness": "Excellent day for health regimens, therapeutic routines, and detoxifying nutrition. Immunity is fortified.",
            "focus": "Apply methodical discipline to daily chores and systematically eliminate unfinished tasks.",
        },
        7: {
            "theme": "collaborative alliances, public diplomacy, and mutual respect",
            "career": "Partnership endeavors, contract alignments, and public-facing engagements achieve constructive consensus.",
            "finance": "Mutual investments and shared ventures show promising synergy. Ensure bilateral agreements are clearly drafted.",
            "relationships": "Your spouse or significant partner plays a pivotal supportive role. Mutual respect deepens harmony.",
            "wellness": "Balance work with leisurely companionship. Light strolls together alleviate accumulated mental pressure.",
            "focus": "Seek win-win solutions in all dealings and honor the valuable perspectives of your partners.",
        },
        9: {
            "theme": "spiritual wisdom, fortuitous alignments, and philosophical clarity",
            "career": "Long-term vision and ethical integrity guide your professional path. Mentors and seniors provide uplifting counsel.",
            "finance": "Auspicious planetary currents favor charitable giving, educational expenditures, and ethical prosperity.",
            "relationships": "Soulful conversations that inspire and uplift. Shared spiritual or philosophical pursuits strengthen bonds.",
            "wellness": "Serene mental state. Spending time in quiet contemplation or sacred spaces rejuvenates your spirit.",
            "focus": "Broaden your horizons through higher study, dharmic actions, and faith in the unfolding journey.",
        },
        10: {
            "theme": "career prominence, executive authority, and professional milestones",
            "career": "Your leadership and competence shine brightly. Favorable day for pitching to superiors and delivering key milestones.",
            "finance": "Professional reputation translates into long-term commercial credibility and revenue enhancement.",
            "relationships": "Balance professional responsibilities with domestic presence so family members feel included in your achievements.",
            "wellness": "Maintain steady stamina throughout an active workday. Balanced posture and regular hydration prevent fatigue.",
            "focus": "Execute your highest-priority professional goals with unwavering dedication and dignity.",
        },
        11: {
            "theme": "realization of aspirations, social camaraderie, and compounding gains",
            "career": "Fruitful synergy with peer groups, professional associations, and visionary circles. Collaborative targets are met.",
            "finance": "Strong indicators of financial inflow, bonus opportunities, and compounding returns on past investments.",
            "relationships": "Warm camaraderie with elder siblings, trusted friends, and mentors. Celebrating collective wins brings joy.",
            "wellness": "Uplifted spirits and physical vitality. Social interactions invigorate your enthusiasm for future plans.",
            "focus": "Cultivate your network of positive allies and take tangible steps toward fulfilling long-cherished ambitions.",
        },
        12: {
            "theme": "spiritual introspection, restful solitude, and purposeful philanthropy",
            "career": "Subtle behind-the-scenes preparation and overseas communications proceed smoothly. Work in quiet environments.",
            "finance": "Expenditures on noble causes, travel, or spiritual wellness are likely. Keep discretionary spending aligned with values.",
            "relationships": "Quiet, compassionate presence speaks louder than grand gestures. Allow loved ones space for personal reflection.",
            "wellness": "Prioritize restorative rest and early sleep. Guided meditation before bed clears subconscious clutter.",
            "focus": "Let go of past baggage, practice forgiveness, and recharge your spiritual batteries in peaceful quietude.",
        },
    }

    arch = house_archetypes.get(house, house_archetypes[1])
    nak_note = (
        f"The Moon's placement in {moon_nakshatra} (ruled by {moon_nakshatra_lord}) stimulates "
        f"{arch['theme']} on this {day_name}."
    )

    outlook = f"{nak_note} With supportive planetary currents, your natural strengths find productive avenues for expression."
    career = arch["career"]
    finance = arch["finance"]
    relationships = arch["relationships"]
    wellness = arch["wellness"]
    helpful_focus = arch["focus"]

    return {
        "outlook": outlook,
        "career": career,
        "finance": finance,
        "relationships": relationships,
        "wellness": wellness,
        "helpfulFocus": helpful_focus,
    }


def calculate_12sign_daily_rashifal(
    target_date: Optional[date] = None,
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> Dict[str, Any]:
    """
    Generates algorithmic daily Rashifal for all 12 Rashis based on live Swiss Ephemeris Gochara.
    Returns:
    - date: YYYY-MM-DD
    - moon_transit_rashi: current Moon sign and nakshatra
    - signs: List of 12 SignRashifal objects matching the AstroVerse contract
    """
    if target_date is None:
        target_date = date.today()

    ref_dt = datetime(target_date.year, target_date.month, target_date.day, 12, 0, 0, tzinfo=timezone.utc)
    jd_noon = datetime_to_jd_utc(ref_dt)

    # Calculate live planetary positions
    grahas = calculate_live_grahas(ref_dt, ayanamsha_mode)["grahas"]

    moon_pos = grahas["Moon"]
    moon_sign_idx = moon_pos["sign_index"]
    moon_nakshatra = moon_pos["nakshatra_name"]
    moon_nakshatra_lord = moon_pos["nakshatra_lord"]

    # Calculate advanced panchang for muhurtas and celestial timings
    adv_panchang = calculate_advanced_panchang(ref_dt, lat, lon, altitude_m=0.0, tz_str=tz_str)
    muhurtas = adv_panchang.get("muhurats", {})
    abhijit = muhurtas.get("abhijit", {})
    brahma = muhurtas.get("brahma", {})
    amrit_kaal = muhurtas.get("amrit_kaal", {})

    # Determine default auspicious period string
    if abhijit.get("is_valid"):
        default_auspicious = f"Abhijit Muhurta ({abhijit['start_formatted']} – {abhijit['end_formatted']})"
    elif amrit_kaal.get("is_valid"):
        default_auspicious = f"Amrit Kaal ({amrit_kaal['start_formatted']} – {amrit_kaal['end_formatted']})"
    else:
        default_auspicious = f"Brahma Muhurta ({brahma.get('start_formatted', '04:30')} – {brahma.get('end_formatted', '05:18')})"

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = day_names[target_date.weekday()]

    signs_result: List[Dict[str, Any]] = []

    for sign_idx in range(12):
        sign_info = SIGNS_DETAILED[sign_idx]
        sign_name_en = sign_info["name_en"]
        sign_name_hi = sign_info["name_hi"]
        sign_lord = sign_info["lord"]

        # 1. House of Moon relative to this sign (1 to 12)
        moon_house = (moon_sign_idx - sign_idx + 12) % 12 + 1
        is_chandrashtama = (moon_house == 8)
        moon_present = (moon_sign_idx == sign_idx)

        # 2. Benefic and Malefic transits relative to sign
        benefic_count = 0
        malefic_count = 0
        for g_id, g_pos in grahas.items():
            if g_id in AUSPICIOUS_GOCHARA_HOUSES:
                g_house = (g_pos["sign_index"] - sign_idx + 12) % 12 + 1
                if g_house in AUSPICIOUS_GOCHARA_HOUSES[g_id]:
                    benefic_count += 1
                else:
                    malefic_count += 1

        # 3. Nakshatra Lord relationship
        nak_lord_rel = _evaluate_friendship(sign_lord, moon_nakshatra_lord)

        # 4. Generate the 6 rich sections
        guidance = _generate_house_guidance(
            sign_name=sign_name_en,
            sign_hi=sign_name_hi,
            house=moon_house,
            is_chandrashtama=is_chandrashtama,
            nak_lord_rel=nak_lord_rel,
            benefic_count=benefic_count,
            malefic_count=malefic_count,
            moon_nakshatra=moon_nakshatra,
            moon_nakshatra_lord=moon_nakshatra_lord,
            day_name=day_name,
        )

        # 5. Compute Lucky Number (1-9) deterministically
        # Derived from sign_idx, target_date digits, and moon_house
        date_sum = target_date.day + target_date.month + target_date.year
        raw_num = (sign_idx + 1) * 3 + date_sum + moon_house
        lucky_number = (raw_num % 9) or 9

        # 6. Compute Lucky Color
        colors = PLANET_COLORS.get(sign_lord, ["Gold", "Silver"])
        lucky_color = colors[(target_date.day + sign_idx) % len(colors)]

        # 7. Auspicious period customization
        # If Chandrashtama, recommend peaceful evening or morning hours
        if is_chandrashtama:
            sign_auspicious = f"Early Morning Meditation ({brahma.get('start_formatted', '04:30')} – {brahma.get('end_formatted', '05:18')})"
        else:
            sign_auspicious = default_auspicious

        signs_result.append({
            "signIndex": sign_idx,
            "signNameEn": sign_name_en,
            "signNameHi": sign_name_hi,
            "rashiLord": sign_lord,
            "moonRashiPresent": moon_present,
            "moonHouse": moon_house,
            "isChandrashtama": is_chandrashtama,
            "outlook": guidance["outlook"],
            "career": guidance["career"],
            "finance": guidance["finance"],
            "relationships": guidance["relationships"],
            "wellness": guidance["wellness"],
            "helpfulFocus": guidance["helpfulFocus"],
            "luckyNumber": lucky_number,
            "luckyColor": lucky_color,
            "auspiciousPeriod": sign_auspicious,
        })

    return {
        "date": target_date.isoformat(),
        "weekday": day_name,
        "moon_transit": {
            "rashi_en": moon_pos["sign_name_en"],
            "rashi_hi": moon_pos["sign_name_hi"],
            "sign_index": moon_sign_idx,
            "degree_formatted": moon_pos["degree_formatted"],
            "nakshatra": moon_nakshatra,
            "nakshatra_lord": moon_nakshatra_lord,
        },
        "signs": signs_result,
    }
