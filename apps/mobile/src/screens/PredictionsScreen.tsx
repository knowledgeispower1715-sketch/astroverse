/**
 * AstroVerse Mobile OS - Predictions Screen (Multi-Horizon Forecasts)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Colors } from '../theme/colors';
import { useChart } from '../context/ChartContext';
import { MultiHorizonView } from '../components/MultiHorizonView';

interface PredictionsScreenProps {
  onOpenPaywall: () => void;
  onOpenProfileModal: () => void;
}

export const PredictionsScreen: React.FC<PredictionsScreenProps> = ({
  onOpenPaywall,
  onOpenProfileModal
}) => {
  const { activeProfile, kundliData } = useChart();

  const dasha = kundliData?.dashas;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Vedic Predictions</Text>
          <TouchableOpacity onPress={onOpenProfileModal}>
            <Text style={styles.profileText}>
              Grounding: {activeProfile.name} ▾
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vimshottari Dasha Context Bar */}
        {dasha && (
          <View style={styles.dashaCard}>
            <View style={styles.dashaHeader}>
              <Text style={styles.dashaLabel}>ACTIVE VIMSHOTTARI CYCLE</Text>
              <Text style={styles.dashaProgress}>{dasha.progress_pct}% elapsed</Text>
            </View>
            <Text style={styles.dashaNames}>
              {dasha.maha_dasha} Mahadasha / {dasha.antar_dasha} Antardasha
            </Text>
            <Text style={styles.dashaDates}>
              Period: {dasha.start_date} to {dasha.end_date}
            </Text>
          </View>
        )}

        {/* Multi-Horizon Prediction Report View */}
        <MultiHorizonView profile={activeProfile} />

        {/* Premium Upgrade Teaser */}
        <TouchableOpacity style={styles.upgradeCard} onPress={onOpenPaywall} activeOpacity={0.85}>
          <View style={styles.upgradeLeft}>
            <Text style={styles.upgradeBadge}>DEEP DIVE</Text>
            <Text style={styles.upgradeTitle}>Unlock 45-Page Comprehensive Kundli Dossier</Text>
            <Text style={styles.upgradeSub}>Includes all planetary yogas, divisional strengths, and remedies.</Text>
          </View>
          <View style={styles.upgradePrice}>
            <Text style={styles.priceTag}>₹49</Text>
            <Text style={styles.priceSub}>One-time</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36
  },
  header: {
    marginBottom: 12
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold'
  },
  profileText: {
    color: Colors.gold,
    fontSize: 12,
    marginTop: 2
  },
  dashaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8
  },
  dashaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  dashaLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1
  },
  dashaProgress: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: 'bold'
  },
  dashaNames: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold'
  },
  dashaDates: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2
  },
  upgradeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.maroonMuted,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.maroonLight,
    alignItems: 'center',
    marginTop: 16
  },
  upgradeLeft: {
    flex: 1
  },
  upgradeBadge: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4
  },
  upgradeTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold'
  },
  upgradeSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15
  },
  upgradePrice: {
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gold
  },
  priceTag: {
    color: Colors.gold,
    fontSize: 18,
    fontWeight: 'bold'
  },
  priceSub: {
    color: Colors.textMuted,
    fontSize: 10
  }
});
