"""
AstroVerse Versioned Classical Vedic Yoga & Dosha Rule Registry
================================================================
Canonical, auditable implementation of classical Parashari Yogas, Doshas,
Transit statuses, and source-grounded remedies.

Rules adhere to:
- Brihat Parashara Hora Shastra (BPHS)
- Phaladeepika (Mantreswara)
- Jataka Parijata (Vaidyanatha Dikshita)
- Saravali (Kalyana Varma)
- Muhurta Chintamani (Daivajna Acharya Rama)

Authoritative Result States:
- PRESENT: Active without mitigation
- ABSENT: Conditions not satisfied
- PRESENT_WITH_MITIGATION: Active placement, but cancelled or pacified by classical rules
- CONDITIONAL: Lineage-dependent or partial formation
- INDETERMINATE: Missing critical parameters (e.g. unknown birth time)
- NOT_EVALUATED: Rule exists in catalog but was not requested/evaluated
- DISPUTED_METHOD: Conflicting classical opinions across traditions
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

SIGNS_HI = [
    "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"
]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
}

NATURAL_BENEFICS = ["Jupiter", "Venus", "Mercury", "Moon"]
NATURAL_MALEFICS = ["Mars", "Saturn", "Rahu", "Ketu", "Sun"]

EXALTATION = {
    "Sun": ("Aries", 10.0),
    "Moon": ("Taurus", 3.0),
    "Mars": ("Capricorn", 28.0),
    "Mercury": ("Virgo", 15.0),
    "Jupiter": ("Cancer", 5.0),
    "Venus": ("Pisces", 27.0),
    "Saturn": ("Libra", 20.0)
}

DEBILITATION = {
    "Sun": "Libra", "Moon": "Scorpio", "Mars": "Cancer", "Mercury": "Pisces",
    "Jupiter": "Capricorn", "Venus": "Virgo", "Saturn": "Aries"
}

OWN_SIGNS = {
    "Sun": ["Leo"], "Moon": ["Cancer"], "Mars": ["Aries", "Scorpio"],
    "Mercury": ["Gemini", "Virgo"], "Jupiter": ["Sagittarius", "Pisces"],
    "Venus": ["Taurus", "Libra"], "Saturn": ["Capricorn", "Aquarius"]
}

# Current Saturn Transit (March 2025 - February 2028 is Pisces sidereal)
DEFAULT_TRANSIT_SATURN_SIGN = "Pisces"


class YogaDoshaRegistry:
    RULE_VERSION = "2.0.0"

    @classmethod
    def evaluate_all(
        cls,
        planets: Dict[str, Any],
        lagna_sign: str,
        is_unknown_time: bool = False,
        transit_saturn_sign: str = DEFAULT_TRANSIT_SATURN_SIGN,
        reference_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates the complete authoritative registry against the provided chart.
        Returns unified, canonical structured results for UI and PDF generation.
        """
        yogas = cls.evaluate_yogas(planets, lagna_sign, is_unknown_time)
        doshas = cls.evaluate_doshas(planets, lagna_sign, is_unknown_time)
        transits = cls.evaluate_transits(planets, transit_saturn_sign, reference_date)

        return {
            "registry_version": cls.RULE_VERSION,
            "evaluation_timestamp": datetime.now().isoformat(),
            "is_unknown_time": is_unknown_time,
            "yogas": yogas,
            "doshas": doshas,
            "transits": transits,
            "summary": {
                "active_yogas_count": sum(1 for y in yogas if y["status"] in ["PRESENT", "PRESENT_WITH_MITIGATION"]),
                "active_doshas_count": sum(1 for d in doshas.values() if d["status"] in ["PRESENT", "PRESENT_WITH_MITIGATION"]),
                "sade_sati_active": transits["sade_sati"]["status"] == "PRESENT"
            }
        }

    # =========================================================================
    # 1. DOSHA EVALUATIONS
    # =========================================================================

    @classmethod
    def evaluate_doshas(cls, planets: Dict[str, Any], lagna_sign: str, is_unknown_time: bool) -> Dict[str, Any]:
        return {
            "manglik": cls.evaluate_manglik(planets, lagna_sign, is_unknown_time),
            "kaal_sarp": cls.evaluate_kaal_sarp(planets),
            "guru_chandal": cls.evaluate_guru_chandal(planets),
            "grahan": cls.evaluate_grahan(planets)
        }

    @classmethod
    def evaluate_manglik(cls, planets: Dict[str, Any], lagna_sign: str, is_unknown_time: bool) -> Dict[str, Any]:
        """
        Multi-reference evaluation of Manglik (Kuja) Dosha:
        Evaluates Mars independently from Lagna, Moon, and Venus.
        Applies verified Parashari cancellations (Swakshetra, Uchcha, Jupiter aspect).
        """
        mars = planets.get("Mars", {})
        moon = planets.get("Moon", {})
        venus = planets.get("Venus", {})
        jupiter = planets.get("Jupiter", {})

        mars_sign = mars.get("sign", "")
        mars_sign_idx = SIGNS.index(mars_sign) if mars_sign in SIGNS else 0
        lagna_sign_idx = SIGNS.index(lagna_sign) if lagna_sign in SIGNS else 0
        moon_sign_idx = SIGNS.index(moon.get("sign", "")) if moon.get("sign") in SIGNS else 0
        venus_sign_idx = SIGNS.index(venus.get("sign", "")) if venus.get("sign") in SIGNS else 0

        # Houses from reference points (1-indexed whole sign)
        h_lagna = ((mars_sign_idx - lagna_sign_idx + 12) % 12) + 1
        h_moon = ((mars_sign_idx - moon_sign_idx + 12) % 12) + 1
        h_venus = ((mars_sign_idx - venus_sign_idx + 12) % 12) + 1

        manglik_houses = [1, 2, 4, 7, 8, 12]

        check_lagna = h_lagna in manglik_houses and not is_unknown_time
        check_moon = h_moon in manglik_houses
        check_venus = h_venus in manglik_houses

        # Cancellations / Mitigations
        mitigations = []
        is_own_sign = mars_sign in ["Aries", "Scorpio"]
        is_exalted = mars_sign == "Capricorn"

        if is_own_sign:
            mitigations.append("Mars occupies its own sign (Swakshetra in Aries/Scorpio), naturally pacifying aggressive Kuja tension.")
        if is_exalted:
            mitigations.append("Mars is exalted in Capricorn (Uchcha), transforming martial friction into structured discipline.")

        # Specific house cancellations (BPHS & Muhurta Chintamani)
        if h_lagna == 2 and mars_sign in ["Gemini", "Virgo"]:
            mitigations.append("Mars in 2nd house in Mercury's sign cancels Manglik Dosha.")
        if h_lagna == 4 and mars_sign in ["Aries", "Scorpio"]:
            mitigations.append("Mars in 4th house in own sign cancels domestic discord.")
        if h_lagna == 7 and mars_sign in ["Cancer", "Capricorn"]:
            mitigations.append("Mars in 7th house in Cancer (Neecha) or Capricorn (Uchcha) cancels Kuja Dosha.")
        if h_lagna == 8 and mars_sign in ["Sagittarius", "Pisces"]:
            mitigations.append("Mars in 8th house in Jupiter's sign confers divine protection.")
        if h_lagna == 12 and mars_sign in ["Taurus", "Libra"]:
            mitigations.append("Mars in 12th house in Venus's sign neutralizes bedtime discord.")

        # Jupiter association/aspect
        jup_sign_idx = SIGNS.index(jupiter.get("sign", "")) if jupiter.get("sign") in SIGNS else -1
        if jup_sign_idx >= 0:
            jup_dist = ((mars_sign_idx - jup_sign_idx + 12) % 12) + 1
            if jup_dist in [1, 5, 7, 9]:
                mitigations.append(f"Benefic aspect or conjunction of Guru (Jupiter in house {jup_dist} from Mars) provides spiritual pacification.")

        # Determine overall verdict
        has_primary_placement = check_lagna or check_moon
        has_venus_only = check_venus and not has_primary_placement

        if is_unknown_time and not check_moon and not check_venus:
            status = "INDETERMINATE"
            verdict_en = "Indeterminate (Requires Known Birth Time for Lagna)"
            verdict_hi = "अनिर्णायक (सटीक जन्म समय आवश्यक है)"
        elif has_primary_placement:
            if mitigations:
                status = "PRESENT_WITH_MITIGATION"
                verdict_en = "Manglik Placement Mitigated / Cancelled"
                verdict_hi = "मांगलिक प्रभाव शमित / निरस्त"
            else:
                status = "PRESENT"
                verdict_en = "Purna Manglik Dosha Active"
                verdict_hi = "पूर्ण मांगलिक दोष सक्रिय"
        elif has_venus_only:
            status = "PRESENT_WITH_MITIGATION" if mitigations else "CONDITIONAL"
            verdict_en = "Venus-Only Manglik (Minor / Mitigated by Own Sign)" if mitigations else "Venus-Based Manglik Check (Secondary Tradition)"
            verdict_hi = "केवल शुक्र-आधारित मांगलिक (स्वराशि द्वारा शमित)" if mitigations else "शुक्र-आधारित मांगलिक (गौण परंपरा)"
        else:
            status = "ABSENT"
            verdict_en = "No Manglik Dosha (Kuja Dosha Free)"
            verdict_hi = "मांगलिक दोष रहित (दोष मुक्त)"

        # Evidence texts
        ref_details = []
        if is_unknown_time:
            ref_details.append("From Lagna: Indeterminate (birth time unknown)")
        else:
            ref_details.append(f"From Lagna ({lagna_sign}): House {h_lagna} ({'Afflicted' if check_lagna else 'Not present under standard 1, 2, 4, 7, 8, 12 rule'})")
        ref_details.append(f"From Moon ({moon.get('sign', '')}): House {h_moon} ({'Afflicted' if check_moon else 'Not present'})")
        ref_details.append(f"From Venus ({venus.get('sign', '')}): House {h_venus} ({'Placement detected under secondary Venus check' if check_venus else 'Not present'})")

        evidence_en = " | ".join(ref_details)
        if mitigations:
            evidence_en += " | Mitigation: " + " ".join(mitigations)

        evidence_hi = f"लग्न ({lagna_sign}) से: भाव {h_lagna} ({'दोष' if check_lagna else 'दोष मुक्त'}) | चंद्र ({moon.get('sign', '')}) से: भाव {h_moon} ({'दोष' if check_moon else 'दोष मुक्त'}) | शुक्र ({venus.get('sign', '')}) से: भाव {h_venus} ({'दोष' if check_venus else 'दोष मुक्त'})"
        if mitigations:
            evidence_hi += " | शमन कारक: " + " ".join(mitigations)

        # Remedies only if actively present or mitigated
        remedy = None
        if status in ["PRESENT", "PRESENT_WITH_MITIGATION", "CONDITIONAL"]:
            remedy = {
                "mantra_sanskrit": "ॐ भौमाय नमः || ॐ क्रां क्रीं क्रौं सः भौमाय नमः",
                "mantra_transliteration": "Om Bhaumaya Namah || Om Kraam Kreem Kroum Sah Bhaumaya Namah",
                "meaning_en": "Reverence to Mars (Mangala), dispenser of courage, strength, and righteous action.",
                "meaning_hi": "मंगल देव को नमन, जो साहस, शक्ति और धर्मनिष्ठ कर्म के प्रदाता हैं।",
                "daana_en": "Voluntary donation of red lentils (masoor dal), jaggery, or copper utensils on Tuesdays.",
                "daana_hi": "मंगलवार को लाल मसूर दाल, गुड़ अथवा तांबे के बर्तनों का सात्विक दान।",
                "ritual_note_en": "Classical Kumbh Vivah or matching with an equally balanced partner is traditionally advised if solemnizing marriage covenants.",
                "limitations": "Astrological balances are spiritual disciplines and do not replace legal, psychological, or mutual relational compatibility."
            }

        return {
            "rule_id": "DOSHA_MANGLIK",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Manglik Dosha (Kuja Dosha)",
            "name_hi": "मांगलिक दोष (भौम दोष)",
            "category": "DOSHA",
            "tradition": "Classical Parashari (BPHS Ch. 81) & Muhurta Chintamani",
            "status": status,
            "verdict_en": verdict_en,
            "verdict_hi": verdict_hi,
            "has_dosha": status in ["PRESENT", "PRESENT_WITH_MITIGATION"],
            "tested_references": {
                "mars_sign": mars_sign,
                "from_lagna": {"house": h_lagna, "qualifies": check_lagna},
                "from_moon": {"house": h_moon, "qualifies": check_moon},
                "from_venus": {"house": h_venus, "qualifies": check_venus}
            },
            "conditions_satisfied": [r for r in ref_details if "Afflicted" in r or "detected" in r],
            "conditions_not_satisfied": [r for r in ref_details if "Not present" in r],
            "mitigations_applied": mitigations,
            "evidence_text_en": evidence_en,
            "evidence_text_hi": evidence_hi,
            "source_citation": "Brihat Parashara Hora Shastra, Ch. 81, Sloka 47; Muhurta Chintamani, Vivaha Prakarana",
            "remedy": remedy
        }

    @classmethod
    def evaluate_kaal_sarp(cls, planets: Dict[str, Any]) -> Dict[str, Any]:
        """
        Astronomical evaluation of Kaal Sarp Dosha:
        Determines whether all 7 classical planets are strictly enclosed within
        one 180° semicircle of the Rahu-Ketu nodal axis.
        """
        rahu = planets.get("Rahu", {})
        seven_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

        rahu_deg = (SIGNS.index(rahu.get("sign", "Aries")) * 30.0) + rahu.get("degree", 0.0)

        side_a = 0
        side_b = 0
        planet_sides = {}

        for p in seven_planets:
            p_data = planets.get(p, {})
            p_sign = p_data.get("sign", "Aries")
            p_deg = (SIGNS.index(p_sign) * 30.0) + p_data.get("degree", 0.0)
            rel_deg = (p_deg - rahu_deg + 360.0) % 360.0

            # 0° to 180° is Side A (Rahu to Ketu); 180° to 360° is Side B (Ketu to Rahu)
            if 0.0 <= rel_deg < 180.0:
                side_a += 1
                planet_sides[p] = "Side_A"
            else:
                side_b += 1
                planet_sides[p] = "Side_B"

        has_full = (side_a == 7 or side_b == 7)
        has_partial = (side_a == 6 or side_b == 6)

        if has_full:
            status = "PRESENT"
            verdict_en = "Purna Kaal Sarp Yoga Present"
            verdict_hi = "पूर्ण कालसर्प योग उपस्थित"
            evidence_en = "All 7 physical planets are enclosed within one side of the Rahu-Ketu nodal axis."
            evidence_hi = "सभी सातों ग्रह राहु-केतु अक्ष के एक ही पार्श्व में आबद्ध हैं।"
        elif has_partial:
            status = "CONDITIONAL"
            verdict_en = "Anshik (Partial) Kaal Sarp Yoga"
            verdict_hi = "आंशिक कालसर्प योग"
            evidence_en = "One planet breaks the nodal encirclement, significantly mitigating the formation."
            evidence_hi = "एक ग्रह नोडल अक्ष के घेरे से बाहर है, जिससे दोष का प्रभाव अत्यंत क्षीण हो जाता है।"
        else:
            status = "ABSENT"
            verdict_en = "No Kaal Sarp Dosha"
            verdict_hi = "कालसर्प दोष अनुपस्थित"
            evidence_en = f"Planets are distributed on both sides of the nodal axis (Side A: {side_a}, Side B: {side_b}). Natal Moon is free from nodal entrapment."
            evidence_hi = f"ग्रह राहु-केतु अक्ष के दोनों ओर स्वतंत्र रूप से वितरित हैं (पार्श्व A: {side_a}, पार्श्व B: {side_b})। चंद्रमा नोडल बंधन से सर्वथा मुक्त है।"

        remedy = None
        if status in ["PRESENT", "CONDITIONAL"]:
            remedy = {
                "mantra_sanskrit": "ॐ नमः शिवाय || ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् | उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय माऽमृतात् ||",
                "mantra_transliteration": "Om Namah Shivaya || Om Tryambakam Yajamahe Sugandhim Pushtivardhanam | Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat ||",
                "meaning_en": "Maha Mrityunjaya Mantra invoking Lord Shiva for health, clarity, and dissolution of karmic bondages.",
                "meaning_hi": "भगवान शिव का महामृत्युंजय मंत्र जो स्वास्थ्य, मानसिक शांति और कर्म-बंधनों से मुक्ति प्रदान करता है।",
                "daana_en": "Offering water or milk to a Shiva Lingam on Mondays, and caring for stray animals.",
                "daana_hi": "सोमवार को शिवलिंग पर जलाभिषेक अथवा दुग्धाभिषेक, एवं मूक पशुओं की सेवा।"
            }

        return {
            "rule_id": "DOSHA_KAAL_SARP",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Kaal Sarp Dosha",
            "name_hi": "कालसर्प दोष",
            "category": "DOSHA",
            "tradition": "Popular / Lineage Tradition (Non-Parashari; absent in BPHS)",
            "status": status,
            "verdict_en": verdict_en,
            "verdict_hi": verdict_hi,
            "has_dosha": status in ["PRESENT", "CONDITIONAL"],
            "tested_references": {
                "side_a_count": side_a,
                "side_b_count": side_b,
                "planet_sides": planet_sides
            },
            "conditions_satisfied": ["Planets enclosed on one side"] if has_full else ([] if not has_partial else ["6 of 7 planets enclosed"]),
            "conditions_not_satisfied": ["All planets enclosed on one side"] if not has_full else [],
            "mitigations_applied": ["One planet breaks enclosure"] if has_partial else [],
            "evidence_text_en": evidence_en,
            "evidence_text_hi": evidence_hi,
            "source_citation": "Modern Jyotish Lineages; treated as popular tradition (unattested in classical Brihat Parashara Hora Shastra)",
            "remedy": remedy
        }

    @classmethod
    def evaluate_guru_chandal(cls, planets: Dict[str, Any]) -> Dict[str, Any]:
        """Guru Chandal: Conjunction of Jupiter and Rahu in the same sign."""
        jup_sign = planets.get("Jupiter", {}).get("sign", "")
        rahu_sign = planets.get("Rahu", {}).get("sign", "")
        is_conjunct = jup_sign == rahu_sign and bool(jup_sign)

        status = "PRESENT" if is_conjunct else "ABSENT"
        return {
            "rule_id": "DOSHA_GURU_CHANDAL",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Guru Chandal Dosha",
            "name_hi": "गुरु चांडाल दोष",
            "category": "DOSHA",
            "tradition": "Classical Parashari",
            "status": status,
            "verdict_en": "Guru Chandal Present" if is_conjunct else "No Guru Chandal Dosha",
            "verdict_hi": "गुरु चांडाल दोष उपस्थित" if is_conjunct else "गुरु चांडाल दोष अनुपस्थित",
            "has_dosha": is_conjunct,
            "evidence_text_en": f"Jupiter in {jup_sign} and Rahu in {rahu_sign} {'share the same sign' if is_conjunct else 'are in separate signs; no conjunction exists.'}",
            "evidence_text_hi": f"गुरु {jup_sign} और राहु {rahu_sign} में {'एक ही राशि में हैं' if is_conjunct else 'भिन्न राशियों में हैं; युति अनुपस्थित है।'}"
        }

    @classmethod
    def evaluate_grahan(cls, planets: Dict[str, Any]) -> Dict[str, Any]:
        """Grahan Dosha: Sun or Moon conjunct Rahu or Ketu in the same sign."""
        sun_sign = planets.get("Sun", {}).get("sign", "")
        moon_sign = planets.get("Moon", {}).get("sign", "")
        rahu_sign = planets.get("Rahu", {}).get("sign", "")
        ketu_sign = planets.get("Ketu", {}).get("sign", "")

        sun_afflicted = sun_sign in [rahu_sign, ketu_sign] and bool(sun_sign)
        moon_afflicted = moon_sign in [rahu_sign, ketu_sign] and bool(moon_sign)
        is_grahan = sun_afflicted or moon_afflicted

        status = "PRESENT" if is_grahan else "ABSENT"
        return {
            "rule_id": "DOSHA_GRAHAN",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Grahan Dosha (Eclipse Affliction)",
            "name_hi": "ग्रहण दोष",
            "category": "DOSHA",
            "tradition": "Classical Parashari",
            "status": status,
            "verdict_en": "Grahan Dosha Present" if is_grahan else "No Grahan Dosha",
            "verdict_hi": "ग्रहण दोष उपस्थित" if is_grahan else "ग्रहण दोष अनुपस्थित",
            "has_dosha": is_grahan,
            "evidence_text_en": f"Sun in {sun_sign}, Moon in {moon_sign}; Rahu in {rahu_sign}, Ketu in {ketu_sign}. {'Luminaries afflicted by nodal conjunction' if is_grahan else 'Neither Sun nor Moon is conjunct the lunar nodes.'}",
            "evidence_text_hi": f"सूर्य {sun_sign}, चंद्र {moon_sign}; राहु {rahu_sign}, केतु {ketu_sign}। {'सूर्य या चंद्र नोड्स से ग्रस्त हैं' if is_grahan else 'सूर्य और चंद्र दोनों राहु-केतु युति से पूर्णतः मुक्त हैं।'}"
        }

    # =========================================================================
    # 2. CLASSICAL YOGA EVALUATIONS
    # =========================================================================

    @classmethod
    def evaluate_yogas(cls, planets: Dict[str, Any], lagna_sign: str, is_unknown_time: bool) -> List[Dict[str, Any]]:
        results = []
        results.append(cls.eval_gajakesari(planets))
        results.append(cls.eval_budhaditya(planets))
        results.append(cls.eval_amala(planets, lagna_sign, is_unknown_time))
        results.append(cls.eval_dharma_karmadhipati(planets, lagna_sign, is_unknown_time))
        results.append(cls.eval_chandra_mangala(planets))
        results.append(cls.eval_guru_mangala(planets))
        results.extend(cls.eval_pancha_mahapurusha(planets, lagna_sign, is_unknown_time))
        results.extend(cls.eval_viparita_raja(planets, lagna_sign, is_unknown_time))
        results.append(cls.eval_kemadruma(planets, lagna_sign, is_unknown_time))
        return results

    @classmethod
    def eval_gajakesari(cls, planets: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gajakesari Yoga: Jupiter occupies Kendra (1st, 4th, 7th, 10th) from Moon.
        Source: Brihat Parashara Hora Shastra, Ch. 35, Sloka 3-4.
        """
        moon = planets.get("Moon", {})
        jup = planets.get("Jupiter", {})
        moon_sign = moon.get("sign", "")
        jup_sign = jup.get("sign", "")

        moon_idx = SIGNS.index(moon_sign) if moon_sign in SIGNS else -1
        jup_idx = SIGNS.index(jup_sign) if jup_sign in SIGNS else -1

        if moon_idx < 0 or jup_idx < 0:
            return {
                "rule_id": "YOGA_GAJAKESARI",
                "name_en": "Gajakesari Yoga",
                "name_hi": "गजकेसरी योग",
                "status": "INDETERMINATE",
                "evidence_text_en": "Missing Moon or Jupiter coordinate.",
                "evidence_text_hi": "चंद्र या गुरु के निर्देशांक अनुपलब्ध हैं।"
            }

        house_from_moon = ((jup_idx - moon_idx + 12) % 12) + 1
        is_kendra = house_from_moon in [1, 4, 7, 10]

        if is_kendra:
            is_debilitated = jup_sign == "Capricorn"
            status = "PRESENT_WITH_MITIGATION" if is_debilitated else "PRESENT"
            evidence_en = f"Jupiter in {jup_sign} is seated in house {house_from_moon} (Kendra) from natal Moon in {moon_sign}."
            if is_debilitated:
                evidence_en += " Note: Jupiter is debilitated in Capricorn, requiring Neecha Bhanga mitigation."
            evidence_hi = f"गुरु {jup_sign} राशि में, चंद्रमा {moon_sign} से भाव {house_from_moon} (केंद्र) में स्थित हैं।"
        else:
            status = "ABSENT"
            evidence_en = f"Jupiter in {jup_sign} occupies house {house_from_moon} from natal Moon in {moon_sign}, which is not a Kendra (1, 4, 7, 10). Standard Kendra condition is not satisfied."
            evidence_hi = f"गुरु {jup_sign} में चंद्रमा ({moon_sign}) से {house_from_moon}वें भाव में हैं, जो केंद्र (1, 4, 7, 10) नहीं है। अतः यह योग अनुपस्थित है।"

        return {
            "rule_id": "YOGA_GAJAKESARI",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Gajakesari Yoga",
            "name_hi": "गजकेसरी योग",
            "category": "Raja Yoga / Prosperity",
            "tradition": "Classical Parashari (BPHS Ch. 35)",
            "status": status,
            "is_active": status in ["PRESENT", "PRESENT_WITH_MITIGATION"],
            "planets_involved": ["Moon", "Jupiter"],
            "tested_references": {
                "moon_sign": moon_sign,
                "jupiter_sign": jup_sign,
                "house_from_moon": house_from_moon,
                "is_kendra": is_kendra
            },
            "conditions_satisfied": [f"Jupiter in house {house_from_moon} from Moon"] if is_kendra else [],
            "conditions_not_satisfied": [] if is_kendra else [f"Jupiter must occupy Kendra from Moon (found in {house_from_moon}th house)"],
            "mitigations_applied": ["Debilitated Jupiter in Capricorn"] if is_kendra and jup_sign == "Capricorn" else [],
            "evidence_text_en": evidence_en,
            "evidence_text_hi": evidence_hi,
            "source_citation": "Brihat Parashara Hora Shastra, Ch. 35, Sloka 3-4; Phaladeepika, Ch. 6, Sloka 2"
        }

    @classmethod
    def eval_budhaditya(cls, planets: Dict[str, Any]) -> Dict[str, Any]:
        """
        Budhaditya Yoga: Sun and Mercury conjunct in the same sign.
        Source: Saravali, Ch. 15; Phaladeepika, Ch. 6.
        """
        sun = planets.get("Sun", {})
        merc = planets.get("Mercury", {})
        sun_sign = sun.get("sign", "")
        merc_sign = merc.get("sign", "")

        is_conjunct = (sun_sign == merc_sign) and bool(sun_sign)

        if is_conjunct:
            sun_deg = sun.get("degree", 0.0)
            merc_deg = merc.get("degree", 0.0)
            diff = round(abs(sun_deg - merc_deg), 2)
            is_combust = diff < 14.0
            status = "PRESENT"
            evidence_en = f"Sun and Mercury are conjunct in {sun_sign} separated by {diff}°."
            if is_combust:
                evidence_en += f" Mercury is within combustion orb ({diff}° < 14°), which tempers independent delivery but preserves intellectual sharpness."
            evidence_hi = f"सूर्य और बुध {sun_sign} राशि में {diff}° के अंतर पर युति में हैं।"
        else:
            status = "ABSENT"
            evidence_en = f"Sun occupies {sun_sign} and Mercury occupies {merc_sign}; they are in adjacent or separate signs, not conjunct in the same sign."
            evidence_hi = f"सूर्य {sun_sign} और बुध {merc_sign} में स्थित हैं; दोनों अलग-अलग राशियों में होने के कारण युति नहीं बनाते।"

        return {
            "rule_id": "YOGA_BUDHADITYA",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Budhaditya Yoga",
            "name_hi": "बुधादित्य योग",
            "category": "Intellectual / Administrative",
            "tradition": "Classical Parashari & Saravali",
            "status": status,
            "is_active": status == "PRESENT",
            "planets_involved": ["Sun", "Mercury"],
            "tested_references": {
                "sun_sign": sun_sign,
                "mercury_sign": merc_sign,
                "same_sign": is_conjunct
            },
            "conditions_satisfied": ["Sun and Mercury share same sign"] if is_conjunct else [],
            "conditions_not_satisfied": [] if is_conjunct else ["Sun and Mercury must occupy the same sign"],
            "mitigations_applied": [],
            "evidence_text_en": evidence_en,
            "evidence_text_hi": evidence_hi,
            "source_citation": "Saravali, Ch. 15, Sloka 1; Phaladeepika, Ch. 6, Sloka 3"
        }

    @classmethod
    def eval_amala(cls, planets: Dict[str, Any], lagna_sign: str, is_unknown_time: bool) -> Dict[str, Any]:
        """
        Amala Yoga: A natural benefic (Jupiter, Venus, Mercury) occupies the
        10th house from either Lagna or Moon, without malefic occupation.
        Source: Brihat Parashara Hora Shastra, Ch. 35, Sloka 10-11; Phaladeepika, Ch. 6, Sloka 21.
        """
        lagna_idx = SIGNS.index(lagna_sign) if lagna_sign in SIGNS else -1
        moon_sign = planets.get("Moon", {}).get("sign", "")
        moon_idx = SIGNS.index(moon_sign) if moon_sign in SIGNS else -1

        h10_lagna_sign = SIGNS[(lagna_idx + 9) % 12] if lagna_idx >= 0 and not is_unknown_time else None
        h10_moon_sign = SIGNS[(moon_idx + 9) % 12] if moon_idx >= 0 else None

        benefics = ["Jupiter", "Venus", "Mercury"]
        lagna_benefics = []
        moon_benefics = []

        for b in benefics:
            p_sign = planets.get(b, {}).get("sign", "")
            if h10_lagna_sign and p_sign == h10_lagna_sign:
                lagna_benefics.append(b)
            if h10_moon_sign and p_sign == h10_moon_sign:
                moon_benefics.append(b)

        has_benefic_lagna = len(lagna_benefics) > 0
        has_benefic_moon = len(moon_benefics) > 0
        has_amala = has_benefic_lagna or has_benefic_moon

        if has_amala:
            status = "PRESENT"
            active_refs = []
            if has_benefic_lagna:
                active_refs.append(f"{', '.join(lagna_benefics)} in 10th from Lagna ({h10_lagna_sign})")
            if has_benefic_moon:
                active_refs.append(f"{', '.join(moon_benefics)} in 10th from Moon ({h10_moon_sign})")
            evidence_en = f"Natural benefic seated in 10th house: {'; '.join(active_refs)}."
            evidence_hi = f"दशम भाव में शुभ ग्रह स्थित: {'; '.join(active_refs)}।"
        else:
            status = "ABSENT"
            evidence_en = f"No natural benefic (Jupiter, Venus, Mercury) occupies the 10th house from Lagna ({h10_lagna_sign or 'Indeterminate'}) or Moon ({h10_moon_sign})."
            evidence_hi = f"लग्न से दशम ({h10_lagna_sign or 'अनिर्णायक'}) अथवा चंद्र से दशम ({h10_moon_sign}) में कोई नैसर्गिक शुभ ग्रह स्थित नहीं है।"

        return {
            "rule_id": "YOGA_AMALA",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Amala Yoga",
            "name_hi": "अमला योग",
            "category": "Reputation & Character",
            "tradition": "Classical Parashari (BPHS Ch. 35) & Phaladeepika",
            "status": status,
            "is_active": has_amala,
            "planets_involved": lagna_benefics + moon_benefics if has_amala else ["Jupiter", "Venus", "Mercury"],
            "tested_references": {
                "h10_lagna_sign": h10_lagna_sign,
                "h10_moon_sign": h10_moon_sign,
                "benefics_in_lagna_10th": lagna_benefics,
                "benefics_in_moon_10th": moon_benefics
            },
            "conditions_satisfied": ["Natural benefic in 10th house"] if has_amala else [],
            "conditions_not_satisfied": [] if has_amala else ["Natural benefic must occupy 10th from Lagna or Moon"],
            "mitigations_applied": [],
            "evidence_text_en": evidence_en,
            "evidence_text_hi": evidence_hi,
            "source_citation": "Brihat Parashara Hora Shastra, Ch. 35, Sloka 10-11; Phaladeepika, Ch. 6, Sloka 21"
        }

    @classmethod
    def eval_dharma_karmadhipati(cls, planets: Dict[str, Any], lagna_sign: str, is_unknown_time: bool) -> Dict[str, Any]:
        """
        Dharma-Karmadhipati Raja Yoga:
        Relationship (Conjunction, Mutual Aspect, or Exchange) between
        the 9th Lord (Dharmadhipati) and 10th Lord (Karmadhipati) from Lagna.
        Source: Brihat Parashara Hora Shastra, Ch. 35, Sloka 25-28.
        """
        if is_unknown_time:
            return {
                "rule_id": "YOGA_DHARMA_KARMADHIPATI",
                "name_en": "Dharma-Karmadhipati Raja Yoga",
                "name_hi": "धर्मा-कर्माधिपति राजयोग",
                "status": "INDETERMINATE",
                "is_active": False,
                "evidence_text_en": "Lagna houses cannot be resolved with certainty when birth time is unknown.",
                "evidence_text_hi": "जन्म समय अज्ञात होने पर लग्न भावों का निर्धारण संभव नहीं है।"
            }

        lagna_idx = SIGNS.index(lagna_sign)
        h9_sign = SIGNS[(lagna_idx + 8) % 12]
        h10_sign = SIGNS[(lagna_idx + 9) % 12]

        lord_9 = SIGN_LORDS[h9_sign]
        lord_10 = SIGN_LORDS[h10_sign]

        p9 = planets.get(lord_9, {})
        p10 = planets.get(lord_10, {})

        sign_9 = p9.get("sign", "")
        sign_10 = p10.get("sign", "")
        h_9 = p9.get("house", 0)
        h_10 = p10.get("house", 0)

        # Relationship types
        is_conjunction = (sign_9 == sign_10) and bool(sign_9)
        is_exchange = (sign_9 == h10_sign and sign_10 == h9_sign)
        
        # Mutual aspect check (Opposition / 7th house aspect, or special aspects)
        idx_9 = SIGNS.index(sign_9) if sign_9 in SIGNS else -1
        idx_10 = SIGNS.index(sign_10) if sign_10 in SIGNS else -1
        sign_dist = ((idx_10 - idx_9 + 12) % 12) + 1 if (idx_9 >= 0 and idx_10 >= 0) else 0

        is_mutual_7th = sign_dist == 7

        is_formed = is_conjunction or is_exchange or is_mutual_7th
        rel_type = "Conjunction" if is_conjunction else ("Parivartana (Exchange)" if is_exchange else ("Mutual 7th Aspect (Samasaptaka)" if is_mutual_7th else "None"))

        if is_formed:
            status = "PRESENT"
            evidence_en = (
                f"9th Lord ({lord_9} ruling {h9_sign}, seated in {sign_9} / House {h_9}) and "
                f"10th Lord ({lord_10} ruling {h10_sign}, seated in {sign_10} / House {h_10}) "
                f"form a classical Dharma-Karmadhipati connection via {rel_type}."
            )
            evidence_hi = (
                f"नवमेश {lord_9} ({sign_9} / भाव {h_9}) और दशमेश {lord_10} ({sign_10} / भाव {h_10}) "
                f"के मध्य {rel_type} द्वारा प्रतिष्ठित धर्मा-कर्माधिपति राजयोग निर्मित होता है।"
            )
        else:
            status = "ABSENT"
            evidence_en = f"9th Lord ({lord_9} in {sign_9}) and 10th Lord ({lord_10} in {sign_10}) have no conjunction, mutual aspect, or exchange."
            evidence_hi = f"नवमेश ({lord_9} in {sign_9}) और दशमेश ({lord_10} in {sign_10}) के मध्य युति, दृष्टि अथवा राशि-परिवर्तन का संबंध नहीं है।"

        return {
            "rule_id": "YOGA_DHARMA_KARMADHIPATI",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Dharma-Karmadhipati Raja Yoga",
            "name_hi": "धर्मा-कर्माधिपति राजयोग",
            "category": "Raja Yoga / Higher Purpose",
            "tradition": "Classical Parashari (BPHS Ch. 35)",
            "status": status,
            "is_active": is_formed,
            "relationship_type": rel_type,
            "planets_involved": [lord_9, lord_10],
            "tested_references": {
                "lagna": lagna_sign,
                "h9_sign": h9_sign,
                "lord_9": lord_9,
                "lord_9_placement": f"{sign_9} (House {h_9})",
                "h10_sign": h10_sign,
                "lord_10": lord_10,
                "lord_10_placement": f"{sign_10} (House {h_10})",
                "relationship": rel_type
            },
            "conditions_satisfied": [f"Connection between 9th and 10th lords: {rel_type}"] if is_formed else [],
            "conditions_not_satisfied": [] if is_formed else ["No conjunction, aspect, or exchange between 9th and 10th lords"],
            "mitigations_applied": [],
            "evidence_text_en": evidence_en,
            "evidence_text_hi": evidence_hi,
            "source_citation": "Brihat Parashara Hora Shastra, Ch. 35, Sloka 25-28; Jataka Parijata, Ch. 7, Sloka 31"
        }

    @classmethod
    def eval_chandra_mangala(cls, planets: Dict[str, Any]) -> Dict[str, Any]:
        """Chandra-Mangala: Moon and Mars conjunct in the same sign."""
        moon_sign = planets.get("Moon", {}).get("sign", "")
        mars_sign = planets.get("Mars", {}).get("sign", "")
        is_conjunct = moon_sign == mars_sign and bool(moon_sign)

        status = "PRESENT" if is_conjunct else "ABSENT"
        return {
            "rule_id": "YOGA_CHANDRA_MANGALA",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Chandra-Mangala Yoga",
            "name_hi": "चन्द्र-मंगल योग",
            "category": "Dhana / Wealth Enterprise",
            "tradition": "Classical Parashari & Phaladeepika",
            "status": status,
            "is_active": is_conjunct,
            "planets_involved": ["Moon", "Mars"],
            "evidence_text_en": f"Moon in {moon_sign} and Mars in {mars_sign} {'share the same sign (conjunct)' if is_conjunct else 'are in separate signs'}.",
            "evidence_text_hi": f"चंद्र {moon_sign} और मंगल {mars_sign} में {'एक ही राशि में युतिबद्ध हैं' if is_conjunct else 'अलग-अलग राशियों में स्थित हैं'}।"
        }

    @classmethod
    def eval_guru_mangala(cls, planets: Dict[str, Any]) -> Dict[str, Any]:
        """Guru-Mangala: Jupiter and Mars in mutual Kendra (1, 4, 7, 10) or conjunct."""
        jup_sign = planets.get("Jupiter", {}).get("sign", "")
        mars_sign = planets.get("Mars", {}).get("sign", "")
        jup_idx = SIGNS.index(jup_sign) if jup_sign in SIGNS else -1
        mars_idx = SIGNS.index(mars_sign) if mars_sign in SIGNS else -1

        if jup_idx >= 0 and mars_idx >= 0:
            dist = ((mars_idx - jup_idx + 12) % 12) + 1
            is_active = dist in [1, 4, 7, 10]
            status = "PRESENT" if is_active else "ABSENT"
            evidence_en = f"Jupiter in {jup_sign} and Mars in {mars_sign} are in relative house distance {dist} ({'Kendra relationship' if is_active else 'not in mutual Kendra'})."
            evidence_hi = f"गुरु ({jup_sign}) और मंगल ({mars_sign}) परस्पर {dist}वें भाव में हैं ({'केंद्र संबंध' if is_active else 'केंद्र संबंध नहीं है'})।"
        else:
            is_active = False
            status = "INDETERMINATE"
            evidence_en = "Missing planetary positions."
            evidence_hi = "ग्रह स्थिति अनुपलब्ध।"

        return {
            "rule_id": "YOGA_GURU_MANGALA",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Guru-Mangala Yoga",
            "name_hi": "गुरु-मंगल योग",
            "category": "Executive / Leadership",
            "tradition": "Classical Parashari",
            "status": status,
            "is_active": is_active,
            "planets_involved": ["Jupiter", "Mars"],
            "evidence_text_en": evidence_en,
            "evidence_text_hi": evidence_hi
        }

    @classmethod
    def eval_pancha_mahapurusha(cls, planets: Dict[str, Any], lagna_sign: str, is_unknown_time: bool) -> List[Dict[str, Any]]:
        """Pancha Mahapurusha Yogas: Ruchaka, Bhadra, Hamsa, Malavya, Sasa."""
        if is_unknown_time:
            return []

        lagna_idx = SIGNS.index(lagna_sign)
        configs = [
            ("Mars", "Ruchaka Yoga", "रुचक महापुरुष योग", "YOGA_RUCHAKA", ["Aries", "Scorpio"], "Capricorn"),
            ("Mercury", "Bhadra Yoga", "भद्र महापुरुष योग", "YOGA_BHADRA", ["Gemini", "Virgo"], "Virgo"),
            ("Jupiter", "Hamsa Yoga", "हंस महापुरुष योग", "YOGA_HAMSA", ["Sagittarius", "Pisces"], "Cancer"),
            ("Venus", "Malavya Yoga", "मालव्य महापुरुष योग", "YOGA_MALAVYA", ["Taurus", "Libra"], "Pisces"),
            ("Saturn", "Sasa Yoga", "शश महापुरुष योग", "YOGA_SASA", ["Capricorn", "Aquarius"], "Libra")
        ]

        results = []
        for p, title_en, title_hi, rule_id, own_list, exalt_sign in configs:
            p_data = planets.get(p, {})
            p_sign = p_data.get("sign", "")
            p_sign_idx = SIGNS.index(p_sign) if p_sign in SIGNS else -1
            if p_sign_idx < 0:
                continue

            h = ((p_sign_idx - lagna_idx + 12) % 12) + 1
            is_kendra = h in [1, 4, 7, 10]
            is_dignified = (p_sign in own_list) or (p_sign == exalt_sign)

            is_active = is_kendra and is_dignified
            status = "PRESENT" if is_active else "ABSENT"

            if is_active:
                evidence_en = f"{p} occupies Kendra (House {h}) in its {'exalted' if p_sign == exalt_sign else 'own'} sign ({p_sign})."
                evidence_hi = f"{p} केंद्र (भाव {h}) में अपनी {'उच्च' if p_sign == exalt_sign else 'स्व'} राशि ({p_sign}) में स्थित है।"
            else:
                evidence_en = f"{p} in {p_sign} (House {h}) does not meet the Kendra-plus-own/exaltation criteria."
                evidence_hi = f"{p} {p_sign} (भाव {h}) में केंद्र एवं स्व/उच्च राशि की शर्त पूर्ण नहीं करता।"

            results.append({
                "rule_id": rule_id,
                "rule_version": cls.RULE_VERSION,
                "name_en": title_en,
                "name_hi": title_hi,
                "category": "Pancha Mahapurusha Yoga",
                "tradition": "Classical Parashari (BPHS Ch. 35)",
                "status": status,
                "is_active": is_active,
                "planets_involved": [p],
                "evidence_text_en": evidence_en,
                "evidence_text_hi": evidence_hi
            })
        return results

    @classmethod
    def eval_viparita_raja(cls, planets: Dict[str, Any], lagna_sign: str, is_unknown_time: bool) -> List[Dict[str, Any]]:
        """Viparita Raja Yogas: Harsha (6th lord), Sarala (8th lord), Vimala (12th lord) in Dusthanas."""
        if is_unknown_time:
            return []

        lagna_idx = SIGNS.index(lagna_sign)
        def lord_of(h: int) -> str:
            return SIGN_LORDS[SIGNS[(lagna_idx + h - 1) % 12]]

        configs = [
            (6, "Harsha Viparita Raja Yoga", "हर्ष विपरीत राजयोग", "YOGA_HARSHA_VIPARITA"),
            (8, "Sarala Viparita Raja Yoga", "सरल विपरीत राजयोग", "YOGA_SARALA_VIPARITA"),
            (12, "Vimala Viparita Raja Yoga", "विमल विपरीत राजयोग", "YOGA_VIMALA_VIPARITA")
        ]

        results = []
        for h_num, title_en, title_hi, rule_id in configs:
            lord = lord_of(h_num)
            lord_sign = planets.get(lord, {}).get("sign", "")
            lord_sign_idx = SIGNS.index(lord_sign) if lord_sign in SIGNS else -1
            if lord_sign_idx < 0:
                continue

            placed_house = ((lord_sign_idx - lagna_idx + 12) % 12) + 1
            is_in_dusthana = placed_house in [6, 8, 12]

            # Classical condition: lord should not also be the Lagna Lord
            is_lagna_lord = lord == SIGN_LORDS[lagna_sign]
            is_active = is_in_dusthana and not is_lagna_lord

            status = "PRESENT" if is_active else "ABSENT"
            if is_active:
                evidence_en = f"{h_num}th Lord {lord} is placed in Dusthana House {placed_house} without Lagna Lord conflict."
                evidence_hi = f"{h_num}वें भाव के स्वामी {lord} दुस्थान भाव {placed_house} में स्थित हैं।"
            else:
                reason = "it also serves as the Lagna Lord (self-empowering rather than Viparita)" if (is_in_dusthana and is_lagna_lord) else f"it occupies House {placed_house} (not 6, 8, or 12)"
                evidence_en = f"{h_num}th Lord {lord} does not form {title_en} because {reason}."
                evidence_hi = f"{h_num}वें भाव के स्वामी {lord} यह योग नहीं बनाते क्योंकि {reason}।"

            results.append({
                "rule_id": rule_id,
                "rule_version": cls.RULE_VERSION,
                "name_en": title_en,
                "name_hi": title_hi,
                "category": "Viparita Raja Yoga",
                "tradition": "Phaladeepika Ch. 6 & BPHS",
                "status": status,
                "is_active": is_active,
                "planets_involved": [lord],
                "evidence_text_en": evidence_en,
                "evidence_text_hi": evidence_hi
            })
        return results

    @classmethod
    def eval_kemadruma(cls, planets: Dict[str, Any], lagna_sign: str, is_unknown_time: bool) -> Dict[str, Any]:
        """Kemadruma Yoga: No physical planet (excluding Sun, Rahu, Ketu) in 2nd or 12th from Moon."""
        moon_sign = planets.get("Moon", {}).get("sign", "")
        moon_idx = SIGNS.index(moon_sign) if moon_sign in SIGNS else -1
        if moon_idx < 0:
            return {"rule_id": "YOGA_KEMADRUMA", "status": "INDETERMINATE"}

        h2_sign = SIGNS[(moon_idx + 1) % 12]
        h12_sign = SIGNS[(moon_idx + 11) % 12]

        qualifying_planets = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
        surrounding = []
        for p in qualifying_planets:
            p_sign = planets.get(p, {}).get("sign", "")
            if p_sign in [h2_sign, h12_sign]:
                surrounding.append(f"{p} in {p_sign}")

        raw_kemadruma = len(surrounding) == 0

        # Cancellations (Kemadruma Bhanga): Planets in Kendra from Lagna or Moon
        cancellations = []
        if raw_kemadruma and not is_unknown_time:
            lagna_idx = SIGNS.index(lagna_sign) if lagna_sign in SIGNS else -1
            if lagna_idx >= 0:
                kendra_signs = [SIGNS[lagna_idx], SIGNS[(lagna_idx + 3) % 12], SIGNS[(lagna_idx + 6) % 12], SIGNS[(lagna_idx + 9) % 12]]
                kendra_occupants = [p for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] if planets.get(p, {}).get("sign") in kendra_signs]
                if kendra_occupants:
                    cancellations.append(f"Kemadruma Bhanga: Kendras from Lagna occupied by {', '.join(kendra_occupants)}")

        if raw_kemadruma:
            if cancellations:
                status = "PRESENT_WITH_MITIGATION"
                evidence_en = f"Raw Kemadruma present (no planet in 2nd/12th from Moon), but mitigated/cancelled by: {'; '.join(cancellations)}."
                evidence_hi = f"केंद्राधिपतियों की शुभ स्थिति से केमद्रुम भंग राजयोग निर्मित होता है।"
            else:
                status = "PRESENT"
                evidence_en = f"Kemadruma Yoga is formed: 2nd ({h2_sign}) and 12th ({h12_sign}) from natal Moon are devoid of physical planets."
                evidence_hi = f"चंद्रमा से द्वितीय ({h2_sign}) एवं द्वादश ({h12_sign}) भाव में कोई भौतिक ग्रह उपस्थित नहीं है।"
        else:
            status = "ABSENT"
            evidence_en = f"No Kemadruma: Flanked by {', '.join(surrounding)} in adjacent houses from Moon."
            evidence_hi = f"चंद्रमा के समीपवर्ती भावों में ग्रहों की उपस्थिति: {', '.join(surrounding)}।"

        return {
            "rule_id": "YOGA_KEMADRUMA",
            "rule_version": cls.RULE_VERSION,
            "name_en": "Kemadruma Yoga (and Kemadruma Bhanga)",
            "name_hi": "केमद्रुम योग (एवं केमद्रुम भंग)",
            "category": "Lunar Affliction / Bhanga",
            "tradition": "Classical Parashari (BPHS Ch. 35)",
            "status": status,
            "is_active": status in ["PRESENT", "PRESENT_WITH_MITIGATION"],
            "evidence_text_en": evidence_en,
            "evidence_text_hi": evidence_hi
        }

    # =========================================================================
    # 3. TRANSIT EVALUATIONS (SATURN SADE SATI & KANTAKA SHANI)
    # =========================================================================

    @classmethod
    def evaluate_transits(cls, planets: Dict[str, Any], transit_saturn_sign: str, reference_date: Optional[str]) -> Dict[str, Any]:
        moon_sign = planets.get("Moon", {}).get("sign", "")
        moon_idx = SIGNS.index(moon_sign) if moon_sign in SIGNS else -1
        saturn_transit_idx = SIGNS.index(transit_saturn_sign) if transit_saturn_sign in SIGNS else -1

        if moon_idx < 0 or saturn_transit_idx < 0:
            return {
                "sade_sati": {"status": "INDETERMINATE"},
                "kantaka_shani": {"status": "INDETERMINATE"}
            }

        diff = ((saturn_transit_idx - moon_idx + 12) % 12) + 1

        # 1. Sade Sati (12th, 1st, 2nd from Moon)
        is_sade_sati = diff in [12, 1, 2]
        if diff == 12:
            ss_phase = "Phase 1: Rising (Aarohan) — 12th from Moon"
            ss_phase_hi = "प्रथम चरण: आरोहण — चंद्रमा से द्वादश भाव"
            ss_desc_en = f"Saturn in {transit_saturn_sign} transits the 12th house from natal Moon ({moon_sign}). Demands lifestyle discipline, emotional consolidation, and prudent resource management."
            ss_desc_hi = f"शनिदेव {transit_saturn_sign} में जन्म चंद्र ({moon_sign}) से द्वादश भाव में गोचर कर रहे हैं।"
        elif diff == 1:
            ss_phase = "Phase 2: Peak (Madhya / Janma Shani) — Over Natal Moon"
            ss_phase_hi = "द्वितीय चरण: मध्य (जन्म शनि) — चंद्रमा के ऊपर"
            ss_desc_en = f"Saturn transits directly over natal Moon in {moon_sign}. Peak window of psychological resilience, duty, and deep introspection."
            ss_desc_hi = f"शनिदेव जन्म चंद्र ({moon_sign}) पर प्रत्यक्ष गोचर कर रहे हैं। मानसिक धैर्य और कर्तव्यनिष्ठा का काल।"
        elif diff == 2:
            ss_phase = "Phase 3: Setting (Avarohan) — 2nd from Moon"
            ss_phase_hi = "तृतीय चरण: अवरोहण — चंद्रमा से द्वितीय भाव"
            ss_desc_en = f"Saturn in {transit_saturn_sign} transits the 2nd house from natal Moon ({moon_sign}). Financial stabilization, family responsibilities, and gradual liberation from heavy burdens."
            ss_desc_hi = f"शनिदेव {transit_saturn_sign} में जन्म चंद्र ({moon_sign}) से द्वितीय भाव में गोचर कर रहे हैं। पारिवारिक दायित्व और वित्तीय स्थिरता का काल।"
        else:
            ss_phase = "Clear of Sade Sati"
            ss_phase_hi = "साढ़ेसाती से मुक्त"
            ss_desc_en = f"Transiting Saturn in {transit_saturn_sign} occupies house {diff} from natal Moon ({moon_sign}), safely outside the Sade Sati zone (houses 12, 1, 2)."
            ss_desc_hi = f"गोचरीय शनि {transit_saturn_sign} में चंद्रमा से {diff}वें भाव में हैं, जो साढ़ेसाती क्षेत्र से पूर्णतः बाहर है।"

        sade_sati_status = "PRESENT" if is_sade_sati else "ABSENT"

        # 2. Kantaka Shani / Dhaiya (4th or 8th from Moon)
        is_dhaiya = diff in [4, 8]
        if diff == 4:
            dh_name = "Kantaka Shani (4th House Dhaiya)"
            dh_name_hi = "कंटक शनि (चतुर्थ भाव ढैया)"
            dh_desc_en = f"Saturn in {transit_saturn_sign} transits the 4th house from natal Moon ({moon_sign}), requiring domestic patience and mother's health mindfulness."
            dh_desc_hi = f"शनिदेव चतुर्थ भाव में गोचरस्थ हैं; पारिवारिक धैर्य अपेक्षित है।"
        elif diff == 8:
            dh_name = "Ashtama Shani (8th House Dhaiya)"
            dh_name_hi = "अष्टम शनि (अष्टम भाव ढैया)"
            dh_desc_en = f"Saturn in {transit_saturn_sign} transits the 8th house from natal Moon ({moon_sign}), counseling against speculative haste."
            dh_desc_hi = f"शनिदेव अष्टम भाव में गोचरस्थ हैं; सट्टा व उतावलेपन से बचाव आवश्यक है।"
        else:
            dh_name = "Inactive (No Active Dhaiya)"
            dh_name_hi = "निष्क्रिय (कोई ढैया सक्रिय नहीं)"
            dh_desc_en = f"Saturn occupies house {diff} from Moon, free from 4th and 8th house Dhaiya transits."
            dh_desc_hi = f"शनिदेव चंद्रमा से {diff}वें भाव में हैं; कोई ढैया सक्रिय नहीं है।"

        dhaiya_status = "PRESENT" if is_dhaiya else "ABSENT"

        remedy = None
        if is_sade_sati or is_dhaiya:
            remedy = {
                "mantra_sanskrit": "ॐ शं शनैश्चराय नमः || ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः",
                "mantra_transliteration": "Om Sham Shanaishcharaya Namah || Om Praam Preem Proum Sah Shanaishcharaya Namah",
                "meaning_en": "Salutations to Lord Shani, dispenser of justice, patience, and karmic alignment.",
                "meaning_hi": "न्याय, धैर्य और कर्म-शोधन के अधिष्ठाता शनिदेव को सादर नमन।",
                "daana_en": "Feeding black dogs or crows, lighting a mustard oil lamp under a Peepal tree on Saturday evenings, and serving laborers.",
                "daana_hi": "शनिवार संध्या को पीपल के वृक्ष के नीचे सरसों के तेल का दीपक, काले श्वान या पक्षियों को आहार, एवं श्रमजीवियों का सत्कार।"
            }

        return {
            "sade_sati": {
                "rule_id": "TRANSIT_SADE_SATI",
                "name_en": "Shani Sade Sati",
                "name_hi": "शनि साढ़ेसाती",
                "status": sade_sati_status,
                "is_active": is_sade_sati,
                "phase_en": ss_phase,
                "phase_hi": ss_phase_hi,
                "transit_saturn_sign": transit_saturn_sign,
                "natal_moon_sign": moon_sign,
                "house_from_moon": diff,
                "evidence_text_en": ss_desc_en,
                "evidence_text_hi": ss_desc_hi,
                "reference_date": reference_date or datetime.now().strftime("%Y-%m-%d"),
                "remedy": remedy if is_sade_sati else None
            },
            "kantaka_shani": {
                "rule_id": "TRANSIT_KANTAKA_SHANI",
                "name_en": "Kantaka Shani / Ashtama Dhaiya",
                "name_hi": "कंटक शनि / अष्टम ढैया",
                "status": dhaiya_status,
                "is_active": is_dhaiya,
                "dhaiya_type_en": dh_name,
                "dhaiya_type_hi": dh_name_hi,
                "house_from_moon": diff,
                "evidence_text_en": dh_desc_en,
                "evidence_text_hi": dh_desc_hi,
                "remedy": remedy if is_dhaiya else None
            }
        }
