"""
AstroVerse Central Astrology Method Registry:
Standardized catalog of calculation tools inspired by VedAstro's architecture.
Provides tool definitions, parameter schemas, dependency validation, safe execution
dispatchers, explicit calculation limitations, and provenance tracking.
"""

from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, date
import logging

logger = logging.getLogger("tools_registry")

# Formal Implementation Statuses
STATUS_EXISTING_VERIFIED = "EXISTING_VERIFIED"
STATUS_EXISTING_UNVERIFIED = "EXISTING_UNVERIFIED"
STATUS_IMPLEMENTED_NATIVE = "IMPLEMENTED_NATIVE"
STATUS_REUSED_LICENSED_SOURCE = "REUSED_LICENSED_SOURCE"
STATUS_EXTERNAL_PROVIDER_ADAPTER = "EXTERNAL_PROVIDER_ADAPTER"
STATUS_PARTIALLY_IMPLEMENTED = "PARTIALLY_IMPLEMENTED"
STATUS_NEEDS_VALIDATION = "NEEDS_VALIDATION"
STATUS_DISABLED_FOR_SAFETY = "DISABLED_FOR_SAFETY"
STATUS_BLOCKED_BY_LICENCE = "BLOCKED_BY_LICENCE"
STATUS_UNAVAILABLE = "UNAVAILABLE"

ALL_VALIDATION_STATUSES = [
    STATUS_EXISTING_VERIFIED,
    STATUS_EXISTING_UNVERIFIED,
    STATUS_IMPLEMENTED_NATIVE,
    STATUS_REUSED_LICENSED_SOURCE,
    STATUS_EXTERNAL_PROVIDER_ADAPTER,
    STATUS_PARTIALLY_IMPLEMENTED,
    STATUS_NEEDS_VALIDATION,
    STATUS_DISABLED_FOR_SAFETY,
    STATUS_BLOCKED_BY_LICENCE,
    STATUS_UNAVAILABLE
]


class AstrologyTool:
    """Represents an authoritative astrology calculation tool in the AstroVerse registry."""
    def __init__(
        self,
        tool_id: str,
        display_name: str,
        category: str,
        description: str,
        input_schema: Dict[str, Any],
        output_schema: Dict[str, Any],
        required_context: List[str],
        calculation_method: str,
        engine_version: str,
        provenance: str,
        validation_status: str,
        availability: str,
        handler: Callable[..., Any],
        limitations: str,
        required_inputs: Optional[List[str]] = None,
        requires_natal_chart: bool = True
    ):
        self.tool_id = tool_id
        self.display_name = display_name
        self.category = category
        self.description = description
        self.input_schema = input_schema
        self.output_schema = output_schema
        self.required_context = required_context
        self.calculation_method = calculation_method
        self.engine_version = engine_version
        self.provenance = provenance
        self.validation_status = validation_status
        self.availability = availability
        self.handler = handler
        self.limitations = limitations
        self.required_inputs = required_inputs if required_inputs is not None else input_schema.get("required", list(input_schema.get("properties", {}).keys()))
        self.requires_natal_chart = requires_natal_chart

        # Backward compatibility properties
        self.name = display_name

    def to_dict(self) -> Dict[str, Any]:
        return {
            "toolId": self.tool_id,
            "id": self.tool_id,
            "displayName": self.display_name,
            "name": self.display_name,
            "category": self.category,
            "description": self.description,
            "inputSchema": self.input_schema,
            "outputSchema": self.output_schema,
            "requiredContext": self.required_context,
            "calculationMethod": self.calculation_method,
            "engineVersion": self.engine_version,
            "provenance": self.provenance,
            "validationStatus": self.validation_status,
            "availability": self.availability,
            "required_inputs": self.required_inputs,
            "requires_natal_chart": self.requires_natal_chart,
            "limitations": self.limitations
        }

    def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool safely with parameter verification."""
        if self.availability != "enabled":
            return {
                "tool_id": self.tool_id,
                "status": "error",
                "error": f"Tool '{self.tool_id}' is currently {self.availability}."
            }

        for param in self.required_inputs:
            if param not in kwargs or kwargs[param] is None:
                return {
                    "tool_id": self.tool_id,
                    "status": "error",
                    "error": f"Missing required parameter '{param}' for tool '{self.tool_id}'."
                }
        try:
            result = self.handler(**kwargs)
            return {
                "tool_id": self.tool_id,
                "status": "success",
                "result": result
            }
        except Exception as e:
            logger.error(f"Error executing tool {self.tool_id}: {str(e)}", exc_info=True)
            return {
                "tool_id": self.tool_id,
                "status": "error",
                "error": str(e)
            }


# Dispatcher handlers wrapping core calculation engines
def _handle_planet_longitude(dob_iso: str, lat: float, lon: float, planet_name: str = "Jupiter", tz_str: str = "Asia/Kolkata", **_):
    from ephemeris import calculate_kundli
    k = calculate_kundli(dob_iso, lat, lon, tz_str)
    p = k.get("planets", {}).get(planet_name)
    if not p:
        return {"error": f"Planet {planet_name} not found in ephemeris output."}
    return {
        "planet": planet_name,
        "sign": p.get("sign"),
        "degree": p.get("degree"),
        "absolute_degree": p.get("absolute_degree"),
        "house": p.get("house"),
        "nakshatra": p.get("nakshatra"),
        "pada": p.get("pada"),
        "is_retrograde": p.get("is_retrograde")
    }

def _handle_calculate_kundli_d1(dob_iso: str, lat: float, lon: float, tz_str: str = "Asia/Kolkata", **_):
    from ephemeris import calculate_kundli
    return calculate_kundli(dob_iso, lat, lon, tz_str)

def _handle_calculate_navamsha_d9(planets: dict, **_):
    from divisional_charts import calculate_d9_navamsha
    return calculate_d9_navamsha(planets)

def _handle_calculate_dashamsha_d10(planets: dict, lagna: dict, **_):
    from divisional_charts import calculate_d10_dashamsha
    return calculate_d10_dashamsha(planets, lagna)

def _handle_calculate_all_vargas(planets: dict, lagna: dict, **_):
    from divisional_charts import calculate_all_vargas
    return calculate_all_vargas(planets, lagna)

def _handle_calculate_vimshottari_dasha(moon_abs_deg: float, birth_datetime: datetime, **_):
    from dasha_engine import calculate_vimshottari_dasha
    return calculate_vimshottari_dasha(moon_abs_deg, birth_datetime)

def _handle_calculate_ashtakavarga(planets: dict, lagna_sign: str, **_):
    from ashtakavarga_engine import calculate_ashtakavarga
    return calculate_ashtakavarga(planets, lagna_sign)

def _handle_calculate_shadbala(planets: dict, lagna_sign: str, **_):
    from shadbala_and_yogas import calculate_shadbala
    return calculate_shadbala(planets, lagna_sign)

def _handle_identify_planetary_yogas(planets: dict, lagna_sign: str, **_):
    from shadbala_and_yogas import identify_yogas
    return identify_yogas(planets, lagna_sign)

def _handle_analyze_doshas_and_remedies(planets: dict, lagna_sign: str, **_):
    from doshas_and_remedies import analyze_doshas_and_remedies
    return analyze_doshas_and_remedies(planets, lagna_sign)

def _handle_calculate_horas_24h(lat: float = 28.6139, lon: float = 77.2090, target_date: Optional[str] = None, tz_str: str = "Asia/Kolkata", **_):
    from hora_engine import calculate_sun_times, calculate_24h_horas
    t_date = date.fromisoformat(target_date) if target_date else date.today()
    sunrise_dt, sunset_dt, next_sunrise_dt = calculate_sun_times(
        target_date=t_date,
        latitude=lat,
        longitude=lon,
        tz_name=tz_str
    )
    return calculate_24h_horas(
        sunrise_dt=sunrise_dt,
        sunset_dt=sunset_dt,
        next_sunrise_dt=next_sunrise_dt
    )

def _handle_calculate_panchang(date_str: str, lat: float = 28.6139, lon: float = 77.2090, tz_str: str = "Asia/Kolkata", **_):
    from panchang_engine import calculate_daily_panchang
    return calculate_daily_panchang(date_str, lat, lon, tz_str)

def _handle_match_kundli_36_gunas(boy_moon_sign: str, boy_nakshatra: str, girl_moon_sign: str, girl_nakshatra: str, **_):
    from matchmaking import calculate_ashtakoota_compatibility
    return calculate_ashtakoota_compatibility(boy_moon_sign, boy_nakshatra, girl_moon_sign, girl_nakshatra)

def _handle_search_classical_knowledge(query: str, max_results: int = 4, **_):
    from classical_knowledge import search_classical_knowledge
    return search_classical_knowledge(query, limit=max_results)

def _handle_calculate_upagrahas(dob_iso: str, lat: float = 28.6139, lon: float = 77.2090, timezone_str: str = "Asia/Kolkata", sun_longitude: Optional[float] = None, **_):
    from upagraha_engine import calculate_upagrahas
    return calculate_upagrahas(dob_iso=dob_iso, lat=lat, lon=lon, timezone_str=timezone_str, sun_longitude=sun_longitude)

def _handle_calculate_numerology(dob: str, name: str = "Seeker", **_):
    from numerology_engine import calculate_full_numerology
    return calculate_full_numerology(name, dob)

def _handle_calculate_pancha_pakshi(birth_nakshatra_num: Optional[int] = None, name: Optional[str] = None, is_waxing: bool = True, **_):
    from pancha_pakshi_engine import calculate_pancha_pakshi
    return calculate_pancha_pakshi(birth_nakshatra_num=birth_nakshatra_num, name=name, is_waxing=is_waxing)

def _handle_evaluate_prashna(query_text: str, category: str = "general", query_datetime_iso: str = "", lat: float = 28.6139, lon: float = 77.2090, timezone_str: str = "Asia/Kolkata", **_):
    from prashna_engine import evaluate_prashna
    q_dt = query_datetime_iso or datetime.now().isoformat()
    return evaluate_prashna(query_text, category, q_dt, lat, lon, timezone_str)

def _handle_calculate_avasthas(planets: dict, **_):
    from shadbala_and_yogas import calculate_planetary_avasthas
    return calculate_planetary_avasthas(planets)

def _handle_evaluate_btr(nominal_dob_iso: str, lat: float, lon: float, window_minutes: int = 30, step_minutes: int = 3, life_events: Optional[List[Dict[str, str]]] = None, **_):
    from btr_engine import evaluate_btr_candidates
    return evaluate_btr_candidates(nominal_dob_iso, lat, lon, window_minutes, step_minutes, life_events)


# Central Method Catalog adhering to standard schema
ASTROLOGY_METHOD_REGISTRY: Dict[str, AstrologyTool] = {
    "planet_longitude": AstrologyTool(
        tool_id="planet_longitude",
        display_name="Planetary Longitude & Dignity",
        category="planetary_calculations",
        description="Returns validated sidereal Nirayana Lahiri longitude, sign, house, nakshatra, and retrograde status for a specific planet.",
        input_schema={
            "type": "object",
            "properties": {
                "dob_iso": {"type": "string", "description": "ISO 8601 birth timestamp"},
                "lat": {"type": "number", "description": "Geographic latitude"},
                "lon": {"type": "number", "description": "Geographic longitude"},
                "planet_name": {"type": "string", "description": "Name of the planet (Sun, Moon, Mars, etc.)"}
            },
            "required": ["dob_iso", "lat", "lon", "planet_name"]
        },
        output_schema={
            "type": "object",
            "properties": {
                "planet": {"type": "string"},
                "sign": {"type": "string"},
                "degree": {"type": "number"},
                "house": {"type": "integer"},
                "nakshatra": {"type": "string"}
            }
        },
        required_context=["validated_chart_context"],
        calculation_method="Swiss Ephemeris Geocentric Nirayana Longitudes",
        engine_version="2.4.0",
        provenance="ephemeris.py via pyswisseph",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_planet_longitude,
        limitations="Geocentric apparent coordinates using Chitrapaksha Lahiri Ayanamsha."
    ),

    "calculate_kundli_d1": AstrologyTool(
        tool_id="calculate_kundli_d1",
        display_name="Natal D1 Rashi Chart & Ascendant",
        category="chart_foundation",
        description="Calculates exact sidereal Nirayana Lahiri Ascendant (Lagna) and 9 planetary coordinates, degrees, signs, houses, nakshatras, and dignities.",
        input_schema={
            "type": "object",
            "properties": {
                "dob_iso": {"type": "string", "description": "ISO 8601 birth timestamp"},
                "lat": {"type": "number", "description": "Geographic latitude"},
                "lon": {"type": "number", "description": "Geographic longitude"}
            },
            "required": ["dob_iso", "lat", "lon"]
        },
        output_schema={"type": "object"},
        required_context=["birth_time_and_coordinates"],
        calculation_method="Swiss Ephemeris RAMC & True Sidereal Longitudes",
        engine_version="2.4.0",
        provenance="ephemeris.py via pyswisseph",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_kundli_d1,
        limitations="Requires verified birth time. Sensitive to geographic coordinates."
    ),

    "calculate_navamsha_d9": AstrologyTool(
        tool_id="calculate_navamsha_d9",
        display_name="D9 Navamsha Divisional Chart",
        category="divisional_charts",
        description="Calculates 9th harmonic divisional chart for evaluating inner spiritual strength, marital synastry, and true planetary fruition.",
        input_schema={
            "type": "object",
            "properties": {
                "planets": {"type": "object", "description": "D1 planetary positions"}
            },
            "required": ["planets"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="3°20' Navamsha Pada Division per BPHS Chapter 6",
        engine_version="2.4.0",
        provenance="divisional_charts.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_navamsha_d9,
        limitations="Requires verified D1 planetary degrees."
    ),

    "calculate_dashamsha_d10": AstrologyTool(
        tool_id="calculate_dashamsha_d10",
        display_name="D10 Dashamsha Career Chart",
        category="divisional_charts",
        description="Calculates 10th divisional chart for evaluating executive authority, public honors, profession, and career achievements.",
        input_schema={
            "type": "object",
            "properties": {
                "planets": {"type": "object"},
                "lagna": {"type": "object"}
            },
            "required": ["planets", "lagna"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="3°00' Dashamsha Division per BPHS Chapter 6",
        engine_version="2.4.0",
        provenance="divisional_charts.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_dashamsha_d10,
        limitations="Highly time-sensitive (changes roughly every 12-15 minutes)."
    ),

    "calculate_all_vargas": AstrologyTool(
        tool_id="calculate_all_vargas",
        display_name="Shodashavarga (16 Divisional Charts)",
        category="divisional_charts",
        description="Computes all 16 classical Parashari vargas from D1 to D60 for exhaustive sub-divisional analysis.",
        input_schema={
            "type": "object",
            "properties": {
                "planets": {"type": "object"},
                "lagna": {"type": "object"}
            },
            "required": ["planets", "lagna"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="Full Shodashavarga Suite per BPHS Chapter 6",
        engine_version="2.4.0",
        provenance="divisional_charts.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_all_vargas,
        limitations="Higher vargas like D60 require sub-minute birth time verification."
    ),

    "calculate_vimshottari_dasha": AstrologyTool(
        tool_id="calculate_vimshottari_dasha",
        display_name="Vimshottari Dasha Periods",
        category="timing_cycles",
        description="Calculates full 120-year Vimshottari Mahadasha, Antardasha, and Pratyantardasha timeline based on natal Moon longitude.",
        input_schema={
            "type": "object",
            "properties": {
                "moon_abs_deg": {"type": "number"},
                "birth_datetime": {"type": "string"}
            },
            "required": ["moon_abs_deg", "birth_datetime"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="Moon Nakshatra Lord Balance, 365.25-day Solar Year Standard",
        engine_version="2.4.0",
        provenance="dasha_engine.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_vimshottari_dasha,
        limitations="Assumes classical 365.25-day solar year standard."
    ),

    "calculate_ashtakavarga": AstrologyTool(
        tool_id="calculate_ashtakavarga",
        display_name="Ashtakavarga Benefic Point System",
        category="planetary_strength",
        description="Computes 8-fold benefic points (Bhinnashtakavarga and Sarvashtakavarga) for transit strength and endurance evaluation.",
        input_schema={
            "type": "object",
            "properties": {
                "planets": {"type": "object"},
                "lagna_sign": {"type": "string"}
            },
            "required": ["planets", "lagna_sign"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="Parashari 8-Contributor Bindu Matrix Summing to 337",
        engine_version="2.4.0",
        provenance="ashtakavarga_engine.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_ashtakavarga,
        limitations="Derived from 7 physical planets and Lagna; Rahu/Ketu excluded per classical Parashari convention."
    ),

    "calculate_shadbala": AstrologyTool(
        tool_id="calculate_shadbala",
        display_name="Shadbala Six-Fold Planetary Strength",
        category="planetary_strength",
        description="Calculates Sthanabala, Digbala, Kaalabala, Cheshtabala, Naisargikabala, and Drikbala rupas for the 7 planets.",
        input_schema={
            "type": "object",
            "properties": {
                "planets": {"type": "object"},
                "lagna_sign": {"type": "string"}
            },
            "required": ["planets", "lagna_sign"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="Classical 6-Fold Virupa Measurement per BPHS",
        engine_version="2.4.0",
        provenance="shadbala_and_yogas.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_shadbala,
        limitations="Calculates mathematical potentials; practical fruition is conditioned by ongoing Dasha cycles."
    ),

    "identify_planetary_yogas": AstrologyTool(
        tool_id="identify_planetary_yogas",
        display_name="Classical Planetary Yogas",
        category="planetary_strength",
        description="Identifies classical Parashari Raja Yogas, Dhana Yogas, Gajakesari, Viparita, and Pancha Mahapurusha yogas.",
        input_schema={
            "type": "object",
            "properties": {
                "planets": {"type": "object"},
                "lagna_sign": {"type": "string"}
            },
            "required": ["planets", "lagna_sign"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="Parashari Yoga Identification Rules with Cancellations",
        engine_version="2.4.0",
        provenance="shadbala_and_yogas.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_identify_planetary_yogas,
        limitations="Identifies structural geometric combinations; requires Dasha activation for actual manifestation."
    ),

    "analyze_doshas_and_remedies": AstrologyTool(
        tool_id="analyze_doshas_and_remedies",
        display_name="Vedic Doshas & Remedial Measures",
        category="doshas_remedies",
        description="Evaluates Manglik Dosha, Shani Sade Sati phase, Kaal Sarp Dosha, and generates traditional Vedic remedial practices.",
        input_schema={
            "type": "object",
            "properties": {
                "planets": {"type": "object"},
                "lagna_sign": {"type": "string"}
            },
            "required": ["planets", "lagna_sign"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="Classical Kuja & Shani Transit Geometry",
        engine_version="2.4.0",
        provenance="doshas_and_remedies.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_analyze_doshas_and_remedies,
        limitations="Remedial measures are traditional spiritual and contemplative disciplines; they do not carry commercial guarantees."
    ),

    "calculate_horas_24h": AstrologyTool(
        tool_id="calculate_horas_24h",
        display_name="24-Hour Planetary Horas",
        category="transit_muhurta",
        description="Calculates real-time 24 planetary hour intervals from local sunrise according to Chaldean order.",
        input_schema={
            "type": "object",
            "properties": {
                "lat": {"type": "number"},
                "lon": {"type": "number"}
            },
            "required": ["lat", "lon"]
        },
        output_schema={"type": "object"},
        required_context=[],
        calculation_method="Local Sunrise 12 Day/Night Equal Divisions per Chaldean Sequence",
        engine_version="2.4.0",
        provenance="hora_engine.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_horas_24h,
        limitations="Location-dependent based on precise sunrise and sunset calculation.",
        requires_natal_chart=False
    ),

    "calculate_panchang": AstrologyTool(
        tool_id="calculate_panchang",
        display_name="Daily Vedic Panchang",
        category="transit_muhurta",
        description="Computes the 5 limbs of time: Tithi, Vaara, Nakshatra, Yoga, and Karana with auspicious Muhurtas.",
        input_schema={
            "type": "object",
            "properties": {
                "date_str": {"type": "string"}
            },
            "required": ["date_str"]
        },
        output_schema={"type": "object"},
        required_context=[],
        calculation_method="Solar-Lunar Elongation & Nakshatra Transit Math",
        engine_version="2.4.0",
        provenance="panchang_engine.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_calculate_panchang,
        limitations="Universal astronomical transit calculation valid for the designated geographic coordinates.",
        requires_natal_chart=False
    ),

    "match_kundli_36_gunas": AstrologyTool(
        tool_id="match_kundli_36_gunas",
        display_name="Ashtakoota 36-Guna Matchmaking",
        category="compatibility",
        description="Performs 8-fold synastry matching (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) totaling 36 points.",
        input_schema={
            "type": "object",
            "properties": {
                "boy_moon_sign": {"type": "string"},
                "boy_nakshatra": {"type": "string"},
                "girl_moon_sign": {"type": "string"},
                "girl_nakshatra": {"type": "string"}
            },
            "required": ["boy_moon_sign", "boy_nakshatra", "girl_moon_sign", "girl_nakshatra"]
        },
        output_schema={"type": "object"},
        required_context=[],
        calculation_method="Ashtakoota 8-Kuta Matrix with Dosha Cancellations",
        engine_version="2.4.0",
        provenance="matchmaking.py",
        validation_status=STATUS_EXISTING_VERIFIED,
        availability="enabled",
        handler=_handle_match_kundli_36_gunas,
        limitations="Lunar Nakshatra-based; does not replace comprehensive D1/D9 cross-chart synastry.",
        requires_natal_chart=False
    ),

    "search_classical_knowledge": AstrologyTool(
        tool_id="search_classical_knowledge",
        display_name="Classical Shastra RAG Search",
        category="shastra_knowledge",
        description="Retrieves classical Sanskrit verses and translations from BPHS, Jaimini Upadesha Sutras, and Phaladeepika.",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string"}
            },
            "required": ["query"]
        },
        output_schema={"type": "array"},
        required_context=[],
        calculation_method="Keyword and Classical Corpus Vector Search",
        engine_version="2.4.0",
        provenance="classical_knowledge.py",
        validation_status=STATUS_IMPLEMENTED_NATIVE,
        availability="enabled",
        handler=_handle_search_classical_knowledge,
        limitations="Searches digitized classical corpuses; interpretations require contextual astrological synthesis.",
        requires_natal_chart=False
    ),

    "calculate_upagrahas": AstrologyTool(
        tool_id="calculate_upagrahas",
        display_name="Upagrahas (Shadow Planets)",
        category="chart_foundation",
        description="Calculates positions of Gulika, Mandi, Yamaghantaka, Ardhaprahara, and Kala.",
        input_schema={
            "type": "object",
            "properties": {
                "dob_iso": {"type": "string"},
                "lat": {"type": "number"},
                "lon": {"type": "number"},
                "timezone_str": {"type": "string"}
            },
            "required": ["dob_iso", "lat", "lon"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="Kalavela Portions per Day/Night Divisions",
        engine_version="2.4.0",
        provenance="upagraha_engine.py",
        validation_status=STATUS_IMPLEMENTED_NATIVE,
        availability="enabled",
        handler=_handle_calculate_upagrahas,
        limitations="Used primarily in Kerala Jyotish and Prashna traditions."
    ),

    "calculate_numerology": AstrologyTool(
        tool_id="calculate_numerology",
        display_name="Vedic & Chaldean Numerology",
        category="specialized_calculations",
        description="Calculates Mulank (Birth Root Number), Bhagyank (Destiny Number), and Namank (Name Number).",
        input_schema={
            "type": "object",
            "properties": {
                "dob": {"type": "string", "description": "Date of birth in YYYY-MM-DD format"}
            },
            "required": ["dob"]
        },
        output_schema={"type": "object"},
        required_context=[],
        calculation_method="Digital Root Reduction & Chaldean Sound Vibration Matrix",
        engine_version="2.4.0",
        provenance="numerology_engine.py",
        validation_status=STATUS_IMPLEMENTED_NATIVE,
        availability="enabled",
        handler=_handle_calculate_numerology,
        limitations="Complementary symbolic system; secondary to astronomical ephemeris charts.",
        requires_natal_chart=False
    ),

    "calculate_pancha_pakshi": AstrologyTool(
        tool_id="calculate_pancha_pakshi",
        display_name="Pancha Pakshi 5-Bird Biorhythm",
        category="specialized_calculations",
        description="Calculates birth bird and active biorhythm activity (Eating, Walking, Ruling, Sleeping, Dying) across 5 Yamas.",
        input_schema={
            "type": "object",
            "properties": {
                "birth_nakshatra_num": {"type": "integer"}
            },
            "required": ["birth_nakshatra_num"]
        },
        output_schema={"type": "object"},
        required_context=[],
        calculation_method="Tamil Jyotish 5-Bird Cyclic Permutation",
        engine_version="2.4.0",
        provenance="pancha_pakshi_engine.py",
        validation_status=STATUS_IMPLEMENTED_NATIVE,
        availability="enabled",
        handler=_handle_calculate_pancha_pakshi,
        limitations="Based on lunar nakshatra and solar day/night yamas.",
        requires_natal_chart=False
    ),

    "evaluate_prashna": AstrologyTool(
        tool_id="evaluate_prashna",
        display_name="Horary Prashna Tantra",
        category="specialized_calculations",
        description="Analyzes the query ascendant and Tajika aspects (Ithasala, Ishrafa, Nakta, Yamaya) for immediate question answering.",
        input_schema={
            "type": "object",
            "properties": {
                "query_text": {"type": "string"},
                "lat": {"type": "number"},
                "lon": {"type": "number"}
            },
            "required": ["query_text", "lat", "lon"]
        },
        output_schema={"type": "object"},
        required_context=[],
        calculation_method="Neelakantha Prashna Tantra Mathematical Rules",
        engine_version="2.4.0",
        provenance="prashna_engine.py",
        validation_status=STATUS_IMPLEMENTED_NATIVE,
        availability="enabled",
        handler=_handle_evaluate_prashna,
        limitations="Valid strictly for the exact timestamp and location where the question was formulated.",
        requires_natal_chart=False
    ),

    "calculate_avasthas": AstrologyTool(
        tool_id="calculate_avasthas",
        display_name="Planetary Avasthas (States of Being)",
        category="planetary_strength",
        description="Evaluates Baladi (Infant to Dead), Jagradadi (Awake to Asleep), and Lajjitadi planetary avasthas.",
        input_schema={
            "type": "object",
            "properties": {
                "planets": {"type": "object"}
            },
            "required": ["planets"]
        },
        output_schema={"type": "object"},
        required_context=["validated_chart_context"],
        calculation_method="BPHS Planetary Dignity and Odd/Even Sign Degree Divisions",
        engine_version="2.4.0",
        provenance="shadbala_and_yogas.py",
        validation_status=STATUS_IMPLEMENTED_NATIVE,
        availability="enabled",
        handler=_handle_calculate_avasthas,
        limitations="Modifiers to baseline planetary strength."
    ),

    "evaluate_btr_candidates": AstrologyTool(
        tool_id="evaluate_btr_candidates",
        display_name="Birth-Time Rectification (BTR) Analysis",
        category="specialized_calculations",
        description="Tests candidate birth times across a window to identify D1, D9, and D60 Lagna shifts and event alignment.",
        input_schema={
            "type": "object",
            "properties": {
                "nominal_dob_iso": {"type": "string"},
                "lat": {"type": "number"},
                "lon": {"type": "number"}
            },
            "required": ["nominal_dob_iso", "lat", "lon"]
        },
        output_schema={"type": "object"},
        required_context=[],
        calculation_method="Ascendant Boundary Scanning and Vimshottari Event Alignment",
        engine_version="2.4.0",
        provenance="btr_engine.py",
        validation_status=STATUS_IMPLEMENTED_NATIVE,
        availability="enabled",
        handler=_handle_evaluate_btr,
        limitations="Assumes true birth time lies within the declared temporal window.",
        requires_natal_chart=False
    )
}

def list_registered_tools() -> List[Dict[str, Any]]:
    """Return catalog of all registered tools for tool discovery."""
    return [tool.to_dict() for tool in ASTROLOGY_METHOD_REGISTRY.values()]

def get_tool(tool_id: str) -> Optional[AstrologyTool]:
    """Retrieve tool by identifier."""
    return ASTROLOGY_METHOD_REGISTRY.get(tool_id)

def execute_tool(tool_id: str, **kwargs) -> Dict[str, Any]:
    """Execute a registered tool by ID."""
    tool = get_tool(tool_id)
    if not tool:
        return {
            "tool_id": tool_id,
            "status": "error",
            "error": f"Tool '{tool_id}' not found in registry."
        }
    return tool.execute(**kwargs)
