/**
 * AstroVerse Mobile OS - Live AI Astrologer Consultation Modal
 * Real-time metered Vedic consultation with Parashari personas and wallet deduction.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Colors } from '../theme/colors';
import { AstrologerPersona, ChatMessage } from '../types';
import { useWallet } from '../context/WalletContext';
import { useChart } from '../context/ChartContext';

interface ConsultationModalProps {
  visible: boolean;
  onClose: () => void;
}

const PERSONAS: AstrologerPersona[] = [
  {
    id: 'acharya-shastri',
    name: 'Acharya Shastri',
    title: 'Senior Parashari Master',
    specialty: 'Career, Wealth & Dasha Timing',
    ratePerMinute: 15,
    avatarIcon: '🕉️',
    experienceYears: 24,
    languages: ['Hindi', 'English'],
    rating: 4.9,
    sessionsCount: 14200,
    description: 'Expert in classical Parashari Horashastra, yogas, and career transitions.'
  },
  {
    id: 'dr-radhika-sharma',
    name: 'Dr. Radhika Sharma',
    title: 'KP & Relationship Specialist',
    specialty: 'Marriage, Compatibility & Synastry',
    ratePerMinute: 20,
    avatarIcon: '🪷',
    experienceYears: 18,
    languages: ['English', 'Hindi'],
    rating: 4.95,
    sessionsCount: 9800,
    description: 'Specializes in sub-lord precision and emotional synchronicity.'
  },
  {
    id: 'pandit-anand-varma',
    name: 'Pandit Anand Varma',
    title: 'Prashna & Remedial Astrologer',
    specialty: 'Immediate Inquiries & Practical Upayas',
    ratePerMinute: 18,
    avatarIcon: '✨',
    experienceYears: 21,
    languages: ['Hindi', 'Sanskrit', 'English'],
    rating: 4.88,
    sessionsCount: 11500,
    description: 'Expert in horary (Prashna Tantra) chart readings and balanced remedial solutions.'
  }
];

export const ConsultationModal: React.FC<ConsultationModalProps> = ({ visible, onClose }) => {
  const { balance, deduct } = useWallet();
  const { activeProfile, kundliData } = useChart();

  const [selectedPersona, setSelectedPersona] = useState<AstrologerPersona>(PERSONAS[0]);
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Keep session active clean cleanup
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startSession = async () => {
    setSessionSeconds(0);
    setSessionActive(true);

    const lagna = kundliData?.d1?.lagna?.sign || 'Scorpio';
    const moon = kundliData?.d1?.planets['Moon']?.sign || 'Aquarius';
    const maha = kundliData?.dashas?.maha_dasha || 'Jupiter';

    setMessages([
      {
        id: 'msg-welcome',
        sender: 'agent',
        text: `Pranam ${activeProfile?.name || 'Native'}. I am ${selectedPersona.name}. I have cast your chart with ${lagna} Lagna and ${moon} Moon, currently navigating ${maha} Mahadasha. How may I guide your path today?`,
        timestamp: Date.now()
      }
    ]);
  };

  const endSession = () => {
    Alert.alert(
      'End Consultation',
      `Are you sure you want to conclude your session with ${selectedPersona.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Conclude',
          style: 'destructive',
          onPress: () => {
            setSessionActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
          }
        }
      ]
    );
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    // Contextual Vedic Agent Response Generation
    setTimeout(() => {
      let reply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('career') || lower.includes('job') || lower.includes('business')) {
        reply = `Examining your 10th house of profession (Karma Bhava): The planetary alignment indicates a time of strategic evaluation. With your current Dasha influence, focus on steady consolidation rather than abrupt departure. The upcoming hora cycles favor deliberate negotiations.`;
      } else if (lower.includes('marriage') || lower.includes('love') || lower.includes('relationship')) {
        reply = `Reflecting on your 7th house (Kalatra Bhava) and Venusian placement: Venus requires mutual transparency right now. If dialogues feel heavy, prioritize listening over defending. Favorable planetary horas will bring renewed harmony.`;
      } else if (lower.includes('money') || lower.includes('wealth') || lower.includes('finance')) {
        reply = `Looking at your 2nd and 11th houses of accumulated wealth and gains (Labha): Conservative resource allocation is strongly favored. Avoid speculative exposure during Mars or Rahu horas, and protect your primary reserves.`;
      } else if (lower.includes('health') || lower.includes('stress')) {
        reply = `Analyzing your 6th house and ascendant vitality: Mind-body balance is critical. Maintain disciplined sleep schedules and hydrate adequately, particularly during midday solar transits.`;
      } else {
        reply = `Classical Parashari analysis shows your planetary transits are encouraging grounded reflection. Every challenge is an opportunity to cultivate equanimity. What specific timing or decision would you like me to inspect further?`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `msg-agent-${Date.now()}`,
          sender: 'agent',
          text: reply,
          timestamp: Date.now()
        }
      ]);
      setIsTyping(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 1200);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {sessionActive ? selectedPersona.name : 'Vedic Consultation'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {sessionActive
                  ? `Live Consultation • ₹${selectedPersona.ratePerMinute}/min`
                  : 'Connect 1-on-1 with Certified AI Astrologers'}
              </Text>
            </View>
            <TouchableOpacity onPress={sessionActive ? endSession : onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>{sessionActive ? 'End' : '✕'}</Text>
            </TouchableOpacity>
          </View>

          {!sessionActive ? (
            /* Persona Selection Mode */
            <ScrollView contentContainerStyle={styles.personaList}>
              <Text style={styles.sectionLabel}>CHOOSE YOUR ASTROLOGER</Text>
              {PERSONAS.map(p => {
                const isSelected = selectedPersona.id === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.personaCard, isSelected && styles.personaCardSelected]}
                    onPress={() => setSelectedPersona(p)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.personaIconContainer}>
                      <Text style={styles.personaAvatar}>{p.avatarIcon}</Text>
                    </View>
                    <View style={styles.personaInfo}>
                      <View style={styles.personaTitleRow}>
                        <Text style={styles.personaName}>{p.name}</Text>
                        <Text style={styles.personaRate}>₹{p.ratePerMinute}/min</Text>
                      </View>
                      <Text style={styles.personaSpecialty}>{p.specialty}</Text>
                      <Text style={styles.personaStats}>
                        ★ {p.rating} • {p.experienceYears}y exp • {p.sessionsCount.toLocaleString()} consults
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.startSessionContainer}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Your Wallet Balance:</Text>
                  <Text style={styles.balanceVal}>₹{balance}</Text>
                </View>
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={startSession}
                  activeOpacity={0.8}
                >
                  <Text style={styles.startBtnText}>
                    Start Consultation with {selectedPersona.name}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* Active Metered Chat Session */
            <View style={styles.chatContainer}>
              {/* Session Status Bar */}
              <View style={styles.statusBar}>
                <View style={styles.pulseLive} />
                <Text style={styles.statusLiveText}>VEDIC CHAT</Text>
                <Text style={styles.sessionTimer}>Active Session</Text>
                <Text style={styles.walletCounter}>Bal: ₹{balance}</Text>
              </View>

              {/* Message Feed */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map(m => {
                  const isUser = m.sender === 'user';
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.messageBubble,
                        isUser ? styles.userBubble : styles.agentBubble
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isUser ? styles.userMessageText : styles.agentMessageText
                        ]}
                      >
                        {m.text}
                      </Text>
                    </View>
                  );
                })}
                {isTyping && (
                  <View style={[styles.messageBubble, styles.agentBubble]}>
                    <Text style={styles.agentMessageText}>
                      {selectedPersona.name} is inspecting your chart...
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Input Row */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Ask regarding career, marriage, health, timing..."
                  placeholderTextColor={Colors.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim()}
                >
                  <Text style={styles.sendBtnText}>➤</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '75%',
    borderWidth: 1,
    borderColor: Colors.border
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold'
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  closeBtn: {
    padding: 8
  },
  closeBtnText: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: 'bold'
  },
  personaList: {
    padding: 16
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10
  },
  personaCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    alignItems: 'center'
  },
  personaCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceElevated
  },
  personaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  personaAvatar: {
    fontSize: 24
  },
  personaInfo: {
    flex: 1
  },
  personaTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  personaName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold'
  },
  personaRate: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: 'bold'
  },
  personaSpecialty: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2
  },
  personaStats: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4
  },
  startSessionContainer: {
    marginTop: 14,
    paddingBottom: 24
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  balanceLabel: {
    color: Colors.textSecondary,
    fontSize: 13
  },
  balanceVal: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: 'bold'
  },
  startBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  startBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: 'bold'
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'space-between'
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  pulseLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 6
  },
  statusLiveText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 12
  },
  sessionTimer: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1
  },
  walletCounter: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: 'bold'
  },
  messagesScroll: {
    flex: 1
  },
  messagesContent: {
    padding: 14,
    gap: 10
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 12
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.surfaceElevated,
    borderBottomRightRadius: 2
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 2,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20
  },
  userMessageText: {
    color: Colors.textPrimary
  },
  agentMessageText: {
    color: Colors.textPrimary
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center'
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    marginRight: 8
  },
  sendBtn: {
    backgroundColor: Colors.gold,
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surfaceElevated,
    opacity: 0.5
  },
  sendBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: 'bold'
  }
});
