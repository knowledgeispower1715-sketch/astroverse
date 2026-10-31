"""
Vimshottari Dasha Engine (120-Year Classical Parashari Cycle):
Calculates Mahadasha, Antardasha (Bhukti), and Pratyantardasha with exact start/end boundaries.
Sequence: Ketu (7y), Venus (20y), Sun (6y), Moon (10y), Mars (7y),
          Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y).
Total Cycle = 120.0 Years.
Authority: Brihat Parashara Hora Shastra, Ch. 46 (Vimshottari Dasha Adhyaya).
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {
    "Ketu": 7.0, "Venus": 20.0, "Sun": 6.0, "Moon": 10.0,
    "Mars": 7.0, "Rahu": 18.0, "Jupiter": 16.0, "Saturn": 19.0, "Mercury": 17.0
}
TOTAL_CYCLE_YEARS = 120.0

NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Moola", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

DAYS_PER_YEAR = 365.2425

def calculate_antardashas(
    maha_lord: str,
    maha_start: datetime,
    maha_years: float,
    ref_dt: datetime
) -> List[Dict[str, Any]]:
    """
    Calculates the 9 proportional Antardashas within a Mahadasha.
    Antardasha duration formula = (Maha_Years * Antar_Years) / 120.0
    Sum of 9 Antardashas exactly equals maha_years.
    """
    start_idx = DASHA_LORDS.index(maha_lord)
    antardashas = []
    curr = maha_start

    for i in range(9):
        antar_lord = DASHA_LORDS[(start_idx + i) % 9]
        antar_fraction = DASHA_YEARS[antar_lord] / TOTAL_CYCLE_YEARS
        antar_years = maha_years * antar_fraction
        antar_days = antar_years * DAYS_PER_YEAR
        end_dt = curr + timedelta(days=antar_days)

        status = "FUTURE"
        is_active = False
        if end_dt <= ref_dt:
            status = "PAST"
        elif curr <= ref_dt <= end_dt:
            status = "CURRENT"
            is_active = True

        antardashas.append({
            "antar_dasha": antar_lord,
            "start_date": curr.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "duration_months": round(antar_years * 12.0, 1),
            "duration_years": round(antar_years, 3),
            "status": status,
            "is_active": is_active
        })
        curr = end_dt

    return antardashas

def calculate_pratyantardashas(
    antar_lord: str,
    antar_start: datetime,
    antar_end: datetime,
    ref_dt: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    Calculates the 9 proportional Pratyantardashas (PDS / sub-sub-periods) within an Antardasha.
    PDS duration formula = (Antar_Duration * PDS_Lord_Years) / 120.0
    Sum of 9 Pratyantardashas exactly equals the parent Antardasha duration.
    Authority: Brihat Parashara Hora Shastra, Ch. 46 (Vimshottari Dasha Sub-Sub-Division).
    """
    if ref_dt is None:
        ref_dt = datetime.now()

    start_idx = DASHA_LORDS.index(antar_lord)
    pratyantardashas = []
    total_sec = (antar_end - antar_start).total_seconds()
    curr = antar_start

    for i in range(9):
        pds_lord = DASHA_LORDS[(start_idx + i) % 9]
        pds_fraction = DASHA_YEARS[pds_lord] / TOTAL_CYCLE_YEARS
        pds_seconds = total_sec * pds_fraction
        end_dt = curr + timedelta(seconds=pds_seconds)

        status = "FUTURE"
        is_active = False
        if end_dt <= ref_dt:
            status = "PAST"
        elif curr <= ref_dt <= end_dt:
            status = "CURRENT"
            is_active = True

        pratyantardashas.append({
            "pratyantar_dasha": pds_lord,
            "start_date": curr.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "duration_days": round(pds_seconds / 86400.0, 2),
            "status": status,
            "is_active": is_active
        })
        curr = end_dt

    return pratyantardashas

def calculate_vimshottari_dasha(
    moon_degree: float,
    dob_dt: datetime,
    ref_dt: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Calculates full Vimshottari Dasha timeline from birth through the complete 120-year cycle,
    with exact calendar boundaries, sub-periods (Antardashas), and current active periods.

    Parameters:
    - moon_degree: Natal Moon sidereal longitude (0.0 to 360.0).
    - dob_dt: Exact Date and Time of Birth (datetime object).
    - ref_dt: Query reference instant (defaults to current time).
    """
    if ref_dt is None:
        ref_dt = datetime.now()

    # 1. Moon Nakshatra & Dasha Balance at Birth
    nak_span = 360.0 / 27.0  # 13°20' (13.3333... degrees)
    nak_idx = int(moon_degree / nak_span) % 27
    degree_into_nak = moon_degree % nak_span
    fraction_passed = degree_into_nak / nak_span
    fraction_remaining = 1.0 - fraction_passed

    first_lord_idx = nak_idx % 9
    first_lord = DASHA_LORDS[first_lord_idx]
    first_lord_total_years = DASHA_YEARS[first_lord]

    # Remaining years of initial birth Mahadasha
    remaining_years_first_dasha = first_lord_total_years * fraction_remaining
    elapsed_years_first_dasha = first_lord_total_years * fraction_passed

    # Nominal Mahadasha start date (astronomical start before birth)
    nominal_birth_dasha_start = dob_dt - timedelta(days=elapsed_years_first_dasha * DAYS_PER_YEAR)
    birth_dasha_end = dob_dt + timedelta(days=remaining_years_first_dasha * DAYS_PER_YEAR)

    dashas = []

    # 2. Birth Mahadasha (Cycle #1)
    first_antardashas = calculate_antardashas(
        first_lord, nominal_birth_dasha_start, first_lord_total_years, ref_dt
    )

    first_status = "FUTURE"
    first_is_active = False
    if birth_dasha_end <= ref_dt:
        first_status = "PAST"
    elif nominal_birth_dasha_start <= ref_dt <= birth_dasha_end:
        first_status = "CURRENT"
        first_is_active = True

    dashas.append({
        "maha_dasha": first_lord,
        "start_date": nominal_birth_dasha_start.strftime("%Y-%m-%d"),
        "end_date": birth_dasha_end.strftime("%Y-%m-%d"),
        "duration_years": first_lord_total_years,
        "years_remaining_at_birth": round(remaining_years_first_dasha, 2),
        "status": first_status,
        "is_active": first_is_active,
        "is_active_at_birth": True,
        "antardashas": first_antardashas
    })

    # 3. Subsequent 8 Mahadashas (completing the full 120-year cycle)
    current_start = birth_dasha_end
    for i in range(1, 9):
        lord = DASHA_LORDS[(first_lord_idx + i) % 9]
        years = DASHA_YEARS[lord]
        d_end = current_start + timedelta(days=years * DAYS_PER_YEAR)
        antardashas = calculate_antardashas(lord, current_start, years, ref_dt)

        status = "FUTURE"
        is_active = False
        if d_end <= ref_dt:
            status = "PAST"
        elif current_start <= ref_dt <= d_end:
            status = "CURRENT"
            is_active = True

        dashas.append({
            "maha_dasha": lord,
            "start_date": current_start.strftime("%Y-%m-%d"),
            "end_date": d_end.strftime("%Y-%m-%d"),
            "duration_years": years,
            "years_remaining_at_birth": years,
            "status": status,
            "is_active": is_active,
            "is_active_at_birth": False,
            "antardashas": antardashas
        })
        current_start = d_end

    # 4. Locate active period as of reference instant (ref_dt)
    active_maha = None
    active_antar = None
    next_antar_lord = None
    next_maha_lord = None

    for m_idx, d in enumerate(dashas):
        d_start = datetime.fromisoformat(d["start_date"])
        d_end = datetime.fromisoformat(d["end_date"])
        if d_start <= ref_dt <= d_end:
            active_maha = d
            next_maha_lord = dashas[(m_idx + 1) % len(dashas)]["maha_dasha"]
            ads = d.get("antardashas", [])
            for a_idx, ad in enumerate(ads):
                ad_start = datetime.fromisoformat(ad["start_date"])
                ad_end = datetime.fromisoformat(ad["end_date"])
                if ad_start <= ref_dt <= ad_end:
                    active_antar = ad
                    if a_idx + 1 < len(ads):
                        next_antar_lord = ads[a_idx + 1]["antar_dasha"]
                    else:
                        next_ad_lord_idx = (DASHA_LORDS.index(next_maha_lord)) % 9
                        next_antar_lord = DASHA_LORDS[next_ad_lord_idx]
                    break
            break

    # Fallback to first if before nominal start or historical
    if not active_maha:
        active_maha = dashas[0]
        active_antar = dashas[0]["antardashas"][0]
        next_antar_lord = dashas[0]["antardashas"][1]["antar_dasha"] if len(dashas[0]["antardashas"]) > 1 else None
        next_maha_lord = dashas[1]["maha_dasha"]

    # Calculate exact progress percentages
    m_start = datetime.fromisoformat(active_maha["start_date"])
    m_end = datetime.fromisoformat(active_maha["end_date"])
    m_total_sec = max(1.0, (m_end - m_start).total_seconds())
    m_passed_sec = max(0.0, min(m_total_sec, (ref_dt - m_start).total_seconds()))
    maha_progress_pct = round((m_passed_sec / m_total_sec) * 100.0, 1)

    a_start = datetime.fromisoformat(active_antar["start_date"])
    a_end = datetime.fromisoformat(active_antar["end_date"])
    a_total_sec = max(1.0, (a_end - a_start).total_seconds())
    a_passed_sec = max(0.0, min(a_total_sec, (ref_dt - a_start).total_seconds()))
    antar_progress_pct = round((a_passed_sec / a_total_sec) * 100.0, 1)

    # 5. Calculate 9 Pratyantardashas (PDS) for active Antardasha
    active_antar_lord = active_antar["antar_dasha"] if active_antar else active_maha["maha_dasha"]
    active_pds_list = calculate_pratyantardashas(active_antar_lord, a_start, a_end, ref_dt)

    active_pds = None
    next_pds_lord = None
    for p_idx, p in enumerate(active_pds_list):
        if p.get("is_active"):
            active_pds = p
            if p_idx + 1 < len(active_pds_list):
                next_pds_lord = active_pds_list[p_idx + 1]["pratyantar_dasha"]
            break

    if not active_pds and active_pds_list:
        active_pds = active_pds_list[0]
        next_pds_lord = active_pds_list[1]["pratyantar_dasha"] if len(active_pds_list) > 1 else None

    pds_start = datetime.fromisoformat(active_pds["start_date"]) if active_pds else a_start
    pds_end = datetime.fromisoformat(active_pds["end_date"]) if active_pds else a_end
    p_total_sec = max(1.0, (pds_end - pds_start).total_seconds())
    p_passed_sec = max(0.0, min(p_total_sec, (ref_dt - pds_start).total_seconds()))
    pds_progress_pct = round((p_passed_sec / p_total_sec) * 100.0, 1)

    return {
        "birth_balance": {
            "ruling_lord": first_lord,
            "years_remaining": round(remaining_years_first_dasha, 2),
            "nakshatra_number": nak_idx + 1,
            "nakshatra_name": NAKSHATRA_NAMES[nak_idx],
            "fraction_remaining": round(fraction_remaining, 4)
        },
        "active_now": {
            "maha_dasha": active_maha["maha_dasha"],
            "antar_dasha": active_antar_lord,
            "pratyantar_dasha": active_pds["pratyantar_dasha"] if active_pds else active_antar_lord,
            "maha_start_date": active_maha["start_date"],
            "maha_end_date": active_maha["end_date"],
            "antar_start_date": active_antar["start_date"] if active_antar else active_maha["start_date"],
            "antar_end_date": active_antar["end_date"] if active_antar else active_maha["end_date"],
            "pratyantar_start_date": active_pds["start_date"] if active_pds else (active_antar["start_date"] if active_antar else active_maha["start_date"]),
            "pratyantar_end_date": active_pds["end_date"] if active_pds else (active_antar["end_date"] if active_antar else active_maha["end_date"]),
            "next_transition_date": active_antar["end_date"] if active_antar else active_maha["end_date"],
            "next_antar_dasha": next_antar_lord,
            "next_maha_dasha": next_maha_lord,
            "next_pratyantar_dasha": next_pds_lord,
            "maha_progress_pct": maha_progress_pct,
            "antar_progress_pct": antar_progress_pct,
            "pds_progress_pct": pds_progress_pct,
            "pratyantardashas": active_pds_list,
            # Backward-compatibility aliases:
            "start_date": active_maha["start_date"],
            "end_date": active_maha["end_date"],
            "progress_percent": maha_progress_pct
        },
        "timeline": dashas
    }
