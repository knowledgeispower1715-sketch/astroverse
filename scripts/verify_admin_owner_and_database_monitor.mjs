import assert from 'node:assert';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const TARGET_PORT = 5057;
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('===============================================================');
  console.log('ASTROVERSE ADMIN OWNER PROVISIONING & DATABASE MONITOR VERIFICATION');
  console.log('===============================================================\n');

  // 1. Verify DOM structure in index.html
  console.log('--- Step 1: Validating index.html Admin & Frontend Contracts ---');
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  assert.ok(indexHtml.includes('switchAdminModule(\'database\')'), 'Module 17 nav button must exist in index.html');
  assert.ok(indexHtml.includes('id="admin-panel-database"'), 'Database Monitor panel must exist in index.html');
  assert.ok(indexHtml.includes('id="admin-db-ping-pill"'), 'Database live ping pill must exist in index.html');
  assert.ok(indexHtml.includes('id="admin-db-tables-tbody"'), 'Database table breakdown body must exist in index.html');
  assert.ok(indexHtml.includes('function loadAdminDatabaseMonitor'), 'loadAdminDatabaseMonitor function must exist');
  assert.ok(indexHtml.includes('function runAdminDatabasePing'), 'runAdminDatabasePing function must exist');
  console.log('[PASS] index.html contains Module 17 Database Monitor UI components and client logic.');

  // Verify mobile hero layout styles and personalized greeting logic
  assert.ok(indexHtml.includes('.cosmic-hero-wrapper'), 'Hero wrapper styles exist');
  assert.ok(indexHtml.includes('updatePersonalizedGreetingUI'), 'updatePersonalizedGreetingUI exists');
  console.log('[PASS] Hero layout rules and personalized greeting logic verified intact.');

  // 2. Start wallet-service on dedicated port
  console.log('\n--- Step 2: Starting Wallet Service for Live API Verification ---');
  const env = {
    ...process.env,
    PORT: String(TARGET_PORT),
    NODE_ENV: 'test',
    TEST_ALLOWLIST_PRESERVE: '1',
    ASTROVERSE_ADMIN_EMAILS: 'tiwariji0028@gmail.com,admin@astroverse.app',
    VERCEL_ENV: 'preview'
  };

  const tsNodeBin = path.resolve('services/wallet-service/node_modules/ts-node/dist/bin.js');
  const serverProc = spawn(process.execPath, [tsNodeBin, 'src/server.ts'], {
    cwd: path.resolve('services/wallet-service'),
    env,
    stdio: 'ignore'
  });

  try {
    let online = false;
    for (let i = 0; i < 30; i++) {
      try {
        const h = await request('/api/health');
        if (h.status === 200 && h.data?.status === 'ONLINE') {
          online = true;
          break;
        }
      } catch (e) {
        // wait
      }
      await sleep(500);
    }
    assert.ok(online, 'Wallet service failed to start on port ' + TARGET_PORT);
    console.log(`[PASS] Wallet service is online at ${BASE_URL}`);

    // 3. Test Admin Login with provisioned credentials
    console.log('\n--- Step 3: Verifying Admin Owner Login via /api/auth/admin-login ---');
    const loginRes = await request('/api/auth/admin-login', {
      method: 'POST',
      body: {
        email: 'tiwariji0028@gmail.com',
        password: 'Siscococ123$'
      }
    });

    console.log('Login Response Status:', loginRes.status);
    console.log('Login Response Data:', loginRes.data);
    console.log('Login User Role:', loginRes.data?.user?.role);
    console.log('Login Session Token Exists:', !!loginRes.data?.sessionToken);

    assert.strictEqual(loginRes.status, 200, 'Admin login should succeed with HTTP 200');
    assert.strictEqual(loginRes.data?.user?.email, 'tiwariji0028@gmail.com', 'User email should match');
    assert.strictEqual(loginRes.data?.user?.role, 'OWNER', 'User role should be OWNER');
    assert.ok(loginRes.data?.sessionToken, 'Valid session token must be returned');

    const adminToken = loginRes.data.sessionToken;
    console.log('[PASS] Provisioned owner successfully authenticated and received session token.');

    // 4. Test wrong password rejection
    console.log('\n--- Step 4: Verifying Incorrect Password Rejection ---');
    const wrongPassRes = await request('/api/auth/admin-login', {
      method: 'POST',
      body: {
        email: 'tiwariji0028@gmail.com',
        password: 'WrongPassword999!'
      }
    });
    assert.strictEqual(wrongPassRes.status, 401, 'Wrong password must be rejected with HTTP 401');
    assert.strictEqual(wrongPassRes.data?.error, 'INVALID_CREDENTIALS');
    console.log('[PASS] Incorrect password correctly rejected with 401 INVALID_CREDENTIALS.');

    // 5. Test Database Monitor Endpoint (Authenticated)
    console.log('\n--- Step 5: Testing GET /api/admin/database/monitor ---');
    const monitorRes = await request('/api/admin/database/monitor', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(monitorRes.status, 200, 'Database monitor should return HTTP 200');
    assert.strictEqual(monitorRes.data?.status, 'ONLINE', 'Database status must be ONLINE');
    assert.strictEqual(monitorRes.data?.health, 'HEALTHY', 'Database health must be HEALTHY');
    assert.ok(monitorRes.data?.engine, 'Engine description must exist');
    assert.ok(Array.isArray(monitorRes.data?.tables), 'Tables array must be returned');
    assert.ok(monitorRes.data.tables.length >= 10, 'Should monitor at least 10 core tables');
    assert.ok(typeof monitorRes.data?.storageFootprint?.totalRecords === 'number', 'totalRecords must be a number');
    assert.ok(typeof monitorRes.data?.pingMs === 'number', 'pingMs must be a number');

    console.log(`Database Engine: ${monitorRes.data.engine}`);
    console.log(`Total Monitored Tables: ${monitorRes.data.tables.length}`);
    console.log(`Total Records: ${monitorRes.data.storageFootprint.totalRecords}`);
    console.log(`Database Latency: ${monitorRes.data.pingMs}ms`);
    console.log('[PASS] Database monitor metrics endpoint returns comprehensive live telemetry.');

    // 6. Test Database Ping Endpoint (Authenticated)
    console.log('\n--- Step 6: Testing POST /api/admin/database/ping ---');
    const pingRes = await request('/api/admin/database/ping', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(pingRes.status, 200, 'Database ping should return HTTP 200');
    assert.strictEqual(pingRes.data?.status, 'PONG', 'Ping status must be PONG');
    assert.ok(typeof pingRes.data?.pingMs === 'number', 'pingMs must be returned');
    console.log(`Live Ping Roundtrip: ${pingRes.data.pingMs}ms (PONG)`);
    console.log('[PASS] Database ping endpoint works with real-time latency measurement.');

    // 7. Verify Unauthenticated and Non-Admin access rejection
    console.log('\n--- Step 7: Testing Access Control & Security Guards ---');
    const unauthMonitor = await request('/api/admin/database/monitor');
    assert.strictEqual(unauthMonitor.status, 401, 'Unauthenticated request must return 401');

    const unauthPing = await request('/api/admin/database/ping', { method: 'POST' });
    assert.strictEqual(unauthPing.status, 401, 'Unauthenticated ping must return 401');
    console.log('[PASS] Unauthenticated access to database monitor is strictly blocked.');

    console.log('\n===============================================================');
    console.log('ALL VERIFICATION CHECKS PASSED (7/7)');
    console.log('Owner tiwariji0028@gmail.com is fully provisioned and authorized.');
    console.log('Database Monitor Module 17 is online and operational.');
    console.log('===============================================================');

  } finally {
    serverProc.kill();
  }
}

runVerification().catch(err => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});
