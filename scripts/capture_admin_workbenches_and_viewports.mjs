import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const CDP_PORT = 9222;
const LOCAL_PORT = 5099;
const OUTPUT_DIR = path.resolve('artifacts/phase-4-enterprise-verification');

const server = http.createServer((req, res) => {
  const adminPath = path.resolve('admin.html');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(adminPath));
});

server.listen(LOCAL_PORT, '127.0.0.1', async () => {
  console.log(`Local admin static server listening on http://127.0.0.1:${LOCAL_PORT}`);
  const targetUrl = `http://127.0.0.1:${LOCAL_PORT}/`;

  try {
    const targetResp = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
    const target = await targetResp.json();
    console.log(`Attached to local CDP target: ${target.id}`);

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

    // Helper to capture a screenshot
    async function capture(filename) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(shot.data, 'base64'));
      console.log(`Saved: ${filename}`);
    }

    // Set 1920x1080 baseline
    await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await new Promise(r => setTimeout(r, 500));
    await capture('admin_1920x1080_desktop_fhd.png');

    // 6 QA Workbenches
    const workbenches = ['kundli', 'forecasts', 'ai-astrologer', 'numerology', 'reports', 'billing'];
    for (const wb of workbenches) {
      await send('Runtime.evaluate', { expression: `if (typeof switchAdminModule === 'function') switchAdminModule('${wb}');` });
      await new Promise(r => setTimeout(r, 600));
      await capture(`admin_tool_${wb}_1920x1080.png`);
    }

    // Return to overview
    await send('Runtime.evaluate', { expression: `if (typeof switchAdminModule === 'function') switchAdminModule('overview');` });
    await new Promise(r => setTimeout(r, 500));

    // Modals & Drawers
    // 1. Task queue
    await send('Runtime.evaluate', { expression: `if (typeof openAdminTaskQueueModal === 'function') openAdminTaskQueueModal();` });
    await new Promise(r => setTimeout(r, 600));
    await capture('admin_modal_task_queue_1920x1080.png');
    await send('Runtime.evaluate', { expression: `if (typeof closeAdminTaskQueueModal === 'function') closeAdminTaskQueueModal();` });
    await new Promise(r => setTimeout(r, 300));

    // 2. Session centre
    await send('Runtime.evaluate', { expression: `if (typeof openAdminSessionCentreModal === 'function') openAdminSessionCentreModal();` });
    await new Promise(r => setTimeout(r, 600));
    await capture('admin_modal_session_centre_1920x1080.png');
    await send('Runtime.evaluate', { expression: `if (typeof closeAdminSessionCentreModal === 'function') closeAdminSessionCentreModal();` });
    await new Promise(r => setTimeout(r, 300));

    // 3. High risk modal
    await send('Runtime.evaluate', { expression: `if (typeof requestHighRiskActionConfirmation === 'function') requestHighRiskActionConfirmation({ title: 'Customer Account Suspension', target: 'usr_customer_84719', scope: 'Suspends user account, revokes sessions, blocks purchases', reasonRequired: true, requireTotp: true, onConfirm: () => {} });` });
    await new Promise(r => setTimeout(r, 600));
    await capture('admin_modal_high_risk_1920x1080.png');
    await send('Runtime.evaluate', { expression: `if (typeof dismissHighRiskActionModal === 'function') dismissHighRiskActionModal();` });
    await new Promise(r => setTimeout(r, 300));

    // 4. Diagnostics drawer
    await send('Runtime.evaluate', { expression: `if (typeof openAdminDiagnosticsDrawer === 'function') openAdminDiagnosticsDrawer();` });
    await new Promise(r => setTimeout(r, 600));
    await capture('admin_drawer_troubleshooting_1920x1080.png');
    await send('Runtime.evaluate', { expression: `if (typeof closeAdminDiagnosticsDrawer === 'function') closeAdminDiagnosticsDrawer();` });

    ws.close();
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    server.close();
  }
});
