"""
Divisional & Derived Charts Engine:
- Navamsha (D9): 1/9th division (3°20' per pada) for marriage, inner strength & soul purpose
- Dashamsha (D10): 1/10th division (3°00' per amsha) for career, profession & public authority
- Moon Chart (Chandra Lagna): Natal chart oriented with natal Moon as House 1
- Bhava Chalit: Actual planetary house boundaries based on mid-point cusps
"""

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# D9 Element starting signs: Fire(0)=>Aries(0), Earth(1)=>Cap(9), Air(2)=>Libra(6), Water(3)=>Cancer(3)
D9_ELEMENT_START = {0: 0, 1: 9, 2: 6, 3: 3}

def calculate_navamsha(planets_d1: dict, lagna_d1_degree: float):
    """Calculates D9 (Navamsha) Chart."""
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    pada_in_sign = int((lagna_d1_degree % 30.0) / (30.0 / 9.0))
    d9_lagna_sign_idx = (D9_ELEMENT_START[lagna_sign_idx % 4] + pada_in_sign) % 12

    navamsha_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        pada = int((total_deg % 30.0) / (30.0 / 9.0))
        d9_sign = (D9_ELEMENT_START[sign_idx % 4] + pada) % 12
        d9_house = ((d9_sign - d9_lagna_sign_idx) % 12) + 1

        navamsha_planets[planet] = {
            "sign": SIGNS[d9_sign],
            "house": d9_house,
            "degree": round((total_deg % (30.0 / 9.0)) * 9, 2),
            "is_vargottama": (sign_idx == d9_sign)
        }

    return {
        "d9_lagna": {"sign": SIGNS[d9_lagna_sign_idx]},
        "planets": navamsha_planets
    }

def calculate_dashamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D10 (Dashamsha) Chart for career & achievements:
    - Each sign is divided into 10 parts of 3°00' each.
    - Odd signs: start counting from the sign itself.
    - Even signs: start counting from the 9th sign from it.
    """
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    part_in_sign = int((lagna_d1_degree % 30.0) / 3.0)
    if lagna_sign_idx % 2 == 0:  # Odd sign (0-indexed: Aries=0, Gemini=2...)
        d10_lagna_sign_idx = (lagna_sign_idx + part_in_sign) % 12
    else:  # Even sign (Taurus=1, Cancer=3...)
        d10_lagna_sign_idx = (lagna_sign_idx + 8 + part_in_sign) % 12

    d10_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        part = int((total_deg % 30.0) / 3.0)

        if sign_idx % 2 == 0:
            d10_sign = (sign_idx + part) % 12
        else:
            d10_sign = (sign_idx + 8 + part) % 12

        d10_house = ((d10_sign - d10_lagna_sign_idx) % 12) + 1
        d10_planets[planet] = {
            "sign": SIGNS[d10_sign],
            "house": d10_house,
            "degree": round((total_deg % 3.0) * 10, 2)
        }

    return {
        "d10_lagna": {"sign": SIGNS[d10_lagna_sign_idx]},
        "planets": d10_planets
    }

def calculate_moon_chart(planets_d1: dict):
    """Calculates Chandra Lagna (Moon Chart) where Moon's sign is treated as House 1."""
    moon_sign_idx = SIGNS.index(planets_d1["Moon"]["sign"])
    moon_planets = {}

    for planet, data in planets_d1.items():
        planet_sign_idx = SIGNS.index(data["sign"])
        house = ((planet_sign_idx - moon_sign_idx) % 12) + 1
        moon_planets[planet] = {
            "sign": data["sign"],
            "house": house,
            "degree": data["degree"],
            "nakshatra": data.get("nakshatra", ""),
            "pada": data.get("pada", 1)
        }

    return {
        "moon_lagna": {"sign": SIGNS[moon_sign_idx]},
        "planets": moon_planets
    }

def calculate_chalit_chart(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates Bhava Chalit Chart:
    Determines actual Bhava positions by evaluating midpoint cusps (Sandhi).
    Each Bhava spans from (Cusp - 15°) to (Cusp + 15°).
    """
    chalit_planets = {}
    lagna_abs_deg = lagna_d1_degree

    for planet, data in planets_d1.items():
        planet_abs_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        # Distance from Lagna cusp in degrees
        distance = (planet_abs_deg - lagna_abs_deg + 360.0) % 360.0
        # Bhava 1 center is at Lagna degree (span: -15° to +15°)
        # Shifting by +15° aligns Bhava 1 to range [0, 30)
        shifted_deg = (distance + 15.0) % 360.0
        bhava_house = int(shifted_deg / 30.0) + 1

        chalit_planets[planet] = {
            "sign": data["sign"],
            "d1_house": data["house"],
            "chalit_house": bhava_house,
            "degree": data["degree"],
            "shifted": (data["house"] != bhava_house)
        }

    return {
        "lagna_cusp": round(lagna_d1_degree, 2),
        "planets": chalit_planets
    }
