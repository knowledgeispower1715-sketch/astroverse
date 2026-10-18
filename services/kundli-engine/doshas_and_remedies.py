"""
Advanced Dosha Analysis & Classical Remedies:
- Anshik vs Purna Manglik with cancellation rules
- All 12 Kalsarp Dosha variations based on Rahu/Ketu axis
- Prescriptive Remedies: Gemstones, Rudraksha, Mantras & Lal Kitab Upay
"""

KALSARP_TYPES = {
    1: ("Anant Kalsarp", "Mental stress and marriage delays; remedy: Maha Mrityunjaya Jaap"),
    2: ("Kulik Kalsarp", "Financial volatility; remedy: Wear Silver Snake Ring"),
    3: ("Vasuki Kalsarp", "Sibling discord and career struggle; remedy: Durga Saptashati path"),
    4: ("Shankhpal Kalsarp", "Mental peace & property disputes; remedy: Rudrabhishek"),
    5: ("Padma Kalsarp", "Obstacles in higher education and progeny; remedy: Saraswati Vandana"),
    6: ("Mahapadma Kalsarp", "Hidden enemies; remedy: Bhairav worship"),
    7: ("Takshak Kalsarp", "Partnership and marital strain; remedy: Feed stray dogs daily"),
    8: ("Karkotak Kalsarp", "Sudden misfortunes; remedy: Shiva Abhishek with milk"),
    9: ("Shankhnach Kalsarp", "Father relations and luck barriers; remedy: Surya Namaskar"),
    10: ("Ghatak Kalsarp", "Workplace conflicts; remedy: Hanuman Chalisa 7 times daily"),
    11: ("Vishdhar Kalsarp", "Fluctuating eyesight and health; remedy: Gayatri Mantra"),
    12: ("Sheshnag Kalsarp", "Uncontrolled expenses and litigation; remedy: Mahamrityunjay Yagya")
}

def analyze_doshas_and_remedies(planets: dict, lagna_sign: str):
    # 1. Advanced Manglik Detection with Cancellations
    mars_house = planets["Mars"]["house"]
    raw_manglik = mars_house in [1, 4, 7, 8, 12]
    
    # Classical Cancellation: Mars in own/exalted signs cancels dosha
    mars_sign = planets["Mars"]["sign"]
    is_cancelled = mars_sign in ["Aries", "Scorpio", "Capricorn"] or (mars_house == 1 and lagna_sign in ["Aries", "Leo"])
    
    manglik_status = {
        "is_manglik": raw_manglik and not is_cancelled,
        "type": "Cancelled / Anshik" if (raw_manglik and is_cancelled) else ("Purna Manglik" if raw_manglik else "No Manglik"),
        "remedy": "Kumbh Vivah or fast on Tuesdays and wear 3 Mukhi Rudraksha" if raw_manglik and not is_cancelled else "None required"
    }

    # 2. 12-Type Kalsarp Analysis
    rahu_house = planets["Rahu"]["house"]
    kalsarp_name, kalsarp_desc = KALSARP_TYPES.get(rahu_house, ("Kalsarp Yoga", "Mild"))

    kalsarp_status = {
        "has_kalsarp": True,
        "type": kalsarp_name,
        "description": kalsarp_desc,
        "remedy": "Recite Om Namah Shivaya 108 times daily and perform Nag Pratishtha"
    }

    # 3. Prescriptive Gemstone Recommendations based on Lagna Lord
    GEMSTONES_BY_LAGNA = {
        "Aries": {"primary": "Red Coral (Moonga)", "lucky_metal": "Copper", "deity": "Hanuman"},
        "Taurus": {"primary": "Diamond or Opal", "lucky_metal": "Silver", "deity": "Durga"},
        "Gemini": {"primary": "Emerald (Panna)", "lucky_metal": "Bronze", "deity": "Ganesha"},
        "Cancer": {"primary": "Pearl (Moti)", "lucky_metal": "Silver", "deity": "Shiva"},
        "Leo": {"primary": "Ruby (Manik)", "lucky_metal": "Gold", "deity": "Surya"},
        "Virgo": {"primary": "Emerald (Panna)", "lucky_metal": "Gold", "deity": "Vishnu"},
        "Libra": {"primary": "White Sapphire or Diamond", "lucky_metal": "Platinum", "deity": "Lakshmi"},
        "Scorpio": {"primary": "Red Coral (Moonga)", "lucky_metal": "Copper", "deity": "Kartikeya"},
        "Sagittarius": {"primary": "Yellow Sapphire (Pukhraj)", "lucky_metal": "Gold", "deity": "Brihaspati"},
        "Capricorn": {"primary": "Blue Sapphire (Neelam)", "lucky_metal": "Iron", "deity": "Shani Dev"},
        "Aquarius": {"primary": "Blue Sapphire or Amethyst", "lucky_metal": "Silver", "deity": "Shiva"},
        "Pisces": {"primary": "Yellow Sapphire (Pukhraj)", "lucky_metal": "Gold", "deity": "Vishnu"}
    }

    return {
        "manglik": manglik_status,
        "kalsarp": kalsarp_status,
        "prescriptions": GEMSTONES_BY_LAGNA.get(lagna_sign, GEMSTONES_BY_LAGNA["Aries"])
    }
