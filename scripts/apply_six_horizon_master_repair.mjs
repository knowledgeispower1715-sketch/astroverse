import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('1. Adding #guidance-active-profile-bar above .horizon-switcher-row');
const switcherTarget = '<div class="horizon-switcher-row">';
const profileBarHtml = `<!-- Grounding Bar: Authoritative Profile Grounding Bar (Phase 1) -->
        <div id="guidance-active-profile-bar" class="guidance-active-profile-bar" style="margin-bottom: 14px;"></div>

        <!-- Horizon Switcher: Hourly | Weekly | Monthly | Yearly -->
        <div class="horizon-switcher-row">`;

if (html.includes(switcherTarget) && !html.includes('id="guidance-active-profile-bar"')) {
  html = html.replace(switcherTarget, profileBarHtml);
  console.log('✓ Added #guidance-active-profile-bar');
} else {
  console.log('ℹ #guidance-active-profile-bar already present or target not matched');
}

console.log('2. Adding #guidance-remedies-card and #guidance-precautions-card in #guidance-sections-wrap');
const periodItemsTarget = '<div id="guidance-period-items-container" class="guidance-period-items-container" style="margin-top: 18px;"></div>';
const remediesAndPrecautionsHtml = `<div id="guidance-period-items-container" class="guidance-period-items-container" style="margin-top: 18px;"></div>

          <!-- Section: Auspicious Vedic Remedies Card (Phase 9) -->
          <div id="guidance-remedies-card" class="guidance-section-box remedies-card" style="margin-top: 16px; background: linear-gradient(135deg, #FFFDF5 0%, #FEF9E7 100%); border: 1.5px solid #FCD34D; border-radius: 14px; padding: 18px 20px;">
            <!-- Dynamically populated by renderRemediesAndPrecautionsUI -->
          </div>

          <!-- Section: Astrological Precautions & Transit Warnings Card (Phase 9) -->
          <div id="guidance-precautions-card" class="guidance-section-box precautions-card" style="margin-top: 14px; background: linear-gradient(135deg, #FFFBFB 0%, #FEF2F2 100%); border: 1.5px solid #FCA5A5; border-radius: 14px; padding: 18px 20px;">
            <!-- Dynamically populated by renderRemediesAndPrecautionsUI -->
          </div>`;

if (html.includes(periodItemsTarget) && !html.includes('id="guidance-remedies-card"')) {
  html = html.replace(periodItemsTarget, remediesAndPrecautionsHtml);
  console.log('✓ Added #guidance-remedies-card and #guidance-precautions-card');
} else {
  console.log('ℹ Remedies and precautions cards already present or target not matched');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('DOM modifications successfully committed to index.html');
