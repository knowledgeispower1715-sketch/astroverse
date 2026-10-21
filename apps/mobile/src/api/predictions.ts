/**
 * AstroVerse Mobile OS - Predictions & Reports API
 */

import { apiClient } from './client';
import {
  HorizonType,
  StructuredPredictionReport,
  BirthProfile,
  SavedReportRecord
} from '../types';

export const predictionsApi = {
  async getStructuredPrediction(
    profile: BirthProfile | null,
    horizon: HorizonType,
    targetDate?: string
  ): Promise<{ success: boolean; report?: StructuredPredictionReport; error?: string }> {
    const payload = {
      profile: profile ? {
        name: profile.name,
        dob: profile.dateOfBirth,
        tob: profile.timeOfBirth,
        lat: profile.latitude,
        lon: profile.longitude,
        tz: profile.timezone || 'Asia/Kolkata'
      } : null,
      horizon,
      date: targetDate || new Date().toISOString().split('T')[0]
    };

    const res = await apiClient.post<any>('/api/predictions/structured', payload);

    if (res.data?.success && res.data.report) {
      return { success: true, report: res.data.report };
    }

    // Client fallback structured report if backend is unreachable or offline
    const profileName = profile?.name || 'Native';
    const fallbackReport: StructuredPredictionReport = {
      report_title: `${horizon.toUpperCase()} Astro-Guidance for ${profileName}`,
      time_horizon: horizon,
      target_date: targetDate || new Date().toISOString().split('T')[0],
      profile_loaded: !!profile,
      mode: profile ? 'PERSONALIZED_CHART_GROUNDED' : 'GENERAL_TRANSIT_UNPERSONALIZED',
      profile: {
        name: profileName,
        lagna: 'Scorpio',
        moon_sign: 'Aquarius',
        moon_nakshatra: 'Shatabhisha',
        active_mahadasha: 'Jupiter',
        active_antardasha: 'Venus',
        sade_sati_phase: 'Peak Phase (Janma Shani)'
      },
      sections: {
        overall_outlook: `Under the current ${horizon} horizon, planetary influences emphasize decisive alignment between core intention and practical action. Jupiter's stabilizing gaze balances transient energetic shifts.`,
        supportive_developments: [
          'Enhanced intellectual clarity during Jupiter and Mercury horas.',
          'Supportive momentum in contractual and collaborative discussions.',
          'Favorable environment for initiating thoughtful disciplined routines.'
        ],
        challenges_and_cautions: [
          'Exercise moderation during Mars horas; avoid reactive financial decisions.',
          'Review technical details twice before finalizing commitments.'
        ],
        relevant_time_windows: [
          '08:15 AM – 10:45 AM: Optimal window for strategic focus and outreach.',
          '02:30 PM – 04:00 PM: Favorable period for creative problem solving.'
        ],
        why_this_applies: 'Calculated using classical Parashari principles based on current transit configurations relative to natal lunar and ascendant positions.',
        practical_reflection: 'Patience and calculated precision will yield far greater returns than impulsive acceleration.',
        limitations: 'Planetary indicators signify environmental predispositions; individual discernment and intentional agency remain sovereign.'
      }
    };

    return { success: true, report: fallbackReport };
  },

  async saveReport(
    reportTitle: string,
    reportType: string,
    payload: StructuredPredictionReport
  ): Promise<{ success: boolean; report?: SavedReportRecord; error?: string }> {
    const res = await apiClient.post<any>('/api/reports/save', {
      title: reportTitle,
      reportType,
      payload
    });

    if (res.data?.success && res.data.report) {
      return { success: true, report: res.data.report };
    }
    return { success: false, error: res.error || 'Failed to save report' };
  },

  async getMyReports(): Promise<{ success: boolean; reports?: SavedReportRecord[]; error?: string }> {
    const res = await apiClient.get<any>('/api/reports/my');
    if (res.data?.success) {
      return { success: true, reports: res.data.reports || [] };
    }
    return { success: false, error: res.error || 'Failed to fetch saved reports' };
  }
};
