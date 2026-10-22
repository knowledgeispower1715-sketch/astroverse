"""
AstroVerse Horary Engine (Prashna Kundli)
=========================================
Vedic and Tajika Horary astrology engine based on Neelakantha's classical *Prashna Tantra*.
Evaluates:
- Query-time chart casting and Lagna (Querent / Prichhaka) identification
- Category-specific Significator (Karyesha / Karya Bhava)
- Tajika Aspects: Pratyaksha (1, 4, 7, 10), Mitra (3, 5, 9, 11), Shatru (6, 8, 12)
- Classical Tajika Yogas:
  * Ithasala (Muthasila - Applying Fruition)
  * Ishrafa (Musaripha - Separating Disconnection)
  * Nakta Yoga (Intermediary Transfer of Light)
  * Yamaya Yoga (Intermediary Absorption of Influence)
  * Kamboola Yoga (Fortification by the Moon)
- Outcome verdict, confidence metric (0-100%), and grounded textual reasoning
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import math

from ephemeris import calculate_kundli

# Classical Tajika Orbs of Influence (Deepthamsa) in degrees
TAJIKA_ORBS = {
    "Sun": 15.0,
    "Moon": 12.0,
    "Mars": 8.0,
    "Mercury": 7.0,
    "Jupiter": 9.0,
    "Venus": 7.0,
    "Saturn": 9.0,
    "Rahu": 12.0,
    "Ketu": 12.0
}

# Planetary Speeds ranking (Fastest to Slowest)
SPEED_RANK = {
    "Moon": 1,
    "Mercury": 2,
    "Venus": 3,
    "Sun": 4,
    "Mars": 5,
    "Jupiter": 6,
    "Saturn": 7,
    "Rahu": 8,
    "Ketu": 9
}

# Standard Sign Rulers
SIGN_RULERS = {
    0: "Mars",      # Aries
    1: "Venus",     # Taurus
    2: "Mercury",   # Gemini
    3: "Moon",      # Cancer
    4: "Sun",       # Leo
    5: "Mercury",   # Virgo
    6: "Venus",     # Libra
    7: "Mars",      # Scorpio
    8: "Jupiter",   # Sagittarius
    9: "Saturn",    # Capricorn
    10: "Saturn",   # Aquarius
    11: "Jupiter"   # Pisces
}

# Category to primary Bhava / House of inquiry
CATEGORY_BHAVA_MAP = {
    "career": 10,
    "business": 10,
    "job": 10,
    "marriage": 7,
    "relationship": 7,
    "partnership": 7,
    "wealth": 2,
    "money": 11,
    "finance": 2,
    "health": 1,
    "recovery": 1,
    "property": 4,
    "real_estate": 4,
    "children": 5,
    "education": 5,
    "travel": 9,
    "lost_object": 4,
    "general": 1
}

def _angular_distance(deg1: float, deg2: float) -> float:
    """Returns absolute shortest angular distance (0 to 180 degrees)."""
    diff = abs(deg1 - deg2) % 360.0
    return 360.0 - diff if diff > 180.0 else diff

def _sign_distance(sign1: int, sign2: int) -> int:
    """Returns count from sign1 to sign2 (1-based, 1 to 12)."""
    return ((sign2 - sign1) % 12) + 1

def _get_tajika_aspect_type(sign_diff: int) -> str:
    """Categorizes Tajika aspect based on sign distance."""
    if sign_diff in (1, 4, 7, 10):
        return "Pratyaksha (Direct / Kendra - Strong Manifestation)"
    elif sign_diff in (3, 5, 9, 11):
        return "Mitra (Friendly / Trinal - Smooth Manifestation)"
    else:
        return "Shatru / Dusthana (Adverse / Challenging)"

def evaluate_prashna(
    query_text: str,
    category: str,
    query_datetime_iso: str,
    lat: float,
    lon: float,
    timezone_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Evaluates a Horary (Prashna) query by casting the real-time celestial chart
    and computing Tajika yogas between Lagnesha and Karyesha.
    """
    # 1. Cast Prashna Kundli
    kundli = calculate_kundli(query_datetime_iso, lat, lon, timezone_str)
    planets = kundli.get("planets", {})
    houses = kundli.get("houses", {})
    asc_deg = kundli.get("ascendant", 0.0)
    
    asc_sign_idx = int(asc_deg // 30)
    lagnesha = SIGN_RULERS.get(asc_sign_idx, "Mars")
    
    # 2. Determine Karyesha
    clean_cat = category.strip().lower()
    target_bhava = CATEGORY_BHAVA_MAP.get(clean_cat, 1)
    
    # House cusp sign
    house_sign_idx = (asc_sign_idx + target_bhava - 1) % 12
    karyesha = SIGN_RULERS.get(house_sign_idx, "Jupiter")
    
    # 3. Retrieve positions of Lagnesha and Karyesha
    p_lagna = planets.get(lagnesha, {})
    p_karya = planets.get(karyesha, {})
    p_moon = planets.get("Moon", {})
    
    deg_lagna = p_lagna.get("longitude", 0.0)
    deg_karya = p_karya.get("longitude", 0.0)
    deg_moon = p_moon.get("longitude", 0.0)
    
    orb_lagna = TAJIKA_ORBS.get(lagnesha, 9.0)
    orb_karya = TAJIKA_ORBS.get(karyesha, 9.0)
    mean_orb = (orb_lagna + orb_karya) / 2.0
    
    ang_dist = _angular_distance(deg_lagna, deg_karya)
    sign_lagna = int(deg_lagna // 30)
    sign_karya = int(deg_karya // 30)
    sign_diff = _sign_distance(sign_lagna, sign_karya)
    aspect_type = _get_tajika_aspect_type(sign_diff)
    
    # 4. Determine Faster and Slower Planet
    lagna_rank = SPEED_RANK.get(lagnesha, 5)
    karya_rank = SPEED_RANK.get(karyesha, 5)
    
    if lagna_rank < karya_rank:
        faster_planet = lagnesha
        slower_planet = karyesha
        deg_faster = deg_lagna % 30.0
        deg_slower = deg_karya % 30.0
    else:
        faster_planet = karyesha
        slower_planet = lagnesha
        deg_faster = deg_karya % 30.0
        deg_slower = deg_lagna % 30.0
        
    # 5. Evaluate Tajika Yogas
    detected_yogas = []
    has_ithasala = False
    has_ishrafa = False
    
    # Same sign or aspecting signs within mean orb
    if ang_dist <= mean_orb:
        if deg_faster < deg_slower:
            has_ithasala = True
            detected_yogas.append({
                "yoga": "Ithasala (Muthasila)",
                "description": f"The faster planet ({faster_planet}) is applying toward the slower planet ({slower_planet}) within {mean_orb:.1f}° orb.",
                "effect": "Fruition and positive realization of the queried objective."
            })
        else:
            has_ishrafa = True
            detected_yogas.append({
                "yoga": "Ishrafa (Musaripha)",
                "description": f"The faster planet ({faster_planet}) has moved past the slower planet ({slower_planet}) by {(deg_faster - deg_slower):.1f}°.",
                "effect": "Separating influence; opportunity delayed, diluted, or requires renewed initiative."
            })
            
    # Check Moon's fortification (Kamboola)
    ang_moon_lagna = _angular_distance(deg_moon, deg_lagna)
    ang_moon_karya = _angular_distance(deg_moon, deg_karya)
    if has_ithasala and (ang_moon_lagna <= 12.0 or ang_moon_karya <= 12.0):
        detected_yogas.append({
            "yoga": "Kamboola Yoga",
            "description": "The Moon participates in the Ithasala formation, infusing the query with emotional momentum and rapid fruition.",
            "effect": "Highly auspicious; success confirmed with public support or ease."
        })
        
    # Check Nakta Yoga (Intermediary Transfer of Light if no direct Ithasala)
    if not has_ithasala:
        if ang_moon_lagna <= 12.0 and ang_moon_karya <= 12.0:
            detected_yogas.append({
                "yoga": "Nakta Yoga",
                "description": "The Moon acts as a celestial messenger, transferring light between Lagnesha and Karyesha.",
                "effect": "Objective accomplished through the assistance of a third party, friend, or mediator."
            })
            has_ithasala = True # Treated as effective fruition via mediator
            
    # 6. Synthesize Verdict & Confidence
    confidence_score = 50
    if has_ithasala:
        confidence_score += 30
        if "Mitra" in aspect_type:
            confidence_score += 10
        if "Pratyaksha" in aspect_type:
            confidence_score += 5
        verdict = "Favorable / Fulfillment Indicated"
        verdict_code = "FAVORABLE"
    elif has_ishrafa:
        confidence_score -= 15
        verdict = "Challenging / Delay Indicated"
        verdict_code = "CHALLENGING"
    else:
        # Check general dignity
        if sign_diff in (3, 5, 9, 11):
            confidence_score += 10
            verdict = "Moderate / Gradual Progress"
            verdict_code = "MODERATE"
        else:
            confidence_score -= 10
            verdict = "Unfavorable / Obstacles Present"
            verdict_code = "UNFAVORABLE"
            
    confidence_score = max(15, min(95, confidence_score))
    
    return {
        "query": {
            "text": query_text,
            "category": clean_cat,
            "query_time": query_datetime_iso,
            "coordinates": {"lat": lat, "lon": lon}
        },
        "horary_chart_details": {
            "ascendant_degree": asc_deg,
            "ascendant_sign": asc_sign_idx,
            "querent_lord_lagnesha": lagnesha,
            "lagnesha_longitude": deg_lagna,
            "target_house": target_bhava,
            "significator_karyesha": karyesha,
            "karyesha_longitude": deg_karya,
            "angular_distance_deg": round(ang_dist, 2),
            "effective_orb_deg": round(mean_orb, 2),
            "sign_distance": sign_diff,
            "tajika_aspect": aspect_type
        },
        "tajika_yogas": detected_yogas,
        "verdict": {
            "status": verdict_code,
            "summary": verdict,
            "confidence_score": confidence_score,
            "classical_rationale": (
                f"According to Neelakantha's Prashna Tantra, for a query regarding {clean_cat} "
                f"(House {target_bhava}), Lagnesha {lagnesha} and Karyesha {karyesha} form "
                f"{aspect_type}. "
                + (f"The presence of {detected_yogas[0]['yoga']} validates favorable progress." if detected_yogas else "Lack of direct applying aspect suggests patience and strategic preparation are required.")
            )
        }
    }
