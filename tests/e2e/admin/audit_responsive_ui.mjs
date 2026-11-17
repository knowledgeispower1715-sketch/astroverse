import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TARGET_URL = process.env.BASE_URL || 'https://astroverse-git-remed-41651b-knowledgeispower1715-1915s-projects.vercel.app/admin';

const VIEWPORTS = [
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 812 }
];

const PANELS = [
  'overview',
  'users',
  'roles',
  'security',
  'astrology',
  'reports',
  'ai',
  'payments',
  'subscriptions',
  'content',
  'settings',
  'privacy',
  'audit',
  'integrations',
  'incidents',
  'qa',
  'database',
  'analytics',
  'customer360',
  'entitlements',
  'promotions',
  'consultations'
];

const QA_WORKBENCHES = [
  'kundli',
  'forecasts',
  'ai-astrologer',
  'numerology',
  'reports',
  'billing'
];

const MODALS = [
  'modal-admin-mfa',
  'modal-admin-mfa-setup',
  'modal-admin-gateway-credentials',
  'modal-admin-edit-price',
  'modal-admin-assign-role',
  'modal-admin-grant-subscription',
  'modal-admin-extend-subscription',
  'modal-admin-cancel-subscription',
  'modal-admin-task-queue',
  'modal-admin-session-centre',
  'modal-admin-high-risk-action'
];

const DEFAULT_OWNER_USER = {
  id: 'b204eff9-1a9b-4805-8c07-c35d3a9de3ee',
  name: 'Platform Owner',
  email: 'tiwariji0028@gmail.com',
  role: 'OWNER',
  status: 'ACTIVE',
  mfaEnabled: true
};

const DEFAULT_SESSION_TOKEN = 'mock_verified_admin_session_token_256_hash';
const DEFAULT_ASSURANCE_TOKEN = 'mock_verified_admin_assurance_token_hmac_sha256';

async function injectSession(page) {
  await page.evaluate(
    ({ u, sTok, aTok }) => {
      sessionStorage.setItem('astro_admin_session_token', sTok);
      sessionStorage.setItem('astro_admin_user', JSON.stringify(u));
      sessionStorage.setItem('astro_admin_assurance', aTok);
      localStorage.removeItem('astro_session_token');
      localStorage.removeItem('astro_user_session');
    },
    { u: DEFAULT_OWNER_USER, sTok: DEFAULT_SESSION_TOKEN, aTok: DEFAULT_ASSURANCE_TOKEN }
  );
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#view-admin', { state: 'visible', timeout: 10000 });
}

async function runAudit() {
  console.log(`Starting Forensic Responsive UI Audit`);
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const browser = await chromium.launch({ headless: true });
  const auditReport = {
    targetUrl: TARGET_URL,
    timestamp: new Date().toISOString(),
    viewports: {}
  };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n========================================`);
      console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`========================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        ignoreHTTPSErrors: true
      });
      const page = await context.newPage();

      await page.goto(TARGET_URL);
      await page.waitForLoadState('domcontentloaded');
      await injectSession(page);

      // 1. Root & Document metrics
      const rootMetrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        return {
          windowInnerWidth: window.innerWidth,
          windowInnerHeight: window.innerHeight,
          docScrollWidth: docEl.scrollWidth,
          docClientWidth: docEl.clientWidth,
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth,
          hasHorizontalOverflow: docEl.scrollWidth > window.innerWidth || body.scrollWidth > window.innerWidth
        };
      });

      console.log(`Root Metrics: window=${rootMetrics.windowInnerWidth}x${rootMetrics.windowInnerHeight}, docScrollWidth=${rootMetrics.docScrollWidth}, bodyScrollWidth=${rootMetrics.bodyScrollWidth}, overflow=${rootMetrics.hasHorizontalOverflow}`);

      // 2. Header and Navigation Inspection
      const navInspection = await page.evaluate((isSmall) => {
        const header = document.querySelector('.admin-global-header');
        const searchInput = document.getElementById('admin-global-search-input');
        const favoritesBar = document.getElementById('admin-quick-favorites-bar');
        const toggleBtn = document.getElementById('btn-admin-sidebar-toggle');
        const sidebar = document.querySelector('.admin-sidebar');
        const backdrop = document.getElementById('admin-sidebar-backdrop');
        const closeBtn = document.getElementById('btn-admin-close-signout');

        const headerRect = header ? header.getBoundingClientRect() : null;
        const toggleDisplay = toggleBtn ? window.getComputedStyle(toggleBtn).display : 'none';
        const sidebarDisplay = sidebar ? window.getComputedStyle(sidebar).display : 'none';

        return {
          headerFound: !!header,
          headerRect: headerRect ? { width: headerRect.width, height: headerRect.height, right: headerRect.right } : null,
          searchInputVisible: searchInput ? window.getComputedStyle(searchInput).display !== 'none' : false,
          favoritesBarVisible: favoritesBar ? window.getComputedStyle(favoritesBar).display !== 'none' : false,
          toggleBtnDisplay: toggleDisplay,
          toggleBtnVisible: toggleDisplay !== 'none',
          sidebarDisplay: sidebarDisplay,
          hasCloseButton: !!closeBtn
        };
      }, vp.width <= 900);

      console.log(`Navigation Inspection:`, JSON.stringify(navInspection));

      // 3. Test Sidebar Toggle if on Tablet or Mobile (width <= 900)
      let sidebarToggleTest = null;
      if (vp.width <= 900) {
        sidebarToggleTest = await page.evaluate(async () => {
          const toggleBtn = document.getElementById('btn-admin-sidebar-toggle');
          const sidebar = document.querySelector('.admin-sidebar');
          const backdrop = document.getElementById('admin-sidebar-backdrop');

          if (!toggleBtn || !sidebar) return { error: 'Toggle button or sidebar missing' };

          // Initial state: not open
          const initialOpen = sidebar.classList.contains('open');

          // Click toggle
          toggleBtn.click();
          const openAfterClick = sidebar.classList.contains('open');
          const backdropOpen = backdrop ? backdrop.classList.contains('open') : false;
          const sidebarRect = sidebar.getBoundingClientRect();

          // Click backdrop to close
          if (backdrop) backdrop.click();
          const closedAfterBackdrop = !sidebar.classList.contains('open');

          // Toggle again and test Escape key
          toggleBtn.click();
          const openSecond = sidebar.classList.contains('open');
          // Dispatched Escape
          const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
          document.dispatchEvent(escEvent);
          const closedAfterEsc = !sidebar.classList.contains('open');

          return {
            initialOpen,
            openAfterClick,
            backdropOpen,
            sidebarWidth: sidebarRect.width,
            closedAfterBackdrop,
            openSecond,
            closedAfterEsc,
            success: openAfterClick && backdropOpen && closedAfterBackdrop && closedAfterEsc
          };
        });
        console.log(`Sidebar Toggle Test:`, JSON.stringify(sidebarToggleTest));
      }

      // 4. Panel-by-Panel Audit across all 22 panels
      const panelAudits = [];
      for (const panelId of PANELS) {
        // Switch module
        await page.evaluate((mod) => {
          if (typeof window.switchAdminModule === 'function') {
            window.switchAdminModule(mod, false);
          }
        }, panelId);
        await page.waitForTimeout(100);

        const panelMetrics = await page.evaluate((mod) => {
          const panel = document.getElementById(`admin-panel-${mod}`);
          if (!panel) return { id: mod, found: false };

          const style = window.getComputedStyle(panel);
          const rect = panel.getBoundingClientRect();
          const docScrollWidth = document.documentElement.scrollWidth;
          const innerWidth = window.innerWidth;

          // Find tables and their scroll containers
          const tables = Array.from(panel.querySelectorAll('table'));
          const tableDetails = tables.map(t => {
            const parent = t.parentElement;
            const parentStyle = parent ? window.getComputedStyle(parent) : null;
            return {
              tableWidth: t.scrollWidth,
              parentOverflowX: parentStyle ? parentStyle.overflowX : 'visible',
              isContained: parentStyle ? (parentStyle.overflowX === 'auto' || parentStyle.overflowX === 'scroll' || t.scrollWidth <= parent.clientWidth) : false
            };
          });

          // Check interactive elements
          const buttons = Array.from(panel.querySelectorAll('button:not([disabled])'));
          const inputs = Array.from(panel.querySelectorAll('input:not([disabled]), select:not([disabled])'));

          // Check for horizontal overflow elements
          const overflowingElements = [];
          const allEls = panel.querySelectorAll('*');
          allEls.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > innerWidth + 5 && r.width > 0 && r.height > 0) {
              overflowingElements.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                right: Math.round(r.right),
                width: Math.round(r.width)
              });
            }
          });

          return {
            id: mod,
            found: true,
            display: style.display,
            rect: { width: Math.round(rect.width), height: Math.round(rect.height), left: Math.round(rect.left), right: Math.round(rect.right) },
            docScrollWidth,
            innerWidth,
            overflowsWindow: docScrollWidth > innerWidth + 5,
            tablesCount: tables.length,
            tableDetails,
            buttonCount: buttons.length,
            inputCount: inputs.length,
            overflowingElementCount: overflowingElements.length,
            overflowingElementsSample: overflowingElements.slice(0, 3)
          };
        }, panelId);

        panelAudits.push(panelMetrics);
      }

      console.log(`Evaluated ${panelAudits.length} panels. Overflowing panels: ${panelAudits.filter(p => p.overflowsWindow).length}`);

      // 5. QA Workbenches Audit across all 6 workbenches
      // First switch to QA module
      await page.evaluate(() => {
        if (typeof window.switchAdminModule === 'function') {
          window.switchAdminModule('qa', false);
        }
      });
      await page.waitForTimeout(150);

      const workbenchAudits = [];
      for (const toolId of QA_WORKBENCHES) {
        await page.evaluate((t) => {
          if (typeof window.switchAdminTool === 'function') {
            window.switchAdminTool(t, false);
          }
        }, toolId);
        await page.waitForTimeout(100);

        const toolMetrics = await page.evaluate((t) => {
          const panel = document.getElementById(`admin-tool-${t}`);
          if (!panel) return { id: t, found: false };

          const style = window.getComputedStyle(panel);
          const rect = panel.getBoundingClientRect();
          const docScrollWidth = document.documentElement.scrollWidth;
          const innerWidth = window.innerWidth;

          const buttons = Array.from(panel.querySelectorAll('button:not([disabled])'));
          const inputs = Array.from(panel.querySelectorAll('input:not([disabled]), select:not([disabled])'));

          return {
            id: t,
            found: true,
            display: style.display,
            rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
            docScrollWidth,
            innerWidth,
            overflowsWindow: docScrollWidth > innerWidth + 5,
            buttonCount: buttons.length,
            inputCount: inputs.length
          };
        }, toolId);

        workbenchAudits.push(toolMetrics);
      }

      console.log(`Evaluated ${workbenchAudits.length} QA workbenches. Overflowing: ${workbenchAudits.filter(w => w.overflowsWindow).length}`);

      // 6. Modal Scaling and Responsiveness Audit
      const modalAudits = await page.evaluate((modalIds) => {
        return modalIds.map(id => {
          const el = document.getElementById(id);
          if (!el) return { id, found: false };

          // Temporarily make modal visible to measure responsive bounding box
          const prevDisplay = el.style.display;
          el.style.display = 'flex';
          const inner = el.querySelector('.astro-card, .modal-content, [style*="border-radius"]') || el;
          const rect = inner.getBoundingClientRect();
          el.style.display = prevDisplay;

          return {
            id,
            found: true,
            width: Math.round(rect.width),
            fitsViewport: rect.width <= window.innerWidth + 10,
            hasCloseBtn: !!el.querySelector('[onclick*="close"], [aria-label*="close"], .btn-close, button')
          };
        });
      }, MODALS);

      console.log(`Evaluated ${modalAudits.length} modals. Fits viewport: ${modalAudits.every(m => m.fitsViewport)}`);

      // 7. Touch Target Audit (especially on mobile 375x812)
      let touchTargetAudit = null;
      if (vp.width === 375) {
        touchTargetAudit = await page.evaluate(() => {
          // Switch to overview panel for sample audit
          if (typeof window.switchAdminModule === 'function') {
            window.switchAdminModule('overview', false);
          }

          const interactives = Array.from(document.querySelectorAll('button, a, input, select, .category-pill, .btn-outline-secondary'));
          const visibleInteractives = interactives.filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden';
          });

          let pass44x44 = 0;
          let sub44 = 0;
          const sub44Details = [];

          visibleInteractives.forEach(el => {
            const r = el.getBoundingClientRect();
            const width = Math.round(r.width);
            const height = Math.round(r.height);
            // Check WCAG 2.5.5 (44x44) vs WCAG 2.5.8 (24x24 minimum target size with spacing)
            const item = {
              tag: el.tagName,
              id: el.id || '',
              className: (typeof el.className === 'string' ? el.className : '').slice(0, 30),
              text: el.innerText ? el.innerText.trim().slice(0, 25) : '',
              width,
              height,
              meets44x44: width >= 44 && height >= 44,
              meets24x24: width >= 24 && height >= 24
            };
            if (width >= 44 && height >= 44) {
              pass44x44++;
            } else {
              sub44++;
              sub44Details.push(item);
            }
          });

          // Also specifically measure key mobile controls:
          const toggleBtn = document.getElementById('btn-admin-sidebar-toggle');
          const toggleRect = toggleBtn ? toggleBtn.getBoundingClientRect() : null;
          const closeBtn = document.getElementById('btn-admin-close-signout');
          const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;

          return {
            totalInteractive: visibleInteractives.length,
            pass44x44,
            sub44,
            keyMobileControls: {
              sidebarToggle: toggleRect ? { width: Math.round(toggleRect.width), height: Math.round(toggleRect.height) } : null,
              closeSignout: closeRect ? { width: Math.round(closeRect.width), height: Math.round(closeRect.height) } : null
            },
            sub44Details: sub44Details.slice(0, 20)
          };
        });
        console.log(`Touch Target Audit: Total=${touchTargetAudit.totalInteractive}, >=44x44: ${touchTargetAudit.pass44x44}, <44x44: ${touchTargetAudit.sub44}`);
      }

      auditReport.viewports[vp.name] = {
        viewport: vp,
        rootMetrics,
        navInspection,
        sidebarToggleTest,
        panelAudits,
        workbenchAudits,
        modalAudits,
        touchTargetAudit
      };

      await context.close();
    }

    console.log(`\nAudit completed successfully.`);
    const outputPath = 'E:/rea/tests/e2e/admin/audit_results.json';
    fs.writeFileSync(outputPath, JSON.stringify(auditReport, null, 2));
    console.log(`Audit results saved to ${outputPath}`);

  } finally {
    await browser.close();
  }
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
