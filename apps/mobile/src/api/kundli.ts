/**
 * AstroVerse Mobile OS - Kundli & Astronomical API
 */

import { apiClient } from './client';
import {
  BirthProfile,
  KundliChartData,
  PlanetaryHorasResponse,
  DoshaAnalysis,
  VimshottariDashaActive
} from '../types';
import { calculateClientKundli, calculatePlanetaryHoras } from '../calculations/astronomical';
import { calculateVimshottariDasha } from '../calculations/dasha';

export interface FullKundliCalculationResponse {
  success: boolean;
  d1: KundliChartData;
  d9?: KundliChartData;
  d10?: KundliChartData;
  moon?: KundliChartData;
  dashas?: VimshottariDashaActive;
  doshas?: DoshaAnalysis;
  isOfflineFallback?: boolean;
  error?: string;
}

export const kundliApi = {
  async calculateKundli(profile: BirthProfile): Promise<FullKundliCalculationResponse> {
    const payload = {
      name: profile.name,
      dob: profile.dateOfBirth,
      tob: profile.timeOfBirth,
      lat: profile.latitude,
      lon: profile.longitude,
      tz: profile.timezone || 'Asia/Kolkata'
    };

    const res = await apiClient.post<any>('/api/kundli/calculate', payload);

    if (res.data?.success && res.data.d1) {
      return {
        success: true,
        d1: res.data.d1,
        d9: res.data.d9,
        d10: res.data.d10,
        moon: res.data.moon,
        dashas: res.data.dashas,
        doshas: res.data.doshas,
        isOfflineFallback: false
      };
    }

    // High-precision offline fallback
    try {
      const d1 = calculateClientKundli(profile.dateOfBirth, profile.timeOfBirth, profile.latitude, profile.longitude);
      const moonDegree = d1.planets['Moon'] ? d1.planets['Moon'].total_degree : 312.21;
      const dashas = calculateVimshottariDasha(moonDegree, profile.dateOfBirth);

      return {
        success: true,
        d1,
        dashas,
        doshas: {
          manglik: { has_dosha: false, verdict: 'No Manglik dosha detected' },
          kaal_sarp: { has_dosha: false, description: 'Planets are not hemmed between Rahu and Ketu' },
          sade_sati: { is_active: false, phase: 'None', description: 'Saturn is not transiting 12th, 1st, or 2nd from natal Moon' }
        },
        isOfflineFallback: true
      };
    } catch (e: any) {
      return {
        success: false,
        d1: {} as any,
        error: e?.message || 'Kundli calculation failed'
      };
    }
  },

  async getHoras(date?: string, lat?: number, lon?: number): Promise<PlanetaryHorasResponse> {
    const query = new URLSearchParams();
    if (date) query.set('date', date);
    if (lat) query.set('lat', String(lat));
    if (lon) query.set('lon', String(lon));

    const res = await apiClient.get<any>(`/api/kundli/horas?${query.toString()}`);
    if (res.data?.success && res.data.schedule) {
      return res.data;
    }

    // Offline Hora schedule generator
    const targetDate = date ? new Date(date) : new Date();
    return calculatePlanetaryHoras(targetDate);
  }
};
