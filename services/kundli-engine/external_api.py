"""
FreeAstroAPI Integration Module (https://api.freeastroapi.com)
Documentation: https://www.freeastroapi.com/llms.txt

Provides server-side access to FreeAstroAPI Vedic & Western endpoints:
- Vedic Chart: /api/v2/vedic/chart
- Full Vedic Calculate: /api/v2/vedic/calculate
- Visual Chart (SVG): /api/v2/vedic/visual/chart
- Vimshottari Dasha: /api/v2/vedic/dasha
- Compatibility & Matching: /api/v2/vedic/match
"""
import os
import json
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Union

try:
    from dotenv import load_dotenv
    load_dotenv()
    _module_env = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(_module_env):
        load_dotenv(_module_env)
except ImportError:
    pass

# Server-side environment key precedence:
# 1. FREE_ASTRO_API_KEY (Official FreeAstroAPI env variable)
# 2. FREE_ASTROLOGY_API_KEY (Backward-compatible fallback)
# Credentials must strictly be supplied via server-side environment variables.
API_BASE_URL = "https://api.freeastroapi.com"

def get_api_key() -> Optional[str]:
    """Retrieves FreeAstroAPI key strictly from server environment variables."""
    key = os.environ.get("FREE_ASTRO_API_KEY") or os.environ.get("FREE_ASTROLOGY_API_KEY")
    if key and key.strip():
        return key.strip()
    return None

def _make_api_request(
    endpoint: str,
    payload: Dict[str, Any],
    timeout: int = 15,
    raw_response: bool = False,
    max_retries: int = 2
) -> Union[Dict[str, Any], str]:
    """
    Executes an authenticated HTTP POST request to FreeAstroAPI.
    x-api-key header is passed strictly server-side.
    Automatically handles 1 req/sec rate limits (HTTP 429) via exponential jitter backoff.
    Fails closed with CONFIG_ERROR_MISSING_API_KEY if credentials are not configured.
    """
    api_key = get_api_key()
    if not api_key:
        return {
            "error": "CONFIG_ERROR_MISSING_API_KEY",
            "statusCode": 503,
            "message": "FreeAstroAPI credentials are not configured. Set FREE_ASTRO_API_KEY in server environment.",
            "endpoint": endpoint
        }

    if endpoint.startswith("/"):
        url = f"{API_BASE_URL}{endpoint}"
    else:
        url = f"{API_BASE_URL}/api/v2/vedic/{endpoint}"

    data_bytes = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "User-Agent": "Astroverse-Backend/2.0"
    }

    for attempt in range(max_retries + 1):
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                if raw_response:
                    return response.read().decode("utf-8")
                resp_body = response.read().decode("utf-8")
                return json.loads(resp_body)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="ignore")
            # Handle rate-limit with backoff
            if e.code == 429 and attempt < max_retries:
                wait_sec = 1.2
                try:
                    err_data = json.loads(error_body)
                    if "retry_after_ms" in err_data:
                        wait_sec = (err_data["retry_after_ms"] / 1000.0) + 0.2
                except Exception:
                    pass
                time.sleep(wait_sec)
                continue

            return {
                "error": f"HTTP_{e.code}",
                "statusCode": e.code,
                "message": error_body or str(e),
                "endpoint": endpoint
            }
        except Exception as e:
            return {
                "error": "NETWORK_EXCEPTION",
                "statusCode": 500,
                "message": str(e),
                "endpoint": endpoint
            }

def fetch_external_natal_calculate(
    year: int, month: int, day: int,
    hour: int, minute: int,
    city: str = "New Delhi",
    lat: float = 28.6139,
    lng: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    time_known: bool = True
) -> Dict[str, Any]:
    """
    Minimal / Western Natal calculation endpoint from FreeAstroAPI:
    POST /api/v1/natal/calculate
    Documentation: https://www.freeastroapi.com/llms.txt
    Returns: { subject, planets, aspects, aspects_summary, confidence, houses, angles, angles_details }
    """
    payload = {
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "minute": minute,
        "city": city,
        "lat": lat,
        "lng": lng,
        "tz_str": tz_str,
        "time_known": time_known
    }
    return _make_api_request("/api/v1/natal/calculate", payload)

def fetch_external_vedic_chart(
    year: int, month: int, day: int,
    hour: int, minute: int,
    city: str = "New Delhi",
    lat: float = 28.6139,
    lng: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    ayanamsha: str = "lahiri",
    house_system: str = "whole_sign",
    node_type: str = "mean"
) -> Dict[str, Any]:
    """
    Queries FreeAstroAPI /api/v2/vedic/chart.
    Returns: { ascendant, planets, houses, sade_sati, metadata }
    """
    payload = {
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "minute": minute,
        "city": city,
        "lat": lat,
        "lng": lng,
        "tz_str": tz_str,
        "ayanamsha": ayanamsha,
        "house_system": house_system,
        "node_type": node_type
    }
    return _make_api_request("/api/v2/vedic/chart", payload)

def fetch_external_visual_chart(
    year: int, month: int, day: int,
    hour: int, minute: int,
    city: str = "New Delhi",
    lat: float = 28.6139,
    lng: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    divisions: Optional[List[int]] = None,
    chart_style: str = "north_indian",
    size: int = 600
) -> str:
    """
    Queries FreeAstroAPI /api/v2/vedic/visual/chart.
    Returns rendered SVG string (format: 'svg').
    """
    if divisions is None:
        divisions = [1, 9]

    payload = {
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "minute": minute,
        "city": city,
        "lat": lat,
        "lng": lng,
        "tz_str": tz_str,
        "ayanamsha": "lahiri",
        "house_system": "whole_sign",
        "node_type": "mean",
        "divisions": divisions,
        "chart_style": chart_style,
        "format": "svg",
        "size": size
    }
    return _make_api_request("/api/v2/vedic/visual/chart", payload, raw_response=True)

def fetch_external_calculate(
    year: int, month: int, day: int,
    hour: int, minute: int,
    city: str = "New Delhi",
    lat: float = 28.6139,
    lng: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    vargas: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Queries FreeAstroAPI /api/v2/vedic/calculate.
    Full all-in-one Vedic endpoint with chart, vargas, dasha, yogas, panchang, shadbala, ashtakavarga.
    """
    if vargas is None:
        vargas = [1, 9, 10]

    payload = {
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "minute": minute,
        "city": city,
        "lat": lat,
        "lng": lng,
        "tz_str": tz_str,
        "ayanamsha": "lahiri",
        "house_system": "whole_sign",
        "node_type": "mean",
        "vargas": vargas,
        "include_yogas": True,
        "include_panchang": True,
        "include_shadbala": True,
        "include_ashtakavarga": True,
        "dasha_levels": 2
    }
    return _make_api_request("/api/v2/vedic/calculate", payload)

def fetch_external_dasha(
    year: int, month: int, day: int,
    hour: int, minute: int,
    city: str = "New Delhi",
    lat: float = 28.6139,
    lng: float = 77.2090,
    tz_str: str = "Asia/Kolkata",
    levels: int = 3
) -> Dict[str, Any]:
    """
    Queries FreeAstroAPI /api/v2/vedic/dasha.
    Returns multi-level Vimshottari dasha hierarchy.
    """
    payload = {
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "minute": minute,
        "city": city,
        "lat": lat,
        "lng": lng,
        "tz_str": tz_str,
        "ayanamsha": "lahiri",
        "house_system": "whole_sign",
        "node_type": "mean",
        "levels": levels
    }
    return _make_api_request("/api/v2/vedic/dasha", payload)

# ==================== BACKWARD-COMPATIBLE ADAPTERS ====================

def fetch_external_planets(
    year: int, month: int, date: int,
    hours: int, minutes: int, seconds: int = 0,
    latitude: float = 28.6139, longitude: float = 77.2090, timezone: float = 5.5
) -> Dict[str, Any]:
    """
    Backward-compatible adapter mapping to FreeAstroAPI /api/v2/vedic/chart.
    """
    res = fetch_external_vedic_chart(
        year=year,
        month=month,
        day=date,
        hour=hours,
        minute=minutes,
        lat=latitude,
        lng=longitude
    )
    if isinstance(res, dict) and "planets" in res:
        return {
            "statusCode": 200,
            "output": res.get("planets", []),
            "ascendant": res.get("ascendant", {}),
            "houses": res.get("houses", []),
            "raw": res
        }
    return res

def fetch_external_chart_url(
    year: int, month: int, date: int,
    hours: int, minutes: int, seconds: int = 0,
    latitude: float = 28.6139, longitude: float = 77.2090, timezone: float = 5.5,
    chart_type: str = "rasi"
) -> Dict[str, Any]:
    """
    Backward-compatible adapter returning FreeAstroAPI SVG visual chart.
    """
    svg_res = fetch_external_visual_chart(
        year=year,
        month=month,
        day=date,
        hour=hours,
        minute=minutes,
        lat=latitude,
        lng=longitude,
        divisions=[1] if chart_type == "rasi" else [1, 9]
    )
    if isinstance(svg_res, str) and "<svg" in svg_res:
        return {
            "statusCode": 200,
            "svg": svg_res,
            "chart_type": chart_type
        }
    return {
        "statusCode": 500,
        "error": "FAILED_TO_GENERATE_SVG",
        "details": svg_res
    }

def fetch_external_navamsa(
    year: int, month: int, date: int,
    hours: int, minutes: int, seconds: int = 0,
    latitude: float = 28.6139, longitude: float = 77.2090, timezone: float = 5.5
) -> Dict[str, Any]:
    """
    Backward-compatible adapter querying FreeAstroAPI v2 /calculate for D9 Navamsha.
    Resolves runtime ImportError across Vercel deployment revisions.
    """
    calc_res = fetch_external_calculate(
        year=year,
        month=month,
        day=date,
        hour=hours,
        minute=minutes,
        lat=latitude,
        lng=longitude,
        vargas=[9]
    )
    if isinstance(calc_res, dict) and "vargas" in calc_res:
        return {
            "statusCode": 200,
            "navamsa": calc_res.get("vargas", {}).get("D9", {}),
            "output": calc_res.get("planets", []),
            "raw": calc_res
        }
    return calc_res
