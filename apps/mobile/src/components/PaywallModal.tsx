/**
 * AstroVerse Mobile OS - Premium Report Paywall Modal (₹49)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Colors } from '../theme/colors';
import { useWallet } from '../context/WalletContext';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose, onUnlocked }) => {
  const { balance, unlockPaywall, recharge } = useWallet();
  const [loading, setLoading] = useState<boolean>(false);

  const UNLOCK_COST = 49;

  const handleUnlock = async () => {
    if (balance < UNLOCK_COST) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet has ₹${balance}. You need ₹${UNLOCK_COST} to unlock the full Vedic Dossier. Would you like to add ₹50?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add ₹50 & Unlock',
            onPress: async () => {
              setLoading(true);
              try {
                await recharge(50);
                const res = await unlockPaywall(UNLOCK_COST, 'Full 45-Page Vedic Dossier');
                if (res.success) {
                  Alert.alert('Unlocked!', 'Comprehensive Vedic Dossier is now accessible.');
                  onUnlocked();
                  onClose();
                }
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const res = await unlockPaywall(UNLOCK_COST, 'Full 45-Page Vedic Dossier');
      if (res.success) {
        Alert.alert('Report Unlocked', 'Full 45-Page Vedic Dossier has been added to your profile.');
        onUnlocked();
        onClose();
      } else {
        Alert.alert('Error', res.error || 'Failed to complete transaction.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.badge}>PREMIUM ASTROLOGICAL DOSSIER</Text>
          <Text style={styles.title}>Unlock Full 45-Page Parashari Kundli Analysis</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.originalPrice}>₹299</Text>
            <Text style={styles.currentPrice}>₹{UNLOCK_COST}</Text>
            <Text style={styles.discountTag}>83% OFF TODAY</Text>
          </View>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.featureText}>Complete 12-House Bhava & Planetary Dignity Matrix</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.featureText}>Shodashvarga Charts (D9 Navamsha, D10 Dashamsha)</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.featureText}>Vimshottari 120-Year Mahadasha & Antardasha Table</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.featureText}>Personalized Remedies, Gemstones & Mantra Shastra</Text>
            </View>
          </View>

          <View style={styles.walletStatus}>
            <Text style={styles.walletText}>Available Balance: ₹{balance}</Text>
          </View>

          <TouchableOpacity
            style={styles.unlockBtn}
            onPress={handleUnlock}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.unlockBtnText}>Unlock Instant Access for ₹{UNLOCK_COST}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.guaranteeText}>100% Classical Parashari Accuracy • Verified Calculations</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    padding: 22,
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4
  },
  closeText: {
    color: Colors.textMuted,
    fontSize: 18
  },
  badge: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    marginBottom: 6
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
    marginBottom: 14
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  originalPrice: {
    color: Colors.textMuted,
    fontSize: 14,
    textDecorationLine: 'line-through'
  },
  currentPrice: {
    color: Colors.gold,
    fontSize: 24,
    fontWeight: 'bold'
  },
  discountTag: {
    backgroundColor: Colors.maroonMuted,
    color: Colors.maroonLight,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  featureList: {
    gap: 10,
    marginBottom: 16
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkIcon: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1
  },
  walletStatus: {
    alignItems: 'center',
    marginBottom: 12
  },
  walletText: {
    color: Colors.textMuted,
    fontSize: 12
  },
  unlockBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  unlockBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: 'bold'
  },
  guaranteeText: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center'
  }
});
