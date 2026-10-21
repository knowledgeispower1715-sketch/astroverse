/**
 * AstroVerse Mobile OS - Today Screen (Home / Daily Overview)
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
import { useWallet } from '../context/WalletContext';
import { HourlyGuidanceCard } from '../components/HourlyGuidanceCard';

interface TodayScreenProps {
  onNavigateTab: (tab: 'Today' | 'Chart' | 'Predictions' | 'Profile') => void;
  onOpenConsultation: () => void;
  onOpenProfileModal: () => void;
  onOpenPaywall: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  onNavigateTab,
  onOpenConsultation,
  onOpenProfileModal,
  onOpenPaywall
}) => {
  const { activeProfile, horasData, kundliData, refreshHoras } = useChart();
  const { balance } = useWallet();

  const activeHora = horasData?.active_hora;
  const rahuKaal = horasData?.special_periods?.rahu_kaal || { start: '04:30 PM', end: '06:00 PM' };
  const abhijit = horasData?.special_periods?.abhijit_muhurta || { start: '11:45 AM', end: '12:35 PM' };

  const moonSign = kundliData?.d1?.planets['Moon']?.sign || 'Aquarius';
  const moonNak = kundliData?.d1?.planets['Moon']?.nakshatra || 'Shatabhisha';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.brandTitle}>AstroVerse</Text>
            <TouchableOpacity onPress={onOpenProfileModal} style={styles.profileChip}>
              <Text style={styles.profileName}>👤 {activeProfile?.name || 'Native'}</Text>
              <Text style={styles.profileEditHint}>▾</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.walletBadge}
              onPress={() => onNavigateTab('Profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.walletIcon}>🪙</Text>
              <Text style={styles.walletAmount}>₹{balance}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero: Hourly Guidance Card */}
        <HourlyGuidanceCard
          hora={activeHora}
          onPressSchedule={() => onNavigateTab('Predictions')}
          onRefreshNextHora={refreshHoras}
        />

        {/* Quick Access Action Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab('Chart')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🌌</Text>
            <Text style={styles.actionTitle}>Vedic Kundli</Text>
            <Text style={styles.actionSub}>D1, D9 & Grahas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab('Predictions')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🔮</Text>
            <Text style={styles.actionTitle}>Predictions</Text>
            <Text style={styles.actionSub}>Hourly to Yearly</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={onOpenConsultation}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionTitle}>Live Astrologer</Text>
            <Text style={styles.actionSub}>₹15/min • Instant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={onOpenPaywall}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📜</Text>
            <Text style={styles.actionTitle}>45p Dossier</Text>
            <Text style={styles.actionSub}>₹49 Special</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Astronomical Highlights & Panchang */}
        <View style={styles.panchangCard}>
          <Text style={styles.sectionHeader}>TODAY'S PANCHANG & TRANSITS</Text>

          <View style={styles.panchangRow}>
            <View style={styles.panchangItem}>
              <Text style={styles.panchangLabel}>Lunar Sign (Chandra)</Text>
              <Text style={styles.panchangValue}>{moonSign}</Text>
            </View>
            <View style={styles.panchangItem}>
              <Text style={styles.panchangLabel}>Nakshatra</Text>
              <Text style={styles.panchangValue}>{moonNak}</Text>
            </View>
          </View>

          <View style={styles.panchangRow}>
            <View style={styles.panchangItem}>
              <Text style={styles.panchangLabel}>Rahu Kaal (Inauspicious)</Text>
              <Text style={[styles.panchangValue, { color: Colors.error }]}>
                {rahuKaal.start} – {rahuKaal.end}
              </Text>
            </View>
            <View style={styles.panchangItem}>
              <Text style={styles.panchangLabel}>Abhijit Muhurta</Text>
              <Text style={[styles.panchangValue, { color: Colors.success }]}>
                {abhijit.start} – {abhijit.end}
              </Text>
            </View>
          </View>
        </View>

        {/* Featured Live Consultation Callout */}
        <TouchableOpacity
          style={styles.consultBanner}
          onPress={onOpenConsultation}
          activeOpacity={0.85}
        >
          <View style={styles.consultBannerLeft}>
            <Text style={styles.consultBannerBadge}>ONLINE NOW</Text>
            <Text style={styles.consultBannerTitle}>Talk to Verified Astrologers</Text>
            <Text style={styles.consultBannerSub}>
              Direct Vedic insights for your career, relationship & finances.
            </Text>
          </View>
          <View style={styles.consultBannerRight}>
            <Text style={styles.consultBtnCircle}>📞</Text>
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
    paddingBottom: 32
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  brandTitle: {
    color: Colors.gold,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  profileName: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  profileEditHint: {
    color: Colors.gold,
    marginLeft: 4,
    fontSize: 12
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold
  },
  walletIcon: {
    fontSize: 14,
    marginRight: 4
  },
  walletAmount: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: 'bold'
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 6
  },
  actionTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold'
  },
  actionSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  panchangCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginVertical: 10
  },
  sectionHeader: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10
  },
  panchangRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  panchangItem: {
    flex: 1
  },
  panchangLabel: {
    color: Colors.textMuted,
    fontSize: 11
  },
  panchangValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  consultBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.maroonMuted,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.maroonLight,
    alignItems: 'center',
    marginTop: 8
  },
  consultBannerLeft: {
    flex: 1
  },
  consultBannerBadge: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4
  },
  consultBannerTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold'
  },
  consultBannerSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  consultBannerRight: {
    marginLeft: 12
  },
  consultBtnCircle: {
    fontSize: 24,
    backgroundColor: Colors.gold,
    borderRadius: 22,
    width: 44,
    height: 44,
    textAlign: 'center',
    lineHeight: 44
  }
});
