"""
AstroVerse Transits, 12-Sign Rashifal & Indian Holiday/Festival Test Suite
========================================================================
Comprehensive automated verification covering:
1. 9-Graha sidereal Gochar positions (Lahiri) and Ketu opposition.
2. Newton-Raphson planetary sign ingress/egress boundary root-finding.
3. Retrograde station turning points (speed = 0).
4. Lunar phases (Amavasya, First Quarter, Purnima, Third Quarter) and illumination %.
5. Planetary conjunction detection within 3.0° orb.
6. 12-Sign daily Rashifal pipeline with all 6 required sections, Chandrashtama,
   lucky numbers (1-9), lucky colors, and auspicious time windows.
7. Authentic festival observance rules (udaya_tithi, madhyahna, nishita, pradosha).
8. Holiday categorization (7 categories) and state/region filtering.
9. Composite calendar month payload structure and consistency.
10. FastAPI endpoint responses via TestClient.
"""

import pytest
from datetime import datetime, date, timedelta, timezone
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import swisseph as swe
from fastapi.testclient import TestClient

from transits_engine import (
    calculate_live_grahas,
    calculate_monthly_transits,
    find_planetary_ingresses,
    find_planetary_stations,
    find_monthly_lunar_phases,
    detect_planetary_conjunctions,
    GRAHAS_DEFINITION,
)
from rashifal_engine import calculate_12sign_daily_rashifal
from festival_engine import (
    get_holidays_and_festivals,
    calculate_calendar_month,
    evaluate_tithi_observance,
    generate_monthly_bank_holidays,
    generate_monthly_vrats_and_fasts,
    STATIC_HOLIDAYS_REGISTRY,
)
from main import app

client = TestClient(app)


# =============================================================================
# 1. 9-GRAHA SIDEREAL CALCULATION & KETU OPPOSITION
# =============================================================================

def test_nine_grahas_sidereal_lahiri():
    """Verify all 9 Vedic Grahas are calculated in sidereal Lahiri mode."""
    ref_dt = datetime(2026, 11, 17, 12, 0, 0, tzinfo=timezone.utc)
    res = calculate_live_grahas(ref_dt)

    assert "grahas" in res
    grahas = res["grahas"]
    assert len(grahas) == 9

    expected_grahas = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
    for g_name in expected_grahas:
        assert g_name in grahas, f"Missing graha {g_name}"
        g = grahas[g_name]
        assert 0.0 <= g["longitude"] < 360.0
        assert 0 <= g["sign_index"] < 12
        assert 0 <= g["nakshatra_index"] < 27
        assert 1 <= g["nakshatra_pada"] <= 4
        assert isinstance(g["is_retrograde"], bool)
        assert g["name_en"] == g_name
        assert len(g["name_hi"]) > 0
        assert len(g["name_sa"]) > 0

    # Verify Ketu is exactly 180° opposite Rahu
    rahu_lon = grahas["Rahu"]["longitude"]
    ketu_lon = grahas["Ketu"]["longitude"]
    diff = abs(rahu_lon - ketu_lon)
    if diff > 180.0:
        diff = 360.0 - diff
    assert abs(diff - 180.0) < 1e-4, f"Ketu not 180° from Rahu: diff={diff}"


# =============================================================================
# 2. NEWTON-RAPHSON INGRESS / EGRESS SOLVER
# =============================================================================

def test_newton_raphson_planetary_ingress():
    """Verify sign ingresses are accurately solved to sign boundaries (30° multiples)."""
    monthly = calculate_monthly_transits(2026, 11)
    ingresses = monthly["ingresses"]

    assert len(ingresses) > 0, "Should find planetary ingresses in November 2026"

    for ing in ingresses:
        assert "planet" in ing
        assert "from_sign_index" in ing
        assert "to_sign_index" in ing
        assert "timestamp_iso" in ing
        assert "boundary_deg" in ing

        # Boundary must be a multiple of 30°
        assert ing["boundary_deg"] % 30.0 == 0.0

        # Verify sign transition is contiguous (+1 or -1 modulo 12)
        diff_sign = (ing["to_sign_index"] - ing["from_sign_index"]) % 12
        assert diff_sign in (1, 11), f"Non-contiguous sign transition: {diff_sign}"

    # Verify Moon ingress exists in November 2026
    moon_ingresses = [ing for ing in ingresses if ing["planet"] == "Moon"]
    assert len(moon_ingresses) >= 10, "Moon should change signs multiple times in a month"


# =============================================================================
# 3. RETROGRADE STATION SOLVER
# =============================================================================

def test_retrograde_stations():
    """Verify stationary turning points where speed crosses zero."""
    # Look across 2026 for outer planet stations
    start_jd = swe.julday(2026, 1, 1, 0.0)
    end_jd = swe.julday(2026, 12, 31, 0.0)

    stations = find_planetary_stations(start_jd, end_jd)
    assert len(stations) > 0, "Should detect planetary retrograde/direct stations in 2026"

    saturn_stations = [st for st in stations if st["planet"] == "Saturn"]
    assert len(saturn_stations) >= 1, "Saturn must have at least one station in 2026"

    for st in stations:
        assert st["station_type"] in ("Stationary Retrograde", "Stationary Direct")
        assert 0 <= st["sign_index"] < 12
        assert len(st["timestamp_iso"]) > 10


# =============================================================================
# 4. LUNAR PHASES & ILLUMINATION PERCENTAGE
# =============================================================================

def test_monthly_lunar_phases():
    """Verify detection of Amavasya, Purnima, and Quarters with accurate illumination."""
    monthly = calculate_monthly_transits(2026, 11)
    phases = monthly["lunar_phases"]

    phase_keys = [p["phase_key"] for p in phases]
    assert "amavasya" in phase_keys, "Amavasya must occur in Nov 2026"
    assert "purnima" in phase_keys, "Purnima must occur in Nov 2026"
    assert "first_quarter" in phase_keys, "First Quarter must occur in Nov 2026"
    assert "third_quarter" in phase_keys, "Third Quarter must occur in Nov 2026"

    amavasya = next(p for p in phases if p["phase_key"] == "amavasya")
    purnima = next(p for p in phases if p["phase_key"] == "purnima")
    first_q = next(p for p in phases if p["phase_key"] == "first_quarter")

    # Amavasya illumination should be close to 0%
    assert amavasya["illumination_pct"] < 2.0, f"Amavasya illumination too high: {amavasya['illumination_pct']}%"
    # Purnima illumination should be close to 100%
    assert purnima["illumination_pct"] > 98.0, f"Purnima illumination too low: {purnima['illumination_pct']}%"
    # First quarter illumination should be around 50%
    assert 45.0 <= first_q["illumination_pct"] <= 55.0, f"First quarter illumination off: {first_q['illumination_pct']}%"


# =============================================================================
# 5. PLANETARY CONJUNCTION DETECTION (Within 3.0° Orb)
# =============================================================================

def test_planetary_conjunctions():
    """Verify conjunction detection within 3° orb."""
    jd_test = swe.julday(2026, 11, 17, 12.0)
    conjunctions = detect_planetary_conjunctions(jd_test, max_orb_deg=3.0)

    for conj in conjunctions:
        assert conj["orb_deg"] <= 3.0, f"Orb exceeded 3°: {conj['orb_deg']}"
        assert isinstance(conj["is_applying"], bool)
        assert isinstance(conj["is_exact"], bool)
        assert conj["graha1"] != conj["graha2"]
        assert len(conj["sign_name"]) > 0


# =============================================================================
# 6. 12-SIGN DAILY RASHIFAL PIPELINE
# =============================================================================

def test_twelve_sign_rashifal_complete_structure():
    """Verify all 12 signs have all 6 required sections, Chandrashtama, lucky numbers/colors."""
    target_dt = date(2026, 11, 17)
    res = calculate_12sign_daily_rashifal(target_dt)

    assert "signs" in res
    signs = res["signs"]
    assert len(signs) == 12

    required_sections = ["outlook", "career", "finance", "relationships", "wellness", "helpfulFocus"]
    required_metadata = ["signIndex", "signNameEn", "signNameHi", "rashiLord", "moonRashiPresent", "luckyNumber", "luckyColor", "auspiciousPeriod"]

    chandrashtama_count = 0
    moon_present_count = 0

    for idx, sign in enumerate(signs):
        assert sign["signIndex"] == idx

        # Verify all 6 required sections are non-empty and detailed
        for sec in required_sections:
            assert sec in sign, f"Missing section '{sec}' for sign {sign['signNameEn']}"
            assert len(sign[sec]) >= 30, f"Section '{sec}' too brief for sign {sign['signNameEn']}"

        # Verify metadata
        for meta in required_metadata:
            assert meta in sign, f"Missing metadata '{meta}' for sign {sign['signNameEn']}"

        # Lucky number must be 1 to 9
        assert 1 <= sign["luckyNumber"] <= 9
        # Lucky color and auspicious period non-empty
        assert len(sign["luckyColor"]) > 0
        assert len(sign["auspiciousPeriod"]) > 0

        if sign.get("isChandrashtama"):
            chandrashtama_count += 1
        if sign["moonRashiPresent"]:
            moon_present_count += 1

    # Exactly 1 sign has Moon present, and exactly 1 sign has Chandrashtama
    assert moon_present_count == 1, "Exactly one sign must host Moon transit"
    assert chandrashtama_count == 1, "Exactly one sign must be in Chandrashtama"


# =============================================================================
# 7. FESTIVAL TITHI OBSERVANCE RULES
# =============================================================================

def test_festival_observance_rules():
    """Verify authentic Dharma Shastra observance rules (udaya, madhyahna, nishita, pradosha)."""
    # 1. Diwali on Nov 8, 2026 (Kartika Amavasya = Tithi 29 during Pradosha)
    assert evaluate_tithi_observance("pradosha", date(2026, 11, 8), 29) is True

    # 2. Maha Shivratri on Feb 15, 2026 (Phalguna Krishna Chaturdashi = Tithi 28 during Nishita)
    assert evaluate_tithi_observance("nishita", date(2026, 2, 15), 28) is True

    # 3. Rama Navami (Chaitra Shukla Navami = Tithi 8):
    # Under Madhyahna, Navami prevails at midday on March 26, 2026
    assert evaluate_tithi_observance("madhyahna", date(2026, 3, 26), 8) is True
    # Under Udaya Tithi, Navami prevails at sunrise on March 27, 2026
    assert evaluate_tithi_observance("udaya_tithi", date(2026, 3, 27), 8) is True

    # 4. Ganesha Chaturthi on Sept 14, 2026 (Bhadrapada Shukla Chaturthi = Tithi 3 during Madhyahna)
    assert evaluate_tithi_observance("madhyahna", date(2026, 9, 14), 3) is True


# =============================================================================
# 8. HOLIDAY CATEGORIZATION & REGION FILTERING
# =============================================================================

def test_holiday_categories_and_regions():
    """Verify holiday categorization across 7 categories and state region filtering."""
    hols = get_holidays_and_festivals(year=2026)
    assert len(hols) >= 50

    cats = set(h["category"] for h in hols)
    expected_cats = {"national", "gazetted", "restricted", "state", "vrat", "bank"}
    assert expected_cats.issubset(cats), f"Missing categories: {expected_cats - cats}"

    # National holidays
    nat_hols = [h for h in hols if h["category"] == "national"]
    assert len(nat_hols) == 3
    nat_names = [h["nameEn"] for h in nat_hols]
    assert "Republic Day" in nat_names
    assert "Independence Day" in nat_names
    assert "Mahatma Gandhi's Birthday" in nat_names

    # Region filtering: Maharashtra (MH)
    mh_hols = get_holidays_and_festivals(year=2026, region="MH")
    assert any("Maharashtra Day" in h["nameEn"] for h in mh_hols)

    # Region filtering: Kerala (KL)
    kl_hols = get_holidays_and_festivals(year=2026, region="KL")
    assert any("Onam" in h["nameEn"] for h in kl_hols)

    # Bank holidays: 2nd and 4th Saturdays
    bank_hols = generate_monthly_bank_holidays(2026, 11)
    assert len(bank_hols) == 2  # 2nd & 4th Saturday


# =============================================================================
# 9. COMPOSITE CALENDAR MONTH PAYLOAD
# =============================================================================

def test_calendar_month_composite_service():
    """Verify /api/calendar/month combines dates, tithis, moon rashi, holidays, festivals."""
    cal = calculate_calendar_month(2026, 11, region="ALL")

    assert cal["year"] == 2026
    assert cal["month"] == 11
    assert cal["total_days"] == 30
    assert len(cal["days"]) == 30

    day1 = cal["days"][0]
    assert day1["day"] == 1
    assert "tithi_name" in day1
    assert "nakshatra_name" in day1
    assert "moon_rashi" in day1
    assert "sunrise" in day1
    assert "sunset" in day1
    assert "lunar_phase" in day1

    # Check Diwali day
    diwali_day = next(d for d in cal["days"] if d["date"] == "2026-11-08")
    assert diwali_day["has_events"] is True
    hol_names = [h["nameEn"] for h in diwali_day["holidays"]]
    assert any("Diwali" in name for name in hol_names)


# =============================================================================
# 10. FASTAPI GATEWAY ENDPOINTS INTEGRATION
# =============================================================================

def test_fastapi_endpoints():
    """Verify all 5 core FastAPI endpoints return 200 with structured data."""
    # 1. /api/panchang/daily
    r = client.get("/api/panchang/daily?date=2026-11-17&lat=28.6139&lon=77.2090")
    assert r.status_code == 200
    p = r.json()
    assert "tithi" in p and "nakshatra" in p

    # 2. /api/transits/monthly
    r = client.get("/api/transits/monthly?year=2026&month=11")
    assert r.status_code == 200
    t = r.json()
    assert len(t["planets"]) == 9
    assert len(t["lunar_phases"]) >= 4

    # 3. /api/rashifal/daily
    r = client.get("/api/rashifal/daily?date=2026-11-17")
    assert r.status_code == 200
    rf = r.json()
    assert len(rf["signs"]) == 12

    # 4. /api/holidays/list
    r = client.get("/api/holidays/list?year=2026&month=11")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    # 5. /api/calendar/month
    r = client.get("/api/calendar/month?year=2026&month=11")
    assert r.status_code == 200
    cm = r.json()
    assert len(cm["days"]) == 30
