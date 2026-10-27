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

async function run3DCardVerification() {
  console.log(`\n================= ASTROVERSE 3D CARD INTERACTIONS FORENSIC VERIFICATION =================\n`);

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9232',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    await new Promise((r) => setTimeout(r, 1400));
    const targets = await getJson('http://127.0.0.1:9232/json/list');
    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');

    if (!pageTarget) throw new Error('No Chrome page target discovered on port 9232');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    await client.send('Page.navigate', { url: `file:///${indexPath}` });
    await new Promise((r) => setTimeout(r, 1200));

    // Wait until controller scripts ready
    for (let i = 0; i < 40; i++) {
      const readyCheck = await client.send('Runtime.evaluate', {
        expression: `typeof init3DCardInteractions === 'function' && document.querySelectorAll('.cosmic-service-card').length > 0`
      });
      if (readyCheck.result && readyCheck.result.value === true) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    // 1. Identify 3D target cards
    console.log('[TEST 1] Discovering 3D Interactive Target Cards in Chrome...');
    const countEval = await client.send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.av-card-3d, .cosmic-service-card').length`,
      returnByValue: true
    });
    const cardCount = countEval.result.value;
    console.log(`  ✓ Identified ${cardCount} cards configured for 3D interactions (PASS)`);
    if (cardCount === 0) throw new Error('Zero 3D cards discovered');

    // 2. Simulate mousemove over first cosmic-service-card
    console.log('\n[TEST 2] Simulating Mouse Pointer Movements & Measuring 3D Transforms in Real Chrome...');
    const interactEval = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const card = document.querySelector('.cosmic-service-card');
          if (!card) return { error: 'No card' };
          
          const rect = card.getBoundingClientRect();
          card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          
          // Move towards bottom-right quadrant
          const moveX = rect.left + rect.width * 0.85;
          const moveY = rect.top + rect.height * 0.85;
          
          card.dispatchEvent(new MouseEvent('mousemove', {
            clientX: moveX,
            clientY: moveY,
            bubbles: true
          }));

          return new Promise(resolve => {
            requestAnimationFrame(() => {
              const transform = card.style.transform;
              const mouseX = card.style.getPropertyValue('--mouse-x');
              const mouseY = card.style.getPropertyValue('--mouse-y');
              
              resolve({
                transform,
                mouseX,
                mouseY,
                rectWidth: rect.width,
                rectHeight: rect.height
              });
            });
          });
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    const res = interactEval.result.value;
    console.log(`  Active transform applied: "${res.transform}"`);
    console.log(`  Dynamic sheen variables: --mouse-x=${res.mouseX}, --mouse-y=${res.mouseY}`);

    const match = res.transform.match(/rotateX\(([-\d.]+)deg\)\s+rotateY\(([-\d.]+)deg\)/);
    if (!match) throw new Error(`Transform does not contain rotateX/rotateY: ${res.transform}`);

    const rotX = parseFloat(match[1]);
    const rotY = parseFloat(match[2]);
    console.log(`  Measured tilt: Pitch (rotateX) = ${rotX}°, Yaw (rotateY) = ${rotY}°`);

    if (Math.abs(rotX) > 7.05 || Math.abs(rotY) > 7.05) {
      throw new Error(`Tilt exceeded bounded limit of ±7 degrees: X=${rotX}, Y=${rotY}`);
    }
    console.log(`  ✓ Tilt is safely bounded within ±7° maximum (PASS)`);

    if (!res.mouseX || !res.mouseY) {
      throw new Error('Specular highlight coordinates not calculated');
    }
    console.log(`  ✓ Specular sheen highlight follows pointer (PASS)`);

    // 3. Test mouseleave reset
    console.log('\n[TEST 3] Testing Mouseleave Surface Reset & Variable Cleanup...');
    const leaveEval = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const card = document.querySelector('.cosmic-service-card');
          card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
          return {
            transform: card.style.transform,
            hasSheenX: card.style.getPropertyValue('--mouse-x') !== '',
            hasSheenY: card.style.getPropertyValue('--mouse-y') !== ''
          };
        })()
      `,
      returnByValue: true
    });

    const leaveRes = leaveEval.result.value;
    console.log(`  Transform after mouseleave: "${leaveRes.transform}"`);
    if (leaveRes.transform !== '') throw new Error('Transform was not cleared on mouseleave');
    console.log(`  ✓ Transform returned to neutral (PASS)`);

    if (leaveRes.hasSheenX || leaveRes.hasSheenY) throw new Error('Sheen properties were not purged');
    console.log(`  ✓ Sheen highlight properties cleanly purged (PASS)`);

    await client.close();
    chrome.kill('SIGTERM');
    console.log('\n================= ALL 3D MOTION TESTS PASSED IN REAL CHROME (PASS) =================\n');
    process.exit(0);
  } catch (err) {
    console.error('3D verification failed:', err);
    chrome.kill('SIGTERM');
    process.exit(1);
  }
}

run3DCardVerification();
