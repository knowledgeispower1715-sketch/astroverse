/**
 * AstroVerse Mobile OS - Chart & Ephemeris Context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  BirthProfile,
  PlanetaryHorasResponse
} from '../types';
import { kundliApi, FullKundliCalculationResponse } from '../api/kundli';
import { Storage } from '../utils/storage';

interface ChartContextType {
  activeProfile: BirthProfile;
  kundliData: FullKundliCalculationResponse | null;
  horasData: PlanetaryHorasResponse | null;
  isLoading: boolean;
  setActiveProfile: (profile: BirthProfile) => Promise<void>;
  refreshHoras: () => Promise<void>;
  reloadChart: () => Promise<void>;
}

export const CANONICAL_DEMO_PROFILE: BirthProfile = {
  id: 'canonical-default-profile',
  name: 'AstroVerse Native',
  gender: 'Male',
  dateOfBirth: '2005-08-20',
  timeOfBirth: '14:05',
  birthPlace: 'Jabalpur, Madhya Pradesh, India',
  latitude: 23.1815,
  longitude: 79.9864,
  timezone: 'Asia/Kolkata',
  isDefault: true
};

const PROFILE_STORAGE_KEY = 'astroverse_active_birth_profile';

const ChartContext = createContext<ChartContextType>({
  activeProfile: CANONICAL_DEMO_PROFILE,
  kundliData: null,
  horasData: null,
  isLoading: true,
  setActiveProfile: async () => {},
  refreshHoras: async () => {},
  reloadChart: async () => {}
});

export const ChartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeProfile, setActiveProfileState] = useState<BirthProfile>(CANONICAL_DEMO_PROFILE);
  const [kundliData, setKundliData] = useState<FullKundliCalculationResponse | null>(null);
  const [horasData, setHorasData] = useState<PlanetaryHorasResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadChartForProfile = async (profile: BirthProfile) => {
    setIsLoading(true);
    try {
      const [kRes, hRes] = await Promise.all([
        kundliApi.calculateKundli(profile),
        kundliApi.getHoras(new Date().toISOString().split('T')[0], profile.latitude, profile.longitude)
      ]);
      setKundliData(kRes);
      setHorasData(hRes);
    } catch {
      // Handled inside API client
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const saved = await Storage.getItem(PROFILE_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setActiveProfileState(parsed);
          await loadChartForProfile(parsed);
          return;
        }
      } catch {
        // Fallback to demo profile
      }
      await loadChartForProfile(CANONICAL_DEMO_PROFILE);
    };
    init();
  }, []);

  const setActiveProfile = async (profile: BirthProfile) => {
    setActiveProfileState(profile);
    await Storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    await loadChartForProfile(profile);
  };

  const refreshHoras = async () => {
    const hRes = await kundliApi.getHoras(
      new Date().toISOString().split('T')[0],
      activeProfile.latitude,
      activeProfile.longitude
    );
    setHorasData(hRes);
  };

  const reloadChart = async () => {
    await loadChartForProfile(activeProfile);
  };

  return (
    <ChartContext.Provider
      value={{
        activeProfile,
        kundliData,
        horasData,
        isLoading,
        setActiveProfile,
        refreshHoras,
        reloadChart
      }}
    >
      {children}
    </ChartContext.Provider>
  );
};

export const useChart = () => useContext(ChartContext);
