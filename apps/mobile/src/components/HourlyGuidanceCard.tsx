/**
 * AstroVerse Mobile OS - Personal Hourly Guidance Hero Card
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Colors } from '../theme/colors';
import { HourlyHoraSlot } from '../types';
import {
  getHoraCategoryAndColors,
  calculateHoraProgressMobile,
  HoraCategoryColors,
  HoraProgressResult
} from '../utils/horaCalculation';

export {
  getHoraCategoryAndColors,
  calculateHoraProgressMobile
};
export type {
  HoraCategoryColors,
  HoraProgressResult
};

export interface HourlyGuidanceCardProps {
  hora?: HourlyHoraSlot | null;
  onPressSchedule?: () => void;
  onRefreshNextHora?: () => void;
}

export const HourlyGuidanceCard: React.FC<HourlyGuidanceCardProps> = ({
  hora,
  onPressSchedule,
  onRefreshNextHora
}) => {
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('--:-- remaining');
  const [progressPct, setProgressPct] = useState<number>(0);
  const hasTriggeredExpiryRef = useRef<boolean>(false);

  useEffect(() => {
    hasTriggeredExpiryRef.current = false;
    if (!hora || typeof hora.start_epoch_ms !== 'number' || typeof hora.end_epoch_ms !== 'number' || hora.end_epoch_ms <= hora.start_epoch_ms) {
      setTimeRemainingStr('--:-- unavailable');
      setProgressPct(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const res = calculateHoraProgressMobile(now, hora.start_epoch_ms, hora.end_epoch_ms);
      setProgressPct(res.progressPct);
      setTimeRemainingStr(res.timeStr);

      if (res.remainingSec <= 0 && !hasTriggeredExpiryRef.current) {
        hasTriggeredExpiryRef.current = true;
        if (onRefreshNextHora) {
          onRefreshNextHora();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // 1s tick for real-time MM:SS

    // Background/resume listener: recalculates immediately when app foregrounds
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateTimer();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [hora, onRefreshNextHora]);

  if (!hora) {
    return (
      <View style={styles.card}>
        <Text style={styles.placeholderText}>Planetary hora data unavailable.</Text>
        {onRefreshNextHora && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRefreshNextHora} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry Calculation</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const { label: categoryLabel, color: categoryColor, bg: categoryBg } = getHoraCategoryAndColors(hora.ruling_planet);

  return (
    <View style={styles.card}>
      {/* Top Banner */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.pulseDot, { backgroundColor: categoryColor }]} />
          <Text style={styles.headerLabel}>ACTIVE HORA NOW</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: categoryBg, borderColor: categoryColor }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>{categoryLabel}</Text>
        </View>
      </View>

      {/* Main Hora Title & Times */}
      <View style={styles.mainInfo}>
        <Text style={styles.horaName}>{hora.sanskrit_name || hora.ruling_planet} Hora</Text>
        <Text style={styles.timeRange}>
          {hora.start_time} – {hora.end_time}
        </Text>
      </View>

      {/* Progress Bar & Countdown */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.round(progressPct)}%` as `${number}%`, backgroundColor: categoryColor }]} />
        </View>
        <View style={styles.timerRow}>
          <Text style={styles.timerText}>{timeRemainingStr}</Text>
          <Text style={styles.dayNightTag}>{hora.is_daytime ? '☀️ Daytime' : '🌙 Night'}</Text>
        </View>
      </View>

      {/* Vedic Insight Reflection */}
      <View style={styles.insightBox}>
        <Text style={styles.insightText}>
          {hora.ruling_planet === 'Jupiter' && 'Favorable for advisory meetings, investments, learning, and spiritual reflection.'}
          {hora.ruling_planet === 'Venus' && 'Harmonious window for artistic expression, relationship dialogues, and acquisitions.'}
          {hora.ruling_planet === 'Mercury' && 'Auspicious for communications, commercial transactions, writing, and analytical tasks.'}
          {hora.ruling_planet === 'Sun' && 'Favorable for executive decisions and administrative clarity; avoid ego-driven friction.'}
          {hora.ruling_planet === 'Moon' && 'Conducive for emotional well-being, travel plans, and collaborative creative brainstorms.'}
          {hora.ruling_planet === 'Mars' && 'Exercise measured patience; channel high physical vigor into focused solo tasks.'}
          {hora.ruling_planet === 'Saturn' && 'Ideal for deep perseverance, routine maintenance, and long-term organizational planning.'}
        </Text>
      </View>

      {/* Action Footer */}
      {onPressSchedule && (
        <TouchableOpacity style={styles.scheduleBtn} onPress={onPressSchedule} activeOpacity={0.8}>
          <Text style={styles.scheduleBtnText}>View Full 24-Hour Hora Schedule →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  placeholderText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  headerLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  categoryText: {
    fontSize: 11,
    fontWeight: 'bold'
  },
  mainInfo: {
    marginBottom: 12
  },
  horaName: {
    color: Colors.gold,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  timeRange: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 2
  },
  progressContainer: {
    marginBottom: 12
  },
  progressBarBg: {
    height: 5,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  timerText: {
    color: Colors.textMuted,
    fontSize: 12
  },
  dayNightTag: {
    color: Colors.textMuted,
    fontSize: 12
  },
  insightBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold
  },
  insightText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18
  },
  scheduleBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 6
  },
  scheduleBtnText: {
    color: Colors.goldLight,
    fontSize: 13,
    fontWeight: '600'
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.gold
  },
  retryBtnText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600'
  }
});
