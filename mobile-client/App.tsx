import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { NorthIndianChart } from './components/NorthIndianChart';

export default function App() {
  const [activeTab, setActiveTab] = useState<'kundli' | 'muhurta' | 'milan' | 'ai'>('kundli');
  const [chartType, setChartType] = useState<'D1' | 'D9'>('D1');

  const [userQuery, setUserQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'career' | 'marriage' | 'wealth' | 'health'>('career');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);

  const d1Planets = { 1: ['Jup'], 4: ['Ket', 'Sat'], 5: ['Moo'], 9: ['Mar'], 10: ['Rah'], 11: ['Ven'], 12: ['Sun', 'Mer'] };
  const d9Planets = { 1: ['Sun'], 2: ['Jup'], 7: ['Ven'], 9: ['Moo'], 10: ['Mar'] };

  const handleAskAI = async (category = selectedCategory, query = userQuery) => {
    const finalQuery = query || `Give me an in-depth reading on my ${category}`;
    setIsLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch('http://localhost:8000/api/ai-astrologer/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          question: finalQuery,
          dob: '1996-11-24T14:30:00',
          lat: 28.6139,
          lon: 77.2090
        })
      });
      const data = await res.json();
      setAiResponse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ASTROTALK PRO</Text>
        <Text style={styles.headerSubtitle}>Parashari Vedic Astrology Suite</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'kundli' && styles.activeTabItem]}
          onPress={() => setActiveTab('kundli')}
        >
          <Text style={[styles.tabText, activeTab === 'kundli' && styles.activeTabText]}>Kundli & D9</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'muhurta' && styles.activeTabItem]}
          onPress={() => setActiveTab('muhurta')}
        >
          <Text style={[styles.tabText, activeTab === 'muhurta' && styles.activeTabText]}>Horas & Muhurta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'milan' && styles.activeTabItem]}
          onPress={() => setActiveTab('milan')}
        >
          <Text style={[styles.tabText, activeTab === 'milan' && styles.activeTabText]}>36-Guna Milan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ai' && styles.activeTabItem]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>Ask AI Astrologer</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'kundli' && (
        <ScrollView style={styles.content}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, chartType === 'D1' && styles.toggleBtnActive]}
              onPress={() => setChartType('D1')}
            >
              <Text style={[styles.toggleBtnText, chartType === 'D1' && styles.toggleBtnTextActive]}>D1 Rashi Chart (Birth)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, chartType === 'D9' && styles.toggleBtnActive]}
              onPress={() => setChartType('D9')}
            >
              <Text style={[styles.toggleBtnText, chartType === 'D9' && styles.toggleBtnTextActive]}>D9 Navamsha (Spouse & Destiny)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chartWrapper}>
            <NorthIndianChart size={320} planetsByHouse={chartType === 'D1' ? d1Planets : d9Planets} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Active Dasha (Timing of Events)</Text>
            <Text style={styles.cardHighlight}>Jupiter Maha Dasha - Mercury Antar Dasha</Text>
            <Text style={styles.cardBody}>Active until: 2028-04-12 | Signification: Wealth, Higher Learning, Expansion</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Classical Dosha & Prescriptions</Text>
            <Text style={styles.greenText}>Manglik Dosha: Cancelled (Anshik / No Affliction)</Text>
            <Text style={styles.cardBody}>Kalsarp Yoga: Anant Kalsarp (Mitigated by Jupiter in 1st House)</Text>
            <Text style={styles.prescription}>Lucky Gemstone: Yellow Sapphire (Pukhraj) in Gold</Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'muhurta' && (
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Peak Auspicious Window</Text>
            <Text style={styles.greenHighlight}>Abhijit Muhurta: 11:48 AM - 12:36 PM</Text>
            <Text style={styles.cardBody}>Most powerful time of the day to start any business or sign agreements.</Text>
          </View>

          <Text style={styles.sectionHeader}>Hourly Planetary Productivity (24h Timeline)</Text>
          {[
            { time: "06:24 AM - 07:21 AM", planet: "Sun", score: 70, theme: "Government & Leadership", color: "#FFA500" },
            { time: "07:21 AM - 08:18 AM", planet: "Venus", score: 90, theme: "Creative & Luxury Purchases", color: "#FF69B4" },
            { time: "08:18 AM - 09:15 AM", planet: "Mercury", score: 85, theme: "Trading, Contracts & Tech", color: "#00CED1" },
            { time: "09:15 AM - 10:12 AM", planet: "Jupiter", score: 95, theme: "Wealth & Wisdom Decisions", color: "#FFD700" }
          ].map((item, idx) => (
            <View key={idx} style={[styles.timelineItem, { borderLeftColor: item.color }]}>
              <View>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <Text style={styles.timelinePlanet}>Hora Lord: {item.planet}</Text>
                <Text style={styles.timelineTheme}>{item.theme}</Text>
              </View>
              <Text style={[styles.scoreBadge, { backgroundColor: item.color }]}>{item.score}%</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'milan' && (
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kundli Milan Compatibility Result</Text>
            <Text style={styles.matchScore}>29.5 / 36 Gunas</Text>
            <Text style={styles.verdictText}>Verdict: Highly Auspicious Match</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ashtakoota 8-Factor Score Breakdown</Text>
            <Text style={styles.factorRow}>1. Varna (Spiritual Alignment): 1 / 1</Text>
            <Text style={styles.factorRow}>2. Vashya (Mutual Attraction): 2 / 2</Text>
            <Text style={styles.factorRow}>3. Tara (Health & Longevity): 3 / 3</Text>
            <Text style={styles.factorRow}>4. Yoni (Biological Compatibility): 3 / 4</Text>
            <Text style={styles.factorRow}>5. Graha Maitri (Psychological Bond): 4 / 5</Text>
            <Text style={styles.factorRow}>6. Gana (Temperament): 6 / 6</Text>
            <Text style={styles.factorRow}>7. Bhakoot (Emotional Welfare): 7 / 7</Text>
            <Text style={styles.factorRow}>8. Nadi (Genetic Harmony): 8 / 8 (No Nadi Dosha)</Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'ai' && (
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ask Astro-Expert AI</Text>
            <Text style={styles.cardBody}>
              Grounded in your exact birth chart, active Mahadasha, and current planetary transits.
            </Text>

            <View style={styles.chipRow}>
              {[
                { label: '💼 Career & Promotion', cat: 'career' },
                { label: '💍 Marriage & Spouse', cat: 'marriage' },
                { label: '💰 Wealth & Business', cat: 'wealth' }
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.cat}
                  style={[styles.chip, selectedCategory === chip.cat && styles.activeChip]}
                  onPress={() => {
                    setSelectedCategory(chip.cat as any);
                    handleAskAI(chip.cat as any);
                  }}
                >
                  <Text style={[styles.chipText, selectedCategory === chip.cat && styles.activeChipText]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                value={userQuery}
                onChangeText={setUserQuery}
                placeholder="Or ask a custom question..."
                style={styles.chatInput}
              />
              <TouchableOpacity style={styles.askBtn} onPress={() => handleAskAI()}>
                <Text style={styles.askBtnText}>Ask</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isLoading && (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color="#8B0000" />
              <Text style={styles.loadingText}>Synthesizing your Parashari chart & transits...</Text>
            </View>
          )}

          {aiResponse && !isLoading && (
            <View style={[styles.card, styles.aiCard]}>
              <Text style={styles.aiHeader}>Vedic Astrological Interpretation</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.infoBadge}>Lagna: {aiResponse.planetary_analysis.lagna}</Text>
                <Text style={styles.infoBadge}>Moon: {aiResponse.planetary_analysis.moon_sign}</Text>
                <Text style={styles.infoBadge}>Dasha: {aiResponse.planetary_analysis.active_mahadasha}</Text>
              </View>

              <Text style={styles.aiBody}>{aiResponse.expert_interpretation}</Text>

              <View style={styles.remedyBox}>
                <Text style={styles.remedyTitle}>Prescribed Remedy / Upay:</Text>
                <Text style={styles.remedyText}>{aiResponse.remedy_recommendation}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  header: { backgroundColor: '#8B0000', paddingVertical: 14, alignItems: 'center' },
  headerTitle: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },
  headerSubtitle: { color: '#FFF', fontSize: 12, marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#5A0000' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 3, borderBottomColor: '#FFD700' },
  tabText: { color: '#E0E0E0', fontSize: 11, fontWeight: '600' },
  activeTabText: { color: '#FFD700', fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, gap: 10 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#8B0000' },
  toggleBtnActive: { backgroundColor: '#8B0000' },
  toggleBtnText: { color: '#8B0000', fontSize: 12, fontWeight: 'bold' },
  toggleBtnTextActive: { color: '#FFF' },
  chartWrapper: { alignItems: 'center', marginVertical: 8 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#8B0000', marginBottom: 6 },
  cardHighlight: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  greenHighlight: { fontSize: 16, fontWeight: 'bold', color: '#28A745', marginBottom: 4 },
  cardBody: { fontSize: 12, color: '#555', lineHeight: 18 },
  greenText: { fontSize: 13, fontWeight: 'bold', color: '#28A745', marginBottom: 4 },
  prescription: { fontSize: 13, fontWeight: 'bold', color: '#B8860B', marginTop: 6 },
  sectionHeader: { fontSize: 15, fontWeight: 'bold', color: '#333', marginVertical: 10 },
  timelineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 5, elevation: 1 },
  timelineTime: { fontSize: 12, color: '#888' },
  timelinePlanet: { fontSize: 14, fontWeight: 'bold', color: '#222', marginTop: 2 },
  timelineTheme: { fontSize: 12, color: '#555', marginTop: 2 },
  scoreBadge: { color: '#000', fontWeight: 'bold', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  matchScore: { fontSize: 26, fontWeight: 'bold', color: '#28A745', marginVertical: 6 },
  verdictText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  factorRow: { fontSize: 13, color: '#444', marginVertical: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  chip: { backgroundColor: '#F0E6D2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  activeChip: { backgroundColor: '#8B0000' },
  chipText: { fontSize: 12, color: '#5A0000', fontWeight: '600' },
  activeChipText: { color: '#FFF' },
  inputRow: { flexDirection: 'row', marginTop: 8, alignItems: 'center' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 20, paddingHorizontal: 14, height: 40, backgroundColor: '#FAFAFA', fontSize: 13 },
  askBtn: { marginLeft: 8, backgroundColor: '#8B0000', paddingHorizontal: 18, height: 40, justifyContent: 'center', borderRadius: 20 },
  askBtnText: { color: '#FFD700', fontWeight: 'bold', fontSize: 13 },
  loadingWrapper: { alignItems: 'center', marginVertical: 20 },
  loadingText: { color: '#8B0000', fontSize: 13, marginTop: 8, fontWeight: '600' },
  aiCard: { borderLeftWidth: 4, borderLeftColor: '#FFD700', backgroundColor: '#FFFDF9' },
  aiHeader: { fontSize: 15, fontWeight: 'bold', color: '#8B0000', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  infoBadge: { backgroundColor: '#8B0000', color: '#FFD700', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  aiBody: { fontSize: 13, color: '#2C3E50', lineHeight: 20, marginBottom: 12 },
  remedyBox: { backgroundColor: '#FDF6E2', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#B8860B' },
  remedyTitle: { fontSize: 12, fontWeight: 'bold', color: '#8B0000', marginBottom: 2 },
  remedyText: { fontSize: 12, color: '#555', lineHeight: 16 }
});
