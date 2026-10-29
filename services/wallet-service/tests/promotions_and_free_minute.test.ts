import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server';
import http from 'http';
import { db, ConsultationSessionStatus, Role, AccountStatus } from '../src/db';
import { ACTIVE_PROMOTIONAL_OFFER } from '../src/monetization/promotions';
import { AI_CONSULTATION_SERVICE } from '../src/monetization/catalog';

let server: http.Server;
let baseUrl: string;

test.before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

test('ASTROVERSE PROMOTIONS, FREE MINUTE & CONSULTATION BILLING TEST SUITE', async (t) => {

  await t.test('1. GET /api/promotions/active returns authoritative offer configuration', async () => {
    const res = await fetch(`${baseUrl}/api/promotions/active`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.success, true);
    assert.equal(data.isEligible, true);
    assert.ok(data.offer);
    assert.equal(data.offer.id, ACTIVE_PROMOTIONAL_OFFER.id);
    assert.equal(data.offer.freeAllowanceSeconds, 60);
    assert.equal(data.offer.postFreeRateRupeesPerMinute, 15.00);
    assert.ok(data.offer.bannerCopy.headline.includes('60 Seconds Free'));
    assert.ok(data.offer.bannerCopyHi.headline.includes('निःशुल्क'));
  });

  await t.test('2. POST /api/consultation/start-session grants atomic 60-second free minute to new guest', async () => {
    const guestTrialId = `test_guest_${Date.now()}_1`;
    const beforeStart = Date.now();

    const res = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'acharya-devratan',
        astrologerName: 'Acharya Devratan',
        guestTrialId
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.isNew, true);
    assert.equal(data.remainingFreeSeconds, 60);

    const session = data.session;
    assert.ok(session.id.startsWith('cs_'));
    assert.equal(session.personaId, 'acharya-devratan');
    assert.equal(session.status, ConsultationSessionStatus.FREE_ACTIVE);
    assert.equal(session.isFreeMinuteGranted, true);
    assert.equal(session.freeAllowanceSeconds, 60);
    assert.equal(session.ratePerMinute, 15.00);

    const deadlineMs = new Date(session.freeDeadline).getTime();
    const diffSeconds = Math.round((deadlineMs - beforeStart) / 1000);
    assert.ok(diffSeconds >= 59 && diffSeconds <= 61, `Deadline should be ~60s in future, got ${diffSeconds}s`);
  });

  await t.test('3. Starting a session again while active is idempotent and returns existing session', async () => {
    const guestTrialId = `test_guest_${Date.now()}_idempotent`;

    const res1 = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'dr-sunita-shastri',
        astrologerName: 'Dr. Sunita Shastri',
        guestTrialId
      })
    });
    const data1 = await res1.json();
    assert.equal(data1.isNew, true);

    const res2 = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'dr-sunita-shastri',
        astrologerName: 'Dr. Sunita Shastri',
        guestTrialId
      })
    });
    const data2 = await res2.json();
    assert.equal(data2.isNew, false);
    assert.equal(data2.session.id, data1.session.id);
    assert.equal(data2.session.freeDeadline, data1.session.freeDeadline);
  });

  await t.test('4. GET /api/consultation/session/:sessionId returns live server-authoritative timer', async () => {
    const guestTrialId = `test_guest_${Date.now()}_timer`;

    const startRes = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'pandit-raghavendra',
        astrologerName: 'Pandit Raghavendra',
        guestTrialId
      })
    });
    const startData = await startRes.json();
    const sessionId = startData.session.id;

    const checkRes = await fetch(`${baseUrl}/api/consultation/session/${sessionId}?guestTrialId=${guestTrialId}`);
    assert.equal(checkRes.status, 200);
    const checkData = await checkRes.json();

    assert.equal(checkData.success, true);
    assert.equal(checkData.session.id, sessionId);
    assert.equal(checkData.isFreeActive, true);
    assert.equal(checkData.isExpired, false);
    assert.ok(checkData.remainingFreeSeconds > 0 && checkData.remainingFreeSeconds <= 60);
    assert.equal(checkData.ratePerMinuteRupees, 15.00);
  });

  await t.test('5. In-flight protection: Query during FREE_ACTIVE succeeds and returns chart-grounded answer', async () => {
    const guestTrialId = `test_guest_${Date.now()}_inflight`;

    const startRes = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'acharya-devratan',
        astrologerName: 'Acharya Devratan',
        guestTrialId
      })
    });
    const startData = await startRes.json();
    const sessionId = startData.session.id;

    const askRes = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        question: 'What is my career direction for Scorpio Lagna?',
        dob: '2005-08-20T14:05:00',
        lat: 23.1686,
        lon: 79.9534,
        timezone: 'Asia/Kolkata',
        astrologer_name: 'Acharya Devratan',
        lang: 'en'
      })
    });

    assert.equal(askRes.status, 200);
    const askData = await askRes.json();
    assert.equal(askData.sessionId, sessionId);
    assert.ok(askData.message.length > 50);
    assert.ok(askData.message.includes('Scorpio') || askData.message.includes('Career') || askData.message.includes('Lagna'));
  });

  await t.test('6. Expired session: Automatic transition to FREE_EXHAUSTED and 402 rejection for unpaid query', async () => {
    const guestTrialId = `test_guest_${Date.now()}_expired`;

    const startRes = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'acharya-devratan',
        astrologerName: 'Acharya Devratan',
        guestTrialId
      })
    });
    const startData = await startRes.json();
    const sessionId = startData.session.id;

    // Simulate deadline passing by manually adjusting session record in db
    const rawSession = (db as any).data.consultationSessions.find((cs: any) => cs.id === sessionId);
    assert.ok(rawSession);
    rawSession.freeDeadline = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago

    // Check session updates to FREE_EXHAUSTED
    const checkRes = await fetch(`${baseUrl}/api/consultation/session/${sessionId}?guestTrialId=${guestTrialId}`);
    assert.equal(checkRes.status, 200);
    const checkData = await checkRes.json();
    assert.equal(checkData.isExpired, true);
    assert.equal(checkData.isFreeActive, false);
    assert.equal(checkData.remainingFreeSeconds, 0);
    assert.equal(checkData.session.status, ConsultationSessionStatus.FREE_EXHAUSTED);

    // Subsequent question should now fail with 402 FREE_TRIAL_EXHAUSTED
    const askRes = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        question: 'Can I ask another question after free minute?',
        dob: '2005-08-20T14:05:00',
        lat: 23.1686,
        lon: 79.9534,
        timezone: 'Asia/Kolkata',
        astrologer_name: 'Acharya Devratan'
      })
    });

    assert.equal(askRes.status, 402);
    const errData = await askRes.json();
    assert.equal(errData.error, 'FREE_TRIAL_EXHAUSTED');
    assert.equal(errData.sessionId, sessionId);
    assert.equal(errData.ratePerMinuteRupees, 15.00);
    assert.equal(errData.continuationRequired, true);
  });

  await t.test('7. Insufficient balance: continue-paid fails with 402 and prompts for recharge', async () => {
    // Create registered user with 0 balance
    const testEmail = `zero_user_${Date.now()}@example.com`;
    const user = await db.createUser({
      email: testEmail,
      displayName: 'Zero Balance User',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });
    user.walletBalance = 0;

    const startRes = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'dr-sunita-shastri',
        astrologerName: 'Dr. Sunita Shastri',
        guestTrialId: user.id
      })
    });
    const startData = await startRes.json();
    const sessionId = startData.session.id;

    // Simulate expiry
    const rawSession = (db as any).data.consultationSessions.find((cs: any) => cs.id === sessionId);
    rawSession.freeDeadline = new Date(Date.now() - 2000).toISOString();

    // Attempt paid continuation with zero balance
    const payRes = await fetch(`${baseUrl}/api/consultation/continue-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        guestTrialId: user.id,
        paymentMethod: 'REAL_WALLET'
      })
    });

    assert.equal(payRes.status, 402);
    const payErr = await payRes.json();
    assert.equal(payErr.error, 'INSUFFICIENT_WALLET_BALANCE');
    assert.equal(payErr.requiredAmount, 15.00);
    assert.equal(payErr.currentBalance, 0);
    assert.equal(payErr.rechargeRequired, true);
  });

  await t.test('8. Paid continuation: Debits wallet ₹15, transitions to PAID_ACTIVE, enables subsequent turns', async () => {
    // Create registered user with ₹50 balance
    const testEmail = `funded_user_${Date.now()}@example.com`;
    const user = await db.createUser({
      email: testEmail,
      displayName: 'Funded User',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });
    user.walletBalance = 50.00;

    const startRes = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'pandit-raghavendra',
        astrologerName: 'Pandit Raghavendra',
        guestTrialId: user.id
      })
    });
    const startData = await startRes.json();
    const sessionId = startData.session.id;

    // Simulate expiry
    const rawSession = (db as any).data.consultationSessions.find((cs: any) => cs.id === sessionId);
    rawSession.freeDeadline = new Date(Date.now() - 2000).toISOString();

    // Explicit continuation consent
    const payRes = await fetch(`${baseUrl}/api/consultation/continue-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        guestTrialId: user.id,
        paymentMethod: 'REAL_WALLET'
      })
    });

    assert.equal(payRes.status, 200);
    const payData = await payRes.json();
    assert.equal(payData.success, true);
    assert.equal(payData.session.status, ConsultationSessionStatus.PAID_ACTIVE);
    assert.equal(payData.newBalance, 35.00); // 50.00 - 15.00
    assert.equal(payData.paidMinutesConsumed, 1);

    // Verify ledger entry
    const ledger = (db as any).data.walletLedgers.find((l: any) => l.referenceId === sessionId);
    assert.ok(ledger);
    assert.equal(ledger.amount, -15.00);
    assert.ok(ledger.description.includes('AI Astrologer consultation'));

    // Subsequent question should now succeed
    const askRes = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        question: 'Explain Raja Yogas in my chart',
        dob: '2005-08-20T14:05:00',
        lat: 23.1686,
        lon: 79.9534,
        timezone: 'Asia/Kolkata',
        astrologer_name: 'Pandit Raghavendra'
      })
    });

    assert.equal(askRes.status, 200);
    const askData = await askRes.json();
    assert.equal(askData.sessionId, sessionId);
    assert.equal(askData.sessionStatus, ConsultationSessionStatus.PAID_ACTIVE);
  });

  await t.test('9. Anti-tampering & session isolation: Cross-user access rejected with 403', async () => {
    const ownerId = `owner_${Date.now()}`;
    const attackerId = `attacker_${Date.now()}`;

    const startRes = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'acharya-devratan',
        astrologerName: 'Acharya Devratan',
        guestTrialId: ownerId
      })
    });
    const startData = await startRes.json();
    const sessionId = startData.session.id;

    // Attacker tries to modify or access session
    const checkRes = await fetch(`${baseUrl}/api/consultation/session/${sessionId}?guestTrialId=${attackerId}`);
    assert.equal(checkRes.status, 403);
    const checkErr = await checkRes.json();
    assert.equal(checkErr.error, 'FORBIDDEN_SESSION_ACCESS');
  });

  await t.test('10. Second session abuse prevention: Consumed free minute cannot be recycled', async () => {
    const userEmail = `recycle_user_${Date.now()}@example.com`;
    const user = await db.createUser({
      email: userEmail,
      displayName: 'Recycle Prevention User',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });
    user.freeMinuteConsumed = true; // User already consumed their promotional minute

    // Banner check reports not eligible
    const promoRes = await fetch(`${baseUrl}/api/promotions/active?guestTrialId=${user.id}`);
    const promoData = await promoRes.json();
    assert.equal(promoData.isEligible, false);

    // Starting new session does NOT grant free minute
    const startRes = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'acharya-devratan',
        astrologerName: 'Acharya Devratan',
        guestTrialId: user.id
      })
    });

    const startData = await startRes.json();
    assert.equal(startData.session.isFreeMinuteGranted, false);
    assert.equal(startData.remainingFreeSeconds, 0);
    assert.equal(startData.session.status, ConsultationSessionStatus.PAID_CONFIRMATION_PENDING);
  });

  await t.test('11. POST /api/consultation/end-session marks session as COMPLETED', async () => {
    const guestTrialId = `test_guest_${Date.now()}_end`;

    const startRes = await fetch(`${baseUrl}/api/consultation/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'acharya-devratan',
        astrologerName: 'Acharya Devratan',
        guestTrialId
      })
    });
    const startData = await startRes.json();
    const sessionId = startData.session.id;

    const endRes = await fetch(`${baseUrl}/api/consultation/end-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        guestTrialId
      })
    });

    assert.equal(endRes.status, 200);
    const endData = await endRes.json();
    assert.equal(endData.success, true);
    assert.equal(endData.session.status, ConsultationSessionStatus.COMPLETED);
  });
});
