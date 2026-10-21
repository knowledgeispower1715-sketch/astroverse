/**
 * AstroVerse Mobile OS - Native SVG North Indian Diamond Chart
 * Renders all 12 houses with authentic Vedic geometry, sign numbers, and grahas.
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { KundliChartData } from '../types';

interface NorthIndianChartProps {
  chartData?: KundliChartData | null;
  size?: number;
}

const HOUSE_COORDINATES: Record<number, { signPos: { x: number; y: number }; planetsPos: { x: number; y: number } }> = {
  1:  { signPos: { x: 50, y: 38 }, planetsPos: { x: 50, y: 24 } },
  2:  { signPos: { x: 26, y: 16 }, planetsPos: { x: 26, y: 26 } },
  3:  { signPos: { x: 14, y: 28 }, planetsPos: { x: 14, y: 38 } },
  4:  { signPos: { x: 36, y: 50 }, planetsPos: { x: 24, y: 50 } },
  5:  { signPos: { x: 14, y: 72 }, planetsPos: { x: 14, y: 62 } },
  6:  { signPos: { x: 26, y: 84 }, planetsPos: { x: 26, y: 74 } },
  7:  { signPos: { x: 50, y: 62 }, planetsPos: { x: 50, y: 76 } },
  8:  { signPos: { x: 74, y: 84 }, planetsPos: { x: 74, y: 74 } },
  9:  { signPos: { x: 86, y: 72 }, planetsPos: { x: 86, y: 62 } },
  10: { signPos: { x: 64, y: 50 }, planetsPos: { x: 76, y: 50 } },
  11: { signPos: { x: 86, y: 28 }, planetsPos: { x: 86, y: 38 } },
  12: { signPos: { x: 74, y: 16 }, planetsPos: { x: 74, y: 26 } },
};

const ZODIAC_TO_NUM: Record<string, number> = {
  Aries: 1, Taurus: 2, Gemini: 3, Cancer: 4,
  Leo: 5, Virgo: 6, Libra: 7, Scorpio: 8,
  Sagittarius: 9, Capricorn: 10, Aquarius: 11, Pisces: 12
};

const PLANET_ABBREVIATIONS: Record<string, string> = {
  Sun: 'Su',
  Moon: 'Mo',
  Mars: 'Ma',
  Mercury: 'Me',
  Jupiter: 'Ju',
  Venus: 'Ve',
  Saturn: 'Sa',
  Rahu: 'Ra',
  Ketu: 'Ke'
};

export const NorthIndianChart: React.FC<NorthIndianChartProps> = ({ chartData, size }) => {
  const screenWidth = Dimensions.get('window').width;
  const chartSize = size || Math.min(screenWidth - 32, 360);

  // Determine Lagna sign number (default: Scorpio = 8)
  const lagnaSignName = chartData?.lagna?.sign || 'Scorpio';
  const lagnaSignNum = ZODIAC_TO_NUM[lagnaSignName] || 8;

  // Map planets to houses
  const planetsByHouse: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) {
    planetsByHouse[i] = [];
  }

  if (chartData?.planets) {
    Object.values(chartData.planets).forEach(p => {
      const h = p.house || 1;
      const abbr = PLANET_ABBREVIATIONS[p.name] || p.name.substring(0, 2);
      const retro = p.is_retrograde ? '(R)' : '';
      planetsByHouse[h].push(`${abbr}${retro}`);
    });
  } else {
    // Default demo placements (Lagna Scorpio):
    // Sun in Leo (House 10), Moon in Aquarius (House 4), Jupiter in Libra (House 12)
    planetsByHouse[10].push('Su');
    planetsByHouse[4].push('Mo');
    planetsByHouse[12].push('Ju');
    planetsByHouse[9].push('Sa');
    planetsByHouse[11].push('Ve');
  }

  // Calculate sign number in each house
  const getSignNumForHouse = (houseNum: number): number => {
    return ((lagnaSignNum + (houseNum - 1) - 1) % 12) + 1;
  };

  return (
    <View style={[styles.container, { width: chartSize, height: chartSize }]}>
      <Svg width={chartSize} height={chartSize} viewBox="0 0 100 100">
        {/* Background & Outer Frame */}
        <Rect
          x="1"
          y="1"
          width="98"
          height="98"
          fill={Colors.surface}
          stroke={Colors.gold}
          strokeWidth="1.2"
          rx="2"
        />

        {/* Diagonal Cross Lines */}
        <Line x1="1" y1="1" x2="99" y2="99" stroke={Colors.goldDark} strokeWidth="0.8" opacity="0.6" />
        <Line x1="99" y1="1" x2="1" y2="99" stroke={Colors.goldDark} strokeWidth="0.8" opacity="0.6" />

        {/* Inner Diamond connecting edge midpoints */}
        <Line x1="50" y1="1" x2="1" y2="50" stroke={Colors.gold} strokeWidth="1" />
        <Line x1="1" y1="50" x2="50" y2="99" stroke={Colors.gold} strokeWidth="1" />
        <Line x1="50" y1="99" x2="99" y2="50" stroke={Colors.gold} strokeWidth="1" />
        <Line x1="99" y1="50" x2="50" y2="1" stroke={Colors.gold} strokeWidth="1" />

        {/* Center Accent for Lagna Diamond */}
        <G>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(houseNum => {
            const coords = HOUSE_COORDINATES[houseNum];
            const signNum = getSignNumForHouse(houseNum);
            const planets = planetsByHouse[houseNum] || [];

            return (
              <G key={`house-${houseNum}`}>
                {/* Zodiac Sign Number (Subtle Gold/Orange) */}
                <SvgText
                  x={coords.signPos.x}
                  y={coords.signPos.y}
                  fontSize={houseNum === 1 ? '4.5' : '3.8'}
                  fill={houseNum === 1 ? Colors.gold : Colors.textMuted}
                  fontWeight={houseNum === 1 ? 'bold' : 'normal'}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {signNum}
                </SvgText>

                {/* Grahas (Planets) occupying this house */}
                {planets.length > 0 && (
                  <SvgText
                    x={coords.planetsPos.x}
                    y={coords.planetsPos.y}
                    fontSize={planets.length > 2 ? '3.2' : '3.8'}
                    fill={Colors.textPrimary}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {planets.join(' ')}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginVertical: 12
  }
});
