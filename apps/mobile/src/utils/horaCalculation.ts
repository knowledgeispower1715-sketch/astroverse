/**
 * AstroVerse Mobile OS - Planetary Hora Progress and Category Helpers
 */

import { Colors } from '../theme/colors.ts';

export interface HoraCategoryColors {
  label: string;
  color: string;
  bg: string;
}

export function getHoraCategoryAndColors(rulingPlanet?: string): HoraCategoryColors {
  const planet = rulingPlanet || 'Sun';
  const isFavorable = ['Jupiter', 'Venus', 'Mercury'].includes(planet);
  const isModerate = ['Sun', 'Moon'].includes(planet);
  return {
    label: isFavorable ? 'Favorable' : (isModerate ? 'Authoritative / Moderate' : 'Caution'),
    color: isFavorable ? Colors.success : (isModerate ? Colors.warning : Colors.error),
    bg: isFavorable ? Colors.successMuted : (isModerate ? Colors.goldMuted : Colors.maroonMuted)
  };
}

export interface HoraProgressResult {
  isValid: boolean;
  progressPct: number;
  remainingSec: number;
  timeStr: string;
}

export function calculateHoraProgressMobile(
  now: number,
  startEpoch?: number | null,
  endEpoch?: number | null
): HoraProgressResult {
  if (
    typeof startEpoch !== 'number' ||
    typeof endEpoch !== 'number' ||
    !Number.isFinite(startEpoch) ||
    !Number.isFinite(endEpoch) ||
    endEpoch <= startEpoch
  ) {
    return {
      isValid: false,
      progressPct: 0,
      remainingSec: 0,
      timeStr: '--:-- unavailable'
    };
  }

  const totalDuration = endEpoch - startEpoch;
  const elapsed = now - startEpoch;
  const pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  const remainingSec = Math.max(0, Math.ceil((endEpoch - now) / 1000));
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} remaining`;

  return {
    isValid: true,
    progressPct: pct,
    remainingSec,
    timeStr
  };
}
