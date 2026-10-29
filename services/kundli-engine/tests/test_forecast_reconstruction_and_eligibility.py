"""
Comprehensive Unit & Integration Test Suite:
AstroVerse Forensic Astrology Engine & Personalized Forecast Reconstruction
Validates:
1. Strict forecast eligibility gating: all 6 modes fail-closed with CHART_REQUIRED when no chart is provided.
2. Explicit universal transit preview: non-personalized, authentic astronomical transits, zero fake natal house activations.
3. Vimshottari Mahadasha timeline strictly requires natal birth chart; cannot be inferred universally.
4. Chart-grounded personalized forecasts across all 6 horizons (Hourly, Daily, Weekly, Monthly, Yearly, Mahadasha).
5. Canonical Chart Snapshot data provenance and integrity.
6. Anti-repetition across weekly 7-day cards, monthly 4-week cards, and yearly 12-month cards.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import date, datetime
from fastapi.testclient import TestClient

from main import app, PredictionRequest, generate_prediction_endpoint
from ai_astrologer import generate_structured_prediction

client = TestClient(app)

# Standard reference test chart (Anand Sharma - Leo Lagna, Sagittarius Moon in Uttara Ashadha)
ANAND_SHARMA_PAYLOAD = {
    "dob": "1995-06-15T10:30:00",
    "lat": 28.6139,
    "lon": 77.2090,
    "timezone": "Asia/Kolkata",
    "profile_id": "prof_anand_sharma",
    "profile_name": "Anand Sharma",
    "target_date": "2026-10-29",
    "lang": "en"
}

ALL_SIX_HORIZONS = ["hourly", "daily", "weekly", "monthly", "yearly", "mahadasha"]

def test_no_chart_strict_eligibility_all_six_modes():
    """Verify that requesting ANY of the six horizons without a chart fails closed with CHART_REQUIRED."""
    for h in ALL_SIX_HORIZONS:
        req = PredictionRequest(horizon=h, target_date="2026-10-29", lang="en")
        res = generate_prediction_endpoint(req)
        assert res["status"] == "CHART_REQUIRED", f"Horizon {h} must return status CHART_REQUIRED"
        assert res["requires_chart"] is True, f"Horizon {h} must require chart"
        assert res["profile_loaded"] is False, f"Horizon {h} must indicate profile_loaded is False"
        assert res["is_personalized"] is False, f"Horizon {h} must indicate is_personalized is False"
        assert "Personalized" in res["message"] or "requires" in res["message"], f"Message must explain chart requirement for {h}"
        assert res["cta"]["action"] == "calculate_kundli", f"Horizon {h} must provide calculate_kundli CTA"

def test_no_chart_hindi_strict_eligibility():
    """Verify Devanagari Hindi eligibility gating messages when no chart is loaded."""
    for h in ALL_SIX_HORIZONS:
        req = PredictionRequest(horizon=h, target_date="2026-10-29", lang="hi")
        res = generate_prediction_endpoint(req)
        assert res["status"] == "CHART_REQUIRED"
        assert res["requires_chart"] is True
        assert "जन्म विवरण अनिवार्य है" in res["message"] or "कुंडली बनाएं" in res["message"]
        assert res["cta"]["label"] == "अपनी जन्म कुंडली बनाएं"

def test_mahadasha_requires_chart_even_in_universal_preview():
    """Vimshottari Mahadasha is strictly derived from natal Moon degree and cannot be computed universally."""
    req = PredictionRequest(
        horizon="mahadasha",
        target_date="2026-10-29",
        is_universal_preview=True,
        mode="UNIVERSAL_PREVIEW",
        lang="en"
    )
    res = generate_prediction_endpoint(req)
    assert res["status"] == "CHART_REQUIRED"
    assert res["requires_chart"] is True
    assert "Vimshottari Mahadasha timeline requires a calculated birth chart" in res["message"]

def test_explicit_universal_preview_mode_hourly_daily_weekly():
    """Explicit universal transit preview provides authentic astronomical data without fake natal claims."""
    preview_horizons = ["hourly", "daily", "weekly", "monthly", "yearly"]
    for h in preview_horizons:
        req = PredictionRequest(
            horizon=h,
            target_date="2026-10-29",
            is_universal_preview=True,
            mode="UNIVERSAL_PREVIEW",
            active_hora_planet="Jupiter",
            hora_window="07:00 AM – 08:00 AM",
            lang="en"
        )
        res = generate_prediction_endpoint(req)
        assert res["status"] == "SUCCESS", f"Universal preview for {h} must succeed"
        assert res["mode"] == "GENERAL_TRANSIT_UNPERSONALIZED"
        assert res["is_personalized"] is False
        assert res["profile_loaded"] is False
        assert res["requires_chart"] is False
        assert "unpersonalized transit baseline" in res["sections"]["limitations"].lower()

        # In universal weekly mode, zero fake natal house activations should be claimed
        if h == "weekly":
            items = res["period_items"]["items"]
            assert len(items) == 7, "Weekly forecast must contain exactly 7 daily cards"
            for card in items:
                assert card["activated_house"] is None, "Universal weekly card must NOT claim an activated natal house"
                assert "Universal transit" in card.get("guidance", "") or "Universal" in card.get("teaser", "")
                assert card.get("tarabala") is None, "Universal weekly card must NOT claim Tara Bala without natal Moon"
                assert card.get("chandrabala") is None, "Universal weekly card must NOT claim Chandra Bala without natal Moon"

def test_personalized_chart_grounded_predictions_all_six_modes():
    """With verified birth details, all 6 horizons generate authentic chart-grounded forecasts with snapshot provenance."""
    for h in ALL_SIX_HORIZONS:
        payload = dict(ANAND_SHARMA_PAYLOAD)
        payload["horizon"] = h
        req = PredictionRequest(**payload)
        res = generate_prediction_endpoint(req)

        assert res["status"] == "SUCCESS", f"Personalized {h} must succeed"
        assert res["mode"] == "PERSONALIZED_CHART_GROUNDED"
        assert res["profile_loaded"] is True
        assert res["is_personalized"] is True
        assert res["requires_chart"] is False

        # Verify Canonical Chart Snapshot
        snapshot = res["chart_snapshot"]
        assert snapshot["profile_id"] == "prof_anand_sharma"
        assert snapshot["name"] == "Anand Sharma"
        assert snapshot["lagna_sign"] == "Leo"
        assert snapshot["moon_sign"] == "Sagittarius"
        assert snapshot["ayanamsha"] == "Lahiri (Chitra Paksha)"
        assert "Swiss Ephemeris" in snapshot["ephemeris_engine"]
        assert snapshot["active_mahadasha"] is not None

        # Verify Horizon-Specific Requirements
        if h == "weekly":
            items = res["period_items"]["items"]
            assert len(items) == 7, "Weekly forecast must have 7 daily cards"
            houses_energized = []
            for idx, card in enumerate(items):
                assert card["activated_house"] is not None, f"Day {idx+1} must identify energized natal house"
                assert 1 <= card["activated_house"] <= 12, "Activated house must be between 1 and 12"
                houses_energized.append(card["activated_house"])
                if not card.get("is_preview_locked"):
                    assert card.get("tarabala") is not None, "Personalized day must compute Tara Bala"
                    assert card.get("chandrabala") is not None, "Personalized day must compute Chandra Bala"

        elif h == "monthly":
            items = res["period_items"]["items"]
            assert len(items) == 4, "Monthly forecast must have 4 week progression cards"

        elif h == "yearly":
            items = res["period_items"]["items"]
            assert len(items) == 12, "Yearly forecast must have 12 monthly cards"
            quarters = res["period_items"].get("quarters", [])
            assert len(quarters) == 4, "Yearly forecast must have 4 strategic quarters"

        elif h == "mahadasha":
            items = res["period_items"]["items"]
            assert len(items) == 5, "Mahadasha forecast must have 5-year chronological progression"
            for y_card in items:
                assert "Mahadasha" in y_card["ruling_period"]

def test_anti_repetition_across_forecast_periods():
    """Verify that daily, weekly, and monthly period items do not use copy-paste identical paragraphs."""
    # Test Weekly 7 days
    payload = dict(ANAND_SHARMA_PAYLOAD)
    payload["horizon"] = "weekly"
    payload["is_unlocked"] = True  # Unlock all 7 days to inspect guidance
    req = PredictionRequest(**payload)
    res = generate_prediction_endpoint(req)
    items = res["period_items"]["items"]

    guidances = [card["guidance"] for card in items]
    assert len(guidances) == 7
    # All 7 daily guidance paragraphs must be unique
    assert len(set(guidances)) == 7, "Each day in the 7-day forecast must have unique guidance without copy-paste repetition"

    # Test Monthly 4 weeks
    payload["horizon"] = "monthly"
    req_m = PredictionRequest(**payload)
    res_m = generate_prediction_endpoint(req_m)
    m_items = res_m["period_items"]["items"]
    m_guidance = [w["focus_guidance"] for w in m_items]
    assert len(set(m_guidance)) == 4, "Each week in the 4-week forecast must have distinct strategic guidance"

    # Test Yearly 12 months
    payload["horizon"] = "yearly"
    req_y = PredictionRequest(**payload)
    res_y = generate_prediction_endpoint(req_y)
    y_items = res_y["period_items"]["items"]
    y_guidance = [m["guidance"] for m in y_items]
    assert len(set(y_guidance)) == 12, "Each month in the 12-month forecast must have distinct solar/planetary guidance"
