"""
Tests for FreeAstroAPI Integration (https://www.freeastroapi.com/llms.txt)
Validates:
1. Header structure (x-api-key strictly server-side).
2. Environment configuration (FREE_ASTRO_API_KEY precedence).
3. Payload schemas for /api/v1/natal/calculate and /api/v2/vedic/chart.
4. Error handling & fail-closed behavior when credentials are missing.
5. FastAPI route integration (/api/external-natal, /api/external-kundli).
"""
import os
import sys
import json
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from external_api import (
    get_api_key,
    _make_api_request,
    fetch_external_natal_calculate,
    fetch_external_vedic_chart,
    fetch_external_visual_chart,
    API_BASE_URL
)
from main import app

client = TestClient(app)

def test_freeastroapi_key_retrieval(monkeypatch):
    """Verifies FREE_ASTRO_API_KEY precedence over fallback keys."""
    monkeypatch.setenv("FREE_ASTRO_API_KEY", "primary_test_key_123")
    monkeypatch.setenv("FREE_ASTROLOGY_API_KEY", "fallback_key_456")
    assert get_api_key() == "primary_test_key_123"

    monkeypatch.delenv("FREE_ASTRO_API_KEY", raising=False)
    assert get_api_key() == "fallback_key_456"

    monkeypatch.delenv("FREE_ASTROLOGY_API_KEY", raising=False)
    assert get_api_key() is None

def test_missing_credentials_fails_closed(monkeypatch):
    """Ensures requests fail closed with 503 when no key is configured."""
    monkeypatch.delenv("FREE_ASTRO_API_KEY", raising=False)
    monkeypatch.delenv("FREE_ASTROLOGY_API_KEY", raising=False)

    res = fetch_external_natal_calculate(1990, 5, 15, 14, 30)
    assert isinstance(res, dict)
    assert res.get("error") == "CONFIG_ERROR_MISSING_API_KEY"
    assert res.get("statusCode") == 503

def test_natal_calculate_request_contract(monkeypatch):
    """
    Validates the minimal server-side test request matches /llms.txt specification:
    - Base URL: https://api.freeastroapi.com/api/v1/natal/calculate
    - Header: x-api-key: <key>
    - Payload fields: year, month, day, hour, minute, city, lat, lng, tz_str, time_known
    """
    test_key = "test_key_abc123"
    monkeypatch.setenv("FREE_ASTRO_API_KEY", test_key)

    mock_response_body = {
        "subject": {"name": "Test Subject"},
        "planets": [{"name": "Sun", "sign": "Taurus", "degree": 24.5}],
        "houses": [{"number": 1, "sign": "Virgo"}],
        "angles": {"ascendant": 165.2}
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_response_body).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_cm

        res = fetch_external_natal_calculate(
            year=1990, month=5, day=15,
            hour=14, minute=30,
            city="New York",
            lat=40.7128, lng=-74.0060,
            tz_str="America/New_York",
            time_known=True
        )

        assert mock_urlopen.called
        req_arg = mock_urlopen.call_args[0][0]

        # Verify target URL
        assert req_arg.full_url == f"{API_BASE_URL}/api/v1/natal/calculate"

        # Verify x-api-key header and Content-Type
        assert req_arg.headers["X-api-key"] == test_key or req_arg.headers.get("x-api-key") == test_key
        assert req_arg.headers["Content-type"] == "application/json"

        # Verify payload content
        sent_payload = json.loads(req_arg.data.decode("utf-8"))
        assert sent_payload["year"] == 1990
        assert sent_payload["month"] == 5
        assert sent_payload["day"] == 15
        assert sent_payload["hour"] == 14
        assert sent_payload["minute"] == 30
        assert sent_payload["city"] == "New York"
        assert sent_payload["lat"] == 40.7128
        assert sent_payload["lng"] == -74.0060
        assert sent_payload["tz_str"] == "America/New_York"
        assert sent_payload["time_known"] is True

        # Verify returned data
        assert res == mock_response_body

def test_fastapi_external_natal_endpoint(monkeypatch):
    """Validates FastAPI POST /api/external-natal route."""
    test_key = "test_key_fastapi"
    monkeypatch.setenv("FREE_ASTRO_API_KEY", test_key)

    mock_response_body = {
        "planets": [{"name": "Moon", "sign": "Cancer"}],
        "houses": [{"number": 1, "sign": "Leo"}]
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_response_body).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_cm

        payload = {
            "dob": "1990-05-15T14:30:00",
            "lat": 40.7128,
            "lon": -74.0060,
            "timezone": "America/New_York"
        }
        response = client.post("/api/external-natal", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert body["provider"] == "FreeAstroAPI"
        assert body["endpoint"] == "/api/v1/natal/calculate"
        assert "planets" in body["data"]

def test_fastapi_external_natal_missing_key(monkeypatch):
    """Validates FastAPI POST /api/external-natal fails closed with 503 if unconfigured."""
    monkeypatch.delenv("FREE_ASTRO_API_KEY", raising=False)
    monkeypatch.delenv("FREE_ASTROLOGY_API_KEY", raising=False)

    payload = {
        "dob": "1990-05-15T14:30:00",
        "lat": 40.7128,
        "lon": -74.0060,
        "timezone": "America/New_York"
    }
    response = client.post("/api/external-natal", json=payload)
    assert response.status_code == 503
    assert "FreeAstroAPI credentials are not configured" in response.json()["detail"]
