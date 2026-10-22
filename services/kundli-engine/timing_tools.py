"""
Timing & Election Intelligence Engine (VedAstro Classical Principles):
Implements:
1. Tarabala (9-fold Star Strength across 3 Cycles: Prathama, Dvitiya, Tritiya).
2. Chandrabala (Lunar Transit Strength relative to Janma Rasi).
3. Ghataka Chakra (Classical Inauspicious Elements: Moon Sign, Tithi, Weekday, Nakshatra, Lagna).
4. Muhurta / Transit Quality Evaluation.
"""

from typing import Dict, Any, List, Tuple

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

WEEKDAYS = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
]

TITHI_GROUPS = {
    "Nanda (Joyous / 1, 6, 11)": [0, 5, 10, 15, 20, 25],
    "Bhadra (Auspicious / 2, 7, 12)": [1, 6, 11, 16, 21, 26],
    "Jaya (Victorious / 3, 8, 13)": [2, 7, 12, 17, 22, 27],
    "Rikta (Void / 4, 9, 14)": [3, 8, 13, 18, 23, 28],
    "Purna (Complete / 5, 10, 15, 30)": [4, 9, 14, 19, 24, 29]
}

TARABALA_DEFINITIONS = [
    ("Janma", "Danger to physical body / Initial effort", "Neutral/Caution", 0.5),
    ("Sampat", "Wealth, fortune and material prosperity", "Highly Auspicious", 1.0),
    ("Vipat", "Accidents, loss and adverse circumstances", "Inauspicious", 0.0),
    ("Kshema", "Well-being, safety and protection", "Auspicious", 1.0),
    ("Pratyak", "Obstacles, resistance and unexpected delays", "Inauspicious", 0.0),
    ("Sadhana", "Success, realization of ambitions & spiritual siddhi", "Highly Auspicious", 1.0),
    ("Naidhana", "Grave hazards, destruction and Vadha", "Highly Inauspicious", 0.0),
    ("Mitra", "Helpful, friendly support and harmony", "Auspicious", 1.0),
    ("Parama Mitra", "Supreme favor, great beneficence and intimacy", "Highly Auspicious", 1.0)
]

PARYAYA_NAMES = [
    "Prathama Paryaya (Cycle 1: Conscious / Personal Karma)",
    "Dvitiya Paryaya (Cycle 2: Material / Interpersonal Realm)",
    "Tritiya Paryaya (Cycle 3: Higher / Spiritual Realm)"
]

# Classical Ghataka Chakra Table (BV Raman - Muhurtha pg. 127)
# For each Janma Rasi, specifies the inauspicious Moon Rasi, Tithi Group, Weekday, Nakshatra, and Lagna
GHATAKA_CHAKRA_TABLE = {
    0: {"moon_sign": 0, "tithi_group": "Nanda", "weekday": 0, "nakshatra": 9, "lagna": 0},    # Aries -> Sun, Makha, Aries
    1: {"moon_sign": 5, "tithi_group": "Purna", "weekday": 6, "nakshatra": 12, "lagna": 1},   # Taurus -> Sat, Hasta, Taurus
    2: {"moon_sign": 10, "tithi_group": "Bhadra", "weekday": 1, "nakshatra": 14, "lagna": 3}, # Gemini -> Mon, Swati, Cancer
    3: {"moon_sign": 4, "tithi_group": "Bhadra", "weekday": 3, "nakshatra": 16, "lagna": 6},  # Cancer -> Wed, Anuradha, Libra
    4: {"moon_sign": 9, "tithi_group": "Jaya", "weekday": 6, "nakshatra": 18, "lagna": 9},   # Leo -> Sat, Mula, Capricorn
    5: {"moon_sign": 2, "tithi_group": "Purna", "weekday": 6, "nakshatra": 21, "lagna": 11}, # Virgo -> Sat, Shravana, Pisces
    6: {"moon_sign": 8, "tithi_group": "Rikta", "weekday": 4, "nakshatra": 23, "lagna": 5},  # Libra -> Thu, Shatabhisha, Virgo
    7: {"moon_sign": 1, "tithi_group": "Nanda", "weekday": 5, "nakshatra": 26, "lagna": 1},  # Scorpio -> Fri, Revati, Taurus
    8: {"moon_sign": 11, "tithi_group": "Jaya", "weekday": 5, "nakshatra": 0, "lagna": 8},   # Sagittarius -> Fri, Ashwini, Sagittarius
    9: {"moon_sign": 4, "tithi_group": "Rikta", "weekday": 2, "nakshatra": 3, "lagna": 10},  # Capricorn -> Tue, Rohini, Aquarius
    10: {"moon_sign": 8, "tithi_group": "Jaya", "weekday": 4, "nakshatra": 5, "lagna": 2},   # Aquarius -> Thu, Ardra, Gemini
    11: {"moon_sign": 10, "tithi_group": "Purna", "weekday": 4, "nakshatra": 8, "lagna": 4}  # Pisces -> Thu, Ashlesha, Leo
}

def calculate_tarabala(birth_nak_idx: int, target_nak_idx: int) -> Dict[str, Any]:
    """
    Computes Tarabala (Star Strength) from Janma Nakshatra to target transit Nakshatra.
    Formula: Count from birth nakshatra to target nakshatra, modulo 9.
    """
    if not (0 <= birth_nak_idx < 27) or not (0 <= target_nak_idx < 27):
        raise ValueError("Nakshatra index must be between 0 and 26.")

    count = ((target_nak_idx - birth_nak_idx) % 27) + 1
    tara_idx = (count - 1) % 9
    cycle_idx = (count - 1) // 9

    tara_name, meaning, auspiciousness, score = TARABALA_DEFINITIONS[tara_idx]

    is_auspicious = (tara_idx in [1, 3, 5, 7, 8])  # Sampat, Kshema, Sadhana, Mitra, Parama Mitra
    # Janma (index 0) in 3rd cycle is acceptable
    if tara_idx == 0 and cycle_idx == 2:
        is_auspicious = True
        auspiciousness = "Acceptable in 3rd Cycle (Spiritual Janma)"

    return {
        "birth_nakshatra": NAKSHATRAS[birth_nak_idx],
        "target_nakshatra": NAKSHATRAS[target_nak_idx],
        "distance": count,
        "tarabala_number": tara_idx + 1,
        "tarabala_name": tara_name,
        "meaning": meaning,
        "cycle_number": cycle_idx + 1,
        "cycle_name": PARYAYA_NAMES[cycle_idx],
        "auspiciousness": auspiciousness,
        "is_auspicious": is_auspicious,
        "score": score
    }

def calculate_chandrabala(birth_rasi_idx: int, target_rasi_idx: int) -> Dict[str, Any]:
    """
    Computes Chandrabala (Lunar Strength) from Janma Rasi to target transit Moon sign.
    Rule: Moon in 1, 3, 6, 7, 10, 11 from Janma Rasi is favorable.
          Moon in 2, 5, 9 is moderate.
          Moon in 4, 8, 12 is unfavorable (8 = Chandrashtama).
    """
    if not (0 <= birth_rasi_idx < 12) or not (0 <= target_rasi_idx < 12):
        raise ValueError("Rasi index must be between 0 and 11.")

    house_dist = ((target_rasi_idx - birth_rasi_idx) % 12) + 1

    if house_dist in [1, 3, 6, 7, 10, 11]:
        status = "Favorable"
        score = 1.0
        description = f"Transit Moon in House {house_dist} provides vitality, mental peace, and auspicious execution."
        is_chandrashtama = False
    elif house_dist in [2, 5, 9]:
        status = "Moderate / Tolerable"
        score = 0.5
        description = f"Transit Moon in House {house_dist} yields mixed results; requires steady discernment."
        is_chandrashtama = False
    else:  # 4, 8, 12
        status = "Inauspicious"
        score = 0.0
        is_chandrashtama = (house_dist == 8)
        if is_chandrashtama:
            description = "Chandrashtama (Transit Moon in 8th from Janma Rasi). Heightened emotional vulnerability; avoid major commitments."
        else:
            description = f"Transit Moon in House {house_dist} (Anishta Chandra). Energy drain or unnecessary friction."

    return {
        "birth_sign": SIGNS[birth_rasi_idx],
        "target_sign": SIGNS[target_rasi_idx],
        "house_from_moon": house_dist,
        "status": status,
        "score": score,
        "is_favorable": (score >= 0.5),
        "is_chandrashtama": is_chandrashtama,
        "description": description
    }

def get_ghataka_chakra(birth_rasi_idx: int) -> Dict[str, Any]:
    """
    Retrieves classical Ghataka (inauspicious) elements for a given Janma Rasi.
    """
    if not (0 <= birth_rasi_idx < 12):
        raise ValueError("Rasi index must be between 0 and 11.")

    data = GHATAKA_CHAKRA_TABLE[birth_rasi_idx]
    return {
        "janma_rasi": SIGNS[birth_rasi_idx],
        "ghataka_moon_sign": SIGNS[data["moon_sign"]],
        "ghataka_tithi_group": data["tithi_group"],
        "ghataka_weekday": WEEKDAYS[data["weekday"]],
        "ghataka_nakshatra": NAKSHATRAS[data["nakshatra"]],
        "ghataka_lagna": SIGNS[data["lagna"]],
        "rule": "Avoid undertaking new commercial, legal, or surgical ventures during Ghataka conjunctions."
    }

def evaluate_transit_timing(
    birth_rasi_idx: int,
    birth_nak_idx: int,
    transit_rasi_idx: int,
    transit_nak_idx: int,
    transit_tithi_num: int,
    transit_weekday_idx: int,
    transit_lagna_idx: int
) -> Dict[str, Any]:
    """
    Comprehensive timing synthesis uniting Tarabala, Chandrabala, and Ghataka Chakra filters.
    """
    tarabala = calculate_tarabala(birth_nak_idx, transit_nak_idx)
    chandrabala = calculate_chandrabala(birth_rasi_idx, transit_rasi_idx)
    ghataka = get_ghataka_chakra(birth_rasi_idx)

    # Check Ghataka hits
    g_data = GHATAKA_CHAKRA_TABLE[birth_rasi_idx]
    ghataka_afflictions = []

    if transit_rasi_idx == g_data["moon_sign"]:
        ghataka_afflictions.append(f"Ghataka Moon Sign ({SIGNS[transit_rasi_idx]})")
    if transit_nak_idx == g_data["nakshatra"]:
        ghataka_afflictions.append(f"Ghataka Nakshatra ({NAKSHATRAS[transit_nak_idx]})")
    if transit_weekday_idx == g_data["weekday"]:
        ghataka_afflictions.append(f"Ghataka Weekday ({WEEKDAYS[transit_weekday_idx]})")
    if transit_lagna_idx == g_data["lagna"]:
        ghataka_afflictions.append(f"Ghataka Lagna ({SIGNS[transit_lagna_idx]})")

    # Determine Tithi group of transit
    tithi_group_match = None
    for group_name, tithi_list in TITHI_GROUPS.items():
        if (transit_tithi_num - 1) in tithi_list:
            tithi_group_match = group_name.split(" ")[0]
            if tithi_group_match == g_data["tithi_group"]:
                ghataka_afflictions.append(f"Ghataka Tithi Group ({tithi_group_match})")
            break

    timing_score = (tarabala["score"] * 0.5) + (chandrabala["score"] * 0.5)
    if ghataka_afflictions:
        timing_score = max(0.0, timing_score - (0.25 * len(ghataka_afflictions)))

    if timing_score >= 0.75 and not ghataka_afflictions:
        overall_quality = "Optimal / Favorable Muhurta Window"
    elif timing_score >= 0.5:
        overall_quality = "Moderate Muhurta Window — Proceed with Care"
    else:
        overall_quality = "Challenging Muhurta Window — Postpone Critical Initiatives"

    return {
        "overall_quality": overall_quality,
        "timing_score": round(timing_score, 2),
        "tarabala": tarabala,
        "chandrabala": chandrabala,
        "ghataka_chakra": ghataka,
        "ghataka_afflictions": ghataka_afflictions,
        "has_ghataka_affliction": len(ghataka_afflictions) > 0
    }
