import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. PHASE 1: TOKEN RECONSTRUCTION
const rootStart = html.indexOf(':root {');
const rootEnd = html.indexOf('}', rootStart) + 1;
if (rootStart === -1 || rootEnd === -1) {
  throw new Error('Could not find :root in index.html');
}

const newRootTokens = `:root {
      color-scheme: light;

      /* Phase 1 Authoritative Design Tokens */
      --av-blue-deep: #1D4ED8;
      --av-blue-primary: #3B82F6;
      --av-blue-light: #60A5FA;
      --av-blue-pale: #93C5FD;

      --av-top-accent: linear-gradient(90deg, #1D4ED8 0%, #3B82F6 40%, #60A5FA 70%, #93C5FD 100%);
      --av-blue-glow: 0 2px 12px rgba(59, 130, 246, 0.35);

      --av-maroon-base: #380710;
      --av-maroon-primary: #4A0E17;
      --av-maroon-raised: #5A121D;
      --av-maroon-surface: #6B1D2F;

      --av-indigo-deep: #151A32;
      --av-indigo-raised: #242B49;

      --av-gold-primary: #D4AF37;
      --av-gold-hover: #E5C158;
      --av-gold-amber: #F59E0B;
      --av-gold-light: #FAF3E0;
      --av-gold-border: #C49A42;
      --av-gold-bronze: #78350F;

      --av-canvas: #FAF7F0;
      --av-surface: #FFFFFF;
      --av-surface-muted: #F8FAFC;
      --av-border: #CBD5E1;

      --av-text-primary: #1E1B4B;
      --av-text-secondary: #475569;
      --av-text-placeholder: #475569;

      --av-text-inverse: #FAF7F0;
      --av-text-inverse-secondary: #E2D8CF;

      --av-success-text: #065F46;
      --av-success-bg: #D1FAE5;

      --av-danger-text: #991B1B;
      --av-danger-bg: #FEE2E2;

      --av-spiritual-text: #581C87;
      --av-spiritual-bg: #F3E8FF;

      --av-radius-sm: 8px;
      --av-radius-md: 14px;
      --av-radius-lg: 20px;

      --av-page-gutter: clamp(16px, 3vw, 36px);
      --av-content-max: 1440px;
      --av-control-height: 46px;

      --av-focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.42);

      /* Typography Tokens */
      --av-text-xs: 0.75rem;
      --av-text-sm: 0.875rem;
      --av-text-base: 1rem;
      --av-text-lg: 1.125rem;

      --av-heading-sm: clamp(1.25rem, 2vw, 1.6rem);
      --av-heading-md: clamp(1.6rem, 3vw, 2.25rem);
      --av-heading-lg: clamp(2rem, 5vw, 3.5rem);

      --av-leading-tight: 1.15;
      --av-leading-body: 1.65;

      --av-font-body: "Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif;
      --av-font-display: "Cinzel", Georgia, serif;

      /* Standard Semantic & Component Aliases */
      --av-brand: var(--av-indigo-deep);
      --av-brand-raised: var(--av-indigo-raised);
      --av-brand-border: #414967;
      --av-gold: var(--av-gold-primary);
      --av-gold-soft: var(--av-gold-hover);
      --av-gold-deep: var(--av-gold-bronze);
      --av-text: var(--av-text-primary);
      --av-text-on-gold: #2A080E;
      --av-success: var(--av-success-text);
      --av-warning: var(--av-gold-amber);
      --av-danger: var(--av-danger-text);
      --av-spiritual-accent: var(--av-spiritual-text);
      --av-border-top-blue: var(--av-blue-primary);
      --av-celestial-blue-gradient: var(--av-top-accent);
      --av-maroon-darkest: var(--av-maroon-base);
      --av-maroon-surface: var(--av-maroon-raised);
      --av-maroon-card: var(--av-surface);
      --av-maroon-light: var(--av-maroon-raised);
      --av-maroon-glass: rgba(56, 7, 16, 0.94);
      --av-maroon-gradient: linear-gradient(135deg, var(--av-maroon-base) 0%, var(--av-maroon-primary) 100%);
      --av-gold-glow: 0 0 16px rgba(212, 175, 55, 0.35);
      --av-gold-gradient: linear-gradient(135deg, var(--av-gold-primary) 0%, var(--av-gold-amber) 100%);
      --av-canvas-deep: var(--av-canvas);
      --av-text-light: var(--av-text-inverse);
      --av-text-warm: var(--av-canvas);
      --av-text-subtle: var(--av-text-secondary);
      --av-text-muted: var(--av-text-secondary);
      --av-content-wide: 1440px;
      --av-content-reading: 1080px;
      --av-radius-card: var(--av-radius-lg);
      --av-radius-control: var(--av-radius-sm);
      --av-border-subtle: var(--av-border);
      --av-color-maroon-950: var(--av-maroon-base);
      --av-color-maroon-800: var(--av-maroon-primary);
      --av-color-saffron: var(--av-gold-amber);
      --av-color-gold: var(--av-gold-primary);
      --av-color-parchment: var(--av-canvas);
      --av-color-surface: var(--av-surface);
      --av-color-surface-warm: var(--av-canvas);
      --av-color-surface-soft: var(--av-surface-muted);
      --av-color-ink: var(--av-text-primary);
      --av-color-text-secondary: var(--av-text-secondary);
      --av-color-text-muted: var(--av-text-secondary);
      --av-color-border: var(--av-border);
      --av-color-border-strong: #94A3B8;
      --av-color-success: var(--av-success-text);
      --av-color-success-bg: var(--av-success-bg);
      --av-color-warning: var(--av-gold-amber);
      --av-color-warning-bg: #FEF3C7;
      --av-color-danger: var(--av-danger-text);
      --av-color-danger-bg: var(--av-danger-bg);
      --av-color-info: var(--av-blue-primary);
      --av-color-info-bg: #DBEAFE;
      --av-color-focus: var(--av-blue-primary);
    }`;

html = html.slice(0, rootStart) + newRootTokens + html.slice(rootEnd);
console.log('Phase 1: :root tokens updated');

// 2. PHASE 2: TOP BORDER & NAVBAR STICKY ANCHOR
const oldTopBorder = `    /* Celestial Royal Blue Top Accent Border */
    .celestial-top-border {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, #151A32 0%, #C49A42 50%, #151A32 100%);
      box-shadow: none;
      z-index: 10550;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .celestial-top-border {
        box-shadow: 0 1px 4px rgba(59, 130, 246, 0.4);
      }
    }`;

const newTopBorder = `    /* Celestial Royal Blue Top Accent Border (Phase 2) */
    .celestial-top-border {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 3.5px;
      background: var(--av-top-accent);
      box-shadow: var(--av-blue-glow);
      z-index: 10550;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .celestial-top-border {
        box-shadow: none;
      }
    }`;

if (html.includes(oldTopBorder)) {
  html = html.replace(oldTopBorder, newTopBorder);
  console.log('Phase 2: .celestial-top-border replaced cleanly');
} else {
  console.warn('Phase 2 warning: exact old top border block not matched, searching by class');
  html = html.replace(/\.celestial-top-border\s*\{[\s\S]*?z-index:\s*10550;[\s\S]*?pointer-events:\s*none;\s*\}/, `.celestial-top-border {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 3.5px;
      background: var(--av-top-accent);
      box-shadow: var(--av-blue-glow);
      z-index: 10550;
      pointer-events: none;
    }`);
}

// Ensure .main-navbar has top: 3.5px
html = html.replace(/\.main-navbar\s*\{([^}]*?)top:\s*0;/, `.main-navbar {$1top: 3.5px;`);

// 3. PHASE 3 & 4 & 5 & 6: BUTTONS, FORM CONTROLS, DROPDOWNS, AND SIMULATOR PILLS
const oldButtonSectionRegex = /\.btn-gold-primary\s*\{[\s\S]*?\.btn-outline-secondary:hover\s*\{[\s\S]*?\}/;
const newButtonsCss = `/* Phase 3: Primary Gold Buttons */
    .btn-gold-primary {
      background: linear-gradient(135deg, #D4AF37 0%, #F59E0B 100%) !important;
      color: #2A080E !important;
      font-weight: 700 !important;
      border: 1px solid transparent;
      border-radius: var(--av-radius-md);
      min-height: var(--av-control-height);
      box-shadow: 0 4px 14px rgba(212, 175, 55, 0.28);
      transition: box-shadow 160ms ease, filter 160ms ease, transform 160ms ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }
    .btn-gold-primary:hover {
      filter: brightness(1.03);
      box-shadow: 0 6px 18px rgba(212, 175, 55, 0.34);
      color: #2A080E !important;
    }
    .btn-gold-primary:active {
      transform: translateY(1px);
    }
    .btn-gold-primary:focus-visible {
      outline: 3px solid #3B82F6;
      outline-offset: 2px;
    }
    .btn-gold-primary:disabled,
    .btn-gold-primary[aria-disabled="true"] {
      opacity: 0.72;
      box-shadow: none;
      transform: none;
      cursor: not-allowed;
    }

    /* Phase 4: Context-Aware Secondary Buttons */
    .btn-outline-secondary,
    .btn-outline-secondary--light {
      background: #FFFFFF !important;
      color: #1E1B4B !important;
      border: 1px solid #CBD5E1 !important;
      border-radius: var(--av-radius-md);
      min-height: var(--av-control-height);
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-outline-secondary:hover,
    .btn-outline-secondary--light:hover {
      background: #F8FAFC !important;
      border-color: #94A3B8 !important;
      color: #0F172A !important;
    }
    .btn-outline-secondary:focus-visible,
    .btn-outline-secondary--light:focus-visible {
      outline: 3px solid #3B82F6;
      outline-offset: 2px;
    }

    /* Dark surface secondary buttons */
    .btn-outline-secondary--dark,
    .dark-surface .btn-outline-secondary,
    .hero-banner .btn-outline-secondary,
    .cosmic-hero-banner .btn-outline-secondary,
    .guidance-discovery-card .btn-outline-secondary,
    .main-navbar .btn-outline-secondary {
      background: rgba(255, 255, 255, 0.07) !important;
      color: #FAF7F0 !important;
      border: 1px solid rgba(212, 175, 55, 0.55) !important;
      border-radius: var(--av-radius-md);
      min-height: var(--av-control-height);
    }
    .btn-outline-secondary--dark:hover,
    .dark-surface .btn-outline-secondary:hover,
    .hero-banner .btn-outline-secondary:hover,
    .cosmic-hero-banner .btn-outline-secondary:hover,
    .guidance-discovery-card .btn-outline-secondary:hover,
    .main-navbar .btn-outline-secondary:hover {
      background: rgba(212, 175, 55, 0.12) !important;
      border-color: #D4AF37 !important;
      color: #FFFFFF !important;
    }
    .btn-outline-secondary--dark:focus-visible {
      outline: 3px solid #60A5FA;
      outline-offset: 2px;
    }

    /* Phase 5 & 6: Form Controls, Dropdowns & Native Options */
    .form-control--light,
    .input--light,
    .form-input-text,
    .form-input-select,
    select,
    input[type="text"],
    input[type="date"],
    input[type="time"],
    input[type="number"],
    input[type="tel"],
    input[type="email"],
    input[type="password"],
    textarea {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      color: #1E1B4B !important;
      background: #FFFFFF !important;
      border: 1.5px solid #CBD5E1 !important;
      border-radius: var(--av-radius-sm);
      min-height: var(--av-control-height);
      padding: 10px 12px;
      font: inherit;
    }

    .form-control--light::placeholder,
    .input--light::placeholder,
    .form-input-text::placeholder,
    input::placeholder,
    textarea::placeholder {
      color: #475569 !important;
      opacity: 1 !important;
    }

    .form-control--light:focus,
    .input--light:focus,
    .form-input-text:focus,
    .form-input-select:focus,
    select:focus,
    input:focus,
    textarea:focus {
      outline: 3px solid rgba(59, 130, 246, 0.38) !important;
      outline-offset: 1px !important;
      border-color: #3B82F6 !important;
    }

    select option {
      color: #1E1B4B !important;
      background-color: #FFFFFF !important;
    }

    /* Phase 5: Tier Simulation Buttons & Action Pills */
    .tier-sim-btn,
    .mob-sim-btn {
      background: #FFFFFF !important;
      color: #1E1B4B !important;
      border: 1.5px solid #CBD5E1 !important;
      border-radius: var(--av-radius-sm);
      min-height: 32px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .tier-sim-btn:hover,
    .mob-sim-btn:hover {
      background: #F8FAFC !important;
      border-color: #94A3B8 !important;
      color: #0F172A !important;
    }
    .tier-sim-btn.active,
    .mob-sim-btn.active {
      background: #4A0E17 !important;
      border-color: #D4AF37 !important;
      color: #FAF7F0 !important;
      box-shadow: 0 2px 8px rgba(74, 14, 23, 0.35);
    }

    .chat-pill-action-btn {
      background: #FEF3C7 !important;
      border: 1px solid #F59E0B !important;
      color: #92400E !important;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .chat-pill-action-btn:hover {
      background: #FDE68A !important;
      color: #78350F !important;
      border-color: #D97706 !important;
    }`;

html = html.replace(oldButtonSectionRegex, newButtonsCss);
console.log('Phase 3-6: Buttons, inputs, selects, tier pills updated');

// 4. Update updateTierSimulatorButtonsUI in JS
const oldTierSimFnRegex = /function updateTierSimulatorButtonsUI\(tier\) \{[\s\S]*?const badge = document\.getElementById\('mob-sim-tier-active-badge'\);[\s\S]*?if \(badge\) badge\.textContent = norm;\s*\}/;
const newTierSimFn = `function updateTierSimulatorButtonsUI(tier) {
      const norm = String(tier || 'FREE').toUpperCase();
      ['free', 'plus', 'premium'].forEach(t => {
        const hBtn = document.getElementById(\`sim-tier-\${t}\`);
        const mBtn = document.getElementById(\`mob-sim-tier-\${t}\`);
        const isMatch = (t === norm.toLowerCase());
        if (hBtn) {
          hBtn.classList.toggle('active', isMatch);
          hBtn.style.background = '';
          hBtn.style.color = '';
        }
        if (mBtn) {
          mBtn.classList.toggle('active', isMatch);
          mBtn.style.background = '';
          mBtn.style.color = '';
          mBtn.style.borderColor = '';
        }
      });
      const badge = document.getElementById('mob-sim-tier-active-badge');
      if (badge) badge.textContent = norm;
    }`;
html = html.replace(oldTierSimFnRegex, newTierSimFn);
console.log('Phase 5: updateTierSimulatorButtonsUI JS updated');

// 5. PHASE 7: FIX YEARLY & HORIZON LOADING STATE TRANSITION
const oldSelectHorizonRegex = /function selectGuidanceHorizon\(horizon\) \{[\s\S]*?generatePersonalizedGuidance\(horizon, currentGuidanceRequestId\);\s*\}/;
const newSelectHorizonFn = `function selectGuidanceHorizon(horizon) {
      if (guidanceAbortController) {
        try { guidanceAbortController.abort(); } catch (e) {}
      }
      currentGuidanceHorizon = horizon;
      const activeReqId = ++currentGuidanceRequestId;

      document.querySelectorAll('.horizon-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('btn-hz-' + horizon);
      if (activeBtn) activeBtn.classList.add('active');

      if (!currentCalculatedChart && window.astroGuidanceState === 'NO_PROFILE') {
        setGuidanceState('GENERAL_TRANSIT_PREVIEW');
      }

      const isHi = typeof currentLanguage !== 'undefined' && currentLanguage === 'hi';
      const titleEl = document.getElementById('guidance-report-title');
      const hMeta = HORIZON_TITLES[horizon] || { en: horizon, hi: horizon };
      if (titleEl) {
        titleEl.textContent = isHi ? \`गणना हो रही है: \${hMeta.hi}...\` : \`Calculating: \${hMeta.en}...\`;
      }
      const summaryEl = document.getElementById('guidance-disp-summary');
      if (summaryEl) {
        summaryEl.innerHTML = \`<span style="color: #64748B;"><i class="fa-solid fa-spinner fa-spin" style="color: #D4AF37; margin-right: 6px;"></i> \${isHi ? 'स्विस एफिमेरिस एवं पराशरी सूत्रों से गणना की जा रही है...' : 'Computing high-precision Swiss Ephemeris astronomical positions...'}</span>\`;
      }
      const outlookEl = document.getElementById('guidance-disp-outlook');
      if (outlookEl) {
        outlookEl.innerHTML = \`<span style="color: #64748B;"><i class="fa-solid fa-spinner fa-spin" style="color: #D4AF37; margin-right: 6px;"></i> \${isHi ? \`\${hMeta.hi} फलादेश की गणना जारी है...\` : \`Synthesizing \${hMeta.en} planetary transits and natal house activations...\`}</span>\`;
      }
      const suppEl = document.getElementById('guidance-disp-supportive');
      if (suppEl) {
        suppEl.innerHTML = \`<li><span style="color: #64748B;"><i class="fa-solid fa-spinner fa-spin"></i> \${isHi ? 'शुभ ग्रहीय संरेखण का विश्लेषण जारी...' : 'Analyzing benefic planetary alignments...'}</span></li>\`;
      }
      const challEl = document.getElementById('guidance-disp-challenges');
      if (challEl) {
        challEl.innerHTML = \`<li><span style="color: #64748B;"><i class="fa-solid fa-spinner fa-spin"></i> \${isHi ? 'सतर्कता एवं चुनौती कालखंड का परिकलन...' : 'Evaluating cautionary windows...'}</span></li>\`;
      }
      const winEl = document.getElementById('guidance-disp-windows');
      if (winEl) {
        winEl.innerHTML = \`<div class="guidance-window-card" style="opacity: 0.7;"><i class="fa-regular fa-clock fa-spin" style="color: #D4AF37;"></i><span>\${isHi ? 'महत्वपूर्ण समय वेला की गणना जारी...' : 'Calculating key time windows...'}</span></div>\`;
      }
      const periodWrap = document.getElementById('guidance-period-items-container');
      if (periodWrap) {
        periodWrap.innerHTML = \`<div style="text-align:center; padding: 24px; color: #64748B;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: #D4AF37; margin-bottom: 8px;"></i><p style="margin: 0; font-size: 13px;">\${isHi ? 'कालचक्र प्रगति लोड हो रही है...' : 'Loading horizon timeline progression...'}</p></div>\`;
      }

      generatePersonalizedGuidance(horizon, activeReqId);
    }`;

html = html.replace(oldSelectHorizonRegex, newSelectHorizonFn);
console.log('Phase 7: selectGuidanceHorizon state reset updated');

// In renderStructuredPredictionUI: gate on horizon match
html = html.replace(
  /function renderStructuredPredictionUI\(data\) \{\s*if \(!data \|\| !data\.sections\) return;/,
  `function renderStructuredPredictionUI(data) {
      if (!data || !data.sections) return;
      if (data.time_horizon && data.time_horizon.toLowerCase() !== currentGuidanceHorizon.toLowerCase()) {
        console.warn('Dropping stale guidance render for', data.time_horizon, 'active horizon is', currentGuidanceHorizon);
        return;
      }`
);
console.log('Phase 7: renderStructuredPredictionUI horizon-matching gate added');

fs.writeFileSync(indexPath, html, 'utf8');
console.log('All updates written to index.html successfully!');
