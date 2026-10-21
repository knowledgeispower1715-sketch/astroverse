"""
Ashtakoota 36-Guna Kundli Matchmaking Engine (Parashari System):
1. Varna (1 Point): Spiritual ego and work inclination
2. Vashya (2 Points): Mutual dominance & respect
3. Tara (3 Points): Destiny, health & longevity
4. Yoni (4 Points): Biological & sexual affinity
5. Graha Maitri (5 Points): Psychological friendship & mental wave
6. Gana (6 Points): Temperament (Deva, Manushya, Rakshasa)
7. Bhakoot (7 Points): Family welfare, emotional bonding & progeny
8. Nadi (8 Points): Genetic compatibility & health
Total = 36 Gunas (18+ considered acceptable, 28+ highly auspicious)
"""

"""
Ashtakoota 36-Guna Kundli Matchmaking Engine (Parashari System):
1. Varna (1 Point): Spiritual ego and work inclination
2. Vashya (2 Points): Mutual dominance & respect
3. Tara (3 Points): Destiny, health & longevity
4. Yoni (4 Points): Biological & sexual affinity
5. Graha Maitri (5 Points): Psychological friendship & mental wave
6. Gana (6 Points): Temperament (Deva, Manushya, Rakshasa)
7. Bhakoot (7 Points): Family welfare, emotional bonding & progeny
8. Nadi (8 Points): Genetic compatibility & health
Total = 36 Gunas (18+ considered acceptable, 28+ highly auspicious)
"""

from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

# 27 Nakshatras list
NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

# 12 Signs list
SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# 1. Varna Mapping (Rank: Brahmin=4, Kshatriya=3, Vaishya=2, Shudra=1)
# Brahmin: Cancer(3), Scorpio(7), Pisces(11)
# Kshatriya: Aries(0), Leo(4), Sagittarius(8)
# Vaishya: Taurus(1), Virgo(5), Capricorn(9)
# Shudra: Gemini(2), Libra(6), Aquarius(10)
VARNA_NAMES = {4: "Brahmin (Spiritual / Intellectual)", 3: "Kshatriya (Administrative / Leadership)", 2: "Vaishya (Commercial / Pragmatic)", 1: "Shudra (Service / Collaborative)"}

def get_varna(sign_idx: int) -> int:
    if sign_idx in [3, 7, 11]:
        return 4 # Brahmin
    elif sign_idx in [0, 4, 8]:
        return 3 # Kshatriya
    elif sign_idx in [1, 5, 9]:
        return 2 # Vaishya
    else:
        return 1 # Shudra

def calculate_varna(boy_sign: int, girl_sign: int) -> float:
    boy_v = get_varna(boy_sign)
    girl_v = get_varna(girl_sign)
    return 1.0 if boy_v >= girl_v else 0.0

# 2. Vashya Mapping
# Chatushpada (0): Aries(0), Taurus(1), Sagi 2nd half (8.5), Cap 1st half (9.0)
# Manava (1): Gemini(2), Virgo(5), Libra(6), Aqua(10), Sagi 1st half (8.0)
# Jalachara (2): Cancer(3), Pisces(11), Cap 2nd half (9.5)
# Vanachara (3): Leo(4)
# Keeta (4): Scorpio(7)
VASHYA_NAMES = ["Chatushpada (Quadruped)", "Manava (Human)", "Jalachara (Water)", "Vanachara (Lion/Wild)", "Keeta (Insect)"]

def get_vashya(sign_idx: int) -> int:
    if sign_idx in [0, 1]:
        return 0 # Quadruped
    elif sign_idx in [2, 5, 6, 8, 10]:
        return 1 # Human
    elif sign_idx in [3, 9, 11]:
        return 2 # Water
    elif sign_idx == 4:
        return 3 # Lion/Wild
    else:
        return 4 # Insect

VASHYA_MATRIX = [
    # 0:Quad, 1:Man, 2:Water, 3:Wild, 4:Insect
    [2.0, 1.0, 1.0, 0.0, 1.0],  # Quadruped
    [1.0, 2.0, 0.5, 0.0, 1.0],  # Human
    [1.0, 0.5, 2.0, 0.0, 1.0],  # Water
    [0.0, 0.0, 0.0, 2.0, 0.0],  # Wild Lion
    [1.0, 1.0, 1.0, 0.0, 2.0]   # Insect
]

def calculate_vashya(boy_sign: int, girl_sign: int) -> float:
    bv = get_vashya(boy_sign)
    gv = get_vashya(girl_sign)
    return VASHYA_MATRIX[bv][gv]

# 3. Tara Calculation
TARA_NAMES = [
    "Janma (Birth)", "Sampat (Prosperity)", "Vipat (Danger)",
    "Kshema (Well-being)", "Pratyak (Obstacle)", "Sadhana (Success)",
    "Naidhana (Destruction)", "Mitra (Friend)", "Parama Mitra (Intimate)"
]

def calculate_tara(boy_nak: int, girl_nak: int) -> float:
    t1 = ((boy_nak - girl_nak) % 9) + 1
    t2 = ((girl_nak - boy_nak) % 9) + 1
    inauspicious = [3, 5, 7] # Vipat, Pratyak, Naidhana
    t1_good = t1 not in inauspicious
    t2_good = t2 not in inauspicious
    if t1_good and t2_good:
        return 3.0
    elif t1_good or t2_good:
        return 1.5
    else:
        return 0.0

# 4. Yoni Mapping (14 animal classifications)
YONI_ANIMAL_NAMES = [
    "Horse (Ashwini, Shatabhisha)", "Elephant (Bharani, Revati)", "Sheep (Krittika, Pushya)",
    "Serpent (Rohini, Mrigashira)", "Dog (Ardra, Mula)", "Cat (Punarvasu, Ashlesha)",
    "Rat (Magha, Purva Phalguni)", "Cow (Uttara Phalguni, Uttara Bhadrapada)", "Buffalo (Hasta, Swati)",
    "Tiger (Chitra, Vishakha)", "Hare (Anuradha, Jyeshtha)", "Monkey (Purva Ashadha, Shravana)",
    "Mongoose (Uttara Ashadha)", "Lion (Dhanishta, Purva Bhadrapada)"
]

YONI_ANIMALS = [
    0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10,
    11, 11, 12, 11, 13, 0, 13, 7, 1
]
# 0:Horse, 1:Elephant, 2:Sheep, 3:Serpent, 4:Dog, 5:Cat, 6:Rat, 7:Cow,
# 8:Buffalo, 9:Tiger, 10:Hare, 11:Monkey, 12:Mongoose, 13:Lion
ENEMIES = {
    0: 8,  8: 0,   # Horse vs Buffalo
    1: 13, 13: 1,  # Elephant vs Lion
    2: 11, 11: 2,  # Sheep vs Monkey
    3: 12, 12: 3,  # Serpent vs Mongoose
    4: 10, 10: 4,  # Dog vs Hare
    5: 6,  6: 5,   # Cat vs Rat
    7: 9,  9: 7    # Cow vs Tiger
}

def calculate_yoni(boy_nak: int, girl_nak: int) -> float:
    by = YONI_ANIMALS[boy_nak]
    gy = YONI_ANIMALS[girl_nak]
    if by == gy:
        return 4.0
    if ENEMIES.get(by) == gy:
        return 0.0
    # Friendly / Neutral
    return 3.0 if abs(by - gy) in [1, 2, 4] else 2.0

# 5. Graha Maitri (Lord Friendship)
SIGN_LORDS = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
]

PLANET_FRIENDS = {
    "Sun":     {"friends": ["Moon", "Mars", "Jupiter"], "neutrals": ["Mercury"], "enemies": ["Venus", "Saturn"]},
    "Moon":    {"friends": ["Sun", "Mercury"], "neutrals": ["Mars", "Jupiter", "Venus", "Saturn"], "enemies": []},
    "Mars":    {"friends": ["Sun", "Moon", "Jupiter"], "neutrals": ["Venus", "Saturn"], "enemies": ["Mercury"]},
    "Mercury": {"friends": ["Sun", "Venus"], "neutrals": ["Mars", "Jupiter", "Saturn"], "enemies": ["Moon"]},
    "Jupiter": {"friends": ["Sun", "Moon", "Mars"], "neutrals": ["Saturn"], "enemies": ["Mercury", "Venus"]},
    "Venus":   {"friends": ["Mercury", "Saturn"], "neutrals": ["Mars", "Jupiter"], "enemies": ["Sun", "Moon"]},
    "Saturn":  {"friends": ["Mercury", "Venus"], "neutrals": ["Jupiter"], "enemies": ["Sun", "Moon", "Mars"]}
}

def get_relation(p1: str, p2: str) -> str:
    if p1 == p2:
        return "friend"
    f = PLANET_FRIENDS[p1]
    if p2 in f["friends"]:
        return "friend"
    elif p2 in f["neutrals"]:
        return "neutral"
    else:
        return "enemy"

def calculate_graha_maitri(boy_sign: int, girl_sign: int) -> float:
    b_lord = SIGN_LORDS[boy_sign]
    g_lord = SIGN_LORDS[girl_sign]
    if b_lord == g_lord:
        return 5.0
    r1 = get_relation(b_lord, g_lord)
    r2 = get_relation(g_lord, b_lord)
    
    if r1 == "friend" and r2 == "friend":
        return 5.0
    elif (r1 == "friend" and r2 == "neutral") or (r2 == "friend" and r1 == "neutral"):
        return 4.0
    elif r1 == "neutral" and r2 == "neutral":
        return 3.0
    elif (r1 == "friend" and r2 == "enemy") or (r2 == "friend" and r1 == "enemy"):
        return 1.0
    elif (r1 == "neutral" and r2 == "enemy") or (r2 == "neutral" and r1 == "enemy"):
        return 0.5
    else:
        return 0.0

# 6. Gana Mapping (Deva=0, Manushya=1, Rakshasa=2)
GANA_NAMES = ["Deva (Divine / Gentle)", "Manushya (Human / Pragmatic)", "Rakshasa (Fierce / Assertive)"]
GANA_MAP = [
    0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0
]

def calculate_gana(boy_nak: int, girl_nak: int) -> float:
    bg = GANA_MAP[boy_nak]
    gg = GANA_MAP[girl_nak]
    if bg == gg:
        return 6.0
    if (bg == 0 and gg == 1) or (bg == 1 and gg == 0):
        return 5.0
    if (bg == 0 and gg == 2):
        return 1.0
    if (bg == 2 and gg == 0) or (bg == 1 and gg == 2) or (bg == 2 and gg == 1):
        return 0.0
    return 0.0

# 7. Bhakoot
def calculate_bhakoot(boy_sign: int, girl_sign: int) -> float:
    diff = ((boy_sign - girl_sign) % 12) + 1
    # Dosha pairs: 2/12, 6/8, 9/5
    if diff in [2, 12]:
        # Cancelled if same lord (Capricorn & Aquarius ruled by Saturn)
        if SIGN_LORDS[boy_sign] == SIGN_LORDS[girl_sign]:
            return 7.0
        return 0.0
    elif diff in [6, 8]:
        # Cancelled if same lord (Aries/Scorpio, Taurus/Libra)
        if SIGN_LORDS[boy_sign] == SIGN_LORDS[girl_sign]:
            return 7.0
        return 0.0
    elif diff in [5, 9]:
        # Cancelled if mutual friends
        b_lord = SIGN_LORDS[boy_sign]
        g_lord = SIGN_LORDS[girl_sign]
        if get_relation(b_lord, g_lord) == "friend" and get_relation(g_lord, b_lord) == "friend":
            return 7.0
        return 0.0
    else:
        return 7.0

def calculate_bhakoot_detailed(boy_sign: int, girl_sign: int) -> Tuple[float, bool, bool, Optional[str]]:
    """
    Returns (obtained_points, has_dosha, is_cancelled, explanation).
    Max points = 7.0.
    """
    diff = ((boy_sign - girl_sign) % 12) + 1
    if diff in [2, 12]:
        if SIGN_LORDS[boy_sign] == SIGN_LORDS[girl_sign]:
            return 7.0, False, True, f"Cancelled: 2/12 Bhakoot relationship shares the same planetary lord ({SIGN_LORDS[boy_sign]})."
        return 0.0, True, False, "Active 2/12 (Dwi-Dwadash) Bhakoot Dosha (Potential financial and spatial divergence)."
    elif diff in [6, 8]:
        if SIGN_LORDS[boy_sign] == SIGN_LORDS[girl_sign]:
            return 7.0, False, True, f"Cancelled: 6/8 Bhakoot relationship shares the same planetary lord ({SIGN_LORDS[boy_sign]})."
        return 0.0, True, False, "Active 6/8 (Shad-Ashtak) Bhakoot Dosha (Frictional alignment & health vulnerability)."
    elif diff in [5, 9]:
        b_lord = SIGN_LORDS[boy_sign]
        g_lord = SIGN_LORDS[girl_sign]
        if get_relation(b_lord, g_lord) == "friend" and get_relation(g_lord, b_lord) == "friend":
            return 7.0, False, True, f"Cancelled: 9/5 Bhakoot relationship governed by mutual friends ({b_lord} & {g_lord})."
        return 0.0, True, False, "Active 9/5 (Nava-Pancham) Bhakoot Dosha (Temperament and progeny delays)."
    else:
        return 7.0, False, False, f"Harmonious {diff}/{(14 - diff) % 12 or 12} Bhakoot positioning."

# 8. Nadi Mapping (0:Adi, 1:Madhya, 2:Antya)
NADI_NAMES = ["Adi (Vata)", "Madhya (Pitta)", "Antya (Kapha)"]
NADI_MAP = [
    0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2
]

def calculate_nadi(boy_nak: int, girl_nak: int) -> tuple[float, bool]:
    bn = NADI_MAP[boy_nak]
    gn = NADI_MAP[girl_nak]
    if bn != gn:
        return 8.0, False
    # Same Nadi => Nadi Dosha unless cancelled
    return 0.0, True

def calculate_nadi_with_exceptions(
    boy_nak: int, girl_nak: int,
    boy_sign: int, girl_sign: int,
    boy_pada: int = 1, girl_pada: int = 1
) -> Tuple[float, bool, bool, Optional[str]]:
    """
    Computes Nadi points (8 max) with classical shastric exception/cancellation rules:
    - Same Rashi, Different Nakshatras -> Cancelled
    - Different Rashis, Same Nakshatra (boundary Nakshatras) -> Cancelled
    - Same Nakshatra and Rashi, but different Padas -> Cancelled / Mitigated
    """
    bn = NADI_MAP[boy_nak]
    gn = NADI_MAP[girl_nak]
    if bn != gn:
        return 8.0, False, False, None

    # Exception 1: Same Rashi, Different Nakshatras
    if boy_sign == girl_sign and boy_nak != girl_nak:
        return 8.0, False, True, "Cancelled: Both partners share the same Rashi but have different Nakshatras (Shastric exemption)."

    # Exception 2: Same Nakshatra, Different Rashis (straddling sign boundary)
    if boy_nak == girl_nak and boy_sign != girl_sign:
        return 8.0, False, True, f"Cancelled: {NAKSHATRAS[boy_nak]} spans across different Rashi signs ({SIGNS[boy_sign]} vs {SIGNS[girl_sign]})."

    # Exception 3: Same Nakshatra and same Rashi, but different Padas
    if boy_nak == girl_nak and boy_sign == girl_sign and boy_pada != girl_pada:
        exempt_naks = [3, 4, 5, 7, 9, 11, 12, 14, 16, 19, 25, 26]
        if boy_nak in exempt_naks:
            return 8.0, False, True, f"Cancelled: Different Padas (Boy Pada {boy_pada}, Girl Pada {girl_pada}) in recognized Nakshatra {NAKSHATRAS[boy_nak]}."
        else:
            return 8.0, False, True, f"Mitigated: Same Nakshatra ({NAKSHATRAS[boy_nak]}) with different Padas ({boy_pada} vs {girl_pada})."

    return 0.0, True, False, f"Active {NADI_NAMES[bn]} Nadi Dosha present without classical exemption."

def match_kundli_36_gunas(boy_moon_deg: float, girl_moon_deg: float):
    boy_sign = int(boy_moon_deg / 30.0) % 12
    girl_sign = int(girl_moon_deg / 30.0) % 12
    boy_nak = int(boy_moon_deg / (360.0 / 27.0)) % 27
    girl_nak = int(girl_moon_deg / (360.0 / 27.0)) % 27

    varna = calculate_varna(boy_sign, girl_sign)
    vashya = calculate_vashya(boy_sign, girl_sign)
    tara = calculate_tara(boy_nak, girl_nak)
    yoni = calculate_yoni(boy_nak, girl_nak)
    maitri = calculate_graha_maitri(boy_sign, girl_sign)
    gana = calculate_gana(boy_nak, girl_nak)
    bhakoot = calculate_bhakoot(boy_sign, girl_sign)
    nadi, has_nadi_dosha = calculate_nadi(boy_nak, girl_nak)

    total_gunas = varna + vashya + tara + yoni + maitri + gana + bhakoot + nadi

    if total_gunas >= 28:
        verdict = "Highly Auspicious Match — Blessed Marital Longevity & Prosperity"
    elif total_gunas >= 18:
        verdict = "Good Compatibility — Recommended with Remedial Alignment"
    else:
        verdict = "Below Threshold (<18) — Classical Astrological Remedies Suggested"

    return {
        "total_score": round(total_gunas, 1),
        "max_score": 36,
        "verdict": verdict,
        "boy_info": {"sign": SIGNS[boy_sign], "nakshatra": NAKSHATRAS[boy_nak]},
        "girl_info": {"sign": SIGNS[girl_sign], "nakshatra": NAKSHATRAS[girl_nak]},
        "breakdown": {
            "varna": {"obtained": varna, "max": 1, "description": "Spiritual ego & work alignment"},
            "vashya": {"obtained": vashya, "max": 2, "description": "Mutual respect & domestic control"},
            "tara": {"obtained": tara, "max": 3, "description": "Health, destiny & longevity of bond"},
            "yoni": {"obtained": yoni, "max": 4, "description": "Biological & physical harmony"},
            "graha_maitri": {"obtained": maitri, "max": 5, "description": "Psychological friendship & intellect"},
            "gana": {"obtained": gana, "max": 6, "description": "Behavioral temperament & social outlook"},
            "bhakoot": {"obtained": bhakoot, "max": 7, "description": "Family welfare & emotional bonding", "has_dosha": bhakoot == 0},
            "nadi": {"obtained": nadi, "max": 8, "description": "Traditional physiological temperament & hereditary harmony", "has_dosha": has_nadi_dosha}
        }
    }

def calculate_full_kundli_milan(boy_profile: Dict[str, Any], girl_profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Comprehensive Dual-Profile Kundli Milan:
    1. Validates full birth details (date, time, lat, lon, timezone) for both individuals independently.
    2. Calculates independent Swiss Ephemeris charts (Lagna, Moon, planetary positions).
    3. Computes all 8 Ashtakoota factors (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi)
       with rule explanations and classical dosha cancellation exceptions (Nadi & Bhakoot).
    4. Computes supplementary comprehensive compatibility report:
       - 7th House & 7th Lord dignity for both
       - Navamsha (D9) Chart synastry
       - Manglik Dosha evaluation & cross-cancellation (Mars cancels Mars)
       - Vimshottari Dasha timing alignment
       - Jaimini Darakaraka (DK) analysis
       - Honest epistemic limitations disclosure
    """
    from ephemeris import calculate_kundli
    from divisional_charts import calculate_navamsha
    from doshas_and_remedies import analyze_doshas_and_remedies
    from dasha_engine import calculate_vimshottari_dasha
    from jaimini_engine import calculate_chara_karakas

    def _validate_profile(p: Dict[str, Any], label: str):
        if not p:
            raise ValueError(f"{label} birth profile is required.")
        dob = p.get("dob")
        if not dob:
            raise ValueError(f"{label} date and time of birth (dob) is required.")
        try:
            clean_dob = dob.replace("Z", "").replace(" ", "T")
            dt = datetime.fromisoformat(clean_dob)
        except Exception:
            raise ValueError(f"Invalid {label} birth datetime format '{dob}'. Expected ISO format YYYY-MM-DDTHH:MM:SS.")

        lat = p.get("lat")
        lon = p.get("lon")
        if lat is None or not (-90.0 <= float(lat) <= 90.0):
            raise ValueError(f"Invalid {label} latitude '{lat}'. Must be between -90.0 and 90.0.")
        if lon is None or not (-180.0 <= float(lon) <= 180.0):
            raise ValueError(f"Invalid {label} longitude '{lon}'. Must be between -180.0 and 180.0.")

        tz_str = p.get("timezone", "Asia/Kolkata")
        if ZoneInfo is not None:
            try:
                ZoneInfo(tz_str)
            except Exception:
                tz_str = "Asia/Kolkata"
        return clean_dob, dt, float(lat), float(lon), tz_str, p.get("name", label)

    b_dob_str, b_dt, b_lat, b_lon, b_tz, b_name = _validate_profile(boy_profile, "Boy")
    g_dob_str, g_dt, g_lat, g_lon, g_tz, g_name = _validate_profile(girl_profile, "Girl")

    # 1. Calculate authoritative Swiss Ephemeris charts independently
    boy_kundli = calculate_kundli(b_dob_str, b_lat, b_lon, b_tz)
    girl_kundli = calculate_kundli(g_dob_str, g_lat, g_lon, g_tz)

    boy_moon = boy_kundli["planets"]["Moon"]
    girl_moon = girl_kundli["planets"]["Moon"]

    boy_sign_idx = SIGNS.index(boy_moon["sign"])
    girl_sign_idx = SIGNS.index(girl_moon["sign"])

    boy_moon_deg = (boy_sign_idx * 30.0) + boy_moon["degree"]
    girl_moon_deg = (girl_sign_idx * 30.0) + girl_moon["degree"]

    nak_span = 360.0 / 27.0
    boy_nak_idx = int(boy_moon_deg / nak_span) % 27
    girl_nak_idx = int(girl_moon_deg / nak_span) % 27

    boy_pada = boy_moon.get("pada", (int((boy_moon_deg % nak_span) / (nak_span / 4.0)) + 1))
    girl_pada = girl_moon.get("pada", (int((girl_moon_deg % nak_span) / (nak_span / 4.0)) + 1))

    # 2. Ashtakoota 8-fold calculation with classical cancellations
    # 1. Varna (1 Point)
    varna_pts = calculate_varna(boy_sign_idx, girl_sign_idx)
    boy_v_rank = get_varna(boy_sign_idx)
    girl_v_rank = get_varna(girl_sign_idx)

    # 2. Vashya (2 Points)
    vashya_pts = calculate_vashya(boy_sign_idx, girl_sign_idx)
    boy_vash_idx = get_vashya(boy_sign_idx)
    girl_vash_idx = get_vashya(girl_sign_idx)

    # 3. Tara (3 Points)
    tara_pts = calculate_tara(boy_nak_idx, girl_nak_idx)
    t1_num = ((boy_nak_idx - girl_nak_idx) % 9) + 1
    t2_num = ((girl_nak_idx - boy_nak_idx) % 9) + 1

    # 4. Yoni (4 Points)
    yoni_pts = calculate_yoni(boy_nak_idx, girl_nak_idx)
    boy_y_idx = YONI_ANIMALS[boy_nak_idx]
    girl_y_idx = YONI_ANIMALS[girl_nak_idx]

    # 5. Graha Maitri (5 Points)
    maitri_pts = calculate_graha_maitri(boy_sign_idx, girl_sign_idx)
    boy_lord = SIGN_LORDS[boy_sign_idx]
    girl_lord = SIGN_LORDS[girl_sign_idx]

    # 6. Gana (6 Points)
    gana_pts = calculate_gana(boy_nak_idx, girl_nak_idx)
    boy_g_idx = GANA_MAP[boy_nak_idx]
    girl_g_idx = GANA_MAP[girl_nak_idx]

    # 7. Bhakoot (7 Points) with Detailed Cancellations
    bhakoot_pts, has_bhakoot_dosha, bhakoot_cancelled, bhakoot_reason = calculate_bhakoot_detailed(boy_sign_idx, girl_sign_idx)

    # 8. Nadi (8 Points) with Classical Exceptions
    nadi_pts, has_nadi_dosha, nadi_cancelled, nadi_reason = calculate_nadi_with_exceptions(
        boy_nak_idx, girl_nak_idx, boy_sign_idx, girl_sign_idx, boy_pada, girl_pada
    )

    total_gunas = varna_pts + vashya_pts + tara_pts + yoni_pts + maitri_pts + gana_pts + bhakoot_pts + nadi_pts

    if total_gunas >= 28:
        verdict = "Highly Auspicious Match — Blessed Marital Longevity & Prosperity"
        recommendation = "Optimal classical compatibility. The core psychological, physical, and spiritual foundations align harmoniously."
    elif total_gunas >= 18:
        verdict = "Good Compatibility — Recommended with Remedial Alignment"
        recommendation = "Satisfactory compatibility above the classical threshold (18/36). Minor remedial alignment supports enduring marital ease."
    else:
        verdict = "Below Threshold (<18) — Classical Astrological Remedies Suggested"
        recommendation = "The Ashtakoota score is below the traditional 18-point threshold. A deeper inspection of the 7th houses, D9 Navamsha, and mutual Dasha timing is strongly recommended before marriage solemnization."

    kootas_breakdown = {
        "varna": {
            "name": "1. Varna (Spiritual Ego & Work Alignment)",
            "obtained": varna_pts,
            "max": 1.0,
            "boy_attribute": VARNA_NAMES[boy_v_rank],
            "girl_attribute": VARNA_NAMES[girl_v_rank],
            "rule": "Boy's spiritual ego must be equal to or higher in rank than Girl's for harmonious domestic balance.",
            "description": "High spiritual alignment and mutual respect" if varna_pts == 1.0 else "Girl's spiritual temperament holds greater authority",
            "has_dosha": False
        },
        "vashya": {
            "name": "2. Vashya (Mutual Dominance & Respect)",
            "obtained": vashya_pts,
            "max": 2.0,
            "boy_attribute": VASHYA_NAMES[boy_vash_idx],
            "girl_attribute": VASHYA_NAMES[girl_vash_idx],
            "rule": "Evaluates domestic power balance and natural mutual deference.",
            "description": f"Mutual accommodation between {VASHYA_NAMES[boy_vash_idx].split(' ')[0]} and {VASHYA_NAMES[girl_vash_idx].split(' ')[0]}",
            "has_dosha": False
        },
        "tara": {
            "name": "3. Tara (Dina / Destiny & Health)",
            "obtained": tara_pts,
            "max": 3.0,
            "boy_attribute": f"{NAKSHATRAS[boy_nak_idx]} -> Tara {t1_num} ({TARA_NAMES[t1_num - 1]})",
            "girl_attribute": f"{NAKSHATRAS[girl_nak_idx]} -> Tara {t2_num} ({TARA_NAMES[t2_num - 1]})",
            "rule": "Nakshatra counting modulo 9 must avoid inauspicious 3 (Vipat), 5 (Pratyak), and 7 (Naidhana) Taras.",
            "description": "Destiny and vitality align favorably" if tara_pts >= 1.5 else "Karmic friction indicates health sensitivity",
            "has_dosha": tara_pts == 0.0
        },
        "yoni": {
            "name": "4. Yoni (Biological & Physical Harmony)",
            "obtained": yoni_pts,
            "max": 4.0,
            "boy_attribute": YONI_ANIMAL_NAMES[boy_y_idx],
            "girl_attribute": YONI_ANIMAL_NAMES[girl_y_idx],
            "rule": "14 animal archetypes determine intimate biological affinity and avoid natural sworn enemies.",
            "description": "Natural biological harmony" if yoni_pts >= 2.0 else "Incompatible animal archetypes indicate intimate friction",
            "has_dosha": yoni_pts == 0.0
        },
        "graha_maitri": {
            "name": "5. Graha Maitri (Psychological Friendship & Intellect)",
            "obtained": maitri_pts,
            "max": 5.0,
            "boy_attribute": f"{boy_lord} (Ruler of {SIGNS[boy_sign_idx]})",
            "girl_attribute": f"{girl_lord} (Ruler of {SIGNS[girl_sign_idx]})",
            "rule": "Moon sign lords must be mutual friends or the same planet for emotional and intellectual resonance.",
            "description": "Strong mental wave and intellectual bonding" if maitri_pts >= 3.0 else "Different mental outlooks require conscious communication",
            "has_dosha": maitri_pts < 3.0
        },
        "gana": {
            "name": "6. Gana (Temperament & Social Outlook)",
            "obtained": gana_pts,
            "max": 6.0,
            "boy_attribute": GANA_NAMES[boy_g_idx],
            "girl_attribute": GANA_NAMES[girl_g_idx],
            "rule": "Temperament categorized into Deva (gentle), Manushya (human), and Rakshasa (fierce).",
            "description": "Temperaments harmonize smoothly" if gana_pts >= 5.0 else ("Moderate temperament compromise" if gana_pts > 0 else "Gana mismatch creates behavioral clashes"),
            "has_dosha": gana_pts == 0.0
        },
        "bhakoot": {
            "name": "7. Bhakoot (Family Welfare & Emotional Bonding)",
            "obtained": bhakoot_pts,
            "max": 7.0,
            "boy_attribute": f"{SIGNS[boy_sign_idx]} (Lord: {boy_lord})",
            "girl_attribute": f"{SIGNS[girl_sign_idx]} (Lord: {girl_lord})",
            "rule": "Relative Rashi distance 2/12, 6/8, and 9/5 cause Bhakoot Dosha unless cancelled by identical sign lord or mutual planetary friendship.",
            "description": bhakoot_reason,
            "has_dosha": has_bhakoot_dosha,
            "is_cancelled": bhakoot_cancelled
        },
        "nadi": {
            "name": "8. Nadi (Genetic Temperament & Hereditary Harmony)",
            "obtained": nadi_pts,
            "max": 8.0,
            "boy_attribute": f"{NADI_NAMES[NADI_MAP[boy_nak_idx]]} (Pada {boy_pada})",
            "girl_attribute": f"{NADI_NAMES[NADI_MAP[girl_nak_idx]]} (Pada {girl_pada})",
            "rule": "Adi (Vata), Madhya (Pitta), and Antya (Kapha) must differ to avoid genetic dosha. Classical exemptions annul dosha if signs differ, nakshatras differ, or padas differ.",
            "description": nadi_reason or f"Favorable Nadi distinction ({NADI_NAMES[NADI_MAP[boy_nak_idx]]} vs {NADI_NAMES[NADI_MAP[girl_nak_idx]]})",
            "has_dosha": has_nadi_dosha,
            "is_cancelled": nadi_cancelled
        }
    }

    # 3. Supplementary Full Kundli Compatibility Report
    # A. 7th House and 7th Lord Analysis
    b_lagna_idx = SIGNS.index(boy_kundli["lagna"]["sign"])
    g_lagna_idx = SIGNS.index(girl_kundli["lagna"]["sign"])
    b_7th_sign = SIGNS[(b_lagna_idx + 6) % 12]
    g_7th_sign = SIGNS[(g_lagna_idx + 6) % 12]
    b_7th_lord = SIGN_LORDS[(b_lagna_idx + 6) % 12]
    g_7th_lord = SIGN_LORDS[(g_lagna_idx + 6) % 12]

    b_7th_occupants = [p for p, d in boy_kundli["planets"].items() if d.get("house") == 7]
    g_7th_occupants = [p for p, d in girl_kundli["planets"].items() if d.get("house") == 7]

    b_venus_sign = boy_kundli["planets"]["Venus"]["sign"]
    g_venus_sign = girl_kundli["planets"]["Venus"]["sign"]
    g_jupiter_sign = girl_kundli["planets"]["Jupiter"]["sign"]

    seventh_house_summary = {
        "boy": {
            "lagna": boy_kundli["lagna"]["sign"],
            "seventh_house_sign": b_7th_sign,
            "seventh_lord": b_7th_lord,
            "seventh_lord_placement": f"{boy_kundli['planets'][b_7th_lord]['sign']} in House {boy_kundli['planets'][b_7th_lord]['house']}",
            "seventh_house_occupants": b_7th_occupants or ["None (Clear)"],
            "venus_karaka": f"{b_venus_sign} in House {boy_kundli['planets']['Venus']['house']}"
        },
        "girl": {
            "lagna": girl_kundli["lagna"]["sign"],
            "seventh_house_sign": g_7th_sign,
            "seventh_lord": g_7th_lord,
            "seventh_lord_placement": f"{girl_kundli['planets'][g_7th_lord]['sign']} in House {girl_kundli['planets'][g_7th_lord]['house']}",
            "seventh_house_occupants": g_7th_occupants or ["None (Clear)"],
            "jupiter_and_venus_karaka": f"Venus in {g_venus_sign} (House {girl_kundli['planets']['Venus']['house']}), Jupiter in {g_jupiter_sign} (House {girl_kundli['planets']['Jupiter']['house']})"
        },
        "synthesis": (
            f"Boy's 7th Lord {b_7th_lord} and Girl's 7th Lord {g_7th_lord} demonstrate "
            f"{get_relation(b_7th_lord, g_7th_lord).capitalize()} mutual relationship in classical planetary friendship, "
            f"indicating natural expectations in partnership and contractual alliance."
        )
    }

    # B. Navamsha (D9) Chart Comparison
    b_d9 = calculate_navamsha(boy_kundli["planets"], boy_kundli["lagna"]["total_degree"])
    g_d9 = calculate_navamsha(girl_kundli["planets"], girl_kundli["lagna"]["total_degree"])

    b_vargottama = [p for p, d in b_d9["planets"].items() if d.get("is_vargottama")]
    g_vargottama = [p for p, d in g_d9["planets"].items() if d.get("is_vargottama")]

    navamsha_summary = {
        "boy_d9_lagna": b_d9["d9_lagna"]["sign"],
        "girl_d9_lagna": g_d9["d9_lagna"]["sign"],
        "boy_d9_venus": f"{b_d9['planets']['Venus']['sign']} (House {b_d9['planets']['Venus']['house']})",
        "girl_d9_venus": f"{g_d9['planets']['Venus']['sign']} (House {g_d9['planets']['Venus']['house']})",
        "boy_vargottama_planets": b_vargottama or ["None"],
        "girl_vargottama_planets": g_vargottama or ["None"],
        "navamsha_verdict": (
            f"Boy's Navamsha Lagna is {b_d9['d9_lagna']['sign']} and Girl's Navamsha Lagna is {g_d9['d9_lagna']['sign']}. "
            f"In the D9 divisional chart of marital fruition, Venus dignity and trinal alignments reflect the enduring inner strength of the union."
        )
    }

    # C. Manglik Dosha Analysis & Cross-Cancellation Rule
    b_doshas = analyze_doshas_and_remedies(boy_kundli["planets"], boy_kundli["lagna"]["sign"])
    g_doshas = analyze_doshas_and_remedies(girl_kundli["planets"], girl_kundli["lagna"]["sign"])

    b_manglik = b_doshas.get("manglik", {})
    g_manglik = g_doshas.get("manglik", {})

    b_is_m = b_manglik.get("is_manglik", False)
    g_is_m = g_manglik.get("is_manglik", False)

    # Cross cancellation: If BOTH are Manglik, Mars cancels Mars!
    mutual_manglik_cancellation = False
    if b_is_m and g_is_m:
        mutual_manglik_cancellation = True
        manglik_verdict = "Mutual Manglik Cancellation (Kuja Dosha Nivritti) — Both partners are Manglik; the Mars afflictions mutually balance out."
    elif not b_is_m and not g_is_m:
        manglik_verdict = "Clear — Neither partner has Manglik Dosha; marital energy is free from Kuja affliction."
    elif b_is_m and not g_is_m:
        c_reasons = b_manglik.get("cancellation_reasons", [])
        if c_reasons:
            manglik_verdict = f"Boy has theoretical Manglik placement, but it is nullified by Parashari exceptions: {'; '.join(c_reasons)}."
        else:
            manglik_verdict = "Boy is Manglik while Girl is Non-Manglik — Pre-marital harmonizing rituals and Kumbh Vivah / Hanuman Chalisa upayas recommended."
    else:
        c_reasons = g_manglik.get("cancellation_reasons", [])
        if c_reasons:
            manglik_verdict = f"Girl has theoretical Manglik placement, but it is nullified by Parashari exceptions: {'; '.join(c_reasons)}."
        else:
            manglik_verdict = "Girl is Manglik while Boy is Non-Manglik — Pre-marital harmonizing rituals and Mangal Shanti upayas recommended."

    manglik_summary = {
        "boy_is_manglik": b_is_m,
        "girl_is_manglik": g_is_m,
        "boy_cancellation_reasons": b_manglik.get("cancellation_reasons", []),
        "girl_cancellation_reasons": g_manglik.get("cancellation_reasons", []),
        "mutual_cancellation": mutual_manglik_cancellation,
        "synthesis": manglik_verdict
    }

    # D. Vimshottari Dasha Timing Alignment
    b_dasha = calculate_vimshottari_dasha(boy_moon_deg, b_dt)
    g_dasha = calculate_vimshottari_dasha(girl_moon_deg, g_dt)

    b_active = b_dasha.get("active_now", {})
    g_active = g_dasha.get("active_now", {})

    dasha_summary = {
        "boy_active_dasha": f"{b_active.get('maha_dasha', 'N/A')} Mahadasha / {b_active.get('antar_dasha', 'N/A')} Antardasha",
        "girl_active_dasha": f"{g_active.get('maha_dasha', 'N/A')} Mahadasha / {g_active.get('antar_dasha', 'N/A')} Antardasha",
        "dasha_timing_verdict": (
            f"Boy is operating in {b_active.get('maha_dasha')} period while Girl is operating in {g_active.get('maha_dasha')} period. "
            f"Both sub-periods should be reviewed against their respective 7th houses to confirm mutual marital receptivity and domestic stability."
        )
    }

    # E. Jaimini Darakaraka (DK) Analysis
    b_karakas = calculate_chara_karakas(boy_kundli["planets"])
    g_karakas = calculate_chara_karakas(girl_kundli["planets"])

    b_dk = b_karakas.get("Darakaraka", {})
    g_dk = g_karakas.get("Darakaraka", {})

    jaimini_dk_summary = {
        "boy_darakaraka": f"{b_dk.get('planet', 'N/A')} at {b_dk.get('degree', 0.0):.2f}° in {b_dk.get('sign', 'N/A')} (House {b_dk.get('house', 'N/A')})",
        "girl_darakaraka": f"{g_dk.get('planet', 'N/A')} at {g_dk.get('degree', 0.0):.2f}° in {g_dk.get('sign', 'N/A')} (House {g_dk.get('house', 'N/A')})",
        "dk_synthesis": (
            f"In Jaimini Upadesha Sutras, Darakaraka signifies the innate qualities of the lifelong partner. "
            f"Boy's DK is {b_dk.get('planet')} reflecting desire for {b_dk.get('significance', 'partnership')}. "
            f"Girl's DK is {g_dk.get('planet')} indicating affinity for {g_dk.get('significance', 'partnership')}."
        )
    }

    # F. Synthesis & Honest Epistemic Limitations
    limitations = (
        "Ashtakoota 36-Guna Milan is a classical Parashari screening system focused exclusively on Moon longitudes. "
        "A high score does not guarantee matrimonial bliss in the absence of mutual patience, communication, and emotional maturity. "
        "Conversely, scores below 18 often reflect traditional heuristic cautions that can be effectively navigated through "
        "comprehensive 7th house inspection, D9 Navamsha strength, supportive Dasha periods, and classical remedial harmonizations."
    )

    return {
        "status": "SUCCESS",
        "method": "DUAL_PROFILE_EPHEMERIS_ASHTAKOOTA",
        "boy_profile": {
            "name": b_name,
            "dob": b_dob_str,
            "lagna": boy_kundli["lagna"]["sign"],
            "moon_sign": SIGNS[boy_sign_idx],
            "nakshatra": NAKSHATRAS[boy_nak_idx],
            "pada": boy_pada,
            "moon_degree": round(boy_moon_deg, 4)
        },
        "girl_profile": {
            "name": g_name,
            "dob": g_dob_str,
            "lagna": girl_kundli["lagna"]["sign"],
            "moon_sign": SIGNS[girl_sign_idx],
            "nakshatra": NAKSHATRAS[girl_nak_idx],
            "pada": girl_pada,
            "moon_degree": round(girl_moon_deg, 4)
        },
        "total_score": round(total_gunas, 1),
        "max_score": 36.0,
        "verdict": verdict,
        "recommendation": recommendation,
        "ashtakoota_breakdown": kootas_breakdown,
        "supplementary_compatibility_report": {
            "seventh_house_analysis": seventh_house_summary,
            "navamsha_d9_analysis": navamsha_summary,
            "manglik_dosha_analysis": manglik_summary,
            "vimshottari_dasha_analysis": dasha_summary,
            "jaimini_darakaraka_analysis": jaimini_dk_summary,
            "synthesis_and_limitations": limitations
        }
    }
