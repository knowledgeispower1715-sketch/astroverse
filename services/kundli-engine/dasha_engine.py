"""
Vimshottari Dasha Engine (120-Year Classical Parashari Cycle):
Calculates Mahadasha, Antardasha (Bhukti), and Pratyantardasha with exact start/end boundaries.
Sequence: Ketu (7y), Venus (20y), Sun (6y), Moon (10y), Mars (7y),
          Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y).
Total Cycle = 120.0 Years.
Authority: Brihat Parashara Hora Shastra, Ch. 46 (Vimshottari Dasha Adhyaya).
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

try:
    import swisseph as swe
except ImportError:
    swe = None

METHODOLOGY_VERSION = "2.0.0-gregorian-exact"

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

NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
]

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

DAYS_PER_YEAR = 365.2425

def _normalize_dt(d: Optional[datetime]) -> datetime:
    """
    Normalizes any datetime (offset-aware or naive) into an unambiguous
    timezone-naive UTC datetime to prevent TypeError comparisons.
    """
    if d is None:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    if d.tzinfo is not None:
        return d.astimezone(timezone.utc).replace(tzinfo=None)
    return d

def calculate_antardashas(
    maha_lord: str,
    maha_start: datetime,
    maha_years: float,
    ref_dt: datetime,
    include_pds: bool = False
) -> List[Dict[str, Any]]:
    """
    Calculates the 9 proportional Antardashas within a Mahadasha.
    Antardasha duration formula = (Maha_Years * Antar_Years) / 120.0
    Sum of 9 Antardashas exactly equals maha_years with zero cumulative drift.
    """
    maha_start = _normalize_dt(maha_start)
    ref_dt = _normalize_dt(ref_dt)
    start_idx = DASHA_LORDS.index(maha_lord)
    antardashas = []
    curr = maha_start
    total_maha_end = maha_start + timedelta(days=maha_years * DAYS_PER_YEAR)

    running_ad_days = 0.0
    for i in range(9):
        antar_lord = DASHA_LORDS[(start_idx + i) % 9]
        antar_fraction = DASHA_YEARS[antar_lord] / TOTAL_CYCLE_YEARS
        antar_years = maha_years * antar_fraction
        antar_days = antar_years * DAYS_PER_YEAR

        # For the final (9th) Antardasha, clamp end_dt strictly to total_maha_end to eliminate any floating-point drift
        if i == 8:
            end_dt = total_maha_end
            ad_days = round(max(0.0, ((total_maha_end - maha_start).total_seconds() / 86400.0) - running_ad_days), 2)
        else:
            end_dt = curr + timedelta(days=antar_days)
            ad_days = round(antar_days, 2)
            running_ad_days += ad_days

        status = "FUTURE"
        is_active = False
        if end_dt <= ref_dt:
            status = "PAST"
        elif (curr <= ref_dt < end_dt) or (i == 8 and curr <= ref_dt <= end_dt):
            status = "CURRENT"
            is_active = True

        ad_dict: Dict[str, Any] = {
            "antar_dasha": antar_lord,
            "start_date": curr.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "start_iso": curr.isoformat(),
            "end_iso": end_dt.isoformat(),
            "duration_months": round(antar_years * 12.0, 1),
            "duration_years": round(antar_years, 3),
            "duration_days": ad_days,
            "status": status,
            "is_active": is_active
        }

        if include_pds:
            ad_dict["pratyantardashas"] = calculate_pratyantardashas(antar_lord, curr, end_dt, ref_dt)

        antardashas.append(ad_dict)
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
    Sum of 9 Pratyantardashas exactly equals the parent Antardasha duration with zero drift.
    Authority: Brihat Parashara Hora Shastra, Ch. 46 (Vimshottari Dasha Sub-Sub-Division).
    """
    antar_start = _normalize_dt(antar_start)
    antar_end = _normalize_dt(antar_end)
    ref_dt = _normalize_dt(ref_dt)

    start_idx = DASHA_LORDS.index(antar_lord)
    pratyantardashas = []
    total_sec = max(0.0, (antar_end - antar_start).total_seconds())
    curr = antar_start

    running_pds_days = 0.0
    for i in range(9):
        pds_lord = DASHA_LORDS[(start_idx + i) % 9]
        pds_fraction = DASHA_YEARS[pds_lord] / TOTAL_CYCLE_YEARS
        pds_seconds = total_sec * pds_fraction

        # Clamp 9th PDS end strictly to antar_end for 0-drift continuous boundary
        if i == 8:
            end_dt = antar_end
            pds_seconds = max(0.0, (end_dt - curr).total_seconds())
            pds_days = round(max(0.0, (total_sec / 86400.0) - running_pds_days), 2)
        else:
            end_dt = curr + timedelta(seconds=pds_seconds)
            pds_days = round(pds_seconds / 86400.0, 2)
            running_pds_days += pds_days

        status = "FUTURE"
        is_active = False
        if end_dt <= ref_dt:
            status = "PAST"
        elif (curr <= ref_dt < end_dt) or (i == 8 and curr <= ref_dt <= end_dt):
            status = "CURRENT"
            is_active = True

        pratyantardashas.append({
            "pratyantar_dasha": pds_lord,
            "start_date": curr.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "start_iso": curr.isoformat(),
            "end_iso": end_dt.isoformat(),
            "duration_days": pds_days,
            "status": status,
            "is_active": is_active
        })
        curr = end_dt

    return pratyantardashas

def calculate_antardasha_pds(
    maha_lord: str,
    antar_lord: str,
    antar_start: datetime,
    antar_end: datetime,
    ref_dt: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """Convenience helper to retrieve the 9 Pratyantardashas for a specific parent Antardasha."""
    return calculate_pratyantardashas(antar_lord, antar_start, antar_end, ref_dt)

def calculate_vimshottari_dasha(
    moon_degree: float,
    dob_dt: datetime,
    ref_dt: Optional[datetime] = None,
    include_all_pds: bool = True
) -> Dict[str, Any]:
    """
    Calculates full Vimshottari Dasha timeline from birth through the complete 120-year cycle,
    with exact calendar boundaries, sub-periods (Antardashas), 3rd-tier sub-sub-periods (Pratyantardashas),
    and current active periods.

    Parameters:
    - moon_degree: Natal Moon sidereal longitude (0.0 to 360.0).
    - dob_dt: Exact Date and Time of Birth (datetime object).
    - ref_dt: Query reference instant (defaults to current time).
    - include_all_pds: If True, populates all 9 Pratyantardashas for every Antardasha across the 120-year tree.
    """
    dob_dt = _normalize_dt(dob_dt)
    ref_dt = _normalize_dt(ref_dt)

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
        first_lord, nominal_birth_dasha_start, first_lord_total_years, ref_dt, include_pds=include_all_pds
    )

    first_status = "FUTURE"
    first_is_active = False
    if birth_dasha_end <= ref_dt:
        first_status = "PAST"
    elif nominal_birth_dasha_start <= ref_dt < birth_dasha_end:
        first_status = "CURRENT"
        first_is_active = True

    dashas.append({
        "maha_dasha": first_lord,
        "start_date": nominal_birth_dasha_start.strftime("%Y-%m-%d"),
        "end_date": birth_dasha_end.strftime("%Y-%m-%d"),
        "start_iso": nominal_birth_dasha_start.isoformat(),
        "end_iso": birth_dasha_end.isoformat(),
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
        antardashas = calculate_antardashas(lord, current_start, years, ref_dt, include_pds=include_all_pds)

        status = "FUTURE"
        is_active = False
        if d_end <= ref_dt:
            status = "PAST"
        elif (current_start <= ref_dt < d_end) or (i == 8 and current_start <= ref_dt <= d_end):
            status = "CURRENT"
            is_active = True

        dashas.append({
            "maha_dasha": lord,
            "start_date": current_start.strftime("%Y-%m-%d"),
            "end_date": d_end.strftime("%Y-%m-%d"),
            "start_iso": current_start.isoformat(),
            "end_iso": d_end.isoformat(),
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
    out_of_range_status = None

    for m_idx, d in enumerate(dashas):
        d_start = datetime.fromisoformat(d.get("start_iso", d["start_date"]))
        d_end = datetime.fromisoformat(d.get("end_iso", d["end_date"]))
        is_last_m = (m_idx == len(dashas) - 1)
        # Use half-open interval [start, end) except closed on final boundary of 120-year cycle
        if (d_start <= ref_dt < d_end) or (is_last_m and d_start <= ref_dt <= d_end):
            active_maha = d
            next_maha_lord = dashas[(m_idx + 1) % len(dashas)]["maha_dasha"]
            ads = d.get("antardashas", [])
            for a_idx, ad in enumerate(ads):
                ad_start = datetime.fromisoformat(ad.get("start_iso", ad["start_date"]))
                ad_end = datetime.fromisoformat(ad.get("end_iso", ad["end_date"]))
                is_last_a = (a_idx == len(ads) - 1)
                if (ad_start <= ref_dt < ad_end) or (is_last_a and ad_start <= ref_dt <= ad_end):
                    active_antar = ad
                    if a_idx + 1 < len(ads):
                        next_antar_lord = ads[a_idx + 1]["antar_dasha"]
                    else:
                        next_ad_lord_idx = (DASHA_LORDS.index(next_maha_lord)) % 9
                        next_antar_lord = DASHA_LORDS[next_ad_lord_idx]
                    break
            break

    # Out-of-range detection (before birth or past 120-year lifespan)
    if not active_maha:
        nominal_start_dt = datetime.fromisoformat(dashas[0].get("start_iso", dashas[0]["start_date"]))
        if ref_dt < nominal_start_dt:
            out_of_range_status = "PRE_NATAL"
            active_maha = dashas[0]
            active_antar = dashas[0]["antardashas"][0]
            next_antar_lord = dashas[0]["antardashas"][1]["antar_dasha"] if len(dashas[0]["antardashas"]) > 1 else None
            next_maha_lord = dashas[1]["maha_dasha"]
        else:
            out_of_range_status = "EXPIRED_LIFESPAN"
            active_maha = dashas[-1]
            active_antar = dashas[-1]["antardashas"][-1]
            next_antar_lord = DASHA_LORDS[0]
            next_maha_lord = DASHA_LORDS[0]

    # Calculate exact progress percentages & day counts
    m_start = datetime.fromisoformat(active_maha.get("start_iso", active_maha["start_date"]))
    m_end = datetime.fromisoformat(active_maha.get("end_iso", active_maha["end_date"]))
    m_total_sec = max(1.0, (m_end - m_start).total_seconds())
    m_passed_sec = max(0.0, min(m_total_sec, (ref_dt - m_start).total_seconds()))
    maha_progress_pct = round((m_passed_sec / m_total_sec) * 100.0, 1)
    maha_total_days = round(m_total_sec / 86400.0, 1)
    maha_days_elapsed = round(m_passed_sec / 86400.0, 1)
    maha_days_remaining = round(max(0.0, (m_end - ref_dt).total_seconds() / 86400.0), 1)

    a_start = datetime.fromisoformat(active_antar.get("start_iso", active_antar["start_date"]))
    a_end = datetime.fromisoformat(active_antar.get("end_iso", active_antar["end_date"]))
    a_total_sec = max(1.0, (a_end - a_start).total_seconds())
    a_passed_sec = max(0.0, min(a_total_sec, (ref_dt - a_start).total_seconds()))
    antar_progress_pct = round((a_passed_sec / a_total_sec) * 100.0, 1)
    antar_total_days = round(a_total_sec / 86400.0, 1)
    antar_days_elapsed = round(a_passed_sec / 86400.0, 1)
    antar_days_remaining = round(max(0.0, (a_end - ref_dt).total_seconds() / 86400.0), 1)

    # 5. Calculate 9 Pratyantardashas (PDS) for active Antardasha
    active_antar_lord = active_antar["antar_dasha"] if active_antar else active_maha["maha_dasha"]
    active_pds_list = calculate_pratyantardashas(active_antar_lord, a_start, a_end, ref_dt)

    active_pds = None
    next_pds_lord = None
    for p_idx, p in enumerate(active_pds_list):
        p_start_dt = datetime.fromisoformat(p.get("start_iso", p["start_date"]))
        p_end_dt = datetime.fromisoformat(p.get("end_iso", p["end_date"]))
        is_last_p = (p_idx == len(active_pds_list) - 1)
        if (p_start_dt <= ref_dt < p_end_dt) or (is_last_p and p_start_dt <= ref_dt <= p_end_dt):
            active_pds = p
            p["is_active"] = True
            p["status"] = "CURRENT"
            if p_idx + 1 < len(active_pds_list):
                next_pds_lord = active_pds_list[p_idx + 1]["pratyantar_dasha"]
            else:
                next_pds_lord = next_antar_lord
            break

    if not active_pds and active_pds_list:
        active_pds = active_pds_list[0]
        next_pds_lord = active_pds_list[1]["pratyantar_dasha"] if len(active_pds_list) > 1 else None

    pds_start = datetime.fromisoformat(active_pds.get("start_iso", active_pds["start_date"])) if active_pds else a_start
    pds_end = datetime.fromisoformat(active_pds.get("end_iso", active_pds["end_date"])) if active_pds else a_end
    p_total_sec = max(1.0, (pds_end - pds_start).total_seconds())
    p_passed_sec = max(0.0, min(p_total_sec, (ref_dt - pds_start).total_seconds()))
    pds_progress_pct = round((p_passed_sec / p_total_sec) * 100.0, 1)
    pds_total_days = round(p_total_sec / 86400.0, 1)
    pds_days_elapsed = round(p_passed_sec / 86400.0, 1)
    pds_days_remaining = round(max(0.0, (pds_end - ref_dt).total_seconds() / 86400.0), 1)

    return {
        "metadata": {
            "calculation_methodology": METHODOLOGY_VERSION,
            "profile": "ASTROVERSE_PARASHARI_LAHIRI_DRIK",
            "days_per_year": DAYS_PER_YEAR,
            "cycle_years": TOTAL_CYCLE_YEARS,
            "dasha_levels": ["Mahadasha", "Antardasha", "Pratyantardasha"],
            "ayanamsha": "Lahiri (Chitra Paksha)",
            "out_of_range_status": out_of_range_status
        },
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
            "maha_start": active_maha["start_date"],
            "maha_end": active_maha["end_date"],
            "antar_start_date": active_antar["start_date"] if active_antar else active_maha["start_date"],
            "antar_end_date": active_antar["end_date"] if active_antar else active_maha["end_date"],
            "antar_start": active_antar["start_date"] if active_antar else active_maha["start_date"],
            "antar_end": active_antar["end_date"] if active_antar else active_maha["end_date"],
            "pratyantar_start_date": active_pds["start_date"] if active_pds else (active_antar["start_date"] if active_antar else active_maha["start_date"]),
            "pratyantar_end_date": active_pds["end_date"] if active_pds else (active_antar["end_date"] if active_antar else active_maha["end_date"]),
            "pratyantar_start": active_pds["start_date"] if active_pds else (active_antar["start_date"] if active_antar else active_maha["start_date"]),
            "pratyantar_end": active_pds["end_date"] if active_pds else (active_antar["end_date"] if active_antar else active_maha["end_date"]),
            "next_transition_date": active_pds["end_date"] if active_pds else (active_antar["end_date"] if active_antar else active_maha["end_date"]),
            "next_antar_dasha_transition_date": active_antar["end_date"] if active_antar else active_maha["end_date"],
            "next_antar_dasha": next_antar_lord,
            "next_maha_dasha": next_maha_lord,
            "next_pratyantar_dasha": next_pds_lord,
            "maha_progress_pct": maha_progress_pct,
            "antar_progress_pct": antar_progress_pct,
            "pds_progress_pct": pds_progress_pct,
            "maha_days_elapsed": maha_days_elapsed,
            "maha_days_remaining": maha_days_remaining,
            "maha_total_days": maha_total_days,
            "antar_days_elapsed": antar_days_elapsed,
            "antar_days_remaining": antar_days_remaining,
            "antar_total_days": antar_total_days,
            "pds_days_elapsed": pds_days_elapsed,
            "pds_days_remaining": pds_days_remaining,
            "pds_total_days": pds_total_days,
            "pratyantardashas": active_pds_list,
            "out_of_range_status": out_of_range_status,
            "is_reference_instant_contained": out_of_range_status is None,
            # Backward-compatibility aliases:
            "start_date": active_maha["start_date"],
            "end_date": active_maha["end_date"],
            "progress_percent": maha_progress_pct
        },
        "timeline": dashas
    }

def compare_vimshottari_conventions(
    moon_degree: float,
    dob_dt: datetime
) -> Dict[str, Any]:
    """
    Computes comparative Vimshottari timelines across the three classical year-length conventions:
    1. Gregorian Mean-Year (365.2425 days) - AstroVerse Primary
    2. Julian Calendar (365.25 days)
    3. Savana Traditional 360-Day Year (360.0 days)
    Returns comparative cycle durations and end-of-life cumulative drift.
    """
    dob_dt = _normalize_dt(dob_dt)
    nak_span = 360.0 / 27.0
    nak_idx = int(moon_degree / nak_span) % 27
    degree_into_nak = moon_degree % nak_span
    fraction_remaining = 1.0 - (degree_into_nak / nak_span)

    first_lord = DASHA_LORDS[nak_idx % 9]
    first_lord_total_years = DASHA_YEARS[first_lord]
    balance_years = first_lord_total_years * fraction_remaining

    conventions = {
        "gregorian_mean": 365.2425,
        "julian": 365.25,
        "savana_360": 360.0
    }

    results = {}
    greg_end = None

    for conv_name, d_per_yr in conventions.items():
        total_cycle_days = 120.0 * d_per_yr
        balance_days = balance_years * d_per_yr
        lived_120_end = dob_dt + timedelta(days=(120.0 - (first_lord_total_years - balance_years)) * d_per_yr)
        
        if conv_name == "gregorian_mean":
            greg_end = lived_120_end

        drift_days = round((lived_120_end - greg_end).total_seconds() / 86400.0, 2) if greg_end else 0.0

        results[conv_name] = {
            "days_per_year": d_per_yr,
            "total_120_cycle_days": round(total_cycle_days, 1),
            "birth_balance_days": round(balance_days, 2),
            "timeline_end_iso": lived_120_end.strftime("%Y-%m-%d"),
            "drift_vs_gregorian_days": drift_days
        }

    return {
        "moon_degree": round(moon_degree, 4),
        "nakshatra": NAKSHATRA_NAMES[nak_idx],
        "birth_lord": first_lord,
        "conventions": results,
        "methodology_note": "AstroVerse defaults to Gregorian Mean-Year (365.2425 d) for civil calendar alignment. Julian differs by <1 day over 120 years. Savana 360-day accumulates -629 days (~1.72 years) drift."
    }

def calculate_live_transits(
    ref_dt: Optional[datetime] = None,
    natal_lagna_idx: Optional[int] = None,
    natal_moon_idx: Optional[int] = None,
    sav_bindus: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Computes high-precision Sidereal Vedic planetary transits (Gochara) using Swiss Ephemeris (Lahiri Ayanamsha).
    Cross-references each transiting planet against:
    1. Natal Lagna (House from Lagna)
    2. Natal Moon (House from Moon - VedAstro Gochara principles)
    3. Sarvashtakavarga (SAV) Bindus for the transiting sign
    4. Sade Sati, Kantaka Shani, and Chandrashtama diagnostics
    """
    if swe is None:
        raise RuntimeError("Swiss Ephemeris (swisseph) is not installed.")

    swe.set_sid_mode(swe.SIDM_LAHIRI)

    if ref_dt is None:
        ref_dt = datetime.now(timezone.utc)
    elif ref_dt.tzinfo is None:
        ref_dt = ref_dt.replace(tzinfo=timezone.utc)
    else:
        ref_dt = ref_dt.astimezone(timezone.utc)

    jd_ut = swe.julday(
        ref_dt.year, ref_dt.month, ref_dt.day,
        ref_dt.hour + ref_dt.minute / 60.0 + ref_dt.second / 3600.0
    )

    PLANET_SPECS = [
        ("Sun", swe.SUN, "Surya"),
        ("Moon", swe.MOON, "Chandra"),
        ("Mars", swe.MARS, "Mangal"),
        ("Mercury", swe.MERCURY, "Budha"),
        ("Jupiter", swe.JUPITER, "Guru"),
        ("Venus", swe.VENUS, "Shukra"),
        ("Saturn", swe.SATURN, "Shani"),
        ("Rahu", swe.MEAN_NODE, "Rahu (North Node)")
    ]

    # Classical favorable houses from natal Moon (Phaladeepika Ch. 26 & BPHS)
    FAVORABLE_HOUSES_FROM_MOON = {
        "Sun": [3, 6, 10, 11],
        "Moon": [1, 3, 6, 7, 10, 11],
        "Mars": [3, 6, 11],
        "Mercury": [2, 4, 6, 8, 10, 11],
        "Jupiter": [2, 5, 7, 9, 11],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "Saturn": [3, 6, 11],
        "Rahu": [3, 6, 11],
        "Ketu": [3, 6, 11]
    }

    # Normalize SAV bindus lookup
    def get_sav_for_sign(sign_name: str, s_idx: int) -> int:
        if sav_bindus is None:
            return 28
        if isinstance(sav_bindus, list) and len(sav_bindus) >= 12:
            return sav_bindus[s_idx]
        if isinstance(sav_bindus, dict):
            return sav_bindus.get(sign_name, sav_bindus.get(sign_name.lower(), 28))
        return 28

    nak_span = 360.0 / 27.0
    transits = []
    positions_map: Dict[str, Dict[str, Any]] = {}
    rahu_deg = 0.0

    for planet_key, pid, display_name in PLANET_SPECS:
        res, _ = swe.calc_ut(jd_ut, pid, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        deg_360, speed = res[0], res[3]
        if planet_key == "Rahu":
            rahu_deg = deg_360

        sign_idx = int(deg_360 / 30.0) % 12
        sign_name = SIGNS[sign_idx]
        deg_in_sign = deg_360 % 30.0
        nak_idx = int(deg_360 / nak_span) % 27
        pada = int((deg_360 % nak_span) / (nak_span / 4.0)) + 1
        is_retro = speed < 0

        # Degree formatting
        d_int = int(deg_in_sign)
        m_int = int((deg_in_sign - d_int) * 60.0)
        deg_formatted = f"{d_int:02d}° {m_int:02d}'"

        # House relative calculations
        h_lagna = ((sign_idx - natal_lagna_idx + 12) % 12) + 1 if natal_lagna_idx is not None else None
        h_moon = ((sign_idx - natal_moon_idx + 12) % 12) + 1 if natal_moon_idx is not None else None
        bindus = get_sav_for_sign(sign_name, sign_idx)

        # Classical Gochara verdict evaluation
        verdict = "Moderate Fruition"
        verdict_status = "MODERATE"
        verdict_score = 0.5
        rationale = f"{planet_key} transiting {sign_name} ({deg_formatted})."

        if h_moon is not None:
            fav_list = FAVORABLE_HOUSES_FROM_MOON.get(planet_key, [3, 6, 11])
            is_fav_house = h_moon in fav_list
            if is_fav_house and bindus >= 28:
                verdict = "Highly Auspicious & High Support"
                verdict_status = "FAVORABLE"
                verdict_score = 1.0
                rationale = f"Favorable House {h_moon} from natal Moon backed by strong {bindus} SAV bindus."
            elif is_fav_house and bindus < 25:
                verdict = "Subdued Beneficence"
                verdict_status = "MODERATE"
                verdict_score = 0.6
                rationale = f"Auspicious House {h_moon} from natal Moon, but low {bindus} SAV bindus require measured effort."
            elif not is_fav_house and bindus >= 28:
                verdict = "Auspicious SAV Mitigation"
                verdict_status = "MODERATE"
                verdict_score = 0.55
                rationale = f"House {h_moon} demands patience, yet robust {bindus} SAV bindus mitigate friction."
            else:
                verdict = "Cautionary / Demands Care"
                verdict_status = "CAUTION"
                verdict_score = 0.2
                rationale = f"Challenging House {h_moon} with low {bindus} SAV bindus; conscious mindfulness advised."

        transit_entry = {
            "planet": display_name,
            "planet_key": planet_key,
            "sign": sign_name,
            "sign_index": sign_idx,
            "degree": round(deg_in_sign, 2),
            "degree_formatted": deg_formatted,
            "longitude": round(deg_360, 4),
            "speed": round(speed, 5),
            "is_retrograde": is_retro,
            "nakshatra": NAKSHATRA_NAMES[nak_idx],
            "nakshatra_pada": pada,
            "nakshatra_lord": NAKSHATRA_LORDS[nak_idx],
            "house_from_lagna": h_lagna,
            "house_from_moon": h_moon,
            "sav_bindus": bindus,
            "verdict": verdict,
            "verdict_status": verdict_status,
            "verdict_score": verdict_score,
            "classical_rationale": rationale
        }
        transits.append(transit_entry)
        positions_map[planet_key] = transit_entry

    # Ketu (Exactly opposite Rahu: +180°)
    ketu_deg = (rahu_deg + 180.0) % 360.0
    k_sign_idx = int(ketu_deg / 30.0) % 12
    k_sign_name = SIGNS[k_sign_idx]
    k_deg_in_sign = ketu_deg % 30.0
    k_nak_idx = int(ketu_deg / nak_span) % 27
    k_pada = int((ketu_deg % nak_span) / (nak_span / 4.0)) + 1
    k_d_int = int(k_deg_in_sign)
    k_m_int = int((k_deg_in_sign - k_d_int) * 60.0)
    k_deg_formatted = f"{k_d_int:02d}° {k_m_int:02d}'"

    k_h_lagna = ((k_sign_idx - natal_lagna_idx + 12) % 12) + 1 if natal_lagna_idx is not None else None
    k_h_moon = ((k_sign_idx - natal_moon_idx + 12) % 12) + 1 if natal_moon_idx is not None else None
    k_bindus = get_sav_for_sign(k_sign_name, k_sign_idx)

    k_verdict = "Moderate Spiritual Realignment"
    k_verdict_status = "MODERATE"
    k_verdict_score = 0.5
    k_rationale = f"Ketu transiting {k_sign_name} ({k_deg_formatted})."
    if k_h_moon is not None:
        if k_h_moon in [3, 6, 11] and k_bindus >= 28:
            k_verdict = "Spiritual Fortitude & Intuitive Gain"
            k_verdict_status = "FAVORABLE"
            k_verdict_score = 0.9
            k_rationale = f"Favorable House {k_h_moon} with {k_bindus} SAV bindus elevates discernment."
        elif k_h_moon not in [3, 6, 11] and k_bindus < 25:
            k_verdict = "Detachment / Introspective Prudence"
            k_verdict_status = "CAUTION"
            k_verdict_score = 0.3
            k_rationale = f"House {k_h_moon} urges inner reflection and surrender of ego attachments."

    ketu_entry = {
        "planet": "Ketu (South Node)",
        "planet_key": "Ketu",
        "sign": k_sign_name,
        "sign_index": k_sign_idx,
        "degree": round(k_deg_in_sign, 2),
        "degree_formatted": k_deg_formatted,
        "longitude": round(ketu_deg, 4),
        "speed": -0.05,
        "is_retrograde": True,
        "nakshatra": NAKSHATRA_NAMES[k_nak_idx],
        "nakshatra_pada": k_pada,
        "nakshatra_lord": NAKSHATRA_LORDS[k_nak_idx],
        "house_from_lagna": k_h_lagna,
        "house_from_moon": k_h_moon,
        "sav_bindus": k_bindus,
        "verdict": k_verdict,
        "verdict_status": k_verdict_status,
        "verdict_score": k_verdict_score,
        "classical_rationale": k_rationale
    }
    transits.append(ketu_entry)
    positions_map["Ketu"] = ketu_entry

    # Special Transit Conditions (Sade Sati, Kantaka Shani, Chandrashtama)
    sade_sati = {
        "is_active": False,
        "status": "CLEAR",
        "phase": "Inactive",
        "description": "Saturn is transiting outside the 12th, 1st, and 2nd houses from natal Moon."
    }
    kantaka_shani = {
        "is_active": False,
        "type": "None",
        "description": "No active Kantaka Shani or Dhaiya."
    }
    chandrashtama = {
        "is_active": False,
        "description": "Transit Moon is in a safe house relative to natal Moon."
    }

    if natal_moon_idx is not None:
        saturn_h_moon = positions_map["Saturn"]["house_from_moon"]
        saturn_sign = positions_map["Saturn"]["sign"]
        if saturn_h_moon == 12:
            sade_sati = {
                "is_active": True,
                "status": "PRESENT",
                "phase": "Phase 1 (Rising / Aroha)",
                "description": f"Saturn in {saturn_sign} is transiting 12th from natal Moon (Rising Phase). Exercise financial prudence and mental calmness."
            }
        elif saturn_h_moon == 1:
            sade_sati = {
                "is_active": True,
                "status": "PRESENT",
                "phase": "Phase 2 (Peak / Janma Shani)",
                "description": f"Saturn in {saturn_sign} is transiting 1st from natal Moon (Peak Phase). Deep discipline, patience, and profound structural growth."
            }
        elif saturn_h_moon == 2:
            sade_sati = {
                "is_active": True,
                "status": "PRESENT",
                "phase": "Phase 3 (Setting / Avaroha)",
                "description": f"Saturn in {saturn_sign} is transiting 2nd from natal Moon (Setting Phase). Resource consolidation and gradual stabilization."
            }

        # Kantaka Shani / Dhaiya (4th or 8th house)
        if saturn_h_moon == 4:
            kantaka_shani = {
                "is_active": True,
                "type": "Ardha-Ashtama Shani (4th House)",
                "description": f"Saturn in {saturn_sign} transits 4th from natal Moon; maintain serenity in domestic matters."
            }
        elif saturn_h_moon == 8:
            kantaka_shani = {
                "is_active": True,
                "type": "Ashtama Shani (8th House)",
                "description": f"Saturn in {saturn_sign} transits 8th from natal Moon; avoid speculative risks; focus on health."
            }

        # Chandrashtama (Moon in 8th from natal Moon)
        moon_h_moon = positions_map["Moon"]["house_from_moon"]
        if moon_h_moon == 8:
            chandrashtama = {
                "is_active": True,
                "description": "Chandrashtama Active: Transit Moon is transiting 8th from natal Moon (~54 hours). Postpone high-stakes negotiations."
            }

    return {
        "timestamp_utc": ref_dt.isoformat(),
        "ayanamsha": "Lahiri (Chitra Paksha)",
        "ephemeris_engine": "Swiss Ephemeris 2.10 (pyswisseph)",
        "transits": transits,
        "positions_map": positions_map,
        "diagnostics": {
            "sade_sati": sade_sati,
            "kantaka_shani": kantaka_shani,
            "chandrashtama": chandrashtama
        }
    }
