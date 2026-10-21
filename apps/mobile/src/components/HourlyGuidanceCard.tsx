/**
 * AstroVerse Mobile OS - Personal Hourly Guidance Hero Card
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { HourlyHoraSlot } from '../types';

interface HourlyGuidanceCardProps {
  hora?: HourlyHoraSlot | null;
  onPressSchedule?: () => void;
}

export const HourlyGuidanceCard: React.FC<HourlyGuidanceCardProps> = ({
  hora,
  onPressSchedule
}) => {
  const [remainingMinutes, setRemainingMinutes] = useState<number>(45);
  const [progressPct, setProgressPct] = useState<number>(30);

  useEffect(() => {
    if (!hora) return;

    const updateTimer = () => {
      const now = Date.now();
      const totalDuration = hora.end_epoch_ms - hora.start_epoch_ms;
      const elapsed = now - hora.start_epoch_ms;
      const remaining = Math.max(0, Math.floor((hora.end_epoch_ms - now) / 60000));
      const pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

      setRemainingMinutes(remaining);
      setProgressPct(pct);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [hora]);

  if (!hora) {
    return (
      <View style={styles.card}>
        <Text style={styles.placeholderText}>Calculating active planetary hora...</Text>
      </View>
    );
  }

  const categoryColor =
    hora.category === 'Highly Favorable'
      ? Colors.success
      : hora.category === 'Caution'
      ? Colors.error
      : Colors.warning;

  const categoryBg =
    hora.category === 'Highly Favorable'
      ? Colors.successMuted
      : hora.category === 'Caution'
      ? Colors.maroonMuted
      : Colors.goldMuted;

  return (
    <View style={styles.card}>
      {/* Top Banner */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.pulseDot, { backgroundColor: categoryColor }]} />
          <Text style={styles.headerLabel}>ACTIVE HORA NOW</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: categoryBg, borderColor: categoryColor }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>{hora.category}</Text>
        </View>
      </View>

      {/* Main Hora Title & Times */}
      <View style={styles.mainInfo}>
        <Text style={styles.horaName}>{hora.sanskrit_name}</Text>
        <Text style={styles.timeRange}>
          {hora.start_time} – {hora.end_time}
        </Text>
      </View>

      {/* Progress Bar & Countdown */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: categoryColor }]} />
        </View>
        <View style={styles.timerRow}>
          <Text style={styles.timerText}>{remainingMinutes} mins remaining in this hora</Text>
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
  }
});
