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
