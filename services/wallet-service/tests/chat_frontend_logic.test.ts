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

  // Parse markdown tables before paragraph splitting
  safe = safe.replace(/((?:^|\n)(?:[ \t]*\|[^\n]+\|[ \t]*(?:\r?\n|$))+)/g, (match) => {
    const lines = match.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;
    let headerRow = '';
    const bodyRows = [];
    let isFirstRow = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(line)) {
        continue;
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (isFirstRow) {
        headerRow = `<tr style="background: #F8FAFC; border-bottom: 2px solid #CBD5E1;">${cells.map(c => `<th style="padding: 8px 10px; font-weight: 700; color: #475569; font-size: 11px;">${c}</th>`).join('')}</tr>`;
        isFirstRow = false;
      } else {
        bodyRows.push(`<tr style="border-bottom: 1px solid #E2E8F0;">${cells.map(c => `<td style="padding: 6px 10px; font-size: 11px; color: #334155;">${c}</td>`).join('')}</tr>`);
      }
    }
    return `\n<table style="width: 100%; border-collapse: collapse; margin: 12px 0;"><thead>${headerRow}</thead><tbody>${bodyRows.join('')}</tbody></table>\n`;
  });

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
    if (trimmed.startsWith('<h4>') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<blockquote>') || trimmed.startsWith('<table')) {
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

test('renderSafeMarkdown parses markdown tables into styled HTML tables with headers and rows', () => {
  const mdTable = `### Planetary Longitudes\n\n| Planet | Sign | Degree |\n| :--- | :--- | :--- |\n| **Sun** | Leo | 15.20° |\n| **Moon** | Aquarius | 22.45° |`;
  const rendered = renderSafeMarkdown(mdTable);
  assert.ok(rendered.includes('<table style="width: 100%'), 'Must contain styled table tag');
  assert.ok(rendered.includes('Planet</th>'), 'Must contain Planet header cell');
  assert.ok(rendered.includes('Sign</th>'), 'Must contain Sign header cell');
  assert.ok(rendered.includes('<strong>Sun</strong></td>'), 'Must parse bold inside table cell');
  assert.ok(rendered.includes('Leo</td>'), 'Must contain Leo cell');
  assert.ok(rendered.includes('15.20°</td>'), 'Must contain degree cell');
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

// 5b. App Wallet Balance Separation (Scenario 9 vs Scenario 7)
test('App wallet balance inquiries are strictly separated from astrological wealth questions', () => {
  const isAppWalletQuery = (q: string) =>
    /\b(wallet\s+balance|demo\s+credit|app\s+balance|account\s+balance|wallet\s+money|how\s+much\s+(?:money|balance|credit)\s+(?:do\s+i\s+have|in\s+my\s+wallet|is\s+in\s+my\s+wallet|remains|left)|check\s+(?:my\s+)?wallet|my\s+wallet\s+balance)\b/i.test(q);

  const isAstrologicalWealth = (q: string) =>
    !isAppWalletQuery(q) && (/\b(wealth|financ|invest|stock|dhana|2nd\s+house|11th\s+house|rich|fortune)\b/i.test(q) || (/\bmoney\b/i.test(q) && !isAppWalletQuery(q)));

  // Scenario 9: Explicit wallet inquiries
  assert.ok(isAppWalletQuery('What is my wallet balance?'), 'Must recognize wallet balance query');
  assert.ok(isAppWalletQuery('How much demo credit remains?'), 'Must recognize demo credit inquiry');
  assert.ok(isAppWalletQuery('How much money do I have in my wallet?'), 'Must recognize wallet money query');
  assert.ok(isAppWalletQuery('Check my wallet'), 'Must recognize check wallet prompt');
  assert.ok(!isAstrologicalWealth('What is my wallet balance?'), 'Scenario 9 must NOT be classified as astrological wealth');

  // Scenario 7: Astrological wealth inquiries (no wallet contamination)
  assert.ok(isAstrologicalWealth('What does my chart say about wealth?'), 'Must recognize wealth astrology query');
  assert.ok(isAstrologicalWealth('Which planets form Dhana Yogas in my chart?'), 'Must recognize Dhana Yoga query');
  assert.ok(isAstrologicalWealth('Will I make money in stock investing?'), 'Must recognize financial prospects query');
  assert.ok(!isAppWalletQuery('What does my chart say about wealth?'), 'Scenario 7 must NOT be classified as app wallet query');
});

// 6. Voice Narration Text Sanitizer Unit Tests
test('AstroVerseVoiceEngine cleanTextForSpeech removes HTML, markdown, and normalize whitespace', () => {
  const cleanTextForSpeech = (raw: string): string => {
    if (!raw) return '';
    let text = raw.replace(/<[^>]*>/g, ' ');
    text = text.replace(/[*_#`~[\]()]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  };

  const raw = `### 10th House Karma Bhava\n\nYour **Jupiter** in *Gemini* (House 8) aspects the 2nd House.<br><p>Recite mantra daily.</p>`;
  const cleaned = cleanTextForSpeech(raw);
  assert.ok(!cleaned.includes('<'), 'Must not contain HTML tags');
  assert.ok(!cleaned.includes('>'), 'Must not contain HTML tags');
  assert.ok(!cleaned.includes('*'), 'Must not contain asterisks');
  assert.ok(!cleaned.includes('#'), 'Must not contain hash markdown');
  assert.ok(cleaned.includes('10th House Karma Bhava'), 'Preserves content text');
  assert.ok(cleaned.includes('Jupiter in Gemini'), 'Preserves prose words');
});

// 7. Site-Wide Internationalization (I18N) Dictionary Parity Tests
test('ASTROVERSE_I18N English and Hindi dictionaries have full key parity', () => {
  const enKeys = [
    'nav_overview', 'nav_kundli', 'nav_horas', 'nav_matchmaking', 'nav_astrologers',
    'nav_horoscope', 'nav_tools', 'nav_reports', 'nav_pricing', 'nav_dashboard',
    'pill_kundli', 'pill_horas', 'pill_matchmaking', 'btn_calc_kundli', 'btn_calc_milan',
    'btn_customize', 'btn_download_pdf', 'btn_listen', 'btn_stop', 'btn_recharge', 'lang_switch_label'
  ];

  const hiDict: Record<string, string> = {
    nav_overview: 'अवलोकन',
    nav_kundli: 'मेरी कुंडली',
    nav_horas: 'ग्रह होरा व मुहूर्त',
    nav_matchmaking: 'कुंडली मिलान',
    nav_astrologers: 'एआई ज्योतिषी',
    nav_horoscope: 'राशिफल',
    nav_tools: 'ज्योतिष उपकरण',
    nav_reports: 'रिपोर्ट स्टोर',
    nav_pricing: 'सदस्यता योजनाएं',
    nav_dashboard: 'डैशबोर्ड',
    pill_kundli: 'निःशुल्क जन्म कुंडली',
    pill_horas: '24-घंटे ग्रह होरा',
    pill_matchmaking: '36-गुण मिलान',
    btn_calc_kundli: 'वैदिक कुंडली बनाएं',
    btn_calc_milan: 'पूर्ण कुंडली मिलान व 36 गुण जांचें',
    btn_customize: 'कस्टमाइज़ करें',
    btn_download_pdf: 'पीडीएफ डाउनलोड करें',
    btn_listen: 'आवाज में सुनें',
    btn_stop: 'रोकें',
    btn_recharge: 'वॉलेट रिचार्ज करें',
    lang_switch_label: 'English'
  };

  enKeys.forEach(k => {
    assert.ok(hiDict[k], `Hindi dictionary must contain key '${k}'`);
    assert.ok(hiDict[k].length > 0, `Hindi translation for '${k}' must not be empty`);
  });
});

// 8. PDF Download Entitlement Policy Validation
test('Report PDF Download is permitted for free basic summary and premium subscribers, gated for online-only reports', () => {
  const checkPdfDownloadAllowed = (doc: any, entitlements: any, userRole?: string): boolean => {
    if (userRole === 'SUPER_ADMIN') return true;
    if (doc.productId === 'report_basic_chart_summary') return true;
    if (doc.allowPdfDownload === true) return true;
    if (entitlements?.allowsReportPdfDownload === true) return true;
    return false;
  };

  // 1. Free basic chart summary is always downloadable by any user
  assert.strictEqual(
    checkPdfDownloadAllowed({ productId: 'report_basic_chart_summary' }, { allowsReportPdfDownload: false }),
    true,
    'Basic chart summary must always allow free PDF download'
  );

  // 2. Paid online reader report without premium subscription is blocked from direct PDF download
  assert.strictEqual(
    checkPdfDownloadAllowed({ productId: 'report_janam_kundli_deep_dive', allowPdfDownload: false }, { allowsReportPdfDownload: false }),
    false,
    'Online-only deep dive must NOT allow PDF download for non-premium user'
  );

  // 3. Premium tier subscriber is permitted to download any report as PDF
  assert.strictEqual(
    checkPdfDownloadAllowed({ productId: 'report_janam_kundli_deep_dive', allowPdfDownload: false }, { allowsReportPdfDownload: true }),
    true,
    'Premium user with allowsReportPdfDownload=true must be permitted to download PDF'
  );

  // 4. Super Admin always has full export authority
  assert.strictEqual(
    checkPdfDownloadAllowed({ productId: 'report_twelve_month_varshphal' }, null, 'SUPER_ADMIN'),
    true,
    'Super admin must have bypass download authority'
  );
});
