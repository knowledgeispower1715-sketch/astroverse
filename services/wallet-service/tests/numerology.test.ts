process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_numerology_test_12345';
import assert from 'assert';
import http from 'http';
import app from '../src/server';
import { NumerologyCalculator } from '../src/monetization/numerologyCalculator';
import { ReportDocumentGenerator } from '../src/monetization/reportGenerator';

async function runNumerologyTests() {
  console.log('===============================================================');
  console.log('ASTROVERSE NUMEROLOGY ENGINE & TS API INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  let passCount = 0;
  let failCount = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`[PASS] ${name}`);
            passCount++;
          })
          .catch((err: any) => {
            console.error(`[FAIL] ${name}:`, err.message);
            failCount++;
          });
      } else {
        console.log(`[PASS] ${name}`);
        passCount++;
      }
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failCount++;
    }
  }

  // 1. Core Calculator Unit Tests
  test('digitRoot1To9 correctly reduces numbers and handles bounds', () => {
    assert.strictEqual(NumerologyCalculator.digitRoot1To9(0), 0);
    assert.strictEqual(NumerologyCalculator.digitRoot1To9(1), 1);
    assert.strictEqual(NumerologyCalculator.digitRoot1To9(9), 9);
    assert.strictEqual(NumerologyCalculator.digitRoot1To9(10), 1);
    assert.strictEqual(NumerologyCalculator.digitRoot1To9(29), 2);
    assert.strictEqual(NumerologyCalculator.digitRoot1To9(20050820), 8);
    assert.throws(() => NumerologyCalculator.digitRoot1To9(-5));
  });

  test('calculateMoolank: Day 20 -> 2, Day 31 -> 4, Day 29 -> 2', () => {
    assert.strictEqual(NumerologyCalculator.calculateMoolank('2005-08-20'), 2);
    assert.strictEqual(NumerologyCalculator.calculateMoolank('1990-01-31'), 4);
    assert.strictEqual(NumerologyCalculator.calculateMoolank('1995-12-29'), 2);
    assert.strictEqual(NumerologyCalculator.calculateMoolank('2000-05-01'), 1);
    assert.throws(() => NumerologyCalculator.calculateMoolank('invalid-date'));
  });

  test('calculateBhagyank: 2005-08-20 -> Sum 17 -> Bhagyank 8', () => {
    const res = NumerologyCalculator.calculateBhagyank('2005-08-20');
    assert.strictEqual(res.sum, 17);
    assert.strictEqual(res.bhagyank, 8);
  });

  test('Chaldean & Pythagorean exact known values: ARYAN -> Chaldean 10/1, Pythagorean 23/5', () => {
    const ch = NumerologyCalculator.calculateNaamank('ARYAN', 'chaldean');
    assert.strictEqual(ch.compound, 10);
    assert.strictEqual(ch.root, 1);
    assert.strictEqual(ch.breakdown.length, 5);

    const py = NumerologyCalculator.calculateNaamank('ARYAN', 'pythagorean');
    assert.strictEqual(py.compound, 23);
    assert.strictEqual(py.root, 5);
    assert.strictEqual(py.breakdown.length, 5);
  });

  test('Planetary relationship 9x9 matrix: Sun (1) & Saturn (8) are enemies', () => {
    const rel18 = NumerologyCalculator.getPlanetaryRelationship(1, 8);
    assert.strictEqual(rel18.relation, 'enemy');
    assert.strictEqual(rel18.score, 30);

    const rel11 = NumerologyCalculator.getPlanetaryRelationship(1, 1);
    assert.strictEqual(rel11.relation, 'friendly');
    assert.strictEqual(rel11.score, 100);

    const rel12 = NumerologyCalculator.getPlanetaryRelationship(1, 2);
    assert.strictEqual(rel12.relation, 'friendly');
  });

  test('Weighted Harmony formula: 0.40 Moolank + 0.40 Bhagyank + 0.20 Compound', () => {
    const harm = NumerologyCalculator.calculateHarmonyScore(1, 1, 1, 19);
    assert(harm.score >= 80, `Expected high harmony score, got ${harm.score}`);
    assert.strictEqual(harm.status, 'excellent');
  });

  test('Bounded Name Correction generator produces 3-5 candidates with edit distance <= 2', () => {
    const candidates = NumerologyCalculator.generateNameCorrectionCandidates('Aryan', 2, 8);
    assert(candidates.length >= 2, `Expected candidates, got ${candidates.length}`);
    for (const c of candidates) {
      assert(c.editDistance <= 2, `Edit distance must be <= 2, got ${c.editDistance}`);
      assert(c.chaldeanRoot >= 1 && c.chaldeanRoot <= 9);
      assert(c.suitabilityScore >= 0 && c.suitabilityScore <= 100);
    }
  });

  test('Bounded Name Correction generator produces 5 culturally appropriate candidates with edit distance <= 2 for RAHUL', () => {
    const candidates = NumerologyCalculator.generateNameCorrectionCandidates('RAHUL', 1, 5, 5);
    assert.strictEqual(candidates.length, 5, `Expected 5 candidates, got ${candidates.length}`);
    const names = candidates.map(c => c.proposedName);
    // Ensure no bizarre RHAHUL or RRAHUL
    assert(!names.includes('RHAHUL'), 'Must not produce unnatural RHAHUL');
    assert(!names.includes('RRAHUL'), 'Must not produce unnatural initial consonant doubling RRAHUL');
    for (const c of candidates) {
      assert(c.editDistance <= 2, `Edit distance must be <= 2, got ${c.editDistance}`);
      assert(c.chaldeanRoot >= 1 && c.chaldeanRoot <= 9);
      assert(c.suitabilityScore >= 0 && c.suitabilityScore <= 100);
      assert(c.transformationNote && c.transformationNote.length > 5);
    }
    // Verify candidates have diverse, non-identical scores where compounds differ
    const scores = new Set(candidates.map(c => c.harmonyScore));
    assert(scores.size > 1, 'Candidates with different compounds must have distinct harmony scores');
  });

  test('Signature Guidance returns auspicious ascending slope and grounding underline', () => {
    const sig = NumerologyCalculator.getSignatureGuidance(1, 'Aryan');
    assert(sig.recommendedSlope.includes('15') || sig.recommendedSlope.includes('ascend'));
    assert(sig.underlineRule.length > 0);
    assert(sig.dotRule.length > 0);
  });

  test('Business Name and Mobile Number analysis', () => {
    const biz = NumerologyCalculator.analyzeBusinessName('AstroVerse Studio', 'Technology', 2, 8);
    assert.strictEqual(biz.normalizedName, 'ASTROVERSE STUDIO');
    assert(biz.chaldeanCompound > 0);

    const mob = NumerologyCalculator.analyzeMobileNumber('+91 98765 43210', 2, 8);
    assert.strictEqual(mob.masked, '+91-XXXXX-43210');
    assert(mob.digitSum > 0);
    assert(mob.root >= 1 && mob.root <= 9);
  });

  // 2. Report Document Generator for 15-chapter numerology report
  await test('ReportDocumentGenerator generates report_vedic_name_numerology with 15 chapters', async () => {
    const syntheticUser = {
      id: 'usr_num_test_01',
      displayName: 'Aryan Tiwari',
      email: 'aryan@astroverse.app'
    };
    const syntheticProfile = {
      id: 'prof_num_tiwari_01',
      profileName: 'Aryan Tiwari',
      dateOfBirth: '2005-08-20',
      timeOfBirth: '14:05',
      birthplaceName: 'Jabalpur, Madhya Pradesh, India',
      latitude: 23.16697,
      longitude: 79.95006,
      resolvedTimezone: 'Asia/Kolkata',
      birthTimeKnown: true
    };

    const doc = await ReportDocumentGenerator.generateReport(
      'report_vedic_name_numerology',
      syntheticUser,
      syntheticProfile
    );

    assert.strictEqual(doc.productId, 'report_vedic_name_numerology');
    assert.strictEqual(doc.sections.length, 15, `Expected 15 chapters, got ${doc.sections.length}`);

    // Check specific chapters
    assert.strictEqual(doc.sections[0].sectionId, 'sec_num_ch1_exec');
    assert.strictEqual(doc.sections[1].sectionId, 'sec_num_ch2_moolank');
    assert.strictEqual(doc.sections[2].sectionId, 'sec_num_ch3_bhagyank');
    assert.strictEqual(doc.sections[3].sectionId, 'sec_num_ch4_chaldean');
    assert.strictEqual(doc.sections[4].sectionId, 'sec_num_ch5_pythagorean');
    assert.strictEqual(doc.sections[5].sectionId, 'sec_num_ch6_compound');
    assert.strictEqual(doc.sections[6].sectionId, 'sec_num_ch7_matrix');
    assert.strictEqual(doc.sections[7].sectionId, 'sec_num_ch8_harmony');
    assert.strictEqual(doc.sections[8].sectionId, 'sec_num_ch9_candidates');
    assert.strictEqual(doc.sections[14].sectionId, 'sec_num_ch15_verification');

    // Confirm substantive text
    const fullProse = doc.sections.map((s: any) => s.contentMarkdown).join('\n');
    assert(fullProse.includes('Moolank'), 'Report must mention Moolank');
    assert(fullProse.includes('Bhagyank'), 'Report must mention Bhagyank');
    assert(fullProse.includes('Chaldean'), 'Report must mention Chaldean');
    assert(fullProse.includes('Pythagorean'), 'Report must mention Pythagorean');

    // Verify calculation provenance & ayanamsha are numerology-specific
    assert.strictEqual(doc.calculationSettings.provenance, 'Vedic Numerology & Cheiro/Pythagorean Harmonic Systems');
    assert.strictEqual(doc.calculationSettings.ayanamsha, 'N/A (Chaldean & Pythagorean Sound Vibration)');
    assert.strictEqual(doc.calculationSettings.engineVersion, 'AstroVerse Vedic Numerology Engine v2.5.0');
  });

  // 3. HTTP Server Endpoints
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  async function request(path: string, options: any = {}) {
    const url = `http://127.0.0.1:${port}${path}`;
    const headers = options.headers || {};
    let body = options.body;
    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { status: res.status, data };
  }

  await test('POST /api/numerology/analyze returns 200 with valid calculation', async () => {
    const res = await request('/api/numerology/analyze', {
      method: 'POST',
      body: {
        name: 'Aryan Tiwari',
        dateOfBirth: '2005-08-20'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.birthNumber.value, 2);
    assert.strictEqual(res.data.destinyNumber.value, 8);
    assert(res.data.harmony.score >= 0);
  });

  await test('POST /api/numerology/analyze rejects missing required fields with 400', async () => {
    const res = await request('/api/numerology/analyze', {
      method: 'POST',
      body: {
        name: 'Aryan'
      }
    });
    assert.strictEqual(res.status, 400);
  });

  await test('POST /api/numerology/correct-name rejects unauthenticated request with 401', async () => {
    const res = await request('/api/numerology/correct-name', {
      method: 'POST',
      body: {
        name: 'Aryan Tiwari',
        dateOfBirth: '2005-08-20'
      }
    });
    assert.strictEqual(res.status, 401);
  });

  await test('POST /api/numerology/analyze rejects unauthenticated business_name request with 403 UPGRADE_REQUIRED', async () => {
    const res = await request('/api/numerology/analyze', {
      method: 'POST',
      body: {
        name: 'AstroVerse Technologies',
        analysisTarget: 'business_name',
        industry: 'Technology & Software'
      }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.error, 'UPGRADE_REQUIRED');
  });

  await test('POST /api/numerology/analyze handles business_name without birthDate and omits founderSynergy', async () => {
    const res = await request('/api/numerology/analyze', {
      method: 'POST',
      headers: { 'x-simulated-tier': 'PLUS' },
      body: {
        name: 'AstroVerse Technologies',
        analysisTarget: 'business_name',
        industry: 'Technology & Software'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.target, 'business_name');
    assert.strictEqual(res.data.founderSynergy, null);
    assert.strictEqual(res.data.harmony, null);
    assert(res.data.nameNumbers.chaldean.compoundTotal > 0);
  });

  await test('POST /api/numerology/analyze handles business_name with valid founder DOB and computes founderSynergy', async () => {
    const res = await request('/api/numerology/analyze', {
      method: 'POST',
      headers: { 'x-simulated-tier': 'PLUS' },
      body: {
        name: 'AstroVerse Technologies',
        analysisTarget: 'business_name',
        birthDate: '1990-05-15',
        industry: 'Technology & Software'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.notStrictEqual(res.data.founderSynergy, null);
    assert.strictEqual(res.data.founderSynergy.founderMoolank, 6);
    assert(res.data.founderSynergy.harmony.score >= 0);
  });

  await test('POST /api/numerology/analyze rejects business_name with future founder DOB with 400', async () => {
    const res = await request('/api/numerology/analyze', {
      method: 'POST',
      headers: { 'x-simulated-tier': 'PLUS' },
      body: {
        name: 'AstroVerse Technologies',
        analysisTarget: 'business_name',
        birthDate: '2099-01-01'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'FUTURE_BIRTH_DATE');
  });

  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log('\n===============================================================');
  console.log(`NUMEROLOGY TEST SUITE FINISHED: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runNumerologyTests().catch((err) => {
  console.error('Fatal numerology test error:', err);
  process.exit(1);
});
