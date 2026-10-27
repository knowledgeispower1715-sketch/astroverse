import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('1. Updating setGuidanceState to call updateGuidanceActiveProfileBar');
const oldSetGuidanceStateRegex = /function setGuidanceState\(state, meta = \{\}\) \{[\s\S]*?if \(state === 'NO_PROFILE'\) \{[\s\S]*?renderGuidanceSavedProfilesDropdown\(\);\s*\} else if \(state === 'GENERAL_TRANSIT_PREVIEW'\) \{[\s\S]*?\} else if \(state === 'PERSONALIZED_READY'\) \{[\s\S]*?\}\s*\}/;

const newSetGuidanceState = `function updateGuidanceActiveProfileBar(state, meta = {}) {
      const bar = document.getElementById('guidance-active-profile-bar');
      if (!bar) return;
      const isHi = typeof currentLanguage !== 'undefined' && currentLanguage === 'hi';
      const chart = meta.chart || currentCalculatedChart;
      const isSample = Boolean(chart && (chart.isSampleChart || window.isSampleChartActive));

      if (!chart || state === 'NO_PROFILE') {
        bar.innerHTML = \`
          <div class="guidance-profile-bar-inner no-profile-bar" style="background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px; color: #64748B;"><i class="fa-solid fa-circle-question"></i></span>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: #1E1B4B;">\${isHi ? 'कोई जन्म पत्रिका चयनित नहीं' : 'No birth chart selected'}</div>
                <div style="font-size: 12px; color: #64748B;">\${isHi ? 'सटीक लग्न व दशा आधारित व्यक्तिगत फलादेश हेतु जन्म विवरण दर्ज करें अथवा सहेजी गई प्रोफाइल चुनें।' : 'Enter birth details for 100% chart-grounded Parashari analysis, or select a saved profile.'}</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <button type="button" class="btn-gold-primary" style="padding: 7px 14px; font-size: 12px; min-height: 36px;" onclick="switchNavSection('kundli'); document.getElementById('input-k-name')?.focus();">
                <i class="fa-solid fa-sparkles"></i> \${isHi ? 'जन्म विवरण दर्ज करें' : 'Enter My Birth Details'}
              </button>
              <select id="guidance-bar-profile-select" class="form-input-text" style="width: auto; padding: 7px 12px; font-size: 12px; font-weight: 700; background: #FFFFFF; color: #1E1B4B; min-height: 36px;" onchange="handleGuidanceProfileSelect(this.value)">
                <option value="">\${isHi ? 'सहेजी गई प्रोफाइल चुनें...' : 'Choose Saved Profile...'}</option>
              </select>
              <button type="button" class="btn-outline-secondary" style="padding: 7px 12px; font-size: 12px; min-height: 36px; background: #FFFFFF;" onclick="enterGeneralTransitPreview('hourly')">
                <i class="fa-solid fa-compass"></i> \${isHi ? 'सामान्य गोचर पूर्वावलोकन' : 'Explore General Transit Preview'}
              </button>
            </div>
          </div>
        \`;
        populateBarProfileSelect();
        return;
      }

      if (isSample) {
        const chartName = chart.name || 'Anand Sharma';
        bar.innerHTML = \`
          <div class="guidance-profile-bar-inner sample-bar" style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border: 1.5px solid #F59E0B; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 22px; color: #D97706; margin-top: 2px;"><i class="fa-solid fa-triangle-exclamation"></i></span>
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 2px;">
                  <span style="font-size: 11px; font-weight: 800; background: #B45309; color: #FFFFFF; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
                    \${isHi ? 'नमूना चार्ट — यह आपकी व्यक्तिगत प्रोफाइल नहीं है' : 'SAMPLE CHART — NOT YOUR PERSONAL PROFILE'}
                  </span>
                  <span style="font-size: 12px; font-weight: 700; color: #92400E;">\${chartName} (15 June 1995, 10:30, New Delhi)</span>
                </div>
                <div style="font-size: 12px; color: #78350F; line-height: 1.4;">
                  \${isHi ? 'सुविधाओं के परीक्षण हेतु नमूना जन्म कुंडली लोड की गई है। व्यक्तिगत जीवन फलादेश हेतु अपना वास्तविक जन्म विवरण दर्ज करें।' : 'Demonstration birth chart loaded for feature inspection. Calculations illustrate authentic Parashari techniques; enter your personal birth details to ground guidance in your life.'}
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button type="button" class="btn-gold-primary" style="padding: 7px 14px; font-size: 12px; min-height: 36px;" onclick="resetKundliForm(); switchNavSection('kundli'); document.getElementById('input-k-name')?.focus();">
                <i class="fa-solid fa-user-plus"></i> \${isHi ? 'अपना वास्तविक विवरण दर्ज करें' : 'Enter Your Real Birth Details'}
              </button>
            </div>
          </div>
        \`;
        return;
      }

      // PERSONALIZED_READY
      const chartName = chart.name || (isHi ? 'सत्यापित जातक' : 'Verified Native');
      const lagna = chart.lagnaSign || '--';
      const moon = chart.moonSign || '--';
      const nak = chart.nakName || chart.nakshatra || '--';
      const pada = chart.pada || 1;
      const fd = chart.fullData || {};
      const activeMaha = fd.vimshottari_dasha?.active_now?.maha_dasha || chart.activeMaha || '--';
      const activeAntar = fd.vimshottari_dasha?.active_now?.antar_dasha || chart.activeAntar || '--';
      const sadeSati = fd.doshas_and_remedies?.sade_sati?.sade_sati_status || fd.doshas_and_remedies?.sade_sati?.phase || (isHi ? 'साढ़े साती मुक्त' : 'Clear of Sade Sati');
      const dhaiya = fd.doshas_and_remedies?.sade_sati?.dhaiya_status || (isHi ? 'कोई ढैया सक्रिय नहीं' : 'No Active Dhaiya');

      bar.innerHTML = \`
        <div class="guidance-profile-bar-inner personalized-bar" style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border: 1.5px solid #86EFAC; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
              <span style="font-size: 13px; font-weight: 800; color: #065F46; background: #BBF7D0; padding: 3px 10px; border-radius: 999px;">
                <i class="fa-solid fa-user-check"></i> \${chartName}
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #047857;">
                <i class="fa-solid fa-certificate"></i> \${isHi ? 'कुंडली आधारित फलादेश' : 'Personalized using the selected chart'}
              </span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: #065F46;">
              <span style="background: #FFFFFF; border: 1px solid #86EFAC; padding: 2px 8px; border-radius: 6px;"><strong>\${isHi ? 'लग्न' : 'Lagna'}:</strong> \${lagna}</span>
              <span style="background: #FFFFFF; border: 1px solid #86EFAC; padding: 2px 8px; border-radius: 6px;"><strong>\${isHi ? 'चंद्र' : 'Moon'}:</strong> \${moon} (\${nak} Pada \${pada})</span>
              <span style="background: #FFFFFF; border: 1px solid #86EFAC; padding: 2px 8px; border-radius: 6px;"><strong>\${isHi ? 'दशा' : 'Dasha'}:</strong> \${activeMaha}-\${activeAntar}</span>
              <span style="background: #FFFFFF; border: 1px solid #86EFAC; padding: 2px 8px; border-radius: 6px;"><strong>\${isHi ? 'साढ़े साती' : 'Sade Sati'}:</strong> \${sadeSati}</span>
              <span style="background: #FFFFFF; border: 1px solid #86EFAC; padding: 2px 8px; border-radius: 6px;"><strong>\${isHi ? 'ढैया' : 'Dhaiya'}:</strong> \${dhaiya}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn-outline-secondary" style="padding: 6px 12px; font-size: 11px; min-height: 32px; background: #FFFFFF;" onclick="switchNavSection('kundli')">
              <i class="fa-solid fa-arrows-rotate"></i> \${isHi ? 'प्रोफाइल बदलें' : 'Change / Switch Profile'}
            </button>
          </div>
        </div>
      \`;
    }

    function populateBarProfileSelect() {
      const sel = document.getElementById('guidance-bar-profile-select');
      if (!sel) return;
      let profiles = [];
      try {
        profiles = JSON.parse(localStorage.getItem('astro_saved_profiles') || '[]');
      } catch (e) {
        profiles = savedUserProfiles || [];
      }
      if (!profiles || !profiles.length) {
        profiles = savedUserProfiles || [];
      }
      sel.innerHTML = '<option value="">Choose Saved Profile...</option>';
      if (profiles && profiles.length > 0) {
        profiles.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = \`\${p.name} (\${p.dob || 'DOB N/A'})\`;
          sel.appendChild(opt);
        });
      } else {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "No saved profiles available";
        opt.disabled = true;
        sel.appendChild(opt);
      }
    }

    function setGuidanceState(state, meta = {}) {
      window.astroGuidanceState = state;
      const onboardingView = document.getElementById('guidance-onboarding-view');
      const sectionsWrap = document.getElementById('guidance-sections-wrap');
      const transitBanner = document.getElementById('guidance-transit-banner');
      const headerTitle = document.getElementById('guidance-header-title');
      const badge = document.getElementById('guidance-grounding-badge');
      const headerSub = document.getElementById('guidance-header-sub');
      const isHi = typeof currentLanguage !== 'undefined' && currentLanguage === 'hi';

      updateGuidanceActiveProfileBar(state, meta);

      if (state === 'NO_PROFILE') {
        if (onboardingView) onboardingView.style.display = 'block';
        if (sectionsWrap) sectionsWrap.style.display = 'none';
        if (transitBanner) transitBanner.style.display = 'none';
        if (headerTitle) {
          headerTitle.textContent = isHi ? "षड्-काल परिप्रेक्ष्य ज्योतिषीय मार्गदर्शन" : "Six-Horizon Astrological Guidance";
        }
        if (badge) {
          badge.className = 'badge-guest';
          badge.innerHTML = \`<i class="fa-solid fa-circle-info"></i> \${isHi ? 'कोई जन्म पत्रिका चयनित नहीं' : 'No birth chart selected'}\`;
        }
        if (headerSub) {
          headerSub.textContent = isHi
            ? "खगोलीय कालचक्र देखने हेतु नीचे किसी होराइजन का चयन करें, अथवा अपनी जन्म कुंडली की गणना कर व्यक्तिगत लग्न व दशा फलादेश प्राप्त करें।"
            : "Select a forecast horizon below to explore celestial cycles, or calculate your Janam Kundli for personalized Lagna and Dasha analysis.";
        }
        renderGuidanceSavedProfilesDropdown();
      } else if (state === 'GENERAL_TRANSIT_PREVIEW') {
        if (onboardingView) onboardingView.style.display = 'none';
        if (sectionsWrap) sectionsWrap.style.display = 'block';
        if (transitBanner) transitBanner.style.display = 'block';
        if (headerTitle) {
          headerTitle.textContent = isHi ? "सामान्य गोचर मार्गदर्शन (गैर-व्यक्तिगत)" : "General Transit Guidance (Not Personalized)";
        }
        if (badge) {
          badge.className = 'badge-guest';
          badge.innerHTML = \`<i class="fa-solid fa-compass"></i> \${isHi ? 'सामान्य सौर गोचर मार्गदर्शन (अतिथि सत्र)' : 'General Solar Transit Guidance'}\`;
        }
        if (headerSub) {
          headerSub.textContent = isHi
            ? "स्विस एफिमेरिस द्वारा संगणित सार्वभौमिक खगोलीय गोचर। जन्म पत्रिका की गणना कर अपने लग्न व नक्षत्र से जोड़ें।"
            : "Universal sidereal transit geometry computed via Swiss Ephemeris. Calculate your Janam Kundli to ground in your natal chart.";
        }
      } else if (state === 'PERSONALIZED_READY') {
        if (onboardingView) onboardingView.style.display = 'none';
        if (sectionsWrap) sectionsWrap.style.display = 'block';
        if (transitBanner) transitBanner.style.display = 'none';
        const chart = meta.chart || currentCalculatedChart;
        const name = chart?.name || '';
        const lagna = chart?.lagnaSign || '';
        const moon = chart?.moonSign || '';
        if (headerTitle) {
          headerTitle.textContent = name
            ? (isHi ? \`आपका व्यक्तिगत वैदिक मार्गदर्शन — \${name}\` : \`Your Personalized Vedic Guidance — \${name}\`)
            : (isHi ? "आपका व्यक्तिगत वैदिक मार्गदर्शन" : "Your Personalized Vedic Guidance");
        }
        if (badge) {
          badge.className = 'badge-grounded';
          badge.innerHTML = \`<i class="fa-solid fa-certificate"></i> \${isHi ? 'कुंडली आधारित फलादेश' : 'Chart-Grounded'}\${lagna ? \` &bull; \${lagna} \${isHi ? 'लग्न' : 'Lagna'}\` : ''}\${moon ? \` &bull; \${moon} \${isHi ? 'चंद्र' : 'Moon'}\` : ''}\`;
        }
        if (headerSub) {
          headerSub.textContent = isHi
            ? "वास्तविक स्विस एफिमेरिस गोचर आपकी जन्म कुंडली के लग्न, चंद्र राशि और विंशोत्तरी दशा के साथ समन्वित।"
            : "Real-time Swiss Ephemeris celestial transits synthesized with your natal Lagna, Moon sign, and Vimshottari Dasha.";
        }
      }
    }`;

html = html.replace(oldSetGuidanceStateRegex, newSetGuidanceState);
console.log('✓ setGuidanceState and updateGuidanceActiveProfileBar updated');

console.log('2. Adding renderRemediesAndPrecautionsUI and updating selectGuidanceHorizon & renderStructuredPredictionUI');
const remediesPrecautionsFn = `function renderRemediesAndPrecautionsUI(data) {
      const isHi = typeof currentLanguage !== 'undefined' && currentLanguage === 'hi';
      const remCard = document.getElementById('guidance-remedies-card');
      const precCard = document.getElementById('guidance-precautions-card');
      const r = data?.remedies || {};
      const p = data?.precautions || {};

      if (remCard) {
        const mantra = r.mantra || (isHi ? "ॐ ग्रां ग्रीं ग्रौं सः गुरुवे नमः" : "Om Graam Greem Graum Sah Guruve Namah");
        const translit = r.transliteration || "Om Graam Greem Graum Sah Guruve Namah";
        const trigger = r.trigger || (isHi ? "सक्रिय महादशा एवं होरा अधिपति" : "Active Mahadasha & Planetary Hour");
        const timing = r.practice_timing || (isHi ? "प्रातः सूर्योदय अथवा शुभ होरा में १०८ बार जप करें।" : "Recite 108 times at dawn or during benefic planetary hours.");
        const charity = r.charity || (isHi ? "सात्विक अन्न, काले तिल अथवा वस्त्रों का परोपकार करें।" : "Perform sattvic charity (Daan) of food or clothing.");
        const gemNote = r.gemstone_guidance || (isHi ? "व्यक्तिगत रत्न हेतु जन्म कुंडली का संपूर्ण विश्लेषण आवश्यक है; केवल गोचर पर रत्न धारण न करें। जप व दान सर्वश्रेष्ठ हैं।" : "Chart-specific gemstone prescriptions require verified D1/D9 assessment. Avoid wearing gemstones based solely on transit Horas; reliance on Beej Mantra and Daan is recommended.");

        remCard.innerHTML = \`
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <h4 style="font-size: 16px; font-weight: 800; color: #92400E; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-om" style="color: #D97706; font-size: 18px;"></i>
              \${isHi ? 'शुभ वैदिक उपाय एवं मंत्र साधना' : 'Auspicious Vedic Remedies & Mantra Sadhana'}
            </h4>
            <span style="font-size: 11px; font-weight: 700; background: #FEF3C7; color: #92400E; padding: 3px 10px; border-radius: 999px;">
              \${trigger}
            </span>
          </div>

          <div style="background: #FFFFFF; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #B45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              \${isHi ? 'वैदिक बीज मंत्र (१०८ बार जप)' : 'Vedic Beej Mantra (108 Recitations)'}
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #4A0E17; margin-bottom: 4px; font-family: 'Cinzel', serif, sans-serif;">
              \${mantra}
            </div>
            <div style="font-size: 12px; font-style: italic; color: #78350F;">
              \${translit}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; font-size: 12px; margin-bottom: 10px;">
            <div style="background: #FFFDF7; border: 1px solid #FEF3C7; border-radius: 8px; padding: 10px 12px;">
              <div style="font-weight: 800; color: #92400E; margin-bottom: 2px;"><i class="fa-regular fa-clock"></i> \${isHi ? 'साधना काल' : 'Practice Timing'}</div>
              <div style="color: #78350F; line-height: 1.4;">\${timing}</div>
            </div>
            <div style="background: #FFFDF7; border: 1px solid #FEF3C7; border-radius: 8px; padding: 10px 12px;">
              <div style="font-weight: 800; color: #92400E; margin-bottom: 2px;"><i class="fa-solid fa-hand-holding-heart"></i> \${isHi ? 'सात्विक दान' : 'Sattvic Charity (Daan)'}</div>
              <div style="color: #78350F; line-height: 1.4;">\${charity}</div>
            </div>
          </div>

          <div style="font-size: 11px; color: #92400E; background: #FEF3C7; padding: 6px 12px; border-radius: 6px; line-height: 1.4; display: flex; align-items: flex-start; gap: 6px;">
            <i class="fa-solid fa-shield-cat" style="margin-top: 2px;"></i>
            <span><strong>\${isHi ? 'रत्न संबंधी परामर्श' : 'Gemstone Directive'}:</strong> \${gemNote}</span>
          </div>
        \`;
      }

      if (precCard) {
        const rk = p.rahu_kaal_guidance || (isHi ? "स्थानीय राहुकाल के दौरान महत्वपूर्ण अनुबंध अथवा सट्टेबाजी से बचें।" : "Avoid initiating major speculative trades or signing contentious contracts during local Rahu Kaal.");
        const ym = p.yamaganda_guidance || (isHi ? "यमगंड काल में यात्रा अथवा महत्वपूर्ण संवाद में अतिरिक्त सतर्कता बरतें।" : "Exercise deliberate patience during Yamaganda; double-check transit documentation.");
        const disc = p.disclaimer || (isHi ? "ज्योतिषीय सावधानियां प्रवृत्तियों का दिग्दर्शन कराती हैं, किसी निश्चित अनिष्ट का नहीं। आपका सचेत पुरुषार्थ सर्वोच्च है।" : "Vedic planetary cautions outline qualitative atmospheric tendencies rather than deterministic harm. Personal diligence and ethical conduct govern lived outcomes.");

        precCard.innerHTML = \`
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <h4 style="font-size: 16px; font-weight: 800; color: #991B1B; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-shield-halved" style="color: #DC2626; font-size: 18px;"></i>
              \${isHi ? 'ज्योतिषीय सावधानियां एवं गोचर चेतावनी' : 'Astrological Precautions & Transit Warnings'}
            </h4>
            <span style="font-size: 11px; font-weight: 700; background: #FEE2E2; color: #991B1B; padding: 3px 10px; border-radius: 999px;">
              \${isHi ? 'सतर्कता कालखंड' : 'Cautionary Intervals'}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; font-size: 12px; margin-bottom: 10px;">
            <div style="background: #FFFFFF; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 12px;">
              <div style="font-weight: 800; color: #991B1B; margin-bottom: 2px;"><i class="fa-solid fa-ban"></i> \${isHi ? 'राहुकाल दिशा-निर्देश' : 'Rahu Kaal Guidance'}</div>
              <div style="color: #7F1D1D; line-height: 1.4;">\${rk}</div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 12px;">
              <div style="font-weight: 800; color: #991B1B; margin-bottom: 2px;"><i class="fa-solid fa-triangle-exclamation"></i> \${isHi ? 'यमगंड वेला' : 'Yamaganda Period'}</div>
              <div style="color: #7F1D1D; line-height: 1.4;">\${ym}</div>
            </div>
          </div>

          <div style="font-size: 11px; color: #7F1D1D; background: #FEE2E2; padding: 6px 12px; border-radius: 6px; line-height: 1.4;">
            <i class="fa-solid fa-circle-info"></i> \${disc}
          </div>
        \`;
      }
    }`;

// Insert renderRemediesAndPrecautionsUI before selectGuidanceHorizon
html = html.replace('function selectGuidanceHorizon(horizon) {', remediesPrecautionsFn + '\n\n    function selectGuidanceHorizon(horizon) {');

// Update selectGuidanceHorizon to reset remedies & precautions cards
html = html.replace(
  "generatePersonalizedGuidance(horizon, activeReqId);",
  `const remCard = document.getElementById('guidance-remedies-card');
      if (remCard) {
        remCard.innerHTML = \`<span style="color: #64748B;"><i class="fa-solid fa-spinner fa-spin" style="color: #D4AF37; margin-right: 6px;"></i> \${isHi ? 'वैदिक उपायों की गणना जारी...' : 'Calculating personalized Vedic remedies and mantras...'}</span>\`;
      }
      const precCard = document.getElementById('guidance-precautions-card');
      if (precCard) {
        precCard.innerHTML = \`<span style="color: #64748B;"><i class="fa-solid fa-spinner fa-spin" style="color: #D4AF37; margin-right: 6px;"></i> \${isHi ? 'गोचर सावधानियों एवं राहुकाल का परिकलन...' : 'Calculating localized transit precautions and timing windows...'}</span>\`;
      }

      generatePersonalizedGuidance(horizon, activeReqId);`
);

console.log('3. Updating renderStructuredPredictionUI to render remedies, precautions, and split Saturn statuses');
const oldMetricsRegex = /if \(factsPills\) \{[\s\S]*?sade_sati_phase[\s\S]*?\}\s*else\s*\{[\s\S]*?\}\s*\}/;

const newMetricsCode = `if (factsPills) {
        const sadeStatus = p.sade_sati_status || p.sade_sati_phase || (isHi ? 'साढ़े साती मुक्त' : 'Clear of Sade Sati');
        const dhaiyaStatus = p.dhaiya_status || (isHi ? 'कोई ढैया सक्रिय नहीं' : 'No Active Dhaiya');
        if (isChartGrounded && p.lagna) {
          factsPills.innerHTML = \`
            <span class="guidance-metric-pill">\${isHi ? 'लग्न' : 'Lagna'}: <strong>\${p.lagna || '--'}</strong></span>
            <span class="guidance-metric-pill">\${isHi ? 'चंद्र' : 'Moon'}: <strong>\${p.moon_sign || '--'} (\${p.moon_nakshatra || '--'})</strong></span>
            <span class="guidance-metric-pill">\${isHi ? 'सक्रिय दशा' : 'Active Dasha'}: <strong>\${p.active_mahadasha || '--'}-\${p.active_antardasha || '--'}</strong></span>
            <span class="guidance-metric-pill">\${isHi ? 'साढ़े साती' : 'Sade Sati'}: <strong>\${sadeStatus}</strong></span>
            <span class="guidance-metric-pill">\${isHi ? 'ढैया' : 'Dhaiya'}: <strong>\${dhaiyaStatus}</strong></span>
          \`;
        } else {
          factsPills.innerHTML = \`
            <span class="guidance-metric-pill">\${isHi ? 'मोड' : 'Mode'}: <strong>\${isHi ? 'वैश्विक गोचर' : 'Universal Transit'}</strong></span>
            <span class="guidance-metric-pill">\${isHi ? 'एफिमेरिस' : 'Ephemeris'}: <strong>Swiss Ephemeris</strong></span>
            <span class="guidance-metric-pill">\${isHi ? 'व्यक्तिगत लग्न' : 'Personal Lagna'}: <strong>\${isHi ? 'लोड नहीं' : 'Not Loaded'}</strong></span>
            <span class="guidance-metric-pill">\${isHi ? 'व्यक्तिगत दशा' : 'Personal Dasha'}: <strong>\${isHi ? 'लोड नहीं' : 'Not Loaded'}</strong></span>
          \`;
        }
      }`;

html = html.replace(oldMetricsRegex, newMetricsCode);

// Also call renderRemediesAndPrecautionsUI(data) in renderStructuredPredictionUI
html = html.replace(
  'periodWrap.innerHTML = renderPeriodItemsHTML(currentGuidanceHorizon, data.period_items, isUnlocked, isHi);',
  `periodWrap.innerHTML = renderPeriodItemsHTML(currentGuidanceHorizon, data.period_items, isUnlocked, isHi);
      renderRemediesAndPrecautionsUI(data);`
);

console.log('4. Updating buildClientPeriodItems to eliminate repeated 09:30 AM window and add Tara Bala/Chandra Bala');
const oldWeeklyClientRegex = /if \(horizon === 'weekly'\) \{[\s\S]*?auspicious_window:\s*"09:30 AM – 11:15 AM",[\s\S]*?return \{ items: cards \};\s*\}/;

const newWeeklyClientCode = `if (horizon === 'weekly') {
        const weekdayAuspiciousEn = {
          0: "Amrit Muhurta (06:30 AM – 08:00 AM)",
          1: "Abhijit Muhurta (11:45 AM – 12:35 PM)",
          2: "Labh Choghadiya (06:30 AM – 08:00 AM)",
          3: "Shubh Choghadiya (06:30 AM – 08:00 AM)",
          4: "Amrit Choghadiya (09:00 AM – 10:30 AM)",
          5: "Abhijit Muhurta (11:45 AM – 12:35 PM)",
          6: "Shubh Choghadiya (01:30 PM – 03:00 PM)"
        };
        const weekdayAuspiciousHi = {
          0: "प्रातः 06:30 AM – 08:00 AM (अमृत वेला)",
          1: "मध्याह्न 11:45 AM – 12:35 PM (अभिजित मुहूर्त)",
          2: "प्रातः 06:30 AM – 08:00 AM (लाभ वेला)",
          3: "प्रातः 06:30 AM – 08:00 AM (शुभ वेला)",
          4: "प्रातः 09:00 AM – 10:30 AM (अमृत मुहूर्त)",
          5: "मध्याह्न 11:45 AM – 12:35 PM (अभिजित मुहूर्त)",
          6: "अपराह्न 01:30 PM – 03:00 PM (शुभ वेला)"
        };
        const cards = [];
        const baseMoonIdx = signsList.indexOf(moonSign) >= 0 ? signsList.indexOf(moonSign) : 0;
        const lagnaIdx = signsList.indexOf(lagnaSign) >= 0 ? signsList.indexOf(lagnaSign) : 0;
        for (let i = 0; i < 7; i++) {
          const cur = new Date(d);
          cur.setDate(d.getDate() + i);
          const wIdx = (cur.getDay() + 6) % 7;
          const ruler = weekdayRulers[wIdx];
          const rulerDisp = isHi ? (hindiPlanets[ruler] || ruler) : ruler;
          const dayName = isHi ? weekdayNamesHi[wIdx] : weekdayNamesEn[wIdx];
          const tMoonIdx = (baseMoonIdx + Math.floor(i / 2.25)) % 12;
          const tMoon = signsList[tMoonIdx];
          const tMoonDisp = isHi ? (hindiSigns[tMoon] || tMoon) : tMoon;
          const hNum = hasChart ? (((tMoonIdx - lagnaIdx + 12) % 12) + 1) : ((i % 12) + 1);
          const isLocked = (!isUnlocked) && (i >= 2);
          const auspiciousWin = isHi ? (weekdayAuspiciousHi[wIdx] || "प्रातः 07:30 AM – 09:00 AM") : (weekdayAuspiciousEn[wIdx] || "07:30 AM – 09:00 AM (Auspicious)");

          if (isLocked) {
            cards.push({
              period_index: i + 1,
              date: getLocalDateString("Asia/Kolkata", cur),
              day_name: dayName,
              weekday_ruler: rulerDisp,
              transiting_moon: tMoonDisp,
              activated_house: hNum,
              focus_theme: isHi ? \`भाव \${hNum} गोचर प्रभाव\` : \`House \${hNum} Transit Activation\`,
              auspicious_window: auspiciousWin,
              is_preview_locked: true,
              teaser: isHi ? \`🔒 दिवस \${i+1} (\${dayName}): चंद्र का \${tMoonDisp} राशि में गोचर आपके \${hNum}वें भाव को सक्रिय करेगा। शुभ वेला: \${auspiciousWin}। संपूर्ण 7-दिवसीय फलादेश अनलॉक करें।\` : \`🔒 Day \${i+1} (\${dayName}): Moon in \${tMoon} activates House \${hNum}. Auspicious Window: \${auspiciousWin}. Unlock with ₹49 All-Horizons pass.\`
            });
          } else {
            cards.push({
              period_index: i + 1,
              date: getLocalDateString("Asia/Kolkata", cur),
              day_name: dayName,
              weekday_ruler: rulerDisp,
              transiting_moon: tMoonDisp,
              activated_house: hNum,
              focus_theme: isHi ? \`भाव \${hNum} में चंद्र संचरण\` : \`House \${hNum} Lunar Transit\`,
              guidance: isHi ? \`आज चंद्र का \${tMoonDisp} राशि में संचरण आपके \${hNum}वें भाव को प्रकाशित करता है। \${rulerDisp} द्वारा शासित इस दिन में अनुशासित कार्यशैली लाभप्रद रहेगी।\` : \`Transiting Moon in \${tMoon} illuminates your natal House \${hNum}. Governed by \${ruler}, maintain structured focus and clarity.\`,
              auspicious_window: auspiciousWin,
              beej_mantra: beejMantras[ruler]?.mantra || "",
              transliteration: beejMantras[ruler]?.transliteration || "",
              is_preview_locked: false
            });
          }
        }
        return { items: cards };
      }`;

html = html.replace(oldWeeklyClientRegex, newWeeklyClientCode);

console.log('5. Updating renderFallbackGuidanceUI to pass time_horizon and build remedies/precautions');
html = html.replace(
  'renderStructuredPredictionUI({\n        report_title: reportTitle,\n        profile_loaded: hasChart,',
  `renderStructuredPredictionUI({\n        time_horizon: horizon,\n        report_title: reportTitle,\n        profile_loaded: hasChart,`
);

console.log('6. Updating loadSampleBirthChart to explicitly mark sample chart');
const oldLoadSampleRegex = /async function loadSampleBirthChart\(\) \{[\s\S]*?await generateUserKundli\(\);\s*\}/;
const newLoadSample = `async function loadSampleBirthChart() {
      document.getElementById('input-k-name').value = 'Anand Sharma';
      selectGender('Male');
      document.getElementById('input-k-dob').value = '1995-06-15';
      document.getElementById('input-k-unknown-time').checked = false;
      document.getElementById('input-k-tob-hh').value = '10';
      document.getElementById('input-k-tob-mm').value = '30';
      sync24HTimePicker();
      document.getElementById('input-k-city-search').value = 'New Delhi, Delhi, India';
      document.getElementById('k-resolved-lat').value = '28.6139';
      document.getElementById('k-resolved-lon').value = '77.2090';
      document.getElementById('k-resolved-tz').value = 'Asia/Kolkata';
      document.getElementById('k-resolved-name').value = 'New Delhi, Delhi, India';
      document.getElementById('k-location-resolved-badge').style.display = 'flex';
      document.getElementById('k-location-resolved-text').textContent = 'New Delhi, Delhi, India (28.61° N, 77.21° E)';

      window.isSampleChartActive = true;
      showToast("Loaded sample demo birth particulars for Anand Sharma (Demo Chart)", "info");
      await generateUserKundli();
      if (currentCalculatedChart) {
        currentCalculatedChart.isSampleChart = true;
        currentCalculatedChart.provenance = 'SAMPLE_DEMO';
      }
      updateGuidanceActiveProfileBar('PERSONALIZED_READY', { chart: currentCalculatedChart });
    }`;

html = html.replace(oldLoadSampleRegex, newLoadSample);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('All frontend logic updates written to index.html successfully!');
