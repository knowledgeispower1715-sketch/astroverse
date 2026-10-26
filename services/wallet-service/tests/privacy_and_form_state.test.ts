import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { NumerologyCalculator } from '../src/monetization/numerologyCalculator';
import { ReportDocumentGenerator } from '../src/monetization/reportGenerator';

const indexPath = path.resolve(__dirname, '../../../index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

test('1. Core personal-data input fields in index.html are blank by default', () => {
  // Check main Kundli inputs
  const kNameMatch = indexHtml.match(/id="input-k-name"[^>]*value="([^"]*)"/);
  assert.ok(kNameMatch, 'input-k-name must exist with value attribute');
  assert.strictEqual(kNameMatch[1], '', 'input-k-name must be blank by default');

  const kDobMatch = indexHtml.match(/id="input-k-dob"[^>]*value="([^"]*)"/);
  if (kDobMatch) {
    assert.strictEqual(kDobMatch[1], '', 'input-k-dob must be blank by default');
  }

  // Check Milan inputs
  const boyNameMatch = indexHtml.match(/id="milan-boy-name"[^>]*value="([^"]*)"/);
  assert.ok(boyNameMatch, 'milan-boy-name must exist with value attribute');
  assert.strictEqual(boyNameMatch[1], '', 'milan-boy-name must be blank by default');

  const girlNameMatch = indexHtml.match(/id="milan-girl-name"[^>]*value="([^"]*)"/);
  assert.ok(girlNameMatch, 'milan-girl-name must exist with value attribute');
  assert.strictEqual(girlNameMatch[1], '', 'milan-girl-name must be blank by default');

  // Check Numerology inputs
  const numNameMatch = indexHtml.match(/id="numerology-input-name"[^>]*value="([^"]*)"/);
  assert.ok(numNameMatch, 'numerology-input-name must exist with value attribute');
  assert.strictEqual(numNameMatch[1], '', 'numerology-input-name must be blank by default');

  const numDobMatch = indexHtml.match(/id="numerology-input-dob"[^>]*value="([^"]*)"/);
  assert.ok(numDobMatch, 'numerology-input-dob must exist with value attribute');
  assert.strictEqual(numDobMatch[1], '', 'numerology-input-dob must be blank by default');
});

test('2. Numerology Studio contains zero hardcoded Aryan Tiwari defaults', () => {
  assert.ok(!indexHtml.includes("'ARYAN TIWARI'"), "index.html must not contain hardcoded 'ARYAN TIWARI'");
  assert.ok(!indexHtml.includes('"ARYAN TIWARI"'), 'index.html must not contain hardcoded "ARYAN TIWARI"');
  assert.ok(!indexHtml.includes("'2005-08-20'"), "index.html must not contain hardcoded '2005-08-20'");
  assert.ok(!indexHtml.includes('"2005-08-20"'), 'index.html must not contain hardcoded "2005-08-20"');

  const openNumFn = indexHtml.match(/function openNumerologyStudio[\s\S]*?modal\.style\.display = 'flex';/);
  assert.ok(openNumFn, 'openNumerologyStudio function must exist');
  assert.ok(!openNumFn[0].includes('ARYAN'), 'openNumerologyStudio must not set ARYAN');
  assert.ok(!openNumFn[0].includes('2005-08-20'), 'openNumerologyStudio must not set 2005-08-20');
  assert.ok(!openNumFn[0].includes('currentCalculatedChart'), 'openNumerologyStudio must not copy currentCalculatedChart');
});

test('3. Reader document subtitle has no hardcoded Native: Anand Sharma', () => {
  assert.ok(!indexHtml.includes('Native: Anand Sharma'), 'index.html reader header must not hardcode Native: Anand Sharma');
});

test('4. Upagrahas and BTR modals have no hardcoded fallback birth datetimes', () => {
  // Check modal-upagrahas-dob template string in index.html
  assert.ok(
    !indexHtml.includes(": '1995-06-15T10:30'"),
    'Interactive tool modals must not fall back to 1995-06-15T10:30'
  );
  assert.ok(
    !indexHtml.includes('|| \'1995-06-15T10:30\''),
    'Calculation functions must not fall back to 1995-06-15T10:30'
  );
});

test('5. Numerology Studio reset lifecycle function is defined in index.html', () => {
  assert.ok(indexHtml.includes('function resetNumerologyStudio()'), 'resetNumerologyStudio function must exist in index.html');
  assert.ok(indexHtml.includes('currentNumerologySubject = null;'), 'resetNumerologyStudio must nullify currentNumerologySubject');
  assert.ok(indexHtml.includes('currentNumerologyRequestId++'), 'resetNumerologyStudio must increment currentNumerologyRequestId');
  assert.ok(indexHtml.includes('closeNumerologyStudio()'), 'closeNumerologyStudio function must exist');
  assert.ok(indexHtml.includes('resetNumerologyStudio();'), 'closeNumerologyStudio must call resetNumerologyStudio');
});

test('6. In-flight async responses are guarded by currentNumerologyRequestId', () => {
  assert.ok(indexHtml.includes('const activeReqId = ++currentNumerologyRequestId;'), 'executeNumerologyStudio must tag request with activeReqId');
  assert.ok(indexHtml.includes('if (activeReqId !== currentNumerologyRequestId)'), 'executeNumerologyStudio must discard response if activeReqId !== currentNumerologyRequestId');
});

test('7. AI Consultation initializes unlinked by default for privacy', () => {
  assert.ok(indexHtml.includes('let isChatKundliLinked = false;'), 'AI chat must start with isChatKundliLinked = false');
});

test('8. executeSignOut purges in-memory feature state', () => {
  const signOutSection = indexHtml.match(/async function executeSignOut[\s\S]*?switchNavSection\('kundli'\);/);
  assert.ok(signOutSection, 'executeSignOut function must be found');
  const body = signOutSection[0];
  assert.ok(body.includes('resetNumerologyStudio()'), 'executeSignOut must call resetNumerologyStudio()');
  assert.ok(body.includes('currentCalculatedChart = null;'), 'executeSignOut must reset currentCalculatedChart');
  assert.ok(body.includes('activeConsultationSession = null;'), 'executeSignOut must reset activeConsultationSession');
  assert.ok(body.includes('isChatKundliLinked = false;'), 'executeSignOut must reset isChatKundliLinked');
});

test('9. Report builder enforces profile selection and separates numerology subject from natal chart', () => {
  assert.ok(indexHtml.includes('builder-profile-select'), 'builder-profile-select must exist');
  assert.ok(indexHtml.includes('report_vedic_name_numerology'), 'report_vedic_name_numerology must be handled');
  assert.ok(indexHtml.includes('currentNumerologySubject'), 'currentNumerologySubject must be linked to report builder');
  assert.ok(indexHtml.includes('Choose a saved profile...'), 'Chart reports must show Choose a saved profile... placeholder');
  assert.ok(indexHtml.includes('Please choose a profile to generate this publication.'), 'Report generator must require profile selection for chart reports');
});

test('10. ReportDocumentGenerator generates numerology report with 15 chapters without requiring coordinates', async () => {
  const syntheticUser = {
    id: 'usr_privacy_test_01',
    displayName: 'Siddharth Roy',
    email: 'siddharth@example.com'
  };
  const syntheticProfile = {
    id: 'prof_privacy_test_01',
    profileName: 'Siddharth Roy',
    dateOfBirth: '1988-11-04',
    timeOfBirth: '',
    birthplaceName: 'Vedic Numerology Subject',
    latitude: 0,
    longitude: 0,
    resolvedTimezone: 'UTC',
    birthTimeKnown: false
  };

  const doc = await ReportDocumentGenerator.generateReport(
    'report_vedic_name_numerology',
    syntheticUser,
    syntheticProfile
  );

  assert.strictEqual(doc.productId, 'report_vedic_name_numerology');
  assert.strictEqual(doc.profileName, 'Siddharth Roy');
  assert.strictEqual(doc.sections.length, 15, 'Numerology report must contain 15 structured chapters');
  assert.strictEqual(doc.sections[0].sectionId, 'sec_num_ch1_exec');
  assert.ok(doc.sections[3].contentMarkdown.includes('SIDDHARTH ROY'), 'Chapter 4 Chaldean analysis must mention normalized subject name');
});

test('11. Numerology calculation correctness remains intact without data leakage', () => {
  // Test distinct profile calculations
  const moolank1 = NumerologyCalculator.calculateMoolank('2001-03-15');
  const bhagyank1 = NumerologyCalculator.calculateBhagyank('2001-03-15');
  const naamank1 = NumerologyCalculator.calculateNaamank('AARAV PATEL', 'chaldean');

  assert.strictEqual(moolank1, 6); // 15 -> 1+5 = 6
  assert.strictEqual(bhagyank1.bhagyank, 3); // 2+0+0+1+0+3+1+5 = 12 -> 3
  assert.strictEqual(naamank1.root, 5); // AARAV PATEL Chaldean sum 32 -> 5

  const moolank2 = NumerologyCalculator.calculateMoolank('1996-12-28');
  const bhagyank2 = NumerologyCalculator.calculateBhagyank('1996-12-28');
  const naamank2 = NumerologyCalculator.calculateNaamank('PRIYA VERMA', 'chaldean');

  assert.strictEqual(moolank2, 1); // 28 -> 2+8 = 10 -> 1
  assert.strictEqual(bhagyank2.bhagyank, 2); // 1+9+9+6+1+2+2+8 = 38 -> 11 -> 2
  assert.strictEqual(naamank2.root, 4); // PRIYA VERMA Chaldean sum 31 -> 4

  // Ensure p1 and p2 are isolated
  assert.notStrictEqual(moolank1, moolank2);
  assert.notStrictEqual(bhagyank1.bhagyank, bhagyank2.bhagyank);
  assert.notStrictEqual(naamank1.root, naamank2.root);
});
