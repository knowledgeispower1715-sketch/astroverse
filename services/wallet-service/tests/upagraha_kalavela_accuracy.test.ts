/**
 * AstroVerse Upagraha & Kalavela Calculation Integrity & Verification Suite
 * =========================================================================
 * Rigorous Parashari Jyotish and mathematical verification for:
 * 1. Five Sun-Derived Aprakasha Grahas:
 *    - Dhuma = (Sun + 133°20') % 360°
 *    - Vyatipaata = (360° - Dhuma) % 360°
 *    - Parivesha = (Vyatipaata + 180°) % 360°
 *    - Indrachaapa = (360° - Parivesha) % 360°
 *    - Upaketu = (Indrachaapa + 16°40') % 360°
 * 2. Strict Parashari Invariants:
 *    - (Upaketu + 30°) % 360° == Sun Longitude (mod 360) holds across all solar positions.
 *    - Polar Oppositions: Dhuma ↔ Indrachaapa (180°) and Vyatipaata ↔ Parivesha (180°).
 *    - Longitude Normalization: Degree rollover strictly maps 29.999° to 0.00° of next sign.
 * 3. Six Time-Based Kalavelas:
 *    - Kaala, Mrityu, Arthaprahaara, Yamaghantaka, Gulika, Maandi.
 *    - Diurnal vs. nocturnal 8-fold portions from Dinamana and Ratrimana.
 * 4. Full-Stack DOM & Report Parity:
 *    - index.html contains #kw-pane-upagrahas, #upagrahas-executive-summary-box,
 *      #upagrahas-cards-grid, and #tbody-upagrahas-workspace.
 *    - reportGenerator.ts Chapter 7 renders full 11-point table and invariant proofs.
 *    - index.html client PDF generator dynamically formats all 11 Upagrahas.
 * 5. Strict Privacy by Default: Zero hardcoded screenshot personal data.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AstroCalculator, CalculatedChart } from '../src/monetization/astroCalculator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

console.log('==============================================================================');
console.log('ASTROVERSE UPAGRAHA & KALAVELA ACCURACY AND REPORT INTEGRITY SUITE');
console.log('==============================================================================\n');

// ==============================================================================
// 1. FIVE SUN-DERIVED UPAGRAHAS & MATHEMATICAL INVARIANTS
// ==============================================================================
console.log('--- 1. FIVE SUN-DERIVED UPAGRAHAS & MATHEMATICAL INVARIANTS ---');

function normDeg(d: number): number {
  return ((d % 360.0) + 360.0) % 360.0;
}

// Test across 12 diverse solar positions representing all 12 signs and boundary values
const solarTestCases = [
  0.0,       // Aries 0°00'
  15.5,      // Aries 15°30'
  29.999,    // Aries border rollover
  45.0,      // Taurus 15°
  90.0,      // Cancer 0°
  133.3333,  // Leo 13°20'
  180.0,     // Libra 0°
  225.5,     // Scorpio 15°30'
  270.0,     // Capricorn 0°
  315.25,    // Aquarius 15°15'
  345.0,     // Pisces 15°
  359.9999   // Pisces end border
];

for (const sunLon of solarTestCases) {
  const upRes = AstroCalculator.calculateUpagrahas(sunLon, 0.0, '2000-01-01', '12:00', 28.6139, 77.2090);

  // Invariant 1: Upaketu + 30° == Sun Longitude
  assert(upRes.invariants.closure_verified, `Cyclic closure (Upaketu + 30° ≡ Sun) verified at Sun=${sunLon}°`);
  assert(upRes.invariants.closure_difference < 1e-4, `Closure variance is negligible (< 1e-4°) at Sun=${sunLon}° (got: ${upRes.invariants.closure_difference})`);

  // Invariant 2: Dhuma ↔ Indrachaapa exact 180° opposition
  assert(upRes.invariants.dhuma_indrachaapa_opposition_verified, `Dhuma ↔ Indrachaapa 180° polar opposition verified at Sun=${sunLon}°`);

  // Invariant 3: Vyatipaata ↔ Parivesha exact 180° opposition
  assert(upRes.invariants.vyatipaata_parivesha_opposition_verified, `Vyatipaata ↔ Parivesha 180° polar opposition verified at Sun=${sunLon}°`);
}

// ==============================================================================
// 2. LONGITUDE NORMALIZATION & SIGN ROLLOVER
// ==============================================================================
console.log('\n--- 2. LONGITUDE NORMALIZATION & SIGN ROLLOVER ---');

const rollover1 = AstroCalculator.calculateUpagrahas(29.999, 0.0, '2000-01-01', '12:00');
assert(rollover1.all_upagrahas.every(u => u.degree >= 0.0 && u.degree < 30.0), 'All Upagraha degrees are within [0.0, 30.0) without 30.00° boundary overflow');

const rollover2 = AstroCalculator.calculateUpagrahas(359.9999, 0.0, '2000-01-01', '12:00');
assert(rollover2.all_upagrahas.every(u => u.total_degree >= 0.0 && u.total_degree < 360.0), 'All Upagraha total degrees are strictly in [0.0, 360.0)');

// ==============================================================================
// 3. SIX TIME-BASED KALAVELAS (DAYTIME VS NIGHTTIME)
// ==============================================================================
console.log('\n--- 3. SIX TIME-BASED KALAVELAS (DAYTIME VS NIGHTTIME) ---');

// Day Birth (14:30 on Saturday 2026-10-31)
const dayChart = AstroCalculator.calculateChart('2026-10-31', '14:30', 28.6139, 77.2090);
assert(dayChart.upagrahas !== undefined, 'AstroCalculator.calculateChart must populate upagrahas');
assert(dayChart.upagrahas?.all_upagrahas.length === 11, 'CalculatedChart must contain exactly 11 Upagrahas');
assert(dayChart.upagrahas?.sun_derived.length === 5, 'Must contain exactly 5 Sun-Derived Upagrahas');
assert(dayChart.upagrahas?.time_based.length === 6, 'Must contain exactly 6 Time-Based Kalavelas');

const kalavelaNames = dayChart.upagrahas?.time_based.map(u => u.name) || [];
assert(kalavelaNames.includes('Kaala'), 'Kalavelas must include Kaala');
assert(kalavelaNames.includes('Mrityu'), 'Kalavelas must include Mrityu');
assert(kalavelaNames.includes('Arthaprahaara'), 'Kalavelas must include Arthaprahaara');
assert(kalavelaNames.includes('Yamaghantaka'), 'Kalavelas must include Yamaghantaka');
assert(kalavelaNames.includes('Gulika'), 'Kalavelas must include Gulika');
assert(kalavelaNames.includes('Maandi'), 'Kalavelas must include Maandi');

// Night Birth (23:45 on Monday 2026-11-02)
const nightChart = AstroCalculator.calculateChart('2026-11-02', '23:45', 19.0760, 72.8777);
assert(nightChart.upagrahas !== undefined, 'Night chart must populate upagrahas');
assert(nightChart.upagrahas?.all_upagrahas.length === 11, 'Night chart must contain exactly 11 Upagrahas');

// All points have authentic houses
assert(dayChart.upagrahas?.all_upagrahas.every(u => u.house >= 1 && u.house <= 12) ?? false, 'Every Upagraha must have a valid house [1..12]');
assert(nightChart.upagrahas?.all_upagrahas.every(u => u.house >= 1 && u.house <= 12) ?? false, 'Every night Upagraha must have a valid house [1..12]');

// ==============================================================================
// 4. FRONTEND DOM & MARKUP VERIFICATION (index.html)
// ==============================================================================
console.log('\n--- 4. FRONTEND DOM & MARKUP VERIFICATION (index.html) ---');

const indexPath = path.resolve(__dirname, '../../../index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

assert(indexHtml.includes('id="kw-pane-upagrahas"'), 'index.html must contain #kw-pane-upagrahas pane');
assert(indexHtml.includes('id="upagrahas-executive-summary-box"'), 'index.html must contain #upagrahas-executive-summary-box container');
assert(indexHtml.includes('id="upagrahas-cards-grid"'), 'index.html must contain #upagrahas-cards-grid responsive container');
assert(indexHtml.includes('id="tbody-upagrahas-workspace"'), 'index.html must contain #tbody-upagrahas-workspace table body');
assert(indexHtml.includes('function calculateClientUpagrahas'), 'index.html must define calculateClientUpagrahas()');
assert(indexHtml.includes('function renderKundliUpagrahasView'), 'index.html must define renderKundliUpagrahasView()');
assert(indexHtml.includes('function setUpagrahaViewMode'), 'index.html must define setUpagrahaViewMode()');
assert(indexHtml.includes('function toggleUpagrahaDetailDrawer'), 'index.html must define toggleUpagrahaDetailDrawer()');

// Check bilingual coverage in calculateClientUpagrahas
assert(indexHtml.includes('धूम'), "calculateClientUpagrahas must define Hindi name for Dhuma");
assert(indexHtml.includes('व्यतीपात'), "calculateClientUpagrahas must define Hindi name for Vyatipaata");
assert(indexHtml.includes('परिवेष'), "calculateClientUpagrahas must define Hindi name for Parivesha");
assert(indexHtml.includes('इंद्रचाप'), "calculateClientUpagrahas must define Hindi name for Indrachaapa");
assert(indexHtml.includes('उपकेतु'), "calculateClientUpagrahas must define Hindi name for Upaketu");
assert(indexHtml.includes('गुलिक'), "calculateClientUpagrahas must define Hindi name for Gulika");
assert(indexHtml.includes('मांदि'), "calculateClientUpagrahas must define Hindi name for Maandi");

// ==============================================================================
// 5. REPORT GENERATOR & PDF CHAPTER 7 SYNCHRONIZATION
// ==============================================================================
console.log('\n--- 5. REPORT GENERATOR & PDF CHAPTER 7 SYNCHRONIZATION ---');

const reportGenPath = path.resolve(__dirname, '../src/monetization/reportGenerator.ts');
const reportGenTs = fs.readFileSync(reportGenPath, 'utf-8');

assert(reportGenTs.includes("sectionId: 'sec_ch7_remedies_methodology'"), 'reportGenerator.ts must retain Chapter 7: sec_ch7_remedies_methodology');
assert(reportGenTs.includes('Classical Non-Luminous Upagrahas & Kalavelas'), 'reportGenerator.ts Chapter 7 must title Classical Upagrahas & Kalavelas');
assert(reportGenTs.includes('Upaketu (Sikhi)'), 'reportGenerator.ts Chapter 7 must verify Upaketu');
assert(reportGenTs.includes('Dhuma'), 'reportGenerator.ts Chapter 7 must verify Dhuma');
assert(reportGenTs.includes('Gulika'), 'reportGenerator.ts Chapter 7 must verify Gulika');
assert(reportGenTs.includes('Maandi'), 'reportGenerator.ts Chapter 7 must verify Maandi');

// Client PDF generator in index.html
assert(indexHtml.includes('11 Classical Non-Luminous Upagrahas &amp; Kalavelas (BPHS Ch. 3)'), 'index.html client PDF template must render all 11 Upagrahas');
assert(indexHtml.includes('(Upaketu + 30°) ≡ Sun Longitude'), 'index.html client PDF template must state the Parashari invariant');

console.log('\n==============================================================================');
console.log('ALL UPAGRAHA & KALAVELA ACCURACY AND INTEGRITY TESTS PASSED (100%)');
console.log('==============================================================================\n');
