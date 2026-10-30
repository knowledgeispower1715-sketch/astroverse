import { spawn } from 'child_process';
import http from 'http';
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

async function run() {
  console.log('======================================================================');
  console.log('ASTROVERSE AUTHENTICATION, SIGN-OUT & PORTAL ISOLATION VERIFICATION');
  console.log('======================================================================\n');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9266',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  let testCount = 0;
  let passCount = 0;

  function assert(label, condition) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] ${label}`);
    } else {
      console.error(`  [FAIL] ${label}`);
    }
  }

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9266/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9266');

    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await new Promise((r) => setTimeout(r, 1200));

    // --- TEST SUITE 1: CLEAN PUBLIC GUEST ONBOARDING STATE ---
    console.log('--- TEST SUITE 1: Clean Public Guest Startup State ---');
    const guestState = await cdp.eval(`
      ({
        currentUserSession,
        currentSessionToken,
        authBtnText: document.getElementById('auth-btn-text')?.textContent,
        guestBtnsVisible: document.getElementById('nav-guest-btns')?.style.display !== 'none',
        userDropdownHidden: document.getElementById('nav-user-dropdown-wrap')?.style.display === 'none',
        adminNavBtnHidden: document.getElementById('btn-nav-admin')?.style.display === 'none',
        guestBannerVisible: document.getElementById('overview-guest-banner')?.style.display !== 'none',
        authDashHidden: document.getElementById('overview-authenticated-dashboard')?.style.display === 'none',
        greetingText: document.getElementById('auth-greeting-heading')?.textContent,
        bodyAdminMode: document.body.classList.contains('admin-mode')
      })
    `);

    assert('Public visitor has null currentUserSession', guestState.currentUserSession === null);
    assert('Public visitor has empty currentSessionToken', guestState.currentSessionToken === '');
    assert('Navbar displays Sign In button', guestState.authBtnText === 'Sign In');
    assert('Navbar displays guest auth controls (Sign In & Sign Up)', guestState.guestBtnsVisible);
    assert('User dropdown menu is hidden for guests', guestState.userDropdownHidden);
    assert('Admin Console button is strictly hidden for public visitor', guestState.adminNavBtnHidden);
    assert('Public Guest Welcome Banner is visible on Overview', guestState.guestBannerVisible);
    assert('Authenticated dashboard command center is hidden for guests', guestState.authDashHidden);
    assert('Greeting heading never greets with "Platform Owner" (defaults to Seeker)', !guestState.greetingText.includes('Platform Owner'));
    assert('document.body does not have admin-mode class', !guestState.bodyAdminMode);

    // --- TEST SUITE 2: SERVICE AUTH GATES (PROMPTS GUEST TO SIGN UP / LOGIN) ---
    console.log('\n--- TEST SUITE 2: Service Authentication Gates ---');
    
    // Attempt Kundli Calculation as Guest
    await cdp.eval(`
      closeAuthModal();
      window.pendingActionAfterAuth = null;
      generateUserKundli();
    `);
    await new Promise((r) => setTimeout(r, 200));
    const kundliGateResult = await cdp.eval(`
      ({
        modalOpen: document.getElementById('modal-auth-dialog')?.style.display === 'flex',
        pendingAction: window.pendingActionAfterAuth?.type,
        activeTab: document.getElementById('modal-tab-register')?.classList.contains('active')
      })
    `);
    assert('generateUserKundli() gates guest and opens auth dialog', kundliGateResult.modalOpen);
    assert('generateUserKundli() sets pending action to calculate_kundli', kundliGateResult.pendingAction === 'calculate_kundli');
    assert('Auth dialog opens on register (Sign Up) tab for guest', kundliGateResult.activeTab);

    // Attempt Numerology Studio as Guest
    await cdp.eval(`
      closeAuthModal();
      window.pendingActionAfterAuth = null;
      openNumerologyStudio();
    `);
    await new Promise((r) => setTimeout(r, 200));
    const numGateResult = await cdp.eval(`
      ({
        modalOpen: document.getElementById('modal-auth-dialog')?.style.display === 'flex',
        pendingAction: window.pendingActionAfterAuth?.type
      })
    `);
    assert('openNumerologyStudio() gates guest and opens auth dialog', numGateResult.modalOpen);
    assert('openNumerologyStudio() sets pending action to open_numerology', numGateResult.pendingAction === 'open_numerology');

    // Attempt Reports Store as Guest
    await cdp.eval(`
      closeAuthModal();
      window.pendingActionAfterAuth = null;
      openReportStoreModal();
    `);
    await new Promise((r) => setTimeout(r, 200));
    const storeGateResult = await cdp.eval(`
      ({
        modalOpen: document.getElementById('modal-auth-dialog')?.style.display === 'flex',
        pendingAction: window.pendingActionAfterAuth?.type
      })
    `);
    assert('openReportStoreModal() gates guest and opens auth dialog', storeGateResult.modalOpen);
    assert('openReportStoreModal() sets pending action to open_store', storeGateResult.pendingAction === 'open_store');

    // Attempt Consultation as Guest
    await cdp.eval(`
      closeAuthModal();
      window.pendingActionAfterAuth = null;
      startConsultationSession('Acharya Devratan', 0);
    `);
    await new Promise((r) => setTimeout(r, 200));
    const consultGateResult = await cdp.eval(`
      ({
        modalOpen: document.getElementById('modal-auth-dialog')?.style.display === 'flex',
        pendingAction: window.pendingActionAfterAuth?.type
      })
    `);
    assert('startConsultationSession() gates guest and opens auth dialog', consultGateResult.modalOpen);
    assert('startConsultationSession() sets pending action to open_chat', consultGateResult.pendingAction === 'open_chat');

    // --- TEST SUITE 3: AUTHENTICATED CUSTOMER EXPERIENCE & UI SWITCH ---
    console.log('\n--- TEST SUITE 3: Authenticated Customer Experience ---');
    await cdp.eval(`
      closeAuthModal();
      currentUserSession = {
        id: 'usr_seeker_777',
        name: 'Priyadarshini Rao',
        email: 'priyadarshini@example.com',
        role: 'USER',
        status: 'ACTIVE'
      };
      currentSessionToken = 'customer_session_token_xyz';
      localStorage.setItem('astro_user_session', JSON.stringify(currentUserSession));
      localStorage.setItem('astro_session_token', currentSessionToken);
      updateUserSessionUI();
      switchNavSection('overview');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const authenticatedState = await cdp.eval(`
      ({
        guestBtnsHidden: document.getElementById('nav-guest-btns')?.style.display === 'none',
        userDropdownVisible: document.getElementById('nav-user-dropdown-wrap')?.style.display !== 'none',
        navUserName: document.getElementById('nav-user-name')?.textContent,
        dropdownIdent: document.getElementById('nav-dropdown-user-ident')?.textContent,
        authDashVisible: document.getElementById('overview-authenticated-dashboard')?.style.display !== 'none',
        guestBannerHidden: document.getElementById('overview-guest-banner')?.style.display === 'none',
        greetingText: document.getElementById('auth-greeting-heading')?.textContent,
        adminNavBtnHidden: document.getElementById('btn-nav-admin')?.style.display === 'none'
      })
    `);

    assert('Authenticated customer hides nav guest buttons', authenticatedState.guestBtnsHidden);
    assert('Authenticated customer displays user menu dropdown trigger', authenticatedState.userDropdownVisible);
    assert('Navbar user profile trigger displays customer name', authenticatedState.navUserName === 'Priyadarshini Rao');
    assert('Dropdown identity displays customer email or name', authenticatedState.dropdownIdent.includes('priyadarshini'));
    assert('Authenticated dashboard is visible', authenticatedState.authDashVisible);
    assert('Public guest banner is hidden for authenticated user', authenticatedState.guestBannerHidden);
    assert('Personalized greeting says "Namaste, Priyadarshini Rao"', authenticatedState.greetingText === 'Namaste, Priyadarshini Rao');
    assert('Admin Console button is strictly hidden on customer pages', authenticatedState.adminNavBtnHidden);

    // --- TEST SUITE 4: UNCONDITIONAL & COMPLETE SIGN OUT ---
    console.log('\n--- TEST SUITE 4: Unconditional & Complete Sign Out ---');
    await cdp.eval(`
      // Inject some mock tokens/preview flags to test thorough purging
      localStorage.setItem('sb-test-auth-token', 'mock_supa_token');
      localStorage.setItem('astro_admin_assurance', 'mock_assurance_token');
      localStorage.setItem('astro_admin_preview_active', 'true');
      localStorage.setItem('astro_admin_preview_tier', 'PLUS');
      executeSignOut(false);
    `);
    await new Promise((r) => setTimeout(r, 300));

    const postSignOutState = await cdp.eval(`
      ({
        currentUserSession,
        currentSessionToken,
        activeNav: currentActiveNavSection,
        activeTab: document.querySelector('.page-tab-view.active')?.id,
        hash: window.location.hash,
        storedSession: localStorage.getItem('astro_user_session'),
        storedToken: localStorage.getItem('astro_session_token'),
        storedSupa: localStorage.getItem('sb-test-auth-token'),
        storedAssurance: localStorage.getItem('astro_admin_assurance'),
        storedPreview: localStorage.getItem('astro_admin_preview_active'),
        authDashDisplay: document.getElementById('overview-authenticated-dashboard')?.style.display,
        guestBannerDisplay: document.getElementById('overview-guest-banner')?.style.display,
        headingText: document.getElementById('auth-greeting-heading')?.textContent,
        guestBtnsDisplay: document.getElementById('nav-guest-btns')?.style.display,
        userDropdownDisplay: document.getElementById('nav-user-dropdown-wrap')?.style.display
      })
    `);

    assert('executeSignOut clears currentUserSession to null', postSignOutState.currentUserSession === null);
    assert('executeSignOut clears currentSessionToken to empty string', postSignOutState.currentSessionToken === '');
    assert('executeSignOut switches navSection to overview', postSignOutState.activeNav === 'overview');
    assert('executeSignOut activates view-overview tab', postSignOutState.activeTab === 'view-overview');
    assert('executeSignOut updates location hash to #/overview', postSignOutState.hash === '#/overview');
    assert('executeSignOut removes astro_user_session from localStorage', postSignOutState.storedSession === null);
    assert('executeSignOut removes astro_session_token from localStorage', postSignOutState.storedToken === null);
    assert('executeSignOut removes all Supabase tokens (sb-*) from localStorage', postSignOutState.storedSupa === null);
    assert('executeSignOut removes astro_admin_assurance from localStorage', postSignOutState.storedAssurance === null);
    assert('executeSignOut removes astro_admin_preview_active from localStorage', postSignOutState.storedPreview === null);
    assert('executeSignOut hides authenticated dashboard', postSignOutState.authDashDisplay === 'none');
    assert('executeSignOut restores guest welcome banner', postSignOutState.guestBannerDisplay !== 'none');
    assert('executeSignOut resets greeting heading to "Namaste, Seeker"', postSignOutState.headingText === 'Namaste, Seeker');
    assert('executeSignOut restores guest buttons (Sign In / Sign Up)', postSignOutState.guestBtnsDisplay !== 'none');
    assert('executeSignOut hides user dropdown wrap', postSignOutState.userDropdownDisplay === 'none');

    // --- TEST SUITE 5: SANITIZATION PREVENTS ADMIN ROLE GREETING ---
    console.log('\n--- TEST SUITE 5: Role & Title Sanitization ---');
    await cdp.eval(`
      currentUserSession = {
        id: 'usr_admin_001',
        name: 'Platform Owner',
        email: 'owner@astroverse.app',
        role: 'OWNER',
        status: 'ACTIVE'
      };
      updatePersonalizedGreetingUI();
    `);
    const ownerGreeting = await cdp.eval(`document.getElementById('auth-greeting-heading')?.textContent`);
    assert('Platform Owner name is sanitized to default "Namaste, Seeker" on customer portal', ownerGreeting === 'Namaste, Seeker');

    await cdp.eval(`
      currentUserSession.name = 'Platform Administrator';
      updatePersonalizedGreetingUI();
    `);
    const adminGreeting = await cdp.eval(`document.getElementById('auth-greeting-heading')?.textContent`);
    assert('Platform Administrator name is sanitized to default "Namaste, Seeker" on customer portal', adminGreeting === 'Namaste, Seeker');

    console.log('\n======================================================================');
    console.log(`RESULTS: ${passCount} / ${testCount} assertions passed.`);
    console.log('======================================================================\n');

  } finally {
    chromeProc.kill();
  }
}

run().catch(console.error);
