"""
Prokerala Astrology API Integration Module
Official API: https://api.prokerala.com/v2/astrology/
Authentication: OAuth 2.0 Client Credentials Grant (Bearer Token)
"""
import os
import time
import json
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, Optional

PROKERALA_TOKEN_URL = "https://api.prokerala.com/token"
PROKERALA_API_BASE = "https://api.prokerala.com/v2/astrology"

# In-memory OAuth token cache
_cached_token: Optional[str] = None
_token_expires_at: float = 0.0

def get_client_credentials() -> tuple[Optional[str], Optional[str]]:
    """Retrieves Prokerala Client ID and Client Secret strictly from server environment."""
    client_id = os.environ.get("PROKERALA_CLIENT_ID")
    client_secret = os.environ.get("PROKERALA_CLIENT_SECRET")
    cid = client_id.strip() if client_id and client_id.strip() else None
    csec = client_secret.strip() if client_secret and client_secret.strip() else None
    return cid, csec

def get_access_token() -> str:
    """
    Retrieves or refreshes OAuth 2.0 Bearer token using client_credentials grant.
    Caches token in-memory until expiration.
    Fails closed with a clear configuration error if credentials are absent.
    """
    global _cached_token, _token_expires_at

    # Return cached token if valid for at least 60 more seconds
    if _cached_token and time.time() < (_token_expires_at - 60):
        return _cached_token

    client_id, client_secret = get_client_credentials()
    if not client_id or not client_secret:
        raise RuntimeError(
            "Prokerala API credentials are not configured. Set PROKERALA_CLIENT_ID and PROKERALA_CLIENT_SECRET in server environment."
        )

    data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    }).encode("utf-8")

    req = urllib.request.Request(
        PROKERALA_TOKEN_URL,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            _cached_token = body.get("access_token")
            expires_in = body.get("expires_in", 3600)
            _token_expires_at = time.time() + expires_in
            return _cached_token or ""
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Prokerala OAuth Token Request Failed [HTTP {e.code}]: {err}")
    except Exception as e:
        raise RuntimeError(f"Prokerala OAuth Connection Error: {str(e)}")

def _prokerala_request(endpoint: str, params: Dict[str, Any], timeout: int = 12, max_retries: int = 2) -> Dict[str, Any]:
    """
    Executes an authenticated GET request to Prokerala API with automatic token injection
    and rate limit backoff.
    """
    token = get_access_token()
    query_str = urllib.parse.urlencode(params)
    url = f"{PROKERALA_API_BASE}/{endpoint}?{query_str}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "Astroverse-Prokerala-Client/1.0"
    }

    for attempt in range(max_retries + 1):
        req = urllib.request.Request(url, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            # Rate limit backoff
            if e.code == 429 and attempt < max_retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            return {
                "status": "error",
                "statusCode": e.code,
                "message": err_body or str(e),
                "endpoint": endpoint
            }
        except Exception as e:
            return {
                "status": "error",
                "statusCode": 500,
                "message": str(e),
                "endpoint": endpoint
            }
    return {"status": "error", "statusCode": 429, "message": "RATE_LIMIT_EXCEEDED"}

def get_prokerala_planet_position(datetime_iso: str, lat: float, lon: float, ayanamsa: int = 1) -> Dict[str, Any]:
    """
    Queries /v2/astrology/planet-position.
    Ayanamsa: 1 = Lahiri (Chitrapaksha)
    """
    params = {
        "datetime": datetime_iso,
        "coordinates": f"{lat},{lon}",
        "ayanamsa": ayanamsa
    }
    return _prokerala_request("planet-position", params)

def get_prokerala_kundli(datetime_iso: str, lat: float, lon: float, ayanamsa: int = 1) -> Dict[str, Any]:
    """
    Queries /v2/astrology/kundli.
    Returns: Nakshatra details, Mangal dosha summary, and Yoga details.
    """
    params = {
        "datetime": datetime_iso,
        "coordinates": f"{lat},{lon}",
        "ayanamsa": ayanamsa
    }
    return _prokerala_request("kundli", params)

def get_prokerala_panchang(datetime_iso: str, lat: float, lon: float, ayanamsa: int = 1) -> Dict[str, Any]:
    """
    Queries /v2/astrology/panchang.
    Returns: Vaara, Tithi, Nakshatra, Yoga, Karana, Sunrise, Sunset.
    """
    params = {
        "datetime": datetime_iso,
        "coordinates": f"{lat},{lon}",
        "ayanamsa": ayanamsa
    }
    return _prokerala_request("panchang", params)

def get_prokerala_mangal_dosha(datetime_iso: str, lat: float, lon: float, ayanamsa: int = 1) -> Dict[str, Any]:
    """
    Queries /v2/astrology/mangal-dosha.
    Returns: Mangal (Kuja) dosha status, severity, and classical cancellation reasons.
    """
    params = {
        "datetime": datetime_iso,
        "coordinates": f"{lat},{lon}",
        "ayanamsa": ayanamsa
    }
    return _prokerala_request("mangal-dosha", params)

def get_prokerala_kaal_sarp_dosha(datetime_iso: str, lat: float, lon: float, ayanamsa: int = 1) -> Dict[str, Any]:
    """
    Queries /v2/astrology/kaal-sarp-dosha.
    Returns: Kaal Sarp dosha status, type, and remedial guidance.
    """
    params = {
        "datetime": datetime_iso,
        "coordinates": f"{lat},{lon}",
        "ayanamsa": ayanamsa
    }
    return _prokerala_request("kaal-sarp-dosha", params)

def get_prokerala_sade_sati(datetime_iso: str, lat: float, lon: float, ayanamsa: int = 1) -> Dict[str, Any]:
    """
    Queries /v2/astrology/sade-sati.
    Returns: Shani Sade Sati transit status and active phase.
    """
    params = {
        "datetime": datetime_iso,
        "coordinates": f"{lat},{lon}",
        "ayanamsa": ayanamsa
    }
    return _prokerala_request("sade-sati", params)
