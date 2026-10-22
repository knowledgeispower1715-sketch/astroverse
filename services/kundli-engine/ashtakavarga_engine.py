"""
Parashari Ashtakavarga Engine (Brihat Parashara Hora Shastra & BV Raman):
Calculates:
1. Bhinnashtakavarga (BAV): Benefic bindus (0-8) for the 7 classical planets
   (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) across all 12 zodiac signs
   evaluated from 8 cardinal reference points (7 planets + Lagna).
2. Sarvashtakavarga (SAV): Total benefic bindus per zodiac sign (Sum = 337 universally).
3. Strength categorization: Favorable (>= 28 bindus) vs Unfavorable (< 25 bindus).
"""

from typing import Dict, Any, List

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# Classical Parashari Benefic House Positions (Ashtakavarga System of Prediction - BV Raman pg. 9)
# Format: BENEFIC_HOUSES[MainPlanet][ReferencePoint] = [1-based house indices]
BENEFIC_HOUSES: Dict[str, Dict[str, List[int]]] = {
    "Sun": {
        "Sun": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Jupiter": [5, 6, 9, 11],
        "Moon": [3, 6, 10, 11],
        "Mercury": [3, 5, 6, 9, 10, 11, 12],
        "Venus": [6, 7, 12],
        "Lagna": [3, 4, 6, 10, 11, 12]
    },
    "Moon": {
        "Lagna": [3, 6, 10, 11],
        "Mars": [2, 3, 5, 6, 9, 10, 11],
        "Moon": [1, 3, 6, 7, 10, 11],
        "Sun": [3, 6, 7, 8, 10, 11],
        "Saturn": [3, 5, 6, 11],
        "Mercury": [1, 3, 4, 5, 7, 8, 10, 11],
        "Jupiter": [1, 4, 7, 8, 10, 11, 12],
        "Venus": [3, 4, 5, 7, 9, 10, 11]
    },
    "Mars": {
        "Sun": [3, 5, 6, 10, 11],
        "Lagna": [1, 3, 6, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Saturn": [1, 4, 7, 8, 9, 10, 11],
        "Mercury": [3, 5, 6, 11],
        "Venus": [6, 8, 11, 12],
        "Jupiter": [6, 10, 11, 12]
    },
    "Mercury": {
        "Venus": [1, 2, 3, 4, 5, 8, 9, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Jupiter": [6, 8, 11, 12],
        "Sun": [5, 6, 9, 11, 12],
        "Mercury": [1, 3, 5, 6, 9, 10, 11, 12],
        "Moon": [2, 4, 6, 8, 10, 11],
        "Lagna": [1, 2, 4, 6, 8, 10, 11]
    },
    "Jupiter": {
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
        "Sun": [1, 2, 3, 4, 7, 8, 9, 10, 11],
        "Venus": [2, 5, 6, 9, 10, 11],
        "Moon": [2, 5, 7, 9, 11],
        "Saturn": [3, 5, 6, 12],
        "Mercury": [1, 2, 4, 5, 6, 9, 10, 11],
        "Lagna": [1, 2, 4, 5, 6, 7, 9, 10, 11]
    },
    "Venus": {
        "Lagna": [1, 2, 3, 4, 5, 8, 9, 11],
        "Moon": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 10, 11],
        "Saturn": [3, 4, 5, 8, 9, 10, 11],
        "Sun": [8, 11, 12],
        "Jupiter": [5, 8, 9, 10, 11],
        "Mercury": [3, 5, 6, 9, 11],
        "Mars": [3, 5, 6, 9, 11, 12]
    },
    "Saturn": {
        "Saturn": [3, 5, 6, 11],
        "Mars": [3, 5, 6, 10, 11, 12],
        "Sun": [1, 2, 4, 7, 8, 10, 11],
        "Lagna": [1, 3, 4, 6, 10, 11],
        "Mercury": [6, 8, 9, 10, 11, 12],
        "Moon": [3, 6, 11],
        "Venus": [6, 11, 12],
        "Jupiter": [5, 6, 11, 12]
    }
}

PLANET_EXPECTED_TOTALS = {
    "Sun": 48,
    "Moon": 49,
    "Mars": 39,
    "Mercury": 54,
    "Jupiter": 56,
    "Venus": 52,
    "Saturn": 39
}

TOTAL_SAV_BINDUS = 337

def calculate_ashtakavarga(planets_d1: Dict[str, Any], lagna_sign: str) -> Dict[str, Any]:
    """
    Computes complete Bhinnashtakavarga (BAV) for the 7 classical planets and
    the aggregated Sarvashtakavarga (SAV) chart across all 12 signs.
    """
    if lagna_sign not in SIGNS:
        raise ValueError(f"Unknown lagna sign: {lagna_sign}")

    # Map reference point signs to 0-based sign index
    positions: Dict[str, int] = {}
    for planet in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        if planet not in planets_d1 or "sign" not in planets_d1[planet]:
            raise ValueError(f"Missing planet position in D1 chart: {planet}")
        p_sign = planets_d1[planet]["sign"]
        if p_sign not in SIGNS:
            raise ValueError(f"Invalid sign for {planet}: {p_sign}")
        positions[planet] = SIGNS.index(p_sign)

    positions["Lagna"] = SIGNS.index(lagna_sign)

    bav: Dict[str, Dict[str, int]] = {}
    sav_counts = [0] * 12
    planet_totals: Dict[str, int] = {}

    for planet, contributors in BENEFIC_HOUSES.items():
        planet_sign_counts = [0] * 12
        for contributor, houses in contributors.items():
            base_sign_idx = positions[contributor]
            for h in houses:
                target_sign_idx = (base_sign_idx + (h - 1)) % 12
                planet_sign_counts[target_sign_idx] += 1
                sav_counts[target_sign_idx] += 1

        bav[planet] = {SIGNS[i]: planet_sign_counts[i] for i in range(12)}
        planet_totals[planet] = sum(planet_sign_counts)

    sav = {SIGNS[i]: sav_counts[i] for i in range(12)}
    total_bindus = sum(sav_counts)

    # Invariant assertion: Total bindus across all signs in authentic Parashari SAV is always 337
    assert total_bindus == TOTAL_SAV_BINDUS, f"SAV total expected {TOTAL_SAV_BINDUS}, got {total_bindus}"

    auspicious_signs = [SIGNS[i] for i in range(12) if sav_counts[i] >= 28]
    challenging_signs = [SIGNS[i] for i in range(12) if sav_counts[i] < 25]
    moderate_signs = [SIGNS[i] for i in range(12) if 25 <= sav_counts[i] < 28]

    # Natal house evaluation (House 1 = Lagna sign)
    lagna_idx = positions["Lagna"]
    sav_by_house: Dict[int, Dict[str, Any]] = {}
    for h in range(1, 13):
        sign_idx = (lagna_idx + (h - 1)) % 12
        bindus = sav_counts[sign_idx]
        sav_by_house[h] = {
            "house": h,
            "sign": SIGNS[sign_idx],
            "bindus": bindus,
            "strength": "Auspicious" if bindus >= 28 else ("Challenging" if bindus < 25 else "Moderate")
        }

    return {
        "bhinnashtakavarga": bav,
        "sarvashtakavarga": sav,
        "sarvashtakavarga_by_house": sav_by_house,
        "total_bindus": total_bindus,
        "planet_totals": planet_totals,
        "auspicious_signs": auspicious_signs,
        "challenging_signs": challenging_signs,
        "moderate_signs": moderate_signs
    }
