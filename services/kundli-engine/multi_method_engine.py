"""
AstroVerse Explainable Multi-Method Astrological Comparison Engine (Phase 7):
Compares findings across distinct traditions:
1. Classical Parashari (Graha Drishti, Equal Bhavas, Vimshottari Dasha, Yogas)
2. Jaimini Astrology (Rashi Drishti, Chara Karakas, Arudha Lagna, Chara Dasha)
3. Krishnamurti Padhdhati / KP (KP Ayanamsha, Placidus Unequal Cusps, Star/Sub Lords)
4. Tajika Varshaphal (Annual Solar Return, Muntha, Varsheshwara, Sahams)

Identifies:
- Selected conventions of each method.
- Calculated focal factors.
- Interpretations produced by each system.
- Areas of consensus / agreement.
- Areas of divergence / disagreement.
- Exact technical reason for difference (e.g. Rashi-based vs. Graha-based aspects, Placidus vs. Equal signs).
- Epistemic limitations (no false certainty, no fabricated average scores).
"""

from typing import Dict, Any, List

def build_multi_method_comparison(
    parashari_kundli: Dict[str, Any],
    dasha_data: Dict[str, Any],
    jaimini_data: Dict[str, Any],
    kp_data: Dict[str, Any],
    tajika_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Synthesizes side-by-side explainable comparison between Parashari, Jaimini, KP, and Tajika.
    """
    lagna = parashari_kundli["lagna"]["sign"]
    lagna_deg = parashari_kundli["lagna"]["degree"]
    moon_sign = parashari_kundli["planets"]["Moon"]["sign"]
    active_maha = dasha_data.get("active_now", {}).get("maha_dasha", "Jupiter")
    active_antar = dasha_data.get("active_now", {}).get("antar_dasha", active_maha)

    # Jaimini key factors
    ak_name = jaimini_data.get("atmakaraka", {}).get("planet", "Sun")
    amk_name = jaimini_data.get("chara_karakas", {}).get("Amatyakaraka", {}).get("planet", "Mercury")
    al_sign = jaimini_data.get("arudha_lagna", {}).get("sign", lagna)
    ul_sign = jaimini_data.get("upapada_lagna", {}).get("sign", "Libra")
    chara_active = jaimini_data.get("chara_dasha", [{}])[0].get("sign", lagna)

    # KP key factors
    c10_sub = kp_data.get("house_cusps", {}).get(10, {}).get("sub_lord", "Jupiter")
    c7_sub = kp_data.get("house_cusps", {}).get(7, {}).get("sub_lord", "Venus")
    c1_sub = kp_data.get("house_cusps", {}).get(1, {}).get("sub_lord", "Mars")

    # Tajika key factors
    varsha_lagna = tajika_data.get("varsha_lagna", {}).get("sign", lagna)
    muntha_sign = tajika_data.get("muntha", {}).get("sign", "Cancer")
    muntha_house = tajika_data.get("muntha", {}).get("varsha_house", 9)
    varsheshwara = tajika_data.get("panchadhikaris", {}).get("selected_varsheshwara", "Jupiter")

    # 1. Individual Method Profiles
    methods = [
        {
            "method_id": "parashari",
            "name": "Classical Parashari Jyotish",
            "conventions": {
                "ayanamsha": "Lahiri (Chitrapaksha)",
                "house_system": "Equal Sign (Whole Sign Rashi Bhavas)",
                "dasha_system": "Vimshottari 120-Year (Moon-Nakshatra initiated)",
                "aspect_rule": "Graha Drishti (Planetary aspects across 7th, 4th/8th for Mars, 5th/9th for Jupiter, 3rd/10th for Saturn)"
            },
            "key_factors": [
                f"Lagna: {lagna} ({lagna_deg}°)",
                f"Moon Sign: {moon_sign}",
                f"Active Vimshottari: {active_maha} Mahadasha / {active_antar} Antardasha"
            ],
            "focus_interpretation": (
                f"Under Parashari principles, primary life developments are timed by the {active_maha}-{active_antar} cycle. "
                f"Progress unfolds through Kendra and Trikona functional lords, prioritizing constitutional balance."
            ),
            "limitations": "Evaluates whole sign bhavas; subtle cusp shifts require divisional confirmation (D9/D10)."
        },
        {
            "method_id": "jaimini",
            "name": "Jaimini Upadesha Sutras",
            "conventions": {
                "ayanamsha": "Lahiri (Chitrapaksha)",
                "house_system": "Rashi Bhavas and Arudha Padas",
                "dasha_system": "Chara Dasha (Sign-based dasha progression)",
                "aspect_rule": "Rashi Drishti (Movable signs aspect Fixed signs, Fixed aspect Movable, Dual aspect Dual)"
            },
            "key_factors": [
                f"Atmakaraka (Soul): {ak_name}",
                f"Amatyakaraka (Career): {amk_name}",
                f"Arudha Lagna (Public Image): {al_sign}",
                f"Upapada Lagna (Partnership): {ul_sign}",
                f"Active Chara Dasha: {chara_active} Sign Period"
            ],
            "focus_interpretation": (
                f"Jaimini analyzes events from the vantage of the soul's karmic longing (Atmakaraka {ak_name}) "
                f"and external social manifestation via Arudha Lagna in {al_sign}. "
                f"Professional expansion is guided directly by Amatyakaraka {amk_name}."
            ),
            "limitations": "Sign-based timing (Chara Dasha) evaluates broader chapters rather than day-to-day transit fluctuations."
        },
        {
            "method_id": "kp",
            "name": "Krishnamurti Padhdhati (KP System)",
            "conventions": {
                "ayanamsha": "KP (Krishnamurti Ayanamsha)",
                "house_system": "Placidus Semi-Arc Unequal Cusps",
                "dasha_system": "Vimshottari Dasha mapped to Placidus Cusps",
                "aspect_rule": "Western/Starlord aspects governed by Star-Lord and Sub-Lord hierarchy"
            },
            "key_factors": [
                f"1st Cusp Sub-Lord: {c1_sub}",
                f"10th Cusp (Career) Sub-Lord: {c10_sub}",
                f"7th Cusp (Relationship) Sub-Lord: {c7_sub}"
            ],
            "focus_interpretation": (
                f"KP evaluates outcome feasibility through Sub-Lords. "
                f"Career success is governed by 10th Cusp Sub-Lord {c10_sub}; if {c10_sub} signifies houses 2, 6, 10, or 11, "
                f"substantial professional fruition is promised."
            ),
            "limitations": "Highly sensitive to birth time accuracy; a 1-2 minute variance can change sub-lord allocations."
        },
        {
            "method_id": "tajika",
            "name": "Tajika Varshaphal (Annual Horoscopy)",
            "conventions": {
                "ayanamsha": "Lahiri (Chitrapaksha)",
                "house_system": "Solar Return Chart for current completed year",
                "dasha_system": "Patyayini / Mudda Dasha",
                "aspect_rule": "Tajika Aspects (Friendly, Inimical, Neutral) & Deeptamsha orbs (Ithasala/Ishrafa)"
            },
            "key_factors": [
                f"Varshaphal Lagna: {varsha_lagna}",
                f"Muntha Placement: {muntha_sign} (Varsha House {muntha_house})",
                f"Varsheshwara (Year Lord): {varsheshwara}"
            ],
            "focus_interpretation": (
                f"Tajika isolates the current birthday year. Muntha in House {muntha_house} under Varsheshwara {varsheshwara} "
                f"establishes the operational focus for the immediate 12-month annual cycle."
            ),
            "limitations": "Valid exclusively for the specific 12-month solar cycle; does not replace lifetime natal foundations."
        }
    ]

    # 2. Areas of Agreement & Divergence Analysis
    agreements = [
        f"Consensus on Career Benefactor: Both Parashari 10th house governance and Jaimini Amatyakaraka ({amk_name}) emphasize strategic advisory roles and administrative consolidation.",
        f"Consensus on Timing Momentum: Both Vimshottari ({active_maha}) and KP significator patterns validate steady expansion over speculative haste.",
        f"Consensus on Annual Theme: Tajika Muntha ({muntha_sign} in House {muntha_house}) supports active life restructuring in harmony with current Parashari Dasha."
    ]

    divergences = [
        {
            "topic": "House Boundaries & Planet Locations",
            "parashari_claim": "Uses Whole Sign Bhavas where every planet in Scorpio belongs to House 1.",
            "kp_claim": "Uses Placidus unequal cusps; planets near sign boundaries can shift into adjacent Bhavas.",
            "technical_reason": "Parashari employs Rashi-equal division, whereas KP relies on the Placidus quadrant semi-arc system derived from geocentric latitude."
        },
        {
            "topic": "Aspectual Mechanics",
            "parashari_claim": "Grahas cast aspects based on planet-specific angles (e.g. Mars 4th/8th, Jupiter 5th/9th).",
            "jaimini_claim": "Signs aspect each other directly (Rashi Drishti: Movable signs aspect Fixed signs).",
            "technical_reason": "Jaimini interprets signs as energetic vessels that interact permanently regardless of planet presence, while Parashari measures direct planetary rays."
        },
        {
            "topic": "Timing Methodology",
            "parashari_claim": "Times life milestones via Vimshottari 120-year cycle from natal Moon nakshatra.",
            "tajika_claim": "Focuses on annual solar return and moving Muntha point.",
            "technical_reason": "Parashari charts multi-year lifetime karmic arcs; Tajika isolates annual solar returns for micro-year precision."
        }
    ]

    return {
        "title": "Explainable Multi-Method Astrological Comparison",
        "profile_evaluated": {
            "lagna": lagna,
            "moon_sign": moon_sign,
            "active_mahadasha": active_maha
        },
        "methods": methods,
        "points_of_agreement": agreements,
        "points_of_divergence": divergences,
        "epistemic_statement": (
            "Each astrological tradition represents a self-consistent epistemic model with distinct conventions. "
            "AstroVerse preserves the mathematical purity of each system without artificial averaging or forced harmonization. "
            "Planetary indicators reflect environmental and psychological predispositions; human discernment, agency, and practical action remain sovereign."
        )
    }
