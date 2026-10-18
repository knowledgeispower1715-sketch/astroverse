import React from 'react';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

interface ChartProps {
  size?: number;
  planetsByHouse: Record<number, string[]>;
}

export const NorthIndianChart: React.FC<ChartProps> = ({ size = 320, planetsByHouse }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="0" y="0" width="100" height="100" fill="#FFFDF0" stroke="#8B0000" strokeWidth="2" />
      <Line x1="0" y1="0" x2="100" y2="100" stroke="#8B0000" strokeWidth="1" />
      <Line x1="100" y1="0" x2="0" y2="100" stroke="#8B0000" strokeWidth="1" />
      <Line x1="50" y1="0" x2="0" y2="50" stroke="#8B0000" strokeWidth="1" />
      <Line x1="0" y1="50" x2="50" y2="100" stroke="#8B0000" strokeWidth="1" />
      <Line x1="50" y1="100" x2="100" y2="50" stroke="#8B0000" strokeWidth="1" />
      <Line x1="100" y1="50" x2="50" y2="0" stroke="#8B0000" strokeWidth="1" />

      {/* House 1 (Lagna) Center Diamond */}
      <SvgText x="50" y="42" fontSize="5" fill="#B22222" textAnchor="middle" fontWeight="bold">
        1 {planetsByHouse[1]?.join(' ') || ''}
      </SvgText>
      <SvgText x="28" y="22" fontSize="4.5" fill="#333" textAnchor="middle">
        2 {planetsByHouse[2]?.join(' ') || ''}
      </SvgText>
      <SvgText x="25" y="52" fontSize="4.5" fill="#333" textAnchor="middle">
        4 {planetsByHouse[4]?.join(' ') || ''}
      </SvgText>
      <SvgText x="50" y="75" fontSize="4.5" fill="#333" textAnchor="middle">
        7 {planetsByHouse[7]?.join(' ') || ''}
      </SvgText>
      <SvgText x="75" y="52" fontSize="4.5" fill="#333" textAnchor="middle">
        10 {planetsByHouse[10]?.join(' ') || ''}
      </SvgText>
    </Svg>
  );
};
