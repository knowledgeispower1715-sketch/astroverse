import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html');

let content = fs.readFileSync(indexPath, 'utf8');

console.log('Original content length:', content.length);

// 1. Central CSS Custom Properties in :root
const newRootBlock = `    :root {
      color-scheme: light;

      --av-brand: #151A32;
      --av-brand-raised: #242B49;
      --av-brand-border: #414967;

      --av-canvas: #FAF7F0;
      --av-surface: #FFFFFF;
      --av-surface-subtle: #F1EDE4;
      --av-border: #DDD6C9;

      --av-gold: #C49A42;
      --av-gold-soft: #E8CB82;
      --av-gold-deep: #76520D;

      --av-text: #20243A;
      --av-text-secondary: #51576A;
      --av-text-inverse: #FFFFFF;
      --av-text-on-gold: #242013;

      --av-success: #176B55;
      --av-warning: #85520B;
      --av-danger: #A12632;
      --av-spiritual-accent: #67458A;

      --av-radius-sm: 8px;
      --av-radius-md: 14px;
      --av-radius-lg: 20px;
      --av-radius-xl: 26px;

      --av-shadow-card:
        0 8px 24px rgba(21, 26, 50, 0.07);

      --av-shadow-elevated:
        0 18px 48px rgba(21, 26, 50, 0.13);

      --av-content-max: 1240px;
      --av-page-gutter: clamp(16px, 3vw, 32px);

      --av-control-height: 48px;
      --av-focus-ring: 0 0 0 3px rgba(36, 76, 151, 0.24);

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

      /* Backward compatibility aliases */
      --av-border-top-blue: var(--av-brand);
      --av-blue-glow: 0 2px 16px rgba(21, 26, 50, 0.2);
      --av-celestial-blue-gradient: linear-gradient(135deg, #151A32 0%, #242B49 100%);
      --av-blue-pill-bg: rgba(36, 76, 151, 0.12);
      --av-blue-pill-border: var(--av-brand-border);

      --av-maroon-darkest: var(--av-brand);
      --av-maroon-primary: var(--av-brand);
      --av-maroon-surface: var(--av-brand-raised);
      --av-maroon-card: var(--av-surface);
      --av-maroon-light: var(--av-brand-raised);
      --av-maroon-glass: rgba(21, 26, 50, 0.94);
      --av-maroon-gradient: linear-gradient(135deg, #151A32 0%, #242B49 100%);

      --av-gold-primary: var(--av-gold);
      --av-gold-bright: var(--av-gold-soft);
      --av-gold-glow: 0 0 16px rgba(196, 154, 66, 0.35);
      --av-gold-gradient: linear-gradient(135deg, var(--av-gold-soft) 0%, var(--av-gold) 100%);

      --av-canvas-deep: var(--av-canvas);
      --av-text-light: var(--av-text-inverse);
      --av-text-warm: var(--av-canvas);
      --av-text-subtle: var(--av-text-secondary);
      --av-text-muted: var(--av-text-secondary);

      --av-content-wide: 1240px;
      --av-content-reading: 1080px;
      --av-radius-card: var(--av-radius-lg);
      --av-radius-control: var(--av-radius-sm);
      --av-border-subtle: var(--av-border);

      --av-color-maroon-950: var(--av-brand);
      --av-color-maroon-800: var(--av-brand-raised);
      --av-color-saffron: var(--av-gold);
      --av-color-gold: var(--av-gold);

      --av-color-parchment: var(--av-canvas);
      --av-color-surface: var(--av-surface);
      --av-color-surface-warm: var(--av-surface-subtle);
      --av-color-surface-soft: var(--av-surface-subtle);

      --av-color-ink: var(--av-text);
      --av-color-text-secondary: var(--av-text-secondary);
      --av-color-text-muted: var(--av-text-secondary);

      --av-color-border: var(--av-border);
      --av-color-border-strong: var(--av-border);

      --av-color-success: var(--av-success);
      --av-color-success-bg: rgba(23, 107, 85, 0.12);

      --av-color-warning: var(--av-warning);
      --av-color-warning-bg: rgba(133, 82, 11, 0.12);

      --av-color-danger: var(--av-danger);
      --av-color-danger-bg: rgba(161, 38, 50, 0.12);

      --av-color-info: #244C97;
      --av-color-info-bg: rgba(36, 76, 151, 0.12);

      --av-color-focus: var(--av-gold);

      --av-shadow-xs: 0 1px 2px rgba(21, 26, 50, 0.05);
      --av-shadow-sm: 0 2px 8px rgba(21, 26, 50, 0.06);
      --av-shadow-drawer: -16px 0 52px rgba(21, 26, 50, 0.25);

      --av-radius-full: 9999px;

      --av-space-1: 4px;
      --av-space-2: 8px;
      --av-space-3: 12px;
      --av-space-4: 16px;
      --av-space-5: 20px;
      --av-space-6: 24px;
      --av-space-8: 32px;
      --av-space-10: 40px;
      --av-space-12: 48px;
      --av-space-16: 64px;

      --av-sidebar-width: 248px;
      --av-header-height: 72px;

      --av-duration-fast: 140ms;
      --av-duration-normal: 220ms;
      --av-duration-slow: 320ms;

      --av-easing-standard: cubic-bezier(0.2, 0, 0, 1);

      --saffron-gold: var(--av-gold-soft);
      --saffron-orange: var(--av-gold);
      --vedic-maroon: var(--av-brand);
      --deep-maroon: var(--av-brand);
      --canvas-bg: var(--av-canvas);
      --card-bg: var(--av-surface);
      --border-color: var(--av-border);
      --text-main: var(--av-text);
      --text-muted: var(--av-text-secondary);
      --shadow-sm: var(--av-shadow-xs);
      --shadow-md: var(--av-shadow-sm);
      --shadow-lg: var(--av-shadow-card);
      --radius-sm: var(--av-radius-sm);
      --radius-md: var(--av-radius-md);
      --radius-lg: var(--av-radius-lg);
      --radius-full: var(--av-radius-full);

      --astro-bg: var(--av-canvas);
      --astro-surface: var(--av-surface);
      --astro-surface-raised: var(--av-surface-subtle);
      --astro-surface-glass: rgba(255, 255, 255, 0.94);
      --astro-gold: var(--av-gold);
      --astro-gold-bright: var(--av-gold-soft);
      --astro-gold-glow: var(--av-gold-glow);
      --astro-burgundy: var(--av-brand-raised);
      --astro-crimson: var(--av-danger);
      --astro-text: var(--av-text);
      --astro-text-muted: var(--av-text-secondary);
      --astro-border: var(--av-border);
      --astro-border-subtle: var(--av-border);
      --astro-radius-card: var(--av-radius-lg);
      --astro-radius-control: var(--av-radius-sm);
      --astro-shadow-card: var(--av-shadow-card);
    }`;

// Replace :root block
const rootRegex = /:root\s*\{[\s\S]*?--astro-shadow-card:\s*var\(--av-shadow-card\);\s*\}/;
if (rootRegex.test(content)) {
  content = content.replace(rootRegex, newRootBlock.trim());
  console.log('Successfully replaced :root design tokens!');
} else {
  console.warn('Could not find exact :root regex match, checking alternative');
}

// 2. Body background and text color
content = content.replace(
  /background-color:\s*var\(--av-canvas-deep,\s*#2A080E\);\s*color:\s*var\(--av-text-light,\s*#FFFFFF\);/g,
  'background-color: var(--av-canvas); color: var(--av-text);'
);

// 3. Celestial top border & Navbar
content = content.replace(
  /\.celestial-top-border\s*\{[\s\S]*?height:\s*3\.5px;[\s\S]*?box-shadow:\s*var\(--av-blue-glow\);[\s\S]*?\}/,
  `.celestial-top-border {
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
    }`
);

content = content.replace(
  /\.main-navbar\s*\{[\s\S]*?top:\s*3\.5px;/,
  `.main-navbar {
      background: var(--av-brand);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--av-brand-border);
      box-shadow: 0 4px 20px rgba(21, 26, 50, 0.15);
      position: sticky;
      top: 0;`
);

// 4. Cosmic hero wrapper
content = content.replace(
  /\.cosmic-hero-wrapper\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#380710\s*0%,\s*#4A0E17\s*55%,\s*#2A080E\s*100%\);[\s\S]*?border:\s*1px solid rgba\(212,\s*175,\s*55,\s*0\.28\);/,
  `.cosmic-hero-wrapper {
      background: linear-gradient(135deg, var(--av-brand) 0%, var(--av-brand-raised) 100%);
      border: 1px solid var(--av-brand-border);`
);

// 5. Overview active chart card & daily guidance card
content = content.replace(
  /\.overview-active-chart-card\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#380710\s*0%,\s*#4A0E17\s*55%,\s*#2A080E\s*100%\);[\s\S]*?border:\s*1px solid rgba\(212,\s*175,\s*55,\s*0\.32\);[\s\S]*?color:\s*var\(--av-text-light,\s*#FFFFFF\);/,
  `.overview-active-chart-card {
      background: var(--av-surface);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg);
      padding: 22px 26px;
      margin-bottom: 24px;
      color: var(--av-text);
      box-shadow: var(--av-shadow-card);`
);

content = content.replace(
  /\.overview-daily-guidance-card\s*\{[\s\S]*?background:\s*var\(--av-maroon-gradient[^\}]*?\}/,
  `.overview-daily-guidance-card {
      background: var(--av-surface);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg);
      padding: 24px;
      margin-bottom: 26px;
      box-shadow: var(--av-shadow-card);
      color: var(--av-text);
      position: relative;
    }`
);

// 6. Rashi pills in daily guidance
content = content.replace(
  /\.rashi-quick-pill\s*\{[\s\S]*?background:\s*rgba\(56,\s*7,\s*16,\s*0\.85\);[\s\S]*?color:\s*#FFFBEB;[\s\S]*?\}/,
  `.rashi-quick-pill {
      background: var(--av-surface-subtle);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-full);
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      color: var(--av-text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      box-shadow: 0 1px 3px rgba(21, 26, 50, 0.05);
    }`
);

content = content.replace(
  /\.rashi-quick-pill\.active\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#D4AF37\s*0%,\s*#B38F24\s*100%\);[\s\S]*?color:\s*#1E0407;[\s\S]*?\}/,
  `.rashi-quick-pill.active {
      background: var(--av-gold);
      border-color: var(--av-gold-deep);
      color: var(--av-text-on-gold);
      font-weight: 700;
      box-shadow: 0 3px 10px rgba(196, 154, 66, 0.35);
    }`
);

// 7. Buttons: .btn-gold-primary & .btn-outline-secondary
content = content.replace(
  /\.btn-gold-primary\s*\{[\s\S]*?color:\s*#FFFFFF;[\s\S]*?background:\s*linear-gradient\(135deg,\s*var\(--saffron-gold\)\s*0%,\s*var\(--saffron-orange\)\s*100%\);/,
  `.btn-gold-primary {
      background: var(--av-gold);
      color: var(--av-text-on-gold);
      border: 1px solid var(--av-gold-deep);`
);

// 8. Six-Horizon guidance discovery cards
content = content.replace(
  /\.guidance-discovery-card\s*\{[\s\S]*?background:\s*var\(--av-maroon-gradient[^\}]*?\}/,
  `.guidance-discovery-card {
      background: var(--av-surface);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg);
      padding: 18px;
      box-shadow: var(--av-shadow-card);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.25s ease, border-color 0.25s ease;
      color: var(--av-text);
      position: relative;
    }`
);

// 9. Compliance footer
content = content.replace(
  /\.compliance-footer-wrap\s*\{[\s\S]*?background:\s*linear-gradient\(90deg,\s*var\(--av-maroon-darkest[^\}]*?\}/,
  `.compliance-footer-wrap {
      background: var(--av-brand);
      border-top: 1px solid var(--av-brand-border);
      color: var(--av-text-inverse);
      padding: 44px 20px 24px;
      margin-top: 60px;
    }`
);

// 10. Mobile bottom dock
content = content.replace(
  /\.mobile-bottom-dock\s*\{[\s\S]*?background:\s*rgba\(11,\s*16,\s*32,\s*0\.96\);[\s\S]*?border-top:\s*1px solid rgba\(212,\s*175,\s*55,\s*0\.22\);/,
  `.mobile-bottom-dock {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      min-height: 58px;
      padding-top: 6px;
      padding-bottom: max(6px, env(safe-area-inset-bottom, 6px));
      background: var(--av-brand);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid var(--av-brand-border);`
);

// 11. Modal dialog card
content = content.replace(
  /\.modal-dialog-card\s*\{[\s\S]*?background:\s*#FFFFFF;[\s\S]*?border-radius:\s*var\(--radius-md\);[\s\S]*?padding:\s*24px;[\s\S]*?box-shadow:\s*var\(--shadow-lg\);/,
  `.modal-dialog-card {
      width: 100%;
      max-width: 480px;
      background: var(--av-surface);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg);
      padding: 24px;
      box-shadow: var(--av-shadow-elevated);
      color: var(--av-text);`
);

// 12. Hero CTA buttons text: "Calculate My Kundli" and "Explore a Sample Chart"
content = content.replace(
  /<button class="btn-gold-primary"[^>]*onclick="switchNavSection\('kundli'\); document\.getElementById\('input-k-name'\)\?\.focus\(\);"[^>]*>[\s\S]*?Calculate Free Kundli[\s\S]*?<\/button>/,
  `<button class="btn-gold-primary" id="btn-hero-calc-kundli" style="padding: 12px 24px; font-size: 14px; min-height: 48px;" onclick="switchNavSection('kundli'); document.getElementById('input-k-name')?.focus();">
            <i class="fa-solid fa-sparkles"></i> Calculate My Kundli
          </button>`
);

content = content.replace(
  /<button class="btn-outline-secondary"[^>]*onclick="loadSampleBirthChart\(\); switchNavSection\('kundli'\);"[^>]*>[\s\S]*?Try Sample Chart[\s\S]*?<\/button>/,
  `<button class="btn-outline-secondary" id="btn-hero-sample-chart" style="padding: 12px 20px; font-size: 13px; color: var(--av-text-inverse); border-color: var(--av-brand-border); min-height: 48px;" onclick="loadSampleBirthChart(); switchNavSection('kundli');">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Explore a Sample Chart
          </button>`
);

// 13. Numerology Studio modal header & styling cleanup
content = content.replace(
  /<div id="modal-numerology-studio" class="modal-backdrop-wrap" style="display: none; align-items: center; justify-content: center; z-index: 10630;">\s*<div class="modal-dialog-card" style="max-width: 960px; width: 94%; max-height: 90vh; overflow-y: auto; padding: 24px;">/,
  `<div id="modal-numerology-studio" class="modal-backdrop-wrap" style="display: none; align-items: center; justify-content: center; z-index: 10630;">
    <div class="modal-dialog-card numerology-dialog-card" style="max-width: 880px; width: 94%; max-height: 88vh; overflow-y: auto; padding: 24px; background: var(--av-surface); border: 1px solid var(--av-border); border-radius: var(--av-radius-lg); box-shadow: var(--av-shadow-elevated);">`
);

content = content.replace(
  /<h2 style="font-size: 22px; font-weight: 800; color: #1E1B4B; margin: 6px 0 2px; display: flex; align-items: center; gap: 8px;">\s*<i class="fa-solid fa-signature" style="color: #D97706;"><\/i>\s*<span id="num-studio-title">Vedic Name Correction &amp; Numerology Studio<\/span>\s*<\/h2>/,
  `<h2 style="font-family: var(--av-font-display, 'Cinzel', serif); font-size: clamp(1.2rem, 3vw, 1.5rem); font-weight: 800; color: var(--av-text); margin: 6px 0 2px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-signature" style="color: var(--av-gold);"></i>
            <span id="num-studio-title">Vedic Name Correction &amp; Numerology Studio</span>
          </h2>`
);

content = content.replace(
  /<p style="font-size: 13px; color: #64748B; margin: 0;" id="num-studio-tagline">/,
  `<p style="font-size: 13px; color: var(--av-text-secondary); margin: 0;" id="num-studio-tagline">`
);

content = content.replace(
  /<span style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #D97706; background: #FEF3C7; padding: 2px 8px; border-radius: 6px;">VEDIC &amp; CHALDEAN HARMONICS<\/span>/,
  `<span style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: var(--av-spiritual-accent); background: var(--av-surface-subtle); border: 1px solid var(--av-border); padding: 2px 8px; border-radius: 6px;">VEDIC &amp; CHALDEAN HARMONICS</span>`
);

// Write back updated content
fs.writeFileSync(indexPath, content, 'utf8');
console.log('Successfully updated index.html with luxury design system! New length:', content.length);
