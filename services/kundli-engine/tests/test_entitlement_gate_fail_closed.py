import sys
import os
import pytest

TEST_KEY = "test-internal-secret-token-pytest-valid-2026"
os.environ["ASTROVERSE_INTERNAL_KEY"] = TEST_KEY

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app

client = TestClient(app)

TEST_BIRTH_PAYLOAD = {
    "dob": "1990-05-15T14:30:00",
    "lat": 28.6139,
    "lon": 77.2090,
    "timezone": "Asia/Kolkata",
    "category": "general",
    "lang": "en"
}

def test_direct_unauthenticated_request_with_tampered_unlock_fails_closed():
    """
    P0 Invariant: A client directly invoking /api/predictions/generate with
    is_unlocked=True and preview_tier='PREMIUM' WITHOUT the internal gateway key
    MUST be stripped of privilege and forced to FREE locked tier.
    """
    payload = {
        **TEST_BIRTH_PAYLOAD,
        "horizon": "weekly",
        "is_unlocked": True,            # ATTACK ATTEMPT
        "preview_tier": "PREMIUM"       # ATTACK ATTEMPT
    }
    # Direct caller sends no internal secret key
    resp = client.post("/api/predictions/generate", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["server_gate_verified"] is False, "External caller must not be marked verified"
    assert data["authoritative_unlocked"] is False, "Must fail closed to unlocked=False"
    assert data["effective_tier"] == "FREE", "Must force tier to FREE"
    assert data["preview"]["unlocked"] is False
    assert data["preview"]["is_preview"] is True

    # Day 3 (index 2) must be locked
    items = data["period_items"]["items"]
    assert items[0]["is_preview_locked"] is False
    assert items[1]["is_preview_locked"] is False
    assert items[2]["is_preview_locked"] is True, "Day 3 must be locked for unauthorized caller"

def test_forged_internal_key_fails_closed():
    """
    Attacker sending an invalid/forged x-astroverse-internal-key must be rejected
    and forced to unauthenticated FREE state.
    """
    payload = {
        **TEST_BIRTH_PAYLOAD,
        "horizon": "monthly",
        "is_unlocked": True,
        "preview_tier": "PREMIUM"
    }
    headers = {"x-astroverse-internal-key": "invalid-forged-token-xyz"}
    resp = client.post("/api/predictions/generate", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["server_gate_verified"] is False
    assert data["authoritative_unlocked"] is False
    assert data["effective_tier"] == "FREE"

def test_compromised_legacy_key_strictly_rejected():
    """
    P0 Invariant: The publicly exposed fallback 'astroverse-internal-gateway-secret-2026'
    is permanently blacklisted and MUST fail closed even if an attacker supplies it.
    """
    payload = {
        **TEST_BIRTH_PAYLOAD,
        "horizon": "monthly",
        "is_unlocked": True,
        "preview_tier": "PREMIUM"
    }
    headers = {"x-astroverse-internal-key": "astroverse-internal-gateway-secret-2026"}
    resp = client.post("/api/predictions/generate", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["server_gate_verified"] is False
    assert data["authoritative_unlocked"] is False
    assert data["effective_tier"] == "FREE"

def test_authorized_internal_gateway_request_honors_server_unlock():
    """
    Requests arriving from our internal wallet-service gateway with valid
    x-astroverse-internal-key are authoritatively honored.
    """
    payload = {
        **TEST_BIRTH_PAYLOAD,
        "horizon": "monthly",
        "is_unlocked": True,
        "preview_tier": "PREMIUM"
    }
    headers = {"x-astroverse-internal-key": TEST_KEY}
    resp = client.post("/api/predictions/generate", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["server_gate_verified"] is True
    assert data["authoritative_unlocked"] is True
    assert data["effective_tier"] == "PREMIUM"
    assert data["preview"]["unlocked"] is True
    assert data["preview"]["is_preview"] is False

    # All weeks must be unlocked
    items = data["period_items"]["items"]
    for item in items:
        assert item["is_preview_locked"] is False, f"Week {item.get('week_index', item.get('period_index'))} must be unlocked for Premium"

def test_all_six_horizons_fail_closed_against_tampered_unlock():
    """
    Verify fail-closed behavior across all six horizons:
    hourly, daily, weekly, monthly, yearly, mahadasha.
    """
    for horizon in ["hourly", "daily", "weekly", "monthly", "yearly", "mahadasha"]:
        payload = {
            **TEST_BIRTH_PAYLOAD,
            "horizon": horizon,
            "is_unlocked": True,
            "preview_tier": "PREMIUM"
        }
        resp = client.post("/api/predictions/generate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["server_gate_verified"] is False
        assert data["effective_tier"] == "FREE"

        if horizon in ["hourly", "daily"]:
            # Hourly and daily are naturally free
            assert data["preview"]["unlocked"] is True
        else:
            # Paid horizons must be locked
            assert data["preview"]["unlocked"] is False
            assert data["preview"]["is_preview"] is True
