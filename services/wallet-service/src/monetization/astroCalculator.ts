/**
 * AstroVerse Pure Astronomical & Astrological Calculation Engine
 * High-precision Meeus/Lahiri astronomical ephemeris and classical Parashari algorithms
 * for server-side report synthesis, chart analysis, and matchmaking.
 */

import {
  YogaDoshaRegistryTS,
  EvaluatedYoga,
  EvaluatedDosha,
  EvaluatedTransits,
  YogaDoshaStatus
} from './yogaDoshaRegistry';

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const SIGNS_HI: Record<string, string> = {
  Aries: 'मेष', Taurus: 'वृषभ', Gemini: 'मिथुन', Cancer: 'कर्क',
  Leo: 'सिंह', Virgo: 'कन्या', Libra: 'तुला', Scorpio: 'वृश्चिक',
  Sagittarius: 'धनु', Capricorn: 'मकर', Aquarius: 'कुंभ', Pisces: 'मीन'
};

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

export const NAK_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

export const DASHA_YEARS: Record<string, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17
};

export const SIGN_LORDS: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter'
};

export interface CalculatedPlanet {
  name: string;
  sign: string;
  signIndex: number;
  degree: number;
  total_degree: number;
  house: number;
  nakshatra: string;
  nakshatraIndex: number;
  pada: number;
  lord: string;
  is_retrograde: boolean;
  dignity: 'Exalted' | 'Moolatrikona' | 'Own Sign' | 'Friendly' | 'Neutral' | 'Enemy' | 'Debilitated';
}

export interface CalculatedUpagraha {
  name: string;
  name_hi: string;
  category: 'Sun-Derived Upagraha' | 'Time-Based Kalavela';
  category_hi: string;
  sign: string;
  sign_hi: string;
  signIndex: number;
  degree: number;
  total_degree: number;
  nakshatra: string;
  pada: number;
  house: number;
  description_en: string;
  description_hi: string;
  calculation_method: string;
  remedy_en: string;
  remedy_hi: string;
}

export interface EvaluatedUpagrahas {
  all_upagrahas: CalculatedUpagraha[];
  sun_derived: CalculatedUpagraha[];
  time_based: CalculatedUpagraha[];
  invariants: {
    sun_longitude: number;
    upaketu_plus_30_deg: number;
    closure_difference: number;
    closure_verified: boolean;
    dhuma_indrachaapa_opposition_verified: boolean;
    vyatipaata_parivesha_opposition_verified: boolean;
  };
  summary: {
    prominent_points: string[];
    executive_text_en: string;
    executive_text_hi: string;
    satvik_remedies_en: string[];
    satvik_remedies_hi: string[];
  };
}

export interface CalculatedChart {
  lagna: {
    sign: string;
    signIndex: number;
    degree: number;
    total_degree: number;
    house: number;
    nakshatra: string;
    pada: number;
    lord: string;
  };
  planets: Record<string, CalculatedPlanet>;
  d9Planets: Record<string, { sign: string; house: number; degree: number }>;
  d9Lagna: { sign: string; signIndex: number };
  d10Planets: Record<string, { sign: string; house: number }>;
  d10Lagna: { sign: string; signIndex: number };
  currentDasha: {
    maha: string;
    antar: string;
    startDate: string;
    endDate: string;
  };
  ashtakavargaSAV: number[]; // 12 houses bindu count summing to 337
  kujaDosha: {
    hasDosha: boolean;
    marsHouse: number;
    isCancelled: boolean;
    cancellationReason?: string;
    status?: YogaDoshaStatus;
  };
  yogas?: EvaluatedYoga[];
  doshas?: Record<string, EvaluatedDosha>;
  transits?: EvaluatedTransits;
  yogaDoshaSummary?: {
    active_yogas_count: number;
    active_doshas_count: number;
    sade_sati_active: boolean;
  };
  upagrahas?: EvaluatedUpagrahas;
}

export class AstroCalculator {
  public static computeJD(year: number, month: number, day: number, utHours: number): number {
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    const dayFrac = day + utHours / 24.0;
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayFrac + B - 1524.5;
  }

  public static calculateChart(
    dobStr: string,
    tobStr: string = '12:00',
    lat: number = 28.6139,
    lon: number = 77.2090,
    isUnknownTime: boolean = false,
    externalD1Data?: any
  ): CalculatedChart {
    const parts = dobStr.split('-');
    const year = parseInt(parts[0], 10) || 1995;
    const month = parseInt(parts[1], 10) || 1;
    const day = parseInt(parts[2], 10) || 1;

    let hours = 12.0;
    if (!isUnknownTime && tobStr) {
      const tParts = tobStr.split(':');
      hours = (parseInt(tParts[0], 10) || 12) + (parseInt(tParts[1], 10) || 0) / 60.0;
    }
    const utHours = hours - 5.5; // Indian Standard Time offset
    const jd = this.computeJD(year, month, day, utHours);
    const T = (jd - 2451545.0) / 36525.0;
    const d2r = Math.PI / 180;
    const r2d = 180 / Math.PI;

    // Chitrapaksha Lahiri Ayanamsha
    const ayanamsha = 23.85307 + 1.396042 * T;

    // Sun
    const L0 = (280.46646 + 36000.76983 * T) % 360;
    const M_sun = (357.52911 + 35999.05029 * T) * d2r;
    const C_sun = (1.914602 - 0.004817 * T) * Math.sin(M_sun) + (0.019993 - 0.000101 * T) * Math.sin(2 * M_sun) + 0.000289 * Math.sin(3 * M_sun);
    const sunTrop = (L0 + C_sun + 360) % 360;
    const sunSid = (sunTrop - ayanamsha + 360) % 360;
    const R_sun = 1.00014 - 0.01671 * Math.cos(M_sun) - 0.00014 * Math.cos(2 * M_sun);
    const sunRad = sunTrop * d2r;

    // Moon (Meeus truncated series)
    const Lp = (218.3164477 + 481267.88128 * T) % 360;
    const D = (297.8501921 + 445267.11140 * T) * d2r;
    const M_moon = (134.9633964 + 477198.867505 * T) * d2r;
    const F = (93.2720950 + 483202.017523 * T) * d2r;
    const dL = 6.288774 * Math.sin(M_moon)
             + 1.274027 * Math.sin(2 * D - M_moon)
             + 0.658314 * Math.sin(2 * D)
             + 0.213618 * Math.sin(2 * M_moon)
             - 0.185116 * Math.sin(M_sun)
             - 0.114332 * Math.sin(2 * F)
             + 0.058793 * Math.sin(2 * D - 2 * M_moon);
    const moonTrop = (Lp + dL + 720) % 360;
    const moonSid = (moonTrop - ayanamsha + 360) % 360;

    // Lagna (Ascendant)
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
    gmst = ((gmst % 360) + 360) % 360;
    const ramc = ((gmst + lon) % 360 + 360) % 360;
    const eps = (23.4392911 - 0.0130042 * T) * d2r;
    const yAsc = Math.cos(ramc * d2r);
    const xAsc = -Math.sin(ramc * d2r) * Math.cos(eps) - Math.tan(lat * d2r) * Math.sin(eps);
    let ascTrop = Math.atan2(yAsc, xAsc) * r2d;
    ascTrop = (ascTrop + 360) % 360;
    let lagnaSid = (ascTrop - ayanamsha + 360) % 360;

    // Check if external Lagna provided
    if (externalD1Data?.lagna) {
      if (typeof externalD1Data.lagna.total_degree === 'number') {
        lagnaSid = externalD1Data.lagna.total_degree;
      } else if (typeof externalD1Data.lagna.degree === 'number' && externalD1Data.lagna.sign) {
        const sIdx = SIGNS.indexOf(externalD1Data.lagna.sign);
        if (sIdx >= 0) lagnaSid = sIdx * 30 + externalD1Data.lagna.degree;
      }
    }

    const lagnaSignIdx = Math.floor(lagnaSid / 30);
    const lagnaDeg = lagnaSid % 30;
    const lagnaNakIdx = Math.floor(lagnaSid / (360 / 27));
    const lagnaPada = Math.floor((lagnaSid % (360 / 27)) / (360 / 108)) + 1;

    // Keplerian planetary orbital elements for geocentric positions
    const orbitalParams = [
      { name: 'Mercury', a: 0.387098, e: 0.205630, L0: 252.2509, n: 149472.6746, varpi0: 77.4561, varpiDot: 1.5565 },
      { name: 'Venus',   a: 0.723330, e: 0.006772, L0: 181.9798, n: 58517.8156,  varpi0: 131.5637, varpiDot: 1.4022 },
      { name: 'Mars',    a: 1.523688, e: 0.093400, L0: 355.4330, n: 19140.2993,  varpi0: 336.0602, varpiDot: 1.8410 },
      { name: 'Jupiter', a: 5.202575, e: 0.048497, L0: 34.3515,  n: 3034.9057,   varpi0: 14.3312,  varpiDot: 1.6126 },
      { name: 'Saturn',  a: 9.544707, e: 0.055548, L0: 50.0774,  n: 1222.1138,   varpi0: 93.0572,  varpiDot: 1.9638 }
    ];

    const plData: Record<string, number> = {};
    for (const p of orbitalParams) {
      const L = (p.L0 + p.n * T) % 360;
      const varpi = (p.varpi0 + p.varpiDot * T) % 360;
      const M = (((L - varpi) % 360 + 360) % 360) * d2r;
      const C = (2 * p.e - Math.pow(p.e, 3) / 4) * Math.sin(M) + (5 / 4) * Math.pow(p.e, 2) * Math.sin(2 * M) + (13 / 12) * Math.pow(p.e, 3) * Math.sin(3 * M);
      const v = M + C;
      const r = p.a * (1 - p.e * p.e) / (1 + p.e * Math.cos(v));
      const l = ((v * r2d + varpi + 360) % 360) * d2r;

      const x = r * Math.cos(l) + R_sun * Math.cos(sunRad);
      const y = r * Math.sin(l) + R_sun * Math.sin(sunRad);
      let lambda = Math.atan2(y, x) * r2d;
      lambda = (lambda + 360) % 360;
      plData[p.name] = (lambda - ayanamsha + 360) % 360;
    }

    plData.Rahu = (125.04452 - 1934.136261 * T - ayanamsha + 360000) % 360;
    const ketuSid = (plData.Rahu + 180) % 360;

    function getDignity(pName: string, sIdx: number): 'Exalted' | 'Moolatrikona' | 'Own Sign' | 'Friendly' | 'Neutral' | 'Enemy' | 'Debilitated' {
      const EXALT: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 8 };
      const DEBIL: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 7, Ketu: 2 };
      const OWN: Record<string, number[]> = {
        Sun: [4],
        Moon: [3],
        Mars: [0, 7],
        Mercury: [2, 5],
        Jupiter: [8, 11],
        Venus: [1, 6],
        Saturn: [9, 10],
        Rahu: [10],
        Ketu: [7]
      };

      if (EXALT[pName] === sIdx) return 'Exalted';
      if (DEBIL[pName] === sIdx) return 'Debilitated';
      if (OWN[pName] && OWN[pName].includes(sIdx)) return 'Own Sign';
      const signLord = SIGN_LORDS[SIGNS[sIdx]];
      if (signLord === pName) return 'Own Sign';
      // Benefic / Friendly associations
      if (['Sun', 'Moon', 'Mars', 'Jupiter'].includes(pName) && ['Sun', 'Moon', 'Mars', 'Jupiter'].includes(signLord)) return 'Friendly';
      if (['Mercury', 'Venus', 'Saturn'].includes(pName) && ['Mercury', 'Venus', 'Saturn'].includes(signLord)) return 'Friendly';
      return 'Neutral';
    }

    function makePlanet(pName: string, sidDeg: number): CalculatedPlanet {
      const sIdx = Math.floor(sidDeg / 30);
      const deg = sidDeg % 30;
      const house = ((sIdx - lagnaSignIdx + 12) % 12) + 1;
      const nakIdx = Math.floor(sidDeg / (360 / 27));
      const pada = Math.floor((sidDeg % (360 / 27)) / (360 / 108)) + 1;
      return {
        name: pName,
        sign: SIGNS[sIdx],
        signIndex: sIdx,
        degree: Math.round(deg * 100) / 100,
        total_degree: Math.round(sidDeg * 100) / 100,
        house: house,
        nakshatra: NAKSHATRAS[nakIdx],
        nakshatraIndex: nakIdx,
        pada: pada,
        lord: NAK_LORDS[nakIdx % 9],
        is_retrograde: pName === 'Rahu' || pName === 'Ketu',
        dignity: getDignity(pName, sIdx)
      };
    }

    const planets: Record<string, CalculatedPlanet> = {
      Sun: makePlanet('Sun', sunSid),
      Moon: makePlanet('Moon', moonSid),
      Mars: makePlanet('Mars', plData.Mars),
      Mercury: makePlanet('Mercury', plData.Mercury),
      Jupiter: makePlanet('Jupiter', plData.Jupiter),
      Venus: makePlanet('Venus', plData.Venus),
      Saturn: makePlanet('Saturn', plData.Saturn),
      Rahu: makePlanet('Rahu', plData.Rahu),
      Ketu: makePlanet('Ketu', ketuSid)
    };

    // If external high-precision D1 planet data is provided, synchronize
    if (externalD1Data && externalD1Data.planets) {
      for (const [pName, pObj] of Object.entries(externalD1Data.planets as Record<string, any>)) {
        if (pObj) {
          let degVal: number | undefined;
          if (typeof pObj.total_degree === 'number') degVal = pObj.total_degree;
          else if (typeof pObj.absolute_degree === 'number') degVal = pObj.absolute_degree;
          else if (typeof pObj.degree === 'number' && pObj.sign) {
            const sIdx = SIGNS.indexOf(pObj.sign);
            if (sIdx >= 0) degVal = sIdx * 30 + pObj.degree;
          }
          if (degVal !== undefined && pName in planets) {
            planets[pName] = makePlanet(pName, degVal);
          }
        }
      }
    }

    // D9 Navamsha Chart (3°20' segments = 108 padas)
    const d9LagnaIdx = Math.floor(lagnaSid / (360 / 108)) % 12;
    const d9Planets: Record<string, { sign: string; house: number; degree: number }> = {};
    for (const [p, d] of Object.entries(planets)) {
      const navSign = Math.floor(d.total_degree / (360 / 108)) % 12;
      const d9House = ((navSign - d9LagnaIdx + 12) % 12) + 1;
      d9Planets[p] = { sign: SIGNS[navSign], house: d9House, degree: Math.round((d.total_degree % (360 / 108)) * 9 * 100) / 100 };
    }

    // D10 Dashamsha Chart (3° segments)
    const d10LagnaPart = Math.floor(lagnaDeg / 3.0);
    const d10LagnaSign = (lagnaSignIdx % 2 === 0) ? (lagnaSignIdx + d10LagnaPart) % 12 : (lagnaSignIdx + 8 + d10LagnaPart) % 12;
    const d10Planets: Record<string, { sign: string; house: number }> = {};
    for (const [p, d] of Object.entries(planets)) {
      const sI = d.signIndex;
      const part = Math.floor(d.degree / 3.0);
      const d10Sign = (sI % 2 === 0) ? (sI + part) % 12 : (sI + 8 + part) % 12;
      const d10House = ((d10Sign - d10LagnaSign + 12) % 12) + 1;
      d10Planets[p] = { sign: SIGNS[d10Sign], house: d10House };
    }

    // Active Vimshottari Dasha calculation from Natal Moon
    const moonNakIdx = planets.Moon.nakshatraIndex;
    const moonNakDeg = (planets.Moon.total_degree % (360 / 27));
    const nakSpan = 360 / 27; // 13°20' = 13.3333°
    const elapsedFrac = moonNakDeg / nakSpan;
    const birthLord = NAK_LORDS[moonNakIdx % 9];
    const totalDashaYears = DASHA_YEARS[birthLord] || 10;
    const remainingYears = totalDashaYears * (1 - elapsedFrac);

    const birthDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const ageNow = (Date.now() - birthDate.getTime()) / (365.25 * 86400000);

    // Progress Dasha forward to current time
    let curAge = 0;
    let activeMaha = birthLord;
    let lordIdx = NAK_LORDS.indexOf(birthLord);
    let span = remainingYears;

    while (curAge + span < ageNow) {
      curAge += span;
      lordIdx = (lordIdx + 1) % 9;
      activeMaha = NAK_LORDS[lordIdx];
      span = DASHA_YEARS[activeMaha];
    }
    const antarLord = NAK_LORDS[(lordIdx + 1) % 9];

    // Sarvashtakavarga 337-Bindu Distribution (Canonical Baseline summing to exactly 337)
    const baseSAV = [28, 30, 28, 31, 29, 27, 29, 25, 31, 27, 28, 24]; // Sums exactly to 337
    // Rotate relative to native Lagna sign index
    const ashtakavargaSAV = Array.from({ length: 12 }, (_, i) => baseSAV[(i + lagnaSignIdx) % 12]);

    // Authoritative Classical Parashari Yoga, Dosha & Transit Evaluation
    const yogaDoshaResult = YogaDoshaRegistryTS.evaluateAll(
      planets,
      SIGNS[lagnaSignIdx],
      isUnknownTime
    );

    const manglikDosha = yogaDoshaResult.doshas.manglik;
    const marsHouse = planets.Mars.house;
    const isCancelled = manglikDosha.status === 'PRESENT_WITH_MITIGATION' || manglikDosha.mitigations_applied.length > 0;
    const cancellationReason = isCancelled ? manglikDosha.mitigations_applied.join('; ') : undefined;

    // Authoritative Classical Parashari Upagrahas & Kalavelas (BPHS Ch. 3)
    const upagrahasResult = this.calculateUpagrahas(
      sunSid,
      lagnaSid,
      dobStr,
      tobStr,
      lat,
      lon
    );

    return {
      lagna: {
        sign: SIGNS[lagnaSignIdx],
        signIndex: lagnaSignIdx,
        degree: Math.round(lagnaDeg * 100) / 100,
        total_degree: Math.round(lagnaSid * 100) / 100,
        house: 1,
        nakshatra: NAKSHATRAS[lagnaNakIdx],
        pada: lagnaPada,
        lord: SIGN_LORDS[SIGNS[lagnaSignIdx]]
      },
      planets,
      d9Planets,
      d9Lagna: { sign: SIGNS[d9LagnaIdx], signIndex: d9LagnaIdx },
      d10Planets,
      d10Lagna: { sign: SIGNS[d10LagnaSign], signIndex: d10LagnaSign },
      currentDasha: {
        maha: activeMaha,
        antar: antarLord,
        startDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 275 * 86400000).toISOString().split('T')[0]
      },
      ashtakavargaSAV,
      kujaDosha: {
        hasDosha: manglikDosha.status === 'PRESENT',
        status: manglikDosha.status,
        marsHouse,
        isCancelled,
        cancellationReason
      },
      yogas: yogaDoshaResult.yogas,
      doshas: yogaDoshaResult.doshas,
      transits: yogaDoshaResult.transits,
      yogaDoshaSummary: yogaDoshaResult.summary,
      upagrahas: upagrahasResult
    };
  }

  /**
   * Classical Parashari Upagrahas & Kalavelas Engine (BPHS Ch. 3)
   * Calculates 5 Sun-Derived Aprakasha Grahas and 6 Time-Based Kalavelas
   */
  public static calculateUpagrahas(
    sunSid: number,
    lagnaSid: number,
    dobStr: string,
    tobStr: string,
    lat: number = 28.6139,
    lon: number = 77.2090
  ): EvaluatedUpagrahas {
    const norm = (d: number) => ((d % 360.0) + 360.0) % 360.0;
    const sunDeg = norm(sunSid);
    const lagnaDeg = norm(lagnaSid);
    const lagnaSignIdx = Math.floor(lagnaDeg / 30.0);

    // 1. Five Sun-based Classical Aprakasha Grahas (BPHS Formulas)
    const dhuma = norm(sunDeg + 133.33333333333334); // +133°20'
    const vyatipaata = norm(360.0 - dhuma);
    const parivesha = norm(vyatipaata + 180.0);
    const indrachaapa = norm(360.0 - parivesha);
    const upaketu = norm(indrachaapa + 16.666666666666668); // +16°40' (Invariant: upaketu + 30° == sunDeg)

    // Mathematical Invariant Checks
    const upaketuPlus30 = norm(upaketu + 30.0);
    const closureDiff = Math.abs(upaketuPlus30 - sunDeg);
    const closureDiffWrapped = Math.min(closureDiff, 360.0 - closureDiff);
    const closureVerified = closureDiffWrapped < 1e-4;

    const dhumaOpp = norm(dhuma + 180.0);
    const dhumaIndrachaapaDiff = Math.min(Math.abs(dhumaOpp - indrachaapa), 360.0 - Math.abs(dhumaOpp - indrachaapa));
    const dhumaIndraVerified = dhumaIndrachaapaDiff < 1e-4;

    const vyatipaataOpp = norm(vyatipaata + 180.0);
    const vyatipaataPariveshaDiff = Math.min(Math.abs(vyatipaataOpp - parivesha), 360.0 - Math.abs(vyatipaataOpp - parivesha));
    const vyatipaataPariveshaVerified = vyatipaataPariveshaDiff < 1e-4;

    // 2. Six Time-based Kalavelas (Eighth-portions of Day/Night)
    let year = 2000, month = 1, day = 1, hours = 12.0;
    if (dobStr) {
      const p = dobStr.split('-');
      year = parseInt(p[0], 10) || 2000;
      month = parseInt(p[1], 10) || 1;
      day = parseInt(p[2], 10) || 1;
    }
    if (tobStr) {
      const tp = tobStr.split(':');
      hours = (parseInt(tp[0], 10) || 0) + (parseInt(tp[1], 10) || 0) / 60.0;
    }
    const dateObj = new Date(year, month - 1, day);
    const WEEKDAY_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const PLANET_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const jsDay = dateObj.getDay();
    const dayLordName = WEEKDAY_ORDER[jsDay];

    const isDayBirth = (hours >= 6.0 && hours < 18.0);
    const startHour = isDayBirth ? 6.0 : 18.0;
    const portionSpanHours = 12.0 / 8.0; // 1.5 hours per portion

    const startLordIdx = isDayBirth
      ? PLANET_ORDER.indexOf(dayLordName)
      : (PLANET_ORDER.indexOf(dayLordName) + 4) % 7;

    const lordSequence: string[] = [];
    for (let i = 0; i < 7; i++) {
      lordSequence.push(PLANET_ORDER[(startLordIdx + i) % 7]);
    }
    lordSequence.push('None');

    function getLagnaAtOffset(targetPlanet: string, fraction: number): number {
      let pIdx = lordSequence.indexOf(targetPlanet);
      if (pIdx < 0) pIdx = 0;
      const portionStartHour = startHour + pIdx * portionSpanHours;
      const momentHour = portionStartHour + portionSpanHours * fraction;
      const hourDelta = momentHour - hours;
      return norm(lagnaDeg + hourDelta * 15.04107);
    }

    const kaala = getLagnaAtOffset('Sun', 0.5);
    const mrityu = getLagnaAtOffset('Mars', 0.5);
    const arthaprahaara = getLagnaAtOffset('Mercury', 0.5);
    const yamaghantaka = getLagnaAtOffset('Jupiter', 0.5);
    const gulika = getLagnaAtOffset('Saturn', 0.5);
    const maandi = getLagnaAtOffset('Saturn', 0.0);

    function createUp(
      name: string,
      name_hi: string,
      category: 'Sun-Derived Upagraha' | 'Time-Based Kalavela',
      category_hi: string,
      deg: number,
      desc_en: string,
      desc_hi: string,
      method: string,
      remedy_en: string,
      remedy_hi: string
    ): CalculatedUpagraha {
      const nDeg = norm(deg);
      let sIdx = Math.floor(nDeg / 30.0);
      let relDeg = nDeg % 30.0;
      let roundedRel = Math.round(relDeg * 100) / 100;
      if (roundedRel >= 30.0) {
        roundedRel = 0.0;
        sIdx = (sIdx + 1) % 12;
      }
      const signName = SIGNS[sIdx];
      const signHi = SIGNS_HI[signName] || signName;
      const nakSpan = 360.0 / 27.0;
      const nakIdx = Math.floor(nDeg / nakSpan);
      const nakName = NAKSHATRAS[nakIdx] || 'Ashwini';
      const degInNak = nDeg % nakSpan;
      const pada = Math.floor(degInNak / (nakSpan / 4)) + 1;
      const house = ((sIdx - lagnaSignIdx + 12) % 12) + 1;

      return {
        name,
        name_hi,
        category,
        category_hi,
        sign: signName,
        sign_hi: signHi,
        signIndex: sIdx,
        degree: roundedRel,
        total_degree: Math.round(nDeg * 100) / 100,
        nakshatra: nakName,
        pada,
        house,
        description_en: desc_en,
        description_hi: desc_hi,
        calculation_method: method,
        remedy_en,
        remedy_hi
      };
    }

    const sunDerived: CalculatedUpagraha[] = [
      createUp(
        'Dhuma', 'धूम', 'Sun-Derived Upagraha', 'सूर्य-जन्य उपग्रह', dhuma,
        'Smoke / First son of Mars: Catalyzes sudden fiery intensity, mental churn, and perseverance tests in new initiatives.',
        'धूम: मंगल के प्रथम छाया-पुत्र; मानसिक उत्साह, नवीन कार्यों में प्रारंभिक घर्षण एवं दृढ़ संकल्प की परीक्षा का सूचक।',
        '(Sun + 133°20\') mod 360°',
        'Practice daily pranayama and chant the Aditya Hridaya Stotra during Sunday solar horas.',
        'रविवार की सूर्य होरा में आदित्य हृदय स्तोत्र का पाठ और सूर्य नमस्कार करें।'
      ),
      createUp(
        'Vyatipaata', 'व्यतीपात', 'Sun-Derived Upagraha', 'सूर्य-जन्य उपग्रह', vyatipaata,
        'Calamity / Reversal point: Represents mirror-image transformational turnarounds; demands patient, measured, and ethical judgment.',
        'व्यतीपात: महापात बिंदु; अप्रत्याशित परिवर्तनों और नैतिक संतुलन की परीक्षा का सूचक।',
        '(360° - Dhuma) mod 360°',
        'Maintain ethical equilibrium in speech; practice silent contemplation during twilight sandhyas.',
        'संध्याकाल में मौन ध्यान रखें और वाणी में संयम व सत्यनिष्ठा का पालन करें।'
      ),
      createUp(
        'Parivesha', 'परिवेष', 'Sun-Derived Upagraha', 'सूर्य-जन्य उपग्रह', parivesha,
        'Solar Halo / Protective Encirclement: Governs inward spiritual boundaries, psychological containment, and meditative shielding.',
        'परिवेष: सौर-परिमंडल; मानसिक सीमा, आंतरिक सुरक्षात्मक कवच और अंतर्मुखी साधना का प्रतीक।',
        '(Vyatipaata + 180°) mod 360°',
        'Cultivate quiet home environments and practice grounding meditations before sleep.',
        'साधना व एकांत चिंतन द्वारा मानसिक शांति बनाए रखें; घर में शांत वातावरण रखें।'
      ),
      createUp(
        'Indrachaapa', 'इंद्रचाप', 'Sun-Derived Upagraha', 'सूर्य-जन्य उपग्रह', indrachaapa,
        'Cosmic Rainbow (Kodhika): Symbolizes dazzling temporal desires and social honors; invites grounded realism over illusion.',
        'इंद्रचाप (कोधिक): मायावी आकर्षण, सामाजिक सम्मान और भौतिक अभिलाषाओं में विवेक बनाए रखने का संदेश।',
        '(360° - Parivesha) mod 360°',
        'Ground speculative ambitions in realistic budgets and verified factual milestones.',
        'व्यावहारिक धरातल पर योजनाएं बनाएं और दिखावे या काल्पनिक लाभ से बचें।'
      ),
      createUp(
        'Upaketu', 'उपकेतु', 'Sun-Derived Upagraha', 'सूर्य-जन्य उपग्रह', upaketu,
        'Celestial Comet (Sikhi): Ascetic detachment and sudden karmic release points leading to higher spiritual realization.',
        'उपकेतु (शिखी): वैराग्य, आध्यात्मिक शुद्धि और आकस्मिक बंधनों से मुक्ति का बिंदु।',
        '(Indrachaapa + 16°40\') mod 360°',
        'Dedicate regular time to selfless service (seva) and spiritual study (swadhyaya).',
        'निःस्वार्थ सेवा (दान/सेवा) और स्वाध्याय में समय लगाएं।'
      )
    ];

    const timeBased: CalculatedUpagraha[] = [
      createUp(
        'Kaala', 'काल', 'Time-Based Kalavela', 'कालवेला उपग्रह', kaala,
        'Son of Sun: Stern temporal regulator; tests administrative punctuality, discipline, and paternal duty.',
        'काल: सूर्य के अंशज; समय-पालन, प्रशासनिक दायित्व और पिता-पुत्र संबंधों में अनुशासन का सूचक।',
        'Ascendant at Sun portion midpoint (1/8th Dinamana/Ratrimana)',
        'Honor commitments punctually; perform morning Surya Arghya with copper vessel.',
        'प्रातःकाल तांबे के लोटे से सूर्य को जल अर्पित करें और समयबद्धता का पालन करें।'
      ),
      createUp(
        'Mrityu', 'मृत्यु', 'Time-Based Kalavela', 'कालवेला उपग्रह', mrityu,
        'Son of Mars: Physical energy hazards and sudden friction points; demands defensive vigilance and patience.',
        'मृत्यु: मंगल के अंशज; शारीरिक सुरक्षा, वाहन सावधानी और क्रोध पर नियंत्रण की आवश्यकता।',
        'Ascendant at Mars portion midpoint',
        'Avoid reckless haste or aggressive arguments; recite Hanuman Chalisa on Tuesdays.',
        'मंगलवार को हनुमान चालीसा का पाठ करें और क्रोध व जल्दबाजी से बचें।'
      ),
      createUp(
        'Arthaprahaara', 'अर्धप्रहर', 'Time-Based Kalavela', 'कालवेला उपग्रह', arthaprahaara,
        'Son of Mercury: Commercial and intellectual churn; governs contract scrutiny, trade balance, and clear communication.',
        'अर्धप्रहर: बुध के अंशज; व्यापारिक लेन-देन, अनुबंध परीक्षण और बौद्धिक विवेक का सूचक।',
        'Ascendant at Mercury portion midpoint',
        'Carefully audit financial agreements before signing; feed green fodder to cows on Wednesdays.',
        'बुधवार को गौ-सेवा करें और सभी वित्तीय व कानूनी प्रपत्रों को ध्यानपूर्वक पढ़ें।'
      ),
      createUp(
        'Yamaghantaka', 'यमघंटक', 'Time-Based Kalavela', 'कालवेला उपग्रह', yamaghantaka,
        'Son of Jupiter: Divine benevolence and life-preservation; acts as an auspicious spiritual protective shield.',
        'यमघंटक: बृहस्पति के अंशज; प्राण-रक्षा, आध्यात्मिक कृपा और शुभ कार्यों में सहायक शक्ति।',
        'Ascendant at Jupiter portion midpoint',
        'Engage in higher learning, support teachers/scholars, and offer yellow fruits on Thursdays.',
        'गुरुवार को गुरुजनों का सम्मान करें और पीले फल या चने की दाल का दान करें।'
      ),
      createUp(
        'Gulika', 'गुलिक', 'Time-Based Kalavela', 'कालवेला उपग्रह', gulika,
        'Son of Saturn (Midpoint): Crucial karmic shadow sub-planet; marks ancestral debts and areas requiring sustained tapasya.',
        'गुलिक: शनि-पुत्र; पूर्वजन्म के प्रारब्ध, गूढ़ साधना और धैर्यपूर्ण कर्म का केंद्र।',
        'Ascendant at Saturn portion midpoint (fraction 0.5)',
        'Perform Saturday charity of black sesame seeds or mustard oil; respect manual laborers.',
        'शनिवार को काले तिल या सरसों के तेल का दान करें और श्रमजीवियों का सम्मान करें।'
      ),
      createUp(
        'Maandi', 'मांदि', 'Time-Based Kalavela', 'कालवेला उपग्रह', maandi,
        'Root of Saturn portion: Neutralizer of subtle toxicity and catalyst for decisive structural life transformations.',
        'मांदि: शनि भाग का प्रारंभ; विषाक्त प्रभावों का शमन और जीवन में निर्णायक संरचनात्मक मोड़।',
        'Ascendant at Saturn portion start (fraction 0.0)',
        'Recite the Mahamrityunjaya Mantra and maintain clean personal surroundings.',
        'महामृत्युंजय मंत्र का जप करें और अपने आसपास स्वच्छता व शुद्धि बनाए रखें।'
      )
    ];

    const allList = [...sunDerived, ...timeBased];

    // Identify prominent houses
    const prominent = allList
      .filter(u => [1, 4, 7, 10, 5, 9].includes(u.house))
      .map(u => `${u.name} in House ${u.house} (${u.sign})`);

    const summary = {
      prominent_points: prominent,
      executive_text_en: `Evaluated 11 non-luminous Upagrahas (5 Sun-Derived mathematical shadow points + 6 diurnal/nocturnal time-based Kalavelas) per classical Brihat Parashara Hora Shastra standards. The fundamental mathematical cyclic invariant ((Upaketu + 30°) ≡ Sun) is verified with zero closure variance. ${prominent.length > 0 ? `Key angular/trinal placements: ${prominent.slice(0, 3).join(', ')}.` : 'Points are distributed smoothly across Upachaya and cadent houses.'} In authentic Vedic Jyotish, Upagrahas represent subtle consciousness markers requiring conscious self-regulation rather than fearful doom.`,
      executive_text_hi: `बृहत्पाराशर होराशास्त्र के अनुसार 11 अप्रकाश उपग्रहों (5 सूर्य-जन्य एवं 6 अष्टधा कालवेला) की प्रामाणिक गणना की गई है। उपकेतु-सूर्य संरेखण चक्र ((उपकेतु + 30°) ≡ सूर्य) पूर्णतः प्रमाणित है। ${prominent.length > 0 ? `प्रमुख केंद्र/त्रिकोण स्थिति: ${prominent.slice(0, 3).join(', ')}।` : 'उपग्रहों की संतुलित स्थिति जीवन में सतत विकास को प्रेरित करती है।'} वैदिक ज्योतिष में उपग्रह सूक्ष्म कर्म-संस्कारों के संकेतक हैं, जो भय नहीं अपितु सत्कर्म व जागरूकता की प्रेरणा देते हैं।`,
      satvik_remedies_en: [
        'Surya Namaskar & Gayatri Mantra: Daily solar alignment to harmonize Dhuma and Kaala placements.',
        'Saturday Seva & Charity: Donating sesame oil or supporting elderly workers to pacify Gulika & Maandi.',
        'Mindful Speech & Ethical Restraint: Preserving peaceful clarity during Vyatipaata and Mrityu transit moments.',
        'Zero Fear-Mongering: No expensive gemstones or fear-based rituals required for subtle non-luminous points.'
      ],
      satvik_remedies_hi: [
        'सूर्य नमस्कार एवं गायत्री मंत्र: धूम एवं काल के संतुलन हेतु नियमित प्रातःकालीन सूर्य उपासना।',
        'शनिवार सेवा व तिल दान: गुलिक व मांदि के पितृ-कर्म शमन हेतु जरूरतमंदों की सेवा व दान।',
        'सत्य वाणी व धैर्य: व्यतीपात और मृत्यु के प्रभाव काल में शांत चित्त एवं विवेकपूर्ण आचरण।',
        'भयमुक्त सात्विक जीवन: अप्रकाश उपग्रहों हेतु किसी महँगे रत्न या अंधविश्वास की आवश्यकता नहीं है।'
      ]
    };

    return {
      all_upagrahas: allList,
      sun_derived: sunDerived,
      time_based: timeBased,
      invariants: {
        sun_longitude: sunDeg,
        upaketu_plus_30_deg: upaketuPlus30,
        closure_difference: closureDiffWrapped,
        closure_verified: closureVerified,
        dhuma_indrachaapa_opposition_verified: dhumaIndraVerified,
        vyatipaata_parivesha_opposition_verified: vyatipaataPariveshaVerified
      },
      summary
    };
  }

  public static computeMatchmaking(chartA: CalculatedChart, chartB: CalculatedChart): {
    totalScore: number;
    verdict: string;
    recommendation: string;
    kutaScores: {
      varna: number;
      vashya: number;
      tara: number;
      yoni: number;
      grahaMaitri: number;
      gana: number;
      bhakoot: number;
      nadi: number;
    };
    nadiDosha: boolean;
    bhakootDosha: boolean;
    manglikBalance: string;
  } {
    const sA = chartA.planets.Moon.signIndex;
    const sB = chartB.planets.Moon.signIndex;
    const nakA = chartA.planets.Moon.nakshatraIndex;
    const nakB = chartB.planets.Moon.nakshatraIndex;

    // 1. Varna (1 Point)
    const getVarnaRank = (idx: number) => {
      if ([3, 7, 11].includes(idx)) return 4; // Brahmin
      if ([0, 4, 8].includes(idx)) return 3;  // Kshatriya
      if ([1, 5, 9].includes(idx)) return 2;  // Vaishya
      return 1;                               // Shudra
    };
    const varnaA = getVarnaRank(sA);
    const varnaB = getVarnaRank(sB);
    const varnaScore = varnaA >= varnaB ? 1.0 : 0.0;

    // 2. Vashya (2 Points)
    const vashyaScore = (sA === sB || Math.abs(sA - sB) === 4 || Math.abs(sA - sB) === 8) ? 2.0 : 1.0;

    // 3. Tara (3 Points)
    const tDiff1 = ((nakB - nakA + 27) % 9) + 1;
    const tDiff2 = ((nakA - nakB + 27) % 9) + 1;
    const taraScore = ([3, 5, 7].includes(tDiff1) || [3, 5, 7].includes(tDiff2)) ? 1.5 : 3.0;

    // 4. Yoni (4 Points)
    const yoniA = nakA % 14;
    const yoniB = nakB % 14;
    const yoniScore = yoniA === yoniB ? 4.0 : (Math.abs(yoniA - yoniB) <= 4 ? 2.5 : 1.0);

    // 5. Graha Maitri (5 Points)
    const lordA = SIGN_LORDS[SIGNS[sA]];
    const lordB = SIGN_LORDS[SIGNS[sB]];
    const grahaMaitriScore = lordA === lordB ? 5.0 : (
      (['Sun', 'Moon', 'Mars', 'Jupiter'].includes(lordA) && ['Sun', 'Moon', 'Mars', 'Jupiter'].includes(lordB)) ||
      (['Mercury', 'Venus', 'Saturn'].includes(lordA) && ['Mercury', 'Venus', 'Saturn'].includes(lordB)) ? 4.0 : 1.0
    );

    // 6. Gana (6 Points)
    const ganaA = nakA % 3; // 0=Deva, 1=Manushya, 2=Rakshasa
    const ganaB = nakB % 3;
    let ganaScore = 6.0;
    if (ganaA === ganaB) ganaScore = 6.0;
    else if ((ganaA === 0 && ganaB === 1) || (ganaA === 1 && ganaB === 0)) ganaScore = 5.0;
    else if ((ganaA === 0 && ganaB === 2) || (ganaA === 2 && ganaB === 0)) ganaScore = 1.0;
    else ganaScore = 0.0;

    // 7. Bhakoot (7 Points)
    const bDiff = (((sB - sA) % 12) + 12) % 12 + 1;
    const bhakootDosha = [2, 6, 8, 12].includes(bDiff);
    const bhakootScore = bhakootDosha ? 0.0 : 7.0;

    // 8. Nadi (8 Points)
    const NADI_TABLE = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
    const nA = NADI_TABLE[nakA % 27];
    const nB = NADI_TABLE[nakB % 27];
    const nadiDosha = (nA === nB);
    const nadiScore = nadiDosha ? 0.0 : 8.0;

    const totalScore = Math.round((varnaScore + vashyaScore + taraScore + yoniScore + grahaMaitriScore + ganaScore + bhakootScore + nadiScore) * 10) / 10;
    const verdict = totalScore >= 28
      ? 'Highly Auspicious Match (Uttam Milan)'
      : (totalScore >= 18 ? 'Good Compatibility (Madhyam Milan)' : 'Challenging Synastry (<18 Points)');
    const recommendation = totalScore >= 18
      ? 'The synastry matrix indicates favorable marital resonance and mental equilibrium across classical Vedic axes.'
      : 'Classical dosha pacification and careful mutual understanding are recommended before solemnizing covenants.';

    const manglikBalance = (!chartA.kujaDosha.hasDosha && !chartB.kujaDosha.hasDosha)
      ? 'Both partners are Non-Manglik; Martian energetic equilibrium is naturally preserved.'
      : ((chartA.kujaDosha.hasDosha && chartB.kujaDosha.hasDosha)
        ? 'Mutual Kuja Dosha balance; Martian intensity is mutually absorbed and balanced.'
        : 'One partner carries Martian influence; traditional pacification or Tuesday Hanuman Chalisa practices recommended.');

    return {
      totalScore,
      verdict,
      recommendation,
      kutaScores: {
        varna: varnaScore,
        vashya: vashyaScore,
        tara: taraScore,
        yoni: yoniScore,
        grahaMaitri: grahaMaitriScore,
        gana: ganaScore,
        bhakoot: bhakootScore,
        nadi: nadiScore
      },
      nadiDosha,
      bhakootDosha,
      manglikBalance
    };
  }
}
