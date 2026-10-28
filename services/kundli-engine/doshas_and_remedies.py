"""
Comprehensive Vedic Doshas & Classical Parashari Remedial Engine
================================================================
Implements authoritative rules from Brihat Parashara Hora Shastra,
Phaladeepika, and Muhurta Chintamani.
Synchronized with YogaDoshaRegistry for versioned canonical results.
"""

from typing import Dict, Any
from yoga_dosha_registry import YogaDoshaRegistry, SIGNS, DEFAULT_TRANSIT_SATURN_SIGN

# Lagna-specific gemstone and classical mantra associations
GEMSTONES_BY_LAGNA = {
    "Aries": {"primary": "Red Coral (Moonga)", "metal": "Copper/Gold", "mantra": "Om Kram Kreem Kroum Sah Bhaumaya Namah"},
    "Taurus": {"primary": "Diamond or White Zircon", "metal": "Silver/Platinum", "mantra": "Om Shum Shukraya Namah"},
    "Gemini": {"primary": "Emerald (Panna)", "metal": "Gold/Bronze", "mantra": "Om Bum Budhaya Namah"},
    "Cancer": {"primary": "Natural Pearl (Moti)", "metal": "Silver", "mantra": "Om Shram Shreem Shroum Sah Chandraya Namah"},
    "Leo": {"primary": "Ruby (Manik)", "metal": "Gold/Copper", "mantra": "Om Hram Hreem Hroum Sah Suryaya Namah"},
    "Virgo": {"primary": "Emerald (Panna)", "metal": "Gold/Silver", "mantra": "Om Bum Budhaya Namah"},
    "Libra": {"primary": "White Sapphire or Opal", "metal": "Silver/Platinum", "mantra": "Om Shum Shukraya Namah"},
    "Scorpio": {"primary": "Red Coral (Moonga)", "metal": "Copper", "mantra": "Om Kram Kreem Kroum Sah Bhaumaya Namah"},
    "Sagittarius": {"primary": "Yellow Sapphire (Pukhraj)", "metal": "Gold", "mantra": "Om Brim Brihaspataye Namah"},
    "Capricorn": {"primary": "Blue Sapphire (Neelam) or Amethyst", "metal": "Iron/Silver", "mantra": "Om Sham Shanaishcharaya Namah"},
    "Aquarius": {"primary": "Blue Sapphire (Neelam)", "metal": "Silver/Iron", "mantra": "Om Sham Shanaishcharaya Namah"},
    "Pisces": {"primary": "Yellow Sapphire (Pukhraj)", "metal": "Gold", "mantra": "Om Brim Brihaspataye Namah"}
}


def analyze_doshas_and_remedies(
    planets: Dict[str, Any],
    lagna_sign: str,
    is_unknown_time: bool = False,
    transit_saturn_sign: str = DEFAULT_TRANSIT_SATURN_SIGN,
    reference_date: str = None
) -> Dict[str, Any]:
    """
    Analyzes classical doshas and transit conditions using the authoritative YogaDoshaRegistry.
    Returns both structured canonical fields and backward-compatible properties.
    """
    reg_doshas = YogaDoshaRegistry.evaluate_doshas(planets, lagna_sign, is_unknown_time)
    reg_transits = YogaDoshaRegistry.evaluate_transits(planets, transit_saturn_sign, reference_date)

    manglik_reg = reg_doshas["manglik"]
    kaal_sarp_reg = reg_doshas["kaal_sarp"]
    sade_sati_reg = reg_transits["sade_sati"]
    kantaka_reg = reg_transits["kantaka_shani"]

    # Manglik backward-compatible adapter
    manglik_payload = {
        "rule_id": manglik_reg["rule_id"],
        "status": manglik_reg["status"],
        "has_dosha": manglik_reg["has_dosha"],
        "verdict": manglik_reg["verdict_en"],
        "verdict_hi": manglik_reg["verdict_hi"],
        "remedy": manglik_reg["remedy"]["mantra_transliteration"] if manglik_reg["remedy"] else "Mars is well-aligned. No remedial measures required.",
        "remedy_detail": manglik_reg["remedy"],
        "cancellations": manglik_reg["mitigations_applied"],
        "tested_references": manglik_reg["tested_references"],
        "evidence_text_en": manglik_reg["evidence_text_en"],
        "evidence_text_hi": manglik_reg["evidence_text_hi"],
        "source_citation": manglik_reg["source_citation"]
    }

    # Kaal Sarp backward-compatible adapter
    kalsarp_payload = {
        "rule_id": kaal_sarp_reg["rule_id"],
        "status": kaal_sarp_reg["status"],
        "has_dosha": kaal_sarp_reg["has_dosha"],
        "is_partial": kaal_sarp_reg["status"] == "CONDITIONAL",
        "verdict": kaal_sarp_reg["verdict_en"],
        "verdict_hi": kaal_sarp_reg["verdict_hi"],
        "description": kaal_sarp_reg["evidence_text_en"],
        "remedy": kaal_sarp_reg["remedy"]["mantra_transliteration"] if kaal_sarp_reg["remedy"] else "Chart is completely free from Rahu-Ketu entrapment.",
        "remedy_detail": kaal_sarp_reg["remedy"],
        "evidence_text_en": kaal_sarp_reg["evidence_text_en"],
        "evidence_text_hi": kaal_sarp_reg["evidence_text_hi"],
        "source_citation": kaal_sarp_reg["source_citation"]
    }

    # Sade Sati & Dhaiya backward-compatible adapter
    sade_sati_payload = {
        "rule_id": sade_sati_reg["rule_id"],
        "status": sade_sati_reg["status"],
        "is_active": sade_sati_reg["is_active"],
        "is_dhaiya": kantaka_reg["is_active"],
        "sade_sati_status": f"Active: {sade_sati_reg['phase_en']}" if sade_sati_reg["is_active"] else "Inactive: Clear of Sade Sati",
        "dhaiya_status": f"Active: {kantaka_reg['dhaiya_type_en']}" if kantaka_reg["is_active"] else "Inactive: No Active Dhaiya",
        "transit_saturn_sign": sade_sati_reg["transit_saturn_sign"],
        "natal_moon_sign": sade_sati_reg["natal_moon_sign"],
        "house_from_moon": sade_sati_reg["house_from_moon"],
        "phase": sade_sati_reg["phase_en"],
        "phase_hi": sade_sati_reg["phase_hi"],
        "classification": sade_sati_reg["phase_en"] if sade_sati_reg["is_active"] else kantaka_reg["dhaiya_type_en"],
        "description": sade_sati_reg["evidence_text_en"],
        "description_hi": sade_sati_reg["evidence_text_hi"],
        "remedy": sade_sati_reg["remedy"]["mantra_transliteration"] if sade_sati_reg["remedy"] else "No Saturn afflictions active at this time.",
        "remedy_detail": sade_sati_reg["remedy"]
    }

    kantaka_payload = {
        "rule_id": kantaka_reg["rule_id"],
        "status": kantaka_reg["status"],
        "is_active": kantaka_reg["is_active"],
        "dhaiya_type_en": kantaka_reg["dhaiya_type_en"],
        "dhaiya_type_hi": kantaka_reg["dhaiya_type_hi"],
        "house_from_moon": kantaka_reg["house_from_moon"],
        "evidence_text_en": kantaka_reg["evidence_text_en"],
        "evidence_text_hi": kantaka_reg["evidence_text_hi"],
        "remedy": kantaka_reg["remedy"]
    }

    return {
        "manglik": manglik_payload,
        "kalsarp": kalsarp_payload,
        "kaal_sarp": kalsarp_payload,  # Dual-key alias
        "sade_sati": sade_sati_payload,
        "kantaka_shani": kantaka_payload,
        "guru_chandal": reg_doshas["guru_chandal"],
        "grahan": reg_doshas["grahan"],
        "prescriptions": GEMSTONES_BY_LAGNA.get(lagna_sign, GEMSTONES_BY_LAGNA["Aries"])
    }
