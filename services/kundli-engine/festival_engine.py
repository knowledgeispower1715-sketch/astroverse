"""
AstroVerse Indian Holiday, Festival & Vrat Data Service
========================================================
Comprehensive repository and astronomical observance engine for Indian national,
gazetted, restricted, state/regional, religious festivals, vrats, and bank holidays.

Features:
1. 7 Distinct Categories:
   - national (Republic Day, Independence Day, Gandhi Jayanti)
   - gazetted (Central Government Gazetted Holidays)
   - restricted (Restricted/Optional Holidays)
   - state (State & Union Territory Holidays with region codes)
   - religious (Major Hindu, Muslim, Christian, Sikh, Jain, Buddhist festivals)
   - vrat (Fasting days: Ekadashis, Pradosh, Sankashti Chaturthi, Purnima, Amavasya, Karwa Chauth)
   - bank (Annual Closing on Apr 1, 2nd & 4th Saturdays, Negotiable Instruments Act holidays)
2. Complete HolidayRecord Metadata:
   id, nameEn, nameHi, nameSa, date, category, regions, isOfficial, isTentative, source,
   observanceRule, descriptionEn, descriptionHi.
3. Authentic Festival Tithi Observance Rules:
   - udaya_tithi: Tithi prevailing at local sunrise (Vrats, Ekadashi, Dussehra, etc.)
   - madhyahna: Tithi prevailing during solar midday (11:00 to 13:30 local) (Ganesha Chaturthi, Rama Navami)
   - nishita: Tithi/Nakshatra prevailing at local midnight (Maha Shivratri, Krishna Janmashtami)
   - pradosha: Tithi prevailing during 2 hours post-sunset (Diwali Lakshmi Puja, Pradosh Vrat)
4. Dynamic Vrat & Bank Holiday Generator for any requested year and month.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta, timezone
import calendar

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

import swisseph as swe

from panchang_engine import (
    calculate_celestial_timings,
    calculate_advanced_panchang,
    datetime_to_jd_utc,
    jd_to_datetime_utc,
    format_iso_tz,
    format_time_tz,
)

from astrology_settings import (
    SIGNS_DETAILED,
    NAKSHATRAS_DETAILED,
    TITHIS_DETAILED,
    LUNAR_MONTHS,
)

# Region Codes & Names
INDIAN_REGIONS = {
    "ALL": "All India",
    "DL": "Delhi",
    "MH": "Maharashtra",
    "TN": "Tamil Nadu",
    "KA": "Karnataka",
    "WB": "West Bengal",
    "UP": "Uttar Pradesh",
    "GJ": "Gujarat",
    "KL": "Kerala",
    "AP": "Andhra Pradesh",
    "TS": "Telangana",
    "PB": "Punjab",
    "BR": "Bihar",
    "RJ": "Rajasthan",
    "MP": "Madhya Pradesh",
    "OR": "Odisha",
    "AS": "Assam",
    "HR": "Haryana",
    "JK": "Jammu & Kashmir",
    "UT": "Uttarakhand",
    "HP": "Himachal Pradesh",
    "GA": "Goa",
    "JH": "Jharkhand",
    "CH": "Chandigarh",
    "CT": "Chhattisgarh",
}

# =============================================================================
# MASTER HOLIDAY & FESTIVAL REGISTRY (2025 - 2027)
# =============================================================================

STATIC_HOLIDAYS_REGISTRY = [
    # ---------------- 2026 NATIONAL & GAZETTED HOLIDAYS ----------------
    {
        "id": "republic-day-2026",
        "nameEn": "Republic Day",
        "nameHi": "गणतंत्र दिवस",
        "nameSa": "प्रजातन्त्रदिनम्",
        "date": "2026-01-26",
        "category": "national",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Ministry of Personnel, Public Grievances and Pensions, Govt of India",
        "descriptionEn": "Honors the date on which the Constitution of India came into effect in 1950.",
        "descriptionHi": "1950 में भारत के संविधान के लागू होने के उपलक्ष्य में मनाया जाने वाला राष्ट्रीय पर्व।",
    },
    {
        "id": "independence-day-2026",
        "nameEn": "Independence Day",
        "nameHi": "स्वतंत्रता दिवस",
        "nameSa": "स्वातन्त्र्यदिनम्",
        "date": "2026-08-15",
        "category": "national",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Ministry of Personnel, Public Grievances and Pensions, Govt of India",
        "descriptionEn": "Commemorates the nation's independence from British rule on 15 August 1947.",
        "descriptionHi": "15 अगस्त 1947 को ब्रिटिश शासन से भारत की स्वतंत्रता की स्मृति में राष्ट्रीय उत्सव।",
    },
    {
        "id": "gandhi-jayanti-2026",
        "nameEn": "Mahatma Gandhi's Birthday",
        "nameHi": "महात्मा गांधी जयन्ती",
        "nameSa": "महात्मागान्धिजयन्ती",
        "date": "2026-10-02",
        "category": "national",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Ministry of Personnel, Public Grievances and Pensions, Govt of India",
        "descriptionEn": "Birth anniversary of the Father of the Nation, Mahatma Gandhi, observed as the International Day of Non-Violence.",
        "descriptionHi": "राष्ट्रपिता महात्मा गांधी की जन्म जयन्ती, जिसे अन्तरराष्ट्रीय अहिंसा दिवस के रूप में भी मनाया जाता है।",
    },
    {
        "id": "maha-shivratri-2026",
        "nameEn": "Maha Shivratri",
        "nameHi": "महाशिवरात्रि",
        "nameSa": "महाशिवरात्रिः",
        "date": "2026-02-15",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT Gazetted Holidays",
        "observanceRule": "nishita",
        "descriptionEn": "The Great Night of Lord Shiva celebrated on Phalguna Krishna Chaturdashi prevailing at Nishita Kaal (midnight).",
        "descriptionHi": "फाल्गुन कृष्ण चतुर्दशी को निशीथ काल में भगवान शिव की आराधना और महापूजा का परम पावन पर्व।",
    },
    {
        "id": "holi-2026",
        "nameEn": "Holi (Dhulandi)",
        "nameHi": "होली (धुलण्डी)",
        "nameSa": "होलिकोत्सवः",
        "date": "2026-03-04",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "DoPT Gazetted Holidays",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Festival of colors celebrated on Chaitra Krishna Pratipada following Holika Dahan on Phalguna Purnima.",
        "descriptionHi": "रंगों और सौहार्द का उल्लासमय महापर्व, जो चैत्र कृष्ण प्रतिपदा को मनाया जाता है।",
    },
    {
        "id": "eid-ul-fitr-2026",
        "nameEn": "Id-ul-Fitr",
        "nameHi": "ईद-उल-फ़ितर",
        "nameSa": "ईद्-उल्-फ़ितर्",
        "date": "2026-03-20",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": True,
        "source": "DoPT Gazetted Holidays (Subject to Moon Sighting)",
        "descriptionEn": "Islamic festival marking the end of the sacred month of Ramadan.",
        "descriptionHi": "रमज़ान के पवित्र महीने के समापन पर चाँद देखकर मनाया जाने वाला प्रमुख इस्लामी त्योहार।",
    },
    {
        "id": "ram-navami-2026",
        "nameEn": "Rama Navami",
        "nameHi": "राम नवमी",
        "nameSa": "रामनवमी",
        "date": "2026-03-27",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT Gazetted Holidays",
        "observanceRule": "madhyahna",
        "descriptionEn": "Celebrates the divine birth of Lord Rama at solar midday (Madhyahna) on Chaitra Shukla Navami.",
        "descriptionHi": "चैत्र शुक्ल नवमी को मध्याह्न काल में मर्यादा पुरुषोत्तम भगवान श्री राम का प्राकट्योत्सव।",
    },
    {
        "id": "mahavir-jayanti-2026",
        "nameEn": "Mahavir Jayanti",
        "nameHi": "महावीर जयन्ती",
        "nameSa": "महावीरजयन्ती",
        "date": "2026-03-31",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "DoPT Gazetted Holidays",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Birth anniversary of the 24th and last Tirthankara of Jainism, Lord Mahavira.",
        "descriptionHi": "जैन धर्म के २४वें तीर्थंकर भगवान महावीर स्वामी की पावन जन्म जयन्ती।",
    },
    {
        "id": "good-friday-2026",
        "nameEn": "Good Friday",
        "nameHi": "गुड फ्राइडे",
        "nameSa": "गुड्-फ्राइडे",
        "date": "2026-04-03",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "DoPT Gazetted Holidays",
        "descriptionEn": "Christian solemn day commemorating the crucifixion of Jesus Christ at Calvary.",
        "descriptionHi": "ईसा मसीह के बलिदान और क्रूसारोपण की स्मृति में मनाया जाने वाला पवित्र दिवस।",
    },
    {
        "id": "buddha-purnima-2026",
        "nameEn": "Buddha Purnima",
        "nameHi": "बुद्ध पूर्णिमा",
        "nameSa": "बुद्धपूर्णिमा",
        "date": "2026-05-01",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT Gazetted Holidays",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Celebrates the birth, enlightenment, and parinirvana of Gautama Buddha on Vaisakha Purnima.",
        "descriptionHi": "वैशाख पूर्णिमा को भगवान गौतम बुद्ध का जन्म, संबोधि और महापरिनिर्वाण दिवस।",
    },
    {
        "id": "id-ul-zuha-2026",
        "nameEn": "Id-ul-Zuha (Bakrid)",
        "nameHi": "ईद-उल-ज़ुहा (बकरीद)",
        "nameSa": "ईद्-उल्-ज़ुहा",
        "date": "2026-05-27",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": True,
        "source": "DoPT Gazetted Holidays",
        "descriptionEn": "Feast of the Sacrifice honoring Ibrahim's willingness to sacrifice his son in obedience to God.",
        "descriptionHi": "हज़रत इब्राहीम के त्याग और समर्पण की स्मृति में मनाया जाने वाला बलिदान का त्योहार।",
    },
    {
        "id": "muharram-2026",
        "nameEn": "Muharram (Ashura)",
        "nameHi": "मोहर्रम (आशूरा)",
        "nameSa": "मोहर्रम्",
        "date": "2026-06-26",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": True,
        "source": "DoPT Gazetted Holidays",
        "descriptionEn": "First month of Islamic calendar; 10th day observed as Ashura in memory of Imam Hussain.",
        "descriptionHi": "कर्बला के मैदान में हज़रत इमाम हुसैन और उनके साथियों की शहादत की स्मृति का दिन।",
    },
    {
        "id": "milad-un-nabi-2026",
        "nameEn": "Milad-un-Nabi (Id-e-Milad)",
        "nameHi": "मिलाद-उन-नबी",
        "nameSa": "मिलाद्-उन्-नबी",
        "date": "2026-08-26",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": True,
        "source": "DoPT Gazetted Holidays",
        "descriptionEn": "Observance of the birthday of the Islamic prophet Muhammad.",
        "descriptionHi": "इस्लाम के पैगम्बर हज़रत मुहम्मद सल्लल्लाहु अलैहि वसल्लम का जन्म दिवस।",
    },
    {
        "id": "janmashtami-2026",
        "nameEn": "Krishna Janmashtami",
        "nameHi": "श्री कृष्ण जन्माष्टमी",
        "nameSa": "श्रीकृष्णजन्माष्टमी",
        "date": "2026-09-04",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT Gazetted Holidays",
        "observanceRule": "nishita",
        "descriptionEn": "Celebrates the midnight advent of Lord Krishna on Bhadrapada Krishna Ashtami with Rohini Nakshatra.",
        "descriptionHi": "भाद्रपद कृष्ण अष्टमी को निशीथ काल में भगवान श्री कृष्ण के अवतरण का महापर्व।",
    },
    {
        "id": "dussehra-2026",
        "nameEn": "Dussehra (Vijaya Dashami)",
        "nameHi": "दशहरा (विजयादशमी)",
        "nameSa": "विजयादशमी",
        "date": "2026-10-20",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT Gazetted Holidays",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Celebrates the victory of Lord Rama over Ravana and Goddess Durga over Mahishasura on Ashwina Shukla Dashami.",
        "descriptionHi": "अधर्म पर धर्म और असत्य पर सत्य की विजय का प्रतीक महापर्व, विजयादशमी।",
    },
    {
        "id": "diwali-2026",
        "nameEn": "Diwali (Deepavali / Lakshmi Puja)",
        "nameHi": "दीपावली (लक्ष्मी पूजन)",
        "nameSa": "दीपावलिः",
        "date": "2026-11-08",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT Gazetted Holidays",
        "observanceRule": "pradosha",
        "descriptionEn": "Grand Festival of Lights celebrated on Kartika Amavasya prevailing during Pradosha Kaal with Mahalakshmi Puja.",
        "descriptionHi": "कार्तिक कृष्ण अमावस्या को प्रदोष काल में महालक्ष्मी पूजन और दीप प्रज्ज्वलन का महापर्व।",
    },
    {
        "id": "guru-nanak-jayanti-2026",
        "nameEn": "Guru Nanak Jayanti",
        "nameHi": "गुरु नानक जयन्ती (प्रकाश पर्व)",
        "nameSa": "गुरुनानकजयन्ती",
        "date": "2026-11-24",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT Gazetted Holidays",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Celebrates the birth of Guru Nanak Dev Ji, founder of Sikhism, on Kartika Purnima.",
        "descriptionHi": "सिख धर्म के प्रथम गुरु एवं संस्थापक श्री गुरु नानक देव जी का पावन प्रकाश पर्व।",
    },
    {
        "id": "christmas-2026",
        "nameEn": "Christmas Day",
        "nameHi": "क्रिसमस दिवस",
        "nameSa": "क्रिसमस्-दिनम्",
        "date": "2026-12-25",
        "category": "gazetted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "DoPT Gazetted Holidays",
        "descriptionEn": "Celebration of the birth of Jesus Christ observed globally on 25 December.",
        "descriptionHi": "प्रभु यीशु मसीह के जन्म दिवस के उपलक्ष्य में हर्षोल्लास से मनाया जाने वाला पावन पर्व।",
    },

    # ---------------- RESTRICTED / OPTIONAL HOLIDAYS 2026 ----------------
    {
        "id": "new-year-2026",
        "nameEn": "New Year's Day",
        "nameHi": "नव वर्ष दिवस",
        "date": "2026-01-01",
        "category": "restricted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "DoPT Restricted Holidays",
        "descriptionEn": "First day of the year in the Gregorian calendar.",
        "descriptionHi": "ग्रेगोरियन कैलेंडर वर्ष का प्रथम दिवस।",
    },
    {
        "id": "makar-sankranti-2026",
        "nameEn": "Makar Sankranti / Pongal",
        "nameHi": "मकर संक्रान्ति / पोंगल",
        "nameSa": "मकरसङ्क्रान्तिः",
        "date": "2026-01-14",
        "category": "restricted",
        "regions": ["ALL", "TN", "AP", "TS", "KA", "MH", "GJ", "UP", "BR"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Marks the transition of the Sun into Capricorn (Makara Rashi) and the onset of Uttarayana.",
        "descriptionHi": "भगवान सूर्य का मकर राशि में प्रवेश और उत्तरायण का पावन पर्व।",
    },
    {
        "id": "basant-panchami-2026",
        "nameEn": "Basant Panchami / Saraswati Puja",
        "nameHi": "बसन्त पञ्चमी / सरस्वती पूजा",
        "nameSa": "सरस्वतीपूजा",
        "date": "2026-01-23",
        "category": "restricted",
        "regions": ["ALL", "WB", "BR", "UP", "PB"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Worship of Goddess Saraswati on Magha Shukla Panchami ushering in spring.",
        "descriptionHi": "माघ शुक्ल पञ्चमी को विद्या की देवी माँ सरस्वती का पूजन और वसन्तोत्सव।",
    },
    {
        "id": "holika-dahan-2026",
        "nameEn": "Holika Dahan / Chhoti Holi",
        "nameHi": "होलिका दहन",
        "nameSa": "होलिकादहनम्",
        "date": "2026-03-03",
        "category": "restricted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang",
        "observanceRule": "pradosha",
        "descriptionEn": "Bonfire ritual symbolizing the triumph of Bhakta Prahlada's devotion over evil on Phalguna Purnima.",
        "descriptionHi": "फाल्गुन पूर्णिमा को प्रदोष काल में भद्रा रहित समय पर होलिका दहन का शास्त्रीय अनुष्ठान।",
    },
    {
        "id": "gudi-padwa-ugadi-2026",
        "nameEn": "Chaitra Sukladi / Gudi Padwa / Ugadi",
        "nameHi": "चैत्र शुक्लादि / गुड़ी पड़वा / उगादी",
        "nameSa": "नवसंवत्सरोत्सवः",
        "date": "2026-03-19",
        "category": "restricted",
        "regions": ["MH", "KA", "AP", "TS", "GA", "GJ"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & State Lists",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Traditional Hindu Lunar New Year marking the beginning of Vikram Samvat 2083 and Shaka Samvat 1948.",
        "descriptionHi": "चैत्र शुक्ल प्रतिपदा पर भारतीय नववर्ष, विक्रम संवत् २०८३ एवं शालिवाहन शक संवत् १९४८ का प्रारम्भ।",
    },
    {
        "id": "raksha-bandhan-2026",
        "nameEn": "Raksha Bandhan",
        "nameHi": "रक्षा बन्धन",
        "nameSa": "रक्षाबन्धनम्",
        "date": "2026-08-28",
        "category": "restricted",
        "regions": ["ALL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Celebrates brother-sister bond and sacred protection on Shravana Purnima.",
        "descriptionHi": "श्रावण पूर्णिमा पर भाई-बहन के अगाध प्रेम और रक्षा का पवित्र संकल्प पर्व।",
    },
    {
        "id": "ganesha-chaturthi-2026",
        "nameEn": "Ganesha Chaturthi (Vinayaka Chaturthi)",
        "nameHi": "गणेश चतुर्थी",
        "nameSa": "गणेशचतुर्थी",
        "date": "2026-09-14",
        "category": "restricted",
        "regions": ["ALL", "MH", "KA", "AP", "TS", "TN", "GJ"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang & DoPT",
        "observanceRule": "madhyahna",
        "descriptionEn": "Advent of Lord Ganesha on Bhadrapada Shukla Chaturthi prevailing during solar midday (Madhyahna).",
        "descriptionHi": "भाद्रपद शुक्ल चतुर्थी को मध्याह्न काल में विघ्नहर्ता भगवान श्री गणेश की प्रतिष्ठा एवं आराधना।",
    },
    {
        "id": "karwa-chauth-2026",
        "nameEn": "Karwa Chauth",
        "nameHi": "करवा चौथ",
        "nameSa": "करकचतुर्थी",
        "date": "2026-10-29",
        "category": "vrat",
        "regions": ["DL", "UP", "HR", "PB", "RJ", "MP"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang",
        "observanceRule": "nishita",
        "descriptionEn": "Nirjala fasting by married women on Kartika Krishna Chaturthi for the longevity and health of their husbands.",
        "descriptionHi": "कार्तिक कृष्ण चतुर्थी को सुहागिनों द्वारा पति की दीर्घायु हेतु चन्द्रोदय दर्शन तक निर्जला व्रत।",
    },
    {
        "id": "govardhan-puja-2026",
        "nameEn": "Govardhan Puja / Annakut",
        "nameHi": "गोवर्धन पूजा (अन्नकूट)",
        "nameSa": "गोवर्धनपूजा",
        "date": "2026-11-09",
        "category": "restricted",
        "regions": ["ALL", "UP", "HR", "RJ", "MP", "GJ"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Honors Lord Krishna lifting Mount Govardhan on Kartika Shukla Pratipada.",
        "descriptionHi": "कार्तिक शुक्ल प्रतिपदा को भगवान श्री कृष्ण द्वारा गोवर्धन पर्वत धारण करने की लीला का पूजनोत्सव।",
    },
    {
        "id": "bhai-duj-2026",
        "nameEn": "Bhai Duj (Yama Dwitiya)",
        "nameHi": "भाई दूज (यम द्वितीया)",
        "nameSa": "यमद्वितीया",
        "date": "2026-11-10",
        "category": "restricted",
        "regions": ["ALL", "UP", "MH", "WB", "BR", "RJ"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Rashtriya Panchang",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Celebrates sibling affection on Kartika Shukla Dwitiya where sisters pray for their brothers' victory and longevity.",
        "descriptionHi": "कार्तिक शुक्ल द्वितीया पर बहनों द्वारा भाइयों को तिलक कर मंगलकामना करने का पावन पर्व।",
    },
    {
        "id": "chhath-puja-2026",
        "nameEn": "Chhath Puja (Surya Shashthi)",
        "nameHi": "छठ पूजा (सूर्य षष्ठी)",
        "nameSa": "सूर्यषष्ठी",
        "date": "2026-11-15",
        "category": "state",
        "regions": ["BR", "UP", "JH", "DL", "WB"],
        "isOfficial": True,
        "isTentative": False,
        "source": "State Gazettes (Bihar & UP)",
        "observanceRule": "pradosha",
        "descriptionEn": "Ancient Vedic solar festival dedicated to Lord Surya and Chhathi Maiya on Kartika Shukla Shashthi.",
        "descriptionHi": "कार्तिक शुक्ल षष्ठी को अस्ताचलगामी और उदीयमान सूर्य को अर्घ्य समर्पित करने का कठोर तपमय महापर्व।",
    },

    # ---------------- 2026 STATE & REGIONAL HOLIDAYS ----------------
    {
        "id": "maharashtra-day-2026",
        "nameEn": "Maharashtra Day / Labour Day",
        "nameHi": "महाराष्ट्र दिवस / मजदूर दिवस",
        "date": "2026-05-01",
        "category": "state",
        "regions": ["MH"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Government of Maharashtra Gazette",
        "descriptionEn": "Commemorates the formation of the state of Maharashtra on 1 May 1960.",
        "descriptionHi": "१ मई १९६० को महाराष्ट्र राज्य के गठन की स्मृति में राज्य स्थापना दिवस।",
    },
    {
        "id": "durga-puja-maha-navami-2026",
        "nameEn": "Durga Puja (Maha Navami / Ayudha Puja)",
        "nameHi": "दुर्गा पूजा (महानवमी / आयुध पूजा)",
        "date": "2026-10-19",
        "category": "state",
        "regions": ["WB", "AS", "OR", "TN", "KA"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Government of West Bengal & Karnataka Gazettes",
        "observanceRule": "udaya_tithi",
        "descriptionEn": "Ninth day of Durga Puja celebrated with grand devotion and Ayudha Puja in South India.",
        "descriptionHi": "माँ दुर्गा की महानवमी पूजा एवं दक्षिण भारत में आयुध व वाहन पूजन का विशिष्ट उत्सव।",
    },
    {
        "id": "onam-thiruvonam-2026",
        "nameEn": "Thiruvonam (Onam)",
        "nameHi": "ओणम (थिरुवोनम)",
        "nameSa": "श्रावणमहोत्सवः",
        "date": "2026-08-26",
        "category": "state",
        "regions": ["KL"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Government of Kerala Gazette",
        "descriptionEn": "Kerala's harvest festival honoring King Mahabali on Shravana Nakshatra in Chingam month.",
        "descriptionHi": "केरल का प्रमुख सांस्कृतिक एवं फसल उत्सव जो राजा महाबलि के स्वागत में मनाया जाता है।",
    },
    {
        "id": "bohag-bihu-2026",
        "nameEn": "Bohag Bihu / Rongali Bihu",
        "nameHi": "बोहाग बिहू (रोंगाली बिहू)",
        "date": "2026-04-14",
        "category": "state",
        "regions": ["AS"],
        "isOfficial": True,
        "isTentative": False,
        "source": "Government of Assam Gazette",
        "descriptionEn": "Assamese New Year festival celebrating the arrival of spring and harvest cycle.",
        "descriptionHi": "असम का पारंपरिक नववर्ष एवं वसंत आगमन का उल्लासमय सांस्कृतिक पर्व।",
    },
]


# =============================================================================
# ASTRONOMICAL TITHI OBSERVANCE EVALUATION
# =============================================================================

def evaluate_tithi_observance(
    rule: str,
    target_date: date,
    target_tithi_idx: int,
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> bool:
    """
    Evaluates whether a festival or vrat is accurately observed on `target_date`
    under its classical Dharma Shastra observance rule:
    - udaya_tithi: Tithi prevailing at local Sunrise.
    - madhyahna: Tithi prevailing during solar midday (meridian transit).
    - nishita: Tithi prevailing at local midnight (8th nocturnal Muhurta).
    - pradosha: Tithi prevailing during 2 hours post-sunset.
    """
    swe.set_sid_mode(ayanamsha_mode)
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL

    timings = calculate_celestial_timings(target_date, lat, lon, altitude_m=0.0, tz_str=tz_str)
    dt_rise = jd_to_datetime_utc(timings["jd_rise"])
    dt_set = jd_to_datetime_utc(timings["jd_set"])
    dt_next_rise = jd_to_datetime_utc(timings["jd_next_rise"])
    dt_noon = jd_to_datetime_utc(timings["jd_noon"])

    if rule == "udaya_tithi":
        eval_dt = dt_rise
    elif rule == "madhyahna":
        eval_dt = dt_noon
    elif rule == "nishita":
        night_sec = (dt_next_rise - dt_set).total_seconds()
        eval_dt = dt_set + timedelta(seconds=7.5 * (night_sec / 15.0))
    elif rule == "pradosha":
        # 1 hour after sunset (midpoint of Pradosha window)
        eval_dt = dt_set + timedelta(minutes=60)
    else:
        eval_dt = dt_rise

    eval_jd = datetime_to_jd_utc(eval_dt)
    m_res, _ = swe.calc_ut(eval_jd, swe.MOON, flags)
    s_res, _ = swe.calc_ut(eval_jd, swe.SUN, flags)
    elong = (m_res[0] - s_res[0]) % 360.0
    active_tithi = int(elong / 12.0) % 30

    return active_tithi == target_tithi_idx


# =============================================================================
# DYNAMIC VRAT & FASTING GENERATOR (Ekadashi, Pradosh, Sankashti, Purnima, Amavasya)
# =============================================================================

# Authentic 24 Ekadashis of the Year by Lunar Month & Paksha
EKADASHI_REGISTRY = {
    ("Chaitra", "Shukla"): {"name": "Kamada Ekadashi", "hi": "कामदा एकादशी", "desc": "Fulfills noble desires and bestows spiritual virtue."},
    ("Chaitra", "Krishna"): {"name": "Papmochani Ekadashi", "hi": "पापमोचिनी एकादशी", "desc": "Liberates from sins and bestows inner purification."},
    ("Vaisakha", "Shukla"): {"name": "Mohini Ekadashi", "hi": "मोहिनी एकादशी", "desc": "Dissolves worldly delusion and cleanses accumulated karma."},
    ("Vaisakha", "Krishna"): {"name": "Varuthini Ekadashi", "hi": "वरूथिनी एकादशी", "desc": "Bestows good fortune, protection, and boundless merit."},
    ("Jyeshtha", "Shukla"): {"name": "Nirjala Ekadashi", "hi": "निर्जला एकादशी", "desc": "Grandest Ekadashi observed with strict waterless fast."},
    ("Jyeshtha", "Krishna"): {"name": "Apara Ekadashi", "hi": "अपरा एकादशी", "desc": "Grants limitless fame and wealth."},
    ("Ashadha", "Shukla"): {"name": "Devshayani Ekadashi", "hi": "देवशयनी एकादशी", "desc": "Onset of Chaturmas as Lord Vishnu enters cosmic sleep."},
    ("Ashadha", "Krishna"): {"name": "Yogini Ekadashi", "hi": "योगिनी एकादशी", "desc": "Removes ailments and cleanses negative influences."},
    ("Shravana", "Shukla"): {"name": "Shravana Putrada Ekadashi", "hi": "पुत्रदा एकादशी", "desc": "Bestows worthy progeny, family health, and joy."},
    ("Shravana", "Krishna"): {"name": "Kamika Ekadashi", "hi": "कामिका एकादशी", "desc": "Equal in merit to visiting all sacred pilgrim sites."},
    ("Bhadrapada", "Shukla"): {"name": "Parsva Ekadashi", "hi": "परिवर्तिनी एकादशी", "desc": "Lord Vishnu changes sides in His divine slumber."},
    ("Bhadrapada", "Krishna"): {"name": "Aja Ekadashi", "hi": "अजा एकादशी", "desc": "Restores lost glory and cleanses obstacles."},
    ("Ashwina", "Shukla"): {"name": "Papankusha Ekadashi", "hi": "पापांकुशा एकादशी", "desc": "Acts as an elephant goad against sins and impurities."},
    ("Ashwina", "Krishna"): {"name": "Indira Ekadashi", "hi": "इन्दिरा एकादशी", "desc": "Liberates ancestors (Pitrus) during Pitru Paksha."},
    ("Kartika", "Shukla"): {"name": "Devutthana Ekadashi", "hi": "प्रबोधिनी एकादशी", "desc": "Lord Vishnu awakens; marriage season commences with Tulsi Vivah."},
    ("Kartika", "Krishna"): {"name": "Rama Ekadashi", "hi": "रमा एकादशी", "desc": "Sacred to Goddess Mahalakshmi; bestows prosperity."},
    ("Margashirsha", "Shukla"): {"name": "Mokshada Ekadashi (Gita Jayanti)", "hi": "मोक्षदा एकादशी", "desc": "Bestows final liberation; anniversary of Srimad Bhagavad Gita."},
    ("Margashirsha", "Krishna"): {"name": "Utpanna Ekadashi", "hi": "उत्पन्ना एकादशी", "desc": "Marks the divine origin and advent of Ekadashi Devi."},
    ("Pausha", "Shukla"): {"name": "Pausha Putrada Ekadashi", "hi": "पौष पुत्रदा एकादशी", "desc": "Grants noble children, wisdom, and virtuous life."},
    ("Pausha", "Krishna"): {"name": "Saphala Ekadashi", "hi": "सफला एकादशी", "desc": "Crowns all endeavors with resounding success."},
    ("Magha", "Shukla"): {"name": "Jaya Ekadashi", "hi": "जया एकादशी", "desc": "Grants victory and liberation from lower realms."},
    ("Magha", "Krishna"): {"name": "Shattila Ekadashi", "hi": "षटतिला एकादशी", "desc": "Observance with six types of sesame (Til) donations."},
    ("Phalguna", "Shukla"): {"name": "Amalaki Ekadashi", "hi": "आमलकी एकादशी", "desc": "Worship of the sacred Amla tree and Lord Vishnu."},
    ("Phalguna", "Krishna"): {"name": "Vijaya Ekadashi", "hi": "विजया एकादशी", "desc": "Guarantees victory in complex battles and challenges."},
}


def generate_monthly_vrats_and_fasts(
    year: int,
    month: int,
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    ayanamsha_mode: int = swe.SIDM_LAHIRI
) -> List[Dict[str, Any]]:
    """
    Computes authentic Vrats and Fasting days for the given month using astronomical
    ephemeris positions at local sunrise/sunset:
    - Shukla Ekadashi & Krishna Ekadashi (Udaya Tithi)
    - Pradosh Vrats (Shukla Trayodashi & Krishna Trayodashi at Pradosha)
    - Sankashti Chaturthi (Krishna Chaturthi with moonrise timing)
    - Purnima Vrat & Amavasya
    """
    num_days = calendar.monthrange(year, month)[1]
    vrats: List[Dict[str, Any]] = []

    for day in range(1, num_days + 1):
        cur_date = date(year, month, day)
        adv = calculate_advanced_panchang(
            datetime(year, month, day, 6, 0, 0, tzinfo=timezone.utc),
            lat, lon, altitude_m=0.0, tz_str=tz_str, ayanamsha_mode=ayanamsha_mode
        )
        tithi_data = adv.get("tithi", {})
        t_idx = tithi_data.get("index", 0)
        t_name = tithi_data.get("name_en", "")
        paksha = tithi_data.get("paksha", "Shukla")
        lunar_month = adv.get("lunar_month", {}).get("name_en", "Chaitra")

        # 1. Ekadashi (Tithi 10 = Shukla Ekadashi, Tithi 25 = Krishna Ekadashi)
        if t_idx in (10, 25):
            e_info = EKADASHI_REGISTRY.get((lunar_month, paksha), {
                "name": f"{paksha} Ekadashi",
                "hi": f"{'शुक्ल' if paksha == 'Shukla' else 'कृष्ण'} एकादशी",
                "desc": "Sacred fasting day dedicated to Lord Sri Hari Vishnu."
            })
            vrats.append({
                "id": f"ekadashi-{cur_date.isoformat()}",
                "nameEn": f"{e_info['name']} Vrat",
                "nameHi": f"{e_info['hi']} व्रत",
                "nameSa": "एकादशीव्रतम्",
                "date": cur_date.isoformat(),
                "category": "vrat",
                "regions": ["ALL"],
                "isOfficial": False,
                "isTentative": False,
                "source": "Rashtriya Panchang & Nirnaya Sindhu",
                "observanceRule": "udaya_tithi",
                "descriptionEn": e_info["desc"],
                "descriptionHi": f"भगवान श्री हरि विष्णु को समर्पित परम पावन {e_info['hi']} का उपवास।",
            })

        # 2. Pradosh Vrat (Tithi 12 = Shukla Trayodashi, Tithi 27 = Krishna Trayodashi)
        elif t_idx in (12, 27):
            weekday_name = cur_date.strftime("%A")
            # Soma Pradosh (Mon), Bhauma Pradosh (Tue), Shani Pradosh (Sat) have special reverence
            p_prefix = ""
            p_prefix_hi = ""
            if cur_date.weekday() == 0:
                p_prefix = "Soma "
                p_prefix_hi = "सोम "
            elif cur_date.weekday() == 1:
                p_prefix = "Bhauma "
                p_prefix_hi = "भौम "
            elif cur_date.weekday() == 5:
                p_prefix = "Shani "
                p_prefix_hi = "शनि "

            vrats.append({
                "id": f"pradosh-{cur_date.isoformat()}",
                "nameEn": f"{p_prefix}Pradosh Vrat ({paksha})",
                "nameHi": f"{p_prefix_hi}प्रदोष व्रत ({'शुक्ल' if paksha == 'Shukla' else 'कृष्ण'})",
                "nameSa": "प्रदोषव्रतम्",
                "date": cur_date.isoformat(),
                "category": "vrat",
                "regions": ["ALL"],
                "isOfficial": False,
                "isTentative": False,
                "source": "Rashtriya Panchang",
                "observanceRule": "pradosha",
                "descriptionEn": f"Bi-monthly twilight fast honoring Lord Shiva and Goddess Parvati during Pradosha Kaal on {weekday_name}.",
                "descriptionHi": f"प्रदोष काल में भगवान शिव और माता पार्वती की उपासना का पावन {p_prefix_hi}प्रदोष व्रत।",
            })

        # 3. Sankashti Chaturthi (Krishna Chaturthi = Tithi 18)
        elif t_idx == 18:
            vrats.append({
                "id": f"sankashti-{cur_date.isoformat()}",
                "nameEn": "Sankashti Chaturthi",
                "nameHi": "संकष्टी चतुर्थी व्रत",
                "nameSa": "सङ्कष्टचतुर्थीव्रतम्",
                "date": cur_date.isoformat(),
                "category": "vrat",
                "regions": ["ALL", "MH", "KA", "TN"],
                "isOfficial": False,
                "isTentative": False,
                "source": "Rashtriya Panchang",
                "observanceRule": "nishita",
                "descriptionEn": "Fasting dedicated to Lord Ganesha to remove all distress and obstacles, broken after moonrise.",
                "descriptionHi": "विघ्नहर्ता भगवान गणेश को समर्पित संकट निवारक व्रत, जिसका पारण चन्द्र दर्शन व अर्घ्य के बाद होता है।",
            })

        # 4. Purnima Vrat (Tithi 14)
        elif t_idx == 14:
            vrats.append({
                "id": f"purnima-{cur_date.isoformat()}",
                "nameEn": f"Purnima Vrat ({lunar_month})",
                "nameHi": f"पूर्णिमा व्रत ({adv.get('lunar_month', {}).get('name_hi', 'पूर्णिमा')})",
                "nameSa": "पूर्णिमाव्रतम्",
                "date": cur_date.isoformat(),
                "category": "vrat",
                "regions": ["ALL"],
                "isOfficial": False,
                "isTentative": False,
                "source": "Rashtriya Panchang",
                "observanceRule": "udaya_tithi",
                "descriptionEn": f"Sacred full moon fast and Satyanarayan Puja during {lunar_month} month.",
                "descriptionHi": "सत्यनारायण भगवान की कथा और चन्द्र देव की आराधना का पावन पूर्णिमा व्रत।",
            })

        # 5. Amavasya (Tithi 29)
        elif t_idx == 29:
            vrats.append({
                "id": f"amavasya-{cur_date.isoformat()}",
                "nameEn": f"Amavasya ({lunar_month})",
                "nameHi": f"अमावस्या ({adv.get('lunar_month', {}).get('name_hi', 'अमावस्या')})",
                "nameSa": "दर्शश्राद्धम्",
                "date": cur_date.isoformat(),
                "category": "vrat",
                "regions": ["ALL"],
                "isOfficial": False,
                "isTentative": False,
                "source": "Rashtriya Panchang",
                "observanceRule": "udaya_tithi",
                "descriptionEn": f"New moon day devoted to ancestral offerings (Tarpan), charity, and spiritual remembrance.",
                "descriptionHi": "पितरों के तर्पण, श्राद्ध, दान-पुण्य एवं आध्यात्मिक शुद्धि का पावन दर्श दिवस।",
            })

    return vrats


# =============================================================================
# BANK HOLIDAY ENGINE (2nd & 4th Saturdays, Annual Closing, Public Holidays)
# =============================================================================

def generate_monthly_bank_holidays(year: int, month: int) -> List[Dict[str, Any]]:
    """
    Computes standard banking holidays for India:
    - 2nd Saturday of the month (RBI mandate)
    - 4th Saturday of the month (RBI mandate)
    - 1 April (Annual Bank Account Closing)
    """
    bank_holidays = []
    num_days = calendar.monthrange(year, month)[1]

    # April 1st Annual Closing
    if month == 4:
        bank_holidays.append({
            "id": f"bank-closing-{year}-04-01",
            "nameEn": "Annual Bank Closing",
            "nameHi": "बैंकों की वार्षिक लेखाबन्दी",
            "date": f"{year}-04-01",
            "category": "bank",
            "regions": ["ALL"],
            "isOfficial": True,
            "isTentative": False,
            "source": "Reserve Bank of India (RBI)",
            "descriptionEn": "Annual closing of bank accounts across India under Section 25 of the Negotiable Instruments Act.",
            "descriptionHi": "परक्राम्य लिखत अधिनियम के तहत सम्पूर्ण भारत में बैंकों की वार्षिक खातों की क्लोजिंग।",
        })

    # Track Saturdays
    saturday_count = 0
    for day in range(1, num_days + 1):
        cur_date = date(year, month, day)
        if cur_date.weekday() == 5:  # Saturday
            saturday_count += 1
            if saturday_count in (2, 4):
                ord_suffix = "2nd" if saturday_count == 2 else "4th"
                ord_hi = "द्वितीय" if saturday_count == 2 else "चतुर्थ"
                bank_holidays.append({
                    "id": f"bank-saturday-{cur_date.isoformat()}",
                    "nameEn": f"{ord_suffix} Saturday Bank Holiday",
                    "nameHi": f"{ord_hi} शनिवार बैंक अवकाश",
                    "date": cur_date.isoformat(),
                    "category": "bank",
                    "regions": ["ALL"],
                    "isOfficial": True,
                    "isTentative": False,
                    "source": "Reserve Bank of India (RBI Mandate)",
                    "descriptionEn": f"Statutory banking holiday on the {ord_suffix} Saturday of every calendar month.",
                    "descriptionHi": f"भारतीय रिज़र्व बैंक के निर्देशानुसार प्रत्येक माह के {ord_hi} शनिवार को अनिवार्य बैंक अवकाश।",
                })

    return bank_holidays


# =============================================================================
# UNIFIED HOLIDAY QUERY SERVICE
# =============================================================================

def get_holidays_and_festivals(
    year: Optional[int] = None,
    month: Optional[int] = None,
    category: Optional[str] = None,
    region: Optional[str] = None,
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    include_vrats: bool = True,
    include_bank_holidays: bool = True,
) -> List[Dict[str, Any]]:
    """
    Returns filtered holiday and festival records matching criteria:
    - year / month
    - category: national | gazetted | restricted | state | religious | vrat | bank
    - region: ALL, DL, MH, TN, KA, WB, etc.
    """
    target_year = year or date.today().year

    # 1. Start with static/gazetted holidays registry
    all_holidays = [h for h in STATIC_HOLIDAYS_REGISTRY if h["date"].startswith(str(target_year))]

    # 2. Add dynamic monthly Vrats and Bank Holidays
    months_to_scan = [month] if month is not None else list(range(1, 13))

    for m in months_to_scan:
        if include_bank_holidays:
            all_holidays.extend(generate_monthly_bank_holidays(target_year, m))
        if include_vrats:
            all_holidays.extend(generate_monthly_vrats_and_fasts(target_year, m, lat, lon, tz_str))

    # 3. Apply filters
    filtered: List[Dict[str, Any]] = []
    reg_upper = region.upper() if region else None

    for h in all_holidays:
        # Month filter
        if month is not None:
            if int(h["date"].split("-")[1]) != month:
                continue

        # Category filter
        if category:
            cat_lower = category.lower()
            if cat_lower == "religious":
                # Religious includes festivals in gazetted, restricted, state that are religious, plus vrat
                if h["category"] not in ("religious", "gazetted", "restricted", "vrat") or not h.get("nameSa"):
                    if h["category"] != "religious":
                        continue
            elif h["category"] != cat_lower:
                continue

        # Region filter
        if reg_upper and reg_upper != "ALL":
            h_regs = h.get("regions", ["ALL"])
            if "ALL" not in h_regs and reg_upper not in h_regs:
                continue

        filtered.append(h)

    # Sort chronologically by date then id
    filtered.sort(key=lambda x: (x["date"], x["id"]))

    # Normalize fields to guarantee both camelCase and snake_case accessibility
    normalized: List[Dict[str, Any]] = []
    for h in filtered:
        norm = dict(h)
        norm["name"] = h.get("nameEn") or h.get("name")
        norm["name_hi"] = h.get("nameHi") or h.get("name_hi")
        norm["name_sa"] = h.get("nameSa") or h.get("name_sa")
        norm["is_official"] = h.get("isOfficial") if "isOfficial" in h else h.get("is_official", True)
        norm["is_tentative"] = h.get("isTentative") if "isTentative" in h else h.get("is_tentative", False)
        norm["observance_rule"] = h.get("observanceRule") or h.get("observance_rule")
        norm["description"] = h.get("descriptionEn") or h.get("description")
        norm["description_hi"] = h.get("descriptionHi") or h.get("description_hi")
        normalized.append(norm)

    return normalized


# =============================================================================
# HIGH-PERFORMANCE 2D/3D CALENDAR MONTH COMPOSITE SERVICE
# =============================================================================

def calculate_calendar_month(
    year: int,
    month: int,
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    month_convention: str = "amanta",
    region: Optional[str] = "ALL",
) -> Dict[str, Any]:
    """
    Combines daily dates, 5-Anga Panchang, Moon Rashi, festivals, holidays, and lunar
    phases into a high-performance payload for frontend grid rendering.
    """
    num_days = calendar.monthrange(year, month)[1]
    holidays = get_holidays_and_festivals(
        year=year, month=month, region=region, lat=lat, lon=lon, tz_str=tz_str
    )

    # Group holidays by date YYYY-MM-DD
    holidays_by_date: Dict[str, List[Dict[str, Any]]] = {}
    for h in holidays:
        d_str = h["date"]
        if d_str not in holidays_by_date:
            holidays_by_date[d_str] = []
        holidays_by_date[d_str].append(h)

    days_payload: List[Dict[str, Any]] = []

    for day in range(1, num_days + 1):
        cur_date = date(year, month, day)
        date_str = cur_date.isoformat()

        # Query panchang at sunrise for authoritative Vedic day parameters
        dt_query = datetime(year, month, day, 6, 0, 0, tzinfo=timezone.utc)
        panchang = calculate_advanced_panchang(
            dt_query, lat, lon, altitude_m=0.0, tz_str=tz_str, month_convention=month_convention
        )

        tithi = panchang.get("tithi", {})
        nakshatra = panchang.get("nakshatra", {})
        moon_rashi = panchang.get("moon_rashi", {})
        celestial = panchang.get("celestial", {})
        lunar_month = panchang.get("lunar_month", {})
        moon_phase = celestial.get("moon_phase", {})

        day_holidays = holidays_by_date.get(date_str, [])
        is_gazetted = any(h.get("category") == "gazetted" for h in day_holidays)
        is_national = any(h.get("category") == "national" for h in day_holidays)
        is_bank_holiday = any(h.get("category") == "bank" for h in day_holidays) or cur_date.weekday() == 6

        days_payload.append({
            "date": date_str,
            "day": day,
            "day_of_week": cur_date.weekday(),  # 0=Monday, 6=Sunday
            "weekday_name": cur_date.strftime("%a"),
            "weekday_full": cur_date.strftime("%A"),
            "tithi_index": tithi.get("index", 0),
            "tithi_name": tithi.get("name_en", ""),
            "tithi_name_hi": tithi.get("name_hi", ""),
            "paksha": tithi.get("paksha", "Shukla"),
            "tithi_end_iso": tithi.get("end_time_iso"),
            "nakshatra_name": nakshatra.get("name_en", ""),
            "nakshatra_name_hi": nakshatra.get("name_hi", ""),
            "nakshatra_lord": nakshatra.get("lord", ""),
            "moon_rashi": moon_rashi.get("rashi_en", ""),
            "moon_rashi_hi": moon_rashi.get("rashi_hi", ""),
            "moon_rashi_index": moon_rashi.get("sign_index", 0),
            "sunrise": celestial.get("sunrise_formatted", ""),
            "sunset": celestial.get("sunset_formatted", ""),
            "moonrise": celestial.get("moonrise_formatted", ""),
            "lunar_phase": moon_phase.get("name", ""),
            "illumination_pct": moon_phase.get("illumination_pct", 50.0),
            "lunar_month_name": lunar_month.get("name_en", ""),
            "lunar_month_name_hi": lunar_month.get("name_hi", ""),
            "vikram_samvat": lunar_month.get("vikram_samvat", 2083),
            "shaka_samvat": lunar_month.get("shaka_samvat", 1948),
            "holidays": day_holidays,
            "is_national_holiday": is_national,
            "is_gazetted_holiday": is_gazetted,
            "is_bank_holiday": is_bank_holiday,
            "has_events": len(day_holidays) > 0,
        })

    return {
        "year": year,
        "month": month,
        "month_name": date(year, month, 1).strftime("%B"),
        "total_days": num_days,
        "convention": month_convention,
        "region": region,
        "total_holidays": len(holidays),
        "days": days_payload,
    }
