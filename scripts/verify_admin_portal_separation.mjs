import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new globalThis.WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('ASTROVERSE ADMIN PORTAL SEPARATION & AUTHENTICATION AUDIT');
  console.log('======================================================================\n');

  const baseUrl = process.argv[2] ? process.argv[2].replace(/\/$/, '') : `file:///${indexPath}`;
  console.log(`Target Base URL: ${baseUrl}\n`);

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9263',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `${baseUrl}#/admin-login`
  ]);

  let passedAll = true;
  let testCount = 0;
  let passCount = 0;

  function assert(label, condition) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] ${label}`);
    } else {
      passedAll = false;
      console.error(`  [FAIL] ${label}`);
    }
  }

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9263/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9263');

    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');

    await new Promise((r) => setTimeout(r, 3500));

    console.log('--- TEST SUITE 1: Dedicated Administrator Login UI & Zero Google Auth ---');
    const adminLoginVisible = await cdp.eval(`
      (() => {
        const el = document.getElementById('view-admin-login');
        return el && el.classList.contains('active');
      })()
    `);
    assert('#view-admin-login is active on #/admin-login route', adminLoginVisible);

    const adminLoginHtml = await cdp.eval(`document.getElementById('view-admin-login')?.innerHTML || ''`);
    assert('Admin login card contains "AstroVerse Admin Portal"', adminLoginHtml.includes('AstroVerse Admin Portal'));
    assert('Admin login card contains Administrator Email field', await cdp.eval(`Boolean(document.getElementById('admin-login-email'))`));
    assert('Admin login card contains Password field', await cdp.eval(`Boolean(document.getElementById('admin-login-password'))`));
    assert('Admin login card contains Password toggle', await cdp.eval(`Boolean(document.getElementById('admin-pwd-toggle-icon'))`));
    assert('Admin login card contains Sign In button', await cdp.eval(`Boolean(document.getElementById('btn-admin-login-submit'))`));

    const emailPlaceholder = await cdp.eval(`document.getElementById('admin-login-email')?.placeholder || ''`);
    const pwdPlaceholder = await cdp.eval(`document.getElementById('admin-login-password')?.placeholder || ''`);
    assert('Admin email placeholder is clean and descriptive', emailPlaceholder === 'Enter administrator email');
    assert('Admin password placeholder is not bullet dots (eliminates autofill confusion)', pwdPlaceholder === 'Enter administrator password' && !pwdPlaceholder.includes('•'));

    // CRITICAL REQUIREMENT: ZERO GOOGLE AUTH ON ADMIN LOGIN
    const googleButtonExists = await cdp.eval(`
      Boolean(document.querySelector('#view-admin-login button[onclick*="Google"], #view-admin-login .btn-google, #view-admin-login [id*="google"]'))
    `);
    assert('Admin login contains ZERO Google OAuth buttons', !googleButtonExists && !adminLoginHtml.includes('Continue with Google'));

    console.log('\n--- TEST SUITE 2: Customer Navigation & Chrome Hidden on Admin Pages ---');
    const chromeDisplays = await cdp.eval(`
      (() => {
        const navbar = document.querySelector('.main-navbar');
        const promo = document.getElementById('promo-header-strip');
        const footer = document.querySelector('.astro-main-footer');
        const dock = document.querySelector('.mob-bottom-dock');
        return {
          navbarDisplay: navbar ? window.getComputedStyle(navbar).display : 'none',
          promoDisplay: promo ? window.getComputedStyle(promo).display : 'none',
          footerDisplay: footer ? window.getComputedStyle(footer).display : 'none',
          dockDisplay: dock ? window.getComputedStyle(dock).display : 'none'
        };
      })()
    `);
    assert('Customer top navbar is hidden on admin login', chromeDisplays.navbarDisplay === 'none');
    assert('Customer promo announcement strip is hidden on admin login', chromeDisplays.promoDisplay === 'none');
    assert('Customer public footer is hidden on admin login', chromeDisplays.footerDisplay === 'none');
    assert('Customer bottom navigation dock is hidden on admin login', chromeDisplays.dockDisplay === 'none');

    const bodyHasAdminMode = await cdp.eval(`document.body.classList.contains('admin-mode')`);
    assert('document.body has admin-mode class active on admin routes', bodyHasAdminMode);

    console.log('\n--- TEST SUITE 3: Unauthorized Access Guard on /admin ---');
    // Clear any active session and attempt to navigate to #/admin
    await cdp.eval(`
      currentUserSession = null;
      currentSessionToken = null;
      switchNavSection('admin');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const activeAfterAdminAttempt = await cdp.eval(`
      (() => {
        const adminSec = document.getElementById('view-admin');
        const loginSec = document.getElementById('view-admin-login');
        return {
          adminActive: adminSec?.classList.contains('active'),
          loginActive: loginSec?.classList.contains('active'),
          authModalOpen: document.getElementById('modal-auth')?.style.display === 'flex'
        };
      })()
    `);

    assert('Unauthenticated user cannot access #view-admin', !activeAfterAdminAttempt.adminActive);
    assert('Unauthenticated user redirected to #view-admin-login', activeAfterAdminAttempt.loginActive);
    assert('Customer login modal (#modal-auth) is NEVER opened for admin route', !activeAfterAdminAttempt.authModalOpen);

    console.log('\n--- TEST SUITE 4: Role-Based Denial for Ordinary Customer ---');
    await cdp.eval(`
      currentUserSession = {
        id: 'usr_customer_123',
        name: 'Regular Customer',
        role: 'USER',
        status: 'ACTIVE'
      };
      switchNavSection('admin');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const customerAccessResult = await cdp.eval(`
      (() => {
        const adminSec = document.getElementById('view-admin');
        const loginSec = document.getElementById('view-admin-login');
        return {
          adminActive: adminSec?.classList.contains('active'),
          loginActive: loginSec?.classList.contains('active')
        };
      })()
    `);
    assert('Customer (Role.USER) denied access to #view-admin and redirected to admin login', !customerAccessResult.adminActive && customerAccessResult.loginActive);

    console.log('\n--- TEST SUITE 5: Authorized Administrator Portal Experience ---');
    await cdp.eval(`
      currentUserSession = {
        id: 'usr_owner_123',
        name: 'Platform Owner',
        email: 'owner@astroverse.app',
        role: 'OWNER',
        status: 'ACTIVE'
      };
      currentSessionToken = 'admin_session_test_token';
      switchNavSection('admin');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const adminAuthorizedResult = await cdp.eval(`
      (() => {
        const adminSec = document.getElementById('view-admin');
        const roleBadge = document.getElementById('admin-role-badge')?.textContent;
        const emailDisp = document.getElementById('admin-header-email')?.textContent;
        const contentBox = document.getElementById('admin-dashboard-content');
        return {
          adminActive: adminSec?.classList.contains('active'),
          role: roleBadge,
          email: emailDisp,
          contentVisible: contentBox && contentBox.style.display !== 'none'
        };
      })()
    `);

    assert('Authorized OWNER activates #view-admin', adminAuthorizedResult.adminActive);
    assert('Admin dashboard content is visible', adminAuthorizedResult.contentVisible);
    assert('Admin header displays role OWNER', adminAuthorizedResult.role === 'OWNER');
    assert('Admin header displays email owner@astroverse.app', adminAuthorizedResult.email.includes('owner@astroverse.app'));

    console.log('\n--- TEST SUITE 6: Secure Administrator Sign Out ---');
    await cdp.eval(`adminLogout()`);
    await new Promise((r) => setTimeout(r, 200));

    const loggedOutState = await cdp.eval(`
      (() => {
        return {
          currentUserSession,
          currentSessionToken,
          loginActive: document.getElementById('view-admin-login')?.classList.contains('active'),
          adminActive: document.getElementById('view-admin')?.classList.contains('active')
        };
      })()
    `);

    assert('Admin logout clears currentUserSession', loggedOutState.currentUserSession === null);
    assert('Admin logout clears currentSessionToken', loggedOutState.currentSessionToken === null);
    assert('Admin logout transitions to #view-admin-login', loggedOutState.loginActive);
    assert('Admin logout exits #view-admin', !loggedOutState.adminActive);

    console.log('\n--- TEST SUITE 7: Customer App Navigation Integrity ---');
    await cdp.eval(`switchNavSection('overview')`);
    await new Promise((r) => setTimeout(r, 200));

    const overviewState = await cdp.eval(`
      (() => {
        const overview = document.getElementById('view-overview');
        const adminLogin = document.getElementById('view-admin-login');
        const adminDashboard = document.getElementById('view-admin');
        const navbar = document.querySelector('.main-navbar');
        const promo = document.getElementById('promo-header-strip');
        const footer = document.querySelector('.astro-main-footer');
        const dock = document.querySelector('.mob-bottom-dock');
        return {
          overviewActive: overview?.classList.contains('active'),
          bodyHasAdminMode: document.body.classList.contains('admin-mode'),
          adminLoginDisplay: adminLogin ? window.getComputedStyle(adminLogin).display : 'none',
          adminDashboardDisplay: adminDashboard ? window.getComputedStyle(adminDashboard).display : 'none',
          navbarRestored: navbar ? window.getComputedStyle(navbar).display !== 'none' : true,
          promoRestored: promo ? window.getComputedStyle(promo).display !== 'none' : true,
          footerRestored: footer ? window.getComputedStyle(footer).display !== 'none' : true,
          dockRestored: dock ? window.getComputedStyle(dock).display !== 'none' : true
        };
      })()
    `);

    assert('Public customer overview active', overviewState.overviewActive);
    assert('document.body has admin-mode removed on customer pages', !overviewState.bodyHasAdminMode);
    assert('Admin login section is strictly hidden (display: none) on public customer pages', overviewState.adminLoginDisplay === 'none');
    assert('Admin dashboard section is strictly hidden (display: none) on public customer pages', overviewState.adminDashboardDisplay === 'none');
    assert('Customer top navbar restored on customer pages', overviewState.navbarRestored);
    assert('Customer promo announcement strip restored on customer pages', overviewState.promoRestored);
    assert('Customer public footer restored on customer pages', overviewState.footerRestored);
    assert('Customer bottom navigation dock restored on customer pages', overviewState.dockRestored);

    console.log('\n--- TEST SUITE 8: Admin Subroute Resolution (Modules) ---');
    // Re-authenticate as OWNER for subroute tests
    await cdp.eval(`
      currentUserSession = {
        id: 'usr_owner_123',
        name: 'Platform Owner',
        email: 'tiwariji0028@gmail.com',
        role: 'OWNER',
        status: 'ACTIVE'
      };
      currentSessionToken = 'admin_session_test_token';
      window.location.hash = '#/admin/modules/users';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const usersModState = await cdp.eval(`
      (() => {
        return {
          activeMod: currentAdminActiveModule,
          usersDisplay: document.getElementById('admin-module-users')?.style.display,
          adminMode: document.body.classList.contains('admin-mode'),
          adminActive: document.getElementById('view-admin')?.classList.contains('active')
        };
      })()
    `);
    assert('Subroute #/admin/modules/users activates users module', usersModState.activeMod === 'users');
    assert('Module panel admin-module-users is displayed', usersModState.usersDisplay !== 'none');
    assert('document.body has admin-mode active during subroute', usersModState.adminMode);
    assert('#view-admin is active during subroute', usersModState.adminActive);

    // Switch to database module via hash
    await cdp.eval(`
      window.location.hash = '#/admin/modules/database';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const dbModState = await cdp.eval(`
      (() => {
        return {
          activeMod: currentAdminActiveModule,
          dbDisplay: document.getElementById('admin-module-database')?.style.display
        };
      })()
    `);
    assert('Subroute #/admin/modules/database activates database module', dbModState.activeMod === 'database');
    assert('Module panel admin-module-database is displayed', dbModState.dbDisplay !== 'none');

    // Switch to qa module via hash
    await cdp.eval(`
      window.location.hash = '#/admin/modules/qa';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const qaModState = await cdp.eval(`
      (() => {
        return {
          activeMod: currentAdminActiveModule,
          qaDisplay: document.getElementById('admin-module-qa')?.style.display
        };
      })()
    `);
    assert('Subroute #/admin/modules/qa activates QA console module', qaModState.activeMod === 'qa');
    assert('Module panel admin-module-qa is displayed', qaModState.qaDisplay !== 'none');

    console.log('\n--- TEST SUITE 9: In-Admin Feature Test Harnesses ---');
    // Test opening Kundli harness via hash
    await cdp.eval(`
      window.location.hash = '#/admin/tools/kundli';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const kundliToolState = await cdp.eval(`
      (() => {
        const kundliTool = document.getElementById('admin-tool-kundli');
        const toolsContainer = document.getElementById('admin-tools-container');
        const dashContent = document.getElementById('admin-dashboard-content');
        const customerKundli = document.getElementById('view-kundli');
        return {
          activeTool: currentAdminActiveTool,
          toolsContainerDisplay: toolsContainer?.style.display,
          kundliToolDisplay: kundliTool?.style.display,
          dashContentDisplay: dashContent?.style.display,
          customerKundliActive: customerKundli?.classList.contains('active'),
          adminActive: document.getElementById('view-admin')?.classList.contains('active')
        };
      })()
    `);
    assert('Subroute #/admin/tools/kundli sets active tool to kundli', kundliToolState.activeTool === 'kundli');
    assert('Tools container is displayed', kundliToolState.toolsContainerDisplay !== 'none');
    assert('admin-tool-kundli is displayed', kundliToolState.kundliToolDisplay !== 'none');
    assert('admin-dashboard-content is hidden', kundliToolState.dashContentDisplay === 'none');
    assert('Customer view #view-kundli is NOT active', !kundliToolState.customerKundliActive);
    assert('#view-admin remains active', kundliToolState.adminActive);

    // Test tier simulation switcher in Kundli harness
    await cdp.eval(`adminSetPreviewTier('PREMIUM')`);
    const tierSimResult = await cdp.eval(`
      (() => {
        return {
          simTier: adminSimulatedTier,
          previewTier: adminPreviewEntitlements?.tier,
          activeBtnStyle: document.getElementById('tool-btn-tier-premium')?.style.boxShadow
        };
      })()
    `);
    assert('adminSetPreviewTier sets adminSimulatedTier to PREMIUM', tierSimResult.simTier === 'PREMIUM');
    assert('adminPreviewEntitlements.tier is updated to PREMIUM', tierSimResult.previewTier === 'PREMIUM');

    // Test Forecasts harness
    await cdp.eval(`
      window.location.hash = '#/admin/tools/forecasts';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const forecastsToolState = await cdp.eval(`
      (() => {
        return {
          activeTool: currentAdminActiveTool,
          forecastsDisplay: document.getElementById('admin-tool-forecasts')?.style.display,
          customerHorasActive: document.getElementById('view-horas')?.classList.contains('active')
        };
      })()
    `);
    assert('Subroute #/admin/tools/forecasts sets active tool to forecasts', forecastsToolState.activeTool === 'forecasts');
    assert('admin-tool-forecasts is displayed', forecastsToolState.forecastsDisplay !== 'none');
    assert('Customer view #view-horas is NOT active', !forecastsToolState.customerHorasActive);

    // Test AI Astrologer harness
    await cdp.eval(`
      window.location.hash = '#/admin/tools/ai-astrologer';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const aiToolState = await cdp.eval(`
      (() => {
        return {
          activeTool: currentAdminActiveTool,
          aiDisplay: document.getElementById('admin-tool-ai-astrologer')?.style.display,
          customerAstrologersActive: document.getElementById('view-astrologers')?.classList.contains('active')
        };
      })()
    `);
    assert('Subroute #/admin/tools/ai-astrologer sets active tool to ai-astrologer', aiToolState.activeTool === 'ai-astrologer');
    assert('admin-tool-ai-astrologer is displayed', aiToolState.aiDisplay !== 'none');
    assert('Customer view #view-astrologers is NOT active', !aiToolState.customerAstrologersActive);

    // Test Numerology harness
    await cdp.eval(`
      window.location.hash = '#/admin/tools/numerology';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const numToolState = await cdp.eval(`
      (() => {
        return {
          activeTool: currentAdminActiveTool,
          numDisplay: document.getElementById('admin-tool-numerology')?.style.display
        };
      })()
    `);
    assert('Subroute #/admin/tools/numerology sets active tool to numerology', numToolState.activeTool === 'numerology');
    assert('admin-tool-numerology is displayed', numToolState.numDisplay !== 'none');

    // Test Reports catalogue harness
    await cdp.eval(`
      window.location.hash = '#/admin/tools/reports';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const reportsToolState = await cdp.eval(`
      (() => {
        return {
          activeTool: currentAdminActiveTool,
          reportsDisplay: document.getElementById('admin-tool-reports')?.style.display
        };
      })()
    `);
    assert('Subroute #/admin/tools/reports sets active tool to reports', reportsToolState.activeTool === 'reports');
    assert('admin-tool-reports is displayed', reportsToolState.reportsDisplay !== 'none');

    // Test Billing & demo wallet harness
    await cdp.eval(`
      window.location.hash = '#/admin/tools/billing';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const billingToolState = await cdp.eval(`
      (() => {
        return {
          activeTool: currentAdminActiveTool,
          billingDisplay: document.getElementById('admin-tool-billing')?.style.display
        };
      })()
    `);
    assert('Subroute #/admin/tools/billing sets active tool to billing', billingToolState.activeTool === 'billing');
    assert('admin-tool-billing is displayed', billingToolState.billingDisplay !== 'none');

    console.log('\n--- TEST SUITE 10: Module 16 QA Feature Launchers (In-Admin Routing) ---');
    // Navigate back to QA module and launch features from buttons
    await cdp.eval(`
      switchAdminModule('qa');
      qaLaunchKundliTest();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const qaLaunchResult = await cdp.eval(`
      (() => {
        return {
          hash: window.location.hash,
          activeTool: currentAdminActiveTool,
          kundliDisplay: document.getElementById('admin-tool-kundli')?.style.display,
          adminMode: document.body.classList.contains('admin-mode'),
          customerKundliActive: document.getElementById('view-kundli')?.classList.contains('active'),
          navbarHidden: window.getComputedStyle(document.querySelector('.main-navbar')).display === 'none'
        };
      })()
    `);
    assert('qaLaunchKundliTest() routes to #/admin/tools/kundli', qaLaunchResult.hash === '#/admin/tools/kundli');
    assert('qaLaunchKundliTest() sets active tool to kundli', qaLaunchResult.activeTool === 'kundli');
    assert('qaLaunchKundliTest() keeps document.body in admin-mode', qaLaunchResult.adminMode);
    assert('qaLaunchKundliTest() does NOT navigate to customer view-kundli', !qaLaunchResult.customerKundliActive);
    assert('qaLaunchKundliTest() maintains customer top navbar hidden', qaLaunchResult.navbarHidden);

    console.log('\n--- TEST SUITE 11: Return to QA Console Navigation ---');
    await cdp.eval(`returnToAdminQaModule()`);
    await new Promise((r) => setTimeout(r, 200));

    const returnState = await cdp.eval(`
      (() => {
        return {
          hash: window.location.hash,
          activeTool: currentAdminActiveTool,
          activeMod: currentAdminActiveModule,
          toolsContainerDisplay: document.getElementById('admin-tools-container')?.style.display,
          dashContentDisplay: document.getElementById('admin-dashboard-content')?.style.display,
          qaModDisplay: document.getElementById('admin-module-qa')?.style.display
        };
      })()
    `);
    assert('returnToAdminQaModule() resets activeTool to null', returnState.activeTool === null);
    assert('returnToAdminQaModule() sets activeMod to qa', returnState.activeMod === 'qa');
    assert('returnToAdminQaModule() updates hash to #/admin/modules/qa', returnState.hash === '#/admin/modules/qa');
    assert('admin-tools-container is hidden', returnState.toolsContainerDisplay === 'none');
    assert('admin-dashboard-content is restored', returnState.dashContentDisplay !== 'none');
    assert('admin-module-qa is visible', returnState.qaModDisplay !== 'none');

    console.log('\n--- TEST SUITE 12: In-Admin 404 Panel for Invalid Subroutes ---');
    await cdp.eval(`
      window.location.hash = '#/admin/modules/unknown_module_xyz';
      handleHashRoute();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const notFoundState = await cdp.eval(`
      (() => {
        const notFound = document.getElementById('admin-panel-notfound');
        const dashContent = document.getElementById('admin-dashboard-content');
        const toolsContainer = document.getElementById('admin-tools-container');
        const overview = document.getElementById('view-overview');
        return {
          notFoundDisplay: notFound?.style.display,
          dashContentDisplay: dashContent?.style.display,
          toolsContainerDisplay: toolsContainer?.style.display,
          adminMode: document.body.classList.contains('admin-mode'),
          overviewActive: overview?.classList.contains('active'),
          msgText: document.getElementById('admin-notfound-message')?.textContent
        };
      })()
    `);
    assert('Invalid admin subroute displays #admin-panel-notfound', notFoundState.notFoundDisplay !== 'none');
    assert('admin-dashboard-content is hidden on 404', notFoundState.dashContentDisplay === 'none');
    assert('admin-tools-container is hidden on 404', notFoundState.toolsContainerDisplay === 'none');
    assert('document.body retains admin-mode on 404', notFoundState.adminMode);
    assert('Public customer homepage is NOT displayed on admin 404', !notFoundState.overviewActive);
    assert('Not-found message cites the invalid route', notFoundState.msgText.includes('admin/modules/unknown_module_xyz'));

    console.log('\n--- TEST SUITE 13: Data & State Isolation (Zero Customer Contamination) ---');
    await cdp.eval(`
      // 1. Establish existing customer state
      currentCalculatedChart = {
        name: 'Genuine Customer Native',
        dob: '1990-05-15',
        ascendant: 'Taurus',
        moonSign: 'Cancer'
      };
      currentUserEntitlements = {
        tier: 'FREE',
        source: 'subscription',
        validUntil: null
      };

      // 2. Perform admin test harness actions
      loadAdminSyntheticProfileToHarness();
      adminSetPreviewTier('PREMIUM');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const isolationResult = await cdp.eval(`
      (() => {
        return {
          adminPreviewChartName: adminPreviewChart?.name,
          customerChartName: currentCalculatedChart?.name,
          adminSimulatedTier: adminSimulatedTier,
          adminPreviewTier: adminPreviewEntitlements?.tier,
          customerEntitlementTier: currentUserEntitlements?.tier
        };
      })()
    `);
    assert('Admin synthetic profile loaded into adminPreviewChart', isolationResult.adminPreviewChartName === 'Synthetic Vedic Benchmark Native');
    assert('Admin profile load does NOT overwrite customer currentCalculatedChart', isolationResult.customerChartName === 'Genuine Customer Native');
    assert('adminSimulatedTier is set to PREMIUM', isolationResult.adminSimulatedTier === 'PREMIUM');
    assert('adminPreviewEntitlements.tier is set to PREMIUM', isolationResult.adminPreviewTier === 'PREMIUM');
    assert('Customer currentUserEntitlements.tier remains FREE (unpolluted)', isolationResult.customerEntitlementTier === 'FREE');

  } catch (err) {
    console.error('Test execution error:', err);
    passedAll = false;
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch (_) {}
  }

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passCount} / ${testCount} assertions passed.`);
  console.log('======================================================================\n');

  if (!passedAll || passCount !== testCount) {
    process.exit(1);
  }
}

main();
