"""
AstroVerse Canonical Personalization & Multi-Horizon Prediction Engine
======================================================================
Canonical Methodology: ASTROVERSE_PARASHARI_LAHIRI_DRIK
Primary Ephemeris: Swiss Ephemeris 2.10.03 / PySwisseph

This engine implements the 3-Layer Architecture for personalized Vedic predictions:
- Layer 1: Astronomical Calculations (Swiss Ephemeris Gochara transits, Vimshottari boundaries, Solar Horas, Panchanga)
- Layer 2: Deterministic Parashari Jyotish Interpretation & Evidence Ledger (Functional nature, house lordships, Dasha-transit synthesis)
- Layer 3: Narrative Synthesis & Anti-Generic Quality Controls across 6 Horizons (Hourly, Daily, Weekly, Monthly, Yearly, Mahadasha)
"""

import math
import calendar
from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple

import swisseph as swe

from dasha_engine import (
    calculate_vimshottari_dasha,
    calculate_antardashas,
    calculate_live_transits,
    SIGNS,
    NAKSHATRA_NAMES,
    NAKSHATRA_LORDS,
    DASHA_LORDS,
    DASHA_YEARS,
)
from hora_engine import calculate_sun_times, calculate_24h_horas, CHALDEAN_ORDER
from timing_tools import calculate_tarabala, calculate_chandrabala

# Classical Rashi Lordship Mapping
SIGN_LORDS = {
    "Aries": "Mars",
    "Taurus": "Venus",
    "Gemini": "Mercury",
    "Cancer": "Moon",
    "Leo": "Sun",
    "Virgo": "Mercury",
    "Libra": "Venus",
    "Scorpio": "Mars",
    "Sagittarius": "Jupiter",
    "Capricorn": "Saturn",
    "Aquarius": "Saturn",
    "Pisces": "Jupiter"
}

# Devanagari Hindi Translations
HINDI_SIGNS = {
    "Aries": "मेष", "Taurus": "वृषभ", "Gemini": "मिथुन", "Cancer": "कर्क",
    "Leo": "सिंह", "Virgo": "कन्या", "Libra": "तुला", "Scorpio": "वृश्चिक",
    "Sagittarius": "धनु", "Capricorn": "मकर", "Aquarius": "कुंभ", "Pisces": "मीन"
}

HINDI_PLANETS = {
    "Sun": "सूर्य", "Moon": "चंद्र", "Mars": "मंगल", "Mercury": "बुध",
    "Jupiter": "बृहस्पति", "Venus": "शुक्र", "Saturn": "शनि",
    "Rahu": "राहु", "Ketu": "केतु"
}

WEEKDAY_NAMES_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAY_NAMES_HI = ["सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार", "रविवार"]
WEEKDAY_LORDS = ["Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Sun"]

BEEJ_MANTRAS = {
    "Sun": {"mantra": "ॐ ह्रीं ह्रीं सूर्याय नमः", "transliteration": "Om Hreem Hreem Suryaya Namah", "count": 108},
    "Moon": {"mantra": "ॐ सों सोमाय नमः", "transliteration": "Om Som Somaya Namah", "count": 108},
    "Mars": {"mantra": "ॐ क्रां क्रीं क्रौं सः भौमाय नमः", "transliteration": "Om Kraam Kreem Kraum Sah Bhaumaya Namah", "count": 108},
    "Mercury": {"mantra": "ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः", "transliteration": "Om Braam Breem Braum Sah Budhaya Namah", "count": 108},
    "Jupiter": {"mantra": "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः", "transliteration": "Om Graam Greem Graum Sah Gurave Namah", "count": 108},
    "Venus": {"mantra": "ॐ द्रां द्रीं द्रौं सः शुक्राय नमः", "transliteration": "Om Draam Dreem Draum Sah Shukraya Namah", "count": 108},
    "Saturn": {"mantra": "ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः", "transliteration": "Om Praam Preem Praum Sah Shanaishcharaya Namah", "count": 108},
    "Rahu": {"mantra": "ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः", "transliteration": "Om Bhraam Bhreem Bhraum Sah Rahave Namah", "count": 108},
    "Ketu": {"mantra": "ॐ स्त्रां स्त्रीं स्त्रौं सः केतवे नमः", "transliteration": "Om Straam Streem Straum Sah Ketave Namah", "count": 108}
}

# Parashari Functional Roles for all 12 Ascendants
# (Based on Brihat Parashara Hora Shastra Ch. 34: Karakas and Functional Nature)
PARASHARI_LAGNA_RULES = {
    "Aries": {
        "lagnesha": "Mars",
        "yogakaraka": None,
        "benefics": ["Jupiter", "Sun", "Mars"],
        "malefics": ["Mercury", "Venus", "Saturn"],
        "marakas": ["Venus", "Mercury"],
        "neutral": ["Moon"],
        "ruling_houses": {"Mars": [1, 8], "Venus": [2, 7], "Mercury": [3, 6], "Moon": [4], "Sun": [5], "Jupiter": [9, 12], "Saturn": [10, 11]},
        "focal_vocational_houses": [10, 1, 9]
    },
    "Taurus": {
        "lagnesha": "Venus",
        "yogakaraka": "Saturn", # Rules 9th (Trikona) and 10th (Kendra)
        "benefics": ["Saturn", "Mercury", "Venus"],
        "malefics": ["Jupiter", "Moon", "Mars"],
        "marakas": ["Mars", "Jupiter"],
        "neutral": ["Sun"],
        "ruling_houses": {"Venus": [1, 6], "Mercury": [2, 5], "Moon": [3], "Sun": [4], "Mars": [7, 12], "Jupiter": [8, 11], "Saturn": [9, 10]},
        "focal_vocational_houses": [10, 2, 5]
    },
    "Gemini": {
        "lagnesha": "Mercury",
        "yogakaraka": None,
        "benefics": ["Venus", "Mercury"],
        "malefics": ["Mars", "Jupiter", "Sun"],
        "marakas": ["Jupiter", "Mars"],
        "neutral": ["Saturn", "Moon"],
        "ruling_houses": {"Mercury": [1, 4], "Moon": [2], "Sun": [3], "Venus": [5, 12], "Mars": [6, 11], "Jupiter": [7, 10], "Saturn": [8, 9]},
        "focal_vocational_houses": [10, 1, 5]
    },
    "Cancer": {
        "lagnesha": "Moon",
        "yogakaraka": "Mars", # Rules 5th (Trikona) and 10th (Kendra)
        "benefics": ["Mars", "Jupiter", "Moon"],
        "malefics": ["Venus", "Mercury", "Saturn"],
        "marakas": ["Saturn", "Venus"],
        "neutral": ["Sun"],
        "ruling_houses": {"Moon": [1], "Sun": [2], "Mercury": [3, 12], "Venus": [4, 11], "Mars": [5, 10], "Jupiter": [6, 9], "Saturn": [7, 8]},
        "focal_vocational_houses": [10, 9, 1]
    },
    "Leo": {
        "lagnesha": "Sun",
        "yogakaraka": "Mars", # Rules 4th (Kendra) and 9th (Trikona)
        "benefics": ["Mars", "Jupiter", "Sun"],
        "malefics": ["Saturn", "Venus", "Mercury"],
        "marakas": ["Saturn", "Venus"],
        "neutral": ["Moon"],
        "ruling_houses": {"Sun": [1], "Mercury": [2, 11], "Venus": [3, 10], "Mars": [4, 9], "Jupiter": [5, 8], "Saturn": [6, 7], "Moon": [12]},
        "focal_vocational_houses": [10, 9, 1]
    },
    "Virgo": {
        "lagnesha": "Mercury",
        "yogakaraka": None,
        "benefics": ["Venus", "Mercury"],
        "malefics": ["Mars", "Jupiter", "Moon"],
        "marakas": ["Mars", "Jupiter"],
        "neutral": ["Saturn", "Sun"],
        "ruling_houses": {"Mercury": [1, 10], "Venus": [2, 9], "Mars": [3, 8], "Jupiter": [4, 7], "Saturn": [5, 6], "Moon": [11], "Sun": [12]},
        "focal_vocational_houses": [10, 2, 9]
    },
    "Libra": {
        "lagnesha": "Venus",
        "yogakaraka": "Saturn", # Rules 4th (Kendra) and 5th (Trikona)
        "benefics": ["Saturn", "Mercury", "Venus"],
        "malefics": ["Jupiter", "Sun", "Mars"],
        "marakas": ["Mars", "Jupiter"],
        "neutral": ["Moon"],
        "ruling_houses": {"Venus": [1, 8], "Mars": [2, 7], "Jupiter": [3, 6], "Saturn": [4, 5], "Sun": [11], "Mercury": [9, 12], "Moon": [10]},
        "focal_vocational_houses": [10, 5, 9]
    },
    "Scorpio": {
        "lagnesha": "Mars",
        "yogakaraka": None,
        "benefics": ["Jupiter", "Sun", "Moon"],
        "malefics": ["Mercury", "Venus", "Saturn"],
        "marakas": ["Venus", "Mercury"],
        "neutral": ["Mars"],
        "ruling_houses": {"Mars": [1, 6], "Jupiter": [2, 5], "Saturn": [3, 4], "Venus": [7, 12], "Mercury": [8, 11], "Moon": [9], "Sun": [10]},
        "focal_vocational_houses": [10, 5, 9]
    },
    "Sagittarius": {
        "lagnesha": "Jupiter",
        "yogakaraka": None,
        "benefics": ["Sun", "Mars", "Jupiter"],
        "malefics": ["Venus", "Mercury", "Saturn"],
        "marakas": ["Venus", "Saturn"],
        "neutral": ["Moon"],
        "ruling_houses": {"Jupiter": [1, 4], "Saturn": [2, 3], "Mars": [5, 12], "Venus": [6, 11], "Mercury": [7, 10], "Moon": [8], "Sun": [9]},
        "focal_vocational_houses": [10, 9, 1]
    },
    "Capricorn": {
        "lagnesha": "Saturn",
        "yogakaraka": "Venus", # Rules 5th (Trikona) and 10th (Kendra)
        "benefics": ["Venus", "Mercury", "Saturn"],
        "malefics": ["Mars", "Jupiter", "Moon"],
        "marakas": ["Mars", "Jupiter"],
        "neutral": ["Sun"],
        "ruling_houses": {"Saturn": [1, 2], "Jupiter": [3, 12], "Mars": [4, 11], "Venus": [5, 10], "Mercury": [6, 9], "Moon": [7], "Sun": [8]},
        "focal_vocational_houses": [10, 9, 5]
    },
    "Aquarius": {
        "lagnesha": "Saturn",
        "yogakaraka": "Venus", # Rules 4th (Kendra) and 9th (Trikona)
        "benefics": ["Venus", "Saturn"],
        "malefics": ["Jupiter", "Moon", "Mars"],
        "marakas": ["Mars", "Jupiter"],
        "neutral": ["Sun", "Mercury"],
        "ruling_houses": {"Saturn": [1, 12], "Jupiter": [2, 11], "Mars": [3, 10], "Venus": [4, 9], "Mercury": [5, 8], "Moon": [6], "Sun": [7]},
        "focal_vocational_houses": [10, 9, 1]
    },
    "Pisces": {
        "lagnesha": "Jupiter",
        "yogakaraka": None,
        "benefics": ["Moon", "Mars", "Jupiter"],
        "malefics": ["Sun", "Venus", "Mercury", "Saturn"],
        "marakas": ["Mercury", "Venus"],
        "neutral": ["Saturn"],
        "ruling_houses": {"Jupiter": [1, 10], "Mars": [2, 9], "Venus": [3, 8], "Mercury": [4, 7], "Moon": [5], "Sun": [6], "Saturn": [11, 12]},
        "focal_vocational_houses": [10, 9, 5]
    }
}

HOUSE_DOMAINS = {
    1: {"name": "Lagna Bhava", "domains": "Personal vitality, physical presence, worldview, direct initiative"},
    2: {"name": "Dhana Bhava", "domains": "Liquid finances, speech, family treasury, accumulated assets"},
    3: {"name": "Sahaja Bhava", "domains": "Valour, enterprise, communication, siblings, short journeys"},
    4: {"name": "Sukha Bhava", "domains": "Home sanctuary, emotional peace, mother, vehicles, real estate"},
    5: {"name": "Putra Bhava", "domains": "Creative intellect, investments, children, speculative discernment, mantra"},
    6: {"name": "Ari Bhava", "domains": "Overcoming obstacles, competitive diligence, service, health management, debts"},
    7: {"name": "Yuvati Bhava", "domains": "Partnerships, matrimonial bonding, contractual negotiations, public interaction"},
    8: {"name": "Randhra Bhava", "domains": "Transformation, longevity, unearned wealth, research, psychological depth"},
    9: {"name": "Dharma Bhava", "domains": "Fortune, higher wisdom, spiritual dharma, father/mentors, philosophical study"},
    10: {"name": "Karma Bhava", "domains": "Vocational authority, career achievements, public reputation, executive status"},
    11: {"name": "Labha Bhava", "domains": "Gains, professional networks, large aspirations, cashflow compounding"},
    12: {"name": "Vyaya Bhava", "domains": "Expenditure, solitude, spiritual liberation, foreign connections, sleep restoration"}
}

HOUSE_DOMAINS_HI = {
    1: {"name": "लग्न भाव", "domains": "शारीरिक ऊर्जा, स्वास्थ्य, आत्मविश्वास और प्रत्यक्ष निर्णय"},
    2: {"name": "धन भाव", "domains": "वित्तीय संचय, वाणी, पारिवारिक साधन और चल संपत्ति"},
    3: {"name": "सहज भाव", "domains": "साहस, उद्यम, संचार, बंधु-बांधव और लघु यात्राएं"},
    4: {"name": "सुख भाव", "domains": "गृह शांति, मानसिक स्थिरता, माता, वाहन और अचल संपत्ति"},
    5: {"name": "सुत भाव", "domains": "बौद्धिक प्रतिभा, रचनात्मक निर्णय, मंत्र साधना और निवेश विवेक"},
    6: {"name": "रिपु भाव", "domains": "बाधा निवारण, सेवा, कार्यस्थल पर प्रतिस्पर्धा, स्वास्थ्य एवं ऋण नियंत्रण"},
    7: {"name": "जाया भाव", "domains": "साझेदारी, दांपत्य सामंजस्य, व्यावसायिक अनुबंध और लोक संवाद"},
    8: {"name": "रंध्र भाव", "domains": "परिवर्तन, गूढ़ ज्ञान, अप्रत्याशित वित्तीय मामले और शोध"},
    9: {"name": "धर्म भाव", "domains": "भाग्य, धर्म, उच्च शिक्षा, गुरु कृपा और लंबी शुभ यात्राएं"},
    10: {"name": "कर्म भाव", "domains": "करियर, व्यावसायिक साख, सामाजिक पद-प्रतिष्ठा और आधिकारिक कर्तव्य"},
    11: {"name": "लाभ भाव", "domains": "आर्थिक लाभ, मित्र मंडली, महत्त्वाकांक्षाओं की सिद्धि और आय वृद्धि"},
    12: {"name": "व्यय भाव", "domains": "निवेश, एकांत साधना, विदेश संबंध, दान और मानसिक शांति"}
}

HOUSE_DAILY_CAUTIONS_EN = {
    1: "Pace physical stamina and temper assertive reactions during midday interactions.",
    2: "Monitor financial allocations and maintain diplomacy in speech regarding family matters.",
    3: "Double-check short-distance transit plans and written messages to prevent hurried miscommunications.",
    4: "Shield your domestic sanctum from workplace stress and defer contentious property disputes.",
    5: "Temper speculative excitement with analytical rigor; verify intellectual assumptions.",
    6: "Manage workplace workloads and dietary routine proactively to mitigate physical strain.",
    7: "Exercise patient active listening in one-on-one partnerships; avoid friction in shared commitments.",
    8: "Approach confidential and financial documentation with meticulous scrutiny; avoid hasty commitments.",
    9: "Guard against dogmatic arguments in professional discussions; confirm travel schedules.",
    10: "Maintain diplomatic composure with authority figures and pace heavy professional deliverables.",
    11: "Verify commercial terms and social network agreements before committing forward resources.",
    12: "Curtail discretionary expenditures and night-time mental overstimulation to ensure restful recovery."
}

HOUSE_DAILY_CAUTIONS_HI = {
    1: "शारीरिक ऊर्जा का संतुलन बनाए रखें और बातचीत में जल्दबाजी या आक्रामकता से बचें।",
    2: "वित्तीय लेन-देन में सतर्कता रखें और पारिवारिक चर्चाओं में मधुर वाणी का प्रयोग करें।",
    3: "लघु यात्राओं और लिखित संवाद में सावधानी बरतें ताकि किसी प्रकार की गलतफहमी न हो।",
    4: "कार्यक्षेत्र का तनाव घर पर न आने दें और संपत्ति या वाहन संबंधी विवादों को टालें।",
    5: "सट्टेबाजी या जल्दबाजी में किए गए निवेश से बचें; बौद्धिक निर्णयों में धैर्य रखें।",
    6: "खान-पान और दिनचर्या में अनुशासन बनाए रखें; कार्यस्थल पर अनावश्यक विवाद से बचें।",
    7: "साझेदारी और वैवाहिक संवाद में धैर्यपूर्वक सुनें; आपसी मतभेद को संवाद से सुलझाएं।",
    8: "गोपनीय या वित्तीय मामलों में पूरी पारदर्शिता रखें; बिना जांचे किसी कागज पर हस्ताक्षर न करें।",
    9: "वैचारिक चर्चाओं में हठधर्मिता से बचें और लंबी यात्राओं में समय सारिणी का ध्यान रखें।",
    10: "वरिष्ठजनों के साथ कूटनीतिक संयम रखें और अत्यधिक कार्यभार के बीच उचित विश्राम लें।",
    11: "मित्रों या साझेदारों के नए प्रस्तावों की पूरी पड़ताल के बाद ही पूंजी लगाएं।",
    12: "अनावश्यक व्यय और देर रात तक जागने से बचें; मानसिक शांति हेतु ध्यान करें।"
}

DASHA_LORD_DAILY_THEMES_EN = {
    "Sun": "Under your ruling Sun Mahadasha, direct leadership, principled authority, and transparent executive actions receive celestial backing.",
    "Moon": "Under your ruling Moon Mahadasha, intuitive perception, emotional equanimity, and empathetic stakeholder alignment foster success.",
    "Mars": "Under your ruling Mars Mahadasha, courageous initiative, decisive execution, and technical diligence conquer lingering bottlenecks.",
    "Mercury": "Under your ruling Mercury Mahadasha, analytical discernment, clear commercial negotiations, and rapid learning yield optimal outcomes.",
    "Jupiter": "Under your ruling Jupiter Mahadasha, ethical counsel, philosophical wisdom, and strategic expansion unlock favorable progress.",
    "Venus": "Under your ruling Venus Mahadasha, diplomatic charm, aesthetic refinement, and collaborative consensus provide a decisive edge.",
    "Saturn": "Under your ruling Saturn Mahadasha, disciplined patience, structured organization, and meticulous persistence ensure enduring stability.",
    "Rahu": "Under your ruling Rahu Mahadasha, innovative thinking, unconventional solutions, and digital agility open unexpected doors.",
    "Ketu": "Under your ruling Ketu Mahadasha, deep introspective research, technical detachment from petty politics, and spiritual focus grant clarity."
}

DASHA_LORD_DAILY_THEMES_HI = {
    "Sun": "सक्रिय सूर्य महादशा के प्रभाव से स्पष्ट नेतृत्व, प्रशासनिक सत्यनिष्ठा और आधिकारिक निर्णयों में सफलता प्राप्त होगी।",
    "Moon": "सक्रिय चंद्र महादशा के अंतर्गत सहज अंतर्ज्ञान, मानसिक स्थिरता और सहकर्मियों से आत्मीय तालमेल कार्य सिद्धि करेगा।",
    "Mars": "सक्रिय मंगल महादशा के प्रभाव से साहसिक पहल, त्वरित तकनीकी समाधान और दृढ़ संकल्प से पुरानी बाधाएं दूर होंगी।",
    "Mercury": "सक्रिय बुध महादशा के अंतर्गत विश्लेषणात्मक दक्षता, प्रभावी संवाद और व्यापारिक बातचीत में लाभ की स्थिति बनेगी।",
    "Jupiter": "सक्रिय गुरु महादशा के प्रभाव से नैतिक मार्गदर्शन, दूरदर्शिता और योजनाबद्ध विस्तार से दीर्घकालिक प्रगति होगी।",
    "Venus": "सक्रिय शुक्र महादशा के अंतर्गत कूटनीतिक सौहार्द, रचनात्मक सूझबूझ और सहयोगियों का समर्थन आपको बढ़त दिलाएगा।",
    "Saturn": "सक्रिय शनि महादशा के प्रभाव से अनुशासित धैर्य, व्यवस्थित कार्यप्रणाली और निरंतर परिश्रम से स्थायी परिणाम मिलेंगे।",
    "Rahu": "सक्रिय राहु महादशा के अंतर्गत नए तकनीकी विचार, लीक से हटकर समाधान और तत्परता से अप्रत्याशित अवसर प्राप्त होंगे।",
    "Ketu": "सक्रिय केतु महादशा के प्रभाव से गहन अनुसंधान, व्यर्थ की राजनीति से दूरी और एकाग्रता से आंतरिक स्पष्टता मिलेगी।"
}

LAGNA_BENEFIC_DAILY_THEMES_EN = {
    "Aries": "Jupiter (ruler of House 9) showers auspicious fortune and higher mentorship upon your undertakings.",
    "Taurus": "Saturn (your Yogakaraka ruling Houses 4 & 5) anchors your creative enterprise with durable patience.",
    "Gemini": "Venus (ruler of House 5) enriches your creative ingenuity, strategic investments, and persuasive discussions.",
    "Cancer": "Mars (your Yogakaraka ruling Houses 5 & 10) energizes professional enterprise and executive recognition.",
    "Leo": "Mars (your Yogakaraka ruling Houses 4 & 9) channels courageous action and providential fortune into your goals.",
    "Virgo": "Venus (ruler of House 9) activates fortunate breakthroughs in communications and professional goodwill.",
    "Libra": "Saturn (your Yogakaraka ruling Houses 4 & 5) fortifies mental resilience and structural domestic stability.",
    "Scorpio": "Jupiter (ruler of Houses 2 & 5) enriches analytical intellect, family resources, and strategic investments.",
    "Sagittarius": "Sun (ruler of House 9) illuminates your philosophical convictions and vocational authority.",
    "Capricorn": "Venus (your Yogakaraka ruling Houses 5 & 10) enhances professional creativity and social goodwill.",
    "Aquarius": "Venus (your Yogakaraka ruling Houses 4 & 9) blesses domestic peace, intellectual focus, and ethical fortune.",
    "Pisces": "Mars (ruler of Houses 2 & 9) fortifies your financial discernment, decisive speech, and fortunate gains."
}

LAGNA_BENEFIC_DAILY_THEMES_HI = {
    "Aries": "नवमेश गुरु का आशीर्वाद आपके कार्यों में भाग्य और वरिष्ठों का सहयोग सुनिश्चित करेगा।",
    "Taurus": "योगकारक शनि (चतुर्थ व पंचमेश) आपके रचनात्मक प्रयासों को स्थायी धैर्य और स्थिरता प्रदान कर रहे हैं।",
    "Gemini": "पंचमेश शुक्र आपकी बौद्धिक क्षमता, रचनात्मक निर्णयों और संवाद को प्रभावशाली बना रहे हैं।",
    "Cancer": "योगकारक मंगल (पंचम व दशमेश) आपकी कार्यक्षेत्र में प्रतिष्ठा और नेतृत्व क्षमता को ऊर्जावान कर रहे हैं।",
    "Leo": "योगकारक मंगल (चतुर्थ व नवमेश) आपके संकल्पों में पराक्रम और भाग्य का शुभ संयोग बना रहे हैं।",
    "Virgo": "नवमेश शुक्र उच्च संपर्कों, शुभ यात्राओं और व्यावसायिक साख में अनुकूलता प्रदान कर रहे हैं।",
    "Libra": "योगकारक शनि (चतुर्थ व पंचमेश) मानसिक संतुलन, पारिवारिक स्थिरता और बौद्धिक परिपक्वता को बढ़ा रहे हैं।",
    "Scorpio": "धनेश व पंचमेश गुरु आपकी बौद्धिक सूझबूझ, वित्तीय संचय और सही निर्णय लेने की क्षमता को बढ़ा रहे हैं।",
    "Sagittarius": "नवमेश सूर्य आपकी वैचारिक दृढ़ता, आत्मबल और प्रशासनिक प्रतिष्ठा को आलोकित कर रहे हैं।",
    "Capricorn": "योगकारक शुक्र (पंचम व दशमेश) पेशेवर रचनात्मकता, सामाजिक साख और कार्यक्षेत्र में लाभ दे रहे हैं।",
    "Aquarius": "योगकारक शुक्र (चतुर्थ व नवमेश) गृह शांति, बौद्धिक एकाग्रता और नैतिक प्रगति को पुष्ट कर रहे हैं।",
    "Pisces": "धनेश व भाग्येश मंगल आपकी वित्तीय समझ, स्पष्ट वाणी और भाग्य वृद्धि में सहायक सिद्ध हो रहे हैं।"
}


def get_planet_lordship_for_lagna(planet: str, lagna: str) -> List[int]:
    """Returns the list of houses commanded by a planet for a given Lagna."""
    rules = PARASHARI_LAGNA_RULES.get(lagna, {})
    return rules.get("ruling_houses", {}).get(planet, [])


def evaluate_dasha_relationship(maha_lord: str, antar_lord: str, kundli: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates mutual placement (Sambandha / Bhava distance) between active Mahadasha and Antardasha lords.
    Classical rules:
    - 5/9 (Navapanchama) or 3/11 (Labha-Sahaja): Highly supportive, smooth fruition.
    - 1/7 (Kendra opposite): High dynamism, partnerships/contracts highlighted.
    - 6/8 (Shadashthaka) or 2/12 (Dwidwadasha): Challenging, sudden friction, health or expenditure discipline.
    - Conjunction (1/1): Focused intensity in the house occupied.
    """
    planets = kundli.get("planets", {})
    maha_pos = planets.get(maha_lord, {}).get("house")
    antar_pos = planets.get(antar_lord, {}).get("house")

    if not maha_pos or not antar_pos:
        return {
            "distance": None,
            "relationship_type": "Neutral Alignment",
            "relationship_code": "NEUTRAL",
            "is_favorable": True,
            "description": f"{maha_lord} Mahadasha with {antar_lord} Antardasha."
        }

    diff = ((antar_pos - maha_pos + 12) % 12) + 1
    other_diff = 14 - diff if diff != 1 else 1

    if diff in [5, 9]:
        rel = "Navapanchama (5/9 Mutual Trine)"
        code = "AUSPICIOUS_TRINE"
        fav = True
        desc = f"{antar_lord} is in 5/9 (Trikona) from {maha_lord}, fostering harmonious manifestation, creativity, and fortune."
    elif diff in [3, 11]:
        rel = "Upachaya / Labha-Sahaja (3/11 Alignment)"
        code = "GROWTH_ALIGNED"
        fav = True
        desc = f"{antar_lord} is in 3/11 relationship with {maha_lord}, favoring enterprise, networking, and progressive gains."
    elif diff in [1, 7]:
        rel = "Kendra Alignment (1/7 Direct Aspect)" if diff == 7 else "Conjunction (1/1 Co-presence)"
        code = "DYNAMIC_KENDRA"
        fav = True
        desc = f"{antar_lord} is in direct Kendra relationship with {maha_lord}, demanding active executive initiative and collaborative balance."
    elif diff in [6, 8]:
        rel = "Shadashthaka (6/8 Frictional Axis)"
        code = "CHALLENGING_6_8"
        fav = False
        desc = f"{antar_lord} is in 6/8 mutual distance from {maha_lord}, suggesting unexpected obstacles, health sensitivity, or disputes requiring patience."
    elif diff in [2, 12]:
        rel = "Dwidwadasha (2/12 Expenditure Axis)"
        code = "EXPENSE_2_12"
        fav = False
        desc = f"{antar_lord} is in 2/12 position from {maha_lord}, indicating resource reallocation, travel, or managing expenditures."
    else:
        rel = f"House {diff} Mutual Relationship"
        code = "MODERATE"
        fav = True
        desc = f"{antar_lord} is situated {diff} houses from {maha_lord}."

    return {
        "distance": diff,
        "relationship_type": rel,
        "relationship_code": code,
        "is_favorable": fav,
        "description": desc
    }


def analyze_personal_jyotish_evidence(
    kundli: Dict[str, Any],
    dashas: Dict[str, Any],
    transits: Dict[str, Any],
    target_dt: date,
    is_unknown_time: bool = False
) -> Dict[str, Any]:
    """
    Constructs the authoritative Layer 2 Evidence Ledger for a birth chart:
    1. Natal Ascendant & Lagna Lord dignity & house placement.
    2. Functional Benefics & Malefics for this Lagna.
    3. Active Mahadasha & Antardasha analysis (lordships, placement, mutual distance).
    4. Transiting planets mapped against Lagna (Lagna-Gochara) and Moon (Chandra-Gochara).
    5. Sade Sati, Kantaka Shani, and Chandrashtama diagnostics.
    6. Today's transiting Moon Nakshatra & Tara Bala.
    """
    planets = kundli.get("planets", {})
    lagna_sign = kundli.get("lagna", {}).get("sign", "Aries")
    lagna_deg = kundli.get("lagna", {}).get("degree", 0.0)
    moon_sign = planets.get("Moon", {}).get("sign", "Aries")
    moon_deg = planets.get("Moon", {}).get("degree", 0.0)
    moon_nak = planets.get("Moon", {}).get("nakshatra", "Ashwini")

    lagna_idx = SIGNS.index(lagna_sign) if lagna_sign in SIGNS else 0
    moon_idx = SIGNS.index(moon_sign) if moon_sign in SIGNS else 0

    lagna_rules = PARASHARI_LAGNA_RULES.get(lagna_sign, PARASHARI_LAGNA_RULES["Aries"])
    lagnesha = lagna_rules["lagnesha"]
    lagnesha_pos = planets.get(lagnesha, {})
    yogakaraka = lagna_rules.get("yogakaraka")

    # Dasha Hierarchy
    active_now = dashas.get("active_now", {})
    maha_lord = active_now.get("maha_dasha", "Jupiter")
    antar_lord = active_now.get("antar_dasha", maha_lord)
    prat_lord = active_now.get("pratyantar_dasha", antar_lord)

    maha_houses = get_planet_lordship_for_lagna(maha_lord, lagna_sign)
    antar_houses = get_planet_lordship_for_lagna(antar_lord, lagna_sign)
    maha_natal_house = planets.get(maha_lord, {}).get("house")
    antar_natal_house = planets.get(antar_lord, {}).get("house")

    dasha_rel = evaluate_dasha_relationship(maha_lord, antar_lord, kundli)

    # Transit Mapping
    transit_list = transits.get("transits", [])
    transit_map = {t["planet_key"]: t for t in transit_list}

    t_saturn = transit_map.get("Saturn", {})
    t_jupiter = transit_map.get("Jupiter", {})
    t_mars = transit_map.get("Mars", {})
    t_sun = transit_map.get("Sun", {})
    t_moon = transit_map.get("Moon", {})
    t_rahu = transit_map.get("Rahu", {})
    t_ketu = transit_map.get("Ketu", {})

    # Transiting Moon & Tara Bala for target_dt
    t_moon_nak = t_moon.get("nakshatra", "Ashwini")
    t_moon_sign = t_moon.get("sign", "Aries")
    t_moon_h_lagna = t_moon.get("house_from_lagna", 1)
    t_moon_h_moon = t_moon.get("house_from_moon", 1)

    tara_data = None
    if moon_nak and t_moon_nak:
        try:
            b_idx = NAKSHATRA_NAMES.index(moon_nak) if moon_nak in NAKSHATRA_NAMES else 0
            t_idx = NAKSHATRA_NAMES.index(t_moon_nak) if t_moon_nak in NAKSHATRA_NAMES else 0
            tara_data = calculate_tarabala(b_idx, t_idx)
        except Exception:
            pass

    chandra_data = None
    try:
        t_sign_idx = SIGNS.index(t_moon_sign) if t_moon_sign in SIGNS else 0
        chandra_data = calculate_chandrabala(moon_idx, t_sign_idx)
    except Exception:
        pass

    # Special Transit Conditions
    sade_sati_data = transits.get("special_conditions", {}).get("sade_sati", {})
    chandrashtama_active = bool(t_moon_h_moon == 8)

    return {
        "is_unknown_time": is_unknown_time,
        "natal": {
            "lagna": lagna_sign,
            "lagna_degree": lagna_deg,
            "lagnesha": lagnesha,
            "lagnesha_house": lagnesha_pos.get("house"),
            "lagnesha_sign": lagnesha_pos.get("sign"),
            "yogakaraka": yogakaraka,
            "functional_benefics": lagna_rules["benefics"],
            "functional_malefics": lagna_rules["malefics"],
            "marakas": lagna_rules["marakas"],
            "moon_sign": moon_sign,
            "moon_degree": moon_deg,
            "moon_nakshatra": moon_nak,
            "moon_house": planets.get("Moon", {}).get("house")
        },
        "dasha": {
            "maha_lord": maha_lord,
            "maha_houses": maha_houses,
            "maha_natal_house": maha_natal_house,
            "antar_lord": antar_lord,
            "antar_houses": antar_houses,
            "antar_natal_house": antar_natal_house,
            "prat_lord": prat_lord,
            "mutual_relationship": dasha_rel
        },
        "transits": {
            "saturn_house_lagna": t_saturn.get("house_from_lagna"),
            "saturn_house_moon": t_saturn.get("house_from_moon"),
            "saturn_verdict": t_saturn.get("verdict_status"),
            "jupiter_house_lagna": t_jupiter.get("house_from_lagna"),
            "jupiter_house_moon": t_jupiter.get("house_from_moon"),
            "jupiter_verdict": t_jupiter.get("verdict_status"),
            "mars_house_lagna": t_mars.get("house_from_lagna"),
            "sun_house_lagna": t_sun.get("house_from_lagna"),
            "t_moon_sign": t_moon_sign,
            "t_moon_nakshatra": t_moon_nak,
            "t_moon_house_lagna": t_moon_h_lagna,
            "t_moon_house_moon": t_moon_h_moon,
            "tarabala": tara_data,
            "chandrabala": chandra_data,
            "sade_sati": sade_sati_data,
            "chandrashtama_active": chandrashtama_active
        }
    }


# ==============================================================================
# INDIVIDUAL HORIZON PREDICTION BUILDERS (1 TO 6)
# ==============================================================================

def generate_hourly_guidance(
    evidence: Dict[str, Any],
    hora_planet: str,
    hora_window: str,
    target_dt: date,
    is_hi: bool = False
) -> Dict[str, Any]:
    """Horizon 1: Time-sensitive hourly guidance grounded in active Hora planet and natal chart."""
    n = evidence["natal"]
    d = evidence["dasha"]
    t = evidence["transits"]

    lagna = n["lagna"]
    lagnesha = n["lagnesha"]
    moon_sign = n["moon_sign"]
    maha = d["maha_lord"]
    antar = d["antar_lord"]

    lagna_hi = HINDI_SIGNS.get(lagna, lagna)
    moon_hi = HINDI_SIGNS.get(moon_sign, moon_sign)
    hora_hi = HINDI_PLANETS.get(hora_planet, hora_planet)
    maha_hi = HINDI_PLANETS.get(maha, maha)
    antar_hi = HINDI_PLANETS.get(antar, antar)

    # Identify houses ruled by Hora planet in this Lagna
    hora_houses = get_planet_lordship_for_lagna(hora_planet, lagna)
    hora_houses_str = ", ".join(f"{h}th" for h in hora_houses) if hora_houses else "Karmic Axis"
    hora_houses_hi = ", ".join(f"{h}वें" for h in hora_houses) if hora_houses else "कर्म अक्ष"

    is_func_benefic = hora_planet in n["functional_benefics"]
    is_func_malefic = hora_planet in n["functional_malefics"]
    is_yogakaraka = (hora_planet == n["yogakaraka"])
    is_lagnesha = (hora_planet == lagnesha)
    is_dasha_lord = (hora_planet in [maha, antar])

    mantra = BEEJ_MANTRAS.get(hora_planet, BEEJ_MANTRAS["Jupiter"])

    # Determine qualitative nature of this Hora for this specific user
    if is_yogakaraka or is_lagnesha:
        tone = "Highly Auspicious & Empowering"
        tone_hi = "परम शुभ एवं फलदायी"
        impact_en = f"As your Lagna's Yogakaraka/Lagnesha ruling House {hora_houses_str}, {hora_planet} grants elevated executive clarity and sovereign initiative."
        impact_hi = f"आपकी {lagna_hi} लग्न कुंडली में {hora_hi} आपके {'योगाकारक' if is_yogakaraka else 'लग्नेश'} हैं और {hora_houses_hi} भाव का संचालन करते हैं, जिससे यह होरा आधिकारिक स्पष्टता व श्रेष्ठ निर्णय शक्ति प्रदान करती है।"
    elif is_func_benefic:
        tone = "Constructive & Benefic"
        tone_hi = "सकारात्मक एवं शुभ"
        impact_en = f"Ruling the auspicious {hora_houses_str} house(s), {hora_planet} supports strategic progress, constructive consultations, and material stability."
        impact_hi = f"आपकी कुंडली में शुभ {hora_houses_hi} भावों के स्वामी होने के कारण, {hora_hi} होरा रणनीतिक प्रगति, विचार-विमर्श और स्थायी लाभ का समर्थन करती है।"
    elif is_func_malefic:
        tone = "Demands Diligence & Care"
        tone_hi = "सावधानी एवं धैर्य अपेक्षित"
        impact_en = f"Governing House {hora_houses_str} (Dusthana/Trishadaya), {hora_planet} activates operational friction or debate; deliberate patience is required."
        impact_hi = f"आपकी लग्न कुंडली में {hora_houses_hi} भाव के स्वामी होने के कारण, {hora_hi} होरा में विवाद, उतावलेपन अथवा जोखिम भरे निर्णयों से बचना अनिवार्य है।"
    else:
        tone = "Neutral & Balanced"
        tone_hi = "संतुलित एवं सामान्य"
        impact_en = f"Ruling House {hora_houses_str}, {hora_planet} calls for focused attention on routine responsibilities and measured commitments."
        impact_hi = f"{hora_houses_hi} भाव के आधिपत्य के साथ, {hora_hi} होरा नियमित दायित्वों के संपादन हेतु संतुलित कालखंड प्रदान करती है।"

    # Supportive Themes
    if is_hi:
        report_title = f"प्रति घंटा व्यक्तिगत मार्गदर्शन: {hora_hi} होरा ({hora_window})"
        summary = (
            f"आपकी {lagna_hi} लग्न कुंडली ({moon_hi} चंद्र राशि) में, यह सक्रिय {hora_hi} होरा ({hora_window}) आपके {hora_houses_hi} भाव को ऊर्जावान बना रही है। "
            f"वर्तमान {maha_hi} महादशा एवं {antar_hi} अंतर्दशा के संरक्षण में, {impact_hi} "
            f"इस होरा का मध्यवर्ती समय महत्वपूर्ण कार्य निष्पादन हेतु सर्वोत्तम है। शांति व एकाग्रता हेतु {mantra['mantra']} का स्मरण करें।"
        )
        outlook = f"{hora_hi} होरा आपके {lagna_hi} लग्न के {hora_houses_hi} भाव के फल को सक्रिय करती है। यह कालखंड {tone_hi} है।"
        supportive = [
            f"आपके {hora_houses_hi} भाव से संबंधित कार्य ({HOUSE_DOMAINS_HI.get(hora_houses[0], {}).get('domains', 'मुख्य कार्य') if hora_houses else 'निजी कार्य'}) में सफलता।",
            f"{'सक्रिय दशा स्वामी होने से विशेष ग्रहीय सामंजस्य' if is_dasha_lord else f'लग्नेश {HINDI_PLANETS.get(lagnesha, lagnesha)} के साथ शास्त्रीय संरेखण'} से मानसिक स्थिरता।",
            f"होरा के मध्य काल (~20-40 मिनट) में महत्वपूर्ण निर्णयों और वार्तालाप हेतु शुभ वायुमंडल।"
        ]
        challenges = [
            f"{'उतावलेपन या प्रतिक्रियात्मक संवाद से बचें' if is_func_malefic else 'अनावश्यक विलंब या एकाग्रता के अभाव से बचें'}।",
            "होरा संधिकाल (अंतिम 5 मिनट) में नए दीर्घकालिक समझौते करने से परहेज करें।",
            "संवाद में पारदर्शिता रखें ताकि किसी प्रकार की गलतफहमी उत्पन्न न हो।"
        ]
        windows = [
            f"सक्रिय होरा काल: {hora_window} ({hora_hi} द्वारा शासित)",
            f"सर्वोच्च एकाग्रता खिड़की: होरा के मध्य 30 मिनट ({tone_hi})",
            f"सावधानी काल: स्थानीय दैनिक राहुकाल अवधि"
        ]
        why = (
            f"आपकी जन्म लग्न {lagna_hi} है, जिसमें {hora_hi} {hora_houses_hi} भाव के स्वामी हैं। "
            f"सक्रिय दशा {maha_hi}-{antar_hi} के परिप्रेक्ष्य में, यह होरा {tone_hi} परिणाम लाती है।"
        )
        reflection = f"इस {hora_hi} होरा में अपने प्रमुख दायित्व पर ध्यान केंद्रित करें और {mantra['mantra']} का शांत भाव से स्मरण करें।"
    else:
        report_title = f"Hourly Personal Guidance: {hora_planet} Hora ({hora_window})"
        summary = (
            f"For your natal {lagna} Lagna (Moon in {moon_sign}), the active {hora_planet} Hora ({hora_window}) directly activates your natal House {hora_houses_str}. "
            f"Under your current {maha} Mahadasha ({antar} Antardasha), {impact_en} "
            f"The central 30 minutes of this Hora interval offer prime focus for consequential actions. Center your composure with the {hora_planet} Beej Mantra."
        )
        outlook = f"{hora_planet} Hora activates your {lagna} Lagna's House {hora_houses_str} ({tone})."
        supportive = [
            f"Fortified throughput for initiatives governing House {hora_houses_str} ({HOUSE_DOMAINS.get(hora_houses[0], {}).get('domains', 'Core responsibilities') if hora_houses else 'Vocational focus'}).",
            f"{'Amplified cosmic resonance as active Dasha Lord' if is_dasha_lord else f'Alignment with your Lagna Lord {lagnesha}'} supports composed executive discernment.",
            f"Peak mid-interval window (~20-40 mins) favors formal communication and execution."
        ]
        challenges = [
            f"{'Avoid contentious confrontation or rushed financial commitments' if is_func_malefic else 'Guard against passive distraction or delaying critical duties'}.",
            "Avoid signing long-term irrevocable agreements during the final 5 minutes (sandhi transition).",
            "Maintain disciplined pacing to prevent mental fatigue."
        ]
        windows = [
            f"Active Hora Interval: {hora_window} (Governed by {hora_planet})",
            f"Peak Action Window: Middle 30 minutes ({tone})",
            f"Cautionary Period: Maintain heightened care during localized Rahu Kaal intervals"
        ]
        why = (
            f"Your natal Ascendant is {lagna}, for which {hora_planet} commands House {hora_houses_str}. "
            f"Evaluated alongside your active {maha}-{antar} Dasha, this Hora interval manifests as {tone}."
        )
        reflection = f"Direct conscious effort toward one high-priority responsibility during this {hora_planet} window. Recite {mantra['transliteration']} for mental poise."

    return {
        "report_title": report_title,
        "executive_summary": summary,
        "overall_outlook": outlook,
        "supportive_themes": supportive,
        "challenges_and_cautions": challenges,
        "key_time_windows": windows,
        "why_this_applies": why,
        "practical_reflection": reflection
    }


def generate_daily_guidance(
    evidence: Dict[str, Any],
    target_dt: date,
    is_hi: bool = False
) -> Dict[str, Any]:
    """Horizon 2: Full 24-hour personalized forecast grounded in daily Moon transit, Tarabala, and Dasha."""
    n = evidence["natal"]
    d = evidence["dasha"]
    t = evidence["transits"]

    lagna = n["lagna"]
    moon_sign = n["moon_sign"]
    maha = d["maha_lord"]
    antar = d["antar_lord"]

    lagna_hi = HINDI_SIGNS.get(lagna, lagna)
    moon_hi = HINDI_SIGNS.get(moon_sign, moon_sign)
    maha_hi = HINDI_PLANETS.get(maha, maha)
    antar_hi = HINDI_PLANETS.get(antar, antar)

    t_moon_sign = t["t_moon_sign"]
    t_moon_nak = t["t_moon_nakshatra"]
    t_moon_h_lagna = t["t_moon_house_lagna"]
    t_moon_h_moon = t["t_moon_house_moon"]

    tara = t.get("tarabala") or {}
    tara_name = tara.get("tarabala_name", "Kshema")
    tara_ausp = tara.get("is_auspicious", True)
    tara_meaning = tara.get("meaning", "Well-being and safety")

    t_moon_sign_hi = HINDI_SIGNS.get(t_moon_sign, t_moon_sign)
    h_domain = HOUSE_DOMAINS.get(t_moon_h_lagna, {})
    h_domain_hi = HOUSE_DOMAINS_HI.get(t_moon_h_lagna, {})

    is_sade_sati = t.get("sade_sati", {}).get("is_active", False)
    is_chandrashtama = t.get("chandrashtama_active", False)

    date_str = target_dt.strftime("%Y-%m-%d")

    if is_hi:
        house_caution_hi = HOUSE_DAILY_CAUTIONS_HI.get(t_moon_h_lagna, "दैनिक दायित्वों में सजगता और अनुशासन बनाए रखें।")
        report_title = f"दैनिक व्यक्तिगत फलादेश: {date_str} (चंद्र गोचर व ताराबल विश्लेषण)"
        if is_chandrashtama:
            summary = (
                f"आज चंद्र का {t_moon_sign_hi} राशि में गोचर आपकी जन्म चंद्र राशि से अष्टम भाव (चंद्राष्टम) को सक्रिय कर रहा है। "
                f"शास्त्रीय पारशरी नियम अनुसार चंद्राष्टम काल में मानसिक उद्वेग, एकाग्रता में व्यवधान अथवा अनावश्यक वाद-विवाद की संभावना रहती है। "
                f"आज कोई भी बड़ा वित्तीय या कानूनी जोखिम न लें, अनुबंधों की समीक्षा धैर्य से करें और शिव उपासना अथवा चंद्र मंत्र का जप करें।"
            )
            outlook = f"आज का दिन चंद्राष्टम के प्रभाव में है ({t_moon_sign_hi} राशि)। नए साहसिक उपक्रमों की बजाय नियमित कार्यों पर ध्यान दें।"
            challenges = [
                f"{t_moon_h_lagna}वें भाव की सावधानी: {house_caution_hi}",
                "चंद्राष्टम प्रभाव: उतावलेपन में बड़े वित्तीय या भावनात्मक निर्णय लेने से बचें।",
                "संवाद में कटुता न आने दें; सहयोगियों के साथ शांत चित्त से व्यवहार करें।"
            ]
        elif tara_ausp:
            summary = (
                f"आपकी {lagna_hi} लग्न कुंडली में आज चंद्र का {t_moon_sign_hi} ({t_moon_nak} नक्षत्र) में गोचर आपके {t_moon_h_lagna}वें भाव ({h_domain_hi.get('name', 'शुभ भाव')}) को सक्रिय कर रहा है। "
                f"आपकी जन्म चंद्र राशि से ताराबल '{tara_name}' ({tara_meaning}) प्राप्त हो रहा है, जो उच्च मानसिक स्पष्टता और कार्य सिद्धि का संकेत देता है। "
                f"सक्रिय {maha_hi}-{antar_hi} दशा के अंतर्गत, आज का दिन {h_domain_hi.get('domains', 'प्रमुख जिम्मेदारियों')} को आगे बढ़ाने हेतु अत्यंत अनुकूल है।"
            )
            outlook = f"शुभ ताराबल ({tara_name}) और {t_moon_h_lagna}वें भाव में चंद्र गोचर से दिन सकारात्मक व प्रगतिशील रहेगा।"
            challenges = [
                f"{t_moon_h_lagna}वें भाव की सावधानी: {house_caution_hi}",
                "अति-उत्साह में अपनी सीमाओं से अधिक नए कार्य अपने ऊपर न लें।",
                "दैनिक राहुकाल के दौरान महत्वपूर्ण अनुबंधों पर हस्ताक्षर करने से बचें।"
            ]
        else:
            summary = (
                f"आज चंद्र का {t_moon_sign_hi} राशि में संचरण आपके {t_moon_h_lagna}वें भाव को प्रभावित कर रहा है, जबकि ताराबल '{tara_name}' ({tara_meaning}) संयम का परामर्श देता है। "
                f"{maha_hi} महादशा के अंतर्गत, आज का दिन आक्रामक विस्तार के स्थान पर अनुशासित पुनरावलोकन, तकनीकी सुधार और व्यवस्थापन का समर्थन करता है।"
            )
            outlook = f"ताराबल '{tara_name}' सतर्कता की मांग करता है। कार्यों में धैर्य और व्यवस्थित दृष्टिकोण बनाए रखें।"
            challenges = [
                f"{t_moon_h_lagna}वें भाव की सावधानी: {house_caution_hi}",
                f"ताराबल प्रभाव ({tara_name}): अनपरीक्षित प्रस्तावों या सट्टेबाजी के सौदों से परहेज करें।",
                "मानसिक तनाव से बचने के लिए महत्वपूर्ण कार्यों के बीच विराम लें।"
            ]

        dasha_theme_hi = DASHA_LORD_DAILY_THEMES_HI.get(maha, f"{maha_hi} महादशा के अंतर्गत अपने प्रमुख कर्तव्यों पर एकाग्र रहें।")
        benefic_theme_hi = LAGNA_BENEFIC_DAILY_THEMES_HI.get(lagna, f"आपके {lagna_hi} लग्न के शुभ ग्रह आज सकारात्मक ऊर्जा प्रदान कर रहे हैं।")
        supportive = [
            f"आपके {t_moon_h_lagna}वें भाव ({h_domain_hi.get('domains', 'दायित्व')}) से संबंधित विषयों में प्रगति।",
            dasha_theme_hi,
            benefic_theme_hi
        ]
        windows = [
            f"शुभ कार्य खिड़की: प्रातःकालीन शुभ होरा काल (बृहस्पति/शुक्र/बुध शासित)",
            f"मध्याह्न श्रेष्ठ मुहूर्त: अभिजित मुहूर्त (~11:45 AM - 12:35 PM)",
            f"सावधानी काल: दैनिक स्थानीय राहुकाल अवधि"
        ]
        why = (
            f"आज चंद्र देव गोचर में {t_moon_sign_hi} राशि ({t_moon_nak} नक्षत्र) में भ्रमण कर रहे हैं, "
            f"जो आपके {lagna_hi} लग्न से {t_moon_h_lagna}वें भाव में और आपकी जन्म चंद्र राशि ({moon_hi}) से {t_moon_h_moon}वें भाव में स्थित है। "
            f"ताराबल '{tara_name}' और सक्रिय विंशोत्तरी दशा {maha_hi}-{antar_hi} के अनुसार यह फलादेश संकलित है।"
        )
        reflection = f"आज अपने सबसे महत्वपूर्ण दायित्व पर ध्यान केंद्रित रखें और सात्विक आहार व नियमित प्रार्थना का पालन करें।"
    else:
        house_caution_en = HOUSE_DAILY_CAUTIONS_EN.get(t_moon_h_lagna, "Maintain systematic attention to daily responsibilities.")
        report_title = f"Daily Personal Forecast: {date_str} (Lunar Transit & Tara Bala Synthesis)"
        if is_chandrashtama:
            summary = (
                f"For your natal {lagna} Lagna and {moon_sign} Moon, transiting Moon traverses your 8th house from Moon (Chandrashtama) in sidereal {t_moon_sign}. "
                f"Classical Parashari Jyotish identifies Chandrashtama as an interval requiring psychological poise, where high-stakes speculative decisions or confrontational negotiations should be deferred. "
                f"Prioritize routine consolidation, verify numerical details, and preserve equanimity under your ongoing {maha} Mahadasha ({antar} Antardasha)."
            )
            outlook = f"Today is governed by Chandrashtama transit in sidereal {t_moon_sign}. Exercise calm prudence and defer speculative risks."
            challenges = [
                f"House {t_moon_h_lagna} Transit Caution: {house_caution_en}",
                "Chandrashtama Phase: Avoid unvetted legal, financial, or interpersonal commitments.",
                "Maintain emotional neutrality during contentious discussions to avoid unnecessary friction."
            ]
        elif tara_ausp:
            summary = (
                f"In your natal {lagna} Lagna nativity, transiting Moon in {t_moon_sign} ({t_moon_nak} Nakshatra) illuminates your House {t_moon_h_lagna} ({h_domain.get('name', 'Benefic House')}). "
                f"Your natal Moon receives highly favorable '{tara_name}' Tara Bala ({tara_meaning}), supporting lucid discernment and executive breakthroughs. "
                f"Sustained by your active {maha}-{antar} Dasha, today's planetary currents favor advancing {h_domain.get('domains', 'high-priority goals')}."
            )
            outlook = f"Benefic Tara Bala ({tara_name}) and House {t_moon_h_lagna} lunar transit create a constructive, productive window."
            challenges = [
                f"House {t_moon_h_lagna} Transit Caution: {house_caution_en}",
                "Avoid over-extending your commitments simply because conditions feel harmonious.",
                "Maintain heightened awareness during the localized daily Rahu Kaal window."
            ]
        else:
            summary = (
                f"Today's Moon transit through sidereal {t_moon_sign} aspects your natal House {t_moon_h_lagna}, conferring '{tara_name}' Tara Bala ({tara_meaning}). "
                f"Under your active {maha} Mahadasha, the celestial weather favors methodical audit, risk mitigation, and disciplined execution over uncalculated expansion."
            )
            outlook = f"Tara Bala ({tara_name}) indicates caution. Focus on patience, detailed review, and steady consolidation."
            challenges = [
                f"House {t_moon_h_lagna} Transit Caution: {house_caution_en}",
                f"Tara Bala Consideration ({tara_name}): Steer clear of unvetted speculative proposals.",
                "Take structured 5-minute pauses between demanding tasks to mitigate mental strain."
            ]

        dasha_theme_en = DASHA_LORD_DAILY_THEMES_EN.get(maha, f"Under your ruling {maha} Mahadasha, maintain deliberate focus on primary responsibilities.")
        benefic_theme_en = LAGNA_BENEFIC_DAILY_THEMES_EN.get(lagna, f"The functional benefics of your {lagna} Lagna channel constructive support into today's efforts.")
        supportive = [
            f"Productive momentum across House {t_moon_h_lagna} significations ({h_domain.get('domains', 'responsibilities')}).",
            dasha_theme_en,
            benefic_theme_en
        ]
        windows = [
            "Auspicious Action Window: Morning benefic Hora periods (governed by Jupiter/Venus/Mercury)",
            "Mid-Day Peak Focus: Classical Abhijit Muhurta (~11:45 AM - 12:35 PM)",
            "Cautionary Period: Daily localized Rahu Kaal interval"
        ]
        why = (
            f"Transiting Moon resides in sidereal {t_moon_sign} ({t_moon_nak} Nakshatra), activating House {t_moon_h_lagna} from your {lagna} Lagna "
            f"and House {t_moon_h_moon} from your {moon_sign} Moon. "
            f"Tara Bala is evaluated as '{tara_name}' under your prevailing {maha}-{antar} Dasha governance."
        )
        reflection = "Concentrate your energy on completing one primary milestone before midday. Maintain ethical duty (Dharma) in all interactions."

    return {
        "report_title": report_title,
        "executive_summary": summary,
        "overall_outlook": outlook,
        "supportive_themes": supportive,
        "challenges_and_cautions": challenges,
        "key_time_windows": windows,
        "why_this_applies": why,
        "practical_reflection": reflection
    }


def generate_weekly_guidance(
    evidence: Dict[str, Any],
    target_dt: date,
    is_unlocked: bool = False,
    is_hi: bool = False
) -> Dict[str, Any]:
    """Horizon 3: 7-day personalized progression calculating each day's exact Moon transit and energized house."""
    n = evidence["natal"]
    d = evidence["dasha"]

    lagna = n["lagna"]
    moon_sign = n["moon_sign"]
    moon_nak = n["moon_nakshatra"]
    maha = d["maha_lord"]
    antar = d["antar_lord"]

    lagna_idx = SIGNS.index(lagna) if lagna in SIGNS else 0
    moon_idx = SIGNS.index(moon_sign) if moon_sign in SIGNS else 0
    b_nak_idx = NAKSHATRA_NAMES.index(moon_nak) if moon_nak in NAKSHATRA_NAMES else 0

    lagna_hi = HINDI_SIGNS.get(lagna, lagna)
    moon_hi = HINDI_SIGNS.get(moon_sign, moon_sign)
    maha_hi = HINDI_PLANETS.get(maha, maha)
    antar_hi = HINDI_PLANETS.get(antar, antar)

    start_date_str = target_dt.strftime("%Y-%m-%d")
    end_date_str = (target_dt + timedelta(days=6)).strftime("%Y-%m-%d")

    # Generate 7 real daily cards
    cards = []
    houses_energized = []
    most_favorable_day = None
    most_challenging_day = None
    best_score = -1.0
    worst_score = 99.0

    # Swiss Ephemeris Moon daily calculation across 7 days
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    for i in range(7):
        cur_dt = target_dt + timedelta(days=i)
        w_idx = cur_dt.weekday()
        ruler = WEEKDAY_LORDS[w_idx]
        ruler_disp = HINDI_PLANETS.get(ruler, ruler) if is_hi else ruler
        day_name = WEEKDAY_NAMES_HI[w_idx] if is_hi else WEEKDAY_NAMES_EN[w_idx]

        # Calculate exact Moon position at solar noon for each day
        jd_noon = swe.julday(cur_dt.year, cur_dt.month, cur_dt.day, 6.5) # ~12:00 IST
        res, _ = swe.calc_ut(jd_noon, swe.MOON, swe.FLG_SIDEREAL)
        deg_360 = res[0]
        sign_idx = int(deg_360 / 30.0) % 12
        t_sign = SIGNS[sign_idx]
        t_sign_disp = HINDI_SIGNS.get(t_sign, t_sign) if is_hi else t_sign

        nak_span = 360.0 / 27.0
        nak_idx = int(deg_360 / nak_span) % 27
        t_nak = NAKSHATRA_NAMES[nak_idx]

        h_lagna = ((sign_idx - lagna_idx + 12) % 12) + 1
        h_moon = ((sign_idx - moon_idx + 12) % 12) + 1
        houses_energized.append(h_lagna)

        tara = calculate_tarabala(b_nak_idx, nak_idx)
        chandra = calculate_chandrabala(moon_idx, sign_idx)

        h_domain = HOUSE_DOMAINS.get(h_lagna, {})
        h_domain_hi = HOUSE_DOMAINS_HI.get(h_lagna, {})

        # Score day based on Tara & Chandra Bala
        score = 0.5
        if tara.get("is_auspicious"):
            score += 0.3
        if chandra.get("is_favorable"):
            score += 0.2
        if h_moon == 8:
            score -= 0.4 # Chandrashtama

        if score > best_score:
            best_score = score
            most_favorable_day = f"{day_name} ({cur_dt.strftime('%d %b')})"
        if score < worst_score:
            worst_score = score
            most_challenging_day = f"{day_name} ({cur_dt.strftime('%d %b')})"

        is_locked = (not is_unlocked) and (i >= 2)
        mantra_info = BEEJ_MANTRAS.get(ruler, BEEJ_MANTRAS["Sun"])

        if is_hi:
            day_theme = f"{h_domain_hi.get('name', 'भाव')} सक्रियता ({t_sign_disp} चंद्र)"
            guidance_txt = (
                f"आज चंद्र का {t_sign_disp} राशि में गोचर आपके {h_lagna}वें भाव ({h_domain_hi.get('domains', '')}) को सक्रिय कर रहा है। "
                f"ताराबल '{tara.get('tarabala_name', 'क्षेम')}' के प्रभाव में, {ruler_disp} द्वारा शासित इस दिन में प्राथमिकताओं को अनुशासन से पूरा करें।"
            )
            cautions_txt = "सावधानी: चंद्राष्टम प्रभाव के कारण भावनात्मक व वित्तीय उतावलेपन से बचें।" if h_moon == 8 else "दैनिक राहुकाल के दौरान जोखिम भरे निर्णयों से बचें।"
        else:
            day_theme = f"{h_domain.get('name', 'House Focus')} ({t_sign} Moon)"
            guidance_txt = (
                f"Transiting Moon in sidereal {t_sign} ({t_nak}) illuminates your natal House {h_lagna} ({h_domain.get('domains', '')}). "
                f"Conferring '{tara.get('tarabala_name', 'Kshema')}' Tara Bala under {ruler}'s weekday rulership, align effort with essential goals."
            )
            cautions_txt = "Caution: Chandrashtama transit requires deliberate emotional composure and deferring speculative risks." if h_moon == 8 else "Maintain heightened awareness during localized Rahu Kaal."

        cards.append({
            "period_index": i + 1,
            "date": cur_dt.strftime("%Y-%m-%d"),
            "day_name": day_name,
            "weekday_ruler": ruler_disp,
            "transiting_moon": t_sign_disp,
            "activated_house": h_lagna,
            "house_signification": h_domain_hi.get("domains") if is_hi else h_domain.get("domains"),
            "focus_theme": day_theme,
            "guidance": guidance_txt,
            "cautions": cautions_txt,
            "auspicious_window": "07:30 AM – 09:30 AM (Benefic Window)" if not is_hi else "प्रातः 07:30 AM – 09:30 AM (शुभ वेला)",
            "tarabala": tara,
            "chandrabala": chandra,
            "beej_mantra": mantra_info.get("mantra"),
            "transliteration": mantra_info.get("transliteration"),
            "is_preview_locked": is_locked,
            "teaser": f"Day {i+1} ({day_name}): House {h_lagna} activation. Unlock with ₹49 pass." if is_locked else None
        })

    unique_houses = sorted(list(set(houses_energized)))
    houses_str = ", ".join(f"House {h}" for h in unique_houses)

    if is_hi:
        report_title = f"साप्ताहिक व्यक्तिगत फलादेश: 7-दिवसीय पराशरी चक्र ({start_date_str} से {end_date_str})"
        summary = (
            f"यह सात दिवसीय गोचर चक्र आपकी {lagna_hi} लग्न कुंडली में चंद्रमा के भ्रमण द्वारा आपके {houses_str} भावों को क्रमिक रूप से सक्रिय करता है। "
            f"सक्रिय {maha_hi} महादशा एवं {antar_hi} अंतर्दशा के अंतर्गत, सप्ताह का सर्वाधिक अनुकूल कालखंड {most_favorable_day} रहेगा, "
            f"जबकि {most_challenging_day} को चंद्राष्टम अथवा संवेदनशील गोचर के कारण विशेष धैर्य व सावधानी अपेक्षित है। "
            f"सप्ताह भर नैतिक सत्यनिष्ठा और नियमित कार्यप्रणाली से प्रगति सुनिश्चित होगी।"
        )
        outlook = f"7-दिवसीय चक्र में चंद्रमा आपके {houses_str} भावों से संचरण करेगा। सर्वाधिक अनुकूल दिन: {most_favorable_day}।"
        supportive = [
            f"करियर व कर्म: {most_favorable_day} को उच्च अधिकारी संवाद और महत्वपूर्ण प्रस्तावों हेतु श्रेष्ठ समय।",
            f"वित्तीय प्रबंधन: सप्ताह के मध्य में बजट समीक्षा और लंबित दायित्वों के समाधान के सुंदर योग।",
            f"संबंध एवं पारिवारिक सौहार्द: सप्ताहांत में गृह शांति और दार्शनिक अध्ययन हेतु उत्तम आकाशीय प्रभाव।"
        ]
        challenges = [
            f"संवेदनशील दिन: {most_challenging_day} को उतावलेपन में लिए गए निर्णयों से बचें।",
            "संवाद में पारदर्शिता रखें ताकि कार्यस्थल पर अस्पष्टता उत्पन्न न हो।",
            "स्वास्थ्य और दिनचर्या में निरंतरता बनाए रखें; देर रात स्क्रीन देखने से बचें।"
        ]
        windows = [
            f"सप्ताह का श्रेष्ठ समय: {most_favorable_day} (उच्च ताराबल खिड़की)",
            f"सावधानी का दिन: {most_challenging_day} (धैर्य व संयम अपेक्षित)",
            f"सप्ताहांत विश्राम: शुक्रवार सायं व शनिवार प्रातः"
        ]
        why = (
            f"यह 7-दिवसीय फलादेश आपकी {lagna_hi} लग्न ({n['lagna_degree']:.2f}°) और {moon_hi} चंद्र राशि पर आधारित है। "
            f"चंद्रमा का दैनिक संचरण {houses_str} भावों को सक्रिय करता है, जिसे {maha_hi}-{antar_hi} दशा के साथ संश्लेषित किया गया है।"
        )
        reflection = f"सप्ताह के प्रारंभ में अपने तीन मुख्य लक्ष्यों की रूपरेखा बनाएं और {most_favorable_day} को महत्वपूर्ण कार्य संपन्न करें।"
    else:
        report_title = f"Weekly Personal Forecast: 7-Day Parashari Cycle ({start_date_str} to {end_date_str})"
        summary = (
            f"Across this 7-day transit cycle, lunar movement activates your natal {lagna} Lagna's {houses_str} under the governance of your active {maha} Mahadasha ({antar} Antardasha). "
            f"Your most favorable operational window falls on {most_favorable_day}, backed by auspicious Tara Bala, "
            f"whereas {most_challenging_day} demands deliberate patience against impulsive commitments or emotional haste. "
            f"Align daily actions with the changing lunar houses to optimize productivity."
        )
        outlook = f"Seven-day lunar arc activates your {lagna} Lagna's {houses_str}. Peak auspicious window: {most_favorable_day}."
        supportive = [
            f"Vocational Advancement: {most_favorable_day} provides prime celestial backing for executive pitches and crucial agreements.",
            "Financial Optimization: Mid-week lunar transitions support budget audits and asset consolidation.",
            "Personal Rejuvenation: Weekend planetary aspects encourage domestic harmony and reflective philosophical study."
        ]
        challenges = [
            f"Demanding Window: Exercise extra diligence on {most_challenging_day}; defer high-stakes financial speculations.",
            "Maintain direct, documented communication to prevent team ambiguities during mid-week transitions.",
            "Protect physical vitality with consistent sleep rhythms and mindful hydration."
        ]
        windows = [
            f"Highest-Leverage Window: {most_favorable_day} (Auspicious Tara Bala alignment)",
            f"Cautionary Period: {most_challenging_day} (Requires calm reflection)",
            f"Weekend Harmonization: Friday evening to Saturday morning"
        ]
        why = (
            f"Derived from real astronomical lunar ephemerides mapped across your {lagna} Lagna ({n['lagna_degree']:.2f}°) "
            f"and {moon_sign} Moon. Lunar transits across {houses_str} are cross-referenced with your active {maha}-{antar} Dasha."
        )
        reflection = f"Establish three firm priorities at the beginning of the week. Channel your highest energy into {most_favorable_day}."

    return {
        "report_title": report_title,
        "executive_summary": summary,
        "overall_outlook": outlook,
        "supportive_themes": supportive,
        "challenges_and_cautions": challenges,
        "key_time_windows": windows,
        "why_this_applies": why,
        "practical_reflection": reflection,
        "period_items": {"items": cards}
    }


def generate_monthly_guidance(
    evidence: Dict[str, Any],
    target_dt: date,
    is_unlocked: bool = False,
    is_hi: bool = False
) -> Dict[str, Any]:
    """Horizon 4: Complete calendar-month forecast supporting 28-31 day months with authentic transit milestones."""
    n = evidence["natal"]
    d = evidence["dasha"]

    lagna = n["lagna"]
    moon_sign = n["moon_sign"]
    maha = d["maha_lord"]
    antar = d["antar_lord"]

    lagna_hi = HINDI_SIGNS.get(lagna, lagna)
    moon_hi = HINDI_SIGNS.get(moon_sign, moon_sign)
    maha_hi = HINDI_PLANETS.get(maha, maha)
    antar_hi = HINDI_PLANETS.get(antar, antar)

    lagna_idx = SIGNS.index(lagna) if lagna in SIGNS else 0

    year = target_dt.year
    month = target_dt.month
    _, num_days = calendar.monthrange(year, month)
    month_name_en = target_dt.strftime("%B")
    month_name_hi = [
        "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
        "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
    ][month - 1]

    # Calculate solar transit house for the month
    # Sun resides in specific sidereal sign depending on solar month
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    jd_mid = swe.julday(year, month, 15, 12.0)
    res_sun, _ = swe.calc_ut(jd_mid, swe.SUN, swe.FLG_SIDEREAL)
    sun_sign_idx = int(res_sun[0] / 30.0) % 12
    sun_sign = SIGNS[sun_sign_idx]
    sun_sign_hi = HINDI_SIGNS.get(sun_sign, sun_sign)

    sun_h_lagna = ((sun_sign_idx - lagna_idx + 12) % 12) + 1
    h_domain = HOUSE_DOMAINS.get(sun_h_lagna, {})
    h_domain_hi = HOUSE_DOMAINS_HI.get(sun_h_lagna, {})

    # Generate 4 calendar progression weeks covering the complete month (days 1 to num_days)
    weeks = []
    week_ranges = [
        (1, 7),
        (8, 14),
        (15, 21),
        (22, num_days)
    ]
    for w_idx, (w_start_day, w_end_day) in enumerate(week_ranges, 1):
        w_start_date = date(year, month, w_start_day)
        w_end_date = date(year, month, w_end_day)

        is_locked = (not is_unlocked) and (w_idx >= 2)
        if is_hi:
            w_title = f"सप्ताह {w_idx} ({w_start_day}–{w_end_day} {month_name_hi})"
            if w_idx == 1:
                w_theme = "रणनीतिक आधारशिला एवं लक्ष्य निर्धारण"
                w_guidance = f"माह के प्रथम सप्ताह में अपने {lagna_hi} लग्न अनुसार प्राथमिक लक्ष्यों को औपचारिक रूप दें। {maha_hi} महादशा का प्रभाव नए उपक्रमों में धैर्यपूर्वक नींव रखने का समर्थन करता है।"
            elif w_idx == 2:
                w_theme = "व्यावसायिक दृश्यता एवं क्रियान्वयन गति"
                w_guidance = f"कार्यक्षेत्र में दृश्यता और सक्रिय सहयोगियों के साथ संवाद को प्राथमिकता दें। सौर ऊर्जा आपके {sun_h_lagna}वें भाव को प्रकाशित कर रही है।"
            elif w_idx == 3:
                w_theme = "पूंजी संचय एवं बजट संतुलन"
                w_guidance = f"वित्तीय लेखा-जोखा, व्यय नियंत्रण और परिसंपत्ति समीक्षा हेतु अनुकूल कालखंड। अनावश्यक सट्टेबाजी से बचें।"
            else:
                w_theme = "समीक्षा, पूर्णता एवं आत्म-मंथन"
                w_guidance = f"लंबित कार्यों का समापन, पारिवारिक सौहार्द और आगामी माह हेतु आध्यात्मिक पुनर्नवा।"
        else:
            w_title = f"Week {w_idx} ({month_name_en} {w_start_day}–{w_end_day})"
            if w_idx == 1:
                w_theme = "Strategic Inception & Milestone Alignment"
                w_guidance = f"For your {lagna} Lagna, Week 1 favors establishing foundational workflows and setting firm targets under {maha} Mahadasha governance."
            elif w_idx == 2:
                w_theme = "Execution Velocity & Leadership Visibility"
                w_guidance = f"Step forward in professional deliberations. Transiting Sun in {sun_sign} illuminates your natal House {sun_h_lagna}."
            elif w_idx == 3:
                w_theme = "Capital Prudence & Balance Sheet Audit"
                w_guidance = "Focus on financial consolidation, auditing recurring expenditures, and settling pending contractual terms."
            else:
                w_theme = "Completion, Review & Restorative Grounding"
                w_guidance = "Conclude open milestones, nurture domestic harmony, and engage in reflective study before the new solar cycle."

        weeks.append({
            "period_index": w_idx,
            "date_range": f"{w_start_date.isoformat()} to {w_end_date.isoformat()}",
            "title": w_title,
            "focus_theme": w_theme,
            "focus_guidance": w_guidance,
            "is_preview_locked": is_locked,
            "teaser": f"Week {w_idx} ({w_start_day}–{w_end_day} {month_name_en}): House {sun_h_lagna} transit. Unlock with ₹49 pass." if is_locked else None
        })

    if is_hi:
        report_title = f"मासिक व्यक्तिगत विश्लेषण: {month_name_hi} {year} (सौर गोचर व दशा संश्लेषण)"
        summary = (
            f"{month_name_hi} {year} का संपूर्ण {num_days}-दिवसीय गोचर चक्र आपकी {lagna_hi} लग्न कुंडली में सूर्य के {sun_sign_hi} राशि में संचरण द्वारा आपके {sun_h_lagna}वें भाव ({h_domain_hi.get('domains', '')}) को केंद्र में रखता है। "
            f"आपकी सक्रिय {maha_hi} महादशा एवं {antar_hi} अंतर्दशा के अंतर्गत, माह का पूर्वार्ध आधिकारिक पहल व करियर विस्तार का समर्थन करता है, "
            f"जबकि उत्तरार्ध पूंजी संचय, बजट अनुशासन और पारिवारिक संतुलन की मांग करता है। "
            f"{sun_h_lagna}वें भाव की ऊर्जा का सदुपयोग करते हुए नैतिक पुरुषार्थ को प्राथमिकता दें।"
        )
        outlook = f"{month_name_hi} {year} ({num_days} दिन): सूर्य का आपके {sun_h_lagna}वें भाव ({sun_sign_hi}) में संचरण करियर व प्राथमिकताओं को गति प्रदान करेगा।"
        supportive = [
            f"करियर एवं प्रतिष्ठा: सूर्य देव का {sun_h_lagna}वें भाव में गोचर आधिकारिक संवाद और नेतृत्व क्षमता को सशक्त बनाएगा।",
            f"वित्तीय अनुशासन: माह के तृतीय सप्ताह में बजट संतुलन और रणनीतिक साझेदारियों से लाभ के योग।",
            f"व्यक्तिगत विकास: नियमित स्वाध्याय, मंत्र साधना और योग से शारीरिक व मानसिक ऊर्जा में वृद्धि।"
        ]
        challenges = [
            f"{sun_h_lagna}वें भाव के प्रभाव में अत्यधिक कार्यभार या अहंकार से बचें; सहयोगियों का सम्मान करें।",
            "अमावस्या काल के आसपास सट्टेबाजी या जोखिम भरे वित्तीय निर्णयों से परहेज करें।",
            "कार्य और पारिवारिक समय के मध्य स्वस्थ संतुलन बनाए रखें।"
        ]
        windows = [
            f"शुक्ल पक्ष (आरंभिक 2 सप्ताह): नए प्रोजेक्ट और औपचारिक अनुबंधों हेतु सर्वोत्तम",
            f"पूर्णिमा काल: भावनात्मक स्पष्टता और महत्वपूर्ण निर्णयों हेतु अनुकूल",
            f"कृष्ण पक्ष (अंतिम सप्ताह): समीक्षा, आंतरिक संतुलन और ऑडिट हेतु श्रेष्ठ"
        ]
        why = (
            f"यह मासिक विश्लेषण आपकी {lagna_hi} लग्न और {moon_hi} चंद्र राशि पर आधारित है। "
            f"माह के दौरान सूर्य {sun_sign_hi} राशि (आपके {sun_h_lagna}वें भाव) में भ्रमण करेंगे, जिसे सक्रिय {maha_hi}-{antar_hi} दशा के साथ परिकलित किया गया है।"
        )
        reflection = f"{month_name_hi} के प्रारंभ में अपने त्रैमासिक लक्ष्यों की समीक्षा करें और {sun_h_lagna}वें भाव के दायित्वों को समयबद्ध पूर्ण करें।"
    else:
        report_title = f"Monthly Personal Analysis: {month_name_en} {year} (Solar Transit & Dasha Synthesis)"
        summary = (
            f"Throughout the complete {num_days}-day arc of {month_name_en} {year}, solar transit through sidereal {sun_sign} directly illuminates your natal {lagna} Lagna's House {sun_h_lagna} ({h_domain.get('domains', '')}). "
            f"Supported by your active {maha} Mahadasha ({antar} Antardasha), the first half of the month fosters leadership visibility and career execution, "
            f"transitioning into capital audits and asset security in the second half. "
            f"Harness this solar illumination by focusing on ethical duty and operational precision."
        )
        outlook = f"{month_name_en} {year} ({num_days} days): Sun in sidereal {sun_sign} activates your natal House {sun_h_lagna}."
        supportive = [
            f"Vocational Growth: Transiting Sun energizing House {sun_h_lagna} supports executive presentations and stakeholder endorsement.",
            "Treasury Optimization: Week 3 provides prime cosmic weather for auditing recurring expenses and securing balance sheets.",
            "Domestic Harmony: Late-month lunar currents encourage domestic calm, family bonding, and restorative study."
        ]
        challenges = [
            f"Under House {sun_h_lagna} activation, guard against over-exertion or authoritativeness in team deliberations.",
            "Avoid speculative commitments during dark-moon (Amavasya) transition windows.",
            "Maintain intentional boundaries between demanding career milestones and domestic life."
        ]
        windows = [
            "Waxing Phase (Weeks 1 & 2): Prime for inaugurating initiatives, pitches, and formal contracts",
            "Full Moon Portal: Heightened interpersonal clarity and stakeholder alignment",
            "Waning Phase (Weeks 3 & 4): Optimal for consolidation, audits, and concluding legacy items"
        ]
        why = (
            f"Calculated for your natal {lagna} Lagna and {moon_sign} Moon. "
            f"The Sun traverses sidereal {sun_sign} across your natal House {sun_h_lagna}, synthesized with ongoing {maha}-{antar} Dasha governance."
        )
        reflection = f"Establish three defining milestones at the outset of {month_name_en}. Align daily habits with the higher duty of House {sun_h_lagna}."

    return {
        "report_title": report_title,
        "executive_summary": summary,
        "overall_outlook": outlook,
        "supportive_themes": supportive,
        "challenges_and_cautions": challenges,
        "key_time_windows": windows,
        "why_this_applies": why,
        "practical_reflection": reflection,
        "period_items": {"items": weeks}
    }


def generate_yearly_guidance(
    evidence: Dict[str, Any],
    target_dt: date,
    is_unlocked: bool = False,
    is_hi: bool = False
) -> Dict[str, Any]:
    """Horizon 5: Rolling 12-month outlook tracking Sun traversing houses 1 to 12 and major transits."""
    n = evidence["natal"]
    d = evidence["dasha"]
    t = evidence["transits"]

    lagna = n["lagna"]
    moon_sign = n["moon_sign"]
    maha = d["maha_lord"]
    antar = d["antar_lord"]

    lagna_hi = HINDI_SIGNS.get(lagna, lagna)
    moon_hi = HINDI_SIGNS.get(moon_sign, moon_sign)
    maha_hi = HINDI_PLANETS.get(maha, maha)
    antar_hi = HINDI_PLANETS.get(antar, antar)

    lagna_idx = SIGNS.index(lagna) if lagna in SIGNS else 0

    month_names_en = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    month_names_hi = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"]

    # Generate 12 real months
    months = []
    quarters_data = []

    swe.set_sid_mode(swe.SIDM_LAHIRI)
    for m in range(12):
        cal_month = ((target_dt.month - 1 + m) % 12) + 1
        cal_year = target_dt.year + ((target_dt.month - 1 + m) // 12)
        m_name = month_names_hi[cal_month - 1] if is_hi else month_names_en[cal_month - 1]
        q_num = (m // 3) + 1

        # Calculate solar position at mid-month
        jd_m = swe.julday(cal_year, cal_month, 15, 12.0)
        res_s, _ = swe.calc_ut(jd_m, swe.SUN, swe.FLG_SIDEREAL)
        s_sign_idx = int(res_s[0] / 30.0) % 12
        s_sign = SIGNS[s_sign_idx]
        s_sign_disp = HINDI_SIGNS.get(s_sign, s_sign) if is_hi else s_sign

        h_sun = ((s_sign_idx - lagna_idx + 12) % 12) + 1
        h_domain = HOUSE_DOMAINS.get(h_sun, {})
        h_domain_hi = HOUSE_DOMAINS_HI.get(h_sun, {})

        is_locked = (not is_unlocked) and (m >= 3)
        if is_hi:
            guidance_m = (
                f"{m_name} {cal_year} में सूर्य का {s_sign_disp} राशि में गोचर आपके {h_sun}वें भाव ({h_domain_hi.get('domains', '')}) को सक्रिय करेगा। "
                f"सक्रिय {maha_hi} महादशा के सहयोग से, यह माह {'व्यावसायिक प्रतिष्ठा व नेतृत्व' if h_sun in [1, 10, 11] else ('वित्तीय सुदृढ़ता व संचय' if h_sun in [2, 5, 9] else 'दैनिक अनुशासन व आत्म-सुधार')} हेतु फलदायी रहेगा।"
            )
        else:
            guidance_m = (
                f"In {m_name} {cal_year}, the Sun traverses sidereal {s_sign}, activating your natal House {h_sun} ({h_domain.get('domains', '')}). "
                f"Supported by your {maha} Dasha, focus centers upon {'vocational authority and executive milestones' if h_sun in [1, 10, 11] else ('treasury compounding and strategic intellect' if h_sun in [2, 5, 9] else 'operational efficiency and personal discipline')}."
            )

        months.append({
            "period_index": m + 1,
            "month_name": f"{m_name} {cal_year}",
            "quarter": f"Q{q_num}",
            "solar_sign": s_sign_disp,
            "activated_house": h_sun,
            "guidance": guidance_m,
            "is_preview_locked": is_locked,
            "teaser": f"Month {m+1} ({m_name} {cal_year}): Sun transit House {h_sun}. Unlock with ₹49 pass." if is_locked else None
        })

    # 4 Strategic Quarters
    quarters_en = [
        {"quarter": "Q1", "title": "Foundational Realignment & Strategic Focus", "theme": f"Restructure core routines, secure senior mentorship, and consolidate professional authority under {maha} Mahadasha."},
        {"quarter": "Q2", "title": "Capital Growth & Enterprise Expansion", "theme": "Compound investments, optimize balance sheet liquidity, and negotiate collaborative alliances with care."},
        {"quarter": "Q3", "title": "Intellectual Mastery & Vocational Ingress", "theme": "Advance scholarly research, publish key deliverables, and explore purposeful philosophical or career travel."},
        {"quarter": "Q4", "title": "Domestic Consolidation & Karmic Review", "theme": "Stabilize domestic assets, celebrate family milestones, and conduct comprehensive annual charitable stewardship."}
    ]
    quarters_hi = [
        {"quarter": "Q1", "title": "प्रथम त्रैमास: आधारशिला एवं रणनीतिक पुनर्गठन", "theme": f"{maha_hi} महादशा के अंतर्गत कार्यशैली का पुनर्गठन, साख संवर्धन और सतत प्रगति की नींव।"},
        {"quarter": "Q2", "title": "द्वितीय त्रैमास: पूंजी संचय एवं व्यावसायिक विस्तार", "theme": "विवेकपूर्ण निवेश, बजट अनुशासन और रणनीतिक साझेदारियों का लाभ।"},
        {"quarter": "Q3", "title": "तृतीय त्रैमास: बौद्धिक विकास एवं ज्ञानार्जन", "theme": "उच्च अध्ययन, शोध, दार्शनिक परिपक्वता और शुभ यात्रा के सुंदर योग।"},
        {"quarter": "Q4", "title": "चतुर्थ त्रैमास: गृह सुख, पारिवारिक मांगलिक कार्य", "theme": "पारिवारिक सौहार्द, संपत्ति स्थिरीकरण और वार्षिक परोपकार।"}
    ]

    start_year = target_dt.year
    end_year = target_dt.year + 1

    if is_hi:
        report_title = f"वार्षिक 12-माह पराशरी परिदृश्य ({start_year}–{end_year})"
        summary = (
            f"आगामी १२-माह का वार्षिक सौर व ग्रहीय चक्र आपकी {lagna_hi} लग्न कुंडली में सूर्य के संपूर्ण १२ भावों में भ्रमण और प्रमुख बाहरी ग्रहों (बृहस्पति व शनि) के गोचर को समाहित करता है। "
            f"आपकी {maha_hi} महादशा एवं {antar_hi} अंतर्दशा के संरक्षण में, वर्ष का पूर्वार्ध प्रणालीगत सुदृढ़ीकरण और साख निर्माण का मार्ग प्रशस्त करेगा, "
            f"जबकि उत्तरार्ध पूंजी विस्तार और पारिवारिक मांगलिक उपलब्धियों का प्रतिफल देगा। "
            f"शनि के अनुशासित गोचर का सम्मान करते हुए बिना किसी शॉर्टकट के निरंतर पुरुषार्थ बनाए रखें।"
        )
        outlook = f"आगामी 12 माह में {maha_hi}-{antar_hi} दशा के प्रभाव से करियर, वित्तीय स्वायत्तता और आत्म-ज्ञान में ठोस प्रगति होगी।"
        supportive = [
            "प्रथम अर्धवर्ष (माह 1–6): पेशेवर साख का पुनर्गठन, रणनीतिक गठबंधन और अनुशासित कर्म।",
            "द्वितीय अर्धवर्ष (माह 7–12): पूंजी संचय, संपदा स्थिरीकरण और बौद्धिक/पारिवारिक मांगलिक कार्य।",
            "गुरु-शनि गोचरीय सामंजस्य: केंद्र व त्रिकोण भावों में ज्ञान और स्थिरता का सुंदर संतुलन।"
        ]
        challenges = [
            "शनि के मंद गोचर के दौरान जल्दबाजी या अनैतिक शॉर्टकट से बचें।",
            "करियर की महत्त्वाकांक्षा और पारिवारिक सुख के मध्य स्वस्थ संतुलन बनाए रखें।",
            "ग्रहण काल अथवा प्रतिकूल गोचरीय संधिकाल में सट्टेबाजी से दूर रहें।"
        ]
        windows = [
            "वसंत / संक्रांति काल: रणनीतिक करियर विस्तार और नई पहलों हेतु शुभ",
            "मध्य-वर्षीय चरण: वित्तीय समीक्षा और ठोस दीर्घकालिक समझौतों हेतु उत्तम",
            "वर्ष-अंत चिंतन: वार्षिक समीक्षा, आध्यात्मिक साधना और परोपकार हेतु श्रेष्ठ"
        ]
        why = (
            f"यह 12-माह का परिदृश्य आपकी {lagna_hi} लग्न और {moon_hi} चंद्र राशि पर आधारित है। "
            f"सूर्य का 12 भावों में क्रमिक संचरण और {maha_hi}-{antar_hi} विंशोत्तरी दशा चक्र इस वार्षिक फलादेश का आधार हैं।"
        )
        reflection = f"वर्ष भर सत्य, धर्म और अपने समय व संसाधनों के सजग प्रबंधन पर केंद्रित रहें।"
    else:
        report_title = f"Yearly Personal Forecast: 12-Month Parashari Outlook ({start_year}–{end_year})"
        summary = (
            f"This comprehensive twelve-month trajectory traces solar transit through all 12 houses of your natal {lagna} Lagna, cross-referenced with major Jupiter and Saturn ephemerides. "
            f"Governed by your active {maha} Mahadasha ({antar} Antardasha), the first half of the year consolidates foundational systems and professional authority, "
            f"yielding compounded financial returns, intellectual mastery, and domestic fulfillment across the second half. "
            f"Respect Saturnian discipline by embracing steady, unhurried ethical duty (Dharma)."
        )
        outlook = f"12-month solar and planetary arc across your {lagna} Lagna under {maha}-{antar} Dasha governance."
        supportive = [
            "H1 Trajectory (Months 1–6): Systematic career restructuring, executive visibility, and strategic mentorship.",
            "H2 Trajectory (Months 7–12): Capital compounding, intellectual milestones, and familial consolidation.",
            "Jupiter-Saturn Polarity: Harmonious synthesis between expansive wisdom and grounding operational discipline."
        ]
        challenges = [
            "Avoid impatient shortcuts when navigating slow-moving Saturnian transit lessons.",
            "Maintain conscious work-life boundaries to prevent cumulative fatigue.",
            "Steer clear of unhedged speculative ventures during eclipse or planetary sandhi windows."
        ]
        windows = [
            "Spring Equinox Window: Prime for strategic career expansion and major initiatives",
            "Mid-Year Consolidation: Favorable for financial audits and binding agreements",
            "Year-End Reflection: Dedicated to annual reviews, charitable service (Daan), and spiritual poise"
        ]
        why = (
            f"Grounded in your natal {lagna} Lagna and {moon_sign} Moon coordinates. "
            f"The Sun's monthly transit through houses 1 to 12 is synthesized with ongoing {maha}-{antar} Vimshottari progression."
        )
        reflection = f"Adopt an annual theme centered on consistency, ethical duty (Dharma), and mindful stewardship of time and wealth."

    return {
        "report_title": report_title,
        "executive_summary": summary,
        "overall_outlook": outlook,
        "supportive_themes": supportive,
        "challenges_and_cautions": challenges,
        "key_time_windows": windows,
        "why_this_applies": why,
        "practical_reflection": reflection,
        "period_items": {
            "items": months,
            "quarters": quarters_hi if is_hi else quarters_en
        }
    }


def generate_mahadasha_guidance(
    evidence: Dict[str, Any],
    dashas: Dict[str, Any],
    target_dt: date,
    is_unlocked: bool = False,
    is_hi: bool = False
) -> Dict[str, Any]:
    """Horizon 6: Real 5-year chronological progression using calculated Vimshottari Antardashas."""
    n = evidence["natal"]
    d = evidence["dasha"]

    lagna = n["lagna"]
    moon_sign = n["moon_sign"]
    moon_nak = n["moon_nakshatra"]
    maha = d["maha_lord"]
    antar = d["antar_lord"]

    lagna_hi = HINDI_SIGNS.get(lagna, lagna)
    moon_hi = HINDI_SIGNS.get(moon_sign, moon_sign)
    maha_hi = HINDI_PLANETS.get(maha, maha)
    antar_hi = HINDI_PLANETS.get(antar, antar)

    maha_houses = d["maha_houses"]
    maha_houses_str = ", ".join(f"House {h}" for h in maha_houses) if maha_houses else "Karmic Axis"
    maha_houses_hi = ", ".join(f"{h}वें" for h in maha_houses) if maha_houses else "कर्म भाव"

    dasha_rel = d["mutual_relationship"]

    # Retrieve real Antardashas over the 5-year window
    # Search all Antardashas from dashas data
    antardasha_timeline = []
    all_antars = []
    for md in dashas.get("mahadashas", []):
        for ad in md.get("antardashas", []):
            all_antars.append(ad)

    # Filter Antardashas overlapping [target_dt, target_dt + 5 years]
    dt_5y_end = target_dt + timedelta(days=365 * 5)
    target_dt_iso = target_dt.isoformat()
    dt_5y_end_iso = dt_5y_end.isoformat()

    relevant_ads = []
    for ad in all_antars:
        s_date = ad.get("start_date", "")[:10]
        e_date = ad.get("end_date", "")[:10]
        if s_date and e_date:
            if not (e_date < target_dt_iso or s_date > dt_5y_end_iso):
                relevant_ads.append(ad)

    # Build 5 chronological year cards based on actual Dasha activity
    year_cards = []
    start_year = target_dt.year
    for y in range(5):
        y_start = date(start_year + y, target_dt.month, target_dt.day)
        y_end = date(start_year + y + 1, target_dt.month, target_dt.day)
        y_lbl = f"Year {y+1} ({start_year + y}–{start_year + y + 1})" if not is_hi else f"वर्ष {y+1} ({start_year + y}–{start_year + y + 1})"

        # Find Antardasha active during this specific year
        active_in_year = None
        for ad in relevant_ads:
            s_d = ad.get("start_date", "")[:10]
            e_d = ad.get("end_date", "")[:10]
            if s_d <= y_start.isoformat() <= e_d:
                active_in_year = ad
                break
        if not active_in_year and relevant_ads:
            active_in_year = relevant_ads[min(y, len(relevant_ads) - 1)]

        ad_lord = active_in_year.get("antar_dasha", antar) if active_in_year else antar
        ad_lord_hi = HINDI_PLANETS.get(ad_lord, ad_lord)
        ad_houses = get_planet_lordship_for_lagna(ad_lord, lagna)
        ad_houses_str = ", ".join(f"House {h}" for h in ad_houses) if ad_houses else "Functional Axis"
        ad_houses_hi = ", ".join(f"{h}वें" for h in ad_houses) if ad_houses else "कर्म भाव"

        is_locked = (not is_unlocked) and (y >= 1)
        ad_mantra = BEEJ_MANTRAS.get(ad_lord, BEEJ_MANTRAS["Jupiter"])

        if is_hi:
            card_title = f"{y_lbl}: {maha_hi} महादशा / {ad_lord_hi} अंतर्दशा"
            theme_txt = f"{ad_lord_hi} अंतर्दशा आपके {ad_houses_hi} भाव को सक्रिय करेगी। साख संवर्धन, विवेकपूर्ण निवेश और कौशल विस्तार हेतु अनुकूल।"
            caution_txt = f"दशा संधिकाल में उतावलेपन से बचें। {ad_houses_hi} भाव से संबंधित मामलों में कानूनी व वित्तीय पारदर्शिता बनाए रखें।"
            remedy_txt = f"{ad_lord_hi} के बीज मंत्र ({ad_mantra['mantra']}) का नित्य १०८ बार जप करें।"
        else:
            card_title = f"{y_lbl}: {maha} Mahadasha / {ad_lord} Antardasha"
            theme_txt = f"{ad_lord} Antardasha activates House {ad_houses_str}. Supports professional reputation consolidation, capital growth, and skill mastery."
            caution_txt = f"Exercise patience during Antardasha Sandhi transitions. Ensure documentation clarity regarding House {ad_houses_str} matters."
            remedy_txt = f"Recite 108 repetitions of the {ad_lord} Beej Mantra ({ad_mantra['transliteration']})."

        year_cards.append({
            "period_index": y + 1,
            "year_label": y_lbl,
            "ruling_period": f"{maha} Mahadasha / {ad_lord} Antardasha" if not is_hi else f"{maha_hi} महादशा / {ad_lord_hi} अंतर्दशा",
            "title": card_title,
            "strategic_theme": theme_txt,
            "cautions": caution_txt,
            "vedic_remedy": remedy_txt,
            "is_preview_locked": is_locked,
            "teaser": f"{y_lbl}: {ad_lord} Antardasha activating House {ad_houses_str}. Unlock with ₹49 pass." if is_locked else None
        })

    if is_hi:
        report_title = f"विंशोत्तरी महादशा 5-वर्षीय जीवन चक्र: {maha_hi} महादशा ({maha_houses_hi} भाव स्वामी)"
        summary = (
            f"आपकी {lagna_hi} लग्न कुंडली ({moon_hi} चंद्र, {moon_nak} नक्षत्र) से संगणित यह ५-वर्षीय विंशोत्तरी समयरेखा {maha_hi} महादशा के युगांतरकारी कर्म चक्र को उद्घाटित करती है। "
            f"आपकी लग्न हेतु {maha_hi} {maha_houses_hi} भाव के स्वामी हैं, जो जीवन में अधिकार, ज्ञान और स्थायी प्रभाव का संचालन करते हैं। "
            f"वर्तमान {antar_hi} अंतर्दशा के साथ इनका संबंध '{dasha_rel.get('relationship_type', 'शास्त्रीय संरेखण')}' है, जो {dasha_rel.get('description', 'शुभ फल')} प्रदान करता है। "
            f"आगामी पांच वर्षों में क्रमिक अंतर्दशा परिवर्तनों के अनुसार धैर्य, नैतिक सत्यनिष्ठा और नियमित पुरुषार्थ से सर्वोच्च सिद्धि प्राप्त होगी।"
        )
        outlook = f"5-वर्षीय विंशोत्तरी चक्र: {maha_hi} महादशा ({maha_houses_hi} भाव स्वामी) के अंतर्गत जीवन में परिपक्वता, प्रतिष्ठा और स्थायी प्रभाव का विस्तार होगा।"
        supportive = [
            f"महादशा आधिपत्य: {maha_hi} द्वारा शासित {maha_houses_hi} भाव में दीर्घकालिक स्थिरता और प्रतिष्ठा विस्तार।",
            f"अंतर्दशा समन्वय: {maha_hi}-{antar_hi} का '{dasha_rel.get('relationship_type')}' संबंध रणनीतिक निर्णयों में संतुलन देता है।",
            f"दीर्घकालिक फल: आगामी ५ वर्षों में क्रमिक अंतर्दशाएं करियर में सलाहकार नेतृत्व और वित्तीय परिपक्वता लाएंगी।"
        ]
        challenges = [
            "अंतर्दशा संधिकाल: प्रमुख ग्रहीय अवधियों के संक्रमण काल में विशेष धैर्य और विवेक बनाए रखें।",
            "अत्यधिक आशावाद में आकर वित्तीय संसाधनों का असंतुलित विस्तार न करें।",
            "५-वर्षीय चक्र में निरंतर ऊर्जा बनाए रखने हेतु नियमित दिनचर्या और सात्विक आहार का पालन करें।"
        ]
        windows = [
            f"सक्रिय अंतर्दशा चरमोत्कर्ष: {maha_hi}-{antar_hi} का वर्तमान चक्र",
            f"दशा संबंध: {dasha_rel.get('relationship_type')} (परिपक्वता व स्थिरता हेतु उत्तम)",
            f"आगामी 5-वर्षीय क्षितिज: {start_year} से {start_year + 5} तक का क्रमिक कालखंड"
        ]
        why = (
            f"यह 5-वर्षीय जीवन चक्र आपकी जन्म कालीन चंद्र राशि {moon_hi} ({moon_nak} नक्षत्र) से "
            f"१२०-वर्षीय प्रामाणिक विंशोत्तरी दशा पद्धति द्वारा संगणित है। "
            f"महादशा स्वामी {maha_hi} आपके {lagna_hi} लग्न के {maha_houses_hi} भाव के स्वामी हैं।"
        )
        reflection = f"अपने पांच वर्षीय व्यक्तिगत दृष्टिकोण को {maha_hi} के मूल स्वभाव (धर्म, ज्ञान, सत्यनिष्ठा और सतत प्रगति) से संरेखित करें।"
    else:
        report_title = f"Mahadasha 5-Year Life Arc: {maha} Mahadasha (Lord of {maha_houses_str})"
        summary = (
            f"Your 5-year chronological Vimshottari roadmap unfolds the sovereign karmic epoch of {maha} Mahadasha for your {lagna} Lagna nativity (Moon in {moon_sign}, {moon_nak} Nakshatra). "
            f"In your chart, {maha} commands {maha_houses_str}, governing key sectors of executive growth, wisdom, and material manifestation. "
            f"Its mutual relationship with active Antardasha lord {antar} is '{dasha_rel.get('relationship_type')}', which {dasha_rel.get('description')}. "
            f"Across these 5 years, sequential sub-period progressions guide steady career elevation, wealth compounding, and consultative authority."
        )
        outlook = f"5-Year Vimshottari Arc: {maha} Mahadasha (governing {maha_houses_str}) brings structural maturity and lasting legacy development."
        supportive = [
            f"Mahadasha Lordships: Compounding growth across House {maha_houses_str} significations under {maha} governance.",
            f"Sub-Period Synergy: {maha}-{antar} relationship ({dasha_rel.get('relationship_type')}) aids composed strategic planning.",
            f"Chronological Trajectory: Multi-year progression transitions from operational systems-building into respected advisory authority."
        ]
        challenges = [
            "Antardasha Sandhi: Navigate the transition boundaries between major sub-periods with deliberate patience.",
            "Avoid over-leveraging assets or over-expanding during peak optimistic planetary cycles.",
            "Honor consistent spiritual discipline and daily health maintenance to sustain high vitality across the 5-year cycle."
        ]
        windows = [
            f"Active Antardasha Peak: Current cycle of {maha}-{antar}",
            f"Sub-Period Alignment: {dasha_rel.get('relationship_type')}",
            f"5-Year Chronological Arc: Sequential progression from {start_year} through {start_year + 5}"
        ]
        why = (
            f"Derived from your natal Moon in {moon_sign} ({moon_nak} Nakshatra) under canonical 120-year Vimshottari Dasha mechanics. "
            f"{maha} commands {maha_houses_str} in your natal {lagna} Lagna, evaluated against transits and sub-period chronology."
        )
        reflection = f"Align your five-year personal vision with the core nature of {maha}: wisdom, ethics, mentorship, and sustainable growth."

    return {
        "report_title": report_title,
        "executive_summary": summary,
        "overall_outlook": outlook,
        "supportive_themes": supportive,
        "challenges_and_cautions": challenges,
        "key_time_windows": windows,
        "why_this_applies": why,
        "practical_reflection": reflection,
        "period_items": {"items": year_cards}
    }


# ==============================================================================
# CANONICAL UNIFIED ORCHESTRATOR
# ==============================================================================

def generate_canonical_personalized_prediction(
    horizon: str,
    target_date_str: str,
    kundli: Optional[Dict[str, Any]] = None,
    dashas: Optional[Dict[str, Any]] = None,
    doshas: Optional[Dict[str, Any]] = None,
    active_hora_planet: Optional[str] = None,
    hora_window: Optional[str] = None,
    lang: str = "en",
    is_unlocked: bool = False,
    preview_tier: str = "FREE",
    lat: float = 28.6139,
    lon: float = 77.2090,
    timezone_str: str = "Asia/Kolkata",
    is_unknown_time: bool = False
) -> Dict[str, Any]:
    """
    Unified entry point executing the 3-Layer Architecture:
    - Layer 1: Ephemeris & astronomical calculation
    - Layer 2: Parashari evidence ledger
    - Layer 3: Dynamic chart-grounded prediction synthesis
    """
    horizon_clean = (horizon or "hourly").lower()
    is_hi = bool(lang and lang.lower().startswith("hi"))

    try:
        target_dt = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except Exception:
        target_dt = date.today()

    # If no kundli chart is supplied, return clean universal transit preview
    if not kundli:
        from ai_astrologer import generate_structured_prediction as fallback_unpersonalized
        return fallback_unpersonalized(
            horizon=horizon_clean,
            target_date_str=target_date_str,
            kundli=None,
            dasha=None,
            doshas=None,
            active_hora_planet=active_hora_planet,
            hora_window=hora_window,
            lang=lang,
            is_unlocked=is_unlocked,
            preview_tier=preview_tier
        )

    # 1. Layer 1: Astronomical Calculations
    lagna_sign = kundli.get("lagna", {}).get("sign", "Aries")
    moon_sign = kundli.get("planets", {}).get("Moon", {}).get("sign", "Aries")
    lagna_idx = SIGNS.index(lagna_sign) if lagna_sign in SIGNS else 0
    moon_idx = SIGNS.index(moon_sign) if moon_sign in SIGNS else 0

    ref_dt = datetime(target_dt.year, target_dt.month, target_dt.day, 12, 0, 0, tzinfo=timezone.utc)
    live_transits = calculate_live_transits(
        ref_dt=ref_dt,
        natal_lagna_idx=lagna_idx,
        natal_moon_idx=moon_idx,
        sav_bindus=kundli.get("sav_bindus")
    )

    # Resolve true Hora if hourly
    hora_p = active_hora_planet or "Jupiter"
    hora_w = hora_window or "Active Solar Hour"
    if horizon_clean == "hourly":
        try:
            sun_times = calculate_sun_times(target_dt, lat, lon, timezone_str)
            if sun_times and "sunrise" in sun_times and "sunset" in sun_times:
                s_dt = sun_times["sunrise"]
                e_dt = sun_times["sunset"]
                next_s = s_dt + timedelta(days=1)
                now_local = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=5.5)))
                h_res = calculate_24h_horas(s_dt, e_dt, next_s, now_local)
                if h_res and h_res.get("active_hora"):
                    hora_p = h_res["active_hora"].get("ruling_planet", hora_p)
                    hora_w = f"{h_res['active_hora'].get('start_time')} – {h_res['active_hora'].get('end_time')}"
        except Exception:
            pass

    # 2. Layer 2: Deterministic Parashari Evidence Ledger
    dashas = dashas or {}
    evidence = analyze_personal_jyotish_evidence(
        kundli=kundli,
        dashas=dashas,
        transits=live_transits,
        target_dt=target_dt,
        is_unknown_time=is_unknown_time
    )

    # 3. Layer 3: Horizon-Specific Prediction Builders
    if horizon_clean == "hourly":
        h_data = generate_hourly_guidance(evidence, hora_p, hora_w, target_dt, is_hi)
        # Period items (3 consecutive Horas)
        from ai_astrologer import _build_period_items
        period_items = _build_period_items("hourly", target_dt, is_hi, True, kundli, dashas, doshas, hora_p, hora_w, is_unlocked)
    elif horizon_clean == "daily":
        h_data = generate_daily_guidance(evidence, target_dt, is_hi)
        from ai_astrologer import _build_period_items
        period_items = _build_period_items("daily", target_dt, is_hi, True, kundli, dashas, doshas, hora_p, hora_w, is_unlocked)
    elif horizon_clean == "weekly":
        h_data = generate_weekly_guidance(evidence, target_dt, is_unlocked, is_hi)
        period_items = h_data.get("period_items", {})
    elif horizon_clean == "monthly":
        h_data = generate_monthly_guidance(evidence, target_dt, is_unlocked, is_hi)
        period_items = h_data.get("period_items", {})
    elif horizon_clean == "yearly":
        h_data = generate_yearly_guidance(evidence, target_dt, is_unlocked, is_hi)
        period_items = h_data.get("period_items", {})
    elif horizon_clean in ["mahadasha", "5year", "five_year"]:
        h_data = generate_mahadasha_guidance(evidence, dashas, target_dt, is_unlocked, is_hi)
        period_items = h_data.get("period_items", {})
    else:
        h_data = generate_daily_guidance(evidence, target_dt, is_hi)
        from ai_astrologer import _build_period_items
        period_items = _build_period_items("daily", target_dt, is_hi, True, kundli, dashas, doshas, hora_p, hora_w, is_unlocked)

    # Structured 9-section schema
    sections = {
        "executive_summary": h_data["executive_summary"],
        "overall_outlook": h_data["overall_outlook"],
        "supportive_themes": h_data["supportive_themes"],
        "supportive_developments": h_data["supportive_themes"],
        "challenges_and_cautions": h_data["challenges_and_cautions"],
        "key_time_windows": h_data["key_time_windows"],
        "relevant_time_windows": h_data["key_time_windows"],
        "relevant_chart_facts": {
            "lagna": f"{HINDI_SIGNS.get(evidence['natal']['lagna'], evidence['natal']['lagna']) if is_hi else evidence['natal']['lagna']} ({evidence['natal']['lagna_degree']:.2f}°)",
            "moon": f"{HINDI_SIGNS.get(evidence['natal']['moon_sign'], evidence['natal']['moon_sign']) if is_hi else evidence['natal']['moon_sign']} ({evidence['natal']['moon_nakshatra']})",
            "active_dasha": (
                f"{HINDI_PLANETS.get(evidence['dasha']['maha_lord'], evidence['dasha']['maha_lord'])} महादशा - {HINDI_PLANETS.get(evidence['dasha']['antar_lord'], evidence['dasha']['antar_lord'])} अंतर्दशा"
                if is_hi else
                f"{evidence['dasha']['maha_lord']} Mahadasha - {evidence['dasha']['antar_lord']} Antardasha"
            ),
            "dasha_relationship": evidence['dasha']['mutual_relationship'].get('relationship_type'),
            "saturn_transit": (
                f"लग्न से {evidence['transits']['saturn_house_lagna']}वां भाव, चंद्र से {evidence['transits']['saturn_house_moon']}वां भाव"
                if is_hi else
                f"House {evidence['transits']['saturn_house_lagna']} from Lagna, House {evidence['transits']['saturn_house_moon']} from Moon"
            ),
            "current_interval_lord": (
                (HINDI_PLANETS.get(hora_p, hora_p) if horizon_clean == "hourly" else HINDI_SIGNS.get(evidence['transits']['t_moon_sign'], evidence['transits']['t_moon_sign']))
                if is_hi else
                (hora_p if horizon_clean == "hourly" else evidence['transits']['t_moon_sign'])
            )
        },
        "applicable_traditional_rules": h_data["why_this_applies"],
        "why_this_applies": h_data["why_this_applies"],
        "practical_reflection": h_data["practical_reflection"],
        "limitations": (
            "वैदिक ज्योतिष खगोलीय प्रवृत्तियों और शुभ समय का दिग्दर्शन कराता है। व्यक्तिगत नैतिक संकल्प, पुरुषार्थ और स्वतंत्र इच्छा ही वास्तविक परिणामों का निर्धारण करते हैं।"
            if is_hi else
            "Vedic astrology maps celestial rhythms and qualitative tendencies. Personal free will, ethical diligence, and practical effort govern lived outcomes."
        )
    }

    if is_unknown_time:
        sections["limitations"] += (
            " (नोट: जन्म समय अज्ञात होने के कारण लग्न एवं भाव-आधारित विश्लेषण सांकेतिक है; चंद्र व सूर्य गोचर को प्राथमिकता दी गई है।)"
            if is_hi else
            " (Note: Birth time is marked unknown. House boundaries and Ascendant claims are qualitative indicators; lunar and solar transits are prioritized.)"
        )

    # Remedies and Precautions
    from ai_astrologer import _build_remedies_and_precautions
    remedies, precautions = _build_remedies_and_precautions(
        horizon_clean, is_hi, hora_p, None, h_data["challenges_and_cautions"], h_data["practical_reflection"], has_chart=True
    )

    return {
        "status": "SUCCESS",
        "report_title": h_data["report_title"],
        "time_horizon": horizon_clean,
        "target_date": target_date_str,
        "period": {
            "start_date": target_date_str,
            "end_date": (target_dt + timedelta(days=6 if horizon_clean == "weekly" else (30 if horizon_clean == "monthly" else (365 if horizon_clean == "yearly" else (1825 if horizon_clean in ["mahadasha", "5year", "five_year"] else 0))))).strftime("%Y-%m-%d"),
            "timezone": timezone_str,
            "horizon": horizon_clean
        },
        "calculation_context": {
            "lagna_sign": evidence["natal"]["lagna"],
            "lagna_degree": evidence["natal"]["lagna_degree"],
            "moon_sign": evidence["natal"]["moon_sign"],
            "moon_nakshatra": evidence["natal"]["moon_nakshatra"],
            "active_mahadasha": evidence["dasha"]["maha_lord"],
            "active_antardasha": evidence["dasha"]["antar_lord"],
            "active_hora_planet": hora_p,
            "active_hora_window": hora_w
        },
        "preview": {
            "is_preview": not is_unlocked if horizon_clean in ["weekly", "monthly", "yearly", "mahadasha", "5year", "five_year"] else False,
            "unlocked": is_unlocked or horizon_clean in ["hourly", "daily"]
        },
        "profile": {
            "name": kundli.get("name", "Seeker"),
            "is_guest": False,
            "lagna": evidence["natal"]["lagna"],
            "lagna_degree": evidence["natal"]["lagna_degree"],
            "moon_sign": evidence["natal"]["moon_sign"],
            "moon_nakshatra": evidence["natal"]["moon_nakshatra"],
            "active_mahadasha": evidence["dasha"]["maha_lord"],
            "active_antardasha": evidence["dasha"]["antar_lord"],
            "sade_sati_status": evidence["transits"].get("sade_sati", {}).get("status", "CLEAR")
        },
        "sections": sections,
        "period_items": period_items,
        "remedies": remedies,
        "precautions": precautions,
        "evidence_ledger": evidence,
        "provenance": {
            "calculation_engine": "SwissEphemeris_v2.10_Lahiri",
            "interpretation_standard": "Parashari_Jyotish_Canonical_v2",
            "ephemeris_mode": "Sidereal_Lahiri_Ayanamsha",
            "dasha_system": "Vimshottari_120_Year",
            "personalization_status": "AUTHENTIC_CHART_GROUNDED"
        }
    }
