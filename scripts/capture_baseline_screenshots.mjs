import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const outDir = path.resolve(__dirname, '..', 'test-artifacts', 'baseline');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

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
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    this.ws.close();
  }
}

async function captureScreenshots() {
  console.log('Capturing baseline screenshots before design system rebuild...');

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9232',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9232/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9232');

    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Page.navigate', { url: `file:///${indexPath}` });
    await new Promise((r) => setTimeout(r, 1500));

    const viewports = [
      { name: 'overview_320px_small_phone.png', width: 320, height: 640 },
      { name: 'overview_360px_android.png', width: 360, height: 740 },
      { name: 'overview_375px_iphone_se.png', width: 375, height: 812 },
      { name: 'overview_412px_pixel_7.png', width: 412, height: 915 },
      { name: 'overview_768px_tablet.png', width: 768, height: 1024 },
      { name: 'overview_1366px_laptop.png', width: 1366, height: 768 }
    ];

    for (const vp of viewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 768
      });
      await new Promise((r) => setTimeout(r, 300));
      const res = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, vp.name), Buffer.from(res.data, 'base64'));
      console.log(`Saved: ${vp.name}`);
    }

    // Modal and subview screenshots on standard mobile (375px)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: true
    });

    // 1. Kundli view
    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.switchAppView === 'function') window.switchAppView('kundli');`
    });
    await new Promise((r) => setTimeout(r, 400));
    let snap = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'route_375px_kundli.png'), Buffer.from(snap.data, 'base64'));
    console.log('Saved: route_375px_kundli.png');

    // 2. Numerology modal
    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.openNumerologyStudioModal === 'function') window.openNumerologyStudioModal();`
    });
    await new Promise((r) => setTimeout(r, 400));
    snap = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'route_375px_numerology_modal.png'), Buffer.from(snap.data, 'base64'));
    console.log('Saved: route_375px_numerology_modal.png');

    // Close numerology modal
    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.closeNumerologyStudioModal === 'function') window.closeNumerologyStudioModal();`
    });

    // 3. AI chat modal
    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.openAIConsultationModal === 'function') window.openAIConsultationModal();`
    });
    await new Promise((r) => setTimeout(r, 400));
    snap = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'route_375px_ai_chat_modal.png'), Buffer.from(snap.data, 'base64'));
    console.log('Saved: route_375px_ai_chat_modal.png');

    // Close AI chat modal
    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.closeAIConsultationModal === 'function') window.closeAIConsultationModal();`
    });

    // 4. Reports store
    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.openReportStoreModal === 'function') window.openReportStoreModal();`
    });
    await new Promise((r) => setTimeout(r, 400));
    snap = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'route_375px_reports_modal.png'), Buffer.from(snap.data, 'base64'));
    console.log('Saved: route_375px_reports_modal.png');

    await client.close();
    console.log('All baseline screenshots captured successfully!');
  } finally {
    try { chrome.kill(); } catch (e) {}
  }
}

captureScreenshots().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
