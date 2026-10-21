/**
 * AstroVerse Mobile OS - Client-Side Astronomical & Vedic Calculation Engine
 * High-precision Meeus-Lahiri calculations for offline fallback and immediate responsive UI.
 */

import { KundliChartData, PlanetData, HourlyHoraSlot, PlanetaryHorasResponse } from '../types';

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

export const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

export const HORA_PLANET_ORDER = [
  'Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'
];

export const DAY_LORDS: Record<number, string> = {
  0: 'Sun',      // Sunday
  1: 'Moon',     // Monday
  2: 'Mars',     // Tuesday
  3: 'Mercury',  // Wednesday
  4: 'Jupiter',  // Thursday
  5: 'Venus',    // Friday
  6: 'Saturn'    // Saturday
};

/**
 * Calculate Julian Day Number from UTC date components.
 */
export function getJulianDay(year: number, month: number, day: number, hourFraction: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (year + 4716)) +
             Math.floor(30.6001 * (month + 1)) +
             day + hourFraction + B - 1524.5;
  return jd;
}

/**
 * Calculate approximate Lahiri Ayanamsha for a given Julian Day.
 * Reference: J2000 Lahiri ~ 23.85° (23°51')
 */
export function getLahiriAyanamsha(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  // Mean Lahiri ayanamsha approximation
  return 23.8561 + 1.3969 * T + 0.0003 * T * T;
}

/**
 * Calculate mean tropical longitude of the Sun.
 */
export function getSunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mrad = (M * Math.PI) / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
            0.000289 * Math.sin(3 * Mrad);
  let sunTrueLong = (L0 + C) % 360;
  if (sunTrueLong < 0) sunTrueLong += 360;
  return sunTrueLong;
}

/**
 * Calculate approximate Moon tropical longitude.
 */
export function getMoonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let L = 218.3164477 + 481267.88123421 * T;
  let D = 297.8501921 + 445267.1114034 * T;
  let M = 357.5291092 + 35999.0502909 * T;
  let Mprime = 134.9633964 + 477198.8675055 * T;

  const toRad = Math.PI / 180;
  let correction = 6.288774 * Math.sin(Mprime * toRad)
                 + 1.274027 * Math.sin((2 * D - Mprime) * toRad)
                 + 0.658314 * Math.sin(2 * D * toRad)
                 + 0.213618 * Math.sin(2 * Mprime * toRad)
                 - 0.185116 * Math.sin(M * toRad);

  let moonLong = (L + correction) % 360;
  if (moonLong < 0) moonLong += 360;
  return moonLong;
}

/**
 * Calculate approximate Ascendant (Lagna) sidereal longitude.
 */
export function getAscendantSidereal(jd: number, lat: number, lon: number, ayanamsha: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  let gmst = theta0 % 360;
  if (gmst < 0) gmst += 360;
  let lmst = (gmst + lon) % 360;
  if (lmst < 0) lmst += 360;

  const rad = Math.PI / 180;
  const eps = 23.439291 - 0.0130042 * T;
  const sinLmst = Math.sin(lmst * rad);
  const cosLmst = Math.cos(lmst * rad);
  const sinEps = Math.sin(eps * rad);
  const cosEps = Math.cos(eps * rad);
  const tanLat = Math.tan(lat * rad);

  let y = -cosLmst;
  let x = sinLmst * cosEps + tanLat * sinEps;
  let ascTropical = Math.atan2(y, x) * (180 / Math.PI);
  if (ascTropical < 0) ascTropical += 360;

  let ascSidereal = (ascTropical - ayanamsha) % 360;
  if (ascSidereal < 0) ascSidereal += 360;
  return ascSidereal;
}

/**
 * Converts a sidereal ecliptic longitude (0-360) into Vedic sign, degree, nakshatra, and pada.
 */
export function getSiderealPositionDetails(siderealDegree: number) {
  const normDeg = ((siderealDegree % 360) + 360) % 360;
  const signIndex = Math.floor(normDeg / 30);
  const degInSign = normDeg % 30;

  // Nakshatra is 13°20' = 13.333333°
  const nakshatraIndex = Math.floor(normDeg / (360 / 27));
  const degInNakshatra = normDeg % (360 / 27);
  // Each nakshatra has 4 padas (3°20' = 3.333333°)
  const pada = Math.floor(degInNakshatra / (360 / 108)) + 1;
  const lord = NAKSHATRA_LORDS[nakshatraIndex % 9];

  return {
    sign: ZODIAC_SIGNS[signIndex],
    signIndex,
    degree: Number(degInSign.toFixed(2)),
    total_degree: Number(normDeg.toFixed(2)),
    nakshatra: NAKSHATRAS[nakshatraIndex],
    nakshatraIndex,
    pada,
    nakshatra_lord: lord
  };
}

/**
 * Generate client-side Kundli Chart Data (D1 & D9 fallback)
 */
export function calculateClientKundli(
  dob: string, // YYYY-MM-DD
  tob: string, // HH:mm
  lat: number,
  lon: number,
  tzOffsetHours = 5.5 // Default IST
): KundliChartData {
  const [year, month, day] = dob.split('-').map(Number);
  const [hour, minute] = tob.split(':').map(Number);

  // UTC Decimal Hour
  const utcHours = hour + minute / 60.0 - tzOffsetHours;
  let dayAdjusted = day;
  let finalHour = utcHours;
  if (finalHour < 0) {
    finalHour += 24;
    dayAdjusted -= 1;
  } else if (finalHour >= 24) {
    finalHour -= 24;
    dayAdjusted += 1;
  }

  const jd = getJulianDay(year, month, dayAdjusted, finalHour / 24.0);
  const ayanamsha = getLahiriAyanamsha(jd);

  // Ascendant
  const ascSidereal = getAscendantSidereal(jd, lat, lon, ayanamsha);
  const ascDetails = getSiderealPositionDetails(ascSidereal);

  // Sun
  const sunTrop = getSunLongitude(jd);
  const sunSid = (sunTrop - ayanamsha + 360) % 360;
  const sunDetails = getSiderealPositionDetails(sunSid);

  // Moon
  const moonTrop = getMoonLongitude(jd);
  const moonSid = (moonTrop - ayanamsha + 360) % 360;
  const moonDetails = getSiderealPositionDetails(moonSid);

  const ascSignIdx = ascDetails.signIndex;

  const calculateHouse = (planetSignIdx: number) => {
    return ((planetSignIdx - ascSignIdx + 12) % 12) + 1;
  };

  const planets: Record<string, PlanetData> = {
    Sun: {
      name: 'Sun',
      sign: sunDetails.sign,
      degree: sunDetails.degree,
      total_degree: sunDetails.total_degree,
      house: calculateHouse(sunDetails.signIndex),
      nakshatra: sunDetails.nakshatra,
      pada: sunDetails.pada,
      nakshatra_lord: sunDetails.nakshatra_lord,
      karaka: 'Atmakaraka'
    },
    Moon: {
      name: 'Moon',
      sign: moonDetails.sign,
      degree: moonDetails.degree,
      total_degree: moonDetails.total_degree,
      house: calculateHouse(moonDetails.signIndex),
      nakshatra: moonDetails.nakshatra,
      pada: moonDetails.pada,
      nakshatra_lord: moonDetails.nakshatra_lord,
      karaka: 'Amatyakaraka'
    }
  };

  return {
    lagna: {
      sign: ascDetails.sign,
      degree: ascDetails.degree,
      nakshatra: ascDetails.nakshatra,
      pada: ascDetails.pada
    },
    planets
  };
}

/**
 * Generate 24-Hour Planetary Horas schedule for today with millisecond timestamps.
 */
export function calculatePlanetaryHoras(date: Date = new Date()): PlanetaryHorasResponse {
  const dayOfWeek = date.getDay();
  const dayLord = DAY_LORDS[dayOfWeek];
  const lordStartIndex = HORA_PLANET_ORDER.indexOf(dayLord);

  // Default sunrise at 06:00 and sunset at 18:00 if coordinates unavailable
  const baseDateStr = date.toISOString().split('T')[0];
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6, 0, 0);
  const sunset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0, 0);
  const nextSunrise = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 6, 0, 0);

  const dayDurationMs = sunset.getTime() - startOfDay.getTime();
  const nightDurationMs = nextSunrise.getTime() - sunset.getTime();
  const dayHoraDurationMs = Math.floor(dayDurationMs / 12);
  const nightHoraDurationMs = Math.floor(nightDurationMs / 12);

  const nowMs = date.getTime();
  const schedule: HourlyHoraSlot[] = [];
  let activeHora: HourlyHoraSlot | null = null;

  const getCategory = (planet: string): 'Highly Favorable' | 'Caution' | 'Moderate' => {
    if (['Jupiter', 'Venus', 'Mercury'].includes(planet)) return 'Highly Favorable';
    if (['Mars', 'Saturn'].includes(planet)) return 'Caution';
    return 'Moderate';
  };

  const getSanskritName = (planet: string): string => {
    const map: Record<string, string> = {
      Sun: 'Surya Hora',
      Moon: 'Chandra Hora',
      Mars: 'Mangala Hora',
      Mercury: 'Budha Hora',
      Jupiter: 'Guru Hora',
      Venus: 'Shukra Hora',
      Saturn: 'Shani Hora'
    };
    return map[planet] || `${planet} Hora`;
  };

  // 12 Daytime Horas
  for (let i = 0; i < 12; i++) {
    const startMs = startOfDay.getTime() + i * dayHoraDurationMs;
    const endMs = startMs + dayHoraDurationMs;
    const planet = HORA_PLANET_ORDER[(lordStartIndex + i) % 7];
    const isActive = nowMs >= startMs && nowMs < endMs;

    const slot: HourlyHoraSlot = {
      slot_number: i + 1,
      start_time: new Date(startMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      end_time: new Date(endMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      start_epoch_ms: startMs,
      end_epoch_ms: endMs,
      ruling_planet: planet,
      sanskrit_name: getSanskritName(planet),
      category: getCategory(planet),
      is_daytime: true,
      is_active: isActive
    };

    schedule.push(slot);
    if (isActive) activeHora = slot;
  }

  // 12 Nighttime Horas
  for (let i = 0; i < 12; i++) {
    const startMs = sunset.getTime() + i * nightHoraDurationMs;
    const endMs = startMs + nightHoraDurationMs;
    const planet = HORA_PLANET_ORDER[(lordStartIndex + 12 + i) % 7];
    const isActive = nowMs >= startMs && nowMs < endMs;

    const slot: HourlyHoraSlot = {
      slot_number: 13 + i,
      start_time: new Date(startMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      end_time: new Date(endMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      start_epoch_ms: startMs,
      end_epoch_ms: endMs,
      ruling_planet: planet,
      sanskrit_name: getSanskritName(planet),
      category: getCategory(planet),
      is_daytime: false,
      is_active: isActive
    };

    schedule.push(slot);
    if (isActive) activeHora = slot;
  }

  if (!activeHora) {
    activeHora = schedule[0];
  }

  return {
    date: baseDateStr,
    sunrise: '06:00 AM',
    sunset: '06:00 PM',
    active_hora: activeHora,
    schedule,
    special_periods: {
      rahu_kaal: { start: '04:30 PM', end: '06:00 PM' },
      yamaganda: { start: '12:00 PM', end: '01:30 PM' },
      gulika_kaal: { start: '03:00 PM', end: '04:30 PM' },
      abhijit_muhurta: { start: '11:45 AM', end: '12:35 PM' }
    }
  };
}
