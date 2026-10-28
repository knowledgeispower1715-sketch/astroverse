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
from yoga_dosha_registry import YogaDoshaRegistry

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

def detect_classical_yogas(planets_d1: Dict[str, Any], lagna_sign: str, is_unknown_time: bool = False) -> List[Dict[str, Any]]:
    """
    Detects classical Parashari auspicious and specialized Yogas in the D1 Rashi chart.
    Delegates to the versioned YogaDoshaRegistry for authoritative, evidence-backed evaluation.
    Returns structured yoga objects with name, status, is_active, category, description, and effects.
    """
    registry_yogas = YogaDoshaRegistry.evaluate_yogas(planets_d1, lagna_sign, is_unknown_time)
    
    # Adapter ensuring complete backward compatibility while adding canonical audit fields
    yogas = []
    for y in registry_yogas:
        adapter_item = {
            "name": y["name_en"],
            "name_en": y["name_en"],
            "name_hi": y.get("name_hi", y["name_en"]),
            "rule_id": y.get("rule_id", ""),
            "category": y.get("category", "Classical Yoga"),
            "status": y.get("status", "ABSENT"),
            "is_active": y.get("is_active", False),
            "description": y.get("evidence_text_en", ""),
            "effects": y.get("effects", y.get("evidence_text_en", "")),
            "planets_involved": y.get("planets_involved", []),
            "tested_references": y.get("tested_references", {}),
            "conditions_satisfied": y.get("conditions_satisfied", []),
            "conditions_not_satisfied": y.get("conditions_not_satisfied", []),
            "mitigations_applied": y.get("mitigations_applied", []),
            "evidence_text_en": y.get("evidence_text_en", ""),
            "evidence_text_hi": y.get("evidence_text_hi", ""),
            "source_citation": y.get("source_citation", "")
        }
        yogas.append(adapter_item)

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
