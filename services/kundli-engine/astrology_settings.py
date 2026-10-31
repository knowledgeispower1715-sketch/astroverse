"""
AstroVerse AI — Canonical Astrology Settings & Methodology Registry
Defines the primary Parashari calculation profile, astronomical conventions,
and standardized metadata generators for API responses and report outputs.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
import swisseph as swe

METHODOLOGY_PROFILE_NAME = "ASTROVERSE_PARASHARI_LAHIRI_DRIK"
METHODOLOGY_VERSION = "2.0.0-parashari-lahiri-drik"

# Core Astrological Conventions
ZODIAC_SYSTEM = "Sidereal (Nirayana)"
AYANAMSHA_NAME = "Lahiri / Chitra Paksha"
AYANAMSHA_SWISSEPH_MODE = swe.SIDM_LAHIRI
HOUSE_SYSTEM_PRIMARY = "Whole-Sign Rashi Houses"
HOUSE_SYSTEM_SECONDARY = "Bhava Chalit (Midpoint Sandhi Cusps)"
DASHA_SYSTEM = "Vimshottari (120-Year Lifespan Cycle)"
NODE_CALCULATION = "Mean Node (swe.MEAN_NODE, Rahu/Ketu 180° true opposition)"
POSITION_MODEL = "Geocentric Apparent Sidereal"

# Vimshottari Year Conventions
CONVENTION_GREGORIAN_MEAN = "Gregorian Mean-Year (365.2425 days)"
CONVENTION_JULIAN = "Julian Calendar (365.25 days)"
CONVENTION_SAVANA_360 = "Savana 360-Day Classical Year (360.0 days)"

DAYS_PER_YEAR_DEFAULT = 365.2425
DAYS_PER_YEAR_JULIAN = 365.25
DAYS_PER_YEAR_SAVANA = 360.0

# Standard Zodiac & Nakshatra Collections
SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

# Ephemeris Version Detection
SWISSEPH_VERSION = getattr(swe, "version", "2.10.03")

def get_ephemeris_source_info(iflag: Optional[int] = None) -> Dict[str, Any]:
    """
    Determines whether Swiss Ephemeris is using the built-in Moshier analytical
    model (FLG_MOSEPH) or external JPL numerical integration data files (FLG_SWIEPH).
    """
    if iflag is not None:
        has_swieph = bool(iflag & getattr(swe, "FLG_SWIEPH", 2))
        has_moseph = bool(iflag & getattr(swe, "FLG_MOSEPH", 4))
    else:
        # Default probe
        has_swieph = False
        has_moseph = True

    model_name = "Swiss Ephemeris JPL DE431" if has_swieph else "Moshier Analytical Model (FLG_MOSEPH)"
    precision = "0.001 arcsec" if has_swieph else "0.1 arcsec (Planets) / 0.5 arcsec (Moon)"

    return {
        "engine": f"Swiss Ephemeris {SWISSEPH_VERSION}",
        "source_model": model_name,
        "is_jpl_swieph": has_swieph,
        "is_moshier": has_moseph,
        "numerical_precision": precision
    }

def get_methodology_metadata(
    tz_identifier: str = "Asia/Kolkata",
    year_convention: str = CONVENTION_GREGORIAN_MEAN,
    iflag: Optional[int] = None
) -> Dict[str, Any]:
    """
    Returns standardized methodology metadata required by Part 2 of the mandate.
    """
    days_per_year = DAYS_PER_YEAR_DEFAULT
    if year_convention == CONVENTION_JULIAN:
        days_per_year = DAYS_PER_YEAR_JULIAN
    elif year_convention == CONVENTION_SAVANA_360:
        days_per_year = DAYS_PER_YEAR_SAVANA

    ephe_info = get_ephemeris_source_info(iflag)

    return {
        "methodology_profile": METHODOLOGY_PROFILE_NAME,
        "methodology_version": METHODOLOGY_VERSION,
        "zodiac": ZODIAC_SYSTEM,
        "ayanamsha": AYANAMSHA_NAME,
        "ayanamsha_code": "SIDM_LAHIRI",
        "ephemeris_version": ephe_info["engine"],
        "ephemeris_source": ephe_info["source_model"],
        "position_model": POSITION_MODEL,
        "node_configuration": NODE_CALCULATION,
        "primary_house_system": HOUSE_SYSTEM_PRIMARY,
        "alternative_house_system": HOUSE_SYSTEM_SECONDARY,
        "dasha_system": DASHA_SYSTEM,
        "dasha_year_convention": year_convention,
        "days_per_year": days_per_year,
        "timezone_identifier": tz_identifier,
        "calculation_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "epistemic_standard": "Deterministic Calculation and Narrative Validation"
    }
