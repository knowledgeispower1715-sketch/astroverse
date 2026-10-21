export type HorizonType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'mahadasha';

export interface UserSession {
  id: string;
  email?: string;
  phone?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  token: string;
  walletBalance: number;
}

export interface BirthProfile {
  id: string;
  userId?: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string; // HH:mm (24h)
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isDefault?: boolean;
}

export interface PlanetData {
  name: string;
  sign: string;
  degree: number;
  total_degree: number;
  house: number;
  nakshatra: string;
  pada: number;
  nakshatra_lord: string;
  is_retrograde?: boolean;
  karaka?: string;
}

export interface KundliChartData {
  lagna: {
    sign: string;
    degree: number;
    nakshatra?: string;
    pada?: number;
  };
  planets: Record<string, PlanetData>;
}

export interface DivisionalCharts {
  d1: KundliChartData;
  d9: KundliChartData;
  d10: KundliChartData;
  moon: KundliChartData;
  chalit: KundliChartData;
}

export interface VimshottariDashaActive {
  maha_dasha: string;
  antar_dasha: string;
  start_date: string;
  end_date: string;
  progress_pct: number;
}

export interface DoshaAnalysis {
  manglik: {
    has_dosha: boolean;
    verdict: string;
  };
  kaal_sarp: {
    has_dosha: boolean;
    description: string;
  };
  sade_sati: {
    is_active: boolean;
    phase: string;
    description: string;
  };
}

export interface HourlyHoraSlot {
  slot_number: number;
  start_time: string;
  end_time: string;
  start_epoch_ms: number;
  end_epoch_ms: number;
  ruling_planet: string;
  sanskrit_name: string;
  category: 'Highly Favorable' | 'Caution' | 'Moderate';
  is_daytime: boolean;
  is_active: boolean;
}

export interface PlanetaryHorasResponse {
  date: string;
  sunrise: string;
  sunset: string;
  active_hora: HourlyHoraSlot;
  schedule: HourlyHoraSlot[];
  special_periods: {
    rahu_kaal: { start: string; end: string };
    yamaganda: { start: string; end: string };
    gulika_kaal: { start: string; end: string };
    abhijit_muhurta?: { start: string; end: string };
  };
}

export interface PredictionSections {
  overall_outlook: string;
  supportive_developments: string[];
  challenges_and_cautions: string[];
  relevant_time_windows: string[];
  why_this_applies: string;
  practical_reflection: string;
  limitations: string;
}

export interface StructuredPredictionReport {
  report_title: string;
  time_horizon: HorizonType;
  target_date: string;
  profile_loaded: boolean;
  mode: 'PERSONALIZED_CHART_GROUNDED' | 'GENERAL_TRANSIT_UNPERSONALIZED';
  profile: {
    name?: string;
    lagna: string;
    moon_sign: string;
    moon_nakshatra: string;
    active_mahadasha: string;
    active_antardasha: string;
    sade_sati_phase: string;
  };
  sections: PredictionSections;
}

export interface SavedReportRecord {
  id: string;
  userId: string;
  title: string;
  reportType: string;
  createdAt: string;
  payload: StructuredPredictionReport;
}

export interface AstrologerPersona {
  id: string;
  name: string;
  title: string;
  specialty: string;
  ratePerMinute: number;
  avatarIcon: string;
  experienceYears: number;
  languages: string[];
  rating: number;
  sessionsCount: number;
  description: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
}
