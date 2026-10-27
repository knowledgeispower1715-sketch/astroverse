import os

os.makedirs('assets/illustrations', exist_ok=True)

# 1. HERO ZODIAC WHEEL SVG
hero_zodiac_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <radialGradient id="cosmicGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2A1B4E" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#101A32" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0A1020" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="maroonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#BE123C"/>
      <stop offset="100%" stop-color="#4C0519"/>
    </linearGradient>
  </defs>

  <!-- Cosmic Background -->
  <circle cx="400" cy="400" r="390" fill="url(#cosmicGlow)" stroke="url(#goldGrad)" stroke-width="4"/>

  <!-- Concentric Rings -->
  <circle cx="400" cy="400" r="360" fill="none" stroke="#C6A15B" stroke-width="1.5" stroke-dasharray="4 4"/>
  <circle cx="400" cy="400" r="330" fill="none" stroke="url(#goldGrad)" stroke-width="3"/>
  <circle cx="400" cy="400" r="260" fill="none" stroke="#78350F" stroke-width="1.5"/>
  <circle cx="400" cy="400" r="180" fill="none" stroke="url(#goldGrad)" stroke-width="2"/>

  <!-- 12 Zodiac Radial Sectors & Markers -->
  <g stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.75">
    <line x1="400" y1="70" x2="400" y2="730"/>
    <line x1="70" y1="400" x2="730" y2="400"/>
    <line x1="166" y1="166" x2="634" y2="634"/>
    <line x1="166" y1="634" x2="634" y2="166"/>
    <line x1="235" y1="114" x2="565" y2="686"/>
    <line x1="114" y1="235" x2="686" y2="565"/>
    <line x1="114" y1="565" x2="686" y2="235"/>
    <line x1="235" y1="686" x2="565" y2="114"/>
  </g>

  <!-- 12 Zodiac Glyphs / Signs (Sanskrit & English labels) -->
  <g font-family="'Cinzel', 'Noto Sans Devanagari', serif" font-size="13" font-weight="700" fill="#FCD34D" text-anchor="middle">
    <text x="400" y="105">MESHA • ARIES</text>
    <text x="545" y="145">VRISHABHA • TAURUS</text>
    <text x="655" y="255">MITHUNA • GEMINI</text>
    <text x="695" y="405">KRAKA • CANCER</text>
    <text x="655" y="555">SIMHA • LEO</text>
    <text x="545" y="665">KANYA • VIRGO</text>
    <text x="400" y="705">TULA • LIBRA</text>
    <text x="255" y="665">VRISCHIKA • SCORPIO</text>
    <text x="145" y="555">DHANU • SAGITTARIUS</text>
    <text x="105" y="405">MAKARA • CAPRICORN</text>
    <text x="145" y="255">KUMBHA • AQUARIUS</text>
    <text x="255" y="145">MEENA • PISCES</text>
  </g>

  <!-- Center Dharmachakra Hub -->
  <circle cx="400" cy="400" r="110" fill="url(#maroonGrad)" stroke="url(#goldGrad)" stroke-width="4"/>
  <circle cx="400" cy="400" r="50" fill="none" stroke="#FDE68A" stroke-width="2"/>
  <circle cx="400" cy="400" r="18" fill="#F59E0B"/>

  <!-- Central Emblem / Star of Guidance -->
  <polygon points="400,310 425,375 490,400 425,425 400,490 375,425 310,400 375,375" fill="url(#goldGrad)" opacity="0.9"/>
</svg>"""

with open('assets/illustrations/hero-zodiac-wheel.svg', 'w', encoding='utf-8') as f:
    f.write(hero_zodiac_svg)

# 2. VEDIC KUNDLI BIRTHCHART LATTICE SVG
kundli_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <linearGradient id="kBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1B4B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="kGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect x="20" y="20" width="560" height="560" fill="url(#kBg)" rx="16" stroke="url(#kGold)" stroke-width="3"/>
  <!-- Outer Square Diamond Lattice -->
  <rect x="50" y="50" width="500" height="500" fill="none" stroke="url(#kGold)" stroke-width="2.5"/>
  <line x1="50" y1="50" x2="550" y2="550" stroke="url(#kGold)" stroke-width="2"/>
  <line x1="50" y1="550" x2="550" y2="50" stroke="url(#kGold)" stroke-width="2"/>
  <polygon points="300,50 550,300 300,550 50,300" fill="none" stroke="url(#kGold)" stroke-width="2.5"/>

  <!-- 12 House Labels -->
  <g font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="800" fill="#FCD34D" text-anchor="middle">
    <!-- H1 Lagna -->
    <text x="300" y="190">1 • TANU (LAGNA)</text>
    <!-- H2 -->
    <text x="180" y="110">2 • DHANA</text>
    <!-- H3 -->
    <text x="110" y="180">3 • SAHAJA</text>
    <!-- H4 Sukha -->
    <text x="190" y="305">4 • SUKHA</text>
    <!-- H5 -->
    <text x="110" y="430">5 • PUTRA</text>
    <!-- H6 -->
    <text x="180" y="500">6 • RIPU</text>
    <!-- H7 Kalatra -->
    <text x="300" y="420">7 • KALATRA</text>
    <!-- H8 -->
    <text x="420" y="500">8 • AYUR</text>
    <!-- H9 -->
    <text x="490" y="430">9 • DHARMA</text>
    <!-- H10 Karma -->
    <text x="410" y="305">10 • KARMA</text>
    <!-- H11 -->
    <text x="490" y="180">11 • LABHA</text>
    <!-- H12 -->
    <text x="420" y="110">12 • VYAYA</text>
  </g>
  <circle cx="300" cy="300" r="14" fill="#B45309" stroke="#FDE68A" stroke-width="2"/>
</svg>"""

with open('assets/illustrations/kundli-birthchart.svg', 'w', encoding='utf-8') as f:
    f.write(kundli_svg)

# 3. 24-HOUR SOLAR HORAS TIMING WHEEL SVG
horas_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="hGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#312E81"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </radialGradient>
    <linearGradient id="sunGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="100%" stop-color="#CA8A04"/>
    </linearGradient>
  </defs>
  <circle cx="300" cy="300" r="280" fill="url(#hGlow)" stroke="#F59E0B" stroke-width="3"/>
  <!-- Daytime Half / Nighttime Half -->
  <path d="M 300,50 A 250,250 0 0,1 300,550 Z" fill="rgba(245, 158, 11, 0.08)" stroke="#F59E0B" stroke-width="1.5"/>
  <path d="M 300,50 A 250,250 0 0,0 300,550 Z" fill="rgba(30, 41, 59, 0.5)" stroke="#64748B" stroke-width="1.5"/>

  <!-- 24 Hour Spokes -->
  <circle cx="300" cy="300" r="200" fill="none" stroke="#C6A15B" stroke-width="2"/>
  <circle cx="300" cy="300" r="140" fill="none" stroke="#78350F" stroke-width="1.5" stroke-dasharray="3 3"/>

  <g font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="#FCD34D" text-anchor="middle">
    <text x="300" y="35">SUNRISE (06:00)</text>
    <text x="560" y="305">NOON (12:00)</text>
    <text x="300" y="575">SUNSET (18:00)</text>
    <text x="45" y="305">MIDNIGHT (00:00)</text>
  </g>

  <!-- Center Sun Symbol -->
  <circle cx="300" cy="300" r="45" fill="url(#sunGold)"/>
  <circle cx="300" cy="300" r="22" fill="#78350F"/>
</svg>"""

with open('assets/illustrations/horas-timing.svg', 'w', encoding='utf-8') as f:
    f.write(horas_svg)

# 4. ASTROLOGICAL COMPATIBILITY SYNASTRY SVG
synastry_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <linearGradient id="chartAGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="chartBGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#BE185D"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#0B0F19" rx="16"/>
  <!-- Chart A Celestial Ring -->
  <circle cx="240" cy="300" r="160" fill="none" stroke="url(#chartAGrad)" stroke-width="3" stroke-dasharray="6 3"/>
  <circle cx="240" cy="300" r="90" fill="rgba(59, 130, 246, 0.12)" stroke="#60A5FA" stroke-width="1.5"/>
  <!-- Chart B Celestial Ring -->
  <circle cx="360" cy="300" r="160" fill="none" stroke="url(#chartBGrad)" stroke-width="3" stroke-dasharray="6 3"/>
  <circle cx="360" cy="300" r="90" fill="rgba(236, 72, 153, 0.12)" stroke="#F472B6" stroke-width="1.5"/>

  <!-- Central Intersection (36-Guna Ashtakoota Harmony Lens) -->
  <ellipse cx="300" cy="300" rx="60" ry="110" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" stroke-width="2"/>

  <!-- Labels -->
  <text x="180" y="170" font-family="'Cinzel', serif" font-size="14" font-weight="700" fill="#93C5FD">CHART A (NATAL)</text>
  <text x="420" y="170" font-family="'Cinzel', serif" font-size="14" font-weight="700" fill="#F9A8D4">CHART B (SYNASTRY)</text>
  <text x="300" y="305" font-family="'Cinzel', serif" font-size="13" font-weight="800" fill="#FCD34D" text-anchor="middle">36 GUNAS</text>
  <text x="300" y="325" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="600" fill="#FAF9F6" text-anchor="middle">ASHTAKOOTA</text>
</svg>"""

with open('assets/illustrations/synastry-compatibility.svg', 'w', encoding='utf-8') as f:
    f.write(synastry_svg)

# 5. VEDIC NUMEROLOGY YANTRA GRID SVG
numerology_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <rect width="600" height="600" fill="#131B2E" rx="16" stroke="#C6A15B" stroke-width="3"/>
  <rect x="75" y="75" width="450" height="450" fill="#0B0F19" stroke="#F59E0B" stroke-width="2"/>

  <!-- 3x3 Grid Lines -->
  <line x1="225" y1="75" x2="225" y2="525" stroke="#F59E0B" stroke-width="2"/>
  <line x1="375" y1="75" x2="375" y2="525" stroke="#F59E0B" stroke-width="2"/>
  <line x1="75" y1="225" x2="525" y2="225" stroke="#F59E0B" stroke-width="2"/>
  <line x1="75" y1="375" x2="525" y2="375" stroke="#F59E0B" stroke-width="2"/>

  <!-- Classical Lo Shu / Vedic Yantra Numerical Grid -->
  <g font-family="'Cinzel', Georgia, serif" font-size="34" font-weight="800" fill="#FCD34D" text-anchor="middle">
    <!-- Row 1: 4, 9, 2 -->
    <text x="150" y="165">4</text>
    <text x="300" y="165">9</text>
    <text x="450" y="165">2</text>

    <!-- Row 2: 3, 5, 7 -->
    <text x="150" y="315">3</text>
    <text x="300" y="315" fill="#EF4444">5</text>
    <text x="450" y="315">7</text>

    <!-- Row 3: 8, 1, 6 -->
    <text x="150" y="465">8</text>
    <text x="300" y="465">1</text>
    <text x="450" y="465">6</text>
  </g>
  <text x="300" y="565" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" fill="#C8B9AE" text-anchor="middle">CHALDEAN &amp; PYTHAGOREAN 3×3 YANTRA HARMONY</text>
</svg>"""

with open('assets/illustrations/numerology-yantra.svg', 'w', encoding='utf-8') as f:
    f.write(numerology_svg)

# 6. TRANSITS & DASHA TIMELINE SVG
transits_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <rect width="600" height="600" fill="#0A1020" rx="16"/>

  <!-- Orbital Ellipses -->
  <ellipse cx="300" cy="300" rx="260" ry="140" fill="none" stroke="#6366F1" stroke-width="1.5" opacity="0.6"/>
  <ellipse cx="300" cy="300" rx="210" ry="110" fill="none" stroke="#FBBF24" stroke-width="1.5" opacity="0.7"/>
  <ellipse cx="300" cy="300" rx="150" ry="80" fill="none" stroke="#EF4444" stroke-width="1.5" opacity="0.8"/>
  <ellipse cx="300" cy="300" rx="90" ry="50" fill="none" stroke="#10B981" stroke-width="1.5" opacity="0.9"/>

  <!-- Central Sun -->
  <circle cx="300" cy="300" r="28" fill="#F59E0B" stroke="#FDE68A" stroke-width="2"/>

  <!-- Orbiting Planets -->
  <circle cx="210" cy="300" r="8" fill="#10B981"/><!-- Mercury -->
  <circle cx="450" cy="300" r="10" fill="#EF4444"/><!-- Mars -->
  <circle cx="300" cy="190" r="16" fill="#FBBF24"/><!-- Jupiter -->
  <circle cx="300" cy="440" r="14" fill="#6366F1"/><!-- Saturn -->

  <!-- Labels -->
  <text x="300" y="55" font-family="'Cinzel', serif" font-size="14" font-weight="700" fill="#FCD34D" text-anchor="middle">GOCHAR • PLANETARY TRANSITS</text>
  <text x="300" y="555" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#94A3B8" text-anchor="middle">VIMSHOTTARI DASHA &amp; TRANSIT CROSS-CORRELATION</text>
</svg>"""

with open('assets/illustrations/transits-timeline.svg', 'w', encoding='utf-8') as f:
    f.write(transits_svg)

# 7. PREMIUM REPORTS LIBRARY & SACRED MANUSCRIPT SVG
reports_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bookCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4C0519"/>
      <stop offset="100%" stop-color="#1E1B4B"/>
    </linearGradient>
    <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#0B0F19" rx="16"/>

  <!-- Sacred Book Cover & Manuscript Page Stack -->
  <rect x="130" y="80" width="340" height="420" rx="12" fill="#F8FAFC" opacity="0.15" transform="rotate(-4 300 290)"/>
  <rect x="135" y="80" width="340" height="420" rx="12" fill="#F8FAFC" opacity="0.25" transform="rotate(-2 300 290)"/>
  <rect x="140" y="80" width="340" height="420" rx="12" fill="url(#bookCoverGrad)" stroke="url(#goldRibbon)" stroke-width="3"/>

  <!-- Inner Gold Filigree Borders -->
  <rect x="160" y="100" width="300" height="380" rx="6" fill="none" stroke="#F5C45E" stroke-width="1.5" stroke-dasharray="4 4"/>
  <rect x="170" y="110" width="280" height="360" rx="4" fill="none" stroke="url(#goldRibbon)" stroke-width="2"/>

  <!-- Embossed Sacred Emblem / Seal -->
  <circle cx="310" cy="230" r="55" fill="rgba(212, 175, 55, 0.15)" stroke="url(#goldRibbon)" stroke-width="2"/>
  <polygon points="310,195 320,220 345,230 320,240 310,265 300,240 275,230 300,220" fill="url(#goldRibbon)"/>

  <!-- Gold Bookmark Ribbon -->
  <path d="M 390,80 L 390,260 L 410,240 L 430,260 L 430,80 Z" fill="url(#goldRibbon)"/>

  <!-- Title Typography -->
  <text x="310" y="325" font-family="'Cinzel', Georgia, serif" font-size="16" font-weight="700" fill="#FCD34D" text-anchor="middle" letter-spacing="1.5">VEDIC BLUEPRINT</text>
  <text x="310" y="350" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#E2E8F0" text-anchor="middle">COMPLETE 9-PUBLICATION SUITE</text>
  <text x="310" y="380" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#F59E0B" text-anchor="middle" letter-spacing="1">100% CHAPTER INTEGRITY • ZERO BLANK PAGES</text>

  <!-- Bottom Seal -->
  <circle cx="310" cy="430" r="16" fill="#D97706" stroke="#FEF08A" stroke-width="1.5"/>
</svg>"""

with open('assets/illustrations/reports-library.svg', 'w', encoding='utf-8') as f:
    f.write(reports_svg)

# 8. AI VEDIC ASTROLOGER & CELESTIAL CONSULTANT SVG
ai_astrologer_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="aiHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#312E81" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#0B0F19" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="guruGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#0B0F19" rx="16"/>

  <!-- Aura Halo -->
  <circle cx="300" cy="270" r="190" fill="url(#aiHalo)"/>

  <!-- Celestial Astrolabe Geometric Ring Network -->
  <circle cx="300" cy="270" r="170" fill="none" stroke="#C6A15B" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.7"/>
  <circle cx="300" cy="270" r="130" fill="none" stroke="url(#guruGold)" stroke-width="2"/>
  <circle cx="300" cy="270" r="90" fill="none" stroke="#818CF8" stroke-width="1.5" stroke-dasharray="2 4"/>

  <!-- Constellation Nodes & Connecting Rays -->
  <g stroke="#FDE68A" stroke-width="1.2" opacity="0.6">
    <line x1="300" y1="100" x2="300" y2="440"/>
    <line x1="130" y1="270" x2="470" y2="270"/>
    <line x1="180" y1="150" x2="420" y2="390"/>
    <line x1="180" y1="390" x2="420" y2="150"/>
  </g>

  <!-- Glowing Constellation Stars -->
  <circle cx="300" cy="100" r="5" fill="#FCD34D"/>
  <circle cx="470" cy="270" r="5" fill="#FCD34D"/>
  <circle cx="300" cy="440" r="5" fill="#FCD34D"/>
  <circle cx="130" cy="270" r="5" fill="#FCD34D"/>
  <circle cx="420" cy="150" r="4" fill="#818CF8"/>
  <circle cx="180" cy="390" r="4" fill="#818CF8"/>
  <circle cx="180" cy="150" r="4" fill="#818CF8"/>
  <circle cx="420" cy="390" r="4" fill="#818CF8"/>

  <!-- Central Third Eye / Divine Insight Symbol -->
  <ellipse cx="300" cy="270" rx="42" ry="24" fill="#1E1B4B" stroke="url(#guruGold)" stroke-width="2.5"/>
  <circle cx="300" cy="270" r="14" fill="#F59E0B" stroke="#FEF08A" stroke-width="2"/>
  <circle cx="300" cy="270" r="6" fill="#4338CA"/>

  <!-- Vedic Guru Aura Rays -->
  <polygon points="300,220 306,236 322,242 306,248 300,264 294,248 278,242 294,236" fill="#FDE68A"/>

  <!-- Bilingual Consultation Labels -->
  <text x="300" y="495" font-family="'Cinzel', Georgia, serif" font-size="15" font-weight="700" fill="#FCD34D" text-anchor="middle" letter-spacing="1">CHART-GROUNDED AI GURU</text>
  <text x="300" y="525" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#94A3B8" text-anchor="middle">PARASHARI • JAIMINI • BILINGUAL CONSULTATION</text>
</svg>"""

with open('assets/illustrations/ai-astrologer.svg', 'w', encoding='utf-8') as f:
    f.write(ai_astrologer_svg)

# 9. VEDIC REMEDIES & SACRED YANTRA SVG
remedies_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="remGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7C2D12" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#1E1B4B" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0B0F19" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="remGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#0B0F19" rx="16"/>
  <circle cx="300" cy="280" r="230" fill="url(#remGlow)" stroke="url(#remGold)" stroke-width="2.5"/>

  <!-- Outer Sacred Geometry (16 Lotus Petals Outline) -->
  <circle cx="300" cy="280" r="195" fill="none" stroke="#C6A15B" stroke-width="1.5" stroke-dasharray="6 3"/>

  <!-- Interlocking Upward & Downward Triangles (Shatkona / Sri Yantra Matrix) -->
  <polygon points="300,120 440,360 160,360" fill="none" stroke="url(#remGold)" stroke-width="2.5"/>
  <polygon points="300,440 440,200 160,200" fill="none" stroke="url(#remGold)" stroke-width="2.5"/>

  <!-- 9 Navagraha Gemstone Nodes -->
  <circle cx="300" cy="280" r="16" fill="#DC2626" stroke="#FEF08A" stroke-width="2"/><!-- Ruby / Sun -->
  <circle cx="300" cy="120" r="10" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.5"/><!-- Pearl / Moon -->
  <circle cx="440" cy="200" r="10" fill="#EA580C" stroke="#FEF08A" stroke-width="1.5"/><!-- Coral / Mars -->
  <circle cx="440" cy="360" r="10" fill="#16A34A" stroke="#FEF08A" stroke-width="1.5"/><!-- Emerald / Mercury -->
  <circle cx="300" cy="440" r="10" fill="#EAB308" stroke="#FEF08A" stroke-width="1.5"/><!-- Yellow Sapphire / Jupiter -->
  <circle cx="160" cy="360" r="10" fill="#38BDF8" stroke="#FEF08A" stroke-width="1.5"/><!-- Diamond / Venus -->
  <circle cx="160" cy="200" r="10" fill="#2563EB" stroke="#FEF08A" stroke-width="1.5"/><!-- Blue Sapphire / Saturn -->
  <circle cx="210" cy="280" r="8" fill="#4B5563" stroke="#FEF08A" stroke-width="1.5"/><!-- Hessonite / Rahu -->
  <circle cx="390" cy="280" r="8" fill="#78350F" stroke="#FEF08A" stroke-width="1.5"/><!-- Cat's Eye / Ketu -->

  <!-- Central Bindu -->
  <circle cx="300" cy="280" r="4" fill="#FEF08A"/>

  <!-- Labels -->
  <text x="300" y="520" font-family="'Cinzel', Georgia, serif" font-size="15" font-weight="700" fill="#FCD34D" text-anchor="middle" letter-spacing="1">AUTHENTIC VEDIC REMEDIES</text>
  <text x="300" y="545" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#94A3B8" text-anchor="middle">NAVAGRAHA GEMS • MANTRAS • DAANA • DOSHA SHANTI</text>
</svg>"""

with open('assets/illustrations/remedies-yantra.svg', 'w', encoding='utf-8') as f:
    f.write(remedies_svg)

# 10. PANCHANG CALENDAR (Daily Forecast / Diurnal Phase)
with open('assets/illustrations/panchang-calendar.svg', 'w', encoding='utf-8') as f:
    from generate_all_illustrations import panchang_calendar_svg
    f.write(panchang_calendar_svg)

# 11. TRANSIT WHEEL (Weekly 7-Day Cycle Forecast)
with open('assets/illustrations/transit-wheel.svg', 'w', encoding='utf-8') as f:
    from generate_all_illustrations import transit_wheel_svg
    f.write(transit_wheel_svg)

# 12. CAREER DHARMA (Monthly 4-Week Strategic Progression)
with open('assets/illustrations/career-dharma.svg', 'w', encoding='utf-8') as f:
    from generate_all_illustrations import career_dharma_svg
    f.write(career_dharma_svg)

# 13. WEALTH ABUNDANCE (Yearly 12-Month Outlook + 4 Quarters)
with open('assets/illustrations/wealth-abundance.svg', 'w', encoding='utf-8') as f:
    from generate_all_illustrations import wealth_abundance_svg
    f.write(wealth_abundance_svg)

# 14. MAHADASHA TIMELINE (5-Year Vimshottari Karmic Arc)
with open('assets/illustrations/mahadasha-timeline.svg', 'w', encoding='utf-8') as f:
    from generate_all_illustrations import mahadasha_timeline_svg
    f.write(mahadasha_timeline_svg)

# 15. PERSONA: ACHARYA DEVRATAN
with open('assets/illustrations/persona-devratan.svg', 'w', encoding='utf-8') as f:
    from generate_all_illustrations import persona_devratan_svg
    f.write(persona_devratan_svg)

# 16. PERSONA: DR. SUNITA SHASTRI
with open('assets/illustrations/persona-sunita.svg', 'w', encoding='utf-8') as f:
    from generate_all_illustrations import persona_sunita_svg
    f.write(persona_sunita_svg)

# 17. PERSONA: PANDIT RAGHAVENDRA
with open('assets/illustrations/persona-raghavendra.svg', 'w', encoding='utf-8') as f:
    from generate_all_illustrations import persona_raghavendra_svg
    f.write(persona_raghavendra_svg)

print("Created 17 master SVG vector illustrations in assets/illustrations/")
