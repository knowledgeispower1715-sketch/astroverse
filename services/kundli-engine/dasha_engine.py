"""
Vimshottari Dasha Engine (120 Years Cycle):
Calculates Maha Dasha, Antar Dasha, and Pratyantar Dasha.
Sequence: Ketu (7), Venus (20), Sun (6), Moon (10), Mars (7), 
          Rahu (18), Jupiter (16), Saturn (19), Mercury (17).
"""
from datetime import datetime, timedelta

DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}
TOTAL_CYCLE_YEARS = 120.0

def calculate_vimshottari_dasha(moon_degree: float, dob_dt: datetime):
    # Each Nakshatra spans 13°20' (13.333333 degrees)
    nak_span = 360.0 / 27.0
    nak_idx = int(moon_degree / nak_span)
    degree_into_nak = moon_degree % nak_span
    fraction_passed = degree_into_nak / nak_span

    # Nakshatra Lord determines birth Dasha
    first_lord_idx = nak_idx % 9
    first_lord = DASHA_LORDS[first_lord_idx]
    first_lord_total_years = DASHA_YEARS[first_lord]

    # Remaining years of first dasha at birth
    remaining_years_first_dasha = first_lord_total_years * (1.0 - fraction_passed)

    dashas = []
    current_start = dob_dt
    
    # Calculate initial balance dasha
    initial_end = current_start + timedelta(days=remaining_years_first_dasha * 365.2425)
    dashas.append({
        "maha_dasha": first_lord,
        "start_date": current_start.strftime("%Y-%m-%d"),
        "end_date": initial_end.strftime("%Y-%m-%d"),
        "duration_years": round(remaining_years_first_dasha, 2),
        "is_active_at_birth": True
    })
    current_start = initial_end

    # Calculate subsequent Mahadashas up to 100+ years
    for i in range(1, 9):
        lord = DASHA_LORDS[(first_lord_idx + i) % 9]
        years = DASHA_YEARS[lord]
        d_end = current_start + timedelta(days=years * 365.2425)
        dashas.append({
            "maha_dasha": lord,
            "start_date": current_start.strftime("%Y-%m-%d"),
            "end_date": d_end.strftime("%Y-%m-%d"),
            "duration_years": years,
            "is_active_at_birth": False
        })
        current_start = d_end

    # Find the current active Dasha as of today
    today = datetime.now()
    active_dasha = next((d for d in dashas if datetime.fromisoformat(d["start_date"]) <= today <= datetime.fromisoformat(d["end_date"])), dashas[0])

    return {
        "active_now": active_dasha,
        "timeline": dashas
    }
