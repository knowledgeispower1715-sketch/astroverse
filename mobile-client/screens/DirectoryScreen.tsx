import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Phone, MessageSquare, Star, ShieldCheck } from 'lucide-react-native';

interface Astrologer {
  id: string;
  name: string;
  skills: string;
  languages: string;
  ratePerMinute: number;
  rating: number;
  ordersCount: number;
  isOnline: boolean;
  avatar: string;
}

const MOCK_ASTROLOGERS: Astrologer[] = [
  {
    id: 'astro_1',
    name: 'Acharya Sharma',
    skills: 'Vedic, Prashna, Kundli',
    languages: 'Hindi, English',
    ratePerMinute: 25.0,
    rating: 4.95,
    ordersCount: 14200,
    isOnline: true,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
  },
  {
    id: 'astro_2',
    name: 'Pandit Rajesh Shastri',
    skills: 'Vedic, Vastu, Numerology',
    languages: 'Hindi, Sanskrit',
    ratePerMinute: 15.0,
    rating: 4.88,
    ordersCount: 8900,
    isOnline: true,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'
  }
];

export const DirectoryScreen = ({ navigation, userBalance = 60.0 }: any) => {
  const handleStartConsultation = (astrologer: Astrologer, type: 'chat' | 'call') => {
    const minRequired = astrologer.ratePerMinute * 2;
    if (userBalance < minRequired) {
      Alert.alert(
        'Low Balance',
        `Minimum ₹${minRequired.toFixed(2)} required for 2 minutes of consultation with ${astrologer.name}. Please recharge.`,
        [{ text: 'Recharge Now', onPress: () => {} }, { text: 'Cancel', style: 'cancel' }]
      );
      return;
    }

    navigation.navigate(type === 'chat' ? 'MeteredChat' : 'VideoCall', {
      astrologer,
      initialBalance: userBalance
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceText}>Wallet Balance: ₹{userBalance.toFixed(2)}</Text>
        <TouchableOpacity style={styles.rechargeBtn}>
          <Text style={styles.rechargeBtnText}>+ Recharge</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_ASTROLOGERS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
                <ShieldCheck size={16} color="#008000" />
              </View>
              <Text style={styles.skills}>{item.skills}</Text>
              <Text style={styles.lang}>{item.languages}</Text>
              <Text style={styles.rate}>₹{item.ratePerMinute}/min</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <Text style={styles.ratingText}>{item.rating} ({item.ordersCount} orders)</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.chatBtn]}
                onPress={() => handleStartConsultation(item, 'chat')}
              >
                <MessageSquare size={16} color="#fff" />
                <Text style={styles.btnText}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() => handleStartConsultation(item, 'call')}
              >
                <Phone size={16} color="#fff" />
                <Text style={styles.btnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
  balanceText: { fontSize: 16, fontWeight: '700', color: '#333' },
  rechargeBtn: { backgroundColor: '#28A745', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  rechargeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 12, elevation: 2 },
  avatar: { width: 70, height: 70, borderRadius: 35 },
  info: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  skills: { fontSize: 12, color: '#666', marginTop: 2 },
  lang: { fontSize: 12, color: '#888' },
  rate: { fontSize: 14, fontWeight: 'bold', color: '#D9534F', marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 11, color: '#555' },
  actions: { justifyContent: 'space-around', marginLeft: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, minWidth: 80, justifyContent: 'center' },
  chatBtn: { backgroundColor: '#FF8C00', marginBottom: 8 },
  callBtn: { backgroundColor: '#28A745' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 }
});
