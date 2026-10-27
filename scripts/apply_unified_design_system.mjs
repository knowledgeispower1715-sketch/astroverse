import fs from 'fs';

let html = fs.readFileSync('index.html', 'utf8');

console.log('1. Updating :root design tokens and adding backwards-compatibility aliases...');

// Check if :root replacement target exists
const rootStartStr = ':root {';
const rootEndStr = '/* Luxury Cosmic Architecture Components */';

const rootStartIndex = html.indexOf(rootStartStr);
const rootEndIndex = html.indexOf(rootEndStr);

if (rootStartIndex === -1 || rootEndIndex === -1) {
  console.error('Could not find :root block');
  process.exit(1);
}

const newRoot = `:root {
      color-scheme: light;

      /* Phase 1 Canonical Token System */
      --av-brand: #18213A;
      --av-brand-raised: #293452;
      --av-brand-border: #414967;

      /* Main content surfaces */
      --av-canvas: #F7F5EF;
      --av-surface: #FFFFFF;
      --av-surface-subtle: #F0EEE8;
      --av-surface-muted: #F8FAFC;
      --av-border: #D9DDE5;
      --border-color: #D9DDE5;

      /* Text on light surfaces */
      --av-text-primary: #20263A;
      --av-text-secondary: #566074;
      --av-text-placeholder: #566074;
      --text-muted: #566074;
      --av-text: #20263A;

      /* Text on dark surfaces */
      --av-text-inverse: #FFFFFF;
      --av-text-inverse-secondary: #E2E7F0;
      --av-text-light: #FFFFFF;
      --av-text-warm: #F7F5EF;
      --av-text-subtle: #566074;

      /* Temple gold accent */
      --av-gold: #D4AF37;
      --av-gold-primary: #D4AF37;
      --av-gold-hover: #C49A32;
      --av-gold-cta: #E2B64B;
      --av-gold-text: #211B0D;
      --av-text-on-gold: #2A080E;
      --av-gold-bright: #F5C45E;
      --av-gold-amber: #F59E0B;
      --saffron-orange: #F59E0B;
      --av-gold-light: #FAF3E0;
      --av-gold-border: #C49A42;
      --av-gold-bronze: #78350F;
      --av-gold-deep: #78350F;
      --av-gold-soft: #C49A32;
      --av-gold-glow: 0 0 16px rgba(212, 175, 55, 0.35);
      --av-gold-gradient: linear-gradient(135deg, #E2B64B 0%, #D4AF37 100%);

      /* Celestial blue accent */
      --av-blue: #3B82F6;
      --av-blue-primary: #3B82F6;
      --av-blue-deep: #1D4ED8;
      --av-blue-light: #60A5FA;
      --av-blue-pale: #93C5FD;
      --av-top-accent: linear-gradient(90deg, #1D4ED8 0%, #3B82F6 40%, #60A5FA 70%, #93C5FD 100%);
      --av-blue-glow: 0 2px 12px rgba(59, 130, 246, 0.35);

      /* Semantic states */
      --av-success-text: #176B55;
      --av-success-bg: #E2F3EA;
      --av-warning-text: #85520B;
      --av-warning-bg: #FFF1CC;
      --av-error-text: #991B1B;
      --av-error-bg: #FEE2E2;
      --av-danger-text: #991B1B;
      --av-danger-bg: #FEE2E2;
      --av-spiritual-text: #581C87;
      --av-spiritual-bg: #F3E8FF;

      /* Legacy Maroon & Brand Fallbacks (Guarantees Active Tab Contrast) */
      --vedic-maroon: #4A0E17;
      --deep-maroon: #380710;
      --av-maroon-base: #380710;
      --av-maroon-primary: #4A0E17;
      --av-maroon-raised: #5A121D;
      --av-maroon-surface: #6B1D2F;
      --av-maroon-darkest: #380710;
      --av-maroon-card: #FFFFFF;
      --av-maroon-light: #5A121D;
      --av-maroon-glass: rgba(56, 7, 16, 0.94);
      --av-maroon-gradient: linear-gradient(135deg, #380710 0%, #4A0E17 100%);

      /* Color System Namespaces */
      --av-color-maroon-950: #380710;
      --av-color-maroon-800: #4A0E17;
      --av-color-saffron: #F59E0B;
      --av-color-gold: #D4AF37;
      --av-color-parchment: #F7F5EF;
      --av-color-surface: #FFFFFF;
      --av-color-surface-warm: #F7F5EF;
      --av-color-surface-soft: #F0EEE8;
      --av-color-ink: #20263A;
      --av-color-text-secondary: #566074;
      --av-color-text-muted: #566074;
      --av-color-border: #D9DDE5;
      --av-color-border-strong: #94A3B8;
      --av-color-success: #176B55;
      --av-color-success-bg: #E2F3EA;
      --av-color-warning: #85520B;
      --av-color-warning-bg: #FFF1CC;
      --av-color-danger: #991B1B;
      --av-color-danger-bg: #FEE2E2;
      --av-color-info: #3B82F6;
      --av-color-info-bg: #DBEAFE;
      --av-color-focus: #3B82F6;

      /* Layout & Max Widths */
      --av-page-gutter: clamp(16px, 3vw, 36px);
      --av-content-max: 1360px;
      --av-reading-max: 1000px;
      --av-content-wide: 1360px;
      --av-content-reading: 1000px;

      /* Shapes & Radii */
      --av-radius-sm: 8px;
      --av-radius-md: 14px;
      --av-radius-lg: 20px;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-full: 9999px;
      --av-radius-card: 16px;
      --av-radius-control: 8px;
      --astro-radius-card: 16px;

      /* Shadows */
      --av-shadow-card: 0 8px 24px rgba(24, 33, 58, 0.07);
      --av-shadow-elevated: 0 18px 44px rgba(24, 33, 58, 0.13);
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);

      /* Controls */
      --av-control-height: 46px;
      --av-focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.38);

      /* Typography Scale */
      --av-text-xs: 0.75rem;
      --av-text-sm: 0.875rem;
      --av-text-base: 1rem;
      --av-text-lg: 1.125rem;

      --av-heading-sm: clamp(1.25rem, 2vw, 1.6rem);
      --av-heading-md: clamp(1.6rem, 3vw, 2.25rem);
      --av-heading-lg: clamp(2rem, 4.5vw, 3.25rem);

      --av-leading-tight: 1.2;
      --av-leading-body: 1.65;

      --av-font-body: "Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif;
      --av-font-display: "Cinzel", Georgia, serif;
    }

    `;

html = html.substring(0, rootStartIndex) + newRoot + html.substring(rootEndIndex);

console.log('2. Updating button and horizon switchers in CSS...');

// Update .horizon-btn.active
const oldHorizonBtnActive = `.horizon-btn.active {
      background: linear-gradient(135deg, var(--vedic-maroon), var(--deep-maroon));
      color: #FFFFFF;
      box-shadow: var(--shadow-sm);
    }`;

const newHorizonBtnActive = `.horizon-btn.active {
      background: var(--av-brand, #18213A) !important;
      color: #FFFFFF !important;
      border-color: var(--av-gold, #D4AF37) !important;
      box-shadow: 0 2px 8px rgba(24, 33, 58, 0.25) !important;
    }`;

if (html.includes(oldHorizonBtnActive)) {
  html = html.replace(oldHorizonBtnActive, newHorizonBtnActive);
  console.log('  Replaced .horizon-btn.active');
} else {
  console.log('  .horizon-btn.active pattern not matched directly, checking regex');
}

// Update .subtab-btn.active
const oldSubtabBtnActive = `.subtab-btn.active {
      background: var(--vedic-maroon);
      color: #FFFFFF;
      font-weight: 700;
    }`;

const newSubtabBtnActive = `.subtab-btn.active {
      background: var(--av-brand, #18213A) !important;
      color: #FFFFFF !important;
      border-color: var(--av-gold, #D4AF37) !important;
      font-weight: 700 !important;
      box-shadow: 0 2px 6px rgba(24, 33, 58, 0.2) !important;
    }`;

if (html.includes(oldSubtabBtnActive)) {
  html = html.replace(oldSubtabBtnActive, newSubtabBtnActive);
  console.log('  Replaced .subtab-btn.active');
}

// Update .nav-pill:hover, .nav-pill.active
const oldNavPillActive = `.nav-pill:hover, .nav-pill.active {
      background: var(--vedic-maroon);
      border-color: var(--vedic-maroon);
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(136, 19, 55, 0.2);
    }`;

const newNavPillActive = `.nav-pill:hover, .nav-pill.active {
      background: var(--av-brand, #18213A) !important;
      border-color: var(--av-gold, #D4AF37) !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 8px rgba(24, 33, 58, 0.2) !important;
    }`;

if (html.includes(oldNavPillActive)) {
  html = html.replace(oldNavPillActive, newNavPillActive);
  console.log('  Replaced .nav-pill.active');
}

// Update .page-main-container
const oldPageMainContainer = `.page-main-container {
      max-width: 1280px;
      margin: 24px auto 60px;
      padding: 0 20px;
    }`;

const newPageMainContainer = `.page-main-container {
      max-width: var(--av-content-max, 1360px);
      margin: 24px auto 60px;
      padding: 0 var(--av-page-gutter, clamp(16px, 3vw, 36px));
    }`;

if (html.includes(oldPageMainContainer)) {
  html = html.replace(oldPageMainContainer, newPageMainContainer);
  console.log('  Replaced .page-main-container');
}

// Update .cosmic-service-card
console.log('3. Updating Services Directory cards CSS...');
const oldCosmicServiceCard = `.cosmic-service-card {
      background: var(--av-maroon-gradient, linear-gradient(145deg, #4A0E17 0%, #6B1D2F 55%, #380710 100%));
      border: 1px solid var(--av-border-subtle, rgba(212, 175, 55, 0.22));
      border-radius: var(--av-radius-card, 18px);
      overflow: hidden;
      box-shadow: var(--av-shadow-card, 0 14px 36px rgba(12, 2, 7, 0.35));
      transition: transform 0.26s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.26s ease, border-color 0.26s ease;
      display: flex;
      flex-direction: column;
      position: relative;
      color: var(--av-text-light, #FFFFFF);
    }`;

const newCosmicServiceCard = `.cosmic-service-card {
      background: #FFFFFF !important;
      border: 1px solid var(--av-border, #D9DDE5) !important;
      border-radius: var(--av-radius-md, 14px) !important;
      overflow: hidden !important;
      box-shadow: var(--av-shadow-card, 0 8px 24px rgba(24, 33, 58, 0.07)) !important;
      transition: transform 0.26s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.26s ease, border-color 0.26s ease !important;
      display: flex !important;
      flex-direction: column !important;
      position: relative !important;
      color: var(--av-text-primary, #20263A) !important;
    }
    .cosmic-service-card:hover {
      transform: translateY(-4px) !important;
      box-shadow: 0 14px 32px rgba(24, 33, 58, 0.12) !important;
      border-color: var(--av-gold, #D4AF37) !important;
    }
    .cosmic-card-art-wrap {
      width: 100% !important;
      height: 160px !important;
      background: linear-gradient(135deg, #18213A 0%, #293452 100%) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      overflow: hidden !important;
      padding: 16px !important;
      border-bottom: 1px solid rgba(212, 175, 55, 0.25) !important;
    }
    .cosmic-card-title {
      font-family: var(--av-font-display, "Cinzel", Georgia, serif) !important;
      font-size: 17px !important;
      font-weight: 800 !important;
      color: var(--av-brand, #18213A) !important;
      margin-bottom: 8px !important;
      line-height: 1.3 !important;
    }
    .cosmic-card-desc {
      font-size: 13px !important;
      color: var(--av-text-secondary, #566074) !important;
      line-height: 1.55 !important;
      margin-bottom: 18px !important;
      flex: 1 !important;
    }
    .cosmic-card-tag-pill {
      font-size: 11px !important;
      font-weight: 700 !important;
      padding: 3px 8px !important;
      border-radius: 6px !important;
      background: #EFF6FF !important;
      color: #1D4ED8 !important;
      border: 1px solid #BFDBFE !important;
    }`;

if (html.includes(oldCosmicServiceCard)) {
  html = html.replace(oldCosmicServiceCard, newCosmicServiceCard);
  console.log('  Replaced .cosmic-service-card');
}

// Update .cosmic-hub-tab.active
console.log('4. Updating Cosmic Feature Hub tabs...');
const oldCosmicHubTabActive = `.cosmic-hub-tab.active {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);
      color: #F5C45E;
      border-color: rgba(212, 175, 55, 0.4);
      box-shadow: 0 4px 14px rgba(30, 27, 75, 0.25);
    }`;

const newCosmicHubTabActive = `.cosmic-hub-tab.active {
      background: var(--av-brand, #18213A) !important;
      color: #FFFFFF !important;
      border-color: var(--av-gold, #D4AF37) !important;
      box-shadow: 0 4px 14px rgba(24, 33, 58, 0.2) !important;
    }
    .cosmic-hub-tab.active i {
      color: var(--av-gold, #D4AF37) !important;
    }`;

if (html.includes(oldCosmicHubTabActive)) {
  html = html.replace(oldCosmicHubTabActive, newCosmicHubTabActive);
  console.log('  Replaced .cosmic-hub-tab.active');
}

// Update .guidance-premium-cta-box
console.log('5. Updating Paid-Access Banner & Footer styling...');
const oldGuidancePremiumCtaBox = `.guidance-premium-cta-box {
      background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
      border: 2px dashed #F59E0B;
      border-radius: 14px;
      padding: 24px 20px;
      text-align: center;
      margin: 18px 0;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.09);
    }`;

const newGuidancePremiumCtaBox = `.guidance-premium-cta-box {
      background: linear-gradient(135deg, var(--av-brand, #18213A) 0%, var(--av-brand-raised, #293452) 100%);
      border: 1px solid var(--av-gold, #D4AF37);
      border-radius: 16px;
      padding: 24px 20px;
      text-align: center;
      margin: 20px 0;
      box-shadow: 0 8px 24px rgba(24, 33, 58, 0.15);
      color: #FFFFFF;
    }
    .guidance-premium-cta-box h4 {
      color: #FFFFFF !important;
      font-family: var(--av-font-display, "Cinzel", serif);
    }
    .guidance-premium-cta-box p {
      color: #E2E8F0 !important;
    }`;

if (html.includes(oldGuidancePremiumCtaBox)) {
  html = html.replace(oldGuidancePremiumCtaBox, newGuidancePremiumCtaBox);
  console.log('  Replaced .guidance-premium-cta-box');
}

// Update Footer CSS to brand dark indigo
const oldFooterBg = `.astro-main-footer {
      background: linear-gradient(180deg, #1C0B12 0%, #10050A 100%);
      color: #E2D7CF;
      border-top: 1px solid rgba(198, 161, 91, 0.35);`;

const newFooterBg = `.astro-main-footer {
      background: linear-gradient(180deg, var(--av-brand, #18213A) 0%, #0D1322 100%);
      color: #E2E8F0;
      border-top: 1px solid rgba(212, 175, 55, 0.35);`;

if (html.includes(oldFooterBg)) {
  html = html.replace(oldFooterBg, newFooterBg);
  console.log('  Replaced .astro-main-footer');
}

// Update active chart badges in updateOverviewActiveChartBanner
console.log('6. Updating active natal chart summary badges...');
const oldChartBadges = `<span style="font-size: 12px; background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.3); color: #F5C45E; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Lagna: \${lagna} (H1)
                </span>
                <span style="font-size: 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #93C5FD; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Moon Sign: \${moon}
                </span>
                <span style="font-size: 12px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); color: #D8B4FE; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Nakshatra: \${nak} (Pada \${pada})
                </span>
                <span style="font-size: 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #FCA5A5; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Sun Sign: \${sun}
                </span>
                <span style="font-size: 12px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #FDE68A; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Dasha: \${dashaMaha}-\${dashaAntar}
                </span>`;

const newChartBadges = `<span style="font-size: 12px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); color: #FFFFFF; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Lagna: \${lagna} (H1)
                </span>
                <span style="font-size: 12px; background: rgba(59, 130, 246, 0.25); border: 1px solid rgba(96, 165, 250, 0.5); color: #93C5FD; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Moon Sign: \${moon}
                </span>
                <span style="font-size: 12px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); color: #FFFFFF; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Nakshatra: \${nak} (Pada \${pada})
                </span>
                <span style="font-size: 12px; background: rgba(212, 175, 55, 0.2); border: 1px solid rgba(212, 175, 55, 0.45); color: #F5C45E; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Sun Sign: \${sun}
                </span>
                <span style="font-size: 12px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); color: #FFFFFF; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                  Dasha: \${dashaMaha}-\${dashaAntar}
                </span>`;

if (html.includes(oldChartBadges)) {
  html = html.replace(oldChartBadges, newChartBadges);
  console.log('  Replaced active natal chart badges');
}

// Update remedies and precautions initial HTML containers
console.log('7. Updating remedies and precautions initial HTML containers...');
const oldRemCardHtml = `id="guidance-remedies-card" class="guidance-section-box remedies-card" style="margin-top: 16px; background: linear-gradient(135deg, #FFFDF5 0%, #FEF9E7 100%); border: 1.5px solid #FCD34D; border-radius: 14px; padding: 18px 20px;"`;
const newRemCardHtml = `id="guidance-remedies-card" class="guidance-section-box remedies-card" style="margin-top: 16px; background: #FFFFFF; border: 1px solid rgba(212, 175, 55, 0.35); border-left: 4px solid var(--av-gold, #D4AF37); border-radius: 14px; padding: 18px 20px; box-shadow: var(--av-shadow-card);"`;

if (html.includes(oldRemCardHtml)) {
  html = html.replace(oldRemCardHtml, newRemCardHtml);
  console.log('  Replaced guidance-remedies-card container style');
}

const oldPrecCardHtml = `id="guidance-precautions-card" class="guidance-section-box precautions-card" style="margin-top: 14px; background: linear-gradient(135deg, #FFFBFB 0%, #FEF2F2 100%); border: 1.5px solid #FCA5A5; border-radius: 14px; padding: 18px 20px;"`;
const newPrecCardHtml = `id="guidance-precautions-card" class="guidance-section-box precautions-card" style="margin-top: 14px; background: #FFFFFF; border: 1px solid rgba(239, 68, 68, 0.35); border-left: 4px solid var(--av-error-text, #991B1B); border-radius: 14px; padding: 18px 20px; box-shadow: var(--av-shadow-card);"`;

if (html.includes(oldPrecCardHtml)) {
  html = html.replace(oldPrecCardHtml, newPrecCardHtml);
  console.log('  Replaced guidance-precautions-card container style');
}

// De-clutter locked weekly cards: replace repeating purchase button with concise preview lock tag
console.log('8. De-cluttering locked weekly forecast cards...');
const oldLockedCardButton = `<button type="button" class="btn-unlock-inline" onclick="openPremiumPaywallModal()" style="width: 100%; background: linear-gradient(135deg, #F59E0B, #D97706); color: #FFFFFF; border: none; padding: 8px 12px; font-size: 12px; font-weight: 800; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 4px rgba(217,119,6,0.25);">
                <i class="fa-solid fa-crown"></i> \${isHi ? '₹49 में संपूर्ण पास अनलॉक करें' : 'Unlock With ₹49 All-Horizons Pass'}
              </button>`;

const newLockedCardButton = `<div class="guidance-period-lock-preview" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 700; color: #475569;">
                <i class="fa-solid fa-lock" style="color: #D97706;"></i> \${isHi ? 'ऑल-हॉराइजन्स पास में उपलब्ध' : 'Available in ₹49 All-Horizons Pass'}
              </div>`;

if (html.includes(oldLockedCardButton)) {
  html = html.replace(oldLockedCardButton, newLockedCardButton);
  console.log('  Replaced repeating locked card button with concise lock tag');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Finished updating index.html successfully!');
