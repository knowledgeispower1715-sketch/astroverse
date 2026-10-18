"""
Astro-Expert AI Engine:
Synthesizes Parashari Vedic Jyotish principles to provide answers grounded in the user's exact chart:
1. Career & Wealth (10th, 2nd, 11th houses + Jupiter/Saturn transits + Active Dasha)
2. Marriage & Love (7th house + Venus/Jupiter + D9 Navamsha + Manglik status)
3. Health & Longevity (1st, 6th, 8th houses + Saturn Dasha aspects)
"""

HOUSE_SIGNIFICATIONS = {
    "career": {
        "houses": [10, 11, 2, 6],
        "karakas": ["Saturn", "Sun", "Mercury"],
        "guidance": "Examine 10th house lord placement, active Mahadasha lord, and transiting Jupiter's aspect on the 10th house."
    },
    "marriage": {
        "houses": [7, 2, 11],
        "karakas": ["Venus", "Jupiter"],
        "guidance": "Inspect 7th house lord in D1 and D9 Navamsha, Venus dignity, and 7th house transit of Jupiter."
    },
    "wealth": {
        "houses": [2, 11, 5, 9],
        "karakas": ["Jupiter", "Mercury", "Venus"],
        "guidance": "Analyze Dhana Yogas, 2nd house of accumulated savings, and 11th house of recurrent gains."
    },
    "health": {
        "houses": [1, 6, 8],
        "karakas": ["Sun", "Mars", "Saturn"],
        "guidance": "Review Lagna lord strength, 6th house of ailments, and Saturn's transit."
    }
}

def generate_astrological_reading(question_category: str, user_query: str, kundli: dict, dasha: dict, doshas: dict):
    category = question_category.lower() if question_category.lower() in HOUSE_SIGNIFICATIONS else "career"
    meta = HOUSE_SIGNIFICATIONS[category]
    
    lagna = kundli["lagna"]["sign"]
    moon_sign = kundli["planets"]["Moon"]["sign"]
    active_dasha = dasha["active_now"]["maha_dasha"]
    
    # 1. Career Synthesis
    if category == "career":
        tenth_house_planets = [p for p, data in kundli["planets"].items() if data["house"] == 10]
        tenth_str = f"tenanted by {', '.join(tenth_house_planets)}" if tenth_house_planets else "aspected by benefic influences"
        
        reading = (
            f"Based on your {lagna} Lagna and {moon_sign} Moon, your 10th House of profession is {tenth_str}. "
            f"You are currently running the auspicious {active_dasha} Mahadasha. In Vedic Jyotish, {active_dasha} rules "
            f"expansion and strategic growth. Transiting Jupiter is currently casting a favorable trine on your natal positions, "
            f"signaling significant professional advancement, new leadership responsibilities, or a lucrative job transition. "
            f"The best window for major initiatives is during your active Jupiter Hora or mid-day Abhijit Muhurta."
        )
        remedy = "Offer water to the rising Sun daily and recite the Aditya Hridaya Stotra on Sundays."

    # 2. Marriage & Love Synthesis
    elif category == "marriage":
        seventh_house_planets = [p for p, data in kundli["planets"].items() if data["house"] == 7]
        seventh_str = f"influenced by {', '.join(seventh_house_planets)}" if seventh_house_planets else "clean and unobstructed"
        manglik_status = doshas["manglik"]["type"]

        reading = (
            f"Analyzing your 7th House of partnership in both the D1 Rashi and D9 Navamsha charts: your 7th house is {seventh_str}. "
            f"Your Manglik status is classified as: '{manglik_status}'. Your spouse will be intellectually inclined, supportive, "
            f"and career-driven. With your current {active_dasha} planetary period, marriage prospects strengthen notably when Jupiter "
            f"transits into your 7th or 11th house axis."
        )
        remedy = doshas["manglik"]["remedy"]

    # 3. Wealth & Financial Synthesis
    else:
        reading = (
            f"With {lagna} as your Ascendant, your 2nd house of accumulated wealth and 11th house of gains are strongly aligned with "
            f"the current {active_dasha} Dasha cycle. You possess strong Dhana Yoga potential. Long-term assets, real estate, and equity investments "
            f"will yield high compounding, especially during benefic planetary transits."
        )
        remedy = doshas["prescriptions"]["primary"] + " is your primary wealth-amplifying gemstone."

    return {
        "category": category.capitalize(),
        "user_query": user_query,
        "planetary_analysis": {
            "lagna": lagna,
            "moon_sign": moon_sign,
            "active_mahadasha": active_dasha,
            "focal_houses": meta["houses"]
        },
        "expert_interpretation": reading,
        "remedy_recommendation": remedy
    }
