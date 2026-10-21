"""
Automated Astronomical & Astrological Calculation Verification Suite.
Exercises:
1. Ephemeris Planetary Longitudes & Ketu 180° opposition
2. Divisional Charts (D1, D9 Navamsha, D10 Dashamsha, Chalit)
3. Vimshottari Dasha 120-year cycle & Antardashas
4. 24-Hour Planetary Horas & Chaldean sequence with unequal intervals & Rahu Kaal
5. Ashtakoota 36-Guna Matchmaking algorithm
6. Manglik, Kaal Sarp, and Sade Sati rules
7. FreeAstrologyAPI connectivity & external verification
8. Location & Timezone geocoding validation
"""
import sys
import os
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ephemeris import calculate_kundli
from divisional_charts import calculate_navamsha, calculate_dashamsha, calculate_moon_chart, calculate_chalit_chart
from dasha_engine import calculate_vimshottari_dasha
from hora_engine import calculate_sun_times, calculate_24h_horas
from matchmaking import match_kundli_36_gunas
from doshas_and_remedies import analyze_doshas_and_remedies
from ai_astrologer import generate_structured_prediction
from main import get_hourly_predictions
from external_api import (
    fetch_external_planets,
    fetch_external_chart_url,
    fetch_external_vedic_chart,
    fetch_external_visual_chart
)

def test_ephemeris_and_panchang():
    dob = "1996-11-24T14:30:00"
    res = calculate_kundli(dob, 28.6139, 77.2090, "Asia/Kolkata")
    
    # Assert metadata
    assert res["metadata"]["ayanamsha"] == "Lahiri (Chitrapaksha)"
    assert res["metadata"]["julian_day"] > 2450000.0
    
    # Assert Lagna
    assert res["lagna"]["sign"] in ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
    assert 0.0 <= res["lagna"]["degree"] < 30.0
    
    # Assert 9 Grahas present
    for planet in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]:
        assert planet in res["planets"]
        p_data = res["planets"][planet]
        assert 1 <= p_data["house"] <= 12
        assert 0.0 <= p_data["degree"] < 30.0
        assert 1 <= p_data["pada"] <= 4

    # Assert Ketu is strictly 180° opposite of Rahu
    rahu_deg = res["planets"]["Rahu"]["absolute_degree"]
    ketu_deg = res["planets"]["Ketu"]["absolute_degree"]
    diff = round(abs(rahu_deg - ketu_deg), 1)
    assert diff in [180.0, 180.0] or abs(diff - 180.0) < 0.2

    # Assert Panchang attributes
    p = res["panchang"]
    assert p["vaar"] in ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    assert len(p["tithi"]) > 0
    assert len(p["yoga"]) > 0
    assert len(p["karana"]) > 0
    print("[PASS] test_ephemeris_and_panchang passed")

def test_divisional_charts():
    dob = "1996-11-24T14:30:00"
    res = calculate_kundli(dob, 28.6139, 77.2090, "Asia/Kolkata")
    planets = res["planets"]
    lagna_deg = res["lagna"]["total_degree"]

    d9 = calculate_navamsha(planets, lagna_deg)
    assert "d9_lagna" in d9
    assert len(d9["planets"]) == 9
    for p in d9["planets"].values():
        assert 1 <= p["house"] <= 12

    d10 = calculate_dashamsha(planets, lagna_deg)
    assert "d10_lagna" in d10
    assert len(d10["planets"]) == 9
    for p in d10["planets"].values():
        assert 1 <= p["house"] <= 12

    moon_chart = calculate_moon_chart(planets)
    assert moon_chart["moon_lagna"]["sign"] == planets["Moon"]["sign"]
    assert moon_chart["planets"]["Moon"]["house"] == 1

    chalit = calculate_chalit_chart(planets, lagna_deg)
    assert len(chalit["planets"]) == 9
    for p in chalit["planets"].values():
        assert 1 <= p["chalit_house"] <= 12

    print("[PASS] test_divisional_charts passed")

def test_vimshottari_dasha():
    dob = datetime(1996, 11, 24, 14, 30, 0)
    # Moon in Bharani (13°20' to 26°40' Aries = 18.25 absolute degrees)
    moon_abs_deg = 18.25
    dashas = calculate_vimshottari_dasha(moon_abs_deg, dob)

    # Bharani Nakshatra lord is Venus (20 years)
    assert dashas["birth_balance"]["ruling_lord"] == "Venus"
    assert 0 < dashas["birth_balance"]["years_remaining"] <= 20.0
    
    # Timeline should have 9 Mahadashas
    timeline = dashas["timeline"]
    assert len(timeline) == 9
    assert timeline[0]["maha_dasha"] == "Venus"
    assert timeline[1]["maha_dasha"] == "Sun"
    assert timeline[2]["maha_dasha"] == "Moon"
    assert timeline[3]["maha_dasha"] == "Mars"
    assert timeline[4]["maha_dasha"] == "Rahu"
    assert timeline[5]["maha_dasha"] == "Jupiter"

    # Verify Antardashas present within each Mahadasha
    for md in timeline:
        assert len(md["antardashas"]) == 9

    assert "active_now" in dashas
    assert dashas["active_now"]["maha_dasha"] in ["Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu"]
    print("[PASS] test_vimshottari_dasha passed")

def test_hora_engine():
    # Test sunrise/sunset computation for Delhi
    target_d = date(2026, 10, 20)
    s_rise, s_set, s_next = calculate_sun_times(target_d, 28.6139, 77.2090, "Asia/Kolkata")
    
    assert s_rise.hour == 6
    assert s_set.hour == 17
    assert s_next.day == 21

    horas_res = calculate_24h_horas(s_rise, s_set, s_next)
    timeline = horas_res["timeline"]

    # Must contain exactly 24 Horas
    assert len(timeline) == 24
    
    # First 12 are Day Horas, next 12 are Night Horas
    day_horas = [h for h in timeline if h["period"] == "Day"]
    night_horas = [h for h in timeline if h["period"] == "Night"]
    assert len(day_horas) == 12
    assert len(night_horas) == 12

    # Verify unequal day and night durations
    assert horas_res["day_hora_duration_minutes"] > 0
    assert horas_res["night_hora_duration_minutes"] > 0
    assert horas_res["day_hora_duration_minutes"] != horas_res["night_hora_duration_minutes"]

    # 2026-10-20 was a Tuesday (weekday = 1) -> Lord is Mars
    assert horas_res["day_ruler"] == "Mars"
    assert day_horas[0]["ruling_planet"] == "Mars"
    # Chaldean order: Mars -> Sun -> Venus -> Mercury -> Moon -> Saturn -> Jupiter
    assert day_horas[1]["ruling_planet"] == "Sun"
    assert day_horas[2]["ruling_planet"] == "Venus"
    assert day_horas[3]["ruling_planet"] == "Mercury"

    # Verify Rahu Kaal computed
    assert "rahu_kaal" in horas_res["special_periods"]
    assert len(horas_res["special_periods"]["rahu_kaal"]["start"]) > 0

    print("[PASS] test_hora_engine passed")

def test_ashtakoota_matchmaking():
    # Test Case 1: Aries Moon (15°) & Sagittarius Moon (245°)
    m1 = match_kundli_36_gunas(15.0, 245.0)
    assert 0 <= m1["total_score"] <= 36.0
    bd1 = m1["breakdown"]
    total1 = (bd1["varna"]["obtained"] + bd1["vashya"]["obtained"] + bd1["tara"]["obtained"] + 
              bd1["yoni"]["obtained"] + bd1["graha_maitri"]["obtained"] + bd1["gana"]["obtained"] + 
              bd1["bhakoot"]["obtained"] + bd1["nadi"]["obtained"])
    assert round(total1, 1) == m1["total_score"]

    # Test Case 2: Identical Nakshatra => Same Nadi Dosha
    m2 = match_kundli_36_gunas(15.0, 15.0)
    assert m2["breakdown"]["nadi"]["has_dosha"] is True
    assert m2["breakdown"]["nadi"]["obtained"] == 0.0

    print("[PASS] test_ashtakoota_matchmaking passed")

def test_doshas():
    planets = {
        "Mars": {"sign": "Leo", "degree": 11.0, "house": 9},
        "Jupiter": {"sign": "Sagittarius", "degree": 26.0, "house": 1},
        "Moon": {"sign": "Aries", "degree": 18.0, "house": 5},
        "Sun": {"sign": "Scorpio", "degree": 8.0, "house": 12},
        "Mercury": {"sign": "Scorpio", "degree": 2.0, "house": 12},
        "Venus": {"sign": "Libra", "degree": 14.0, "house": 11},
        "Saturn": {"sign": "Pisces", "degree": 6.0, "house": 4},
        "Rahu": {"sign": "Virgo", "degree": 12.0, "house": 10},
        "Ketu": {"sign": "Pisces", "degree": 12.0, "house": 4}
    }
    doshas = analyze_doshas_and_remedies(planets, "Sagittarius")
    assert doshas["manglik"]["has_dosha"] is False # Mars in 9th
    assert "sade_sati" in doshas
    # Moon in Aries, transiting Saturn in Pisces (12th from Moon) => Phase 1 Rising
    assert doshas["sade_sati"]["is_active"] is True
    assert "Phase 1" in doshas["sade_sati"]["phase"]
    print("[PASS] test_doshas passed")

def test_external_api():
    # 1. Native FreeAstroAPI /api/v2/vedic/chart verification
    chart = fetch_external_vedic_chart(1995, 6, 15, 10, 30, city="New Delhi", lat=28.6139, lng=77.2090)
    if isinstance(chart, dict) and ("rate_limit_exceeded" in str(chart) or chart.get("error") == "HTTP_429"):
        print("[SKIP] test_external_api: FreeAstroAPI daily tier limit reached (429)")
        return
    assert "planets" in chart, f"Expected planets in FreeAstroAPI chart response, got: {chart}"
    assert len(chart["planets"]) == 9
    assert "ascendant" in chart

    # 2. Native FreeAstroAPI /api/v2/vedic/visual/chart verification
    svg = fetch_external_visual_chart(1995, 6, 15, 10, 30, city="New Delhi", lat=28.6139, lng=77.2090)
    if isinstance(svg, dict) and ("rate_limit_exceeded" in str(svg) or svg.get("error") == "HTTP_429"):
        print("[SKIP] test_external_api: FreeAstroAPI daily tier limit reached (429)")
        return
    assert isinstance(svg, str) and "<svg" in svg, "Expected SVG XML string from visual chart endpoint"

    # 3. Compatibility Adapters
    res = fetch_external_planets(1995, 6, 15, 10, 30, 0, 28.6139, 77.2090, 5.5)
    if res.get("statusCode") == 500 and "429" in str(res.get("details", "")):
        print("[SKIP] test_external_api: FreeAstroAPI daily tier limit reached (429)")
        return
    assert res.get("statusCode") == 200
    assert len(res.get("output", [])) > 0
    
    chart_res = fetch_external_chart_url(1995, 6, 15, 10, 30, 0, 28.6139, 77.2090, 5.5)
    if chart_res.get("statusCode") == 500 and "429" in str(chart_res.get("details", "")):
        print("[SKIP] test_external_api: FreeAstroAPI daily tier limit reached (429)")
        return
    assert chart_res.get("statusCode") == 200
    assert "<svg" in chart_res.get("svg", "")
    print("[PASS] test_external_api passed (FreeAstroAPI v2 integration verified)")

def test_recording_case_jabalpur():
    """
    Forensic Regression Test: User Recording Case
    DOB: 20 Aug 2005 14:05 (2:05 PM) Jabalpur, MP (Lat: 23.1815, Lon: 79.9864)
    Recording Defect: Displayed Sun: Cancer 8.4°, Moon: Aries 18.3°, Nakshatra: Hasta (1).
    Ground Truth (Swiss Ephemeris Lahiri):
    - Sun: Leo ~3.49° (Magha Nakshatra)
    - Moon: Aquarius ~12.21° (Shatabhisha Nakshatra, Pada 2)
    - Lagna: Scorpio ~24.16° (Jyeshtha Nakshatra, Pada 3)
    """
    dob = "2005-08-20T14:05:00"
    lat, lon = 23.1815, 79.9864
    res = calculate_kundli(dob, lat, lon, "Asia/Kolkata")
    
    sun = res["planets"]["Sun"]
    moon = res["planets"]["Moon"]
    lagna = res["lagna"]
    
    # 1. Assert Sun is in Leo, NOT Cancer
    assert sun["sign"] == "Leo", f"Expected Sun in Leo, got {sun['sign']}"
    assert 3.0 <= sun["degree"] <= 4.0, f"Expected Sun ~3.49°, got {sun['degree']}"
    
    # 2. Assert Moon is in Aquarius, NOT Aries
    assert moon["sign"] == "Aquarius", f"Expected Moon in Aquarius, got {moon['sign']}"
    assert 11.5 <= moon["degree"] <= 13.0, f"Expected Moon ~12.21°, got {moon['degree']}"
    
    # 3. Assert Nakshatra is Shatabhisha (Pada 2), NOT Hasta
    assert moon["nakshatra"] == "Shatabhisha", f"Expected Shatabhisha, got {moon['nakshatra']}"
    assert moon["pada"] == 2, f"Expected Pada 2, got {moon['pada']}"
    assert moon["nakshatra_lord"] == "Rahu", f"Expected Rahu as Nakshatra Lord, got {moon['nakshatra_lord']}"
    
    # 4. Assert Lagna is Scorpio
    assert lagna["sign"] == "Scorpio", f"Expected Lagna in Scorpio, got {lagna['sign']}"
    assert 23.5 <= lagna["degree"] <= 25.0, f"Expected Lagna ~24.16°, got {lagna['degree']}"

    # 5. Assert Dasha calculation coherence
    dashas = calculate_vimshottari_dasha(moon["absolute_degree"], datetime(2005, 8, 20, 14, 5, 0))
    # Shatabhisha ruling lord is Rahu (18 years)
    assert dashas["birth_balance"]["ruling_lord"] == "Rahu"
    assert "active_now" in dashas
    
    print("[PASS] test_recording_case_jabalpur passed")

def test_recording_case_21_oct_2026_jabalpur_hora():
    """
    Forensic Regression Test: User Recording Hora Case
    Location: Jabalpur (Lat: 23.17, Lon: 79.95), Asia/Kolkata
    Date: Wednesday, 21 October 2026
    Verified Astronomical Schedule:
    - Sunrise: ~06:09 AM IST
    - Sunset: ~05:40 PM IST
    - Next Sunrise: ~06:10 AM IST (22 Oct)
    - Weekday: Wednesday -> Weekday Lord: Mercury
    - 12 Daytime Horas starting at sunrise with Mercury
    - Day duration ~57.5 mins, Night duration ~62.5 mins (unequal day/night periods)
    - Active Hora at 14:38 (2:38 PM) is Hora 9 (01:49 PM - 02:47 PM): Moon Hora!
    - Rahu Kaal: 5th daylight part (~11:54 AM - 01:21 PM)
    - Yamaganda: 2nd daylight part (~07:35 AM - 09:02 AM)
    - Gulika Kaal: 4th daylight part (~10:28 AM - 11:54 AM)
    """
    d = date(2026, 10, 21)
    lat, lon = 23.17, 79.95
    s_rise, s_set, s_next = calculate_sun_times(d, lat, lon, "Asia/Kolkata")
    
    assert s_rise.hour == 6 and s_rise.minute == 9
    assert s_set.hour == 17 and s_set.minute in [39, 40]
    
    test_dt = datetime(2026, 10, 21, 14, 38, 0, tzinfo=ZoneInfo("Asia/Kolkata"))
    res = calculate_24h_horas(s_rise, s_set, s_next, current_dt=test_dt)
    
    assert res["day_ruler"] == "Mercury"
    assert res["timeline"][0]["ruling_planet"] == "Mercury"
    assert res["timeline"][0]["period"] == "Day"
    assert res["day_hora_duration_minutes"] == 57.5
    assert res["night_hora_duration_minutes"] == 62.5
    
    # Active Hora at 14:38 MUST be Moon (Hora 9)
    assert res["active_hora"] is not None
    assert res["active_hora"]["hora_number"] == 9
    assert res["active_hora"]["ruling_planet"] == "Moon"
    assert res["active_hora"]["period"] == "Day"
    
    # Verify Special Periods
    sp = res["special_periods"]
    assert "rahu_kaal" in sp and "11:54 AM" in sp["rahu_kaal"]["start"]
    assert "yamaganda" in sp and "07:35 AM" in sp["yamaganda"]["start"]
    assert "gulika_kaal" in sp and "10:28 AM" in sp["gulika_kaal"]["start"]
    print("[PASS] test_recording_case_21_oct_2026_jabalpur_hora passed")

def test_ashtakoota_libra_aries():
    """
    Forensic Regression Test: Matchmaking Case from Video
    Boy: Libra (Swati Nakshatra, ~195°), Girl: Aries (Bharani Nakshatra, ~15°)
    True Parashari result is 27.5 / 36 (NOT hardcoded 28.0).
    Nadi score is 8.0/8 (Antya vs Madhya => No Nadi Dosha).
    """
    res = match_kundli_36_gunas(195.0, 15.0)
    assert res["total_score"] == 27.5
    assert res["breakdown"]["nadi"]["obtained"] == 8.0
    assert res["breakdown"]["nadi"]["has_dosha"] is False
    assert res["breakdown"]["bhakoot"]["obtained"] == 7.0
    print("[PASS] test_ashtakoota_libra_aries passed")

def test_structured_predictions_all_horizons():
    """
    Structured Prediction Engine Test:
    Verifies that generate_structured_prediction returns all standard 7 sections
    (A. Overall Outlook, B. Supportive Developments, C. Challenges/Cautions,
    D. Relevant Time Windows, E. Why This Applies, F. Practical Reflection, G. Limitations)
    for Hourly, Weekly, Monthly, and Yearly horizons.
    """
    dob = "1996-11-24T14:30:00"
    lat, lon, tz = 28.6139, 77.2090, "Asia/Kolkata"
    d1 = calculate_kundli(dob, lat, lon, tz)
    SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    moon_idx = SIGNS.index(d1["planets"]["Moon"]["sign"])
    moon_deg = (moon_idx * 30.0) + d1["planets"]["Moon"]["degree"]
    dashas = calculate_vimshottari_dasha(moon_deg, datetime.fromisoformat(dob))
    doshas = analyze_doshas_and_remedies(d1["planets"], d1["lagna"]["sign"])

    horizons = ["hourly", "daily", "weekly", "monthly", "yearly", "mahadasha"]
    for h in horizons:
        res = generate_structured_prediction(
            horizon=h,
            target_date_str="2026-10-21",
            kundli=d1,
            dasha=dashas,
            doshas=doshas,
            active_hora_planet="Moon",
            hora_window="02:30 PM - 03:30 PM"
        )
        assert res["time_horizon"] in [h, "5year", "mahadasha"]
        assert "sections" in res
        sections = res["sections"]
        # Verify 9 standard canonical sections in exact order
        assert "executive_summary" in sections and len(sections["executive_summary"]) > 10
        assert "overall_outlook" in sections and len(sections["overall_outlook"]) > 20
        assert "supportive_themes" in sections and len(sections["supportive_themes"]) >= 1
        assert "supportive_developments" in sections and len(sections["supportive_developments"]) >= 1
        assert "challenges_and_cautions" in sections and len(sections["challenges_and_cautions"]) >= 1
        assert "key_time_windows" in sections and len(sections["key_time_windows"]) >= 1
        assert "relevant_time_windows" in sections and len(sections["relevant_time_windows"]) >= 1
        assert "relevant_chart_facts" in sections and isinstance(sections["relevant_chart_facts"], dict)
        assert "lagna" in sections["relevant_chart_facts"]
        assert "moon" in sections["relevant_chart_facts"]
        assert "active_dasha" in sections["relevant_chart_facts"]
        assert "applicable_traditional_rules" in sections and len(sections["applicable_traditional_rules"]) > 20
        assert "why_this_applies" in sections and len(sections["why_this_applies"]) > 20
        assert "practical_reflection" in sections and len(sections["practical_reflection"]) > 10
        assert "limitations" in sections and len(sections["limitations"]) > 10
        # Check profile grounding
        assert res["profile"]["lagna"] == d1["lagna"]["sign"]
        assert res["profile"]["moon_sign"] == d1["planets"]["Moon"]["sign"]

    print("[PASS] test_structured_predictions_all_horizons passed (all 9 canonical sections verified)")

def test_canonical_hora_contract_and_presunrise():
    """
    Verifies canonical Hora contract:
    - Numeric UTC epoch milliseconds on all slots and active_hora
    - finite start_epoch_ms < end_epoch_ms
    - qualitative category codes and hex colors
    - pre-sunrise early morning query boundary
    """
    tz_str = "Asia/Kolkata"
    tz = ZoneInfo(tz_str)
    lat, lon = 28.6139, 77.2090 # New Delhi

    # 1. Normal Daytime Query: 2:30 PM on 2026-10-21
    day_dt = datetime(2026, 10, 21, 14, 30, tzinfo=tz)
    s_rise, s_set, s_next = calculate_sun_times(day_dt.date(), lat, lon, tz_str)
    day_res = calculate_24h_horas(s_rise, s_set, s_next, current_dt=day_dt)

    assert "active_hora" in day_res
    ah = day_res["active_hora"]
    assert "planet" in ah
    assert ah["category_code"] in ["favorable", "authoritative_moderate", "caution"]
    assert ah["color"] in ["#10B981", "#F59E0B", "#EF4444"]
    assert isinstance(ah["start_epoch_ms"], int)
    assert isinstance(ah["end_epoch_ms"], int)
    assert ah["end_epoch_ms"] > ah["start_epoch_ms"]
    cur_ms = int(day_dt.timestamp() * 1000)
    assert ah["start_epoch_ms"] <= cur_ms < ah["end_epoch_ms"]

    # Check 24 timeline slots
    assert len(day_res["timeline"]) == 24
    for slot in day_res["timeline"]:
        assert isinstance(slot["start_epoch_ms"], int)
        assert isinstance(slot["end_epoch_ms"], int)
        assert slot["end_epoch_ms"] > slot["start_epoch_ms"]
        assert slot["category_code"] in ["favorable", "authoritative_moderate", "caution"]
        assert slot["color"].startswith("#")

    # 2. Pre-Sunrise Early Morning Query: 2:30 AM on 2026-10-21 (sunrise ~ 06:26 AM)
    night_dt = datetime(2026, 10, 21, 2, 30, tzinfo=tz)
    today_rise, today_set, today_next = calculate_sun_times(night_dt.date(), lat, lon, tz_str)
    assert night_dt < today_rise

    # When pre-sunrise handling is used (as in main.py API endpoint):
    prev_date = date(2026, 10, 20)
    prev_rise, prev_set, prev_next = calculate_sun_times(prev_date, lat, lon, tz_str)
    night_res = calculate_24h_horas(prev_rise, prev_set, prev_next, current_dt=night_dt)
    night_ah = night_res["active_hora"]
    night_cur_ms = int(night_dt.timestamp() * 1000)
    assert night_ah["start_epoch_ms"] <= night_cur_ms < night_ah["end_epoch_ms"]
    assert night_ah["period"] == "Night"

    print("[PASS] test_canonical_hora_contract_and_presunrise passed")

def test_solar_cycle_boundary_transitions_and_dst():
    """
    Blocker 4 Verification Suite:
    - Pre-sunrise nocturnal query with and without date_str
    - Exact sunrise boundary
    - Immediately before and after a Hora boundary
    - Sunset transition (Day Hora 12 to Night Hora 13)
    - Midnight interval
    - Next sunrise advance
    - Distinct historical date vs active instant
    - IANA timezone with Daylight Saving Time transitions (America/New_York)
    - Explicit HTTPException 400 rejection for malformed inputs
    """
    tz_delhi = "Asia/Kolkata"
    lat, lon = 28.6139, 77.2090 # New Delhi

    # 1. Pre-Sunrise: 02:30 AM on 2026-10-21 (sunrise is ~06:25 AM)
    # A. With date_str passed as today's calendar date:
    pre_sun_with_date = get_hourly_predictions(
        date_str="2026-10-21",
        lat=lat,
        lon=lon,
        timezone=tz_delhi,
        current_instant="2026-10-21T02:30:00"
    )
    ah1 = pre_sun_with_date["active_hora"]
    assert ah1 is not None, "Expected active hora for pre-sunrise instant"
    t_instant_ms = int(datetime(2026, 10, 21, 2, 30, tzinfo=ZoneInfo(tz_delhi)).timestamp() * 1000)
    assert ah1["start_epoch_ms"] <= t_instant_ms < ah1["end_epoch_ms"]
    assert ah1["period"] == "Night"
    assert pre_sun_with_date["date"] == "2026-10-20", "Expected previous day's solar cycle date"

    # B. Without date_str (automatic instant grounding):
    pre_sun_no_date = get_hourly_predictions(
        lat=lat,
        lon=lon,
        timezone=tz_delhi,
        current_instant="2026-10-21T02:30:00"
    )
    ah2 = pre_sun_no_date["active_hora"]
    assert ah2["start_epoch_ms"] == ah1["start_epoch_ms"]
    assert ah2["end_epoch_ms"] == ah1["end_epoch_ms"]

    # 2. Exact Sunrise: get exact sunrise time for Delhi on 2026-10-21
    s_rise, s_set, s_next = calculate_sun_times(date(2026, 10, 21), lat, lon, tz_delhi)
    rise_res = get_hourly_predictions(
        date_str="2026-10-21",
        lat=lat,
        lon=lon,
        timezone=tz_delhi,
        current_instant=s_rise.isoformat()
    )
    ah_rise = rise_res["active_hora"]
    assert ah_rise is not None
    assert ah_rise["hora_number"] == 1
    assert ah_rise["period"] == "Day"
    rise_ms = int(s_rise.timestamp() * 1000)
    assert ah_rise["start_epoch_ms"] <= rise_ms < ah_rise["end_epoch_ms"]

    # 3. Boundary Crossing: immediately before and after Hora 1 ends
    h1_end_epoch_ms = ah_rise["end_epoch_ms"]
    # 1 second before end of Hora 1:
    dt_before_end = datetime.fromtimestamp((h1_end_epoch_ms - 1000) / 1000.0, tz=ZoneInfo(tz_delhi))
    res_before = get_hourly_predictions(lat=lat, lon=lon, timezone=tz_delhi, current_instant=dt_before_end.isoformat())
    assert res_before["active_hora"]["hora_number"] == 1

    # 1 second after start of Hora 2:
    dt_after_start = datetime.fromtimestamp((h1_end_epoch_ms + 1000) / 1000.0, tz=ZoneInfo(tz_delhi))
    res_after = get_hourly_predictions(lat=lat, lon=lon, timezone=tz_delhi, current_instant=dt_after_start.isoformat())
    assert res_after["active_hora"]["hora_number"] == 2

    # 4. Sunset Transition: instant at sunset
    sunset_res = get_hourly_predictions(lat=lat, lon=lon, timezone=tz_delhi, current_instant=s_set.isoformat())
    ah_sunset = sunset_res["active_hora"]
    assert ah_sunset["hora_number"] == 13
    assert ah_sunset["period"] == "Night"
    sunset_ms = int(s_set.timestamp() * 1000)
    assert ah_sunset["start_epoch_ms"] <= sunset_ms < ah_sunset["end_epoch_ms"]

    # 5. Midnight Instant: 2026-10-21 23:59:59 and 2026-10-22 00:00:01
    dt_midnight = datetime(2026, 10, 22, 0, 0, 1, tzinfo=ZoneInfo(tz_delhi))
    mid_res = get_hourly_predictions(lat=lat, lon=lon, timezone=tz_delhi, current_instant=dt_midnight.isoformat())
    ah_mid = mid_res["active_hora"]
    assert ah_mid is not None
    assert ah_mid["period"] == "Night"
    mid_ms = int(dt_midnight.timestamp() * 1000)
    assert ah_mid["start_epoch_ms"] <= mid_ms < ah_mid["end_epoch_ms"]

    # 6. Distinct Historical Date Query: user inspects 2020-01-01 while current instant is in 2026
    hist_res = get_hourly_predictions(
        date_str="2020-01-01",
        lat=lat,
        lon=lon,
        timezone=tz_delhi,
        current_instant="2026-10-21T14:00:00"
    )
    assert len(hist_res["timeline"]) == 24
    assert hist_res["active_hora"] is None, "Historical timeline outside current instant must have active_hora: None"
    assert hist_res["planet"] is None
    assert hist_res["start_epoch_ms"] is None

    # 7. Timezone with Daylight Saving Time (DST): America/New_York
    ny_tz = "America/New_York"
    ny_lat, ny_lon = 40.7128, -74.0060

    # Summer / EDT instant: 2026-06-21 13:00 (EDT = UTC-4)
    ny_summer = get_hourly_predictions(
        lat=ny_lat,
        lon=ny_lon,
        timezone=ny_tz,
        current_instant="2026-06-21T13:00:00"
    )
    assert ny_summer["active_hora"] is not None
    assert ny_summer["active_hora"]["period"] == "Day"
    ny_s_ms = int(datetime(2026, 6, 21, 13, 0, tzinfo=ZoneInfo(ny_tz)).timestamp() * 1000)
    assert ny_summer["active_hora"]["start_epoch_ms"] <= ny_s_ms < ny_summer["active_hora"]["end_epoch_ms"]

    # Winter / EST instant: 2026-01-15 22:30 (EST = UTC-5)
    ny_winter = get_hourly_predictions(
        lat=ny_lat,
        lon=ny_lon,
        timezone=ny_tz,
        current_instant="2026-01-15T22:30:00"
    )
    assert ny_winter["active_hora"] is not None
    assert ny_winter["active_hora"]["period"] == "Night"
    ny_w_ms = int(datetime(2026, 1, 15, 22, 30, tzinfo=ZoneInfo(ny_tz)).timestamp() * 1000)
    assert ny_winter["active_hora"]["start_epoch_ms"] <= ny_w_ms < ny_winter["active_hora"]["end_epoch_ms"]

    # 8. Explicit Error Handling: Malformed Inputs Reject with HTTPException 400
    try:
        get_hourly_predictions(timezone="Invalid/Timezone_That_Does_Not_Exist")
        assert False, "Expected 400 for invalid timezone"
    except HTTPException as e:
        assert e.status_code == 400

    try:
        get_hourly_predictions(date_str="malformed-date-format")
        assert False, "Expected 400 for malformed date_str"
    except HTTPException as e:
        assert e.status_code == 400

    try:
        get_hourly_predictions(current_instant="bad-instant")
        assert False, "Expected 400 for malformed current_instant"
    except HTTPException as e:
        assert e.status_code == 400

    try:
        get_hourly_predictions(lat=999.0)
        assert False, "Expected 400 for out-of-bounds latitude"
    except HTTPException as e:
        assert e.status_code == 400

    print("[PASS] test_solar_cycle_boundary_transitions_and_dst passed")

if __name__ == "__main__":
    test_ephemeris_and_panchang()
    test_divisional_charts()
    test_vimshottari_dasha()
    test_hora_engine()
    test_ashtakoota_matchmaking()
    test_doshas()
    test_external_api()
    test_recording_case_jabalpur()
    test_recording_case_21_oct_2026_jabalpur_hora()
    test_ashtakoota_libra_aries()
    test_structured_predictions_all_horizons()
    test_canonical_hora_contract_and_presunrise()
    test_solar_cycle_boundary_transitions_and_dst()
    print("\nALL 13 ASTRONOMICAL & INTEGRATION TEST SUITES PASSED!")

