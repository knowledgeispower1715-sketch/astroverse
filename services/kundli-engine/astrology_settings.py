"""
AstroVerse AI — Canonical Astrology Settings & Methodology Registry
Defines the primary Parashari calculation profile, astronomical conventions,
and standardized metadata generators for API responses and report outputs.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
import swisseph as swe

METHODOLOGY_PROFILE_NAME = "ASTROVERSE_PARASHARI_LAHIRI_DRIK"
METHODOLOGY_VERSION = "2.0.0-parashari-lahiri-drik"

# Core Astrological Conventions
ZODIAC_SYSTEM = "Sidereal (Nirayana)"
AYANAMSHA_NAME = "Lahiri / Chitra Paksha"
AYANAMSHA_SWISSEPH_MODE = swe.SIDM_LAHIRI
HOUSE_SYSTEM_PRIMARY = "Whole-Sign Rashi Houses"
HOUSE_SYSTEM_SECONDARY = "Equal Bhava Chalit (Lagna Cusp Midpoint Sandhi ±15°)"
DASHA_SYSTEM = "Vimshottari (120-Year Lifespan Cycle)"
NODE_CALCULATION = "Mean Node (swe.MEAN_NODE, Rahu/Ketu 180° true opposition)"
POSITION_MODEL = "Geocentric Apparent Sidereal"

# Vimshottari Year Conventions
CONVENTION_GREGORIAN_MEAN = "Gregorian Mean-Year (365.2425 days)"
CONVENTION_JULIAN = "Julian Calendar (365.25 days)"
CONVENTION_SAVANA_360 = "Savana 360-Day Classical Year (360.0 days)"

DAYS_PER_YEAR_DEFAULT = 365.2425
DAYS_PER_YEAR_JULIAN = 365.25
DAYS_PER_YEAR_SAVANA = 360.0

# Standard Zodiac & Nakshatra Collections
SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

# Multilingual and Detailed Astrological Registries
SIGNS_DETAILED = [
    {"index": 0, "name_en": "Aries", "name_hi": "मेष", "name_sa": "Mesha", "lord": "Mars", "element": "Fire"},
    {"index": 1, "name_en": "Taurus", "name_hi": "वृषभ", "name_sa": "Vrishabha", "lord": "Venus", "element": "Earth"},
    {"index": 2, "name_en": "Gemini", "name_hi": "मिथुन", "name_sa": "Mithuna", "lord": "Mercury", "element": "Air"},
    {"index": 3, "name_en": "Cancer", "name_hi": "कर्क", "name_sa": "Karka", "lord": "Moon", "element": "Water"},
    {"index": 4, "name_en": "Leo", "name_hi": "सिंह", "name_sa": "Simha", "lord": "Sun", "element": "Fire"},
    {"index": 5, "name_en": "Virgo", "name_hi": "कन्या", "name_sa": "Kanya", "lord": "Mercury", "element": "Earth"},
    {"index": 6, "name_en": "Libra", "name_hi": "तुला", "name_sa": "Tula", "lord": "Venus", "element": "Air"},
    {"index": 7, "name_en": "Scorpio", "name_hi": "वृश्चिक", "name_sa": "Vrishchika", "lord": "Mars", "element": "Water"},
    {"index": 8, "name_en": "Sagittarius", "name_hi": "धनु", "name_sa": "Dhanu", "lord": "Jupiter", "element": "Fire"},
    {"index": 9, "name_en": "Capricorn", "name_hi": "मकर", "name_sa": "Makara", "lord": "Saturn", "element": "Earth"},
    {"index": 10, "name_en": "Aquarius", "name_hi": "कुंभ", "name_sa": "Kumbha", "lord": "Saturn", "element": "Air"},
    {"index": 11, "name_en": "Pisces", "name_hi": "मीन", "name_sa": "Meena", "lord": "Jupiter", "element": "Water"}
]

NAKSHATRAS_DETAILED = [
    {"index": 0, "name_en": "Ashwini", "name_hi": "अश्विनी", "name_sa": "Aśvinī", "lord": "Ketu", "deity": "Ashwini Kumaras"},
    {"index": 1, "name_en": "Bharani", "name_hi": "भरणी", "name_sa": "Bharaṇī", "lord": "Venus", "deity": "Yama"},
    {"index": 2, "name_en": "Krittika", "name_hi": "कृत्तिका", "name_sa": "Kṛttikā", "lord": "Sun", "deity": "Agni"},
    {"index": 3, "name_en": "Rohini", "name_hi": "रोहिणी", "name_sa": "Rohiṇī", "lord": "Moon", "deity": "Brahma / Prajapati"},
    {"index": 4, "name_en": "Mrigashira", "name_hi": "मृगशिरा", "name_sa": "Mṛgaśīrṣā", "lord": "Mars", "deity": "Soma"},
    {"index": 5, "name_en": "Ardra", "name_hi": "आर्द्रा", "name_sa": "Ārdrā", "lord": "Rahu", "deity": "Rudra"},
    {"index": 6, "name_en": "Punarvasu", "name_hi": "पुनर्वसु", "name_sa": "Punarvasu", "lord": "Jupiter", "deity": "Aditi"},
    {"index": 7, "name_en": "Pushya", "name_hi": "पुष्य", "name_sa": "Puṣya", "lord": "Saturn", "deity": "Brihaspati"},
    {"index": 8, "name_en": "Ashlesha", "name_hi": "आश्लेषा", "name_sa": "Āśleṣā", "lord": "Mercury", "deity": "Sarpa / Nagas"},
    {"index": 9, "name_en": "Magha", "name_hi": "मघा", "name_sa": "Maghā", "lord": "Ketu", "deity": "Pitris"},
    {"index": 10, "name_en": "Purva Phalguni", "name_hi": "पूर्वाफाल्गुनी", "name_sa": "Pūrva Phalgunī", "lord": "Venus", "deity": "Bhaga"},
    {"index": 11, "name_en": "Uttara Phalguni", "name_hi": "उत्तराफाल्गुनी", "name_sa": "Uttara Phalgunī", "lord": "Sun", "deity": "Aryaman"},
    {"index": 12, "name_en": "Hasta", "name_hi": "हस्त", "name_sa": "Hasta", "lord": "Moon", "deity": "Savitr"},
    {"index": 13, "name_en": "Chitra", "name_hi": "चित्रा", "name_sa": "Citrā", "lord": "Mars", "deity": "Tvashtar / Vishwakarma"},
    {"index": 14, "name_en": "Swati", "name_hi": "स्वाति", "name_sa": "Svātī", "lord": "Rahu", "deity": "Vayu"},
    {"index": 15, "name_en": "Vishakha", "name_hi": "विशाखा", "name_sa": "Viśākhā", "lord": "Jupiter", "deity": "Indragni"},
    {"index": 16, "name_en": "Anuradha", "name_hi": "अनुराधा", "name_sa": "Anurādhā", "lord": "Saturn", "deity": "Mitra"},
    {"index": 17, "name_en": "Jyeshtha", "name_hi": "ज्येष्ठा", "name_sa": "Jyeṣṭhā", "lord": "Mercury", "deity": "Indra"},
    {"index": 18, "name_en": "Mula", "name_hi": "मूल", "name_sa": "Mūla", "lord": "Ketu", "deity": "Nirriti"},
    {"index": 19, "name_en": "Purva Ashadha", "name_hi": "पूर्वाषाढ़ा", "name_sa": "Pūrvāṣāḍhā", "lord": "Venus", "deity": "Apas"},
    {"index": 20, "name_en": "Uttara Ashadha", "name_hi": "उत्तराषाढ़ा", "name_sa": "Uttarāṣāḍhā", "lord": "Sun", "deity": "Vishvedevas"},
    {"index": 21, "name_en": "Shravana", "name_hi": "श्रवण", "name_sa": "Śravaṇa", "lord": "Moon", "deity": "Vishnu"},
    {"index": 22, "name_en": "Dhanishta", "name_hi": "धनिष्ठा", "name_sa": "Dhaniṣṭhā", "lord": "Mars", "deity": "Ashta Vasus"},
    {"index": 23, "name_en": "Shatabhisha", "name_hi": "शतभिषा", "name_sa": "Śatabhiṣā", "lord": "Rahu", "deity": "Varuna"},
    {"index": 24, "name_en": "Purva Bhadrapada", "name_hi": "पूर्वभाद्रपद", "name_sa": "Pūrva Bhādrapadā", "lord": "Jupiter", "deity": "Aja Ekapada"},
    {"index": 25, "name_en": "Uttara Bhadrapada", "name_hi": "उत्तरभाद्रपद", "name_sa": "Uttara Bhādrapadā", "lord": "Saturn", "deity": "Ahirbudhnya"},
    {"index": 26, "name_en": "Revati", "name_hi": "रेवती", "name_sa": "Revatī", "lord": "Mercury", "deity": "Pushan"}
]

TITHIS_DETAILED = [
    {"index": 0, "name_en": "Shukla Pratipada", "name_hi": "शुक्ल प्रतिपदा", "name_sa": "Śukla Pratipadā", "paksha": "Shukla", "number": 1},
    {"index": 1, "name_en": "Shukla Dwitiya", "name_hi": "शुक्ल द्वितीया", "name_sa": "Śukla Dvitīyā", "paksha": "Shukla", "number": 2},
    {"index": 2, "name_en": "Shukla Tritiya", "name_hi": "शुक्ल तृतीया", "name_sa": "Śukla Tṛtīyā", "paksha": "Shukla", "number": 3},
    {"index": 3, "name_en": "Shukla Chaturthi", "name_hi": "शुक्ल चतुर्थी", "name_sa": "Śukla Caturthī", "paksha": "Shukla", "number": 4},
    {"index": 4, "name_en": "Shukla Panchami", "name_hi": "शुक्ल पंचमी", "name_sa": "Śukla Pañcamī", "paksha": "Shukla", "number": 5},
    {"index": 5, "name_en": "Shukla Shashti", "name_hi": "शुक्ल षष्ठी", "name_sa": "Śukla Ṣaṣṭhī", "paksha": "Shukla", "number": 6},
    {"index": 6, "name_en": "Shukla Saptami", "name_hi": "शुक्ल सप्तमी", "name_sa": "Śukla Saptamī", "paksha": "Shukla", "number": 7},
    {"index": 7, "name_en": "Shukla Ashtami", "name_hi": "शुक्ल अष्टमी", "name_sa": "Śukla Aṣṭamī", "paksha": "Shukla", "number": 8},
    {"index": 8, "name_en": "Shukla Navami", "name_hi": "शुक्ल नवमी", "name_sa": "Śukla Navamī", "paksha": "Shukla", "number": 9},
    {"index": 9, "name_en": "Shukla Dashami", "name_hi": "शुक्ल दशमी", "name_sa": "Śukla Daśamī", "paksha": "Shukla", "number": 10},
    {"index": 10, "name_en": "Shukla Ekadashi", "name_hi": "शुक्ल एकादशी", "name_sa": "Śukla Ekādaśī", "paksha": "Shukla", "number": 11},
    {"index": 11, "name_en": "Shukla Dwadashi", "name_hi": "शुक्ल द्वादशी", "name_sa": "Śukla Dvādaśī", "paksha": "Shukla", "number": 12},
    {"index": 12, "name_en": "Shukla Trayodashi", "name_hi": "शुक्ल त्रयोदशी", "name_sa": "Śukla Trayodaśī", "paksha": "Shukla", "number": 13},
    {"index": 13, "name_en": "Shukla Chaturdashi", "name_hi": "शुक्ल चतुर्दशी", "name_sa": "Śukla Caturdaśī", "paksha": "Shukla", "number": 14},
    {"index": 14, "name_en": "Purnima", "name_hi": "पूर्णिमा", "name_sa": "Pūrṇimā", "paksha": "Shukla", "number": 15},
    {"index": 15, "name_en": "Krishna Pratipada", "name_hi": "कृष्ण प्रतिपदा", "name_sa": "Kṛṣṇa Pratipadā", "paksha": "Krishna", "number": 1},
    {"index": 16, "name_en": "Krishna Dwitiya", "name_hi": "कृष्ण द्वितीया", "name_sa": "Kṛṣṇa Dvitīyā", "paksha": "Krishna", "number": 2},
    {"index": 17, "name_en": "Krishna Tritiya", "name_hi": "कृष्ण तृतीया", "name_sa": "Kṛṣṇa Tṛtīyā", "paksha": "Krishna", "number": 3},
    {"index": 18, "name_en": "Krishna Chaturthi", "name_hi": "कृष्ण चतुर्थी", "name_sa": "Kṛṣṇa Caturthī", "paksha": "Krishna", "number": 4},
    {"index": 19, "name_en": "Krishna Panchami", "name_hi": "कृष्ण पंचमी", "name_sa": "Kṛṣṇa Pañcamī", "paksha": "Krishna", "number": 5},
    {"index": 20, "name_en": "Krishna Shashti", "name_hi": "कृष्ण षष्ठी", "name_sa": "Kṛṣṇa Ṣaṣṭhī", "paksha": "Krishna", "number": 6},
    {"index": 21, "name_en": "Krishna Saptami", "name_hi": "कृष्ण सप्तमी", "name_sa": "Kṛṣṇa Saptamī", "paksha": "Krishna", "number": 7},
    {"index": 22, "name_en": "Krishna Ashtami", "name_hi": "कृष्ण अष्टमी", "name_sa": "Kṛṣṇa Aṣṭamī", "paksha": "Krishna", "number": 8},
    {"index": 23, "name_en": "Krishna Navami", "name_hi": "कृष्ण नवमी", "name_sa": "Kṛṣṇa Navamī", "paksha": "Krishna", "number": 9},
    {"index": 24, "name_en": "Krishna Dashami", "name_hi": "कृष्ण दशमी", "name_sa": "Kṛṣṇa Daśamī", "paksha": "Krishna", "number": 10},
    {"index": 25, "name_en": "Krishna Ekadashi", "name_hi": "कृष्ण एकादशी", "name_sa": "Kṛṣṇa Ekādaśī", "paksha": "Krishna", "number": 11},
    {"index": 26, "name_en": "Krishna Dwadashi", "name_hi": "कृष्ण द्वादशी", "name_sa": "Kṛṣṇa Dvādaśī", "paksha": "Krishna", "number": 12},
    {"index": 27, "name_en": "Krishna Trayodashi", "name_hi": "कृष्ण त्रयोदशी", "name_sa": "Kṛṣṇa Trayodaśī", "paksha": "Krishna", "number": 13},
    {"index": 28, "name_en": "Krishna Chaturdashi", "name_hi": "कृष्ण चतुर्दशी", "name_sa": "Kṛṣṇa Caturdaśī", "paksha": "Krishna", "number": 14},
    {"index": 29, "name_en": "Amavasya", "name_hi": "अमावस्या", "name_sa": "Amāvasyā", "paksha": "Krishna", "number": 15}
]

YOGAS_DETAILED = [
    {"index": 0, "name_en": "Vishkambha", "name_hi": "विष्कुम्भ", "name_sa": "Viṣkambha", "nature": "Inauspicious"},
    {"index": 1, "name_en": "Priti", "name_hi": "प्रीति", "name_sa": "Prīti", "nature": "Auspicious"},
    {"index": 2, "name_en": "Ayushman", "name_hi": "आयुष्मान", "name_sa": "Āyuṣmān", "nature": "Auspicious"},
    {"index": 3, "name_en": "Saubhagya", "name_hi": "सौभाग्य", "name_sa": "Saubhāgya", "nature": "Auspicious"},
    {"index": 4, "name_en": "Shobhana", "name_hi": "शोभन", "name_sa": "Śobhana", "nature": "Auspicious"},
    {"index": 5, "name_en": "Atiganda", "name_hi": "अतिगण्ड", "name_sa": "Atigaṇḍa", "nature": "Inauspicious"},
    {"index": 6, "name_en": "Sukarma", "name_hi": "सुकर्मा", "name_sa": "Sukarmā", "nature": "Auspicious"},
    {"index": 7, "name_en": "Dhriti", "name_hi": "धृति", "name_sa": "Dhṛti", "nature": "Auspicious"},
    {"index": 8, "name_en": "Shula", "name_hi": "शूल", "name_sa": "Śūla", "nature": "Inauspicious"},
    {"index": 9, "name_en": "Ganda", "name_hi": "गण्ड", "name_sa": "Gaṇḍa", "nature": "Inauspicious"},
    {"index": 10, "name_en": "Vriddhi", "name_hi": "वृद्धि", "name_sa": "Vṛddhi", "nature": "Auspicious"},
    {"index": 11, "name_en": "Dhruva", "name_hi": "ध्रुव", "name_sa": "Dhruva", "nature": "Auspicious"},
    {"index": 12, "name_en": "Vyaghata", "name_hi": "व्याघात", "name_sa": "Vyāghāta", "nature": "Inauspicious"},
    {"index": 13, "name_en": "Harshana", "name_hi": "हर्षण", "name_sa": "Harṣaṇa", "nature": "Auspicious"},
    {"index": 14, "name_en": "Vajra", "name_hi": "वज्र", "name_sa": "Vajra", "nature": "Inauspicious"},
    {"index": 15, "name_en": "Siddhi", "name_hi": "सिद्धि", "name_sa": "Siddhi", "nature": "Auspicious"},
    {"index": 16, "name_en": "Vyatipata", "name_hi": "व्यतीपात", "name_sa": "Vyatīpāta", "nature": "Inauspicious"},
    {"index": 17, "name_en": "Variyan", "name_hi": "वरीयान्", "name_sa": "Varīyān", "nature": "Auspicious"},
    {"index": 18, "name_en": "Parigha", "name_hi": "परिघ", "name_sa": "Parigha", "nature": "Inauspicious"},
    {"index": 19, "name_en": "Shiva", "name_hi": "शिव", "name_sa": "Śiva", "nature": "Auspicious"},
    {"index": 20, "name_en": "Siddha", "name_hi": "सिद्ध", "name_sa": "Siddha", "nature": "Auspicious"},
    {"index": 21, "name_en": "Sadhya", "name_hi": "साध्य", "name_sa": "Sādhya", "nature": "Auspicious"},
    {"index": 22, "name_en": "Shubha", "name_hi": "शुभ", "name_sa": "Śubha", "nature": "Auspicious"},
    {"index": 23, "name_en": "Shukla", "name_hi": "शुक्ल", "name_sa": "Śukla", "nature": "Auspicious"},
    {"index": 24, "name_en": "Brahma", "name_hi": "ब्रह्म", "name_sa": "Brahma", "nature": "Auspicious"},
    {"index": 25, "name_en": "Indra", "name_hi": "इन्द्र", "name_sa": "Indra", "nature": "Auspicious"},
    {"index": 26, "name_en": "Vaidhriti", "name_hi": "वैधृति", "name_sa": "Vaidhṛti", "nature": "Inauspicious"}
]

KARANAS_DETAILED = [
    # 7 Movable (Chara) Karanas
    {"index": 0, "name_en": "Bava", "name_hi": "बव", "name_sa": "Bava", "is_fixed": False, "lord": "Sun"},
    {"index": 1, "name_en": "Balava", "name_hi": "बालव", "name_sa": "Bālava", "is_fixed": False, "lord": "Moon"},
    {"index": 2, "name_en": "Kaulava", "name_hi": "कौलव", "name_sa": "Kaulava", "is_fixed": False, "lord": "Mars"},
    {"index": 3, "name_en": "Taitila", "name_hi": "तैतिल", "name_sa": "Taitila", "is_fixed": False, "lord": "Mercury"},
    {"index": 4, "name_en": "Gara", "name_hi": "गर", "name_sa": "Gara", "is_fixed": False, "lord": "Jupiter"},
    {"index": 5, "name_en": "Vanija", "name_hi": "वणिज", "name_sa": "Vaṇija", "is_fixed": False, "lord": "Venus"},
    {"index": 6, "name_en": "Vishti (Bhadra)", "name_hi": "विष्टि (भद्रा)", "name_sa": "Viṣṭi (Bhadrā)", "is_fixed": False, "lord": "Saturn"},
    # 4 Fixed (Sthira) Karanas
    {"index": 7, "name_en": "Shakuni", "name_hi": "शकुनि", "name_sa": "Śakuni", "is_fixed": True, "lord": "Rahu"},
    {"index": 8, "name_en": "Chatushpada", "name_hi": "चतुष्पद", "name_sa": "Catuṣpada", "is_fixed": True, "lord": "Ketu"},
    {"index": 9, "name_en": "Naga", "name_hi": "नाग", "name_sa": "Nāga", "is_fixed": True, "lord": "Rahu"},
    {"index": 10, "name_en": "Kintughna", "name_hi": "किंस्तुघ्न", "name_sa": "Kiṃstughna", "is_fixed": True, "lord": "Ketu"}
]

LUNAR_MONTHS = [
    {"index": 0, "name_en": "Chaitra", "name_hi": "चैत्र", "name_sa": "Caitra", "solar_ingress_rashi": 0},
    {"index": 1, "name_en": "Vaishakha", "name_hi": "वैशाख", "name_sa": "Vaiśākha", "solar_ingress_rashi": 1},
    {"index": 2, "name_en": "Jyeshtha", "name_hi": "ज्येष्ठ", "name_sa": "Jyeṣṭha", "solar_ingress_rashi": 2},
    {"index": 3, "name_en": "Ashadha", "name_hi": "आषाढ़", "name_sa": "Āṣāḍha", "solar_ingress_rashi": 3},
    {"index": 4, "name_en": "Shravana", "name_hi": "श्रावण", "name_sa": "Śrāvaṇa", "solar_ingress_rashi": 4},
    {"index": 5, "name_en": "Bhadrapada", "name_hi": "भाद्रपद", "name_sa": "Bhādrapada", "solar_ingress_rashi": 5},
    {"index": 6, "name_en": "Ashwina", "name_hi": "आश्विन", "name_sa": "Āśvina", "solar_ingress_rashi": 6},
    {"index": 7, "name_en": "Kartika", "name_hi": "कार्तिक", "name_sa": "Kārtika", "solar_ingress_rashi": 7},
    {"index": 8, "name_en": "Margashirsha", "name_hi": "मार्गशीर्ष", "name_sa": "Mārgaśīrṣa", "solar_ingress_rashi": 8},
    {"index": 9, "name_en": "Pausha", "name_hi": "पौष", "name_sa": "Pauṣa", "solar_ingress_rashi": 9},
    {"index": 10, "name_en": "Magha", "name_hi": "माघ", "name_sa": "Māgha", "solar_ingress_rashi": 10},
    {"index": 11, "name_en": "Phalguna", "name_hi": "फाल्गुन", "name_sa": "Phālguna", "solar_ingress_rashi": 11}
]

WEEKDAYS_DETAILED = [
    {"index": 0, "name_en": "Monday", "name_hi": "सोमवार", "name_sa": "Somavāra", "lord": "Moon"},
    {"index": 1, "name_en": "Tuesday", "name_hi": "मंगलवार", "name_sa": "Maṅgalavāra", "lord": "Mars"},
    {"index": 2, "name_en": "Wednesday", "name_hi": "बुधवार", "name_sa": "Budhavāra", "lord": "Mercury"},
    {"index": 3, "name_en": "Thursday", "name_hi": "गुरुवार", "name_sa": "Guruvāra", "lord": "Jupiter"},
    {"index": 4, "name_en": "Friday", "name_hi": "शुक्रवार", "name_sa": "Śukravāra", "lord": "Venus"},
    {"index": 5, "name_en": "Saturday", "name_hi": "शनिवार", "name_sa": "Śanivāra", "lord": "Saturn"},
    {"index": 6, "name_en": "Sunday", "name_hi": "रविवार", "name_sa": "Ravivāra", "lord": "Sun"}
]

# Classical starting Ghatikas for Varjyam (out of 60 Ghatikas of Nakshatra span)
VARJYAM_START_GHATIKAS = [
    50, 24, 30, 40, 14, 21, 30, 20, 32, 30, 20, 18, 21, 20, 14, 14, 10, 14, 56, 24, 20, 10, 10, 18, 16, 24, 30
]

CHOGHADIYA_TYPES = {
    "Amrit": {"name_en": "Amrit", "name_hi": "अमृत", "quality": "Best / Highly Auspicious", "lord": "Venus"},
    "Shubh": {"name_en": "Shubh", "name_hi": "शुभ", "quality": "Good / Auspicious", "lord": "Jupiter"},
    "Labh": {"name_en": "Labh", "name_hi": "लाभ", "quality": "Gain / Auspicious", "lord": "Mercury"},
    "Char": {"name_en": "Char", "name_hi": "चल", "quality": "Neutral / Movable", "lord": "Moon"},
    "Rog": {"name_en": "Rog", "name_hi": "रोग", "quality": "Evil / Inauspicious", "lord": "Mars"},
    "Kaal": {"name_en": "Kaal", "name_hi": "काल", "quality": "Loss / Inauspicious", "lord": "Saturn"},
    "Udveg": {"name_en": "Udveg", "name_hi": "उद्वेग", "quality": "Anxiety / Inauspicious", "lord": "Sun"}
}

# Ephemeris Version Detection
SWISSEPH_VERSION = getattr(swe, "version", "2.10.03")

def get_ephemeris_source_info(iflag: Optional[int] = None) -> Dict[str, Any]:
    """
    Determines whether Swiss Ephemeris is using the built-in Moshier analytical
    model (FLG_MOSEPH) or external JPL numerical integration data files (FLG_SWIEPH).
    """
    if iflag is not None:
        has_swieph = bool(iflag & getattr(swe, "FLG_SWIEPH", 2))
        has_moseph = bool(iflag & getattr(swe, "FLG_MOSEPH", 4))
    else:
        # Default probe
        has_swieph = False
        has_moseph = True

    model_name = "Swiss Ephemeris JPL DE431" if has_swieph else "Moshier Analytical Model (FLG_MOSEPH)"
    precision = "0.001 arcsec" if has_swieph else "0.1 arcsec (Planets) / 0.5 arcsec (Moon)"

    return {
        "engine": f"Swiss Ephemeris {SWISSEPH_VERSION}",
        "source_model": model_name,
        "is_jpl_swieph": has_swieph,
        "is_moshier": has_moseph,
        "numerical_precision": precision
    }

def get_methodology_metadata(
    tz_identifier: str = "Asia/Kolkata",
    year_convention: str = CONVENTION_GREGORIAN_MEAN,
    iflag: Optional[int] = None
) -> Dict[str, Any]:
    """
    Returns standardized methodology metadata required by Part 2 of the mandate.
    """
    days_per_year = DAYS_PER_YEAR_DEFAULT
    if year_convention == CONVENTION_JULIAN:
        days_per_year = DAYS_PER_YEAR_JULIAN
    elif year_convention == CONVENTION_SAVANA_360:
        days_per_year = DAYS_PER_YEAR_SAVANA

    ephe_info = get_ephemeris_source_info(iflag)

    return {
        "methodology_profile": METHODOLOGY_PROFILE_NAME,
        "methodology_version": METHODOLOGY_VERSION,
        "zodiac": ZODIAC_SYSTEM,
        "ayanamsha": AYANAMSHA_NAME,
        "ayanamsha_code": "SIDM_LAHIRI",
        "ephemeris_version": ephe_info["engine"],
        "ephemeris_source": ephe_info["source_model"],
        "position_model": POSITION_MODEL,
        "node_configuration": NODE_CALCULATION,
        "primary_house_system": HOUSE_SYSTEM_PRIMARY,
        "alternative_house_system": HOUSE_SYSTEM_SECONDARY,
        "dasha_system": DASHA_SYSTEM,
        "dasha_year_convention": year_convention,
        "days_per_year": days_per_year,
        "timezone_identifier": tz_identifier,
        "calculation_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "epistemic_standard": "Deterministic Calculation and Narrative Validation"
    }
