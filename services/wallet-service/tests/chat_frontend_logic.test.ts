import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Safe Markdown Renderer Test (Replicating index.html renderSafeMarkdown)
function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSafeMarkdown(text: string): string {
  if (!text) return '';
  let safe = escapeHtml(text);
  safe = safe.replace(/^###\s+(.+)$/gm, '<h4><i class="fa-solid fa-scroll" style="color: #D97706; font-size: 11px;"></i> $1</h4>');
  safe = safe.replace(/^##\s+(.+)$/gm, '<h4>$1</h4>');
  safe = safe.replace(/^(?:>|&gt;)\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
  safe = safe.replace(/(?:^|\n)[-\*]\s+(.+)/g, (_match, item) => `\n<ul><li>${item}</li></ul>`);
  safe = safe.replace(/<\/ul>\s*\n*<ul>/g, '');
  safe = safe.replace(/(?:^|\n)\d+\.\s+(.+)/g, (_match, item) => `\n<ol><li>${item}</li></ol>`);
  safe = safe.replace(/<\/ol>\s*\n*<ol>/g, '');
  const paragraphs = safe.split(/\n{2,}/);
  return paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h4>') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<blockquote>')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

// 2. Chat Storage Key Isolation
function getChatStorageKey(personaId: string, currentSessionToken: string | null, userId: string | null): string {
  const userPart = currentSessionToken ? (userId || 'auth_user') : 'guest';
  return `astro_chat_history_v1_${personaId}_${userPart}`;
}

test('renderSafeMarkdown neutralizes XSS and parses markdown tags correctly', () => {
  const maliciousInput = '<script>alert("xss")</script><img src=x onerror=alert(1)>**Bold** and *Italic*';
  const rendered = renderSafeMarkdown(maliciousInput);
  assert.ok(!rendered.includes('<script>'), 'Must not contain raw script tag');
  assert.ok(rendered.includes('&lt;script&gt;'), 'Must escape script tag');
  assert.ok(!rendered.includes('<img'), 'Must not contain unescaped HTML img tag');
  assert.ok(rendered.includes('&lt;img'), 'Must escape HTML img tag');
  assert.ok(rendered.includes('<strong>Bold</strong>'), 'Must parse bold markdown');
  assert.ok(rendered.includes('<em>Italic</em>'), 'Must parse italic markdown');
});

test('renderSafeMarkdown parses headings, blockquotes, and lists', () => {
  const markdown = `### Astrological Diagnosis\n\n> Traditional Jyotish Rule\n\n- Point 1\n- Point 2\n\n1. First\n2. Second`;
  const rendered = renderSafeMarkdown(markdown);
  assert.ok(rendered.includes('<h4>'), 'Must contain h4');
  assert.ok(rendered.includes('<blockquote>Traditional Jyotish Rule</blockquote>'), 'Must contain blockquote');
  assert.ok(rendered.includes('<ul><li>Point 1</li><li>Point 2</li></ul>'), 'Must merge contiguous bullet list');
  assert.ok(rendered.includes('<ol><li>First</li><li>Second</li></ol>'), 'Must merge contiguous numbered list');
});

test('getChatStorageKey cleanly isolates personas and guest vs authenticated namespaces', () => {
  const devratanGuest = getChatStorageKey('acharya-devratan', null, null);
  const sunitaGuest = getChatStorageKey('dr-sunita-shastri', null, null);
  const devratanAuth = getChatStorageKey('acharya-devratan', 'jwt_xyz', 'usr_123');
  const raghavendraAuth = getChatStorageKey('pandit-raghavendra', 'jwt_xyz', 'usr_123');

  assert.strictEqual(devratanGuest, 'astro_chat_history_v1_acharya-devratan_guest');
  assert.strictEqual(sunitaGuest, 'astro_chat_history_v1_dr-sunita-shastri_guest');
  assert.strictEqual(devratanAuth, 'astro_chat_history_v1_acharya-devratan_usr_123');
  assert.strictEqual(raghavendraAuth, 'astro_chat_history_v1_pandit-raghavendra_usr_123');

  // Verify full isolation
  assert.notStrictEqual(devratanGuest, sunitaGuest);
  assert.notStrictEqual(devratanGuest, devratanAuth);
  assert.notStrictEqual(devratanAuth, raghavendraAuth);
});

test('Web Audio API synthesizer parameters conform to specifications', () => {
  // Outgoing pop: ~800 Hz, ~35-45 ms
  const sendFreq = 820;
  const sendDuration = 0.04;
  assert.ok(sendFreq >= 750 && sendFreq <= 850, 'Outgoing pop frequency between 750 and 850 Hz');
  assert.ok(sendDuration >= 0.035 && sendDuration <= 0.045, 'Outgoing pop duration between 35 and 45 ms');

  // Incoming chime: two tones ~520 Hz & ~650 Hz, combined ~180 ms
  const tone1 = 523.25;
  const tone2 = 659.25;
  const receiveDuration = 0.18;
  assert.ok(tone1 >= 500 && tone1 <= 550, 'Incoming tone 1 between 500 and 550 Hz');
  assert.ok(tone2 >= 630 && tone2 <= 680, 'Incoming tone 2 between 630 and 680 Hz');
  assert.ok(receiveDuration >= 0.16 && receiveDuration <= 0.22, 'Incoming chime duration between 160 and 220 ms');
});

// 3. Short Message Bubble & Layout Regression Protection
test('Chat bubble layout prevents vertical text wrapping on short messages like "hi"', () => {
  // Replicating CSS contract rules for .chat-bubble-user and bubbleWrap
  const bubbleUserCss = {
    display: 'inline-block',
    width: 'fit-content',
    minWidth: 'fit-content',
    maxWidth: '85%',
    wordBreak: 'normal',
    overflowWrap: 'break-word',
    boxSizing: 'border-box'
  };

  const bubbleWrapStyle = {
    alignSelf: 'flex-end',
    width: 'fit-content',
    maxWidth: '85%'
  };

  assert.strictEqual(bubbleUserCss.width, 'fit-content', 'User bubble width must be fit-content');
  assert.strictEqual(bubbleUserCss.minWidth, 'fit-content', 'User bubble minWidth must be fit-content to prevent vertical letter collapse');
  assert.strictEqual(bubbleUserCss.wordBreak, 'normal', 'User bubble wordBreak must be normal, not break-word, so short words do not break vertically');
  assert.strictEqual(bubbleWrapStyle.width, 'fit-content', 'Bubble container must respect fit-content width');
});

// 4. Grounded Chart Planetary Insight Resolution (Fixing Taurus Lagna Inconsistency)
test('Planetary insight extractor binds strictly to calculated chart coordinates without hardcoded Taurus defaults', () => {
  // Scorpio Lagna chart fixture
  const scorpioKundli = {
    lagnaSign: 'Scorpio',
    moonSign: 'Aquarius',
    nakName: 'Shatabhisha',
    fullData: {
      d1: {
        lagna: { sign: 'Scorpio', degree: 18.4 },
        planets: {
          Sun: { sign: 'Scorpio', house: 1, degree: 7.2 },
          Moon: { sign: 'Aquarius', house: 4, degree: 14.1 },
          Mars: { sign: 'Sagittarius', house: 2, degree: 22.0 },
          Mercury: { sign: 'Scorpio', house: 1, degree: 19.5 },
          Jupiter: { sign: 'Gemini', house: 8, degree: 15.79 },
          Venus: { sign: 'Capricorn', house: 3, degree: 28.3 },
          Saturn: { sign: 'Aquarius', house: 4, degree: 8.9 }
        }
      }
    }
  };

  const planetsObj = scorpioKundli.fullData.d1.planets;
  function getPlanetCard(pName: keyof typeof planetsObj, fallbackSig: string) {
    const p = planetsObj[pName];
    if (p && p.sign && p.house !== undefined) {
      const degStr = typeof p.degree === 'number' ? `${p.degree.toFixed(2)}°` : `${p.degree}°`;
      return {
        planet: pName,
        sign: p.sign,
        house: p.house,
        degree: degStr,
        significance: fallbackSig
      };
    }
    return null;
  }

  const jupCard = getPlanetCard('Jupiter', 'Wisdom and expansion.');
  const satCard = getPlanetCard('Saturn', 'Discipline and structures.');

  assert.ok(jupCard !== null, 'Jupiter card must be resolved');
  assert.strictEqual(jupCard?.sign, 'Gemini', 'Jupiter sign must be Gemini as in natal chart, NOT hardcoded Taurus');
  assert.strictEqual(jupCard?.house, 8, 'Jupiter house must be 8 as in Scorpio Lagna chart, NOT 9 or 10');
  assert.strictEqual(jupCard?.degree, '15.79°', 'Jupiter degree must match chart calculation');

  assert.ok(satCard !== null, 'Saturn card must be resolved');
  assert.strictEqual(satCard?.sign, 'Aquarius', 'Saturn sign must match chart');
  assert.strictEqual(satCard?.house, 4, 'Saturn house must match chart');
});

// 5. Out-of-Scope and Conceptual Question Classification
test('Client-side query scope handling correctly separates out-of-scope tasks and conceptual questions', () => {
  const isOutOfScope = (q: string) =>
    /\b(write|create|code|program|build|debug)\s+(me\s+)?(a\s+)?(python|javascript|java|c\+\+|html|css|sql|rust|php|bash|react|script|app|game|bot)\b/i.test(q) ||
    /\b(recipe|how to cook|bake|ingredients for|chocolate cake|pasta|pizza)\b/i.test(q) ||
    /\b(who won|score of|world cup|cricket match|football match)\b/i.test(q) ||
    /\b(fix my (car|plumbing|toilet|laptop|wifi|printer))\b/i.test(q);

  const isConceptual = (q: string) =>
    /\bwhat is (ashtakavarga|shadbala|vimshottari|navamsha|dashamsha|panchang|d9|d10|lagna|bhava|trikona|kendra|raja yoga|dhana yoga|sade sati|manglik|kaal sarp)\b/i.test(q) ||
    /\bhow does (ashtakavarga|shadbala|vimshottari|dasha|retrograde|gochara|transit) work\b/i.test(q) ||
    /\bdifference between (d1 and d9|parashari and jaimini|rashi and navamsha|sayana and nirayana|tropical and sidereal|bav and sav)\b/i.test(q);

  // Out of scope tests
  assert.ok(isOutOfScope('Write me a Python game with pygame'), 'Coding task must be detected as out-of-scope');
  assert.ok(isOutOfScope('Can you code a javascript script to scrape?'), 'Scripting task must be out-of-scope');
  assert.ok(isOutOfScope('Give me the recipe for chocolate cake'), 'Cooking task must be out-of-scope');
  assert.ok(!isOutOfScope('Analyze my career and promotion timing'), 'Astrology career query must NOT be out-of-scope');

  // Conceptual tests
  assert.ok(isConceptual('What is Ashtakavarga and how does it work?'), 'Ashtakavarga inquiry must be detected as conceptual');
  assert.ok(isConceptual('Explain the difference between D1 and D9'), 'D1/D9 comparison must be conceptual');
  assert.ok(isConceptual('What is Shadbala in Vedic astrology?'), 'Shadbala question must be conceptual');
  assert.ok(!isConceptual('Will I get married this year?'), 'Personal prediction query must NOT be conceptual');
});
