"""
AstroVerse Numerology Engine
============================
High-precision Vedic and Chaldean Numerology system calculating:
1. Birth / Psychic Number (Mulank)
2. Destiny / Life Path Number (Bhagyank) with Master Number support (11, 22, 33)
3. Name Number (Namank) via Chaldean and Pythagorean mapping systems
4. Soul Urge / Heart's Desire Number (Vowels)
5. Personality Number (Consonants)
6. Planetary associations, friendship matrix, lucky elements, and vibration analysis
"""

from typing import Dict, Any, List, Optional
import re
from datetime import datetime

CHALDEAN_MAP = {
    'A': 1, 'I': 1, 'J': 1, 'Q': 1, 'Y': 1,
    'B': 2, 'K': 2, 'R': 2,
    'C': 3, 'G': 3, 'L': 3, 'S': 3,
    'D': 4, 'M': 4, 'T': 4,
    'E': 5, 'H': 5, 'N': 5, 'X': 5,
    'U': 6, 'V': 6, 'W': 6,
    'O': 7, 'Z': 7,
    'F': 8, 'P': 8
}

PYTHAGOREAN_MAP = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
    'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8
}

PLANET_NUMEROLOGY_DATA = {
    1: {
        "planet": "Sun (Surya)",
        "archetype": "The Leader / Pioneer",
        "element": "Fire",
        "qualities": ["Independent", "Authoritative", "Ambitious", "Visionary", "Inventive"],
        "lucky_colors": ["Gold", "Orange", "Yellow"],
        "lucky_days": ["Sunday", "Monday"],
        "lucky_gem": "Ruby (Manikya)",
        "friendly_numbers": [1, 2, 3, 5, 9],
        "neutral_numbers": [4, 7],
        "enemy_numbers": [6, 8]
    },
    2: {
        "planet": "Moon (Chandra)",
        "archetype": "The Peacemaker / Intuitive",
        "element": "Water",
        "qualities": ["Intuitive", "Empathetic", "Diplomatic", "Artistic", "Nurturing"],
        "lucky_colors": ["White", "Silver", "Cream", "Sea Green"],
        "lucky_days": ["Monday", "Sunday", "Friday"],
        "lucky_gem": "Pearl (Moti) / Moonstone",
        "friendly_numbers": [1, 2, 3, 5],
        "neutral_numbers": [7, 8],
        "enemy_numbers": [4, 6, 9]
    },
    3: {
        "planet": "Jupiter (Guru)",
        "archetype": "The Sage / Creative Guide",
        "element": "Ether",
        "qualities": ["Wisdom", "Optimistic", "Expressive", "Expansive", "Philosophical"],
        "lucky_colors": ["Yellow", "Saffron", "Purple"],
        "lucky_days": ["Thursday", "Tuesday"],
        "lucky_gem": "Yellow Sapphire (Pukhraj)",
        "friendly_numbers": [1, 2, 3, 5, 9],
        "neutral_numbers": [8],
        "enemy_numbers": [4, 6, 7]
    },
    4: {
        "planet": "Rahu / Uranus (Harshal)",
        "archetype": "The Architect / Disruptor",
        "element": "Earth",
        "qualities": ["Methodical", "Unconventional", "Practical", "Revolutionary", "Resilient"],
        "lucky_colors": ["Blue", "Grey", "Smoky Shades"],
        "lucky_days": ["Saturday", "Sunday"],
        "lucky_gem": "Hessonite Garnet (Gomed)",
        "friendly_numbers": [1, 5, 6, 8],
        "neutral_numbers": [7],
        "enemy_numbers": [2, 3, 9]
    },
    5: {
        "planet": "Mercury (Budha)",
        "archetype": "The Communicator / Catalyst",
        "element": "Earth / Air",
        "qualities": ["Versatile", "Quick-witted", "Adaptable", "Curious", "Commercial"],
        "lucky_colors": ["Green", "Turquoise", "Emerald"],
        "lucky_days": ["Wednesday", "Friday"],
        "lucky_gem": "Emerald (Panna)",
        "friendly_numbers": [1, 2, 3, 5, 6],
        "neutral_numbers": [4, 8, 9],
        "enemy_numbers": [7]
    },
    6: {
        "planet": "Venus (Shukra)",
        "archetype": "The Harmonizer / Artist",
        "element": "Water / Earth",
        "qualities": ["Compassionate", "Artistic", "Charming", "Romantic", "Harmonious"],
        "lucky_colors": ["Pastel Blue", "Pink", "White"],
        "lucky_days": ["Friday", "Wednesday"],
        "lucky_gem": "Diamond (Heera) / White Sapphire",
        "friendly_numbers": [4, 5, 6, 8],
        "neutral_numbers": [2, 3],
        "enemy_numbers": [1, 9]
    },
    7: {
        "planet": "Ketu / Neptune",
        "archetype": "The Mystic / Researcher",
        "element": "Water",
        "qualities": ["Analytical", "Spiritual", "Introspective", "Philosophical", "Solitary"],
        "lucky_colors": ["Light Green", "White", "Yellow"],
        "lucky_days": ["Monday", "Sunday"],
        "lucky_gem": "Cat's Eye (Lehsuniya)",
        "friendly_numbers": [1, 2, 4, 7],
        "neutral_numbers": [5, 8],
        "enemy_numbers": [3, 6, 9]
    },
    8: {
        "planet": "Saturn (Shani)",
        "archetype": "The Karmic Master / Builder",
        "element": "Air / Earth",
        "qualities": ["Disciplined", "Authoritative", "Persevering", "Organized", "Pragmatic"],
        "lucky_colors": ["Dark Blue", "Black", "Dark Violet"],
        "lucky_days": ["Saturday", "Friday"],
        "lucky_gem": "Blue Sapphire (Neelam) / Amethyst",
        "friendly_numbers": [4, 5, 6],
        "neutral_numbers": [2, 7],
        "enemy_numbers": [1, 2, 9]
    },
    9: {
        "planet": "Mars (Mangala)",
        "archetype": "The Warrior / Humanitarian",
        "element": "Fire",
        "qualities": ["Courageous", "Dynamic", "Humanitarian", "Passionate", "Independent"],
        "lucky_colors": ["Red", "Coral", "Crimson", "Rose"],
        "lucky_days": ["Tuesday", "Thursday"],
        "lucky_gem": "Red Coral (Moonga)",
        "friendly_numbers": [1, 2, 3, 5],
        "neutral_numbers": [4],
        "enemy_numbers": [6, 7, 8]
    }
}

def _reduce_number(num: int, keep_master: bool = False) -> int:
    """Reduces an integer to a single digit (1-9) or master number (11, 22, 33)."""
    while num > 9:
        if keep_master and num in (11, 22, 33):
            return num
        num = sum(int(d) for d in str(num))
    return num

def calculate_mulank(day: int) -> int:
    """Calculate Birth/Psychic Number (Mulank) from the day of the month."""
    if day < 1 or day > 31:
        raise ValueError("Day must be between 1 and 31")
    return _reduce_number(day, keep_master=False)

def calculate_bhagyank(dob_str: str) -> Dict[str, Any]:
    """
    Calculate Destiny / Life Path Number (Bhagyank) from ISO date string (YYYY-MM-DD or full ISO).
    Returns both the standard single-digit number and master number notation if applicable.
    """
    # Extract year, month, day digits
    digits = [int(ch) for ch in dob_str[:10] if ch.isdigit()]
    if not digits or len(digits) < 8:
        raise ValueError("Invalid date format; expected YYYY-MM-DD")
    
    total = sum(digits)
    master_val = _reduce_number(total, keep_master=True)
    single_val = _reduce_number(total, keep_master=False)
    
    return {
        "destiny_number": single_val,
        "master_number": master_val if master_val in (11, 22, 33) else None,
        "total_sum": total
    }

def calculate_name_numbers(full_name: str) -> Dict[str, Any]:
    """
    Calculate Chaldean and Pythagorean Name Numbers, Soul Urge (Vowels),
    and Personality Number (Consonants).
    """
    cleaned = re.sub(r'[^A-Za-z]', '', full_name).upper()
    if not cleaned:
        return {
            "chaldean_name_number": 0,
            "pythagorean_name_number": 0,
            "soul_urge_number": 0,
            "personality_number": 0
        }
    
    vowels = set("AEIOU")
    
    chaldean_total = sum(CHALDEAN_MAP.get(ch, 0) for ch in cleaned)
    pythagorean_total = sum(PYTHAGOREAN_MAP.get(ch, 0) for ch in cleaned)
    
    vowel_total = sum(PYTHAGOREAN_MAP.get(ch, 0) for ch in cleaned if ch in vowels)
    consonant_total = sum(PYTHAGOREAN_MAP.get(ch, 0) for ch in cleaned if ch not in vowels)
    
    return {
        "chaldean_name_number": _reduce_number(chaldean_total, keep_master=False),
        "chaldean_compound": chaldean_total,
        "pythagorean_name_number": _reduce_number(pythagorean_total, keep_master=False),
        "pythagorean_compound": pythagorean_total,
        "soul_urge_number": _reduce_number(vowel_total, keep_master=False) if vowel_total > 0 else 0,
        "personality_number": _reduce_number(consonant_total, keep_master=False) if consonant_total > 0 else 0
    }

def evaluate_number_compatibility(num1: int, num2: int) -> Dict[str, Any]:
    """Evaluates the relationship and synergy between two numbers."""
    base1 = _reduce_number(num1, keep_master=False)
    base2 = _reduce_number(num2, keep_master=False)
    
    info1 = PLANET_NUMEROLOGY_DATA.get(base1, {})
    if not info1:
        return {"status": "UNKNOWN", "score": 50, "relationship": "Neutral"}
    
    if base2 in info1.get("friendly_numbers", []):
        relationship = "Harmonious / Friendly"
        score = 90
    elif base2 in info1.get("enemy_numbers", []):
        relationship = "Challenging / Inimical"
        score = 40
    else:
        relationship = "Neutral / Cooperative"
        score = 70
        
    return {
        "number_1": base1,
        "number_2": base2,
        "relationship": relationship,
        "compatibility_score": score
    }

def calculate_full_numerology(name: str, dob_iso: str) -> Dict[str, Any]:
    """
    Unified Numerology Suite returning complete psychic, destiny, and name profiles
    with planetary rulers, favorable attributes, and harmony ratings.
    """
    # Parse day
    try:
        dt = datetime.fromisoformat(dob_iso.replace("Z", "+00:00"))
        day = dt.day
    except Exception:
        # Fallback to string slicing
        day = int(dob_iso[8:10])
    
    mulank = calculate_mulank(day)
    bhagyank_data = calculate_bhagyank(dob_iso)
    name_data = calculate_name_numbers(name)
    
    planet_data = PLANET_NUMEROLOGY_DATA.get(mulank, {})
    destiny_planet_data = PLANET_NUMEROLOGY_DATA.get(bhagyank_data["destiny_number"], {})
    
    compatibility = evaluate_number_compatibility(mulank, bhagyank_data["destiny_number"])
    
    return {
        "profile": {
            "name": name,
            "dob": dob_iso
        },
        "birth_number": {
            "value": mulank,
            "title": "Mulank (Psychic / Birth Number)",
            "governing_planet": planet_data.get("planet"),
            "archetype": planet_data.get("archetype"),
            "qualities": planet_data.get("qualities"),
            "element": planet_data.get("element")
        },
        "destiny_number": {
            "value": bhagyank_data["destiny_number"],
            "master_number": bhagyank_data["master_number"],
            "total_compound": bhagyank_data["total_sum"],
            "title": "Bhagyank (Destiny / Life Path Number)",
            "governing_planet": destiny_planet_data.get("planet"),
            "archetype": destiny_planet_data.get("archetype"),
            "qualities": destiny_planet_data.get("qualities")
        },
        "name_numbers": {
            "chaldean": {
                "number": name_data["chaldean_name_number"],
                "compound": name_data["chaldean_compound"],
                "system": "Chaldean (Vedic Standard)"
            },
            "pythagorean": {
                "number": name_data["pythagorean_name_number"],
                "compound": name_data["pythagorean_compound"],
                "system": "Pythagorean"
            },
            "soul_urge_number": name_data["soul_urge_number"],
            "personality_number": name_data["personality_number"]
        },
        "synergy": compatibility,
        "favorable_elements": {
            "lucky_colors": planet_data.get("lucky_colors"),
            "lucky_days": planet_data.get("lucky_days"),
            "lucky_gemstone": planet_data.get("lucky_gem"),
            "friendly_numbers": planet_data.get("friendly_numbers"),
            "neutral_numbers": planet_data.get("neutral_numbers"),
            "enemy_numbers": planet_data.get("enemy_numbers")
        }
    }
