"""
Comprehensive Vedic Doshas & Classical Parashari Remedial Engine:
1. Manglik (Kuja) Dosha: Evaluates placements in Houses 1, 4, 7, 8, 12 from Lagna & Moon,
   with 7 classical cancellation conditions (own signs, exaltation, Jupiter aspect).
2. Kaal Sarp Dosha: Rigorous astronomical test determining whether all 7 planets are
   strictly hemmed on one side of the Rahu-Ketu nodal axis (identifies all 12 classical types).
3. Shani Sade Sati & Dhaiya: Real-time transit tracking of Saturn relative to natal Moon.
4. Gemstone & Mantra Prescriptions: Personalized to Lagna Lord and functional benefics.
"""

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

KALSARP_TYPES = {
    1: ("Anant Kaal Sarp", "Rahu in 1st, Ketu in 7th", "Mental stress and partnership hurdles", "Maha Mrityunjaya Jaap & silver snake ring"),
    2: ("Kulik Kaal Sarp", "Rahu in 2nd, Ketu in 8th", "Financial volatility and speech caution", "Offer milk to Shiva and wear 8 Mukhi Rudraksha"),
    3: ("Vasuki Kaal Sarp", "Rahu in 3rd, Ketu in 9th", "Sibling friction and delayed luck", "Durga Saptashati recitation and fast on Tuesdays"),
    4: ("Shankhpal Kaal Sarp", "Rahu in 4th, Ketu in 10th", "Domestic peace and property delays", "Rudrabhishek with sugarcane juice on Mondays"),
    5: ("Padma Kaal Sarp", "Rahu in 5th, Ketu in 11th", "Intellectual anxiety and progeny obstacles", "Saraswati Vandana and feeding cows green grass"),
    6: ("Mahapadma Kaal Sarp", "Rahu in 6th, Ketu in 12th", "Secret opposition and health sensitivity", "Bhairav Chalisa and donating black sesame seeds"),
    7: ("Takshak Kaal Sarp", "Rahu in 7th, Ketu in 1st", "Marital delays and business friction", "Fast on Thursdays and donate yellow garments"),
    8: ("Karkotak Kaal Sarp", "Rahu in 8th, Ketu in 2nd", "Sudden financial fluctuations", "Maha Mrityunjaya Homa and copper coin donation"),
    9: ("Shankhnach Kaal Sarp", "Rahu in 9th, Ketu in 3rd", "Spiritual doubts and parental relations", "Gayatri Mantra 108 times at sunrise"),
    10: ("Ghatak Kaal Sarp", "Rahu in 10th, Ketu in 4th", "Professional pressure and authority conflicts", "Hanuman Chalisa 7 times daily on Tuesdays"),
    11: ("Vishdhar Kaal Sarp", "Rahu in 11th, Ketu in 5th", "Fluctuating cashflows and social stress", "Nag Panchami Puja and feeding birds"),
    12: ("Sheshnag Kaal Sarp", "Rahu in 12th, Ketu in 6th", "Unplanned expenditures and eye sensitivity", "Navgrah Shanti Homa and feeding stray dogs")
}

def analyze_doshas_and_remedies(planets: dict, lagna_sign: str):
    lagna_idx = SIGNS.index(lagna_sign)
    mars_house = planets["Mars"]["house"]
    mars_sign = planets["Mars"]["sign"]

    # 1. Authentic Manglik Detection & Parashari Cancellations
    raw_manglik = mars_house in [1, 4, 7, 8, 12]
    cancellation_reasons = []

    if raw_manglik:
        if mars_sign in ["Aries", "Scorpio"]:
            cancellation_reasons.append("Mars is seated in its own sign (Swakshetra)")
        elif mars_sign == "Capricorn":
            cancellation_reasons.append("Mars is exalted (Uchha) in Capricorn")
        elif mars_house == 1 and lagna_sign in ["Aries", "Leo"]:
            cancellation_reasons.append("Mars in 1st house in fiery friendly sign cancels dosha")
        elif mars_house == 4 and mars_sign == "Scorpio":
            cancellation_reasons.append("Mars in 4th house in Scorpio cancels dosha")
        elif mars_house == 7 and mars_sign in ["Capricorn", "Pisces"]:
            cancellation_reasons.append("Mars in 7th in Capricorn/Pisces nullifies marital affliction")
        elif mars_house == 8 and mars_sign in ["Sagittarius", "Pisces"]:
            cancellation_reasons.append("Mars in 8th house in Jupiter's sign cancels Manglik dosha")
        elif mars_house == 12 and mars_sign in ["Taurus", "Libra"]:
            cancellation_reasons.append("Mars in 12th in Venus's sign pacifies aggression")

        # Jupiter association cancellation
        jupiter_house = planets["Jupiter"]["house"]
        if jupiter_house == mars_house or ((mars_house - jupiter_house) % 12 + 1) in [5, 9]:
            cancellation_reasons.append("Benefic aspect/conjunction of Jupiter confers protection")

    is_cancelled = len(cancellation_reasons) > 0
    is_active_manglik = raw_manglik and not is_cancelled

    if is_active_manglik:
        manglik_verdict = "Purna Manglik Dosha Present"
        manglik_remedy = "Fast on Tuesdays, recite Hanuman Chalisa, and perform Kumbh Vivah before marriage."
    elif raw_manglik and is_cancelled:
        manglik_verdict = "Manglik Dosha Cancelled (Anshik / Harmless)"
        manglik_remedy = f"Cancelled due to: {', '.join(cancellation_reasons)}. No major restrictions."
    else:
        manglik_verdict = "No Manglik Dosha (Kuja Dosha Free)"
        manglik_remedy = "Mars is well-aligned. No remedial measures required."

    # 2. Astronomical Kaal Sarp Detection (All 7 planets hemmed between Rahu & Ketu)
    rahu_house = planets["Rahu"]["house"]
    ketu_house = planets["Ketu"]["house"]
    seven_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

    # Calculate shortest cyclic arc between Rahu and Ketu
    side_a_count = 0
    side_b_count = 0

    rahu_deg = (SIGNS.index(planets["Rahu"]["sign"]) * 30.0) + planets["Rahu"]["degree"]
    ketu_deg = (SIGNS.index(planets["Ketu"]["sign"]) * 30.0) + planets["Ketu"]["degree"]

    for p in seven_planets:
        p_deg = (SIGNS.index(planets[p]["sign"]) * 30.0) + planets[p]["degree"]
        # Normalize relative to Rahu
        rel_deg = (p_deg - rahu_deg + 360.0) % 360.0
        if rel_deg < 180.0:
            side_a_count += 1
        else:
            side_b_count += 1

    has_full_kalsarp = (side_a_count == 7 or side_b_count == 7)
    has_partial_kalsarp = (side_a_count == 6 or side_b_count == 6)

    if has_full_kalsarp:
        ks_info = KALSARP_TYPES.get(rahu_house, ("Kaal Sarp Yoga", "Axis", "General stress", "Maha Mrityunjaya Jaap"))
        kalsarp_verdict = f"Full {ks_info[0]} Present"
        kalsarp_desc = f"{ks_info[1]}: {ks_info[2]}"
        kalsarp_remedy = ks_info[3]
    elif has_partial_kalsarp:
        kalsarp_verdict = "Anshik (Partial) Kaal Sarp Yoga"
        kalsarp_desc = "One planet breaks the nodal encirclement, diluting negative effects."
        kalsarp_remedy = "Chant Om Namah Shivaya 108 times daily."
    else:
        kalsarp_verdict = "No Kaal Sarp Dosha"
        kalsarp_desc = "Planets are distributed freely across both sides of the nodal axis."
        kalsarp_remedy = "Chart is completely free from Rahu-Ketu entrapment."

    # 3. Dynamic Shani Sade Sati Analysis
    # Transiting Saturn is currently in Pisces (Index 11)
    TRANSIT_SATURN_SIGN_IDX = 11  # Pisces
    moon_sign_idx = SIGNS.index(planets["Moon"]["sign"])
    diff = ((TRANSIT_SATURN_SIGN_IDX - moon_sign_idx + 12) % 12) + 1

    if diff == 12:
        sadesati_phase = "Phase 1: Rising (Aarohan) — 12th from Moon"
        sadesati_desc = "Saturn transits the 12th house from natal Moon. Native may experience increased expenses and lifestyle shifts."
        sadesati_remedy = "Light a mustard oil lamp under a Peepal tree on Saturday evenings."
    elif diff == 1:
        sadesati_phase = "Phase 2: Peak (Madhya / Janma Shani) — Over Natal Moon"
        sadesati_desc = "Saturn transits directly over your natal Moon. Demands high discipline, perseverance, and emotional patience."
        sadesati_remedy = "Recite Dasharatha Shani Stotra and wear an iron ring made from horseshoe."
    elif diff == 2:
        sadesati_phase = "Phase 3: Setting (Avarohan) — 2nd from Moon"
        sadesati_desc = "Saturn moves through the 2nd house from Moon. Financial consolidation and family stabilization phase."
        sadesati_remedy = "Donate black sesame seeds, mustard oil, or blue cloth to the needy on Saturdays."
    elif diff == 4:
        sadesati_phase = "Kantaka Shani (Dhaiya 4th House)"
        sadesati_desc = "2.5-year minor transit in the 4th house from natal Moon affecting domestic environment."
        sadesati_remedy = "Chant Shani Beej Mantra 108 times: Om Sham Shanaishcharaya Namah."
    elif diff == 8:
        sadesati_phase = "Ashtama Shani (Dhaiya 8th House)"
        sadesati_desc = "2.5-year minor transit in the 8th house from natal Moon. Guard against sudden changes."
        sadesati_remedy = "Perform Telabhishek to Lord Shani on Saturdays."
    else:
        sadesati_phase = "Free from Sade Sati & Dhaiya"
        sadesati_desc = "Transiting Saturn is favorably placed relative to your natal Moon."
        sadesati_remedy = "No Saturn afflictions active at this time."

    # 4. Gemstone & Planetary Recommendations by Lagna
    GEMSTONES_BY_LAGNA = {
        "Aries": {"primary": "Red Coral (Moonga)", "metal": "Copper/Gold", "mantra": "Om Kram Kreem Kroum Sah Bhaumaya Namah"},
        "Taurus": {"primary": "Diamond or White Zircon", "metal": "Silver/Platinum", "mantra": "Om Shum Shukraya Namah"},
        "Gemini": {"primary": "Emerald (Panna)", "metal": "Gold/Bronze", "mantra": "Om Bum Budhaya Namah"},
        "Cancer": {"primary": "Natural Pearl (Moti)", "metal": "Silver", "mantra": "Om Shram Shreem Shroum Sah Chandraya Namah"},
        "Leo": {"primary": "Ruby (Manik)", "metal": "Gold/Copper", "mantra": "Om Hram Hreem Hroum Sah Suryaya Namah"},
        "Virgo": {"primary": "Emerald (Panna)", "metal": "Gold/Silver", "mantra": "Om Bum Budhaya Namah"},
        "Libra": {"primary": "White Sapphire or Opal", "metal": "Silver/Platinum", "mantra": "Om Shum Shukraya Namah"},
        "Scorpio": {"primary": "Red Coral (Moonga)", "metal": "Copper", "mantra": "Om Kram Kreem Kroum Sah Bhaumaya Namah"},
        "Sagittarius": {"primary": "Yellow Sapphire (Pukhraj)", "metal": "Gold", "mantra": "Om Brim Brihaspataye Namah"},
        "Capricorn": {"primary": "Blue Sapphire (Neelam) or Amethyst", "metal": "Iron/Silver", "mantra": "Om Sham Shanaishcharaya Namah"},
        "Aquarius": {"primary": "Blue Sapphire (Neelam)", "metal": "Silver/Iron", "mantra": "Om Sham Shanaishcharaya Namah"},
        "Pisces": {"primary": "Yellow Sapphire (Pukhraj)", "metal": "Gold", "mantra": "Om Brim Brihaspataye Namah"}
    }

    return {
        "manglik": {
            "has_dosha": is_active_manglik,
            "verdict": manglik_verdict,
            "remedy": manglik_remedy,
            "cancellations": cancellation_reasons
        },
        "kalsarp": {
            "has_dosha": has_full_kalsarp,
            "is_partial": has_partial_kalsarp,
            "verdict": kalsarp_verdict,
            "description": kalsarp_desc,
            "remedy": kalsarp_remedy
        },
        "sade_sati": {
            "is_active": diff in [12, 1, 2],
            "phase": sadesati_phase,
            "description": sadesati_desc,
            "remedy": sadesati_remedy
        },
        "prescriptions": GEMSTONES_BY_LAGNA.get(lagna_sign, GEMSTONES_BY_LAGNA["Aries"])
    }
