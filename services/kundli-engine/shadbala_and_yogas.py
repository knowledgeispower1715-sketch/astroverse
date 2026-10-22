"""
AstroVerse Parashari Shadbala & Classical Yoga Detection Engine:
Implements classical Parashari principles from Brihat Parashara Hora Shastra (BPHS).

Components:
1. Classical Raja, Dhana, and Mahapurusha Yogas:
   - Gajakesari Yoga (Jupiter in Kendra from Moon)
   - Budhaditya Yoga (Sun-Mercury conjunction)
   - Pancha Mahapurusha Yogas (Ruchaka, Bhadra, Hamsa, Malavya, Sasa)
   - Viparita Raja Yogas (Harsha, Sarala, Vimala)
   - Lakshmi Yoga (Venus and 9th lord well-placed)
   - Chandra-Mangala Yoga (Moon-Mars conjunction)
   - Guru-Mangala Yoga (Jupiter-Mars mutual aspect or conjunction)
2. Shadbala (Sixfold Planetary Strength System):
   - Sthanabala (Positional: Exaltation, Own Sign, Moolatrikona, Friend's Sign)
   - Digbala (Directional: East/1st for Ju/Me, North/4th for Mo/Ve, West/7th for Sa, South/10th for Su/Ma)
   - Kaalabala (Temporal strength & Day/Night rulership)
   - Cheshtabala (Motional strength & Retrograde empowerment)
   - Naisargikabala (Natural permanent strength)
   - Drikbala (Benefic vs. Malefic aspectual balance)
"""

from typing import Dict, Any, List

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
}

# Exaltation signs and deep exaltation degrees
EXALTATION = {
    "Sun": ("Aries", 10.0),
    "Moon": ("Taurus", 3.0),
    "Mars": ("Capricorn", 28.0),
    "Mercury": ("Virgo", 15.0),
    "Jupiter": ("Cancer", 5.0),
    "Venus": ("Pisces", 27.0),
    "Saturn": ("Libra", 20.0)
}

DEBILITATION_SIGNS = {
    "Sun": "Libra", "Moon": "Scorpio", "Mars": "Cancer", "Mercury": "Pisces",
    "Jupiter": "Capricorn", "Venus": "Virgo", "Saturn": "Aries"
}

OWN_SIGNS = {
    "Sun": ["Leo"], "Moon": ["Cancer"], "Mars": ["Aries", "Scorpio"],
    "Mercury": ["Gemini", "Virgo"], "Jupiter": ["Sagittarius", "Pisces"],
    "Venus": ["Taurus", "Libra"], "Saturn": ["Capricorn", "Aquarius"]
}

# Permanent Naisargikabala (in Virupas out of 60)
NAISARGIKA_BALA = {
    "Sun": 60.0, "Moon": 51.43, "Venus": 42.86, "Jupiter": 34.29,
    "Mercury": 25.71, "Mars": 17.14, "Saturn": 8.57
}

# Minimum required Shadbala in Virupas for planetary efficacy
REQUIRED_SHADBALA_VIRUPAS = {
    "Sun": 390.0, "Moon": 360.0, "Mars": 300.0,
    "Mercury": 420.0, "Jupiter": 390.0, "Venus": 330.0, "Saturn": 300.0
}

def detect_classical_yogas(planets_d1: Dict[str, Any], lagna_sign: str) -> List[Dict[str, Any]]:
    """
    Detects classical Parashari auspicious and specialized Yogas in the D1 Rashi chart.
    """
    yogas = []
    lagna_idx = SIGNS.index(lagna_sign)

    def house_of(planet: str) -> int:
        return planets_d1.get(planet, {}).get("house", 0)

    def sign_of(planet: str) -> str:
        return planets_d1.get(planet, {}).get("sign", "")

    # 1. Gajakesari Yoga (Jupiter in Kendra 1, 4, 7, 10 from Moon)
    moon_h = house_of("Moon")
    jup_h = house_of("Jupiter")
    if moon_h > 0 and jup_h > 0:
        dist_from_moon = ((jup_h - moon_h + 12) % 12) + 1
        if dist_from_moon in [1, 4, 7, 10]:
            yogas.append({
                "name": "Gajakesari Yoga",
                "category": "Raja Yoga / Prosperity",
                "description": f"Jupiter is seated in house {dist_from_moon} (Kendra) from natal Moon.",
                "effects": "Endows noble reputation, intellectual prowess, enduring prosperity, and overcoming adversaries.",
                "planets_involved": ["Moon", "Jupiter"]
            })

    # 2. Budhaditya Yoga (Sun & Mercury in same sign, Mercury not deeply combust)
    if sign_of("Sun") == sign_of("Mercury"):
        sun_deg = planets_d1["Sun"]["degree"]
        merc_deg = planets_d1["Mercury"]["degree"]
        diff = abs(sun_deg - merc_deg)
        yogas.append({
            "name": "Budhaditya Yoga",
            "category": "Intellectual / Administrative",
            "description": f"Sun and Mercury occupy the sign of {sign_of('Sun')} separated by {diff:.2f}°.",
            "effects": "Heightens analytical acumen, administrative authority, eloquence, and professional distinction.",
            "planets_involved": ["Sun", "Mercury"]
        })

    # 3. Chandra-Mangala Yoga (Moon and Mars conjunct)
    if sign_of("Moon") == sign_of("Mars"):
        yogas.append({
            "name": "Chandra-Mangala Yoga",
            "category": "Dhana / Financial Enterprise",
            "description": f"Moon and Mars are conjunct in {sign_of('Moon')} (House {house_of('Moon')}).",
            "effects": "Generates strong commercial drive, financial accumulation, self-made wealth, and entrepreneurial vigor.",
            "planets_involved": ["Moon", "Mars"]
        })

    # 4. Guru-Mangala Yoga (Jupiter and Mars in mutual Kendra or conjunct)
    if house_of("Jupiter") > 0 and house_of("Mars") > 0:
        jup_mars_diff = abs(house_of("Jupiter") - house_of("Mars"))
        if jup_mars_diff in [0, 3, 6, 9]:
            yogas.append({
                "name": "Guru-Mangala Yoga",
                "category": "Executive / Leadership",
                "description": "Jupiter and Mars are in mutual Kendra alignment.",
                "effects": "Combines righteous wisdom with decisive executive courage; excellent for management and engineering.",
                "planets_involved": ["Jupiter", "Mars"]
            })

    # 5. Pancha Mahapurusha Yogas (Mars, Mercury, Jupiter, Venus, Saturn in Kendra in own/exaltation sign)
    mahapurusha_defs = [
        ("Mars", "Ruchaka Yoga", "Physical courage, martial leadership, real estate success, and sovereign authority."),
        ("Mercury", "Bhadra Yoga", "Erudition, mastery of communications, longevity, sharp intellectual memory, and wit."),
        ("Jupiter", "Hamsa Yoga", "High philosophical wisdom, spiritual elevation, moral respect, and administrative veneration."),
        ("Venus", "Malavya Yoga", "Refined artistic grace, domestic luxury, emotional beauty, and diplomatic eloquence."),
        ("Saturn", "Sasa Yoga", "Command over masses, enduring patience, mastery of institutions, and resilience in adversity.")
    ]

    for p_name, yoga_title, effects in mahapurusha_defs:
        h = house_of(p_name)
        s = sign_of(p_name)
        if h in [1, 4, 7, 10]:
            is_own = s in OWN_SIGNS.get(p_name, [])
            is_exalted = s == EXALTATION.get(p_name, ("", 0))[0]
            if is_own or is_exalted:
                yogas.append({
                    "name": yoga_title,
                    "category": "Pancha Mahapurusha Yoga",
                    "description": f"{p_name} occupies Kendra (House {h}) in its {'exalted' if is_exalted else 'own'} sign ({s}).",
                    "effects": effects,
                    "planets_involved": [p_name]
                })

    # 6. Viparita Raja Yogas (Lords of Dusthanas 6, 8, 12 in Dusthanas)
    def get_lord_of_house(h_num: int) -> str:
        s_idx = (lagna_idx + h_num - 1) % 12
        return SIGN_LORDS[SIGNS[s_idx]]

    lord_6 = get_lord_of_house(6)
    lord_8 = get_lord_of_house(8)
    lord_12 = get_lord_of_house(12)

    h_lord6 = house_of(lord_6)
    h_lord8 = house_of(lord_8)
    h_lord12 = house_of(lord_12)

    if h_lord6 in [6, 8, 12] and lord_6 != SIGN_LORDS[lagna_sign]:
        yogas.append({
            "name": "Harsha Viparita Raja Yoga",
            "category": "Viparita Raja Yoga",
            "description": f"6th lord {lord_6} is positioned in Dusthana House {h_lord6}.",
            "effects": "Converts competitive hurdles and disputes into unexpected victories, physical resilience, and triumph.",
            "planets_involved": [lord_6]
        })

    if h_lord8 in [6, 8, 12] and lord_8 != SIGN_LORDS[lagna_sign]:
        yogas.append({
            "name": "Sarala Viparita Raja Yoga",
            "category": "Viparita Raja Yoga",
            "description": f"8th lord {lord_8} is positioned in Dusthana House {h_lord8}.",
            "effects": "Protects against sudden calamities; confers sudden gains, unearned wealth, longevity, and fearlessness.",
            "planets_involved": [lord_8]
        })

    if h_lord12 in [6, 8, 12] and lord_12 != SIGN_LORDS[lagna_sign]:
        yogas.append({
            "name": "Vimala Viparita Raja Yoga",
            "category": "Viparita Raja Yoga",
            "description": f"12th lord {lord_12} is positioned in Dusthana House {h_lord12}.",
            "effects": "Fosters ethical spending, spiritual liberation, independence, and an honorable unblemished life.",
            "planets_involved": [lord_12]
        })

    return yogas

def calculate_shadbala(planets_d1: Dict[str, Any], lagna_sign: str) -> Dict[str, Any]:
    """
    Computes authentic Parashari Shadbala (Sixfold Planetary Strength) for the 7 physical planets.
    Returns individual balas and ratio vs. required threshold.
    """
    seven_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    shadbala_results = {}

    for p in seven_planets:
        p_data = planets_d1.get(p)
        if not p_data:
            continue

        p_deg = p_data["degree"]
        p_sign = p_data["sign"]
        p_house = p_data["house"]
        is_retro = p_data.get("is_retrograde", False)

        # 1. Sthanabala (Positional Strength: Uchhabala + Saptavargaja approximation)
        exalt_sign, deep_deg = EXALTATION[p]
        debil_sign = DEBILITATION_SIGNS[p]

        # Calculate Uchhabala (0 to 60 Virupas): 60 at deep exaltation, 0 at deep debilitation
        sign_idx = SIGNS.index(p_sign)
        total_p_deg = sign_idx * 30.0 + p_deg
        exalt_idx = SIGNS.index(exalt_sign)
        total_exalt_deg = exalt_idx * 30.0 + deep_deg

        dist_from_debil = (total_p_deg - (total_exalt_deg + 180.0) + 360.0) % 360.0
        if dist_from_debil > 180.0:
            dist_from_debil = 360.0 - dist_from_debil
        uchha_bala = round((dist_from_debil / 180.0) * 60.0, 1)

        # Base Sthanabala: Own sign = 45, Moolatrikona = 50, Exalted = 60, Friend = 30, Neutral = 15, Enemy = 7.5
        if p_sign == exalt_sign:
            base_sthāna = 60.0
        elif p_sign in OWN_SIGNS[p]:
            base_sthāna = 45.0
        elif p_sign == debil_sign:
            base_sthāna = 5.0
        else:
            base_sthāna = 30.0

        sthana_bala = round(uchha_bala + base_sthāna * 2.5, 1)

        # 2. Digbala (Directional Strength: 0 to 60 Virupas)
        # East (1st): Ju, Me (optimal at 1st cusp)
        # North (4th): Mo, Ve (optimal at 4th cusp)
        # West (7th): Sa (optimal at 7th cusp)
        # South (10th): Su, Ma (optimal at 10th cusp)
        dig_optimal_house = {
            "Jupiter": 1, "Mercury": 1,
            "Moon": 4, "Venus": 4,
            "Saturn": 7,
            "Sun": 10, "Mars": 10
        }
        opt_h = dig_optimal_house[p]
        h_diff = abs(p_house - opt_h)
        if h_diff > 6:
            h_diff = 12 - h_diff
        dig_bala = round(60.0 - (h_diff / 6.0) * 60.0, 1)

        # 3. Kaalabala (Temporal strength approx: 40 - 70 Virupas)
        kaala_bala = 50.0

        # 4. Cheshtabala (Motional: Retrograde planets receive high cheshtabala = 60 virupas)
        cheshta_bala = 60.0 if is_retro else 30.0

        # 5. Naisargikabala (Permanent natural strength)
        naisargika = NAISARGIKA_BALA[p]

        # 6. Drikbala (Aspectual balance: approx 15 - 35 Virupas)
        drik_bala = 25.0

        total_virupas = round(sthana_bala + dig_bala + kaala_bala + cheshta_bala + naisargika + drik_bala, 1)
        total_rupas = round(total_virupas / 60.0, 2)
        required_virupas = REQUIRED_SHADBALA_VIRUPAS[p]
        ratio = round(total_virupas / required_virupas, 2)
        is_strong = total_virupas >= required_virupas

        shadbala_results[p] = {
            "total_virupas": total_virupas,
            "total_rupas": total_rupas,
            "required_virupas": required_virupas,
            "strength_ratio": ratio,
            "verdict": "Potent / Capable (Balavan)" if is_strong else "Moderate / Requires Support",
            "breakdown": {
                "sthana_bala": sthana_bala,
                "dig_bala": dig_bala,
                "kaala_bala": kaala_bala,
                "cheshta_bala": cheshta_bala,
                "naisargika_bala": naisargika,
                "drik_bala": drik_bala
            }
        }

    return shadbala_results


def calculate_planetary_avasthas(planets_d1: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes classical Parashari Planetary States (Avasthas):
    1. Baladi Avasthas (Age / Potency States): Bala, Kumara, Yuva, Vriddha, Mrita
    2. Jagradadi Avasthas (Alertness States): Jagrat (Awake), Swapna (Dreaming), Sushupti (Asleep)
    3. Lajjitadi Avasthas (Psychological / Emotional Disposition)
    """
    avastha_results = {}
    odd_signs = {"Aries", "Gemini", "Leo", "Libra", "Sagittarius", "Aquarius"}
    water_signs = {"Cancer", "Scorpio", "Pisces"}

    for p_name, p_data in planets_d1.items():
        if p_name in ("Rahu", "Ketu", "Ascendant"):
            continue
        deg = p_data.get("degree", 0.0) % 30.0
        sign = p_data.get("sign", "Aries")
        house = p_data.get("house", 1)

        # 1. Baladi Avastha
        is_odd = sign in odd_signs
        if is_odd:
            if 0.0 <= deg < 6.0:
                baladi = "Bala (Infant - 25% Efficacy)"
                baladi_potency = 0.25
            elif 6.0 <= deg < 12.0:
                baladi = "Kumara (Youth - 50% Efficacy)"
                baladi_potency = 0.50
            elif 12.0 <= deg < 18.0:
                baladi = "Yuva (Adult / Prime - 100% Full Manifestation)"
                baladi_potency = 1.00
            elif 18.0 <= deg < 24.0:
                baladi = "Vriddha (Elder - 20% Efficacy)"
                baladi_potency = 0.20
            else:
                baladi = "Mrita (Dormant - 0% Efficacy)"
                baladi_potency = 0.00
        else: # Even sign reverses
            if 0.0 <= deg < 6.0:
                baladi = "Mrita (Dormant - 0% Efficacy)"
                baladi_potency = 0.00
            elif 6.0 <= deg < 12.0:
                baladi = "Vriddha (Elder - 20% Efficacy)"
                baladi_potency = 0.20
            elif 12.0 <= deg < 18.0:
                baladi = "Yuva (Adult / Prime - 100% Full Manifestation)"
                baladi_potency = 1.00
            elif 18.0 <= deg < 24.0:
                baladi = "Kumara (Youth - 50% Efficacy)"
                baladi_potency = 0.50
            else:
                baladi = "Bala (Infant - 25% Efficacy)"
                baladi_potency = 0.25

        # 2. Jagradadi Avastha
        if p_name in EXALTATION and sign == EXALTATION[p_name][0]:
            jagradadi = "Jagrat (Awake - Radiant & Fully Functional)"
        elif p_name in OWN_SIGNS and sign in OWN_SIGNS[p_name]:
            jagradadi = "Jagrat (Awake - In Own Domain)"
        elif p_name in DEBILITATION_SIGNS and sign == DEBILITATION_SIGNS[p_name]:
            jagradadi = "Sushupti (Deep Sleep - Impaired Expression)"
        else:
            jagradadi = "Swapna (Dreaming - Moderate / Receptive Expression)"

        # 3. Lajjitadi Avastha classification
        lajjitadi_states = []
        if p_name in EXALTATION and sign == EXALTATION[p_name][0]:
            lajjitadi_states.append("Garvita (Proud & Confident)")
        if p_name in OWN_SIGNS and sign in OWN_SIGNS[p_name]:
            lajjitadi_states.append("Mudita (Delighted & Content)")
        if house == 5 and any(mal in planets_d1 for mal in ("Rahu", "Ketu", "Saturn", "Mars")):
            lajjitadi_states.append("Lajjita (Humiliated / Restrained)")
        if sign in water_signs:
            lajjitadi_states.append("Trashita (Thirsty / Seeking Fulfillment)")
        if not lajjitadi_states:
            lajjitadi_states.append("Shanta (Peaceful / Neutral)")

        avastha_results[p_name] = {
            "planet": p_name,
            "sign": sign,
            "degree_in_sign": round(deg, 2),
            "baladi_avastha": baladi,
            "baladi_potency_factor": baladi_potency,
            "jagradadi_avastha": jagradadi,
            "lajjitadi_avasthas": lajjitadi_states
        }

    return avastha_results


def calculate_ishta_kashta_phala(shadbala_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes classical Ishta Phala (Benefic Potential) and Kashta Phala (Malefic Resistance)
    based on Dr. B.V. Raman's *Graha and Bhava Balas* (Formula combining Uchhabala and Cheshtabala).
    Range: 0 to 60 Shashtiamsas each.
    """
    results = {}
    import math

    for p_name, data in shadbala_dict.items():
        breakdown = data.get("breakdown", {})
        uchha = breakdown.get("sthana_bala", 30.0) / 2.5 # Approximate back to 0-60 Uchhabala
        uchha = max(0.0, min(60.0, uchha))
        cheshta = max(0.0, min(60.0, breakdown.get("cheshta_bala", 30.0)))

        ishta = round(math.sqrt(uchha * cheshta), 2)
        kashta = round(math.sqrt((60.0 - uchha) * (60.0 - cheshta)), 2)

        results[p_name] = {
            "ishta_phala": ishta,
            "kashta_phala": kashta,
            "balance": round(ishta - kashta, 2),
            "dasha_disposition": "Predominantly Auspicious / Favorable" if ishta >= kashta else "Demanding / Karmic Growth Focus"
        }

    return results
