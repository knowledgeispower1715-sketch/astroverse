import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const CDP_PORT = 9222;
const LOCAL_PORT = 5088;
const ARTIFACT_DIR = path.resolve('artifacts/supabase-security-phase-3-3');

// Simple static server for admin.html
const server = http.createServer((req, res) => {
  const adminPath = path.resolve('admin.html');
  if (fs.existsSync(adminPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(adminPath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(LOCAL_PORT, '127.0.0.1', async () => {
  console.log(`Local admin static server listening on http://127.0.0.1:${LOCAL_PORT}`);
  const targetUrl = `http://127.0.0.1:${LOCAL_PORT}/`;

  try {
    const targetResp = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
    const target = await targetResp.json();
    console.log(`Created local CDP target: ${target.id}`);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      const callId = id++;
      return new Promise((resolve, reject) => {
        callbacks.set(callId, { resolve, reject });
        ws.send(JSON.stringify({ id: callId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    await new Promise(r => setTimeout(r, 2000));

    const localDomState = await send('Runtime.evaluate', {
      expression: `({
        title: document.title,
        provenanceBadges: Array.from(document.querySelectorAll('.provenance-badge, [class*="provenance-"], [data-provenance]')).map(el => el.innerText.trim()).filter(Boolean),
        modulesCount: document.querySelectorAll('[data-module], [id^="admin-panel-"]').length,
        hasCommandCenter: Boolean(document.getElementById('admin-command-bar')),
        hasGroundTruthBanner: Boolean(document.querySelector('.admin-ground-truth-banner')),
        hasQuickAccess: Boolean(document.querySelector('.admin-quick-access-bar')),
        hasTaskQueueModal: Boolean(document.getElementById('admin-task-queue-modal')),
        hasHighRiskModal: Boolean(document.getElementById('admin-high-risk-modal')),
        hasDiagnosticsDrawer: Boolean(document.getElementById('admin-diagnostics-drawer'))
      })`,
      returnByValue: true
    });

    console.log('Local Admin DOM State:', JSON.stringify(localDomState.result?.value, null, 2));

    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const localScreenshotPath = path.join(ARTIFACT_DIR, 'local_admin_cdp_1920x1080.png');
    fs.writeFileSync(localScreenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved local admin screenshot to ${localScreenshotPath}`);

    ws.close();
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`);
  } catch (err) {
    console.error('Local CDP error:', err);
  } finally {
    server.close();
  }
});
