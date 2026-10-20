"""
Vimshottari Dasha Engine (120-Year Parashari Cycle):
Calculates Mahadasha, Antardasha (Bhukti), and Pratyantardasha with exact start/end dates.
Sequence: Ketu (7y), Venus (20y), Sun (6y), Moon (10y), Mars (7y),
          Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y).
Total Cycle = 120 Years.
"""
from datetime import datetime, timedelta

DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {
    "Ketu": 7.0, "Venus": 20.0, "Sun": 6.0, "Moon": 10.0,
    "Mars": 7.0, "Rahu": 18.0, "Jupiter": 16.0, "Saturn": 19.0, "Mercury": 17.0
}
TOTAL_CYCLE_YEARS = 120.0

def calculate_antardashas(maha_lord: str, maha_start: datetime, maha_years: float):
    """Calculates the 9 Antardashas within a Mahadasha."""
    start_idx = DASHA_LORDS.index(maha_lord)
    antardashas = []
    curr = maha_start

    for i in range(9):
        antar_lord = DASHA_LORDS[(start_idx + i) % 9]
        antar_years = (DASHA_YEARS[maha_lord] * DASHA_YEARS[antar_lord]) / TOTAL_CYCLE_YEARS
        antar_days = antar_years * 365.2425
        end_dt = curr + timedelta(days=antar_days)

        antardashas.append({
            "antar_dasha": antar_lord,
            "start_date": curr.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "duration_months": round(antar_years * 12.0, 1)
        })
        curr = end_dt

    return antardashas

def calculate_vimshottari_dasha(moon_degree: float, dob_dt: datetime):
    """
    Calculates full Vimshottari Dasha timeline from birth to 100+ years,
    with sub-periods and active Mahadasha / Antardasha / Pratyantardasha.
    """
    nak_span = 360.0 / 27.0  # 13°20'
    nak_idx = int(moon_degree / nak_span) % 27
    degree_into_nak = moon_degree % nak_span
    fraction_passed = degree_into_nak / nak_span

    # Nakshatra Lord determines birth Dasha
    first_lord_idx = nak_idx % 9
    first_lord = DASHA_LORDS[first_lord_idx]
    first_lord_total_years = DASHA_YEARS[first_lord]

    # Remaining balance at birth
    remaining_years_first_dasha = first_lord_total_years * (1.0 - fraction_passed)

    dashas = []
    current_start = dob_dt

    # 1. Initial Balance Mahadasha
    initial_end = current_start + timedelta(days=remaining_years_first_dasha * 365.2425)
    first_antardashas = calculate_antardashas(first_lord, current_start, remaining_years_first_dasha)
    dashas.append({
        "maha_dasha": first_lord,
        "start_date": current_start.strftime("%Y-%m-%d"),
        "end_date": initial_end.strftime("%Y-%m-%d"),
        "duration_years": round(remaining_years_first_dasha, 2),
        "antardashas": first_antardashas,
        "is_active_at_birth": True
    })
    current_start = initial_end

    # 2. Subsequent 8 Mahadashas
    for i in range(1, 9):
        lord = DASHA_LORDS[(first_lord_idx + i) % 9]
        years = DASHA_YEARS[lord]
        d_end = current_start + timedelta(days=years * 365.2425)
        antardashas = calculate_antardashas(lord, current_start, years)

        dashas.append({
            "maha_dasha": lord,
            "start_date": current_start.strftime("%Y-%m-%d"),
            "end_date": d_end.strftime("%Y-%m-%d"),
            "duration_years": years,
            "antardashas": antardashas,
            "is_active_at_birth": False
        })
        current_start = d_end

    # 3. Locate active period as of current time
    now = datetime.now()
    active_maha = None
    active_antar = None

    for d in dashas:
        d_start = datetime.fromisoformat(d["start_date"])
        d_end = datetime.fromisoformat(d["end_date"])
        if d_start <= now <= d_end:
            active_maha = d
            for ad in d.get("antardashas", []):
                ad_start = datetime.fromisoformat(ad["start_date"])
                ad_end = datetime.fromisoformat(ad["end_date"])
                if ad_start <= now <= ad_end:
                    active_antar = ad
                    break
            break

    if not active_maha:
        active_maha = dashas[0]
        active_antar = dashas[0]["antardashas"][0]

    # Calculate percentage progress through active Mahadasha
    m_start = datetime.fromisoformat(active_maha["start_date"])
    m_end = datetime.fromisoformat(active_maha["end_date"])
    total_sec = (m_end - m_start).total_seconds()
    passed_sec = max(0, (now - m_start).total_seconds())
    progress_pct = min(100.0, round((passed_sec / total_sec) * 100.0, 1)) if total_sec > 0 else 0.0

    return {
        "birth_balance": {
            "ruling_lord": first_lord,
            "years_remaining": round(remaining_years_first_dasha, 2),
            "nakshatra_number": nak_idx + 1
        },
        "active_now": {
            "maha_dasha": active_maha["maha_dasha"],
            "antar_dasha": active_antar["antar_dasha"] if active_antar else active_maha["maha_dasha"],
            "start_date": active_maha["start_date"],
            "end_date": active_maha["end_date"],
            "progress_percent": progress_pct
        },
        "timeline": dashas
    }
