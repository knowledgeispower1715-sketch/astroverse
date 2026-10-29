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

def calculate_chaturthamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D4 (Chaturthamsha / Turyamsha) Chart for fixed assets, property & luck:
    - 4 divisions of 7°30' each.
    - Part 1: Sign itself (1st)
    - Part 2: 4th from sign (+3 signs)
    - Part 3: 7th from sign (+6 signs)
    - Part 4: 10th from sign (+9 signs)
    """
    part_size = 7.5
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(3, int((lagna_d1_degree % 30.0) / part_size))
    d4_lagna_sign_idx = (lagna_sign_idx + lagna_part * 3) % 12

    d4_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        part = min(3, int(deg_in_sign / part_size))
        d4_sign = (sign_idx + part * 3) % 12
        d4_house = ((d4_sign - d4_lagna_sign_idx) % 12) + 1

        d4_planets[planet] = {
            "sign": SIGNS[d4_sign],
            "house": d4_house,
            "degree": round((deg_in_sign % part_size) * 4, 2)
        }

    return {
        "d4_lagna": {"sign": SIGNS[d4_lagna_sign_idx]},
        "planets": d4_planets
    }

def calculate_shodashamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D16 (Shodashamsha / Kalamsa) Chart for conveyances, vehicles & happiness:
    - 16 divisions of 1°52'30" (1.875°) each.
    - Movable signs (Aries, Cancer, Libra, Cap): start from Aries (0).
    - Fixed signs (Taurus, Leo, Scorpio, Aqua): start from Leo (4).
    - Dual signs (Gemini, Virgo, Sag, Pisces): start from Sagittarius (8).
    """
    part_size = 30.0 / 16.0
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(15, int((lagna_d1_degree % 30.0) / part_size))
    l_mod = lagna_sign_idx % 3
    l_start = 0 if l_mod == 0 else (4 if l_mod == 1 else 8)
    d16_lagna_sign_idx = (l_start + lagna_part) % 12

    d16_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        part = min(15, int(deg_in_sign / part_size))
        p_mod = sign_idx % 3
        p_start = 0 if p_mod == 0 else (4 if p_mod == 1 else 8)
        d16_sign = (p_start + part) % 12
        d16_house = ((d16_sign - d16_lagna_sign_idx) % 12) + 1

        d16_planets[planet] = {
            "sign": SIGNS[d16_sign],
            "house": d16_house,
            "degree": round((deg_in_sign % part_size) * 16, 2)
        }

    return {
        "d16_lagna": {"sign": SIGNS[d16_lagna_sign_idx]},
        "planets": d16_planets
    }

def calculate_vimshamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D20 (Vimshamsha) Chart for spiritual progress, upasana & devotion:
    - 20 divisions of 1°30' (1.5°) each.
    - Movable signs: starts from Aries (0).
    - Fixed signs: starts from Sagittarius (8).
    - Dual signs: starts from Leo (4).
    """
    part_size = 30.0 / 20.0
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(19, int((lagna_d1_degree % 30.0) / part_size))
    l_mod = lagna_sign_idx % 3
    l_start = 0 if l_mod == 0 else (8 if l_mod == 1 else 4)
    d20_lagna_sign_idx = (l_start + lagna_part) % 12

    d20_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        part = min(19, int(deg_in_sign / part_size))
        p_mod = sign_idx % 3
        p_start = 0 if p_mod == 0 else (8 if p_mod == 1 else 4)
        d20_sign = (p_start + part) % 12
        d20_house = ((d20_sign - d20_lagna_sign_idx) % 12) + 1

        d20_planets[planet] = {
            "sign": SIGNS[d20_sign],
            "house": d20_house,
            "degree": round((deg_in_sign % part_size) * 20, 2)
        }

    return {
        "d20_lagna": {"sign": SIGNS[d20_lagna_sign_idx]},
        "planets": d20_planets
    }

def calculate_chaturvimshamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D24 (Chaturvimshamsha / Siddhamsa) Chart for learning, scholarship & skill:
    - 24 divisions of 1°15' (1.25°) each.
    - Odd signs: starts from Leo (4).
    - Even signs: starts from Cancer (3).
    """
    part_size = 30.0 / 24.0
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(23, int((lagna_d1_degree % 30.0) / part_size))
    l_start = 4 if (lagna_sign_idx % 2 == 0) else 3
    d24_lagna_sign_idx = (l_start + lagna_part) % 12

    d24_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        part = min(23, int(deg_in_sign / part_size))
        p_start = 4 if (sign_idx % 2 == 0) else 3
        d24_sign = (p_start + part) % 12
        d24_house = ((d24_sign - d24_lagna_sign_idx) % 12) + 1

        d24_planets[planet] = {
            "sign": SIGNS[d24_sign],
            "house": d24_house,
            "degree": round((deg_in_sign % part_size) * 24, 2)
        }

    return {
        "d24_lagna": {"sign": SIGNS[d24_lagna_sign_idx]},
        "planets": d24_planets
    }

def calculate_saptavimshamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D27 (Saptavimshamsha / Bhamsha / Nakshatramsha) Chart for vitality & subconscious:
    - 27 divisions of 1°06'40" (30/27°) each.
    - Fire signs: starts from Aries (0).
    - Earth signs: starts from Cancer (3).
    - Air signs: starts from Libra (6).
    - Water signs: starts from Capricorn (9).
    """
    part_size = 30.0 / 27.0
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(26, int((lagna_d1_degree % 30.0) / part_size))
    l_start = (lagna_sign_idx % 4) * 3
    d27_lagna_sign_idx = (l_start + lagna_part) % 12

    d27_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        part = min(26, int(deg_in_sign / part_size))
        p_start = (sign_idx % 4) * 3
        d27_sign = (p_start + part) % 12
        d27_house = ((d27_sign - d27_lagna_sign_idx) % 12) + 1

        d27_planets[planet] = {
            "sign": SIGNS[d27_sign],
            "house": d27_house,
            "degree": round((deg_in_sign % part_size) * 27, 2)
        }

    return {
        "d27_lagna": {"sign": SIGNS[d27_lagna_sign_idx]},
        "planets": d27_planets
    }

def calculate_trimshamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D30 (Trimshamsha) Chart for adversities, arishta & subconscious flaws:
    - Unequal divisions based on classical Parashari degrees:
      Odd signs: 0-5 Mars(Aries), 5-10 Sat(Aquarius), 10-18 Jup(Sagittarius), 18-25 Merc(Gemini), 25-30 Ven(Libra)
      Even signs: 0-5 Ven(Taurus), 5-12 Merc(Virgo), 12-20 Jup(Pisces), 20-25 Sat(Capricorn), 25-30 Mars(Scorpio)
    """
    def _d30_sign_for(sign_idx: int, deg: float) -> int:
        d = deg % 30.0
        if sign_idx % 2 == 0:  # Odd sign (0-indexed: Aries=0)
            if d < 5.0: return 0    # Aries (Mars)
            elif d < 10.0: return 10 # Aquarius (Saturn)
            elif d < 18.0: return 8  # Sagittarius (Jupiter)
            elif d < 25.0: return 2  # Gemini (Mercury)
            else: return 6           # Libra (Venus)
        else:  # Even sign
            if d < 5.0: return 1     # Taurus (Venus)
            elif d < 12.0: return 5  # Virgo (Mercury)
            elif d < 20.0: return 11 # Pisces (Jupiter)
            elif d < 25.0: return 9  # Capricorn (Saturn)
            else: return 7           # Scorpio (Mars)

    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    d30_lagna_sign_idx = _d30_sign_for(lagna_sign_idx, lagna_d1_degree)

    d30_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        d30_sign = _d30_sign_for(sign_idx, deg_in_sign)
        d30_house = ((d30_sign - d30_lagna_sign_idx) % 12) + 1

        d30_planets[planet] = {
            "sign": SIGNS[d30_sign],
            "house": d30_house,
            "degree": round(deg_in_sign, 2)
        }

    return {
        "d30_lagna": {"sign": SIGNS[d30_lagna_sign_idx]},
        "planets": d30_planets
    }

def calculate_khavedamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D40 (Khavedamsha / Chatvarimshamsha) Chart for maternal lineage & auspicious results:
    - 40 divisions of 0°45' (0.75°) each.
    - Odd signs: starts from Aries (0).
    - Even signs: starts from Libra (6).
    """
    part_size = 0.75
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(39, int((lagna_d1_degree % 30.0) / part_size))
    l_start = 0 if (lagna_sign_idx % 2 == 0) else 6
    d40_lagna_sign_idx = (l_start + lagna_part) % 12

    d40_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        part = min(39, int(deg_in_sign / part_size))
        p_start = 0 if (sign_idx % 2 == 0) else 6
        d40_sign = (p_start + part) % 12
        d40_house = ((d40_sign - d40_lagna_sign_idx) % 12) + 1

        d40_planets[planet] = {
            "sign": SIGNS[d40_sign],
            "house": d40_house,
            "degree": round((deg_in_sign % part_size) * 40, 2)
        }

    return {
        "d40_lagna": {"sign": SIGNS[d40_lagna_sign_idx]},
        "planets": d40_planets
    }

def calculate_akshavedamsha(planets_d1: dict, lagna_d1_degree: float):
    """
    Calculates D45 (Akshavedamsha) Chart for character, ethical rectitude & overall destiny:
    - 45 divisions of 0°40' (2/3°) each.
    - Movable signs: starts from Aries (0).
    - Fixed signs: starts from Leo (4).
    - Dual signs: starts from Sagittarius (8).
    """
    part_size = 30.0 / 45.0
    lagna_sign_idx = int(lagna_d1_degree / 30.0) % 12
    lagna_part = min(44, int((lagna_d1_degree % 30.0) / part_size))
    l_mod = lagna_sign_idx % 3
    l_start = 0 if l_mod == 0 else (4 if l_mod == 1 else 8)
    d45_lagna_sign_idx = (l_start + lagna_part) % 12

    d45_planets = {}
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0) % 12
        deg_in_sign = total_deg % 30.0
        part = min(44, int(deg_in_sign / part_size))
        p_mod = sign_idx % 3
        p_start = 0 if p_mod == 0 else (4 if p_mod == 1 else 8)
        d45_sign = (p_start + part) % 12
        d45_house = ((d45_sign - d45_lagna_sign_idx) % 12) + 1

        d45_planets[planet] = {
            "sign": SIGNS[d45_sign],
            "house": d45_house,
            "degree": round((deg_in_sign % part_size) * 45, 2)
        }

    return {
        "d45_lagna": {"sign": SIGNS[d45_lagna_sign_idx]},
        "planets": d45_planets
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
    """Calculates all 16 classical Parashari divisional charts (Complete Shodashavarga Suite D1 through D60)."""
    return {
        "D1": {"lagna": round(lagna_d1_degree, 2), "planets": planets_d1},
        "D2": calculate_hora(planets_d1, lagna_d1_degree),
        "D3": calculate_drekkana(planets_d1, lagna_d1_degree),
        "D4": calculate_chaturthamsha(planets_d1, lagna_d1_degree),
        "D7": calculate_saptamsha(planets_d1, lagna_d1_degree),
        "D9": calculate_navamsha(planets_d1, lagna_d1_degree),
        "D10": calculate_dashamsha(planets_d1, lagna_d1_degree),
        "D12": calculate_dwadashamsha(planets_d1, lagna_d1_degree),
        "D16": calculate_shodashamsha(planets_d1, lagna_d1_degree),
        "D20": calculate_vimshamsha(planets_d1, lagna_d1_degree),
        "D24": calculate_chaturvimshamsha(planets_d1, lagna_d1_degree),
        "D27": calculate_saptavimshamsha(planets_d1, lagna_d1_degree),
        "D30": calculate_trimshamsha(planets_d1, lagna_d1_degree),
        "D40": calculate_khavedamsha(planets_d1, lagna_d1_degree),
        "D45": calculate_akshavedamsha(planets_d1, lagna_d1_degree),
        "D60": calculate_shashtyamsha(planets_d1, lagna_d1_degree)
    }
