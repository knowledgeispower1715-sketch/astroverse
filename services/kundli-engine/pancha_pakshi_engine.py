"""
AstroVerse Pancha Pakshi Engine
===============================
Ancient Tamil stellar-biorhythm astrology system of the Five Birds (Pancha Pakshi):
1. Vulture (Vallooru)
2. Owl (Aandhai)
3. Crow (Kaakai)
4. Cock (Kozhi)
5. Peacock (Mayil)

Calculates:
- Birth Bird from birth Nakshatra (1-27) and Paksha (Waxing / Waning)
- Name-to-bird fallback using phonetic first vowel sound
- 5 Daytime Yamas (Sunrise to Sunset) and 5 Nighttime Yamas (Sunset to Sunrise)
- Current diurnal activity: Ruling (Arasu), Eating (Oon), Walking (Nadai), Sleeping (Thuyil), Dying (Chaavu)
- Activity strength percentage and actionable auspiciousness guidance
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo
import re

BIRDS = ["Vulture", "Owl", "Crow", "Cock", "Peacock"]

TAMIL_BIRD_NAMES = {
    "Vulture": "Vallooru (Vulture)",
    "Owl": "Aandhai (Owl)",
    "Crow": "Kaakai (Crow)",
    "Cock": "Kozhi (Cock)",
    "Peacock": "Mayil (Peacock)"
}

ACTIVITIES = ["Ruling", "Eating", "Walking", "Sleeping", "Dying"]

TAMIL_ACTIVITY_NAMES = {
    "Ruling": "Arasu (Ruling - Maximum Strength)",
    "Eating": "Oon (Eating - Vitalizing & Productive)",
    "Walking": "Nadai (Walking - Moderate / Routine)",
    "Sleeping": "Thuyil (Sleeping - Passive / Restful)",
    "Dying": "Chaavu (Dying - Inauspicious / Avoid Major Endeavors)"
}

ACTIVITY_WEIGHTS = {
    "Ruling": 1.0,
    "Eating": 0.8,
    "Walking": 0.5,
    "Sleeping": 0.25,
    "Dying": 0.0
}

# Shukla Paksha (Waxing) Day activity cycles per bird across 5 Yamas
# Format: {Bird: [Yama 1, Yama 2, Yama 3, Yama 4, Yama 5]}
# Order varies by ruling weekday groups
WEEKDAY_CYCLES = {
    # Sunday / Tuesday (Fire / Sun-Mars ruled)
    "SUN_TUE_SHUKLA_DAY": {
        "Vulture": ["Ruling", "Eating", "Walking", "Sleeping", "Dying"],
        "Owl": ["Eating", "Walking", "Sleeping", "Dying", "Ruling"],
        "Crow": ["Walking", "Sleeping", "Dying", "Ruling", "Eating"],
        "Cock": ["Sleeping", "Dying", "Ruling", "Eating", "Walking"],
        "Peacock": ["Dying", "Ruling", "Eating", "Walking", "Sleeping"]
    },
    # Monday / Wednesday (Water-Earth / Moon-Mercury ruled)
    "MON_WED_SHUKLA_DAY": {
        "Owl": ["Ruling", "Eating", "Walking", "Sleeping", "Dying"],
        "Crow": ["Eating", "Walking", "Sleeping", "Dying", "Ruling"],
        "Cock": ["Walking", "Sleeping", "Dying", "Ruling", "Eating"],
        "Peacock": ["Sleeping", "Dying", "Ruling", "Eating", "Walking"],
        "Vulture": ["Dying", "Ruling", "Eating", "Walking", "Sleeping"]
    },
    # Thursday (Ether / Jupiter ruled)
    "THU_SHUKLA_DAY": {
        "Crow": ["Ruling", "Eating", "Walking", "Sleeping", "Dying"],
        "Cock": ["Eating", "Walking", "Sleeping", "Dying", "Ruling"],
        "Peacock": ["Walking", "Sleeping", "Dying", "Ruling", "Eating"],
        "Vulture": ["Sleeping", "Dying", "Ruling", "Eating", "Walking"],
        "Owl": ["Dying", "Ruling", "Eating", "Walking", "Sleeping"]
    },
    # Friday (Water / Venus ruled)
    "FRI_SHUKLA_DAY": {
        "Cock": ["Ruling", "Eating", "Walking", "Sleeping", "Dying"],
        "Peacock": ["Eating", "Walking", "Sleeping", "Dying", "Ruling"],
        "Vulture": ["Walking", "Sleeping", "Dying", "Ruling", "Eating"],
        "Owl": ["Sleeping", "Dying", "Ruling", "Eating", "Walking"],
        "Crow": ["Dying", "Ruling", "Eating", "Walking", "Sleeping"]
    },
    # Saturday (Air / Saturn ruled)
    "SAT_SHUKLA_DAY": {
        "Peacock": ["Ruling", "Eating", "Walking", "Sleeping", "Dying"],
        "Vulture": ["Eating", "Walking", "Sleeping", "Dying", "Ruling"],
        "Owl": ["Walking", "Sleeping", "Dying", "Ruling", "Eating"],
        "Crow": ["Sleeping", "Dying", "Ruling", "Eating", "Walking"],
        "Cock": ["Dying", "Ruling", "Eating", "Walking", "Sleeping"]
    }
}

def determine_birth_bird_from_nakshatra(nakshatra_num: int, is_waxing: bool = True) -> str:
    """
    Determines the birth bird from Nakshatra (1 to 27) and Paksha.
    1: Ashwini ... 27: Revati.
    """
    n = max(1, min(27, nakshatra_num))
    if is_waxing:
        if 1 <= n <= 5:
            return "Vulture"
        elif 6 <= n <= 11:
            return "Owl"
        elif 12 <= n <= 17:
            return "Crow"
        elif 18 <= n <= 22:
            return "Cock"
        else:
            return "Peacock"
    else:
        # Krishna Paksha reverses sequence
        if 1 <= n <= 5:
            return "Peacock"
        elif 6 <= n <= 11:
            return "Cock"
        elif 12 <= n <= 17:
            return "Crow"
        elif 18 <= n <= 22:
            return "Owl"
        else:
            return "Vulture"

def determine_birth_bird_from_name(name: str) -> str:
    """
    Phonetic fallback: Determines birth bird from the first vowel sound of a name.
    A/Aa -> Vulture; E/I -> Owl; U/Oo -> Crow; O/Au -> Cock; Others -> Peacock.
    """
    cleaned = re.sub(r'[^A-Za-z]', '', name).upper()
    vowels = [ch for ch in cleaned if ch in "AEIOU"]
    if not vowels:
        return "Peacock"
    first_vowel = vowels[0]
    if first_vowel == 'A':
        return "Vulture"
    elif first_vowel in ('E', 'I'):
        return "Owl"
    elif first_vowel == 'U':
        return "Crow"
    elif first_vowel == 'O':
        return "Cock"
    return "Peacock"

def get_day_night_yamas(
    sunrise_dt: datetime,
    sunset_dt: datetime,
    next_sunrise_dt: datetime
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Divides daytime (sunrise to sunset) and nighttime (sunset to next sunrise)
    into 5 equal Yamas each.
    """
    day_duration = (sunset_dt - sunrise_dt).total_seconds()
    day_yama_len = day_duration / 5.0
    
    night_duration = (next_sunrise_dt - sunset_dt).total_seconds()
    night_yama_len = night_duration / 5.0
    
    day_yamas = []
    for i in range(5):
        y_start = sunrise_dt + timedelta(seconds=i * day_yama_len)
        y_end = sunrise_dt + timedelta(seconds=(i + 1) * day_yama_len)
        day_yamas.append({
            "yama_number": i + 1,
            "period_type": "Day",
            "start_time": y_start.isoformat(),
            "end_time": y_end.isoformat(),
            "duration_minutes": round(day_yama_len / 60.0, 1)
        })
        
    night_yamas = []
    for i in range(5):
        y_start = sunset_dt + timedelta(seconds=i * night_yama_len)
        y_end = sunset_dt + timedelta(seconds=(i + 1) * night_yama_len)
        night_yamas.append({
            "yama_number": i + 1,
            "period_type": "Night",
            "start_time": y_start.isoformat(),
            "end_time": y_end.isoformat(),
            "duration_minutes": round(night_yama_len / 60.0, 1)
        })
        
    return day_yamas, night_yamas

def get_activity_for_yama(
    bird: str,
    weekday_idx: int, # 0=Mon, 1=Tue, ..., 6=Sun
    yama_num: int,    # 1 to 5
    is_day: bool,
    is_waxing: bool
) -> str:
    """Computes the primary activity of a bird for a specific Yama."""
    # Map weekday to cycle group
    # 6=Sun, 1=Tue -> SUN_TUE
    if weekday_idx in (6, 1):
        group_key = "SUN_TUE_SHUKLA_DAY"
    elif weekday_idx in (0, 2):
        group_key = "MON_WED_SHUKLA_DAY"
    elif weekday_idx == 3:
        group_key = "THU_SHUKLA_DAY"
    elif weekday_idx == 4:
        group_key = "FRI_SHUKLA_DAY"
    else:
        group_key = "SAT_SHUKLA_DAY"
        
    cycle_map = WEEKDAY_CYCLES.get(group_key, WEEKDAY_CYCLES["SUN_TUE_SHUKLA_DAY"])
    activities_list = cycle_map.get(bird, ["Ruling", "Eating", "Walking", "Sleeping", "Dying"])
    
    # If night time or Krishna Paksha, shift phase by 2 steps
    offset = 0
    if not is_day:
        offset += 2
    if not is_waxing:
        offset += 1
        
    act_idx = (yama_num - 1 + offset) % 5
    return activities_list[act_idx]

def calculate_pancha_pakshi(
    birth_nakshatra_num: Optional[int] = None,
    name: Optional[str] = None,
    is_waxing: bool = True,
    check_time_iso: Optional[str] = None,
    sunrise_iso: Optional[str] = None,
    sunset_iso: Optional[str] = None,
    timezone_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Evaluates complete Pancha Pakshi status:
    - Birth bird
    - Active Yama
    - Current activity and potency weight
    - Full schedule for the current 24-hour cycle
    """
    tz = ZoneInfo(timezone_str)
    now_dt = datetime.fromisoformat(check_time_iso.replace("Z", "+00:00")) if check_time_iso else datetime.now(tz)
    
    # Default sun times if omitted (06:00 and 18:00 local)
    ref_date = now_dt.date()
    if sunrise_iso:
        s_rise = datetime.fromisoformat(sunrise_iso.replace("Z", "+00:00"))
    else:
        s_rise = datetime.combine(ref_date, time(6, 0), tzinfo=tz)
        
    if sunset_iso:
        s_set = datetime.fromisoformat(sunset_iso.replace("Z", "+00:00"))
    else:
        s_set = datetime.combine(ref_date, time(18, 0), tzinfo=tz)
        
    next_s_rise = s_rise + timedelta(days=1)
    
    # Identify birth bird
    if birth_nakshatra_num:
        bird = determine_birth_bird_from_nakshatra(birth_nakshatra_num, is_waxing)
        source = f"Nakshatra #{birth_nakshatra_num} ({'Waxing / Shukla' if is_waxing else 'Waning / Krishna'})"
    elif name:
        bird = determine_birth_bird_from_name(name)
        source = f"Phonetic First Vowel of Name: {name}"
    else:
        bird = "Vulture"
        source = "Default Standard"

    # Determine day/night yamas
    day_yamas, night_yamas = get_day_night_yamas(s_rise, s_set, next_s_rise)
    
    # Determine which yama is currently active
    is_day = s_rise <= now_dt < s_set
    active_yama_idx = 0
    active_yama_info = None
    
    if is_day:
        target_yamas = day_yamas
    else:
        target_yamas = night_yamas
        
    for idx, y in enumerate(target_yamas):
        y_start = datetime.fromisoformat(y["start_time"])
        y_end = datetime.fromisoformat(y["end_time"])
        if y_start <= now_dt < y_end:
            active_yama_idx = idx
            active_yama_info = y
            break
            
    if not active_yama_info:
        active_yama_info = target_yamas[0]
        active_yama_idx = 0
        
    current_activity = get_activity_for_yama(
        bird=bird,
        weekday_idx=now_dt.weekday(),
        yama_num=active_yama_idx + 1,
        is_day=is_day,
        is_waxing=is_waxing
    )
    
    strength_weight = ACTIVITY_WEIGHTS.get(current_activity, 0.5)
    
    # Build complete schedule for user
    schedule = []
    for y in day_yamas:
        act = get_activity_for_yama(bird, now_dt.weekday(), y["yama_number"], is_day=True, is_waxing=is_waxing)
        schedule.append({
            "yama": y["yama_number"],
            "period": "Day",
            "start": y["start_time"],
            "end": y["end_time"],
            "activity": act,
            "activity_tamil": TAMIL_ACTIVITY_NAMES.get(act, act),
            "strength_score": int(ACTIVITY_WEIGHTS.get(act, 0.5) * 100)
        })
    for y in night_yamas:
        act = get_activity_for_yama(bird, now_dt.weekday(), y["yama_number"], is_day=False, is_waxing=is_waxing)
        schedule.append({
            "yama": y["yama_number"],
            "period": "Night",
            "start": y["start_time"],
            "end": y["end_time"],
            "activity": act,
            "activity_tamil": TAMIL_ACTIVITY_NAMES.get(act, act),
            "strength_score": int(ACTIVITY_WEIGHTS.get(act, 0.5) * 100)
        })
        
    return {
        "birth_bird": bird,
        "birth_bird_tamil": TAMIL_BIRD_NAMES.get(bird, bird),
        "derivation_source": source,
        "paksha": "Shukla (Waxing Moon)" if is_waxing else "Krishna (Waning Moon)",
        "current_evaluation": {
            "check_time": now_dt.isoformat(),
            "period_type": "Day" if is_day else "Night",
            "active_yama": active_yama_info["yama_number"],
            "current_activity": current_activity,
            "current_activity_tamil": TAMIL_ACTIVITY_NAMES.get(current_activity, current_activity),
            "strength_score_pct": int(strength_weight * 100),
            "guidance": _generate_guidance(current_activity, bird)
        },
        "daily_biorhythm_schedule": schedule
    }

def _generate_guidance(activity: str, bird: str) -> str:
    if activity == "Ruling":
        return f"Peak bio-rhythm for {bird}! Prime time for negotiations, signatures, strategic decisions, investments, and competitive presentations."
    elif activity == "Eating":
        return f"High energy and receptive state. Excellent for learning, creative work, vital nourishing activities, and collaborative planning."
    elif activity == "Walking":
        return f"Moderate energy. Favorable for routine tasks, travel, communications, and administrative execution."
    elif activity == "Sleeping":
        return f"Passive low energy phase. Best suited for rest, meditation, introspection, and background planning. Postpone contentious debates."
    else:
        return f"Critical vulnerability window. Avoid signing binding agreements, major financial risk, surgery, or confrontation during this Yama."
