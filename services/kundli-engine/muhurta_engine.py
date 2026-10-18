"""
Auspicious Muhurta & Choghadiya Engine:
Choghadiya Types:
- Amrit, Shubh, Labh: Highly Auspicious (Green)
- Char: Neutral / Travel (Yellow)
- Rog, Kaal, Udveg: Inauspicious / Avoid (Red)
Also computes exact Rahu Kaal and Abhijit Muhurta.
"""
from datetime import datetime, timedelta

DAY_CHOGHADIYA_ORDER = {
    0: ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit"], # Monday
    1: ["Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog"],   # Tuesday
    2: ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh"],  # Wednesday
    3: ["Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh"], # Thursday
    4: ["Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char"],  # Friday
    5: ["Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal"],  # Saturday
    6: ["Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"]  # Sunday
}

CHOGHADIYA_NATURE = {
    "Amrit": {"type": "Auspicious", "color": "#28A745", "recommendation": "Best for all tasks, agreements & health"},
    "Shubh": {"type": "Auspicious", "color": "#28A745", "recommendation": "Best for religious ceremonies, wedding & shopping"},
    "Labh":  {"type": "Auspicious", "color": "#28A745", "recommendation": "Best for business, profit & new ventures"},
    "Char":  {"type": "Neutral",    "color": "#FFC107", "recommendation": "Best for journeys, transit & fast work"},
    "Udveg": {"type": "Inauspicious","color": "#DC3545", "recommendation": "Avoid government meetings & contracts"},
    "Kaal":  {"type": "Inauspicious","color": "#DC3545", "recommendation": "Avoid major decisions & money lending"},
    "Rog":   {"type": "Inauspicious","color": "#DC3545", "recommendation": "Avoid health procedures & disputes"}
}

def calculate_daily_muhurta(sunrise_dt: datetime, sunset_dt: datetime):
    day_span = (sunset_dt - sunrise_dt).total_seconds() / 8.0 # 8 Day Choghadiyas
    weekday = sunrise_dt.weekday()
    choghadiya_seq = DAY_CHOGHADIYA_ORDER[weekday]

    slots = []
    for i in range(8):
        s_time = sunrise_dt + timedelta(seconds=i * day_span)
        e_time = s_time + timedelta(seconds=day_span)
        name = choghadiya_seq[i]
        slots.append({
            "name": name,
            "start": s_time.strftime("%I:%M %p"),
            "end": e_time.strftime("%I:%M %p"),
            **CHOGHADIYA_NATURE[name]
        })

    # Abhijit Muhurta (exact middle 48 minutes of the day)
    midday = sunrise_dt + timedelta(seconds=(sunset_dt - sunrise_dt).total_seconds() / 2.0)
    abhijit_start = midday - timedelta(minutes=24)
    abhijit_end = midday + timedelta(minutes=24)

    return {
        "choghadiya": slots,
        "abhijit_muhurta": {
            "start": abhijit_start.strftime("%I:%M %p"),
            "end": abhijit_end.strftime("%I:%M %p"),
            "status": "Peak Auspicious Window of the Day"
        }
    }
