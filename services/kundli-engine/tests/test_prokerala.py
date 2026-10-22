"""
Prokerala API Integration Test Suite
Verifies OAuth 2.0 Bearer token generation and astrological endpoint queries.
"""
import sys
import os
import time
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from prokerala_api import (
    get_client_credentials,
    get_access_token,
    get_prokerala_planet_position,
    get_prokerala_kundli,
    get_prokerala_panchang,
    get_prokerala_mangal_dosha
)

def test_prokerala_oauth():
    print("Testing Prokerala OAuth token generation...")
    cid, csec = get_client_credentials()
    if not cid or not csec:
        pytest.skip("PROKERALA_CLIENT_ID or PROKERALA_CLIENT_SECRET not configured in environment")
    try:
        token = get_access_token()
        assert token is not None, "Failed to retrieve access token"
        assert len(token) > 20, "Token appears malformed"
        print(f"[PASS] Prokerala token retrieved successfully: {token[:12]}...")
    except RuntimeError as e:
        if "getaddrinfo failed" in str(e) or "Connection Error" in str(e):
            pytest.skip(f"Prokerala server unreachable in current environment: {e}")
        raise

def test_prokerala_planet_positions():
    print("Testing Prokerala planet-position endpoint...")
    cid, csec = get_client_credentials()
    if not cid or not csec:
        pytest.skip("PROKERALA_CLIENT_ID or PROKERALA_CLIENT_SECRET not configured in environment")
    # DOB: 2005-08-20 14:05:00 at Jabalpur
    dt = "2005-08-20T14:05:00+05:30"
    lat, lon = 23.1815, 79.9864
    try:
        res = get_prokerala_planet_position(dt, lat, lon)
        assert res.get("status") == "ok", f"Expected ok status, got: {res}"
        planets = res.get("data", {}).get("planet_position", [])
        assert len(planets) >= 7, f"Expected at least 7 planets, got: {len(planets)}"
        
        # Verify Sun in Simha (Leo) and Moon in Kumbha (Aquarius)
        sun = next((p for p in planets if p["name"] == "Sun"), None)
        moon = next((p for p in planets if p["name"] == "Moon"), None)
        assert sun is not None
        assert sun["rasi"]["name"] == "Simha", f"Expected Sun in Simha, got {sun['rasi']['name']}"
        assert moon is not None
        assert moon["rasi"]["name"] == "Kumbha", f"Expected Moon in Kumbha, got {moon['rasi']['name']}"
        print("[PASS] Prokerala planet positions verified (Sun in Simha, Moon in Kumbha)")
    except RuntimeError as e:
        if "getaddrinfo failed" in str(e) or "Connection Error" in str(e):
            pytest.skip(f"Prokerala server unreachable in current environment: {e}")
        raise

def test_prokerala_kundli():
    print("Testing Prokerala kundli endpoint...")
    cid, csec = get_client_credentials()
    if not cid or not csec:
        pytest.skip("PROKERALA_CLIENT_ID or PROKERALA_CLIENT_SECRET not configured in environment")
    time.sleep(1.2) # Rate limit safety
    dt = "2005-08-20T14:05:00+05:30"
    lat, lon = 23.1815, 79.9864
    try:
        res = get_prokerala_kundli(dt, lat, lon)
        assert res.get("status") == "ok", f"Expected ok status, got: {res}"
        nak = res.get("data", {}).get("nakshatra_details", {}).get("nakshatra", {})
        assert nak.get("name") == "Shatabhisha", f"Expected Shatabhisha, got: {nak.get('name')}"
        print(f"[PASS] Prokerala kundli verified: Nakshatra is {nak.get('name')}")
    except RuntimeError as e:
        if "getaddrinfo failed" in str(e) or "Connection Error" in str(e):
            pytest.skip(f"Prokerala server unreachable in current environment: {e}")
        raise

if __name__ == "__main__":
    test_prokerala_oauth()
    test_prokerala_planet_positions()
    test_prokerala_kundli()
    print("\nALL PROKERALA API TESTS PASSED!")
