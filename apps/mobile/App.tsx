/**
 * AstroVerse Mobile OS - Main Application Entry Point
 * High-performance, clean Native Mobile Experience for iOS and Android.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Colors } from './src/theme/colors';
import { AuthProvider } from './src/context/AuthContext';
import { ChartProvider } from './src/context/ChartContext';
import { WalletProvider } from './src/context/WalletContext';

// Screens
import { TodayScreen } from './src/screens/TodayScreen';
import { ChartScreen } from './src/screens/ChartScreen';
import { PredictionsScreen } from './src/screens/PredictionsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

// Modals
import { ConsultationModal } from './src/components/ConsultationModal';
import { AuthModal } from './src/components/AuthModal';
import { BirthProfileModal } from './src/components/BirthProfileModal';
import { PaywallModal } from './src/components/PaywallModal';

type TabName = 'Today' | 'Chart' | 'Predictions' | 'Profile';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('Today');

  // Modals state
  const [consultationOpen, setConsultationOpen] = useState<boolean>(false);
  const [authOpen, setAuthOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [paywallOpen, setPaywallOpen] = useState<boolean>(false);

  const renderScreen = () => {
    switch (activeTab) {
      case 'Today':
        return (
          <TodayScreen
            onNavigateTab={setActiveTab}
            onOpenConsultation={() => setConsultationOpen(true)}
            onOpenProfileModal={() => setProfileModalOpen(true)}
            onOpenPaywall={() => setPaywallOpen(true)}
          />
        );
      case 'Chart':
        return (
          <ChartScreen
            onOpenProfileModal={() => setProfileModalOpen(true)}
          />
        );
      case 'Predictions':
        return (
          <PredictionsScreen
            onOpenPaywall={() => setPaywallOpen(true)}
            onOpenProfileModal={() => setProfileModalOpen(true)}
          />
        );
      case 'Profile':
        return (
          <ProfileScreen
            onOpenAuth={() => setAuthOpen(true)}
            onOpenProfileModal={() => setProfileModalOpen(true)}
            onOpenPaywall={() => setPaywallOpen(true)}
          />
        );
      default:
        return null;
    }
  };

  const tabs: { key: TabName; label: string; icon: string }[] = [
    { key: 'Today', label: 'Today', icon: '☀️' },
    { key: 'Chart', label: 'My Chart', icon: '🌌' },
    { key: 'Predictions', label: 'Forecasts', icon: '🔮' },
    { key: 'Profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Screen View */}
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{t.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Global Modals */}
      <ConsultationModal
        visible={consultationOpen}
        onClose={() => setConsultationOpen(false)}
      />
      <AuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
      />
      <BirthProfileModal
        visible={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlocked={() => {
          // Handled within modal
        }}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ChartProvider>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </ChartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background
  },
  screenContainer: {
    flex: 1
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 8,
    paddingBottom: 12
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: Colors.gold,
    marginTop: -2
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2
  },
  tabLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  tabLabelActive: {
    color: Colors.gold,
    fontWeight: 'bold'
  }
});
