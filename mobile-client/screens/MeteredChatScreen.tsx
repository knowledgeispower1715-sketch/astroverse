import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal } from 'react-native';
import io from 'socket.io-client';
import { NorthIndianChart } from '../components/NorthIndianChart';

export const MeteredChatScreen = ({ route, navigation }: any) => {
  const { astrologer, initialBalance } = route.params;

  const [balance, setBalance] = useState(initialBalance);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [messages, setMessages] = useState<{ id: string; sender: string; text: string }[]>([
    { id: '1', sender: 'astrologer', text: `Namaste! I am ${astrologer.name}. Please share your birth details and concern.` }
  ]);
  const [inputText, setInputText] = useState('');
  const [showKundliModal, setShowKundliModal] = useState(false);

  useEffect(() => {
    const consultationUrl = process.env.EXPO_PUBLIC_CONSULTATION_URL || 'http://localhost:4000';
    const socket = io(consultationUrl);
    const sessionId = `session_${Date.now()}`;

    socket.emit('start_consultation', {
      sessionId,
      userId: 'user_101',
      astrologerId: astrologer.id,
      ratePerMinute: astrologer.ratePerMinute
    });

    const localTimer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    socket.on('minute_deducted', (data: any) => {
      setBalance(data.balance);
    });

    socket.on('force_hangup', (data: any) => {
      clearInterval(localTimer);
      Alert.alert(
        'Call Ended',
        'Your wallet balance ran out. The consultation has ended.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    });

    return () => {
      clearInterval(localTimer);
      socket.emit('end_consultation', { sessionId });
      socket.disconnect();
    };
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: 'user', text: inputText }]);
    setInputText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View>
          <Text style={styles.hudAstroName}>{astrologer.name}</Text>
          <Text style={styles.hudRate}>₹{astrologer.ratePerMinute}/min</Text>
        </View>
        <View style={styles.hudRight}>
          <Text style={styles.hudTimer}>⏱ {formatTimer(secondsElapsed)}</Text>
          <Text style={[styles.hudBalance, balance < 30 ? styles.lowBalance : null]}>
            Bal: ₹{balance.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity style={styles.kundliBtn} onPress={() => setShowKundliModal(true)}>
          <Text style={styles.kundliBtnText}>Kundli</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.msgBox, item.sender === 'user' ? styles.userMsg : styles.astroMsg]}>
            <Text style={item.sender === 'user' ? styles.userText : styles.astroText}>{item.text}</Text>
          </View>
        )}
        style={styles.chatList}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask your question..."
          style={styles.textInput}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showKundliModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vedic Birth Chart (Lagna)</Text>
            <NorthIndianChart
              size={280}
              planetsByHouse={{ 1: ['Jup'], 5: ['Moo'], 9: ['Mar'], 12: ['Sun'] }}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowKundliModal(false)}>
              <Text style={styles.closeBtnText}>Close Chart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#075E54' },
  hudAstroName: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  hudRate: { color: '#D4E6F1', fontSize: 11 },
  hudRight: { alignItems: 'center' },
  hudTimer: { color: '#25D366', fontWeight: 'bold', fontSize: 14 },
  hudBalance: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  lowBalance: { color: '#FF6347' },
  kundliBtn: { backgroundColor: '#FFA500', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  kundliBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  chatList: { flex: 1, padding: 12 },
  msgBox: { maxWidth: '75%', padding: 10, borderRadius: 10, marginVertical: 4 },
  userMsg: { alignSelf: 'flex-end', backgroundColor: '#DCF8C6' },
  astroMsg: { alignSelf: 'flex-start', backgroundColor: '#FFF' },
  userText: { color: '#000', fontSize: 14 },
  astroText: { color: '#000', fontSize: 14 },
  inputBar: { flexDirection: 'row', padding: 8, backgroundColor: '#FFF', alignItems: 'center' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 20, paddingHorizontal: 14, height: 40, backgroundColor: '#FAFAFA' },
  sendBtn: { marginLeft: 8, backgroundColor: '#075E54', paddingHorizontal: 16, height: 40, justifyContent: 'center', borderRadius: 20 },
  sendBtnText: { color: '#FFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#8B0000' },
  closeBtn: { marginTop: 14, backgroundColor: '#8B0000', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  closeBtnText: { color: '#FFF', fontWeight: 'bold' }
});
