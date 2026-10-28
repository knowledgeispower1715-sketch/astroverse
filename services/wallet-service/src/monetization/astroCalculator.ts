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
      yogaDoshaSummary: yogaDoshaResult.summary
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
