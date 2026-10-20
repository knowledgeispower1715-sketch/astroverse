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
        # Cancelled if same lord
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

# 8. Nadi Mapping (0:Adi, 1:Madhya, 2:Antya)
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
            "nadi": {"obtained": nadi, "max": 8, "description": "Genetics & progeny health", "has_dosha": has_nadi_dosha}
        }
    }
