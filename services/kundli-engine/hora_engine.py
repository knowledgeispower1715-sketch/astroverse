"""
Hourly Vedic Prediction Engine:
Combines classical Chaldean Planetary Horas with Transit (Gochara) Aspects.
Hora sequence from local sunrise: Sun -> Venus -> Mercury -> Moon -> Saturn -> Jupiter -> Mars.
"""
from datetime import datetime, timedelta

CHALDEAN_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]

DAY_LORDS = {
    0: "Moon",     # Monday
    1: "Mars",     # Tuesday
    2: "Mercury",  # Wednesday
    3: "Jupiter",  # Thursday
    4: "Venus",    # Friday
    5: "Saturn",   # Saturday
    6: "Sun"       # Sunday
}

HORA_PRODUCTIVITY_SCORES = {
    "Jupiter": {"score": 95, "theme": "Wealth, Wisdom & Big Financial Decisions", "color": "#FFD700"},
    "Venus":   {"score": 90, "theme": "Creative Endeavors, Romance & High-Value Shopping", "color": "#FF69B4"},
    "Mercury": {"score": 85, "theme": "Contracts, Trading, Communication & Documentation", "color": "#00CED1"},
    "Moon":    {"score": 75, "theme": "Public Engagement, Family & Short Journeys", "color": "#C0C0C0"},
    "Sun":     {"score": 70, "theme": "Government Work, Meeting Superiors & Leadership", "color": "#FFA500"},
    "Mars":    {"score": 45, "theme": "Physical Work; Postpone Legal Disputes & Aggression", "color": "#FF4500"},
    "Saturn":  {"score": 35, "theme": "Routine Labor; Avoid Starting New Ventures", "color": "#4B0082"}
}

def calculate_24h_horas(sunrise_dt: datetime, sunset_dt: datetime):
    day_duration = (sunset_dt - sunrise_dt).total_seconds() / 12.0
    night_duration = ((sunrise_dt + timedelta(days=1)) - sunset_dt).total_seconds() / 12.0

    weekday = sunrise_dt.weekday()
    start_lord = DAY_LORDS[weekday]
    start_idx = CHALDEAN_ORDER.index(start_lord)

    timeline = []
    # 12 Daytime Horas
    for i in range(12):
        s_time = sunrise_dt + timedelta(seconds=i * day_duration)
        e_time = s_time + timedelta(seconds=day_duration)
        planet = CHALDEAN_ORDER[(start_idx + i) % 7]
        timeline.append({
            "hora": i + 1,
            "period": "Day",
            "start": s_time.strftime("%I:%M %p"),
            "end": e_time.strftime("%I:%M %p"),
            "ruling_planet": planet,
            **HORA_PRODUCTIVITY_SCORES[planet]
        })

    # 12 Nighttime Horas
    night_idx = (start_idx + 12) % 7
    for i in range(12):
        s_time = sunset_dt + timedelta(seconds=i * night_duration)
        e_time = s_time + timedelta(seconds=night_duration)
        planet = CHALDEAN_ORDER[(night_idx + i) % 7]
        timeline.append({
            "hora": i + 13,
            "period": "Night",
            "start": s_time.strftime("%I:%M %p"),
            "end": e_time.strftime("%I:%M %p"),
            "ruling_planet": planet,
            **HORA_PRODUCTIVITY_SCORES[planet]
        })

    return timeline
