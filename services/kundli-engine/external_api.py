"""
External Astrology API Integration Module:
Connects to FreeAstrologyAPI (https://json.freeastrologyapi.com/)
Provides third-party ephemeris verification, extended planetary metrics, and SVG chart URLs.
"""
import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

DEFAULT_API_KEY = "TlI51pEPIW3hTnSI8ogDTR66j48B5D278ZH7Gbkh"
API_BASE_URL = "https://json.freeastrologyapi.com"

def get_api_key() -> str:
    return os.environ.get("FREE_ASTROLOGY_API_KEY", DEFAULT_API_KEY)

def _make_api_request(endpoint: str, payload: Dict[str, Any], timeout: int = 10) -> Dict[str, Any]:
    url = f"{API_BASE_URL}/{endpoint}"
    data_bytes = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "x-api-key": get_api_key(),
        "User-Agent": "Astroverse-Engine/2.0"
    }

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            resp_body = response.read().decode("utf-8")
            return json.loads(resp_body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        return {
            "error": f"HTTP_{e.code}",
            "message": error_body or str(e),
            "endpoint": endpoint
        }
    except Exception as e:
        return {
            "error": "NETWORK_EXCEPTION",
            "message": str(e),
            "endpoint": endpoint
        }

def fetch_external_planets(
    year: int, month: int, date: int,
    hours: int, minutes: int, seconds: int = 0,
    latitude: float = 28.6139, longitude: float = 77.2090, timezone: float = 5.5
) -> Dict[str, Any]:
    """Queries FreeAstrologyAPI /planets endpoint for planetary longitudes."""
    payload = {
        "year": year,
        "month": month,
        "date": date,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
        "config": {
            "observation_point": "topocentric",
            "ayanamsha": "lahiri"
        }
    }
    return _make_api_request("planets", payload)

def fetch_external_chart_url(
    year: int, month: int, date: int,
    hours: int, minutes: int, seconds: int = 0,
    latitude: float = 28.6139, longitude: float = 77.2090, timezone: float = 5.5,
    chart_type: str = "rasi"
) -> Dict[str, Any]:
    """Queries FreeAstrologyAPI /horoscope-chart-url endpoint."""
    payload = {
        "year": year,
        "month": month,
        "date": date,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
        "chart_type": chart_type,
        "config": {
            "observation_point": "topocentric",
            "ayanamsha": "lahiri"
        }
    }
    return _make_api_request("horoscope-chart-url", payload)

def fetch_external_navamsa(
    year: int, month: int, date: int,
    hours: int, minutes: int, seconds: int = 0,
    latitude: float = 28.6139, longitude: float = 77.2090, timezone: float = 5.5
) -> Dict[str, Any]:
    """Queries FreeAstrologyAPI /navamsa-chart-info endpoint."""
    payload = {
        "year": year,
        "month": month,
        "date": date,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
        "config": {
            "observation_point": "topocentric",
            "ayanamsha": "lahiri"
        }
    }
    return _make_api_request("navamsa-chart-info", payload)
