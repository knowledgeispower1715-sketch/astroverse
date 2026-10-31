/**
 * AstroVerse AI — Canonical Astrology Settings & Methodology Registry (TypeScript)
 * Maintains exact settings parity with the Python Swiss Ephemeris engine.
 */

export const METHODOLOGY_PROFILE_NAME = 'ASTROVERSE_PARASHARI_LAHIRI_DRIK';
export const METHODOLOGY_VERSION = '2.0.0-parashari-lahiri-drik';

export const ZODIAC_SYSTEM = 'Sidereal (Nirayana)';
export const AYANAMSHA_NAME = 'Lahiri / Chitra Paksha';
export const HOUSE_SYSTEM_PRIMARY = 'Whole-Sign Rashi Houses';
export const HOUSE_SYSTEM_SECONDARY = 'Bhava Chalit (Midpoint Sandhi Cusps)';
export const DASHA_SYSTEM = 'Vimshottari (120-Year Lifespan Cycle)';
export const NODE_CALCULATION = 'Mean Node (Rahu/Ketu 180° true opposition)';
export const POSITION_MODEL = 'Geocentric Apparent Sidereal';

export const CONVENTION_GREGORIAN_MEAN = 'Gregorian Mean-Year (365.2425 days)';
export const CONVENTION_JULIAN = 'Julian Calendar (365.25 days)';
export const CONVENTION_SAVANA_360 = 'Savana 360-Day Classical Year (360.0 days)';

export const DAYS_PER_YEAR_DEFAULT = 365.2425;
export const DAYS_PER_YEAR_JULIAN = 365.25;
export const DAYS_PER_YEAR_SAVANA = 360.0;

export interface MethodologyMetadata {
  methodology_profile: string;
  methodology_version: string;
  zodiac: string;
  ayanamsha: string;
  ayanamsha_code: string;
  ephemeris_version: string;
  ephemeris_source: string;
  position_model: string;
  node_configuration: string;
  primary_house_system: string;
  alternative_house_system: string;
  dasha_system: string;
  dasha_year_convention: string;
  days_per_year: number;
  timezone_identifier: string;
  calculation_timestamp_utc: string;
  epistemic_standard: string;
}

export function getMethodologyMetadataTS(
  tzIdentifier: string = 'Asia/Kolkata',
  yearConvention: string = CONVENTION_GREGORIAN_MEAN
): MethodologyMetadata {
  let daysPerYear = DAYS_PER_YEAR_DEFAULT;
  if (yearConvention === CONVENTION_JULIAN) {
    daysPerYear = DAYS_PER_YEAR_JULIAN;
  } else if (yearConvention === CONVENTION_SAVANA_360) {
    daysPerYear = DAYS_PER_YEAR_SAVANA;
  }

  return {
    methodology_profile: METHODOLOGY_PROFILE_NAME,
    methodology_version: METHODOLOGY_VERSION,
    zodiac: ZODIAC_SYSTEM,
    ayanamsha: AYANAMSHA_NAME,
    ayanamsha_code: 'SIDM_LAHIRI',
    ephemeris_version: 'Swiss Ephemeris 2.10.03 / Meeus Pure TypeScript',
    ephemeris_source: 'Moshier Analytical Model & High-Precision Trigonometric Series',
    position_model: POSITION_MODEL,
    node_configuration: NODE_CALCULATION,
    primary_house_system: HOUSE_SYSTEM_PRIMARY,
    alternative_house_system: HOUSE_SYSTEM_SECONDARY,
    dasha_system: DASHA_SYSTEM,
    dasha_year_convention: yearConvention,
    days_per_year: daysPerYear,
    timezone_identifier: tzIdentifier,
    calculation_timestamp_utc: new Date().toISOString(),
    epistemic_standard: 'Deterministic Calculation and Narrative Validation'
  };
}
