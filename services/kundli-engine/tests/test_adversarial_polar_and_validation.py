"""
AstroVerse AI — Polar Latitude Hardening & Input Validation Test Suite
====================================================================
Tests for Milestone M5 Adversarial Remediations:
- Polar latitude house system fallbacks (Tromsø, Svalbard, 89°N, 89°S)
- ISO format validation for DOB on kundli endpoints (HTTP 400)
- Timezone fallback resilience in Upagrahas and Ephemeris
- Client socket IP rate limiter key derivation
"""

import pytest
import sys
import os
from datetime import datetime
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from ephemeris import calculate_kundli
from upagraha_engine import calculate_upagrahas
from kp_engine import calculate_kp_chart
from tajika_engine import calculate_varshaphal
from btr_engine import evaluate_btr_candidates

client = TestClient(app)

def test_polar_latitude_ephemeris_fallback():
    """Verify calculate_kundli succeeds at extreme polar latitudes where Placidus is undefined."""
    polar_coords = [
        (69.6492, 18.9553),   # Tromsø, Norway
        (78.2232, 15.6267),   # Longyearbyen, Svalbard
        (82.5018, -62.3481),  # Alert, Nunavut, Canada
        (89.0, 0.0),          # Extreme North
        (-89.0, 0.0),         # Extreme South
    ]
    for lat, lon in polar_coords:
        chart = calculate_kundli("1995-06-15T10:30:00", lat, lon, "UTC")
        assert "lagna" in chart
        assert 0.0 <= chart["lagna"]["total_degree"] < 360.0
        assert "planets" in chart
        assert len(chart["planets"]) >= 9

def test_polar_latitude_upagrahas_fallback():
    """Verify calculate_upagrahas succeeds at polar latitudes."""
    res = calculate_upagrahas("1995-06-15T10:30:00", 89.0, 0.0, "UTC")
    assert "all_upagrahas" in res
    assert len(res["all_upagrahas"]) == 11

def test_polar_latitude_kp_fallback():
    """Verify calculate_kp_chart succeeds at polar latitudes."""
    res = calculate_kp_chart("1995-06-15T10:30:00", 78.2232, 15.6267, "UTC")
    assert "house_cusps" in res
    assert len(res["house_cusps"]) == 12

def test_polar_latitude_tajika_fallback():
    """Verify calculate_varshaphal succeeds at polar latitudes."""
    res = calculate_varshaphal("1995-06-15T10:30:00", 2026, 89.0, 0.0, "UTC")
    assert "varsha_lagna" in res
    assert "muntha" in res

def test_polar_latitude_btr_fallback():
    """Verify evaluate_btr_candidates succeeds at polar latitudes."""
    res = evaluate_btr_candidates("1995-06-15T10:30:00", 89.0, 0.0, window_minutes=10, step_minutes=5)
    assert "candidate_ranking" in res
    assert len(res["candidate_ranking"]) > 0

def test_polar_latitude_complete_kundli_endpoint():
    """Verify POST /api/complete-kundli returns HTTP 200 for extreme polar coordinates."""
    response = client.post("/api/complete-kundli", json={
        "dob": "1995-06-15T10:30:00",
        "lat": 89.0,
        "lon": 0.0,
        "timezone": "UTC"
    })
    assert response.status_code == 200
    data = response.json()
    assert "d1_rashi_chart" in data
    assert "vimshottari_dasha" in data

def test_invalid_dob_raises_http_400():
    """Verify invalid ISO DOB strings return HTTP 400 Bad Request with descriptive message."""
    invalid_dates = [
        "invalid-date",
        "not-a-real-date",
        "2023-02-29T12:00:00",  # 2023 is not a leap year
        "1995/06/15 10:30:00",  # non-ISO format
    ]
    for bad_dob in invalid_dates:
        r1 = client.post("/api/complete-kundli", json={
            "dob": bad_dob,
            "lat": 28.6139,
            "lon": 77.2090,
            "timezone": "Asia/Kolkata"
        })
        assert r1.status_code == 400
        assert "Invalid ISO date format for dob" in r1.json()["detail"]

        r2 = client.post("/api/kundli", json={
            "dob": bad_dob,
            "lat": 28.6139,
            "lon": 77.2090,
            "timezone": "Asia/Kolkata"
        })
        assert r2.status_code == 400
        assert "Invalid ISO date format for dob" in r2.json()["detail"]

def test_invalid_timezone_fallback_resilience():
    """Verify invalid or path-traversal timezones fall back safely without crashing."""
    malformed_timezones = [
        "Invalid/Fake_Zone_123",
        "../../etc/passwd",
        "NonExistent/Zone",
    ]
    for bad_tz in malformed_timezones:
        # Upagrahas engine should catch ZoneInfo error and fall back gracefully
        upag = calculate_upagrahas("1995-06-15T10:30:00", 28.6, 77.2, bad_tz)
        assert "all_upagrahas" in upag
        assert len(upag["all_upagrahas"]) == 11

        # Complete kundli should complete successfully
        r = client.post("/api/complete-kundli", json={
            "dob": "1995-06-15T10:30:00",
            "lat": 28.6139,
            "lon": 77.2090,
            "timezone": bad_tz
        })
        assert r.status_code == 200
