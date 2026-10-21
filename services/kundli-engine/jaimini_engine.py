"""
AstroVerse Jaimini Astrology Engine (Upadesha Sutras of Maharishi Jaimini):
Distinct astrological calculation module operating on Rashi (sign-based) mechanics.

Features:
1. 7-Fold Chara Karaka System (AK, AmK, BK, MK, PK, GK, DK) derived from highest to lowest degree.
2. Arudha Lagna (AL) & 12 Bhava Arudhas (A1 - A12) with classical 1st/7th cancellation exceptions.
3. Upapada Lagna (UL / A12) for marital longevity, partnership harmony, and family status.
4. Rashi Drishti (Sign Aspects):
   - Movable (Chara) signs aspect all Fixed (Sthira) signs except the adjacent one.
   - Fixed (Sthira) signs aspect all Movable (Chara) signs except the adjacent one.
   - Dual (Dwisvabhava) signs aspect all other Dual signs.
5. Jaimini Chara Dasha:
   - Calculation of sign dasha order (Direct vs. Indirect based on 9th house odd/even nature).
   - Sign period duration based on lord position (Padas elapsed counting forward or backward).
"""

from typing import Dict, Any, List, Tuple

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
}

# Sign nature: 0 = Movable, 1 = Fixed, 2 = Dual
SIGN_MODALITY = {
    "Aries": "Movable", "Taurus": "Fixed", "Gemini": "Dual", "Cancer": "Movable",
    "Leo": "Fixed", "Virgo": "Dual", "Libra": "Movable", "Scorpio": "Fixed",
    "Sagittarius": "Dual", "Capricorn": "Movable", "Aquarius": "Fixed", "Pisces": "Dual"
}

CHARA_KARAKA_NAMES = [
    ("Atmakaraka (AK)", "Soul indicator, primary self, spiritual destiny, and life purpose"),
    ("Amatyakaraka (AmK)", "Intellect, career advisor, professional standing, and public duty"),
    ("Bhratrikaraka (BK)", "Siblings, mentors, guides, courage, and third-house affairs"),
    ("Matrikaraka (MK)", "Mother, domestic peace, vehicles, emotional foundation, and 4th-house matters"),
    ("Putrakaraka (PK)", "Progeny, creative output, intellectual projects, disciples, and memory"),
    ("Gnatikaraka (GK)", "Kinsmen, rivals, litigation, immune resilience, and 6th-house obstacles"),
    ("Darakaraka (DK)", "Spouse, lifelong partner, contractual alliances, and business relationships")
]

def calculate_chara_karakas(planets_d1: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes Jaimini 7 Chara Karakas by sorting the 7 classical physical planets
    by their exact degree within their occupied sign (from highest to lowest).
    """
    seven_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    valid_planets = [p for p in seven_planets if p in planets_d1]

    # Sort descending by degree within sign
    sorted_planets = sorted(valid_planets, key=lambda p: planets_d1[p]["degree"], reverse=True)

    karakas = {}
    for idx, p_name in enumerate(sorted_planets[:7]):
        name, desc = CHARA_KARAKA_NAMES[idx]
        karakas[name.split(" ")[0]] = {
            "planet": p_name,
            "karaka_title": name,
            "degree": planets_d1[p_name]["degree"],
            "sign": planets_d1[p_name]["sign"],
            "house": planets_d1[p_name]["house"],
            "significance": desc
        }

    return karakas

def calculate_arudha_padas(planets_d1: Dict[str, Any], lagna_sign: str) -> Dict[str, Any]:
    """
    Calculates the 12 Arudha Padas (A1/AL to A12/UL) using classical Parashari/Jaimini rules:
    - Distance of house lord from house is calculated in signs (D).
    - Arudha is placed D signs ahead of the lord.
    - Classical Jaimini Exceptions:
      1. If the lord is in the house itself (D = 1), Arudha falls in the 10th house from it.
      2. If the lord is in the 7th from the house (D = 7), Arudha falls in the 4th house or 10th house (standard: 10th from house).
    """
    lagna_idx = SIGNS.index(lagna_sign)
    arudhas = {}

    for house_num in range(1, 13):
        house_sign_idx = (lagna_idx + house_num - 1) % 12
        house_sign = SIGNS[house_sign_idx]
        lord = SIGN_LORDS[house_sign]
        lord_sign = planets_d1[lord]["sign"]
        lord_sign_idx = SIGNS.index(lord_sign)

        # Distance from house to lord (1 to 12)
        dist = ((lord_sign_idx - house_sign_idx + 12) % 12) + 1

        # Calculate raw Arudha sign index
        raw_arudha_idx = (lord_sign_idx + dist - 1) % 12

        # Check classical exceptions
        final_arudha_idx = raw_arudha_idx
        exception_applied = None

        if dist == 1:
            # Lord in 1st from house -> Arudha in 10th from house
            final_arudha_idx = (house_sign_idx + 9) % 12
            exception_applied = "Lord in same house: Arudha shifted to 10th house"
        elif dist == 7:
            # Lord in 7th from house -> Arudha in 10th from house
            final_arudha_idx = (house_sign_idx + 9) % 12
            exception_applied = "Lord in 7th from house: Arudha shifted to 10th house"

        arudha_house = ((final_arudha_idx - lagna_idx + 12) % 12) + 1
        pada_name = "AL (Arudha Lagna)" if house_num == 1 else f"UL (Upapada)" if house_num == 12 else f"A{house_num}"

        arudhas[pada_name] = {
            "house_number": house_num,
            "sign": SIGNS[final_arudha_idx],
            "house": arudha_house,
            "lord": lord,
            "exception_applied": exception_applied
        }

    return arudhas

def calculate_rashi_drishti(planets_d1: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Calculates Jaimini Rashi Drishti (Sign Aspects):
    - Movable signs (Aries, Cancer, Libra, Capricorn) aspect Fixed signs except adjacent.
    - Fixed signs (Taurus, Leo, Scorpio, Aquarius) aspect Movable signs except adjacent.
    - Dual signs (Gemini, Virgo, Sagittarius, Pisces) aspect all other Dual signs.
    """
    aspects_map = {}

    movable = ["Aries", "Cancer", "Libra", "Capricorn"]
    fixed = ["Taurus", "Leo", "Scorpio", "Aquarius"]
    dual = ["Gemini", "Virgo", "Sagittarius", "Pisces"]

    for sign in SIGNS:
        s_idx = SIGNS.index(sign)
        modality = SIGN_MODALITY[sign]
        aspected_signs = []

        if modality == "Movable":
            # Aspects all fixed except adjacent (s_idx + 1)
            adj_fixed = SIGNS[(s_idx + 1) % 12]
            aspected_signs = [f for f in fixed if f != adj_fixed]
        elif modality == "Fixed":
            # Aspects all movable except adjacent (s_idx - 1)
            adj_movable = SIGNS[(s_idx - 1 + 12) % 12]
            aspected_signs = [m for m in movable if m != adj_movable]
        elif modality == "Dual":
            # Aspects all other dual signs
            aspected_signs = [d for d in dual if d != sign]

        aspects_map[sign] = aspected_signs

    # Map planets aspecting each other through Rashi Drishti
    planet_aspects = {}
    for p_name, p_data in planets_d1.items():
        p_sign = p_data["sign"]
        targets = aspects_map.get(p_sign, [])
        aspected_planets = [
            other for other, o_data in planets_d1.items()
            if o_data["sign"] in targets and other != p_name
        ]
        planet_aspects[p_name] = {
            "sign": p_sign,
            "aspected_signs": targets,
            "aspected_planets": aspected_planets
        }

    return planet_aspects

def calculate_chara_dasha(planets_d1: Dict[str, Any], lagna_sign: str) -> List[Dict[str, Any]]:
    """
    Calculates Jaimini Chara Dasha sign sequence and approximate durations:
    - 9th house from Lagna determines progression order (Odd sign = direct, Even sign = indirect).
    - Sign duration: Count from sign to its lord (direct for Aries, Taurus, Gemini, Libra, Scorpio, Sagittarius;
      indirect for Cancer, Leo, Virgo, Capricorn, Aquarius, Pisces). Duration = count - 1 (if 0, then 12).
    """
    lagna_idx = SIGNS.index(lagna_sign)
    ninth_sign_idx = (lagna_idx + 8) % 12

    # Check if 9th house sign is odd or even in zodiac
    is_direct = (ninth_sign_idx % 2 == 0)

    # Generate 12-sign dasha order
    dasha_signs = []
    if is_direct:
        dasha_signs = [SIGNS[(lagna_idx + i) % 12] for i in range(12)]
    else:
        dasha_signs = [SIGNS[(lagna_idx - i + 12) % 12] for i in range(12)]

    direct_count_signs = ["Aries", "Taurus", "Gemini", "Libra", "Scorpio", "Sagittarius"]

    chara_timeline = []
    for sign in dasha_signs:
        s_idx = SIGNS.index(sign)
        lord = SIGN_LORDS[sign]
        lord_sign = planets_d1[lord]["sign"]
        lord_idx = SIGNS.index(lord_sign)

        if sign in direct_count_signs:
            years = (lord_idx - s_idx + 12) % 12
        else:
            years = (s_idx - lord_idx + 12) % 12

        duration_years = years if years > 0 else 12

        chara_timeline.append({
            "sign": sign,
            "lord": lord,
            "lord_sign": lord_sign,
            "duration_years": duration_years,
            "direction": "Direct (Forward)" if sign in direct_count_signs else "Indirect (Backward)"
        })

    return chara_timeline

def analyze_jaimini_system(planets_d1: Dict[str, Any], lagna_sign: str) -> Dict[str, Any]:
    """
    Master Jaimini Astrological Analysis:
    Combines Chara Karakas, Arudha Lagna, Upapada, Rashi Drishti, and Chara Dasha.
    """
    karakas = calculate_chara_karakas(planets_d1)
    arudhas = calculate_arudha_padas(planets_d1, lagna_sign)
    rashi_drishti = calculate_rashi_drishti(planets_d1)
    chara_dasha = calculate_chara_dasha(planets_d1, lagna_sign)

    al_data = arudhas.get("AL (Arudha Lagna)", {})
    ul_data = arudhas.get("UL (Upapada)", {})
    ak_data = karakas.get("Atmakaraka", {})

    return {
        "chara_karakas": karakas,
        "arudha_padas": arudhas,
        "arudha_lagna": al_data,
        "upapada_lagna": ul_data,
        "atmakaraka": ak_data,
        "rashi_drishti": rashi_drishti,
        "chara_dasha": chara_dasha,
        "methodology": {
            "tradition": "Jaimini Sutras (Maharishi Jaimini)",
            "ayanamsha": "Lahiri (Chitrapaksha)",
            "karaka_scheme": "7 Chara Karaka System",
            "aspect_nature": "Rashi Drishti (Sign-based aspects)",
            "exceptions": "1st and 7th Lord Arudha cancellation to 10th house"
        }
    }
