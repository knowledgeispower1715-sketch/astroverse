/**
 * AstroVerse Mobile OS - Profile & Account Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useChart } from '../context/ChartContext';
import { useWallet } from '../context/WalletContext';

interface ProfileScreenProps {
  onOpenAuth: () => void;
  onOpenProfileModal: () => void;
  onOpenPaywall: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOpenAuth,
  onOpenProfileModal,
  onOpenPaywall
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { activeProfile } = useChart();
  const { balance, recharge, transactions } = useWallet();

  const [recharging, setRecharging] = useState<boolean>(false);

  const handleRecharge = async (amount: number) => {
    setRecharging(true);
    try {
      await recharge(amount);
      Alert.alert('Wallet Recharged', `₹${amount} added successfully to your wallet balance.`);
    } finally {
      setRecharging(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatarContainer}>
            <Text style={styles.userAvatarText}>
              {isAuthenticated ? '👤' : '✨'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {isAuthenticated ? user?.email || user?.phone || 'AstroVerse Member' : 'Guest Traveler'}
            </Text>
            <Text style={styles.userStatus}>
              {isAuthenticated ? `Role: ${user?.role}` : 'Explore features or log in to sync'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.authBtn}
            onPress={isAuthenticated ? handleLogout : onOpenAuth}
          >
            <Text style={styles.authBtnText}>{isAuthenticated ? 'Sign Out' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        {/* Active Birth Profile Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>ACTIVE BIRTH PROFILE</Text>
            <TouchableOpacity onPress={onOpenProfileModal}>
              <Text style={styles.editLink}>Edit Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Name:</Text>
            <Text style={styles.profileVal}>{activeProfile.name} ({activeProfile.gender})</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Date of Birth:</Text>
            <Text style={styles.profileVal}>{activeProfile.dateOfBirth}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Time of Birth:</Text>
            <Text style={styles.profileVal}>{activeProfile.timeOfBirth} IST</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Birth Place:</Text>
            <Text style={styles.profileVal}>{activeProfile.birthPlace}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Coordinates:</Text>
            <Text style={styles.profileVal}>{activeProfile.latitude}° N, {activeProfile.longitude}° E</Text>
          </View>
        </View>

        {/* Wallet Balance & Recharge Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ASTROVERSE WALLET</Text>
          <View style={styles.balanceDisplay}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceAmount}>₹{balance}</Text>
          </View>

          <Text style={styles.quickRechargeTitle}>Quick Recharge</Text>
          <View style={styles.rechargeGrid}>
            {[50, 100, 250, 500].map(amt => (
              <TouchableOpacity
                key={amt}
                style={styles.rechargeBtn}
                onPress={() => handleRecharge(amt)}
                disabled={recharging}
              >
                <Text style={styles.rechargeBtnText}>+₹{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RECENT ACTIVITY</Text>
          {transactions.slice(0, 4).map(tx => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txDesc}>{tx.description}</Text>
                <Text style={styles.txDate}>{new Date(tx.timestamp).toLocaleDateString()}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: tx.type === 'CREDIT' ? Colors.success : Colors.error }
                ]}
              >
                {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
              </Text>
            </View>
          ))}
        </View>

        {/* System & Ephemeris Diagnostics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CALCULATION & SYSTEM METRICS</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Ephemeris Engine:</Text>
            <Text style={styles.profileVal}>Swiss Ephemeris / Lahiri</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Ayanamsha Reference:</Text>
            <Text style={styles.profileVal}>Chitra Paksha (23°51')</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Build Architecture:</Text>
            <Text style={styles.profileVal}>Expo SDK 51 / React Native</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Version:</Text>
            <Text style={styles.profileVal}>v2.0.0-production</Text>
          </View>
        </View>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14
  },
  userAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  userAvatarText: {
    fontSize: 22
  },
  userInfo: {
    flex: 1
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold'
  },
  userStatus: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  authBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight
  },
  authBtnText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '600'
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  cardTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10
  },
  editLink: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '600'
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceElevated
  },
  profileLabel: {
    color: Colors.textSecondary,
    fontSize: 12
  },
  profileVal: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '500'
  },
  balanceDisplay: {
    alignItems: 'center',
    marginVertical: 10
  },
  balanceLabel: {
    color: Colors.textSecondary,
    fontSize: 12
  },
  balanceAmount: {
    color: Colors.gold,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4
  },
  quickRechargeTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8
  },
  rechargeGrid: {
    flexDirection: 'row',
    gap: 8
  },
  rechargeBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border
  },
  rechargeBtnText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: 'bold'
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceElevated
  },
  txLeft: {
    flex: 1
  },
  txDesc: {
    color: Colors.textPrimary,
    fontSize: 13
  },
  txDate: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  txAmount: {
    fontSize: 13,
    fontWeight: 'bold'
  }
});
