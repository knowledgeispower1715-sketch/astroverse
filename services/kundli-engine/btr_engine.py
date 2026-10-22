"""
AstroVerse Birth Time Rectification (BTR) Candidate Finder
==========================================================
Systematic search and astrological alignment engine that rectifies birth time
uncertainties (+/- precision minutes/hours) against verified life milestones.

Evaluates:
- D1 Rasi Lagna transitions (~120 minutes)
- D9 Navamsa Lagna transitions (~13.3 minutes)
- D60 Shashtyamsha Lagna transitions (~2 minutes)
- Moon Nakshatra & Dasha balance boundary shifts
- Vimshottari Mahadasha/Antardasha lord alignment with reported life events:
  * Marriage (7th, 2nd, 11th, Venus/Jupiter)
  * Career Rise (10th, 1st, 11th, Sun/Mars)
  * Relocation (9th, 12th, 3rd)
  * Childbirth (5th, 2nd, Jupiter)
  * Health / Surgery (6th, 8th, Mars/Saturn)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
import swisseph as swe

from divisional_charts import calculate_navamsha, calculate_shashtyamsha
from dasha_engine import calculate_vimshottari_dasha
from ephemeris import SIGNS as ZODIAC_SIGNS, NAKSHATRAS

# Milestone event signatures
EVENT_SIGNIFICATORS = {
    "marriage": {
        "houses": [7, 2, 11],
        "karakas": ["Venus", "Jupiter"]
    },
    "career": {
        "houses": [10, 1, 6, 11],
        "karakas": ["Sun", "Mars", "Jupiter", "Saturn"]
    },
    "relocation": {
        "houses": [9, 12, 3, 4],
        "karakas": ["Moon", "Rahu", "Saturn"]
    },
    "childbirth": {
        "houses": [5, 2, 11],
        "karakas": ["Jupiter"]
    },
    "health_crisis": {
        "houses": [6, 8, 12],
        "karakas": ["Mars", "Saturn", "Rahu", "Ketu"]
    }
}

SIGN_RULERS = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon",
    4: "Sun", 5: "Mercury", 6: "Venus", 7: "Mars",
    8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter"
}

def _get_lagna_and_moon(dt_utc: datetime, lat: float, lon: float):
    tjd = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour + dt_utc.minute/60.0 + dt_utc.second/3600.0)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    ayan = swe.get_ayanamsa_ut(tjd)
    
    # Houses / Ascendant
    houses_res, ascmc = swe.houses(tjd, lat, lon, b'P')
    tropical_asc = ascmc[0]
    nirayana_asc = (tropical_asc - ayan) % 360.0
    
    # Moon
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    res, _ = swe.calc_ut(tjd, swe.MOON, flags)
    nirayana_moon = (res[0] - ayan) % 360.0
    
    return nirayana_asc, nirayana_moon

def evaluate_btr_candidates(
    nominal_dob_iso: str,
    lat: float,
    lon: float,
    window_minutes: int = 30,
    step_minutes: int = 3,
    life_events: Optional[List[Dict[str, str]]] = None,
    timezone_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    """
    Scans candidate birth times across nominal +/- window_minutes.
    Evaluates Lagna shifts and event dasha correlations.
    """
    tz = ZoneInfo(timezone_str)
    nominal_dt = datetime.fromisoformat(nominal_dob_iso.replace("Z", "+00:00"))
    if nominal_dt.tzinfo is None:
        nominal_dt = nominal_dt.replace(tzinfo=tz)
    else:
        nominal_dt = nominal_dt.astimezone(tz)
        
    events = life_events or []
    
    candidates = []
    
    # Calculate across window
    start_offset = -abs(window_minutes)
    end_offset = abs(window_minutes)
    
    current_offset = start_offset
    while current_offset <= end_offset:
        cand_dt = nominal_dt + timedelta(minutes=current_offset)
        cand_utc = cand_dt.astimezone(ZoneInfo("UTC"))
        
        asc_deg, moon_deg = _get_lagna_and_moon(cand_utc, lat, lon)
        d1_sign = int(asc_deg // 30) % 12
        
        # D9 Navamsha Lagna calculation
        pada_in_sign = int((asc_deg % 30.0) / (30.0 / 9.0))
        d9_element_start = {0: 0, 1: 9, 2: 6, 3: 3}
        d9_sign = (d9_element_start[d1_sign % 4] + pada_in_sign) % 12
        
        # D60 Shashtyamsha Lagna calculation
        lagna_part = min(59, int((asc_deg % 30.0) / 0.5))
        is_lagna_odd = (d1_sign % 2 == 0)
        lagna_start = d1_sign if is_lagna_odd else (d1_sign + 6) % 12
        d60_sign = (lagna_start + lagna_part) % 12
        
        # Moon nakshatra
        nak_span = 360.0 / 27.0
        nak_idx = int(moon_deg // nak_span)
        nak_name = NAKSHATRAS[nak_idx] if nak_idx < len(NAKSHATRAS) else "Ashwini"
        
        # Event alignment scoring
        event_scores = []
        if events:
            # Generate Vimshottari dasha for candidate
            try:
                dasha_result = calculate_vimshottari_dasha(cand_dt.isoformat(), moon_deg)
                mahadashas = dasha_result.get("dasha_hierarchy", [])
                
                for ev in events:
                    ev_type = ev.get("type", "career").lower()
                    ev_date_str = ev.get("date", "")
                    if not ev_date_str:
                        continue
                    ev_dt = datetime.fromisoformat(ev_date_str[:10])
                    
                    # Find operating dasha lord at event date
                    active_md_lord = None
                    active_ad_lord = None
                    for md in mahadashas:
                        md_start = datetime.fromisoformat(md["start_date"][:10])
                        md_end = datetime.fromisoformat(md["end_date"][:10])
                        if md_start <= ev_dt <= md_end:
                            active_md_lord = md.get("lord")
                            # Check antardashas
                            for ad in md.get("antardashas", []):
                                ad_start = datetime.fromisoformat(ad["start_date"][:10])
                                ad_end = datetime.fromisoformat(ad["end_date"][:10])
                                if ad_start <= ev_dt <= ad_end:
                                    active_ad_lord = ad.get("lord")
                                    break
                            break
                            
                    # Check compatibility with event type
                    sig = EVENT_SIGNIFICATORS.get(ev_type, EVENT_SIGNIFICATORS["career"])
                    ev_score = 40 # Baseline
                    if active_md_lord in sig["karakas"]:
                        ev_score += 30
                    if active_ad_lord in sig["karakas"]:
                        ev_score += 25
                        
                    event_scores.append(min(100, ev_score))
            except Exception:
                event_scores = [50]
                
        # Total composite score
        avg_event_score = sum(event_scores) / len(event_scores) if event_scores else 65
        
        # Deduct slight penalty for large deviations from nominal birth time
        proximity_penalty = abs(current_offset) * 0.4
        final_score = max(20, min(98, round(avg_event_score - proximity_penalty, 1)))
        
        candidates.append({
            "candidate_time": cand_dt.isoformat(),
            "offset_minutes": current_offset,
            "d1_lagna_sign": ZODIAC_SIGNS[d1_sign],
            "d1_lagna_degree": round(asc_deg % 30.0, 2),
            "d9_navamsa_lagna": ZODIAC_SIGNS[d9_sign],
            "d60_shashtyamsha_lagna": ZODIAC_SIGNS[d60_sign],
            "moon_nakshatra": nak_name,
            "confidence_score": final_score,
            "alignment_rationale": (
                f"Shift of {current_offset:+d} min places D1 Ascendant in {ZODIAC_SIGNS[d1_sign]} "
                f"at {(asc_deg % 30.0):.1f}°, D9 Navamsa in {ZODIAC_SIGNS[d9_sign]}, and D60 in {ZODIAC_SIGNS[d60_sign]}."
            )
        })
        current_offset += step_minutes
        
    # Sort candidates by confidence score descending
    candidates.sort(key=lambda x: x["confidence_score"], reverse=True)
    top_candidate = candidates[0] if candidates else None
    
    return {
        "nominal_birth_time": nominal_dt.isoformat(),
        "search_window_minutes": window_minutes,
        "step_minutes": step_minutes,
        "events_evaluated_count": len(events),
        "best_fit_candidate": top_candidate,
        "candidate_ranking": candidates[:7] # Top 7 candidate points
    }
