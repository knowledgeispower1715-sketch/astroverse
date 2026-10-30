import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('index.html');
const dlDir = path.resolve('test-artifacts', 'module16_verified_downloads');
if (fs.existsSync(dlDir)) {
  fs.rmSync(dlDir, { recursive: true, force: true });
}
fs.mkdirSync(dlDir, { recursive: true });

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
  } else if (req.url.startsWith('/api/admin/preview/set-tier')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, tier: 'PREMIUM' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(8095, async () => {
  console.log('[TEST] Static HTTP test server listening on http://localhost:8095');

  function getJson(url) {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
  }

  class CDP {
    constructor(wsUrl) {
      this.wsUrl = wsUrl;
      this.msgId = 1;
      this.callbacks = new Map();
      this.downloads = [];
    }

    async connect() {
      this.ws = new globalThis.WebSocket(this.wsUrl);
      await new Promise((resolve, reject) => {
        this.ws.addEventListener('open', resolve);
        this.ws.addEventListener('error', reject);
      });

      this.ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        const t = new Date().toISOString().split('T')[1];
        if (msg.method && msg.method.startsWith('Browser.download')) {
          console.log(`[${t}] [CDP DOWNLOAD EVENT]`, msg.method, JSON.stringify(msg.params));
          this.downloads.push(msg);
        }
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
        const id = this.msgId++;
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
        throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
      }
      return res.result?.value;
    }
  }

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9294',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:8095/'
  ]);

  try {
    let targets;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9294/json/list');
        if (targets && targets.length > 0) break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const cdp = new CDP(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    
    // Seed authenticated session with OWNER role and initial FREE tier
    await cdp.eval(`
      localStorage.setItem('astro_admin_preview_active', 'true');
      localStorage.setItem('astro_admin_preview_tier', 'FREE');
      localStorage.setItem('astroverse.admin.preview.tier', 'FREE');
      localStorage.setItem('astro_simulated_tier', 'FREE');
      localStorage.setItem('astro_user_session', JSON.stringify({
        id: 'admin_test_owner',
        role: 'OWNER',
        name: 'Principal Astrologer',
        email: 'owner@astroverse.app'
      }));
    `);

    await cdp.send('Page.reload');
    await new Promise(r => setTimeout(r, 2500));

    // Configure download behavior on reloaded page
    await cdp.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: dlDir
    });

    console.log('[TEST 1] Opening Admin Module 16 under FREE Tier...');
    const freeCheck = await cdp.eval(`
      (() => {
        openAdminToolHarness('reports');
        const grid = document.getElementById('admin-reports-catalog-grid');
        const btn = document.getElementById('btn-admin-pdf-report_janam_kundli_deep_dive');
        return {
          harnessVisible: document.getElementById('admin-tool-reports')?.style.display !== 'none',
          catalogCardsCount: grid?.children?.length || 0,
          buttonText: btn?.textContent?.trim() || '',
          buttonColor: btn?.style?.color || ''
        };
      })()
    `);
    console.log('[TEST 1 RESULT]', freeCheck);
    if (!freeCheck.buttonText.includes('PDF Gated')) {
      throw new Error(`Expected Free tier button to say 'PDF Gated', got '${freeCheck.buttonText}'`);
    }

    console.log('[TEST 2] Testing Free Tier PDF gating click...');
    const freeClickRes = await cdp.eval(`
      (() => {
        let lastToast = '';
        const origToast = window.showToast;
        window.showToast = (msg, type) => {
          lastToast = msg;
          if (origToast) origToast(msg, type);
        };
        const btn = document.getElementById('btn-admin-pdf-report_janam_kundli_deep_dive');
        btn.click();
        return { lastToast };
      })()
    `);
    console.log('[TEST 2 RESULT]', freeClickRes);
    if (!freeClickRes.lastToast.includes('PDF Download Gated')) {
      throw new Error(`Expected gating toast on Free tier, got '${freeClickRes.lastToast}'`);
    }

    console.log('[TEST 3] Upgrading preview tier to PREMIUM...');
    const premiumCheck = await cdp.eval(`
      (async () => {
        await adminSetPreviewTier('PREMIUM');
        const btn = document.getElementById('btn-admin-pdf-report_janam_kundli_deep_dive');
        const priceEl = document.querySelector('#admin-reports-catalog-grid strong');
        return {
          tier: adminSimulatedTier,
          buttonText: btn?.textContent?.trim() || '',
          samplePrice: priceEl?.textContent?.trim() || ''
        };
      })()
    `);
    console.log('[TEST 3 RESULT]', premiumCheck);
    if (!premiumCheck.buttonText.includes('Download PDF')) {
      throw new Error(`Expected Premium tier button to say 'Download PDF', got '${premiumCheck.buttonText}'`);
    }

    console.log('[TEST 4] Testing "Sample Chapters" interaction -> Modal Report Reader...');
    const readerOpenRes = await cdp.eval(`
      (() => {
        openAdminReportSampleReader('report_career_education');
        const modal = document.getElementById('modal-report-reader');
        const title = document.getElementById('reader-doc-title')?.textContent?.trim();
        const tocCount = document.getElementById('reader-toc-list')?.children?.length || 0;
        return {
          modalVisible: modal?.style?.display !== 'none',
          title,
          tocCount
        };
      })()
    `);
    console.log('[TEST 4 RESULT]', readerOpenRes);
    if (!readerOpenRes.modalVisible || !readerOpenRes.title.includes('Career')) {
      throw new Error(`Expected reader modal to open with Career report, got ${JSON.stringify(readerOpenRes)}`);
    }

    console.log('[TEST 5] Downloading PDF from inside Modal Report Reader...');
    const readerDlRes = await cdp.eval(`
      (async () => {
        await triggerReaderPdfDownload();
        return { triggered: true };
      })()
    `);
    console.log('[TEST 5 RESULT]', readerDlRes);

    console.log('[TEST 5] Waiting for reader download to complete on disk...');
    let foundReaderPdf = false;
    for (let i = 0; i < 25; i++) {
      const files = fs.readdirSync(dlDir);
      const pdfs = files.filter(f => f.endsWith('.pdf'));
      if (pdfs.length > 0) {
        const stats = fs.statSync(path.join(dlDir, pdfs[0]));
        if (stats.size > 100000) {
          console.log(`[TEST 5 SUCCESS] Downloaded from Reader: ${pdfs[0]} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          foundReaderPdf = true;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    if (!foundReaderPdf) {
      throw new Error("Reader PDF download failed to write complete file to disk!");
    }

    // Close reader modal
    await cdp.eval(`closeReportReaderModal();`);

    console.log('[TEST 6] Triggering Direct Download from Module 16 Card (Janam Kundli Deep Dive)...');
    const directDlRes = await cdp.eval(`
      (async () => {
        const btn = document.getElementById('btn-admin-pdf-report_janam_kundli_deep_dive');
        await testAdminReportPdfEntitlement('report_janam_kundli_deep_dive', btn);
        return {
          finished: true,
          buttonTextRestored: btn?.textContent?.trim() || ''
        };
      })()
    `);
    console.log('[TEST 6 RESULT]', directDlRes);

    console.log('[TEST 6] Waiting for second PDF to complete on disk...');
    let completedPdfs = [];
    for (let i = 0; i < 25; i++) {
      const files = fs.readdirSync(dlDir);
      completedPdfs = files.filter(f => f.endsWith('.pdf'));
      if (completedPdfs.length >= 2) {
        console.log(`[TEST 6 SUCCESS] Both PDFs downloaded:`, completedPdfs);
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (completedPdfs.length < 2) {
      throw new Error(`Expected at least 2 downloaded PDFs, got ${completedPdfs.length}`);
    }

    // Validate both PDFs on disk
    for (const f of completedPdfs) {
      const filePath = path.join(dlDir, f);
      const stats = fs.statSync(filePath);
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(8);
      fs.readSync(fd, buf, 0, 8, 0);
      fs.closeSync(fd);
      const magic = buf.toString('ascii');
      console.log(`[VERIFY FILE] ${f}: Size = ${(stats.size / 1024 / 1024).toFixed(2)} MB, Magic = '${magic}'`);
      if (!magic.startsWith('%PDF-')) {
        throw new Error(`File ${f} is missing PDF magic header! Got: ${magic}`);
      }
      if (stats.size < 500000) {
        throw new Error(`File ${f} is suspiciously small: ${stats.size} bytes`);
      }
    }

    console.log('\n======================================================');
    console.log('✅ ALL MODULE 16 BROWSER DOWNLOAD VERIFICATIONS PASSED!');
    console.log('======================================================\n');

  } finally {
    chrome.kill('SIGKILL');
    server.close();
  }
});
