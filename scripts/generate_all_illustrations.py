import os

os.makedirs('assets/illustrations', exist_ok=True)

# 1. PANCHANG CALENDAR (Daily Forecast / Diurnal Phase)
panchang_calendar_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="panchangGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A0E17" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#2A080E" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#1A0408" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="panchangGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#1E3A8A"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#panchangGlow)" rx="20" stroke="url(#panchangGold)" stroke-width="3"/>
  <circle cx="300" cy="280" r="210" fill="none" stroke="url(#blueGlow)" stroke-width="2" stroke-dasharray="6 4" opacity="0.8"/>
  <circle cx="300" cy="280" r="175" fill="none" stroke="url(#panchangGold)" stroke-width="2.5"/>
  <circle cx="300" cy="280" r="135" fill="rgba(74, 14, 23, 0.6)" stroke="#D4AF37" stroke-width="1.5"/>

  <!-- 5 Panchang Limbs Petals / Rays (Tithi, Vara, Nakshatra, Yoga, Karana) -->
  <g stroke="url(#panchangGold)" stroke-width="1.8" opacity="0.85">
    <line x1="300" y1="105" x2="300" y2="455"/>
    <line x1="125" y1="280" x2="475" y2="280"/>
    <line x1="176" y1="156" x2="424" y2="404"/>
    <line x1="176" y1="404" x2="424" y2="156"/>
  </g>

  <!-- Sun & Moon Solar Dial -->
  <circle cx="300" cy="280" r="45" fill="#F59E0B" stroke="#FEF3C7" stroke-width="2.5"/>
  <path d="M 300,235 A 45,45 0 0,1 300,325 Z" fill="#D97706"/>
  <path d="M 285,250 A 30,30 0 0,0 285,310 A 38,38 0 0,1 285,250 Z" fill="#FEF08A"/>

  <!-- Limb Emblems -->
  <circle cx="300" cy="90" r="14" fill="#3B82F6" stroke="#93C5FD" stroke-width="1.5"/><!-- Tithi -->
  <circle cx="475" cy="210" r="14" fill="#10B981" stroke="#A7F3D0" stroke-width="1.5"/><!-- Vara -->
  <circle cx="430" cy="390" r="14" fill="#F59E0B" stroke="#FDE68A" stroke-width="1.5"/><!-- Nakshatra -->
  <circle cx="170" cy="390" r="14" fill="#EC4899" stroke="#FBCFE8" stroke-width="1.5"/><!-- Yoga -->
  <circle cx="125" cy="210" r="14" fill="#8B5CF6" stroke="#DDD6FE" stroke-width="1.5"/><!-- Karana -->

  <!-- Typography Labels -->
  <text x="300" y="520" font-family="'Cinzel', Georgia, serif" font-size="16" font-weight="700" fill="#FCD34D" text-anchor="middle" letter-spacing="1.5">DAINIK PANCHANG &amp; DIURNAL PHASES</text>
  <text x="300" y="548" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#E2D9D2" text-anchor="middle">TITHI • VARA • NAKSHATRA • YOGA • KARANA</text>
</svg>"""

with open('assets/illustrations/panchang-calendar.svg', 'w', encoding='utf-8') as f:
    f.write(panchang_calendar_svg)

# 2. TRANSIT WHEEL (Weekly 7-Day Cycle Forecast)
transit_wheel_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A0E17" stop-opacity="0.9"/>
      <stop offset="65%" stop-color="#2A080E" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#140205" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="twGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="twBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#wheelGlow)" rx="20" stroke="url(#twGold)" stroke-width="3"/>

  <!-- Concentric Orbital Tracks -->
  <circle cx="300" cy="275" r="215" fill="none" stroke="url(#twGold)" stroke-width="2.5"/>
  <circle cx="300" cy="275" r="175" fill="none" stroke="#3B82F6" stroke-width="1.8" stroke-dasharray="5 3"/>
  <circle cx="300" cy="275" r="130" fill="none" stroke="url(#twGold)" stroke-width="2"/>
  <circle cx="300" cy="275" r="85" fill="rgba(59, 130, 246, 0.15)" stroke="#60A5FA" stroke-width="1.5"/>

  <!-- 7 Heptagram Spokes for 7 Days of the Week -->
  <!-- Angles: 0, 51.4, 102.8, 154.3, 205.7, 257.1, 308.6 -->
  <g stroke="url(#twGold)" stroke-width="1.8" opacity="0.8">
    <line x1="300" y1="275" x2="300" y2="60"/>
    <line x1="300" y1="275" x2="468" y2="142"/>
    <line x1="300" y1="275" x2="489" y2="340"/>
    <line x1="300" y1="275" x2="393" y2="475"/>
    <line x1="300" y1="275" x2="207" y2="475"/>
    <line x1="300" y1="275" x2="111" y2="340"/>
    <line x1="300" y1="275" x2="132" y2="142"/>
  </g>

  <!-- 7 Day Planetary Nodes -->
  <!-- Sun (Sun), Moon (Mon), Mars (Tue), Mercury (Wed), Jupiter (Thu), Venus (Fri), Saturn (Sat) -->
  <circle cx="300" cy="60" r="16" fill="#F59E0B" stroke="#FEF3C7" stroke-width="2"/><!-- Sun: Ravivara -->
  <circle cx="468" cy="142" r="14" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2"/><!-- Moon: Somavara -->
  <circle cx="489" cy="340" r="14" fill="#EF4444" stroke="#FCA5A5" stroke-width="2"/><!-- Mars: Mangalavara -->
  <circle cx="393" cy="475" r="14" fill="#10B981" stroke="#A7F3D0" stroke-width="2"/><!-- Mercury: Budhavara -->
  <circle cx="207" cy="475" r="15" fill="#EAB308" stroke="#FEF08A" stroke-width="2"/><!-- Jupiter: Guruvara -->
  <circle cx="111" cy="340" r="14" fill="#EC4899" stroke="#FBCFE8" stroke-width="2"/><!-- Venus: Shukravara -->
  <circle cx="132" cy="142" r="15" fill="#3B82F6" stroke="#93C5FD" stroke-width="2"/><!-- Saturn: Shanivara -->

  <!-- Center Dharmic Hub -->
  <circle cx="300" cy="275" r="32" fill="url(#twBlue)" stroke="url(#twGold)" stroke-width="2"/>
  <circle cx="300" cy="275" r="10" fill="#FCD34D"/>

  <!-- Typography Labels -->
  <text x="300" y="525" font-family="'Cinzel', Georgia, serif" font-size="16" font-weight="700" fill="#FCD34D" text-anchor="middle" letter-spacing="1.5">7-DAY PLANETARY TRANSIT CYCLE</text>
  <text x="300" y="552" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#E2D9D2" text-anchor="middle">NAVAGRAHA WEEKDAY RULERS • LUNAR TARA BALA</text>
</svg>"""

with open('assets/illustrations/transit-wheel.svg', 'w', encoding='utf-8') as f:
    f.write(transit_wheel_svg)

# 3. CAREER DHARMA (Monthly 4-Week Strategic Progression)
career_dharma_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="cdGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A0E17" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="#2A080E" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#140205" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="cdGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="cdBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#1E3A8A"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#cdGlow)" rx="20" stroke="url(#cdGold)" stroke-width="3"/>

  <!-- 4-Phase Lunar Arc (4 Weeks of the Month) -->
  <path d="M 120,380 C 180,180 420,180 480,380" fill="none" stroke="url(#cdGold)" stroke-width="3" stroke-dasharray="6 4"/>

  <!-- 4 Strategic Pillars representing 4 Weeks -->
  <!-- Week 1: Foundation (New Moon Crescent) -->
  <g transform="translate(140, 290)">
    <rect x="-24" y="-30" width="48" height="90" rx="8" fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" stroke-width="2"/>
    <circle cx="0" cy="-45" r="14" fill="#3B82F6" stroke="#93C5FD" stroke-width="1.5"/>
    <text x="0" y="20" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="#93C5FD" text-anchor="middle">WK 1</text>
    <text x="0" y="38" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="#E2E8F0" text-anchor="middle">INITIATION</text>
  </g>

  <!-- Week 2: Momentum (Waxing Gibbous) -->
  <g transform="translate(245, 220)">
    <rect x="-24" y="-30" width="48" height="130" rx="8" fill="rgba(212, 175, 55, 0.2)" stroke="#D4AF37" stroke-width="2"/>
    <circle cx="0" cy="-45" r="15" fill="#D4AF37" stroke="#FEF08A" stroke-width="1.5"/>
    <text x="0" y="20" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="#FDE68A" text-anchor="middle">WK 2</text>
    <text x="0" y="38" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="#E2E8F0" text-anchor="middle">MOMENTUM</text>
  </g>

  <!-- Week 3: Peak / Culmination (Full Moon) -->
  <g transform="translate(355, 220)">
    <rect x="-24" y="-30" width="48" height="130" rx="8" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" stroke-width="2"/>
    <circle cx="0" cy="-45" r="16" fill="#F59E0B" stroke="#FEF3C7" stroke-width="2"/>
    <text x="0" y="20" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="#FEF08A" text-anchor="middle">WK 3</text>
    <text x="0" y="38" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="#E2E8F0" text-anchor="middle">CULMINATION</text>
  </g>

  <!-- Week 4: Integration (Waning) -->
  <g transform="translate(460, 290)">
    <rect x="-24" y="-30" width="48" height="90" rx="8" fill="rgba(139, 92, 246, 0.2)" stroke="#8B5CF6" stroke-width="2"/>
    <circle cx="0" cy="-45" r="14" fill="#8B5CF6" stroke="#DDD6FE" stroke-width="1.5"/>
    <text x="0" y="20" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="#DDD6FE" text-anchor="middle">WK 4</text>
    <text x="0" y="38" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="#E2E8F0" text-anchor="middle">HARVEST</text>
  </g>

  <!-- Dharma Wheel / 10th House Karma Crest -->
  <circle cx="300" cy="110" r="38" fill="url(#cdBlue)" stroke="url(#cdGold)" stroke-width="2.5"/>
  <polygon points="300,85 308,102 326,110 308,118 300,135 292,118 274,110 292,102" fill="url(#cdGold)"/>

  <!-- Typography Labels -->
  <text x="300" y="525" font-family="'Cinzel', Georgia, serif" font-size="16" font-weight="700" fill="#FCD34D" text-anchor="middle" letter-spacing="1.5">MONTHLY 4-WEEK STRATEGIC PROGRESSION</text>
  <text x="300" y="552" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#E2D9D2" text-anchor="middle">10TH HOUSE KARMA • DHARMA EXECUTION • LUNAR PHASES</text>
</svg>"""

with open('assets/illustrations/career-dharma.svg', 'w', encoding='utf-8') as f:
    f.write(career_dharma_svg)

# 4. WEALTH ABUNDANCE (Yearly 12-Month Outlook + 4 Quarters)
wealth_abundance_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="waGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A0E17" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="#2A080E" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#140205" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="waGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="waBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#waGlow)" rx="20" stroke="url(#waGold)" stroke-width="3"/>

  <!-- 12-Month Solar Constellation Wheel -->
  <circle cx="300" cy="275" r="215" fill="none" stroke="url(#waGold)" stroke-width="2.5"/>
  <circle cx="300" cy="275" r="165" fill="none" stroke="url(#waBlue)" stroke-width="1.8" stroke-dasharray="4 3"/>

  <!-- 4 Cardinal Quarters (Q1 Vasant, Q2 Grishma, Q3 Sharad, Q4 Shishir) -->
  <rect x="200" y="175" width="200" height="200" fill="none" stroke="url(#waGold)" stroke-width="2" transform="rotate(45 300 275)"/>
  <circle cx="300" cy="275" r="105" fill="rgba(74, 14, 23, 0.7)" stroke="url(#waGold)" stroke-width="2"/>

  <!-- 4 Quarters Markers -->
  <g font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="800" fill="#FCD34D" text-anchor="middle">
    <text x="300" y="90">Q1 • JAN-MAR</text>
    <text x="495" y="280">Q2 • APR-JUN</text>
    <text x="300" y="475">Q3 • JUL-SEP</text>
    <text x="105" y="280">Q4 • OCT-DEC</text>
  </g>

  <!-- Sacred Dhana & Labha Yantra Center (2nd & 11th House Abundance) -->
  <circle cx="300" cy="275" r="45" fill="url(#waGold)" stroke="#FEF08A" stroke-width="2"/>
  <polygon points="300,240 312,265 338,275 312,285 300,310 288,285 262,275 288,265" fill="#4A0E17"/>
  <circle cx="300" cy="275" r="8" fill="#FCD34D"/>

  <!-- 12 Month Peripheral Dots -->
  <!-- 12 positions at 30 deg intervals -->
  <g fill="#FEF3C7" stroke="#D4AF37" stroke-width="1.5">
    <circle cx="300" cy="60" r="7"/>
    <circle cx="408" cy="89" r="6"/>
    <circle cx="486" cy="167" r="6"/>
    <circle cx="515" cy="275" r="7"/>
    <circle cx="486" cy="383" r="6"/>
    <circle cx="408" cy="461" r="6"/>
    <circle cx="300" cy="490" r="7"/>
    <circle cx="192" cy="461" r="6"/>
    <circle cx="114" cy="383" r="6"/>
    <circle cx="85" cy="275" r="7"/>
    <circle cx="114" cy="167" r="6"/>
    <circle cx="192" cy="89" r="6"/>
  </g>

  <!-- Typography Labels -->
  <text x="300" y="530" font-family="'Cinzel', Georgia, serif" font-size="16" font-weight="700" fill="#FCD34D" text-anchor="middle" letter-spacing="1.5">12-MONTH ANNUAL TRANSIT TIMELINE</text>
  <text x="300" y="555" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#E2D9D2" text-anchor="middle">4 STRATEGIC QUARTERS • JUPITER &amp; SATURN RETROGRADES</text>
</svg>"""

with open('assets/illustrations/wealth-abundance.svg', 'w', encoding='utf-8') as f:
    f.write(wealth_abundance_svg)

# 5. MAHADASHA TIMELINE (5-Year Vimshottari Karmic Arc)
mahadasha_timeline_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="mdGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A0E17" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="#2A080E" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#140205" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="mdGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="mdBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#1E3A8A"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#mdGlow)" rx="20" stroke="url(#mdGold)" stroke-width="3"/>

  <!-- Concentric Dasha Rings (Mahadasha, Antardasha, Pratyantardasha) -->
  <circle cx="300" cy="275" r="215" fill="none" stroke="url(#mdGold)" stroke-width="2.5"/>
  <circle cx="300" cy="275" r="165" fill="none" stroke="url(#mdBlue)" stroke-width="2" stroke-dasharray="6 4"/>
  <circle cx="300" cy="275" r="115" fill="none" stroke="url(#mdGold)" stroke-width="1.8"/>

  <!-- 9 Vimshottari Graha Sectors (Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17, Ketu 7, Venus 20 = 120 Years) -->
  <g stroke="url(#mdGold)" stroke-width="1.5" opacity="0.75">
    <line x1="300" y1="275" x2="300" y2="60"/>
    <line x1="300" y1="275" x2="438" y2="110"/>
    <line x1="300" y1="275" x2="507" y2="225"/>
    <line x1="300" y1="275" x2="475" y2="375"/>
    <line x1="300" y1="275" x2="370" y2="478"/>
    <line x1="300" y1="275" x2="230" y2="478"/>
    <line x1="300" y1="275" x2="125" y2="375"/>
    <line x1="300" y1="275" x2="93" y2="225"/>
    <line x1="300" y1="275" x2="162" y2="110"/>
  </g>

  <!-- Central Karmic Seed (Kundli Lagna Anchor) -->
  <circle cx="300" cy="275" r="48" fill="#781A24" stroke="url(#mdGold)" stroke-width="2.5"/>
  <polygon points="300,240 310,265 335,275 310,285 300,310 290,285 265,275 290,265" fill="url(#mdGold)"/>
  <circle cx="300" cy="275" r="8" fill="#FDE68A"/>

  <!-- Labels -->
  <text x="300" y="525" font-family="'Cinzel', Georgia, serif" font-size="16" font-weight="700" fill="#FCD34D" text-anchor="middle" letter-spacing="1.5">5-YEAR VIMSHOTTARI KARMIC TIMELINE</text>
  <text x="300" y="552" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#E2D9D2" text-anchor="middle">120-YEAR DASHA CYCLE • EXACT NATAL MOON GROUNDED</text>
</svg>"""

with open('assets/illustrations/mahadasha-timeline.svg', 'w', encoding='utf-8') as f:
    f.write(mahadasha_timeline_svg)

# 6. PERSONA: ACHARYA DEVRATAN (Parashari & Prashna Scholar)
persona_devratan_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="devHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A0E17" stop-opacity="0.95"/>
      <stop offset="65%" stop-color="#2A080E" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#140205" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="goldFrame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="40%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
    <linearGradient id="robeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D97706"/>
      <stop offset="50%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
    <linearGradient id="shawlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#881337"/>
      <stop offset="100%" stop-color="#4C0519"/>
    </linearGradient>
    <linearGradient id="skinTone" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#DEB887"/>
      <stop offset="100%" stop-color="#C68B59"/>
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="600" fill="url(#devHalo)" rx="24" stroke="url(#goldFrame)" stroke-width="4"/>

  <!-- Celestial Halo & Radiance Rings -->
  <circle cx="300" cy="260" r="195" fill="none" stroke="url(#goldFrame)" stroke-width="2" stroke-dasharray="6 3" opacity="0.6"/>
  <circle cx="300" cy="260" r="160" fill="rgba(212, 175, 55, 0.08)" stroke="#3B82F6" stroke-width="1.8"/>

  <!-- Parashari Celestial Ring with 12 Zodiac Houses -->
  <g stroke="url(#goldFrame)" stroke-width="1.2" opacity="0.4">
    <line x1="300" y1="100" x2="300" y2="420"/>
    <line x1="140" y1="260" x2="460" y2="260"/>
    <line x1="187" y1="147" x2="413" y2="373"/>
    <line x1="187" y1="373" x2="413" y2="147"/>
  </g>

  <!-- Shoulders & Traditional Kurta/Angavastram -->
  <path d="M 170,490 Q 230,400 300,400 Q 370,400 430,490 L 460,540 L 140,540 Z" fill="url(#robeGrad)" stroke="url(#goldFrame)" stroke-width="2"/>
  <!-- Regal Maroon Shawl over Left Shoulder -->
  <path d="M 170,490 Q 220,410 260,430 L 230,540 L 140,540 Z" fill="url(#shawlGrad)" stroke="url(#goldFrame)" stroke-width="1.5"/>

  <!-- Rudraksha Mala / Sacred Beads -->
  <g fill="#78350F" stroke="#D4AF37" stroke-width="1">
    <circle cx="270" cy="425" r="5"/>
    <circle cx="282" cy="433" r="5"/>
    <circle cx="295" cy="438" r="5"/>
    <circle cx="305" cy="438" r="5"/>
    <circle cx="318" cy="433" r="5"/>
    <circle cx="330" cy="425" r="5"/>
  </g>

  <!-- Neck -->
  <path d="M 275,340 L 325,340 L 320,410 L 280,410 Z" fill="url(#skinTone)"/>

  <!-- Head Silhouette & Facial Structure -->
  <ellipse cx="300" cy="270" rx="65" ry="80" fill="url(#skinTone)"/>

  <!-- Dignified Graying Hair & Traditional Grooming -->
  <path d="M 235,260 C 235,185 365,185 365,260 C 365,220 345,190 300,190 C 255,190 235,220 235,260 Z" fill="#334155"/>
  <!-- Distinguished Beard & Mustache -->
  <path d="M 260,295 Q 300,320 340,295 Q 350,335 300,358 Q 250,335 260,295 Z" fill="#475569" stroke="#64748B" stroke-width="1"/>

  <!-- Calm, Wise Eyes & Eyebrows -->
  <path d="M 262,250 Q 277,243 292,250" stroke="#1E293B" stroke-width="2.5" fill="none"/>
  <path d="M 308,250 Q 323,243 338,250" stroke="#1E293B" stroke-width="2.5" fill="none"/>
  <!-- Eyes -->
  <ellipse cx="277" cy="258" rx="8" ry="4" fill="#1E293B"/>
  <ellipse cx="323" cy="258" rx="8" ry="4" fill="#1E293B"/>
  <circle cx="279" cy="257" r="1.5" fill="#FFFFFF"/>
  <circle cx="325" cy="257" r="1.5" fill="#FFFFFF"/>

  <!-- Nose -->
  <path d="M 300,255 L 297,285 L 306,285" stroke="#A76B3C" stroke-width="2" fill="none"/>

  <!-- Sacred Chandan & Kumkum Tilak on Forehead -->
  <!-- Yellow Chandan U-Shape / Tripundra -->
  <path d="M 292,215 Q 300,230 308,215" stroke="#FDE047" stroke-width="3" fill="none"/>
  <!-- Red Kumkum Dot in Center -->
  <circle cx="300" cy="222" r="3" fill="#DC2626"/>

  <!-- Palm Leaf Brihat Parashara Scripture in Foreground -->
  <rect x="220" y="475" width="160" height="28" rx="4" fill="#FEF3C7" stroke="url(#goldFrame)" stroke-width="1.8"/>
  <line x1="230" y1="484" x2="370" y2="484" stroke="#B45309" stroke-width="1" stroke-dasharray="3 2"/>
  <line x1="230" y1="492" x2="350" y2="492" stroke="#B45309" stroke-width="1" stroke-dasharray="3 2"/>

  <!-- Identification Badge in Imperial Gold & Blue -->
  <rect x="120" y="535" width="360" height="42" rx="10" fill="#1E3A8A" stroke="url(#goldFrame)" stroke-width="2"/>
  <text x="300" y="555" font-family="'Cinzel', Georgia, serif" font-size="14" font-weight="700" fill="#FDE68A" text-anchor="middle" letter-spacing="1">ACHARYA DEVRATAN • AI GURU</text>
  <text x="300" y="570" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" font-weight="700" fill="#93C5FD" text-anchor="middle">BRIHAT PARASHARA • PRASHNA KUNDLI</text>
</svg>"""

with open('assets/illustrations/persona-devratan.svg', 'w', encoding='utf-8') as f:
    f.write(persona_devratan_svg)

# 7. PERSONA: DR. SUNITA SHASTRI (Jaimini & Relationship Scholar)
persona_sunita_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="sunitaHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A0E17" stop-opacity="0.95"/>
      <stop offset="65%" stop-color="#2A080E" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#140205" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="sunitaGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="40%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
    <linearGradient id="sareeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9D174D"/>
      <stop offset="50%" stop-color="#831843"/>
      <stop offset="100%" stop-color="#500724"/>
    </linearGradient>
    <linearGradient id="zariBorder" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <linearGradient id="sunitaSkin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E5C29F"/>
      <stop offset="100%" stop-color="#CE9B72"/>
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="600" fill="url(#sunitaHalo)" rx="24" stroke="url(#sunitaGold)" stroke-width="4"/>

  <!-- Celestial Sacred Geometry (Lotus Petal Halo & Navamsha D9 Ring) -->
  <circle cx="300" cy="260" r="195" fill="none" stroke="url(#sunitaGold)" stroke-width="2" stroke-dasharray="6 3" opacity="0.6"/>
  <circle cx="300" cy="260" r="160" fill="rgba(236, 72, 153, 0.08)" stroke="#EC4899" stroke-width="1.8"/>

  <!-- Jaimini Karaka Matrix Geometry -->
  <polygon points="300,105 435,260 300,415 165,260" fill="none" stroke="url(#sunitaGold)" stroke-width="1.5" opacity="0.4"/>

  <!-- Elegant Silk Saree Pallu & Shoulders -->
  <path d="M 160,500 Q 225,415 300,415 Q 375,415 440,500 L 460,540 L 140,540 Z" fill="url(#sareeGrad)" stroke="url(#sunitaGold)" stroke-width="2"/>
  <!-- Gold Embroidered Zari Pallu Border -->
  <path d="M 170,490 Q 240,430 330,460 L 320,540 L 150,540 Z" fill="rgba(212, 175, 55, 0.25)" stroke="url(#zariBorder)" stroke-width="3"/>

  <!-- Elegant Gold Necklace & Pendent -->
  <path d="M 265,395 Q 300,430 335,395" fill="none" stroke="url(#sunitaGold)" stroke-width="2.5"/>
  <circle cx="300" cy="425" r="7" fill="#DC2626" stroke="url(#sunitaGold)" stroke-width="1.5"/>

  <!-- Neck -->
  <path d="M 280,340 L 320,340 L 315,405 L 285,405 Z" fill="url(#sunitaSkin)"/>

  <!-- Head Silhouette & Face -->
  <ellipse cx="300" cy="265" rx="60" ry="74" fill="url(#sunitaSkin)"/>

  <!-- Neat Traditional Hair Tied Back with Traditional Gajra / Jasmine Accent -->
  <path d="M 230,250 C 230,175 370,175 370,250 C 370,205 350,180 300,180 C 250,180 230,205 230,250 Z" fill="#1E293B"/>
  <ellipse cx="300" cy="180" rx="35" ry="18" fill="#1E293B"/>
  <!-- Pearl / Jasmine Floral Accent -->
  <circle cx="245" cy="205" r="4.5" fill="#FEF08A"/>
  <circle cx="255" cy="195" r="4.5" fill="#FFFFFF"/>
  <circle cx="265" cy="190" r="4.5" fill="#FEF08A"/>

  <!-- Intelligent, Approachable Eyes & Eyebrows -->
  <path d="M 265,248 Q 278,240 292,246" stroke="#1E293B" stroke-width="2.2" fill="none"/>
  <path d="M 308,246 Q 322,240 335,248" stroke="#1E293B" stroke-width="2.2" fill="none"/>
  <!-- Eyes with Natural Kajal & Warm Light -->
  <ellipse cx="278" cy="254" rx="7.5" ry="4" fill="#1E293B"/>
  <ellipse cx="322" cy="254" rx="7.5" ry="4" fill="#1E293B"/>
  <circle cx="280" cy="253" r="1.5" fill="#FFFFFF"/>
  <circle cx="324" cy="253" r="1.5" fill="#FFFFFF"/>

  <!-- Elegant Feminine Nose -->
  <path d="M 300,252 L 298,278 L 305,278" stroke="#B87D4F" stroke-width="1.8" fill="none"/>

  <!-- Warm, Empathetic Smile -->
  <path d="M 285,298 Q 300,310 315,298" stroke="#9F1239" stroke-width="2.5" fill="none"/>

  <!-- Traditional Round Vermillion Red Bindi -->
  <circle cx="300" cy="235" r="4" fill="#DC2626" stroke="#FEF08A" stroke-width="1"/>

  <!-- Traditional Gold Jhumka Earrings -->
  <circle cx="235" cy="275" r="4" fill="url(#sunitaGold)"/>
  <polygon points="231,280 239,280 235,292" fill="url(#sunitaGold)"/>
  <circle cx="365" cy="275" r="4" fill="url(#sunitaGold)"/>
  <polygon points="361,280 369,280 365,292" fill="url(#sunitaGold)"/>

  <!-- Jaimini Sutra Manuscript Scroll in Hands -->
  <rect x="220" y="475" width="160" height="28" rx="4" fill="#FFFBEB" stroke="url(#sunitaGold)" stroke-width="1.8"/>
  <text x="300" y="493" font-family="'Cinzel', Georgia, serif" font-size="11" font-weight="700" fill="#78350F" text-anchor="middle" letter-spacing="0.5">JAIMINI UPADESHA</text>

  <!-- Identification Badge in Imperial Gold & Maroon -->
  <rect x="120" y="535" width="360" height="42" rx="10" fill="#781A24" stroke="url(#sunitaGold)" stroke-width="2"/>
  <text x="300" y="555" font-family="'Cinzel', Georgia, serif" font-size="14" font-weight="700" fill="#FDE68A" text-anchor="middle" letter-spacing="1">DR. SUNITA SHASTRI • AI GURU</text>
  <text x="300" y="570" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" font-weight="700" fill="#FBCFE8" text-anchor="middle">JAIMINI SUTRAS • CHARA KARAKAS • D9</text>
</svg>"""

with open('assets/illustrations/persona-sunita.svg', 'w', encoding='utf-8') as f:
    f.write(persona_sunita_svg)

# 8. PERSONA: PANDIT RAGHAVENDRA (Classical Yogas, Remedial & Shadbala Scholar)
persona_raghavendra_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="raghavHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A0E17" stop-opacity="0.95"/>
      <stop offset="65%" stop-color="#2A080E" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#140205" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="raghavGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="40%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
    <linearGradient id="silkKurta" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="60%" stop-color="#E2E8F0"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
    <linearGradient id="angavastram" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C2410C"/>
      <stop offset="60%" stop-color="#9A3412"/>
      <stop offset="100%" stop-color="#7C2D12"/>
    </linearGradient>
    <linearGradient id="raghavSkin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D8A878"/>
      <stop offset="100%" stop-color="#BF8856"/>
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="600" fill="url(#raghavHalo)" rx="24" stroke="url(#raghavGold)" stroke-width="4"/>

  <!-- Celestial Halo & Radiance Rings -->
  <circle cx="300" cy="260" r="195" fill="none" stroke="url(#raghavGold)" stroke-width="2" stroke-dasharray="6 3" opacity="0.6"/>
  <circle cx="300" cy="260" r="160" fill="rgba(217, 119, 6, 0.08)" stroke="#F59E0B" stroke-width="1.8"/>

  <!-- Classical Yogas & Shadbala Scales Geometry -->
  <polygon points="300,95 440,370 160,370" fill="none" stroke="url(#raghavGold)" stroke-width="1.5" opacity="0.35"/>
  <polygon points="300,425 440,150 160,150" fill="none" stroke="url(#raghavGold)" stroke-width="1.5" opacity="0.35"/>

  <!-- White Silk Kurta Shoulders -->
  <path d="M 165,495 Q 230,405 300,405 Q 370,405 435,495 L 460,540 L 140,540 Z" fill="url(#silkKurta)" stroke="url(#raghavGold)" stroke-width="2"/>
  <!-- Rich Saffron/Terracotta Angavastram Drape -->
  <path d="M 200,490 Q 250,420 300,440 L 285,540 L 160,540 Z" fill="url(#angavastram)" stroke="url(#raghavGold)" stroke-width="2"/>

  <!-- Sacred Tulsi Mala -->
  <g fill="#451A03" stroke="#D4AF37" stroke-width="1">
    <circle cx="275" cy="425" r="4.5"/>
    <circle cx="288" cy="433" r="4.5"/>
    <circle cx="300" cy="437" r="4.5"/>
    <circle cx="312" cy="433" r="4.5"/>
    <circle cx="325" cy="425" r="4.5"/>
  </g>

  <!-- Neck -->
  <path d="M 276,340 L 324,340 L 318,410 L 282,410 Z" fill="url(#raghavSkin)"/>

  <!-- Head Silhouette & Face -->
  <ellipse cx="300" cy="270" rx="64" ry="78" fill="url(#raghavSkin)"/>

  <!-- Traditional Scholar Haircut with Small Shikha / Traditional Knot -->
  <path d="M 235,260 C 235,185 365,185 365,260 C 365,215 345,185 300,185 C 255,185 235,215 235,260 Z" fill="#1E293B"/>
  <circle cx="300" cy="180" r="10" fill="#1E293B"/>

  <!-- Analytical, Methodical Eyebrows & Glasses/Eyes -->
  <path d="M 264,250 Q 278,242 292,249" stroke="#1E293B" stroke-width="2.5" fill="none"/>
  <path d="M 308,249 Q 322,242 336,250" stroke="#1E293B" stroke-width="2.5" fill="none"/>

  <!-- Framed Glasses (Refined Scholarly Look) -->
  <rect x="264" y="248" width="28" height="18" rx="4" fill="none" stroke="url(#raghavGold)" stroke-width="1.8"/>
  <rect x="308" y="248" width="28" height="18" rx="4" fill="none" stroke="url(#raghavGold)" stroke-width="1.8"/>
  <line x1="292" y1="255" x2="308" y2="255" stroke="url(#raghavGold)" stroke-width="1.8"/>
  <!-- Eyes -->
  <ellipse cx="278" cy="257" rx="6" ry="3.5" fill="#1E293B"/>
  <ellipse cx="322" cy="257" rx="6" ry="3.5" fill="#1E293B"/>
  <circle cx="280" cy="256" r="1.5" fill="#FFFFFF"/>
  <circle cx="324" cy="256" r="1.5" fill="#FFFFFF"/>

  <!-- Scholarly Nose & Subtle Mustache -->
  <path d="M 300,255 L 297,284 L 305,284" stroke="#9A6237" stroke-width="2" fill="none"/>
  <path d="M 284,296 Q 300,292 316,296" stroke="#334155" stroke-width="2" fill="none"/>

  <!-- Traditional Tripundra / Sacred Ash & Kumkum Tilak -->
  <line x1="288" y1="216" x2="312" y2="216" stroke="#E2E8F0" stroke-width="2"/>
  <line x1="286" y1="221" x2="314" y2="221" stroke="#E2E8F0" stroke-width="2"/>
  <line x1="288" y1="226" x2="312" y2="226" stroke="#E2E8F0" stroke-width="2"/>
  <circle cx="300" cy="221" r="2.5" fill="#DC2626"/>

  <!-- Sacred Vedic Yantra Shield in Foreground -->
  <rect x="220" y="475" width="160" height="28" rx="4" fill="#FFFBEB" stroke="url(#raghavGold)" stroke-width="1.8"/>
  <text x="300" y="493" font-family="'Cinzel', Georgia, serif" font-size="11" font-weight="700" fill="#78350F" text-anchor="middle" letter-spacing="0.5">SHADBALA &amp; YOGAS</text>

  <!-- Identification Badge in Imperial Gold & Saffron -->
  <rect x="120" y="535" width="360" height="42" rx="10" fill="#380710" stroke="url(#raghavGold)" stroke-width="2"/>
  <text x="300" y="555" font-family="'Cinzel', Georgia, serif" font-size="14" font-weight="700" fill="#FDE68A" text-anchor="middle" letter-spacing="1">PANDIT RAGHAVENDRA • AI GURU</text>
  <text x="300" y="570" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" font-weight="700" fill="#FED7AA" text-anchor="middle">CLASSICAL YOGAS • SHADBALA • REMEDIES</text>
</svg>"""

with open('assets/illustrations/persona-raghavendra.svg', 'w', encoding='utf-8') as f:
    f.write(persona_raghavendra_svg)

print("Generated all missing illustrations and persona portraits successfully!")
