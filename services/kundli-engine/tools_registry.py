"""
AstroVerse Central Astrology Method Registry:
Standardized catalog of calculation tools inspired by VedAstro's architecture.
Provides tool definitions, parameter schemas, dependency validation, safe execution
dispatchers, and explicit calculation limitations.
"""

from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import logging

logger = logging.getLogger("tools_registry")

class AstrologyTool:
    """Represents an authoritative astrology calculation tool in the AstroVerse registry."""
    def __init__(
        self,
        tool_id: str,
        name: str,
        category: str,
        description: str,
        required_inputs: List[str],
        requires_natal_chart: bool,
        handler: Callable[..., Any],
        limitations: str
    ):
        self.tool_id = tool_id
        self.name = name
        self.category = category
        self.description = description
        self.required_inputs = required_inputs
        self.requires_natal_chart = requires_natal_chart
        self.handler = handler
        self.limitations = limitations

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.tool_id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "required_inputs": self.required_inputs,
            "requires_natal_chart": self.requires_natal_chart,
            "limitations": self.limitations
        }

    def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool safely with parameter verification."""
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


# Dispatcher handlers wrapping core engines
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
    from datetime import date
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

def _handle_calculate_upagrahas(sun_abs_deg: float, sunrise_iso: str, is_day: bool = True, **_):
    from upagraha_engine import calculate_upagrahas
    return calculate_upagrahas(sun_abs_deg, sunrise_iso, is_day)


# Central Method Catalog
ASTROLOGY_METHOD_REGISTRY: Dict[str, AstrologyTool] = {
    "calculate_kundli_d1": AstrologyTool(
        tool_id="calculate_kundli_d1",
        name="Natal D1 Rashi Chart & Ascendant",
        category="chart_foundation",
        description="Calculates exact sidereal Nirayana Lahiri Ascendant (Lagna) and 9 planetary coordinates, degrees, signs, houses, nakshatras, and dignities.",
        required_inputs=["dob_iso", "lat", "lon"],
        requires_natal_chart=True,
        handler=_handle_calculate_kundli_d1,
        limitations="Relies on astronomical ephemeris (Swiss Ephemeris / PyEphem) with Lahiri Ayanamsha. Sensitive to precise birth time."
    ),
    "calculate_navamsha_d9": AstrologyTool(
        tool_id="calculate_navamsha_d9",
        name="D9 Navamsha Divisional Chart",
        category="divisional_charts",
        description="Calculates 9th divisional harmonic chart for evaluating inner spiritual strength, marital synastry, and true planetary fruition.",
        required_inputs=["planets"],
        requires_natal_chart=True,
        handler=_handle_calculate_navamsha_d9,
        limitations="Requires verified planetary degree inputs from D1 chart."
    ),
    "calculate_dashamsha_d10": AstrologyTool(
        tool_id="calculate_dashamsha_d10",
        name="D10 Dashamsha Career Chart",
        category="divisional_charts",
        description="Calculates 10th divisional chart for evaluating executive authority, public honors, profession, and career achievements.",
        required_inputs=["planets", "lagna"],
        requires_natal_chart=True,
        handler=_handle_calculate_dashamsha_d10,
        limitations="Highly time-sensitive (changes roughly every 12-15 minutes)."
    ),
    "calculate_all_vargas": AstrologyTool(
        tool_id="calculate_all_vargas",
        name="Shodashavarga (16 Divisional Charts)",
        category="divisional_charts",
        description="Computes all 16 classical Parashari vargas from D1 to D60 for exhaustive sub-divisional analysis.",
        required_inputs=["planets", "lagna"],
        requires_natal_chart=True,
        handler=_handle_calculate_all_vargas,
        limitations="Higher vargas like D60 require sub-minute birth time verification."
    ),
    "calculate_vimshottari_dasha": AstrologyTool(
        tool_id="calculate_vimshottari_dasha",
        name="Vimshottari Dasha Periods",
        category="timing_cycles",
        description="Calculates full 120-year Vimshottari Mahadasha, Antardasha, and Pratyantardasha timeline based on natal Moon longitude.",
        required_inputs=["moon_abs_deg", "birth_datetime"],
        requires_natal_chart=True,
        handler=_handle_calculate_vimshottari_dasha,
        limitations="Assumes classical 365.25-day solar year standard."
    ),
    "calculate_ashtakavarga": AstrologyTool(
        tool_id="calculate_ashtakavarga",
        name="Ashtakavarga Bindu System",
        category="planetary_strength",
        description="Computes 8-fold benefic points (Bhinnashtakavarga and Sarvashtakavarga) for transit strength and endurance evaluation.",
        required_inputs=["planets", "lagna_sign"],
        requires_natal_chart=True,
        handler=_handle_calculate_ashtakavarga,
        limitations="Derived from 7 physical planets and Lagna; Rahu/Ketu excluded per classical Parashari convention."
    ),
    "calculate_shadbala": AstrologyTool(
        tool_id="calculate_shadbala",
        name="Shadbala Six-Fold Planetary Strength",
        category="planetary_strength",
        description="Calculates Sthanabala, Digbala, Kaalabala, Cheshtabala, Naisargikabala, and Drikbala rupas for the 7 planets.",
        required_inputs=["planets", "lagna_sign"],
        requires_natal_chart=True,
        handler=_handle_calculate_shadbala,
        limitations="Calculates mathematical potentials; practical fruition is conditioned by ongoing Dasha cycles."
    ),
    "identify_planetary_yogas": AstrologyTool(
        tool_id="identify_planetary_yogas",
        name="Classical Planetary Yogas",
        category="planetary_strength",
        description="Identifies classical Parashari Raja Yogas, Dhana Yogas, Gajakesari, Viparita, and Pancha Mahapurusha yogas.",
        required_inputs=["planets", "lagna_sign"],
        requires_natal_chart=True,
        handler=_handle_identify_planetary_yogas,
        limitations="Identifies structural geometric combinations; requires Dasha activation for actual manifestation."
    ),
    "analyze_doshas_and_remedies": AstrologyTool(
        tool_id="analyze_doshas_and_remedies",
        name="Vedic Doshas & Remedial Measures",
        category="doshas_remedies",
        description="Evaluates Manglik Dosha, Shani Sade Sati phase, Kaal Sarp Dosha, and generates traditional Vedic remedial practices.",
        required_inputs=["planets", "lagna_sign"],
        requires_natal_chart=True,
        handler=_handle_analyze_doshas_and_remedies,
        limitations="Remedial measures are traditional spiritual and contemplative disciplines; they do not carry commercial guarantees."
    ),
    "calculate_horas_24h": AstrologyTool(
        tool_id="calculate_horas_24h",
        name="24-Hour Planetary Horas",
        category="transit_muhurta",
        description="Calculates real-time 24 planetary hour intervals from local sunrise according to Chaldean order.",
        required_inputs=["lat", "lon"],
        requires_natal_chart=False,
        handler=_handle_calculate_horas_24h,
        limitations="Location-dependent based on precise sunrise and sunset calculation."
    ),
    "calculate_panchang": AstrologyTool(
        tool_id="calculate_panchang",
        name="Daily Vedic Panchang",
        category="transit_muhurta",
        description="Computes the 5 limbs of time: Tithi, Vaara, Nakshatra, Yoga, and Karana with auspicious Muhurtas.",
        required_inputs=["date_str"],
        requires_natal_chart=False,
        handler=_handle_calculate_panchang,
        limitations="Universal astronomical transit calculation valid for the designated geographic coordinates."
    ),
    "match_kundli_36_gunas": AstrologyTool(
        tool_id="match_kundli_36_gunas",
        name="Ashtakoota 36-Guna Matchmaking",
        category="compatibility",
        description="Performs 8-fold synastry matching (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) totaling 36 points.",
        required_inputs=["boy_moon_sign", "boy_nakshatra", "girl_moon_sign", "girl_nakshatra"],
        requires_natal_chart=False,
        handler=_handle_match_kundli_36_gunas,
        limitations="Lunar Nakshatra-based; does not replace comprehensive D1/D9 cross-chart synastry."
    ),
    "search_classical_knowledge": AstrologyTool(
        tool_id="search_classical_knowledge",
        name="Classical Shastra RAG Search",
        category="shastra_knowledge",
        description="Retrieves classical Sanskrit verses and translations from BPHS, Jaimini Upadesha Sutras, and Phaladeepika.",
        required_inputs=["query"],
        requires_natal_chart=False,
        handler=_handle_search_classical_knowledge,
        limitations="Searches digitized classical corpuses; interpretations require contextual astrological synthesis."
    ),
    "calculate_upagrahas": AstrologyTool(
        tool_id="calculate_upagrahas",
        name="Upagrahas (Shadow Planets)",
        category="chart_foundation",
        description="Calculates positions of Gulika, Mandi, Yamaghantaka, Ardhaprahara, and Kala.",
        required_inputs=["sun_abs_deg", "sunrise_iso"],
        requires_natal_chart=True,
        handler=_handle_calculate_upagrahas,
        limitations="Used primarily in Kerala Jyotish and Prashna traditions."
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
