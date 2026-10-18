import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Mic, MicOff, PhoneOff, SwitchCamera } from 'lucide-react-native';

export const VideoCallScreen = ({ route, navigation }: any) => {
  const { astrologer, initialBalance } = route.params;

  const [balance, setBalance] = useState(initialBalance);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEndCall = () => {
    Alert.alert('End Call', 'Are you sure you want to hang up?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Hang Up', style: 'destructive', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.remoteVideo}>
        <Text style={styles.remoteVideoPlaceholder}>[Remote Astrologer Video Stream]</Text>
      </View>

      <View style={styles.localVideoPip}>
        <Text style={styles.pipText}>You</Text>
      </View>

      <View style={styles.floatingHud}>
        <View>
          <Text style={styles.astroName}>{astrologer.name}</Text>
          <Text style={styles.callTimer}>
            {Math.floor(durationSeconds / 60)}:{('0' + (durationSeconds % 60)).slice(-2)}
          </Text>
        </View>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>₹{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.controlBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setIsMuted(!isMuted)}>
          {isMuted ? <MicOff size={24} color="#FF6347" /> : <Mic size={24} color="#FFF" />}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.iconBtn, styles.endCallBtn]} onPress={handleEndCall}>
          <PhoneOff size={28} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn}>
          <SwitchCamera size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  remoteVideo: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1C1C1E' },
  remoteVideoPlaceholder: { color: '#888', fontSize: 16 },
  localVideoPip: { position: 'absolute', top: 90, right: 16, width: 90, height: 130, backgroundColor: '#333', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  pipText: { color: '#AAA', fontSize: 12 },
  floatingHud: { position: 'absolute', top: 40, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 25 },
  astroName: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  callTimer: { color: '#25D366', fontSize: 12, fontWeight: '700' },
  balanceBadge: { backgroundColor: '#FFA500', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  balanceText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  controlBar: { position: 'absolute', bottom: 30, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  iconBtn: { backgroundColor: 'rgba(255,255,255,0.2)', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  endCallBtn: { backgroundColor: '#D9534F' }
});
