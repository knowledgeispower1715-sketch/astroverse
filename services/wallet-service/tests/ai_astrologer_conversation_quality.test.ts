import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server';
import http from 'http';

interface AiChatTurnRequest {
  category?: string;
  question: string;
  dob?: string | null;
  lat?: number | null;
  lon?: number | null;
  timezone?: string | null;
  astrologer_name?: string | null;
  session_history?: Array<{ role: string; content: string }>;
  lang?: string;
}

let server: http.Server;
let baseUrl: string;

test.before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

async function askAi(payload: AiChatTurnRequest): Promise<any> {
  const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 200, `Expected HTTP 200, got ${res.status}`);
  return await res.json();
}

const ARYAN_CHART = {
  dob: '2005-08-20T14:05:00',
  lat: 23.1686,
  lon: 79.9534,
  timezone: 'Asia/Kolkata',
  astrologer_name: 'Acharya Devratan'
};

test('ASTROVERSE AI ASTROLOGER 6-TURN GOLDEN CONVERSATION QUALITY SUITE', async (t) => {

  await t.test('Turn 1 (Greeting): English - Personalized welcome grounded in Scorpio Lagna & Aquarius Moon', async () => {
    const data = await askAi({
      ...ARYAN_CHART,
      question: 'hi',
      session_history: [],
      lang: 'en'
    });

    assert.equal(data.intent, 'greeting');
    assert.equal(data.mode, 'PERSONALIZED_CHART_GROUNDED');
    assert.equal(data.profile_loaded, true);
    assert.match(data.message, /Pranam! I am Acharya Devratan/);
    assert.match(data.message, /Scorpio Lagna/i);
    assert.match(data.message, /Aquarius Moon/i);
    assert.match(data.message, /Jupiter/i);
    assert.match(data.message, /Venus/i);
    assert.ok(data.suggestedQuestions.length >= 3);
  });

  await t.test('Turn 1 (Greeting): Hindi - 100% Devanagari personalized welcome without English leakage', async () => {
    const data = await askAi({
      ...ARYAN_CHART,
      question: 'नमस्ते',
      session_history: [],
      lang: 'hi'
    });

    assert.equal(data.intent, 'greeting');
    assert.match(data.message, /प्रणाम! मैं आचार्य देवव्रतन/);
    assert.match(data.message, /वृश्चिक लग्न/);
    assert.match(data.message, /कुंभ/);
    assert.match(data.message, /गुरु-शुक्र दशा|बृहस्पति/);
    // Ensure suggested questions are in Devanagari Hindi
    assert.ok(data.suggestedQuestions.some((q: string) => /[\u0900-\u097F]/.test(q)));
  });

  await t.test('Turn 2 (Career): Eliminates repeated persona greeting and addresses 10th House Leo / Sun', async () => {
    const history = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Pranam! I am Acharya Devratan. I have analyzed your calculated chart: Scorpio Lagna...' }
    ];

    const data = await askAi({
      ...ARYAN_CHART,
      question: 'my career',
      session_history: history,
      lang: 'en'
    });

    assert.equal(data.intent, 'career');
    // Repetition Guard: Turn 2+ MUST NOT repeat the greeting intro
    assert.doesNotMatch(data.message, /^Pranam! I am Acharya Devratan/);
    assert.match(data.message, /Scorpio Lagna/i);
    assert.match(data.message, /10th House/i);
    assert.match(data.message, /Sun/i);
  });

  await t.test('Turn 2 (Career): Hindi - Honors language selection with Devanagari content and zero greeting repetition', async () => {
    const history = [
      { role: 'user', content: 'नमस्ते' },
      { role: 'assistant', content: 'प्रणाम! मैं आचार्य देवव्रतन हूँ...' }
    ];

    const data = await askAi({
      ...ARYAN_CHART,
      question: 'मेरे करियर के बारे में बताएं',
      session_history: history,
      lang: 'hi'
    });

    assert.equal(data.intent, 'career');
    assert.doesNotMatch(data.message, /^प्रणाम! मैं आचार्य देवव्रतन हूँ/);
    assert.match(data.message, /दशम भाव/);
    assert.match(data.message, /सूर्य देव/);
    assert.match(data.message, /वृश्चिक लग्न/);
  });

  await t.test('Turn 3 (Career Transit Timing): Routes to fine-grained transit analysis without repeated greeting', async () => {
    const history = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Pranam! Welcome...' },
      { role: 'user', content: 'my career' },
      { role: 'assistant', content: 'Analyzing your 10th house...' }
    ];

    const data = await askAi({
      ...ARYAN_CHART,
      question: 'Which upcoming transit supports a career switch or business?',
      session_history: history,
      lang: 'en'
    });

    assert.equal(data.intent, 'career_transit_timing');
    assert.doesNotMatch(data.message, /^Pranam! I am Acharya Devratan/);
    // Verified transit milestones
    assert.match(data.message, /Jupiter/i);
    assert.match(data.message, /Cancer/i); // Exaltation window in 9th house
    assert.match(data.message, /Saturn/i); // Saturn in Pisces 5th
    assert.match(data.message, /Pisces/i);
    assert.doesNotMatch(data.message, /Three Pillars of Jyotish/i); // No generic lecture
  });

  await t.test('Turn 4 (Dasha Career Stability): Grounded in Jupiter-Venus and maintains dasha consistency', async () => {
    const history = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Welcome...' },
      { role: 'user', content: 'my career' },
      { role: 'assistant', content: 'Career analysis...' },
      { role: 'user', content: 'Which upcoming transit supports a career switch or business?' },
      { role: 'assistant', content: 'Transit analysis...' }
    ];

    const data = await askAi({
      ...ARYAN_CHART,
      question: 'How does my active Dasha period affect professional stability?',
      session_history: history,
      lang: 'en'
    });

    assert.equal(data.intent, 'dasha_career_stability');
    assert.doesNotMatch(data.message, /^Pranam! I am Acharya Devratan/);
    // Dasha Consistency Check: Active Dasha MUST be Jupiter-Venus, NEVER unverified Jupiter-Sun
    assert.match(data.message, /Jupiter.*Mahadasha.*Venus.*Antardasha|Jupiter-Venus/i);
    assert.doesNotMatch(data.message, /Jupiter-Sun/i);
    // Substantive house lordship evaluation
    assert.match(data.message, /2nd.*5th/i); // Jupiter rules 2nd and 5th
    assert.match(data.message, /7th.*12th|11th House/i); // Venus rules 7th/12th in 11th
    assert.doesNotMatch(data.message, /Three synchronized pillars/i); // No generic 3-pillar lecture
  });

  await t.test('Turn 5 (Ambiguous Future): Returns structured 4-option inquiry instead of a broad foundation lecture', async () => {
    const history = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Welcome...' }
    ];

    const data = await askAi({
      ...ARYAN_CHART,
      question: 'future',
      session_history: history,
      lang: 'en'
    });

    assert.equal(data.intent, 'ambiguous_future');
    assert.doesNotMatch(data.message, /^Pranam! I am Acharya Devratan/);
    // Disambiguation prompt structure: 4 distinct pillars
    assert.match(data.message, /Career & Professional Trajectory/i);
    assert.match(data.message, /Financial Accumulation & Dhana Yogas/i);
    assert.match(data.message, /Marriage & Relationship Milestones/i);
    assert.match(data.message, /Spiritual Path & Transit Remedies/i);
    assert.doesNotMatch(data.message, /Three synchronized pillars: Bhava, Graha, Dasha/i);
  });

  await t.test('Turn 6 (Marriage): Evaluates Manglik as Mitigated (Aries Swakshetra BPHS) and gives Scorpio remedies', async () => {
    const history = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Welcome...' },
      { role: 'user', content: 'future' },
      { role: 'assistant', content: 'Clarifying future inquiries...' }
    ];

    const data = await askAi({
      ...ARYAN_CHART,
      question: 'marriage',
      session_history: history,
      lang: 'en'
    });

    assert.equal(data.intent, 'marriage');
    assert.doesNotMatch(data.message, /^Pranam! I am Acharya Devratan/);
    assert.match(data.message, /7th House/i);
    assert.match(data.message, /Taurus/i);
    assert.match(data.message, /Venus/i);

    // Manglik Status Integrity: Must report Mitigated with Swakshetra cancellation
    assert.match(data.message, /Mitigated \/ Pacified \(Aries Swakshetra BPHS Cancellation\)/i);
    // Must NOT contradict with Kuja Dosha Free
    assert.doesNotMatch(data.message, /No Manglik Dosha \(Kuja Dosha Free\)/i);

    // Scorpio Remedy Integrity:
    assert.ok(data.remedyCard, 'Remedy card must be provided');
    assert.doesNotMatch(data.remedyCard.title, /Virgo/i);
    assert.doesNotMatch(data.remedyCard.gemstone_note, /for Lagna Virgo/i);
    // Emerald (Panna) is strictly contraindicated for Scorpio Lagna
    assert.match(data.remedyCard.gemstone_note, /Emerald.*contraindicated|White Zircon/i);
  });

  await t.test('Remedy Route Integrity: Scorpio Lagna prescribes Red Coral / Yellow Sapphire and excludes Emerald', async () => {
    const data = await askAi({
      ...ARYAN_CHART,
      question: 'Which gemstone and mantra are prescribed for my chart?',
      session_history: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Welcome' }],
      lang: 'en'
    });

    assert.equal(data.intent, 'remedy');
    assert.ok(data.remedyCard, 'Must return remedyCard');
    assert.match(data.remedyCard.title, /Scorpio Lagna/i);
    assert.doesNotMatch(data.remedyCard.title, /Virgo/i);
    assert.match(data.remedyCard.gemstone_note, /Red Coral|Yellow Sapphire/i);
    assert.match(data.remedyCard.gemstone_note, /Emerald.*strictly contraindicated/i);
    assert.match(data.remedyCard.mantra, /Maha Mrityunjaya/i);
  });

  await t.test('Repetition Guard on Consecutive Greetings: Turn 2+ greeting returns concise assistance prompt', async () => {
    const history = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Pranam! I am Acharya Devratan. I have analyzed your calculated chart: Scorpio Lagna...' },
      { role: 'user', content: 'my career' },
      { role: 'assistant', content: 'Analyzing your 10th house...' }
    ];

    const data = await askAi({
      ...ARYAN_CHART,
      question: 'hello',
      session_history: history,
      lang: 'en'
    });

    assert.equal(data.intent, 'greeting');
    // Does NOT reprint full 4-paragraph introduction
    assert.doesNotMatch(data.message, /### Strategic Guidance & Consultation/i);
    assert.match(data.message, /How may I assist your astrological exploration today\?/i);
    assert.match(data.message, /Scorpio Lagna/i);
  });
});
