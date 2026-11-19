import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

// 1. Configure Environment BEFORE importing server
const TEST_PORT = 4998;
const MOCK_WALLET_PORT = 5001;
const TEST_INTERNAL_KEY = 'test_internal_key_consultation_2026';

process.env.PORT = String(TEST_PORT);
process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = TEST_INTERNAL_KEY;
process.env.ASTROVERSE_INTERNAL_KEY = TEST_INTERNAL_KEY;
process.env.WALLET_SERVICE_URL = `http://127.0.0.1:${MOCK_WALLET_PORT}`;
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000,https://astroverse-eta.vercel.app';

// 2. Import Consultation Service Components
import { io, httpServer, activeSessions, finalizeSession, ActiveConsultation, redis } from '../server';

describe('CONSULTATION SERVICE SECURITY & AUTHENTICATION TEST SUITE', () => {
  let mockWalletServer: http.Server;
  const capturedSettlementRequests: any[] = [];
  const openSockets: ClientSocket[] = [];

  function trackSocket(socket: ClientSocket): ClientSocket {
    openSockets.push(socket);
    return socket;
  }

  before(async () => {
    // A. Start Mock Wallet Service HTTP Server
    mockWalletServer = http.createServer((req, res) => {
      let rawBody = '';
      req.on('data', (chunk) => (rawBody += chunk));
      req.on('end', () => {
        let body: any = {};
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = rawBody;
        }

        // Endpoint 1: GET /api/user/me
        if (req.method === 'GET' && req.url === '/api/user/me') {
          const auth = req.headers['authorization'];
          if (auth === 'Bearer valid_mock_wallet_token_123') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id: 'usr_wallet_verified_1', email: 'verified@example.com' }));
            return;
          }
          // Reject forged / unverified tokens
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized credentials' }));
          return;
        }

        // Endpoint 2: POST /api/wallet/settle-consultation
        if (req.method === 'POST' && req.url === '/api/wallet/settle-consultation') {
          capturedSettlementRequests.push({
            method: req.method,
            path: req.url,
            headers: req.headers,
            body,
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', settled: true }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      });
    });

    await new Promise<void>((resolve) => {
      mockWalletServer.listen(MOCK_WALLET_PORT, '127.0.0.1', () => resolve());
    });
  });

  after(async () => {
    // Cleanup open client sockets
    for (const sock of openSockets) {
      if (sock.connected) sock.disconnect();
    }
    openSockets.length = 0;

    // Cleanup active consultation sessions & intervals
    for (const [, session] of activeSessions.entries()) {
      if (session.timerInterval) clearInterval(session.timerInterval);
    }
    activeSessions.clear();

    // Close servers
    io.close();
    httpServer.close();
    await new Promise<void>((resolve) => mockWalletServer.close(() => resolve()));

    try {
      redis.disconnect();
    } catch {}
  });

  afterEach(() => {
    // Clear active sessions after each test to avoid state pollution
    for (const [, session] of activeSessions.entries()) {
      if (session.timerInterval) clearInterval(session.timerInterval);
    }
    activeSessions.clear();
  });

  // =========================================================================
  // TEST 1: Unauthenticated Connection Rejection
  // =========================================================================
  it('1. Rejects unauthenticated connection with missing token', async () => {
    const client = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: {},
        transports: ['websocket', 'polling'],
        autoConnect: true,
      })
    );

    const err = await new Promise<Error>((resolve, reject) => {
      client.on('connect_error', (e) => resolve(e));
      client.on('connect', () => {
        client.disconnect();
        reject(new Error('Connection unexpectedly succeeded without auth token!'));
      });
    });

    assert.ok(err, 'Expected connect_error');
    assert.match(err.message, /Authentication token required/i);
    assert.strictEqual(client.connected, false);
  });

  // =========================================================================
  // TEST 2: Forged Unsigned JWT Rejection
  // =========================================================================
  it('2. Rejects forged unsigned JWT (alg: none or invalid signature)', async () => {
    const forgedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'victim_user_999', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const forgedToken = `${forgedHeader}.${forgedPayload}.fake_signature_exploit`;

    const client = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: { token: forgedToken },
        transports: ['websocket', 'polling'],
        autoConnect: true,
      })
    );

    const err = await new Promise<Error>((resolve, reject) => {
      client.on('connect_error', (e) => resolve(e));
      client.on('connect', () => {
        client.disconnect();
        reject(new Error('CRITICAL SECURITY FLAW: Forged JWT was accepted by server!'));
      });
    });

    assert.ok(err, 'Expected connect_error for forged JWT');
    assert.strictEqual(client.connected, false);
  });

  // =========================================================================
  // TEST 3: Rejection of test_token_ in Production
  // =========================================================================
  it('3. Rejects synthetic test_token_ in production environment (NODE_ENV=production)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const client = trackSocket(
        ioClient(`http://127.0.0.1:${TEST_PORT}`, {
          auth: { token: 'test_token_victim_user_001' },
          transports: ['websocket', 'polling'],
          autoConnect: true,
        })
      );

      const err = await new Promise<Error>((resolve, reject) => {
        client.on('connect_error', (e) => resolve(e));
        client.on('connect', () => {
          client.disconnect();
          reject(new Error('SECURITY FLAW: test_token_ bypassed authentication in production!'));
        });
      });

      assert.ok(err, 'Expected connect_error for test token in production');
      assert.strictEqual(client.connected, false);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // =========================================================================
  // TEST 4: Acceptance of Valid test_token_user_001 in Test Mode
  // =========================================================================
  it('4. Accepts valid test_token_user_001 in test environment (NODE_ENV=test)', async () => {
    assert.strictEqual(process.env.NODE_ENV, 'test');

    const client = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: { token: 'test_token_user_001' },
        transports: ['websocket', 'polling'],
        autoConnect: true,
      })
    );

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (err) => reject(new Error(`Failed to connect: ${err.message}`)));
    });

    assert.strictEqual(client.connected, true);
    client.disconnect();
  });

  // =========================================================================
  // TEST 5: Unauthorized CORS Origin Connection Rejection
  // =========================================================================
  it('5. Rejects connection from unauthorized CORS origin (http://evil-attacker-site.com)', async () => {
    // 5a. Unauthorized origin request
    const unauthorizedRes = await new Promise<{ status: number; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${TEST_PORT}/socket.io/?EIO=4&transport=polling`,
        {
          method: 'GET',
          headers: {
            Origin: 'http://evil-attacker-site.com',
          },
        },
        (res) => resolve({ status: res.statusCode || 500, headers: res.headers })
      );
      req.on('error', reject);
      req.end();
    });

    assert.strictEqual(unauthorizedRes.status, 400);
    assert.strictEqual(unauthorizedRes.headers['access-control-allow-origin'], undefined);

    // 5b. Authorized origin request
    const authorizedRes = await new Promise<{ status: number; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${TEST_PORT}/socket.io/?EIO=4&transport=polling`,
        {
          method: 'GET',
          headers: {
            Origin: 'http://localhost:3000',
          },
        },
        (res) => resolve({ status: res.statusCode || 500, headers: res.headers })
      );
      req.on('error', reject);
      req.end();
    });

    assert.strictEqual(authorizedRes.status, 200);
    assert.strictEqual(authorizedRes.headers['access-control-allow-origin'], 'http://localhost:3000');
  });

  // =========================================================================
  // TEST 6: IDOR Prevention on start_consultation
  // =========================================================================
  it('6. Prevents IDOR by rejecting start_consultation when userId differs from authenticated token', async () => {
    const client = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: { token: 'test_token_alice_001' },
        transports: ['websocket', 'polling'],
      })
    );

    await new Promise<void>((resolve) => client.on('connect', () => resolve()));

    const errorPromise = new Promise<{ code: string; message: string }>((resolve) => {
      client.on('error', (err) => resolve(err));
    });

    client.emit('start_consultation', {
      sessionId: 'session_idor_test_001',
      userId: 'bob_002', // Mismatch from authenticated 'alice_001'
      astrologerId: 'astro_sage_1',
      ratePerMinute: 25,
    });

    const err = await errorPromise;
    assert.strictEqual(err.code, 'FORBIDDEN');
    assert.match(err.message, /Cannot initiate consultation session on behalf of another user/i);
    assert.strictEqual(activeSessions.has('session_idor_test_001'), false);

    client.disconnect();
  });

  // =========================================================================
  // TEST 7: Invalid ratePerMinute Rejection (zero, negative, NaN)
  // =========================================================================
  it('7. Rejects start_consultation with invalid ratePerMinute (zero, negative, NaN)', async () => {
    const client = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: { token: 'test_token_rate_tester' },
        transports: ['websocket', 'polling'],
      })
    );

    await new Promise<void>((resolve) => client.on('connect', () => resolve()));

    const testInvalidRate = async (rate: any, sessId: string) => {
      const errorPromise = new Promise<{ code: string; message: string }>((resolve) => {
        client.once('error', (err) => resolve(err));
      });

      client.emit('start_consultation', {
        sessionId: sessId,
        userId: 'rate_tester',
        astrologerId: 'astro_sage_1',
        ratePerMinute: rate,
      });

      const err = await errorPromise;
      assert.strictEqual(err.code, 'INVALID_PAYLOAD');
      assert.strictEqual(activeSessions.has(sessId), false);
    };

    await testInvalidRate(0, 'sess_zero_rate');
    await testInvalidRate(-15, 'sess_negative_rate');
    await testInvalidRate(NaN, 'sess_nan_rate');

    client.disconnect();
  });

  // =========================================================================
  // TEST 8: Cross-User end_consultation Rejection (FORBIDDEN)
  // =========================================================================
  it('8. Rejects cross-user end_consultation with FORBIDDEN', async () => {
    const clientAlice = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: { token: 'test_token_alice_owner' },
        transports: ['websocket', 'polling'],
      })
    );
    await new Promise<void>((resolve) => clientAlice.on('connect', () => resolve()));

    const sessId = 'session_alice_active_8';
    const startPromise = new Promise<void>((resolve) => {
      clientAlice.on('session_active', () => resolve());
    });

    clientAlice.emit('start_consultation', {
      sessionId: sessId,
      userId: 'alice_owner',
      astrologerId: 'astro_sage_1',
      ratePerMinute: 20,
    });
    await startPromise;
    assert.strictEqual(activeSessions.has(sessId), true);

    // Bob connects and attempts to terminate Alice's session
    const clientBob = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: { token: 'test_token_bob_attacker' },
        transports: ['websocket', 'polling'],
      })
    );
    await new Promise<void>((resolve) => clientBob.on('connect', () => resolve()));

    const bobErrorPromise = new Promise<{ code: string; message: string }>((resolve) => {
      clientBob.on('error', (err) => resolve(err));
    });

    clientBob.emit('end_consultation', { sessionId: sessId });
    const bobErr = await bobErrorPromise;

    assert.strictEqual(bobErr.code, 'FORBIDDEN');
    assert.match(bobErr.message, /Cannot end session belonging to another user/i);

    // Verify session remains active
    assert.strictEqual(activeSessions.has(sessId), true);

    // Alice terminates her own session cleanly
    const callEndedPromise = new Promise<void>((resolve) => {
      clientAlice.on('call_ended', () => resolve());
    });
    clientAlice.emit('end_consultation', { sessionId: sessId });
    await callEndedPromise;

    assert.strictEqual(activeSessions.has(sessId), false);

    clientAlice.disconnect();
    clientBob.disconnect();
  });

  // =========================================================================
  // TEST 9: Disconnect Lifecycle: Timer Intervals Cleared and Session Removed
  // =========================================================================
  it('9. Clears timer intervals and removes session upon socket disconnect', async () => {
    const client = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: { token: 'test_token_disconnect_user' },
        transports: ['websocket', 'polling'],
      })
    );
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));

    const sessId = 'session_disconnect_lifecycle_9';
    const startPromise = new Promise<void>((resolve) => {
      client.on('session_active', () => resolve());
    });

    client.emit('start_consultation', {
      sessionId: sessId,
      userId: 'disconnect_user',
      astrologerId: 'astro_sage_1',
      ratePerMinute: 25,
    });
    await startPromise;

    const session = activeSessions.get(sessId);
    assert.ok(session, 'Session must exist in activeSessions');
    assert.ok(session.timerInterval, 'Timer interval must be running');
    const timer = session.timerInterval;

    // Disconnect socket abruptly
    client.disconnect();

    // Allow disconnect event loop propagation
    await new Promise((r) => setTimeout(r, 100));

    assert.strictEqual(activeSessions.has(sessId), false, 'Session must be deleted from activeSessions');
    assert.strictEqual((timer as any)?._destroyed, true, 'Timer interval must be cleared via clearInterval');
  });

  // =========================================================================
  // TEST 10: Duplicate Session Handling: Prevents Timer Leaks
  // =========================================================================
  it('10. Prevents timer interval leaks on duplicate start_consultation invocations', async () => {
    const client = trackSocket(
      ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        auth: { token: 'test_token_dup_user' },
        transports: ['websocket', 'polling'],
      })
    );
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));

    const sessId = 'session_duplicate_test_10';

    // First start_consultation invocation
    let activePromise = new Promise<void>((resolve) => {
      client.once('session_active', () => resolve());
    });
    client.emit('start_consultation', {
      sessionId: sessId,
      userId: 'dup_user',
      astrologerId: 'astro_sage_1',
      ratePerMinute: 20,
    });
    await activePromise;

    const firstSession = activeSessions.get(sessId);
    assert.ok(firstSession, 'First session created');
    const firstTimer = firstSession.timerInterval;
    assert.ok(firstTimer, 'First timer interval active');

    // Duplicate start_consultation invocation with identical sessionId
    const duplicateOutcome = new Promise<string>((resolve) => {
      client.once('session_active', () => resolve('active'));
      client.once('error', (err) => resolve(`error:${err.code}`));
    });

    client.emit('start_consultation', {
      sessionId: sessId,
      userId: 'dup_user',
      astrologerId: 'astro_sage_1',
      ratePerMinute: 20,
    });

    const outcome = await duplicateOutcome;

    // Verify no timer is leaked:
    // If the server replaces the session, the prior timer MUST be cleared.
    // If the server rejects duplicate starts, it emits an error without overwriting.
    if (outcome.startsWith('error:')) {
      assert.match(outcome, /SESSION_ALREADY_ACTIVE/);
    } else {
      assert.strictEqual(
        (firstTimer as any)?._destroyed,
        true,
        'Prior timer interval must be destroyed/cleared when session is overwritten!'
      );
    }

    client.disconnect();
  });

  // =========================================================================
  // TEST 11: FinalizeSession Transmits X-Internal-Service-Key Header
  // =========================================================================
  it('11. Transmits X-Internal-Service-Key header and payload when finalising billable session', async () => {
    capturedSettlementRequests.length = 0;

    const mockSession: ActiveConsultation = {
      sessionId: 'session_settlement_test_11',
      userId: 'usr_settle_verified',
      astrologerId: 'astro_master_key',
      ratePerMinute: 30,
      minutesConsumed: 5,
      socketId: 'mock_socket_11',
    };

    await finalizeSession(mockSession);

    assert.strictEqual(capturedSettlementRequests.length, 1, 'Settlement HTTP request must be sent to wallet service');
    const captured = capturedSettlementRequests[0];

    assert.strictEqual(captured.method, 'POST');
    assert.strictEqual(captured.path, '/api/wallet/settle-consultation');

    // Verify internal service keys transmitted in headers
    assert.strictEqual(captured.headers['x-internal-service-key'], TEST_INTERNAL_KEY);
    assert.strictEqual(captured.headers['x-astroverse-internal-key'], TEST_INTERNAL_KEY);

    // Verify settlement payload metrics
    assert.strictEqual(captured.body.sessionId, 'session_settlement_test_11');
    assert.strictEqual(captured.body.userId, 'usr_settle_verified');
    assert.strictEqual(captured.body.astrologerId, 'astro_master_key');
    assert.strictEqual(captured.body.durationMinutes, 5);
    assert.strictEqual(captured.body.durationSeconds, 300);
    assert.strictEqual(captured.body.totalDeduction, 150);
    assert.strictEqual(captured.body.amount, 150);
  });
});
