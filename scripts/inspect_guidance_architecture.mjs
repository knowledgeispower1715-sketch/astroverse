import fs from 'fs';
import path from 'path';

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

console.log('Total lines in index.html:', lines.length);

const keywords = [
  'generatePersonalizedGuidance',
  'renderStructuredPredictionUI',
  'renderFallbackGuidanceUI',
  'loadHourlyHorasUI',
  'section-guidance',
  'horizon-switcher-row',
  'HORIZON_TITLES',
  'currentGuidanceHorizon',
  'guidance-guest-banner',
  'guidance-grounding-badge',
  'guidance-report-title',
  'guidance-disp-summary',
  'guidance-disp-outlook',
  'guidance-disp-supportive',
  'guidance-disp-challenges',
  'guidance-disp-windows',
  'guidance-period-items-container',
  'guidance-remedies',
  'guidance-precautions',
  '09:30 AM',
  'Anand Sharma',
  'Rahul Sharma',
  'Tara Bala',
  'Chandra Bala',
  'Rahu Kaal',
  'Sade Sati',
  'Kantaka Shani'
];

keywords.forEach(kw => {
  const matches = [];
  lines.forEach((line, idx) => {
    if (line.includes(kw)) {
      matches.push(idx + 1);
    }
  });
  console.log(`${kw.padEnd(35)}: ${matches.length} matches (lines: ${matches.slice(0, 5).join(', ')}${matches.length > 5 ? '...' : ''})`);
});
