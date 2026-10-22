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

def calculate_hora(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D2 (Hora) Chart for wealth, financial capacity & speech:
    - Odd signs (Aries, Gemini, Leo, Libra, Sagittarius, Aquarius):
      0°-15°: Sun (Leo), 15°-30°: Moon (Cancer).
    - Even signs (Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces):
      0°-15°: Moon (Cancer), 15°-30°: Sun (Leo).
    """
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_deg_in_sign = lagna_d1_degree % 30.0
    is_lagna_odd = (lagna_sign_idx % 2 == 0)
    d2_lagna_sign_idx = (4 if lagna_deg_in_sign < 15.0 else 3) if is_lagna_odd else (3 if lagna_deg_in_sign < 15.0 else 4)

    d2_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        is_odd = (sign_idx % 2 == 0)
        d2_sign = (4 if deg_in_sign < 15.0 else 3) if is_odd else (3 if deg_in_sign < 15.0 else 4)
        d2_house = ((d2_sign - d2_lagna_sign_idx) % 12) + 1

        d2_planets[planet] = {
            "sign": SIGNS[d2_sign],
            "house": d2_house,
            "degree": round((deg_in_sign % 15.0) * 2, 2),
            "ruler": "Sun" if d2_sign == 4 else "Moon"
        }

    return {
        "d2_lagna": {"sign": SIGNS[d2_lagna_sign_idx]},
        "planets": d2_planets
    }

def calculate_drekkana(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D3 (Drekkana) Chart for siblings, courage & vitality:
    - 0°-10°: Same sign (1st house).
    - 10°-20°: 5th sign from it.
    - 20°-30°: 9th sign from it.
    """
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = int((lagna_d1_degree % 30.0) / 10.0)
    d3_lagna_sign_idx = (lagna_sign_idx + (lagna_part * 4)) % 12

    d3_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        part = int((total_deg % 30.0) / 10.0)
        d3_sign = (sign_idx + (part * 4)) % 12
        d3_house = ((d3_sign - d3_lagna_sign_idx) % 12) + 1

        d3_planets[planet] = {
            "sign": SIGNS[d3_sign],
            "house": d3_house,
            "degree": round((total_deg % 10.0) * 3, 2),
            "drekkana_number": part + 1
        }

    return {
        "d3_lagna": {"sign": SIGNS[d3_lagna_sign_idx]},
        "planets": d3_planets
    }

def calculate_saptamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D7 (Saptamsha) Chart for progeny, children & creative fruits:
    - 7 divisions of 4°17'08.57" each.
    - Odd signs: starts from the sign itself.
    - Even signs: starts from the 7th sign from it.
    """
    part_size = 30.0 / 7.0
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(6, int((lagna_d1_degree % 30.0) / part_size))
    is_lagna_odd = (lagna_sign_idx % 2 == 0)
    lagna_start = lagna_sign_idx if is_lagna_odd else (lagna_sign_idx + 6) % 12
    d7_lagna_sign_idx = (lagna_start + lagna_part) % 12

    d7_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        part = min(6, int(deg_in_sign / part_size))
        is_odd = (sign_idx % 2 == 0)
        start = sign_idx if is_odd else (sign_idx + 6) % 12
        d7_sign = (start + part) % 12
        d7_house = ((d7_sign - d7_lagna_sign_idx) % 12) + 1

        d7_planets[planet] = {
            "sign": SIGNS[d7_sign],
            "house": d7_house,
            "degree": round((deg_in_sign % part_size) * 7, 2),
            "amsha": part + 1
        }

    return {
        "d7_lagna": {"sign": SIGNS[d7_lagna_sign_idx]},
        "planets": d7_planets
    }

def calculate_dwadashamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D12 (Dwadashamsha) Chart for parents, ancestral lineage & past deeds:
    - 12 divisions of 2°30' each.
    - Counting starts from the sign itself for both odd and even signs.
    """
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(11, int((lagna_d1_degree % 30.0) / 2.5))
    d12_lagna_sign_idx = (lagna_sign_idx + lagna_part) % 12

    d12_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        part = min(11, int((total_deg % 30.0) / 2.5))
        d12_sign = (sign_idx + part) % 12
        d12_house = ((d12_sign - d12_lagna_sign_idx) % 12) + 1

        d12_planets[planet] = {
            "sign": SIGNS[d12_sign],
            "house": d12_house,
            "degree": round((total_deg % 2.5) * 12, 2)
        }

    return {
        "d12_lagna": {"sign": SIGNS[d12_lagna_sign_idx]},
        "planets": d12_planets
    }

def calculate_shashtyamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D60 (Shashtyamsha) Chart for subtle karmic imprint & general potential:
    - 60 divisions of 0°30' (30 arcminutes) each.
    - Odd signs: count starts from the sign itself.
    - Even signs: count starts from the 7th sign from it.
    """
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(59, int((lagna_d1_degree % 30.0) / 0.5))
    is_lagna_odd = (lagna_sign_idx % 2 == 0)
    lagna_start = lagna_sign_idx if is_lagna_odd else (lagna_sign_idx + 6) % 12
    d60_lagna_sign_idx = (lagna_start + lagna_part) % 12

    d60_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        part = min(59, int((total_deg % 30.0) / 0.5))
        is_odd = (sign_idx % 2 == 0)
        start = sign_idx if is_odd else (sign_idx + 6) % 12
        d60_sign = (start + part) % 12
        d60_house = ((d60_sign - d60_lagna_sign_idx) % 12) + 1

        d60_planets[planet] = {
            "sign": SIGNS[d60_sign],
            "house": d60_house,
            "degree": round((total_deg % 0.5) * 60, 2),
            "division_index": part + 1
        }

    return {
        "d60_lagna": {"sign": SIGNS[d60_lagna_sign_idx]},
        "planets": d60_planets
    }

def calculate_all_vargas(planets_d1: dict, lagna_d1_degree: float) -> dict:
    """Calculates all essential classical divisional charts (D1, D2, D3, D7, D9, D10, D12, D60)."""
    return {
        "D1": {"lagna": round(lagna_d1_degree, 2), "planets": planets_d1},
        "D2": calculate_hora(planets_d1, lagna_d1_degree),
        "D3": calculate_drekkana(planets_d1, lagna_d1_degree),
        "D7": calculate_saptamsha(planets_d1, lagna_d1_degree),
        "D9": calculate_navamsha(planets_d1, lagna_d1_degree),
        "D10": calculate_dashamsha(planets_d1, lagna_d1_degree),
        "D12": calculate_dwadashamsha(planets_d1, lagna_d1_degree),
        "D60": calculate_shashtyamsha(planets_d1, lagna_d1_degree)
    }
