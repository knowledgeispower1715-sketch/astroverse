"""
Divisional Charts Engine:
Calculates Navamsha (D9) chart where each zodiac sign is divided into 9 equal parts of 3°20' (3.333°).
"""

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
         "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

# Navamsha starting signs for Fire, Earth, Air, Water elements
ELEMENT_START = {
    0: 0,   # Fire signs (Aries, Leo, Sag) start from Aries (0)
    1: 9,   # Earth signs (Taurus, Virgo, Cap) start from Capricorn (9)
    2: 6,   # Air signs (Gemini, Libra, Aqua) start from Libra (6)
    3: 3    # Water signs (Cancer, Scorpio, Pisces) start from Cancer (3)
}

def calculate_navamsha(planets_d1: dict, lagna_d1_degree: float):
    navamsha_planets = {}
    
    # Calculate D9 Lagna
    lagna_sign_idx = int(lagna_d1_degree / 30.0)
    pada_in_sign = int((lagna_d1_degree % 30.0) / (30.0 / 9.0))
    start_sign = ELEMENT_START[lagna_sign_idx % 4]
    d9_lagna_sign_idx = (start_sign + pada_in_sign) % 12
    
    for planet, data in planets_d1.items():
        total_deg = (SIGNS.index(data["sign"]) * 30.0) + data["degree"]
        sign_idx = int(total_deg / 30.0)
        navamsha_pada = int((total_deg % 30.0) / (30.0 / 9.0)) # 0 to 8
        
        elem_start = ELEMENT_START[sign_idx % 4]
        d9_sign_idx = (elem_start + navamsha_pada) % 12
        d9_house = ((d9_sign_idx - d9_lagna_sign_idx) % 12) + 1
        
        # Check Vargottama (same sign in D1 and D9 = exceptionally strong planet)
        is_vargottama = (sign_idx == d9_sign_idx)

        navamsha_planets[planet] = {
            "sign": SIGNS[d9_sign_idx],
            "house": d9_house,
            "is_vargottama": is_vargottama
        }

    return {
        "d9_lagna": SIGNS[d9_lagna_sign_idx],
        "planets": navamsha_planets
    }
