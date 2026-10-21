/**
 * AstroVerse Mobile OS - Chart Screen (Kundli & Planetary Positions)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Colors } from '../theme/colors';
import { useChart } from '../context/ChartContext';
import { NorthIndianChart } from '../components/NorthIndianChart';

type ChartType = 'D1' | 'D9' | 'D10' | 'MOON';

export const ChartScreen: React.FC<{ onOpenProfileModal: () => void }> = ({ onOpenProfileModal }) => {
  const { activeProfile, kundliData, isLoading, reloadChart } = useChart();
  const [selectedChart, setSelectedChart] = useState<ChartType>('D1');

  const currentChartData =
    selectedChart === 'D1'
      ? kundliData?.d1
      : selectedChart === 'D9'
      ? kundliData?.d9 || kundliData?.d1
      : selectedChart === 'D10'
      ? kundliData?.d10 || kundliData?.d1
      : kundliData?.moon || kundliData?.d1;

  const lagna = currentChartData?.lagna;
  const planetsList = currentChartData?.planets ? Object.values(currentChartData.planets) : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Title */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Vedic Kundli</Text>
            <TouchableOpacity onPress={onOpenProfileModal}>
              <Text style={styles.profileSubtitle}>
                {activeProfile.name} • {activeProfile.birthPlace} ▾
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.reloadBtn} onPress={reloadChart}>
            <Text style={styles.reloadBtnText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Chart Selector Tabs */}
        <View style={styles.chartTabs}>
          {(['D1', 'D9', 'D10', 'MOON'] as ChartType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.chartTab, selectedChart === tab && styles.chartTabActive]}
              onPress={() => setSelectedChart(tab)}
            >
              <Text
                style={[
                  styles.chartTabText,
                  selectedChart === tab && styles.chartTabTextActive
                ]}
              >
                {tab === 'D1' && 'D1 Rashi'}
                {tab === 'D9' && 'D9 Navamsha'}
                {tab === 'D10' && 'D10 Career'}
                {tab === 'MOON' && 'Moon Chart'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading Indicator */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.gold} />
            <Text style={styles.loadingText}>Computing Swiss Ephemeris coordinates...</Text>
          </View>
        ) : (
          <>
            {/* Native SVG North Indian Diamond Chart */}
            <NorthIndianChart chartData={currentChartData} />

            {/* Lagna Summary Badge */}
            {lagna && (
              <View style={styles.lagnaBadge}>
                <Text style={styles.lagnaLabel}>Ascendant (Lagna):</Text>
                <Text style={styles.lagnaValue}>
                  {lagna.sign} {lagna.degree}° {lagna.nakshatra ? `(${lagna.nakshatra} Pada ${lagna.pada || 1})` : ''}
                </Text>
              </View>
            )}

            {/* Dosha Analysis Summary */}
            <View style={styles.doshaContainer}>
              <Text style={styles.sectionHeader}>PARASHARI DOSHA STATUS</Text>
              <View style={styles.doshaGrid}>
                <View style={styles.doshaCard}>
                  <Text style={styles.doshaName}>Manglik</Text>
                  <Text
                    style={[
                      styles.doshaStatus,
                      { color: kundliData?.doshas?.manglik?.has_dosha ? Colors.error : Colors.success }
                    ]}
                  >
                    {kundliData?.doshas?.manglik?.has_dosha ? 'Dosha Present' : 'No Dosha'}
                  </Text>
                </View>

                <View style={styles.doshaCard}>
                  <Text style={styles.doshaName}>Kaal Sarp</Text>
                  <Text
                    style={[
                      styles.doshaStatus,
                      { color: kundliData?.doshas?.kaal_sarp?.has_dosha ? Colors.error : Colors.success }
                    ]}
                  >
                    {kundliData?.doshas?.kaal_sarp?.has_dosha ? 'Active' : 'Not Present'}
                  </Text>
                </View>

                <View style={styles.doshaCard}>
                  <Text style={styles.doshaName}>Sade Sati</Text>
                  <Text
                    style={[
                      styles.doshaStatus,
                      { color: kundliData?.doshas?.sade_sati?.is_active ? Colors.warning : Colors.success }
                    ]}
                  >
                    {kundliData?.doshas?.sade_sati?.phase || 'None'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Planetary Positions Table */}
            <View style={styles.tableCard}>
              <Text style={styles.sectionHeader}>PLANETARY POSITIONS & NAKSHATRAS</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colPlanet]}>Planet</Text>
                <Text style={[styles.th, styles.colSign]}>Sign</Text>
                <Text style={[styles.th, styles.colDeg]}>Degree</Text>
                <Text style={[styles.th, styles.colHouse]}>H</Text>
                <Text style={[styles.th, styles.colNak]}>Nakshatra</Text>
              </View>

              {planetsList.map(p => (
                <View key={p.name} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colPlanet, styles.planetName]}>
                    {p.name} {p.is_retrograde ? '(R)' : ''}
                  </Text>
                  <Text style={[styles.td, styles.colSign]}>{p.sign}</Text>
                  <Text style={[styles.td, styles.colDeg]}>{p.degree}°</Text>
                  <Text style={[styles.td, styles.colHouse, { color: Colors.gold }]}>{p.house}</Text>
                  <Text style={[styles.td, styles.colNak]}>
                    {p.nakshatra} P{p.pada}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold'
  },
  profileSubtitle: {
    color: Colors.gold,
    fontSize: 12,
    marginTop: 2
  },
  reloadBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border
  },
  reloadBtnText: {
    color: Colors.textSecondary,
    fontSize: 12
  },
  chartTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 3,
    marginBottom: 8
  },
  chartTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  chartTabActive: {
    backgroundColor: Colors.goldMuted
  },
  chartTabText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  chartTabTextActive: {
    color: Colors.gold,
    fontWeight: 'bold'
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 10
  },
  lagnaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border
  },
  lagnaLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginRight: 6
  },
  lagnaValue: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: 'bold'
  },
  doshaContainer: {
    marginVertical: 10
  },
  sectionHeader: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8
  },
  doshaGrid: {
    flexDirection: 'row',
    gap: 8
  },
  doshaCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center'
  },
  doshaName: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 2
  },
  doshaStatus: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  tableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
    marginBottom: 6
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceElevated
  },
  th: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold'
  },
  td: {
    color: Colors.textSecondary,
    fontSize: 12
  },
  colPlanet: {
    flex: 2
  },
  colSign: {
    flex: 2
  },
  colDeg: {
    flex: 1.5
  },
  colHouse: {
    flex: 0.8,
    textAlign: 'center'
  },
  colNak: {
    flex: 2.5,
    textAlign: 'right'
  },
  planetName: {
    color: Colors.textPrimary,
    fontWeight: '600'
  }
});
