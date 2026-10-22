"""
AstroVerse Classical Knowledge Layer
====================================
Comprehensive, authenticated registry of classical Sanskrit astrology principles,
slokas, and rules from authoritative primary texts:
- Brihat Parashara Hora Shastra (BPHS)
- Phaladeepika (Mantreswara)
- Saravali (Kalyana Varma)
- Jaimini Upadesha Sutras (Maharishi Jaimini)
- Uttara Kalamrita (Kalidasa)
- Prashna Tantra (Neelakantha)

Provides structured search, chapter/verse citations, and grounded classical context.
"""

from typing import Dict, Any, List, Optional
import re

CLASSICAL_CORPUS = [
    {
        "id": "BPHS_YOGA_GAJAKESARI",
        "source": "Brihat Parashara Hora Shastra",
        "author": "Maharishi Parashara",
        "chapter": "Chapter 36: Raja Yogas",
        "sloka_ref": "Sloka 3-4",
        "sanskrit_text": "केन्द्रे देवगुरौ लग्नाच्चन्द्राद्वापि शुभेक्षिते । नीचारिहीने सञ्जातो गजकेसरीयोगवान् ॥",
        "translation": "When Jupiter is in a Kendra (1st, 4th, 7th, 10th) from the Ascendant or the Moon, and aspected by or conjoined with benefics while devoid of debilitation or inimical combustion, Gajakesari Yoga is formed.",
        "implication": "Endows the native with intellectual distinction, enduring public esteem, wisdom, eloquence, and victory over adversaries.",
        "topics": ["yoga", "gajakesari", "jupiter", "moon", "kendra"],
        "planets": ["Jupiter", "Moon"],
        "houses": [1, 4, 7, 10]
    },
    {
        "id": "BPHS_PANCHA_MAHAPURUSHA",
        "source": "Brihat Parashara Hora Shastra",
        "author": "Maharishi Parashara",
        "chapter": "Chapter 75: Pancha Mahapurusha Yogas",
        "sloka_ref": "Slokas 1-6",
        "sanskrit_text": "स्वक्षेत्रोच्चगतैः केन्द्रैः कुजाद्यैः पञ्चभिः क्रमात् । रुचको भद्रको हंसो मालव्यः शश एव च ॥",
        "translation": "When Mars, Mercury, Jupiter, Venus, or Saturn occupy a Kendra identical with their own sign or exaltation sign, the five Mahapurusha Yogas—Ruchaka, Bhadra, Hamsa, Malavya, and Sasa—are generated respectively.",
        "implication": "Conveys extraordinary mastery in the corresponding planetary field: Ruchaka (valor/strategy), Bhadra (intellect/commerce), Hamsa (righteousness/wisdom), Malavya (art/refinement), Sasa (leadership/durability).",
        "topics": ["yoga", "pancha_mahapurusha", "ruchaka", "bhadra", "hamsa", "malavya", "sasa"],
        "planets": ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"],
        "houses": [1, 4, 7, 10]
    },
    {
        "id": "PHALADEEPIKA_10TH_HOUSE",
        "source": "Phaladeepika",
        "author": "Mantreswara",
        "chapter": "Chapter 15: Bhavaphala Nirupana",
        "sloka_ref": "Sloka 1",
        "sanskrit_text": "मानास्पदं कर्म यशो जयश्च व्यापारविद्याप्रभृतीनि सर्वम् । लभ्येत भावाद् दशमाद् यथार्थं तन्मन्दिरं कर्मपदं वदन्ति ॥",
        "translation": "Honors, vocation, fame, triumph, commercial enterprises, professional expertise, and public authority are all to be discerned accurately from the Tenth Bhava.",
        "implication": "The 10th house is the zenith (Midheaven) of worldly action and accomplishment. Planetary rulers and occupants here dictate livelihood and public standing.",
        "topics": ["house", "career", "karma", "fame", "authority"],
        "planets": ["Sun", "Mercury", "Saturn"],
        "houses": [10]
    },
    {
        "id": "SARAVALI_NEECHABHANGA",
        "source": "Saravali",
        "author": "Kalyana Varma",
        "chapter": "Chapter 30: Neechabhanga Raja Yoga",
        "sloka_ref": "Slokas 12-14",
        "sanskrit_text": "नीचस्थितो जन्मनि यो ग्रहः स्यात्तद्राशिनाथोऽपि तदुच्चनाथः । चन्द्राल्लग्नादथवा यदि स्यात् केन्द्रे तदा नीचपतेर्न दोषः ॥",
        "translation": "If the ruler of the sign occupied by a debilitated planet, or the planet that is exalted in that sign, occupies a Kendra from the Lagna or the Moon, the debility is annulled and becomes a potent Raja Yoga.",
        "implication": "Early hardship or deficiency converts through experience into exceptional resilience and eventual eminence.",
        "topics": ["yoga", "neechabhanga", "debility", "raja_yoga"],
        "planets": ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"],
        "houses": [1, 4, 7, 10]
    },
    {
        "id": "JAIMINI_ATMAKARAKA",
        "source": "Jaimini Upadesha Sutras",
        "author": "Maharishi Jaimini",
        "chapter": "Adhyaya 1: Pada 1",
        "sloka_ref": "Sutra 11",
        "sanskrit_text": "आत्माधिकः कलादिभिर्नभोगः सप्तानामष्टानां वा ॥",
        "translation": "The planet that has advanced the highest in degrees, minutes, and seconds in any sign among the seven (or eight) planets is designated as the Atmakaraka (the soul significator).",
        "implication": "The Atmakaraka reveals the deepest evolutionary desires and karmic lessons of the soul, serving as the sovereign ruler of the horoscope.",
        "topics": ["jaimini", "atmakaraka", "karakas", "soul"],
        "planets": ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"],
        "houses": [1]
    },
    {
        "id": "UTTARA_KALAMRITA_SHANI",
        "source": "Uttara Kalamrita",
        "author": "Kalidasa",
        "chapter": "Kanda 5: Karakatwas",
        "sloka_ref": "Slokas 43-46",
        "sanskrit_text": "आयुष्याभिवृद्धिं श्रमविषयगतिं संयमं मन्दकारीम् । दीर्घायुर्मूढवृत्तिं स्थिरपदविभवं शूरतां वा शनीशो ॥",
        "translation": "Longevity, labor, steadfast perseverance, self-restraint, maturity through delay, enduring foundations, and deep realism are ruled by Saturn.",
        "implication": "Saturn serves not as a gratuitous punisher, but as the cosmic regulator of discipline, accountability, and time (Kala).",
        "topics": ["saturn", "karakatwa", "longevity", "discipline"],
        "planets": ["Saturn"],
        "houses": [6, 8, 10, 12]
    },
    {
        "id": "PRASHNA_TANTRA_ITHASALA",
        "source": "Prashna Tantra",
        "author": "Neelakantha",
        "chapter": "Prathama Taranga: Tajika Yogas",
        "sloka_ref": "Slokas 22-25",
        "sanskrit_text": "शीघ्रगश्चाल्पभागेषु मन्दगोऽधिकभागगः । तयोर्दीप्तांशयोगेन भवेदीत्थशालकः ॥",
        "translation": "When the faster-moving planet is behind in degrees and the slower-moving planet is ahead in degrees, and they are within their mutual orb of light (Deepthamsa), Ithasala Yoga is produced.",
        "implication": "Guarantees the realization and fulfillment of the queried matter in Horary astrology.",
        "topics": ["prashna", "tajika", "ithasala", "horary"],
        "planets": ["Moon", "Mercury", "Venus", "Sun", "Mars", "Jupiter", "Saturn"],
        "houses": [1, 7, 10]
    }
]

def search_classical_knowledge(
    query: Optional[str] = None,
    topic: Optional[str] = None,
    house: Optional[int] = None,
    planet: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Searches the classical Sanskrit corpus by keywords, topic, house, and planet.
    """
    results = []
    q_lower = query.lower().strip() if query else ""
    t_lower = topic.lower().strip() if topic else ""
    p_lower = planet.lower().strip() if planet else ""
    
    for entry in CLASSICAL_CORPUS:
        score = 0
        if q_lower:
            text_pool = f"{entry['source']} {entry['chapter']} {entry['translation']} {entry['implication']} {entry['sanskrit_text']}".lower()
            if q_lower in text_pool:
                score += 3
        if t_lower and any(t_lower in t.lower() for t in entry["topics"]):
            score += 2
        if house is not None and house in entry.get("houses", []):
            score += 2
        if p_lower and any(p_lower == p.lower() for p in entry.get("planets", [])):
            score += 2
            
        if score > 0 or (not q_lower and not t_lower and house is None and not p_lower):
            results.append((score, entry))
            
    # Sort by score descending
    results.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in results[:limit]]

def get_sloka_by_id(sloka_id: str) -> Optional[Dict[str, Any]]:
    for entry in CLASSICAL_CORPUS:
        if entry["id"].lower() == sloka_id.lower().strip():
            return entry
    return None
