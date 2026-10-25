"""
AstroVerse Numerology Engine
============================
Authoritative Vedic and Chaldean Numerology system calculating:
1. Birth / Psychic Number (Moolank / Mulank)
2. Destiny / Life Path Number (Bhagyank)
3. Name Number (Naamank) via Chaldean and Pythagorean mapping systems
4. Compound Number (Cheiro / Chaldean double-digit occult vibrations)
5. Planetary Rulers and 9x9 Friendship / Enmity (Mitra-Sama-Shatru) Matrix
6. Transparent Weighted Harmony Scoring (0-100 scale)
7. Intelligent Name Correction Engine with Bounded Candidate Generation
8. Signature Optimization Blueprint
9. Business Name and Mobile Number Ephemeral Analysis
10. Full Bilingual (English & Shastric Hindi) Explanations and Provenance
"""

from typing import Dict, Any, List, Optional, Tuple
import re
from datetime import datetime, date

# ---------------------------------------------------------------------------
# 1. ALPHABET MAPPINGS
# ---------------------------------------------------------------------------

CHALDEAN_MAP: Dict[str, int] = {
    'A': 1, 'I': 1, 'J': 1, 'Q': 1, 'Y': 1,
    'B': 2, 'K': 2, 'R': 2,
    'C': 3, 'G': 3, 'L': 3, 'S': 3,
    'D': 4, 'M': 4, 'T': 4,
    'E': 5, 'H': 5, 'N': 5, 'X': 5,
    'U': 6, 'V': 6, 'W': 6,
    'O': 7, 'Z': 7,
    'F': 8, 'P': 8
    # 9 has no letters in Chaldean (Sacred vibration)
}

PYTHAGOREAN_MAP: Dict[str, int] = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
    'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8
}

# ---------------------------------------------------------------------------
# 2. PLANETARY RULERS & ARCHETYPES (1 to 9)
# ---------------------------------------------------------------------------

PLANET_DATA: Dict[int, Dict[str, Any]] = {
    1: {
        "planet_en": "Sun (Surya)",
        "planet_hi": "सूर्य (Surya)",
        "archetype_en": "The Sovereign / Pioneer",
        "archetype_hi": "प्रणेता / मार्गदर्शक",
        "element_en": "Fire",
        "element_hi": "अग्नि (Fire)",
        "qualities_en": ["Leadership", "Authority", "Visionary", "Self-reliance", "Ambition"],
        "qualities_hi": ["नेतृत्व", "प्रभुत्व", "दूरदृष्टि", "स्वावलंबन", "महत्वाकांक्षा"],
        "lucky_colors_en": ["Gold", "Copper", "Orange", "Yellow"],
        "lucky_colors_hi": ["स्वर्णिम", "ताम्र", "नारंगी", "पीला"],
        "lucky_days_en": ["Sunday", "Monday"],
        "lucky_days_hi": ["रविवार", "सोमवार"],
        "lucky_gem_en": "Ruby (Manikya)",
        "lucky_gem_hi": "माणिक्य (Ruby)"
    },
    2: {
        "planet_en": "Moon (Chandra)",
        "planet_hi": "चंद्र (Chandra)",
        "archetype_en": "The Nurturer / Intuitive",
        "archetype_hi": "संवेदनशील / शांतिदूत",
        "element_en": "Water",
        "element_hi": "जल (Water)",
        "qualities_en": ["Intuition", "Empathy", "Diplomacy", "Imagination", "Grace"],
        "qualities_hi": ["सहज ज्ञान", "सहानुभूति", "कूटनीति", "कल्पनाशीलता", "सौम्यता"],
        "lucky_colors_en": ["Pearl White", "Silver", "Sea Green"],
        "lucky_colors_hi": ["श्वेत", "चांदी", "हल्का हरा"],
        "lucky_days_en": ["Monday", "Friday"],
        "lucky_days_hi": ["सोमवार", "शुक्रवार"],
        "lucky_gem_en": "Pearl (Moti) / Moonstone",
        "lucky_gem_hi": "मोती (Pearl)"
    },
    3: {
        "planet_en": "Jupiter (Guru / Brihaspati)",
        "planet_hi": "बृहस्पति (Guru)",
        "archetype_en": "The Sage / Master Mentor",
        "archetype_hi": "विद्वान / देवगुरु",
        "element_en": "Ether (Akasha)",
        "element_hi": "आकाश (Ether)",
        "qualities_en": ["Wisdom", "Optimism", "Counsel", "Spirituality", "Expansion"],
        "qualities_hi": ["ज्ञान", "सकारात्मकता", "परामर्श", "आध्यात्मिकता", "विस्तार"],
        "lucky_colors_en": ["Bright Yellow", "Saffron", "Golden Yellow"],
        "lucky_colors_hi": ["पीला", "केसरिया", "स्वर्णिम पीला"],
        "lucky_days_en": ["Thursday", "Tuesday"],
        "lucky_days_hi": ["गुरुवार", "मंगलवार"],
        "lucky_gem_en": "Yellow Sapphire (Pukhraj)",
        "lucky_gem_hi": "पुखराज (Yellow Sapphire)"
    },
    4: {
        "planet_en": "Rahu (North Node)",
        "planet_hi": "राहु (Rahu)",
        "archetype_en": "The Catalyst / Reformer",
        "archetype_hi": "क्रांतिकारी / तकनीकी अन्वेषक",
        "element_en": "Earth / Shadow",
        "element_hi": "पृथ्वी / छाया",
        "qualities_en": ["Unconventionality", "Technical Intellect", "Strategy", "Resilience"],
        "qualities_hi": ["अपरंपरागत", "रणनीति", "तकनीकी दक्षता", "साहसिक निर्णय"],
        "lucky_colors_en": ["Electric Blue", "Steel Grey", "Smoky Shades"],
        "lucky_colors_hi": ["नीला", "स्लेटी", "धूम्र वर्ण"],
        "lucky_days_en": ["Saturday", "Sunday"],
        "lucky_days_hi": ["शनिवार", "रविवार"],
        "lucky_gem_en": "Hessonite Garnet (Gomed)",
        "lucky_gem_hi": "गोमेद (Gomed)"
    },
    5: {
        "planet_en": "Mercury (Budha)",
        "planet_hi": "बुध (Budha)",
        "archetype_en": "The Communicator / Merchant",
        "archetype_hi": "बुद्धिमान / संचारक",
        "element_en": "Air / Earth",
        "element_hi": "वायु / पृथ्वी",
        "qualities_en": ["Versatility", "Commerce", "Analytical Mind", "Eloquence", "Adaptability"],
        "qualities_hi": ["वाकपटुता", "व्यापारिक विवेक", "विश्लेषण", "तीव्र बुद्धि", "अनुकूलन"],
        "lucky_colors_en": ["Emerald Green", "Turquoise", "Mint Green"],
        "lucky_colors_hi": ["पन्ना हरा", "फिरोजी", "हल्का हरा"],
        "lucky_days_en": ["Wednesday", "Friday"],
        "lucky_days_hi": ["बुधवार", "शुक्रवार"],
        "lucky_gem_en": "Emerald (Panna)",
        "lucky_gem_hi": "पन्ना (Emerald)"
    },
    6: {
        "planet_en": "Venus (Shukra)",
        "planet_hi": "शुक्र (Shukra)",
        "archetype_en": "The Harmonizer / Artist",
        "archetype_hi": "कलाकार / सौंदर्य संरक्षक",
        "element_en": "Water / Earth",
        "element_hi": "जल / पृथ्वी",
        "qualities_en": ["Aesthetics", "Luxury", "Charisma", "Harmony", "Devotion"],
        "qualities_hi": ["सौंदर्य", "आकर्षण", "कला", "वैवाहिक सुख", "सौहार्द"],
        "lucky_colors_en": ["Diamond White", "Pastel Pink", "Sky Blue"],
        "lucky_colors_hi": ["श्वेत", "गुलाबी", "हल्का नीला"],
        "lucky_days_en": ["Friday", "Wednesday"],
        "lucky_days_hi": ["शुक्रवार", "बुधवार"],
        "lucky_gem_en": "Diamond (Heera) / White Opal",
        "lucky_gem_hi": "हीरा (Diamond) / ओपल"
    },
    7: {
        "planet_en": "Ketu (South Node)",
        "planet_hi": "केतु (Ketu)",
        "archetype_en": "The Mystic / Researcher",
        "archetype_hi": "तपस्वी / गूढ़ अनुसंधानी",
        "element_en": "Water / Ether",
        "element_hi": "जल / आकाश",
        "qualities_en": ["Spiritual Insight", "Metaphysics", "Research", "Detachment", "Originality"],
        "qualities_hi": ["गूढ़ ज्ञान", "अनुसंधान", "वैराग्य", "आत्मिक गहराई", "मौलिकता"],
        "lucky_colors_en": ["Sea Green", "Light Yellow", "Off-White"],
        "lucky_colors_hi": ["हल्का हरा", "हल्का पीला", "धूमिल श्वेत"],
        "lucky_days_en": ["Tuesday", "Sunday"],
        "lucky_days_hi": ["मंगलवार", "रविवार"],
        "lucky_gem_en": "Cat's Eye (Lehsuniya)",
        "lucky_gem_hi": "लहसुनिया (Cat's Eye)"
    },
    8: {
        "planet_en": "Saturn (Shani)",
        "planet_hi": "शनि (Shani)",
        "archetype_en": "The Karmic Master / Builder",
        "archetype_hi": "कर्मफलदाता / न्यायप्रिय",
        "element_en": "Air / Earth",
        "element_hi": "वायु / पृथ्वी",
        "qualities_en": ["Discipline", "Endurance", "Justice", "Organizational Mastery", "Patience"],
        "qualities_hi": ["अनुशासन", "धैर्य", "न्यायप्रियता", "कठिन परिश्रम", "संगठन शक्ति"],
        "lucky_colors_en": ["Navy Blue", "Dark Violet", "Charcoal Grey"],
        "lucky_colors_hi": ["गहरा नीला", "बैंगनी", "काला"],
        "lucky_days_en": ["Saturday", "Wednesday"],
        "lucky_days_hi": ["शनिवार", "बुधवार"],
        "lucky_gem_en": "Blue Sapphire (Neelam) / Amethyst",
        "lucky_gem_hi": "नीलम (Blue Sapphire) / जामुनिया"
    },
    9: {
        "planet_en": "Mars (Mangala)",
        "planet_hi": "मंगल (Mangala)",
        "archetype_en": "The Warrior / Protector",
        "archetype_hi": "योद्धा / सेनापति",
        "element_en": "Fire",
        "element_hi": "अग्नि (Fire)",
        "qualities_en": ["Valor", "Drive", "Dynamic Energy", "Protective Instinct", "Directness"],
        "qualities_hi": ["साहस", "ऊर्जा", "तेजस्विता", "रक्षक भाव", "दृढ़ संकल्प"],
        "lucky_colors_en": ["Coral Red", "Crimson", "Rose"],
        "lucky_colors_hi": ["लाल", "सिंदूरी", "गुलाबी"],
        "lucky_days_en": ["Tuesday", "Thursday"],
        "lucky_days_hi": ["मंगलवार", "गुरुवार"],
        "lucky_gem_en": "Red Coral (Moonga)",
        "lucky_gem_hi": "मूंगा (Red Coral)"
    }
}

# ---------------------------------------------------------------------------
# 3. 9x9 PLANETARY RELATIONSHIP MATRIX (Mitra, Sama, Shatru)
# ---------------------------------------------------------------------------
# Format: RELATIONSHIP_MATRIX[source_num][target_num] -> 'friendly' | 'neutral' | 'enemy'
# Based on Classical Parashari Naisargika Sambandha & Cheiro Numerological Dynamics

RELATIONSHIP_MATRIX: Dict[int, Dict[int, str]] = {
    1: {  # Sun
        1: "friendly", 2: "friendly", 3: "friendly", 4: "neutral", 5: "friendly",
        6: "enemy", 7: "neutral", 8: "enemy", 9: "friendly"
    },
    2: {  # Moon
        1: "friendly", 2: "friendly", 3: "neutral", 4: "enemy", 5: "friendly",
        6: "enemy", 7: "neutral", 8: "enemy", 9: "enemy"
    },
    3: {  # Jupiter
        1: "friendly", 2: "friendly", 3: "friendly", 4: "enemy", 5: "neutral",
        6: "enemy", 7: "neutral", 8: "enemy", 9: "friendly"
    },
    4: {  # Rahu
        1: "neutral", 2: "enemy", 3: "enemy", 4: "neutral", 5: "friendly",
        6: "friendly", 7: "friendly", 8: "friendly", 9: "enemy"
    },
    5: {  # Mercury
        1: "friendly", 2: "neutral", 3: "neutral", 4: "neutral", 5: "friendly",
        6: "friendly", 7: "neutral", 8: "neutral", 9: "neutral"
    },
    6: {  # Venus
        1: "enemy", 2: "neutral", 3: "enemy", 4: "friendly", 5: "friendly",
        6: "friendly", 7: "neutral", 8: "friendly", 9: "enemy"
    },
    7: {  # Ketu
        1: "neutral", 2: "neutral", 3: "neutral", 4: "friendly", 5: "friendly",
        6: "neutral", 7: "friendly", 8: "neutral", 9: "enemy"
    },
    8: {  # Saturn
        1: "enemy", 2: "enemy", 3: "enemy", 4: "friendly", 5: "friendly",
        6: "friendly", 7: "neutral", 8: "neutral", 9: "enemy"
    },
    9: {  # Mars
        1: "friendly", 2: "friendly", 3: "friendly", 4: "enemy", 5: "neutral",
        6: "enemy", 7: "neutral", 8: "enemy", 9: "friendly"
    }
}

# ---------------------------------------------------------------------------
# 4. COMPOUND NUMBER OCCULT MEANINGS (Cheiro / Chaldean Double Digits)
# ---------------------------------------------------------------------------

PREFERRED_COMPOUND_NUMBERS = {14, 19, 21, 23, 24, 27, 32, 33, 37, 41, 42, 45, 46, 50}
CHALLENGING_COMPOUND_NUMBERS = {12, 16, 18, 26, 28}

COMPOUND_NUMBER_DATA: Dict[int, Dict[str, Any]] = {
    10: {
        "title_en": "The Wheel of Fortune",
        "title_hi": "भाग्य चक्र",
        "category": "preferred",
        "meaning_en": "Rise in life through confidence and vision. Honor and radiant beginnings.",
        "meaning_hi": "सकारात्मक शुरुआत, आत्मविश्वास और सम्मान। जीवन में निरंतर उन्नति।"
    },
    12: {
        "title_en": "The Sacrifice / Anxieties",
        "title_hi": "त्याग एवं चिंता",
        "category": "challenging",
        "meaning_en": "Victimization, anxiety, and being misunderstood. Tendency to sacrifice own needs for others.",
        "meaning_hi": "दूसरों के लिए स्वयं को कष्ट देना, मानसिक चिंताएं और गलतफहमियों का सामना।"
    },
    14: {
        "title_en": "Movement & Commercial Fortune",
        "title_hi": "गतिशीलता एवं व्यावसायिक लाभ",
        "category": "preferred",
        "meaning_en": "Fortunate in financial movement, risk management, adaptability, and trade.",
        "meaning_hi": "व्यापार में सफलता, अनुकूलनशीलता और वित्तीय गतिशीलता।"
    },
    16: {
        "title_en": "The Shattered Citadel",
        "title_hi": "आकस्मिक विपत्ति",
        "category": "challenging",
        "meaning_en": "Sudden unexpected collapses of plans, vulnerability to pride, and legal or reputation turbulence.",
        "meaning_hi": "योजनाओं में अप्रत्याशित बाधा, मान-सम्मान पर आंच और आकस्मिक चुनौतियां।"
    },
    18: {
        "title_en": "Spiritual Conflict & Treachery",
        "title_hi": "आंतरिक संघर्ष व विश्वासघात",
        "category": "challenging",
        "meaning_en": "Bitter domestic or business betrayals, deception by close associates, internal storms.",
        "meaning_hi": "विश्वासघात का जोखिम, पारिवारिक या व्यावसायिक कलह और तनाव।"
    },
    19: {
        "title_en": "The Prince of Heaven",
        "title_hi": "सूर्य का परम वैभव",
        "category": "preferred",
        "meaning_en": "Extremely fortunate. Radiance, leadership victory, high honors, and resilient health.",
        "meaning_hi": "अत्यंत शुभ। सूर्य का पूर्ण आशीर्वाद, उच्च पद, विजय और जन-सम्मान।"
    },
    21: {
        "title_en": "The Crown of the Magi",
        "title_hi": "सफलता का मुकुट",
        "category": "preferred",
        "meaning_en": "Ultimate triumph after persistent labor. General worldly elevation and social prestige.",
        "meaning_hi": "निरंतर श्रम के बाद परम सफलता, प्रतिष्ठा और सामाजिक सम्मान।"
    },
    23: {
        "title_en": "The Royal Star of the Lion",
        "title_hi": "सिंह का राज-नक्षत्र",
        "category": "preferred",
        "meaning_en": "Guaranteed assistance from seniors and superiors. Protection from malevolent adversaries.",
        "meaning_hi": "अधिकारियों और वरिष्ठों का सहयोग, शत्रुओं पर विजय और निरंतर सफलता।"
    },
    24: {
        "title_en": "Venusian Harmony & Domestic Joy",
        "title_hi": "शुक्र का सौहार्द व ऐश्वर्य",
        "category": "preferred",
        "meaning_en": "Domestic bliss, enduring financial stability, and artistic or cooperative triumphs.",
        "meaning_hi": "पारिवारिक शांति, स्थिर धन लाभ और कलात्मक व सामाजिक कार्यों में यश।"
    },
    26: {
        "title_en": "Saturnian Impediments",
        "title_hi": "कठिन परीक्षा एवं विलंब",
        "category": "challenging",
        "meaning_en": "Financial turbulence, litigation dangers, harsh lessons, and heavy unyielding delays.",
        "meaning_hi": "आर्थिक उतार-चढ़ाव, कार्यों में अत्यधिक विलंब और कानूनी उलझनों का भय।"
    },
    27: {
        "title_en": "The Sceptre of Authority",
        "title_hi": "अधिकार का राजदंड",
        "category": "preferred",
        "meaning_en": "Commanding intellect, strategic victory, executive authority, and respected leadership.",
        "meaning_hi": "रणनीतिक विजय, उच्च प्रशासनिक क्षमता और निर्विवाद नेतृत्व।"
    },
    28: {
        "title_en": "The Broken Promise",
        "title_hi": "विश्वास की परीक्षा",
        "category": "challenging",
        "meaning_en": "Fragile alliances, breach of trust in partnerships, and sudden reversals in commercial ventures.",
        "meaning_hi": "साझेदारी में धोखा, वादे पूरे न होना और व्यापारिक अस्थिरता।"
    },
    32: {
        "title_en": "Wisdom & Expansive Commerce",
        "title_hi": "बुद्धि एवं व्यापक व्यापार",
        "category": "preferred",
        "meaning_en": "International trade, oratorical power, mass connection, and enduring commercial prosperity.",
        "meaning_hi": "व्यापक जन-संपर्क, प्रभावी सम्मोहन शक्ति और व्यापारिक विस्तार।"
    },
    33: {
        "title_en": "The Master of Venus (Maha-Lakshmi)",
        "title_hi": "महा-लक्ष्मी अंक",
        "category": "preferred",
        "meaning_en": "Universal compassion, magnetic influence, high creative artistry, and abundant fortune.",
        "meaning_hi": "सर्वकल्याणकारी, अपार समृद्धि, कलात्मक प्रतिभा और चुंबकीय आकर्षण।"
    },
    37: {
        "title_en": "Fortunate Alliances",
        "title_hi": "शुभ सहयोग एवं मित्रता",
        "category": "preferred",
        "meaning_en": "Fruitful partnerships, good repute, spiritual and intellectual abundance.",
        "meaning_hi": "सच्चे मित्रों का सहयोग, निष्कलंक छवि और बौद्धिक व भौतिक समृद्धि।"
    },
    41: {
        "title_en": "The Radiant Enterprise",
        "title_hi": "तेजस्वी उपक्रम",
        "category": "preferred",
        "meaning_en": "Pioneering ventures, executive clarity, and profitable innovation.",
        "meaning_hi": "नवाचार में सफलता, स्पष्ट निर्णय क्षमता और लाभदायक उपक्रम।"
    },
    42: {
        "title_en": "The Creative Anchor",
        "title_hi": "रचनात्मक स्थायित्व",
        "category": "preferred",
        "meaning_en": "Artistic stability, harmonious diplomacy, and reliable accumulation of assets.",
        "meaning_hi": "स्थिर संपत्ति, कलात्मक कार्य और सौहार्दपूर्ण कूटनीति।"
    },
    45: {
        "title_en": "The Master Diplomat",
        "title_hi": "कुशल कूटनीतिज्ञ",
        "category": "preferred",
        "meaning_en": "Great financial intelligence, international appeal, and diplomatic balance.",
        "meaning_hi": "तीव्र वित्तीय सूझबूझ, जनप्रियता और संतुलन।"
    },
    46: {
        "title_en": "The Auspicious Anchor",
        "title_hi": "कल्याणकारी आधार",
        "category": "preferred",
        "meaning_en": "Sensory delight, enduring domestic peace, and generous public philanthropy.",
        "meaning_hi": "पारिवारिक सुख, स्थिर यश और लोक कल्याण।"
    },
    50: {
        "title_en": "The Liberated Intellect",
        "title_hi": "मुक्त प्रज्ञा",
        "category": "preferred",
        "meaning_en": "Intellectual freedom, communication prowess, and versatility.",
        "meaning_hi": "बौद्धिक स्वतंत्रता, त्वरित निर्णय और उत्तम संचार।"
    }
}

# ---------------------------------------------------------------------------
# 5. CORE ARITHMETIC: DIGIT ROOT (1 to 9)
# ---------------------------------------------------------------------------

def digit_root_1_to_9(value: int) -> int:
    """
    Deterministically reduces a non-negative integer to a single digit 1 to 9.
    Returns 0 only if the input is explicitly 0.
    Raises ValueError for negative numbers or invalid input.
    """
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValueError(f"Value must be an integer, got {type(value).__name__}")
    if value < 0:
        raise ValueError(f"Value must be non-negative, got {value}")
    if value == 0:
        return 0

    # Mathematical digital root for base 10:
    # 1 + ((value - 1) % 9)
    return 1 + ((value - 1) % 9)

# ---------------------------------------------------------------------------
# 6. MOOLANK & BHAGYANK CALCULATIONS
# ---------------------------------------------------------------------------

def calculate_mulank(day: int) -> int:
    """
    Calculates Moolank (Birth / Psychic Number) from day of month (1 to 31).
    Day must be between 1 and 31.
    """
    if not isinstance(day, int) or isinstance(day, bool):
        raise ValueError("Day must be an integer")
    if day < 1 or day > 31:
        raise ValueError(f"Invalid calendar day: {day}. Must be between 1 and 31.")
    return digit_root_1_to_9(day)

def calculate_bhagyank(dob_str: str) -> Dict[str, Any]:
    """
    Calculates Bhagyank (Destiny / Life Path Number) from validated ISO date YYYY-MM-DD.
    Sums all 8 digits and reduces to 1 to 9 while preserving the raw digit sum.
    Supports Master Number detection (11, 22, 33).
    """
    if not dob_str or not isinstance(dob_str, str):
        raise ValueError("Date of birth string is required")

    clean_date = dob_str.strip()[:10]
    match = re.match(r'^(\d{4})-(\d{2})-(\d{2})$', clean_date)
    if not match:
        raise ValueError(f"Invalid date format '{dob_str}'. Expected strict YYYY-MM-DD.")

    year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
    try:
        # Validate calendar date (handles leap years, month boundaries)
        date(year, month, day)
    except ValueError as e:
        raise ValueError(f"Invalid calendar date: {str(e)}")

    # Extract all digits
    digits = [int(c) for c in clean_date if c.isdigit()]
    if len(digits) != 8:
        raise ValueError("Date must contain exactly 8 digits (YYYYMMDD)")

    total_sum = sum(digits)
    root = digit_root_1_to_9(total_sum)

    # Check for master numbers during step-wise reduction
    master_num = None
    curr = total_sum
    while curr > 9:
        if curr in (11, 22, 33):
            master_num = curr
            break
        curr = sum(int(d) for d in str(curr))

    return {
        "destiny_number": root,
        "master_number": master_num,
        "total_sum": total_sum,
        "dob": clean_date,
        "breakdown": f"{' + '.join(str(d) for d in digits)} = {total_sum} -> {root}"
    }

def calculate_name_numbers(name: str) -> Dict[str, Any]:
    """Backwards-compatible name numbers calculator."""
    calc = calculate_naamank(name)
    return {
        "chaldean_name_number": calc["chaldean"]["naamank"],
        "chaldean_compound": calc["chaldean"]["compound_total"],
        "pythagorean_name_number": calc["pythagorean"]["naamank"],
        "pythagorean_compound": calc["pythagorean"]["compound_total"]
    }

def evaluate_number_compatibility(num1: int, num2: int) -> Dict[str, Any]:
    """Evaluates the relationship and synergy between two numbers."""
    base1 = digit_root_1_to_9(num1)
    base2 = digit_root_1_to_9(num2)
    rel = RELATIONSHIP_MATRIX.get(base1, {}).get(base2, "neutral")
    if rel == "friendly":
        score = 90
        desc = "Harmonious / Friendly"
    elif rel == "enemy":
        score = 40
        desc = "Challenging / Inimical"
    else:
        score = 70
        desc = "Neutral / Cooperative"
    return {
        "number_1": base1,
        "number_2": base2,
        "relationship": desc,
        "compatibility_score": score
    }

# ---------------------------------------------------------------------------
# 7. CHALDEAN & PYTHAGOREAN NAAMANK
# ---------------------------------------------------------------------------

def normalize_name_for_calculation(name: str) -> Tuple[str, str]:
    """
    Normalizes a name string:
    - Strips leading/trailing whitespace.
    - Condenses multiple spaces.
    - Preserves upper case.
    - Returns (display_clean, calc_letters_only).
    """
    if not name or not isinstance(name, str):
        return "", ""

    # Replace non-letters (spaces, hyphens, apostrophes)
    display_clean = re.sub(r'\s+', ' ', name.strip()).upper()
    calc_letters_only = re.sub(r'[^A-Z]', '', display_clean)
    return display_clean, calc_letters_only

def calculate_naamank(name: str) -> Dict[str, Any]:
    """
    Computes both Chaldean and Pythagorean Naamank with complete letter-by-letter breakdown,
    raw compound sums, and reduced roots.
    """
    display_clean, letters = normalize_name_for_calculation(name)
    if not letters:
        raise ValueError("Name must contain at least one valid Latin letter (A-Z).")

    # Letter-by-letter calculation
    chaldean_breakdown = []
    pythagorean_breakdown = []

    chaldean_sum = 0
    pythagorean_sum = 0

    for ch in letters:
        c_val = CHALDEAN_MAP.get(ch, 0)
        p_val = PYTHAGOREAN_MAP.get(ch, 0)

        chaldean_breakdown.append({"letter": ch, "value": c_val})
        pythagorean_breakdown.append({"letter": ch, "value": p_val})

        chaldean_sum += c_val
        pythagorean_sum += p_val

    chaldean_root = digit_root_1_to_9(chaldean_sum)
    pythagorean_root = digit_root_1_to_9(pythagorean_sum)

    # Compound interpretation
    compound_info = COMPOUND_NUMBER_DATA.get(chaldean_sum)
    if compound_info:
        compound_category = compound_info["category"]
        compound_title_en = compound_info["title_en"]
        compound_title_hi = compound_info["title_hi"]
        compound_meaning_en = compound_info["meaning_en"]
        compound_meaning_hi = compound_info["meaning_hi"]
    else:
        if chaldean_sum in PREFERRED_COMPOUND_NUMBERS:
            compound_category = "preferred"
            compound_title_en = "Harmonious Vibration"
            compound_title_hi = "शुभ कम्पन"
            compound_meaning_en = "Favorable compound energy aligning with prosperity."
            compound_meaning_hi = "अनुकूल संयुक्त ऊर्जा जो उन्नति में सहायक है।"
        elif chaldean_sum in CHALLENGING_COMPOUND_NUMBERS:
            compound_category = "challenging"
            compound_title_en = "Challenging Vibration"
            compound_title_hi = "कठिन कम्पन"
            compound_meaning_en = "Demands disciplined care and protective spiritual remedies."
            compound_meaning_hi = "सतर्कता और सकारात्मक उपायों की आवश्यकता।"
        else:
            compound_category = "unclassified"
            compound_title_en = f"Compound Total {chaldean_sum}"
            compound_title_hi = f"संयुक्त योग {chaldean_sum}"
            compound_meaning_en = "Standard secondary vibration governed by its reduced root."
            compound_meaning_hi = "सामान्य माध्यमिक कम्पन जो मूल अंक से शासित है।"

    return {
        "original_name": name,
        "normalized_name": display_clean,
        "calculation_letters": letters,
        "letter_count": len(letters),
        "chaldean": {
            "compound_total": chaldean_sum,
            "naamank": chaldean_root,
            "breakdown": chaldean_breakdown,
            "governing_planet": PLANET_DATA[chaldean_root]["planet_en"],
            "governing_planet_hi": PLANET_DATA[chaldean_root]["planet_hi"],
            "compound_category": compound_category,
            "compound_title_en": compound_title_en,
            "compound_title_hi": compound_title_hi,
            "compound_meaning_en": compound_meaning_en,
            "compound_meaning_hi": compound_meaning_hi
        },
        "pythagorean": {
            "compound_total": pythagorean_sum,
            "naamank": pythagorean_root,
            "breakdown": pythagorean_breakdown,
            "governing_planet": PLANET_DATA[pythagorean_root]["planet_en"],
            "governing_planet_hi": PLANET_DATA[pythagorean_root]["planet_hi"]
        }
    }

# ---------------------------------------------------------------------------
# 8. TRANSPARENT HARMONY SCORING (0-100 SCALE)
# ---------------------------------------------------------------------------

def calculate_harmony_score(moolank: int, bhagyank: int, chaldean_compound: int) -> Dict[str, Any]:
    """
    Weighted Harmony Formula:
    Harmony Score = round(0.40 * Moolank Compatibility + 0.40 * Bhagyank Compatibility + 0.20 * Compound Score)

    Planetary compatibility points:
    - Friendly (Mitra): 100 points
    - Neutral (Sama): 65 points
    - Challenging (Shatru): 30 points

    Compound score points:
    - Preferred compound number: 100 points
    - Challenging compound number: 30 points
    - Other / Classified compound: 65 points
    - Unsupported / Unclassified: 60 points
    """
    naamank = digit_root_1_to_9(chaldean_compound)

    # 1. Moolank vs Naamank
    rel_m = RELATIONSHIP_MATRIX.get(moolank, {}).get(naamank, "neutral")
    if rel_m == "friendly":
        score_m = 100
    elif rel_m == "enemy":
        score_m = 30
    else:
        score_m = 65

    # 2. Bhagyank vs Naamank
    rel_b = RELATIONSHIP_MATRIX.get(bhagyank, {}).get(naamank, "neutral")
    if rel_b == "friendly":
        score_b = 100
    elif rel_b == "enemy":
        score_b = 30
    else:
        score_b = 65

    # 3. Compound score
    if chaldean_compound in PREFERRED_COMPOUND_NUMBERS:
        score_c = 100
        comp_cat = "preferred"
    elif chaldean_compound in CHALLENGING_COMPOUND_NUMBERS:
        score_c = 30
        comp_cat = "challenging"
    elif chaldean_compound in COMPOUND_NUMBER_DATA:
        score_c = 65
        comp_cat = "classified"
    else:
        score_c = 60
        comp_cat = "unclassified"

    # Weighted calculation
    final_score = round(0.40 * score_m + 0.40 * score_b + 0.20 * score_c)

    # Qualitative category
    if final_score >= 85:
        tier_en = "High Synergy (Highly Auspicious)"
        tier_hi = "अति उत्तम सामंजस्य (परम शुभ)"
    elif final_score >= 70:
        tier_en = "Moderate Synergy (Favorable)"
        tier_hi = "उत्तम सामंजस्य (अनुकूल)"
    elif final_score >= 50:
        tier_en = "Neutral / Mixed Alignment"
        tier_hi = "मध्यम सामंजस्य (मिश्रित)"
    else:
        tier_en = "Planetary Friction (Correction Recommended)"
        tier_hi = "ग्रहीय विरोध (नाम सुधार अनुशंसित)"

    return {
        "score": final_score,
        "scale": "0-100",
        "model_id": "astroverse-numerology-harmony-v1",
        "alignment_tier_en": tier_en,
        "alignment_tier_hi": tier_hi,
        "components": {
            "moolank_compatibility": {
                "score": score_m,
                "relationship": rel_m,
                "weight": 0.40,
                "moolank": moolank,
                "naamank": naamank
            },
            "bhagyank_compatibility": {
                "score": score_b,
                "relationship": rel_b,
                "weight": 0.40,
                "bhagyank": bhagyank,
                "naamank": naamank
            },
            "compound_number": {
                "score": score_c,
                "category": comp_cat,
                "weight": 0.20,
                "compound_total": chaldean_compound
            }
        }
    }

# ---------------------------------------------------------------------------
# 9. BOUNDED NAME CORRECTION ENGINE
# ---------------------------------------------------------------------------

def _levenshtein_distance(s1: str, s2: str) -> int:
    """Computes basic edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def generate_name_correction_candidates(
    full_name: str,
    dob_iso: str,
    target_count: int = 5,
    moon_nakshatra: Optional[str] = None,
    gender: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generates 3 to 5 realistic, natural spelling alternatives that maximize
    the harmony score with Moolank and Bhagyank and hit preferred compound numbers.
    Uses bounded edit-cost rules (subtle vowel doubling, constrained H/R insertions).
    """
    display_clean, letters = normalize_name_for_calculation(full_name)
    if not letters:
        return []

    # Calculate native baseline
    dob_res = calculate_bhagyank(dob_iso)
    day = int(dob_res["dob"][8:10])
    moolank = calculate_mulank(day)
    bhagyank = dob_res["destiny_number"]

    base_name_res = calculate_naamank(display_clean)
    base_harmony = calculate_harmony_score(
        moolank, bhagyank, base_name_res["chaldean"]["compound_total"]
    )

    # Target ideal compound numbers and roots friendly to both Moolank and Bhagyank
    friendly_to_both = set()
    for root in range(1, 10):
        rel_m = RELATIONSHIP_MATRIX.get(moolank, {}).get(root, "neutral")
        rel_b = RELATIONSHIP_MATRIX.get(bhagyank, {}).get(root, "neutral")
        if rel_m == "friendly" and rel_b == "friendly":
            friendly_to_both.add(root)

    # If no root is friendly to both, find roots where neither is enemy
    if not friendly_to_both:
        for root in range(1, 10):
            rel_m = RELATIONSHIP_MATRIX.get(moolank, {}).get(root, "neutral")
            rel_b = RELATIONSHIP_MATRIX.get(bhagyank, {}).get(root, "neutral")
            if rel_m != "enemy" and rel_b != "enemy":
                friendly_to_both.add(root)

    # Split name into tokens (given name, middle, surname)
    words = display_clean.split(' ')
    if not words:
        words = [display_clean]

    candidates_set = set()
    raw_variations = []

    first_name = words[0]
    surname = " ".join(words[1:]) if len(words) > 1 else ""

    # Bounded candidate generators on first name
    # Transformation 1: Vowel extensions (A -> AA, I -> EE, E -> EE, U -> OO)
    vowel_transformations = [
        ('A', 'AA'), ('I', 'EE'), ('E', 'EE'), ('U', 'OO'), ('I', 'I')
    ]
    for orig_v, new_v in vowel_transformations:
        if orig_v in first_name:
            # Replace first occurrence
            idx = first_name.find(orig_v)
            variant = first_name[:idx] + new_v + first_name[idx+len(orig_v):]
            cand = f"{variant} {surname}".strip()
            if cand != display_clean and cand not in candidates_set:
                candidates_set.add(cand)
                raw_variations.append((cand, f"Subtle vowel optimization ({orig_v} -> {new_v})"))

    # Transformation 2: Controlled 'H' insertion after consonants (S -> SH, K -> KH, D -> DH, T -> TH, G -> GH)
    h_pairs = [('S', 'SH'), ('K', 'KH'), ('D', 'DH'), ('T', 'TH'), ('G', 'GH'), ('R', 'RH')]
    for orig_c, new_c in h_pairs:
        if orig_c in first_name and not (orig_c + 'H') in first_name:
            idx = first_name.find(orig_c)
            variant = first_name[:idx] + new_c + first_name[idx+1:]
            cand = f"{variant} {surname}".strip()
            if cand != display_clean and cand not in candidates_set:
                candidates_set.add(cand)
                raw_variations.append((cand, f"Phonetic harmonizer ({orig_c} -> {new_c})"))

    # Transformation 3: Terminal 'A' or 'H' harmonization
    if not first_name.endswith('A') and not first_name.endswith('H'):
        cand_a = f"{first_name}A {surname}".strip()
        cand_h = f"{first_name}H {surname}".strip()
        if cand_a not in candidates_set:
            candidates_set.add(cand_a)
            raw_variations.append((cand_a, "Terminal 'A' resonant harmonic"))
        if cand_h not in candidates_set:
            candidates_set.add(cand_h)
            raw_variations.append((cand_h, "Terminal 'H' breath harmonizer"))

    # Transformation 4: Doubling internal resonant consonants (N -> NN, R -> RR, L -> LL, M -> MM)
    double_consonants = ['N', 'R', 'L', 'M', 'S', 'T']
    for c in double_consonants:
        if c in first_name and (c + c) not in first_name:
            idx = first_name.find(c)
            variant = first_name[:idx] + (c * 2) + first_name[idx+1:]
            cand = f"{variant} {surname}".strip()
            if cand != display_clean and cand not in candidates_set:
                candidates_set.add(cand)
                raw_variations.append((cand, f"Resonant doubling of '{c}'"))

    # Transformation 5: Initial addition (e.g. adding middle initial 'K.', 'S.', 'A.')
    initials = ['A.', 'S.', 'K.', 'R.', 'V.']
    for init in initials:
        cand_init = f"{first_name} {init} {surname}".strip() if surname else f"{first_name} {init}"
        if cand_init not in candidates_set:
            candidates_set.add(cand_init)
            raw_variations.append((cand_init, f"Honorific initial '{init}'"))

    # Score each variation
    scored_candidates = []
    for cand_name, rule_note in raw_variations:
        try:
            cand_calc = calculate_naamank(cand_name)
            cand_comp = cand_calc["chaldean"]["compound_total"]
            cand_root = cand_calc["chaldean"]["naamank"]

            cand_harmony = calculate_harmony_score(moolank, bhagyank, cand_comp)
            score = cand_harmony["score"]

            # Edit distance penalty
            edit_dist = _levenshtein_distance(display_clean, cand_name)

            # Bonus if target compound is preferred
            pref_bonus = 10 if cand_comp in PREFERRED_COMPOUND_NUMBERS else 0
            # Severe penalty if target compound is challenging
            pen_chall = -30 if cand_comp in CHALLENGING_COMPOUND_NUMBERS else 0
            # Target root bonus
            root_bonus = 15 if cand_root in friendly_to_both else 0

            composite_rank = score + pref_bonus + pen_chall + root_bonus - (edit_dist * 2)

            scored_candidates.append({
                "proposed_name": cand_name,
                "alteration_note_en": rule_note,
                "alteration_note_hi": f"सुझावित संशोधन: {rule_note}",
                "edit_distance": edit_dist,
                "chaldean_compound": cand_comp,
                "chaldean_naamank": cand_root,
                "pythagorean_compound": cand_calc["pythagorean"]["compound_total"],
                "pythagorean_naamank": cand_calc["pythagorean"]["naamank"],
                "governing_planet_en": PLANET_DATA[cand_root]["planet_en"],
                "governing_planet_hi": PLANET_DATA[cand_root]["planet_hi"],
                "harmony_score": score,
                "alignment_tier_en": cand_harmony["alignment_tier_en"],
                "alignment_tier_hi": cand_harmony["alignment_tier_hi"],
                "composite_rank": composite_rank,
                "is_preferred_compound": cand_comp in PREFERRED_COMPOUND_NUMBERS,
                "compound_title_en": cand_calc["chaldean"]["compound_title_en"],
                "compound_title_hi": cand_calc["chaldean"]["compound_title_hi"]
            })
        except Exception:
            continue

    # Sort deterministically: highest composite_rank, then highest harmony_score, then lowest edit distance
    scored_candidates.sort(key=lambda x: (x["composite_rank"], x["harmony_score"], -x["edit_distance"]), reverse=True)

    # Filter candidates to only return those with score >= base_harmony score, or top candidates
    final_list = []
    seen_compounds = set()
    for sc in scored_candidates:
        # Diversify compounds so user gets distinct options
        if sc["chaldean_compound"] not in seen_compounds or len(seen_compounds) >= target_count:
            seen_compounds.add(sc["chaldean_compound"])
            final_list.append(sc)
            if len(final_list) >= target_count:
                break

    # If still fewer than target_count, backfill from remaining
    if len(final_list) < target_count:
        for sc in scored_candidates:
            if sc not in final_list:
                final_list.append(sc)
                if len(final_list) >= target_count:
                    break

    return final_list

# ---------------------------------------------------------------------------
# 10. SIGNATURE GUIDANCE BLUEPRINT
# ---------------------------------------------------------------------------

def get_signature_guidance(moolank: int, naamank: int) -> Dict[str, Any]:
    """
    Returns authentic graphological & Vedic signature alignment rules:
    - Slope angle
    - Baseline direction
    - Underlining and dots
    - Capitalization and legibility
    """
    planet_m = PLANET_DATA.get(moolank, PLANET_DATA[1])
    planet_n = PLANET_DATA.get(naamank, PLANET_DATA[1])

    return {
        "recommended_slope": "+15° to +25° (Upward Ascending)",
        "guidance_en": {
            "slope": "Maintain an ascending slant (+15° to +25°) from left to right, symbolizing continuous growth, optimism, and spiritual elevation.",
            "baseline": "Never allow the ending letters to dip below the initial baseline, as a drooping signature invites sudden fatigue or missed opportunities.",
            "initial_letter": "Keep the first letter distinct, elegant, and larger than the subsequent letters, reinforcing natural leadership and self-confidence.",
            "underlining": "Use a single, clean, unbroken underline beneath the name without intersecting any descending loops (such as g, y, or j).",
            "dots": "Place two distinct dots beneath the underline to ground personal authority, stability, and enduring prosperity.",
            "legibility": "Ensure the signature remains effortlessly legible. Avoid strikes or crossing out through your own name."
        },
        "guidance_hi": {
            "slope": "हस्ताक्षर को बाएं से दाएं ऊपर की ओर (+15° से +25°) रखें, जो निरंतर प्रगति और आशावादिता का प्रतीक है।",
            "baseline": "हस्ताक्षर के अंतिम अक्षरों को नीचे की ओर न झुकने दें; यह ऊर्जा और अवसरों में स्थिरता बनाए रखता है।",
            "initial_letter": "प्रथम अक्षर को स्पष्ट, सुंदर और बाद के अक्षरों से थोड़ा बड़ा बनाएं, जो आत्मविश्वास को दर्शाता है।",
            "underlining": "हस्ताक्षर के नीचे एक सीधी, अखंड रेखा खींचें जो अक्षरों को न काटे।",
            "dots": "रेखा के नीचे दो स्पष्ट बिंदु लगाएं जो स्थायित्व, सत्ता और समृद्धि का प्रतीक हैं।",
            "legibility": "हस्ताक्षर स्पष्ट और पठनीय होना चाहिए; अपने ही नाम को काटने वाली रेखाओं से बचें।"
        },
        "planetary_harmony": f"Synchronized with Moolank {moolank} ({planet_m['planet_en']}) and Naamank {naamank} ({planet_n['planet_en']})."
    }

# ---------------------------------------------------------------------------
# 11. BUSINESS NAME & MOBILE NUMBER EPHEMERAL ANALYSIS
# ---------------------------------------------------------------------------

def analyze_business_name(
    business_name: str,
    owner_dob_iso: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyzes a commercial entity or brand name via Chaldean & Pythagorean systems.
    Evaluates harmony with the founder's Moolank / Bhagyank if provided.
    """
    calc = calculate_naamank(business_name)
    c_comp = calc["chaldean"]["compound_total"]
    c_root = calc["chaldean"]["naamank"]

    owner_synergy = None
    if owner_dob_iso:
        try:
            b_data = calculate_bhagyank(owner_dob_iso)
            day = int(b_data["dob"][8:10])
            moolank = calculate_mulank(day)
            bhagyank = b_data["destiny_number"]

            harmony = calculate_harmony_score(moolank, bhagyank, c_comp)
            owner_synergy = {
                "owner_moolank": moolank,
                "owner_bhagyank": bhagyank,
                "harmony_score": harmony["score"],
                "alignment_tier_en": harmony["alignment_tier_en"],
                "alignment_tier_hi": harmony["alignment_tier_hi"]
            }
        except Exception:
            pass

    return {
        "business_name": business_name,
        "calculation": calc,
        "is_preferred_compound": c_comp in PREFERRED_COMPOUND_NUMBERS,
        "commercial_vibration_en": f"Governed by {PLANET_DATA[c_root]['planet_en']}. {calc['chaldean']['compound_meaning_en']}",
        "commercial_vibration_hi": f"{PLANET_DATA[c_root]['planet_hi']} द्वारा शासित। {calc['chaldean']['compound_meaning_hi']}",
        "owner_alignment": owner_synergy
    }

def analyze_mobile_number(phone_str: str) -> Dict[str, Any]:
    """
    Analyzes a mobile phone number:
    - Strips non-digits ephemeral only (never logs or persists raw personal numbers).
    - Computes digit sum and digital root.
    - Evaluates planetary energy.
    """
    digits = [int(c) for c in phone_str if c.isdigit()]
    if not digits:
        raise ValueError("Mobile number must contain valid numerical digits.")

    # Standard Indian mobile: last 10 digits; or full string if shorter
    calc_digits = digits[-10:] if len(digits) >= 10 else digits
    digit_sum = sum(calc_digits)
    root = digit_root_1_to_9(digit_sum)

    planet_info = PLANET_DATA[root]

    return {
        "digit_count": len(calc_digits),
        "compound_total": digit_sum,
        "reduced_number": root,
        "governing_planet_en": planet_info["planet_en"],
        "governing_planet_hi": planet_info["planet_hi"],
        "telecom_archetype_en": planet_info["archetype_en"],
        "telecom_archetype_hi": planet_info["archetype_hi"],
        "lucky_colors_en": planet_info["lucky_colors_en"],
        "lucky_colors_hi": planet_info["lucky_colors_hi"],
        "sanitized_display": f"...{phone_str[-4:]}" if len(phone_str) >= 4 else phone_str
    }

# ---------------------------------------------------------------------------
# 12. UNIFIED FULL NUMEROLOGY SUITE (Backwards Compatibility)
# ---------------------------------------------------------------------------

def calculate_full_numerology(name: str, dob_iso: str) -> Dict[str, Any]:
    """
    Primary orchestrator returning complete Moolank, Bhagyank, Naamank,
    Harmony Score, and Favorable Elements.
    """
    dob_res = calculate_bhagyank(dob_iso)
    day = int(dob_res["dob"][8:10])
    moolank = calculate_mulank(day)
    bhagyank = dob_res["destiny_number"]

    name_res = calculate_naamank(name)
    c_comp = name_res["chaldean"]["compound_total"]
    c_root = name_res["chaldean"]["naamank"]
    p_comp = name_res["pythagorean"]["compound_total"]
    p_root = name_res["pythagorean"]["naamank"]

    harmony = calculate_harmony_score(moolank, bhagyank, c_comp)

    planet_m = PLANET_DATA[moolank]
    planet_b = PLANET_DATA[bhagyank]
    planet_n = PLANET_DATA[c_root]

    return {
        "profile": {
            "name": name,
            "dob": dob_res["dob"],
            "calculation_spelling": name_res["normalized_name"]
        },
        "birth_number": {
            "value": moolank,
            "title": "Moolank (Psychic / Birth Number)",
            "title_hi": "मूलांक (जन्मांक)",
            "governing_planet": planet_m["planet_en"],
            "governing_planet_hi": planet_m["planet_hi"],
            "archetype": planet_m["archetype_en"],
            "archetype_hi": planet_m["archetype_hi"],
            "qualities": planet_m["qualities_en"],
            "qualities_hi": planet_m["qualities_hi"],
            "element": planet_m["element_en"]
        },
        "destiny_number": {
            "value": bhagyank,
            "master_number": dob_res["master_number"],
            "total_compound": dob_res["total_sum"],
            "title": "Bhagyank (Destiny / Life Path Number)",
            "title_hi": "भाग्यांक (जीवन पथ अंक)",
            "governing_planet": planet_b["planet_en"],
            "governing_planet_hi": planet_b["planet_hi"],
            "archetype": planet_b["archetype_en"],
            "archetype_hi": planet_b["archetype_hi"],
            "qualities": planet_b["qualities_en"],
            "qualities_hi": planet_b["qualities_hi"],
            "breakdown": dob_res["breakdown"]
        },
        "name_numbers": {
            "chaldean": {
                "number": c_root,
                "naamank": c_root,
                "compound_total": c_comp,
                "breakdown": name_res["chaldean"]["breakdown"],
                "system": "Chaldean (Vedic Standard)",
                "governing_planet": planet_n["planet_en"],
                "governing_planet_hi": planet_n["planet_hi"],
                "compound_title_en": name_res["chaldean"]["compound_title_en"],
                "compound_title_hi": name_res["chaldean"]["compound_title_hi"],
                "compound_meaning_en": name_res["chaldean"]["compound_meaning_en"],
                "compound_meaning_hi": name_res["chaldean"]["compound_meaning_hi"]
            },
            "pythagorean": {
                "number": p_root,
                "naamank": p_root,
                "compound_total": p_comp,
                "breakdown": name_res["pythagorean"]["breakdown"],
                "system": "Pythagorean",
                "governing_planet": PLANET_DATA[p_root]["planet_en"],
                "governing_planet_hi": PLANET_DATA[p_root]["planet_hi"]
            }
        },
        "harmony": harmony,
        "favorable_elements": {
            "lucky_colors": planet_m["lucky_colors_en"],
            "lucky_colors_hi": planet_m["lucky_colors_hi"],
            "lucky_days": planet_m["lucky_days_en"],
            "lucky_days_hi": planet_m["lucky_days_hi"],
            "lucky_gemstone": planet_m["lucky_gem_en"],
            "lucky_gemstone_hi": planet_m["lucky_gem_hi"]
        }
    }
