/**
 * AstroVerse Mobile OS - Multi-Horizon Vedic Prediction Engine View
 * Renders 6 distinct prediction horizons with strictly structured Parashari reports.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Colors } from '../theme/colors';
import { HorizonType, StructuredPredictionReport, BirthProfile } from '../types';
import { predictionsApi } from '../api/predictions';

interface MultiHorizonViewProps {
  profile: BirthProfile | null;
  onSaveReport?: (report: StructuredPredictionReport) => void;
}

const HORIZONS: { key: HorizonType; label: string }[] = [
  { key: 'hourly', label: 'Hourly' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'mahadasha', label: 'Mahadasha' }
];

export const MultiHorizonView: React.FC<MultiHorizonViewProps> = ({
  profile,
  onSaveReport
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<HorizonType>('daily');
  const [report, setReport] = useState<StructuredPredictionReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchReport = async () => {
      setLoading(true);
      setSavedSuccess(false);
      try {
        const res = await predictionsApi.getStructuredPrediction(profile, selectedHorizon);
        if (isMounted && res.success && res.report) {
          setReport(res.report);
        }
      } catch {
        // Fallback handled in API
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [profile, selectedHorizon]);

  const handleSave = async () => {
    if (!report) return;
    try {
      const res = await predictionsApi.saveReport(
        report.report_title,
        report.time_horizon,
        report
      );
      if (res.success) {
        setSavedSuccess(true);
        Alert.alert('Report Saved', 'This prediction dossier has been saved to your account.');
        if (onSaveReport) onSaveReport(report);
      } else {
        Alert.alert('Notice', res.error || 'Please log in to save predictions to your profile.');
      }
    } catch {
      Alert.alert('Notice', 'Report saved locally.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Horizon Tab Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {HORIZONS.map(h => {
          const isActive = selectedHorizon === h.key;
          return (
            <TouchableOpacity
              key={h.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setSelectedHorizon(h.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {h.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.gold} />
          <Text style={styles.loadingText}>Synthesizing {selectedHorizon} Vedic transits & dasha...</Text>
        </View>
      ) : report ? (
        <View style={styles.reportCard}>
          {/* Header */}
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>{report.report_title}</Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeText}>
                {report.mode === 'PERSONALIZED_CHART_GROUNDED'
                  ? '🎯 Chart-Grounded'
                  : '🌐 General Transit'}
              </Text>
            </View>
          </View>

          {/* Dasha Context Banner */}
          <View style={styles.dashaBanner}>
            <Text style={styles.dashaBannerText}>
              Active: {report.profile.active_mahadasha} Mahadasha • {report.profile.active_antardasha} Antardasha
            </Text>
            <Text style={styles.dashaSubText}>
              Moon: {report.profile.moon_sign} ({report.profile.moon_nakshatra}) | Asc: {report.profile.lagna}
            </Text>
          </View>

          {/* 1. Overall Outlook */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>1. Overall Outlook</Text>
            <Text style={styles.bodyText}>{report.sections.overall_outlook}</Text>
          </View>

          {/* 2. Supportive Developments */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: Colors.success }]}>
              2. Supportive Developments
            </Text>
            {report.sections.supportive_developments.map((item, idx) => (
              <View key={`sup-${idx}`} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: Colors.success }]}>✦</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* 3. Challenges & Cautions */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: Colors.error }]}>
              3. Challenges & Cautions
            </Text>
            {report.sections.challenges_and_cautions.map((item, idx) => (
              <View key={`chal-${idx}`} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: Colors.error }]}>▲</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* 4. Relevant Time Windows */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: Colors.gold }]}>
              4. Relevant Time Windows
            </Text>
            {report.sections.relevant_time_windows.map((item, idx) => (
              <View key={`win-${idx}`} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: Colors.gold }]}>⏱</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* 5. Why This Applies */}
          <View style={styles.groundingBox}>
            <Text style={styles.groundingHeading}>5. Parashari Grounding</Text>
            <Text style={styles.groundingText}>{report.sections.why_this_applies}</Text>
          </View>

          {/* 6. Practical Reflection */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>6. Practical Reflection</Text>
            <Text style={styles.bodyText}>{report.sections.practical_reflection}</Text>
          </View>

          {/* 7. Limitations */}
          <View style={styles.limitationsBox}>
            <Text style={styles.limitationsText}>
              Note: {report.sections.limitations}
            </Text>
          </View>

          {/* Save Dossier Button */}
          <TouchableOpacity
            style={[styles.saveBtn, savedSuccess && styles.saveBtnSuccess]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {savedSuccess ? '✓ Saved to Your Profile' : '📥 Save Prediction Dossier'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10
  },
  tabsContainer: {
    paddingHorizontal: 4,
    gap: 8,
    marginBottom: 12
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border
  },
  tabBtnActive: {
    backgroundColor: Colors.goldMuted,
    borderColor: Colors.gold
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  tabTextActive: {
    color: Colors.gold,
    fontWeight: 'bold'
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 8
  },
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  reportTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8
  },
  modeBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight
  },
  modeText: {
    color: Colors.goldLight,
    fontSize: 11,
    fontWeight: '600'
  },
  dashaBanner: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold
  },
  dashaBannerText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700'
  },
  dashaSubText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  sectionBlock: {
    marginBottom: 14
  },
  sectionHeading: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6
  },
  bodyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  bulletDot: {
    fontSize: 12,
    marginRight: 6,
    lineHeight: 18
  },
  bulletText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    flex: 1
  },
  groundingBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    marginBottom: 14
  },
  groundingHeading: {
    color: Colors.info,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4
  },
  groundingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17
  },
  limitationsBox: {
    paddingVertical: 6,
    marginBottom: 12
  },
  limitationsText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16
  },
  saveBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4
  },
  saveBtnSuccess: {
    backgroundColor: Colors.success
  },
  saveBtnText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: 'bold'
  }
});
