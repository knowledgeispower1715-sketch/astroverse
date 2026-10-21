/**
 * AstroVerse Mobile OS - Vimshottari Dasha Calculation Engine
 * Implements Parashari 120-year cycle from Moon's natal longitude.
 */

import { VimshottariDashaActive } from '../types';

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

export const DASHA_ORDER = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

/**
 * Calculates current active Mahadasha and Antardasha from Moon sidereal longitude and DOB.
 * @param moonTotalDegree Moon's total sidereal longitude (0 - 360)
 * @param dob Date of birth in YYYY-MM-DD
 * @param currentDate Current date to check (defaults to today)
 */
export function calculateVimshottariDasha(
  moonTotalDegree: number,
  dob: string,
  currentDate: Date = new Date()
): VimshottariDashaActive {
  const normDeg = ((moonTotalDegree % 360) + 360) % 360;
  const nakshatraSpan = 360 / 27; // 13.333333°
  const nakshatraIndex = Math.floor(normDeg / nakshatraSpan);
  const degElapsedInNak = normDeg % nakshatraSpan;
  const fracElapsed = degElapsedInNak / nakshatraSpan;
  const fracRemaining = 1 - fracElapsed;

  const firstLord = DASHA_ORDER[nakshatraIndex % 9];
  const firstTotalYears = DASHA_YEARS[firstLord];
  const firstRemainingYears = firstTotalYears * fracRemaining;

  const birthDate = new Date(dob);
  const targetTimeMs = currentDate.getTime();

  let currentStart = birthDate.getTime();
  let activeMaha = firstLord;
  let activeMahaStart = currentStart;
  let activeMahaEnd = currentStart + firstRemainingYears * 365.2425 * 24 * 3600 * 1000;

  // If target date is within the remaining balance of the first Mahadasha
  let mahaIndex = DASHA_ORDER.indexOf(firstLord);

  if (targetTimeMs >= activeMahaEnd) {
    // Cycle forward
    currentStart = activeMahaEnd;
    mahaIndex = (mahaIndex + 1) % 9;

    while (true) {
      const lord = DASHA_ORDER[mahaIndex];
      const durationMs = DASHA_YEARS[lord] * 365.2425 * 24 * 3600 * 1000;
      const endMs = currentStart + durationMs;

      if (targetTimeMs >= currentStart && targetTimeMs < endMs) {
        activeMaha = lord;
        activeMahaStart = currentStart;
        activeMahaEnd = endMs;
        break;
      }
      currentStart = endMs;
      mahaIndex = (mahaIndex + 1) % 9;

      // Bound safety limit (120 years from birth)
      if (currentStart - birthDate.getTime() > 120 * 365.25 * 24 * 3600 * 1000) {
        activeMaha = lord;
        activeMahaStart = currentStart - durationMs;
        activeMahaEnd = currentStart;
        break;
      }
    }
  }

  // Calculate Antardasha within the active Mahadasha
  const mahaTotalYears = DASHA_YEARS[activeMaha];
  const mahaStartIndex = DASHA_ORDER.indexOf(activeMaha);
  let antarStart = activeMahaStart;
  let activeAntar = activeMaha;

  for (let i = 0; i < 9; i++) {
    const subLord = DASHA_ORDER[(mahaStartIndex + i) % 9];
    const subYears = DASHA_YEARS[subLord];
    // Antardasha duration = (Maha_years * Antar_years) / 120
    const antarDurationYears = (mahaTotalYears * subYears) / 120;
    const antarDurationMs = antarDurationYears * 365.2425 * 24 * 3600 * 1000;
    const antarEnd = antarStart + antarDurationMs;

    if (targetTimeMs >= antarStart && targetTimeMs <= antarEnd) {
      activeAntar = subLord;
      break;
    }
    antarStart = antarEnd;
  }

  const totalMahaDurationMs = activeMahaEnd - activeMahaStart;
  const elapsedMs = Math.max(0, targetTimeMs - activeMahaStart);
  const progressPct = Math.min(100, Math.max(0, Number(((elapsedMs / totalMahaDurationMs) * 100).toFixed(1))));

  return {
    maha_dasha: activeMaha,
    antar_dasha: activeAntar,
    start_date: new Date(activeMahaStart).toISOString().split('T')[0],
    end_date: new Date(activeMahaEnd).toISOString().split('T')[0],
    progress_pct: progressPct
  };
}
