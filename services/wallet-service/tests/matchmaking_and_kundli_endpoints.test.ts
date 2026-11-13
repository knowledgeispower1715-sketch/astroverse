import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/server';

describe('Matchmaking and Kundli Gateway Endpoints', () => {
  let server: http.Server;
  let port: number;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('POST /api/matchmaking computes 36-guna synastry accurately', async () => {
    const payload = JSON.stringify({
      boy: {
        name: 'Rahul Sharma',
        dob: '1994-04-12T12:00:00',
        lat: 28.6139,
        lon: 77.2090,
        timezone: 'Asia/Kolkata'
      },
      girl: {
        name: 'Pooja Verma',
        dob: '1996-09-22T12:00:00',
        lat: 19.0760,
        lon: 72.8777,
        timezone: 'Asia/Kolkata'
      }
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/matchmaking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.status, 'SUCCESS');
    assert.strictEqual(typeof data.total_score, 'number');
    assert.ok(data.total_score >= 0 && data.total_score <= 36);
    assert.ok(data.ashtakoota_breakdown);
    assert.strictEqual(typeof data.ashtakoota_breakdown.varna.obtained, 'number');
    assert.strictEqual(typeof data.ashtakoota_breakdown.nadi.obtained, 'number');
    assert.strictEqual(typeof data.ashtakoota_breakdown.bhakoot.obtained, 'number');
    assert.ok(data.verdict);
    assert.ok(data.boy_profile.lagna);
    assert.ok(data.girl_profile.lagna);
  });

  it('POST /api/complete-kundli computes complete planetary chart accurately', async () => {
    const payload = JSON.stringify({
      name: 'Test Native',
      dob: '1995-05-15',
      tob: '14:30',
      lat: 28.6139,
      lon: 77.2090,
      timezone: 'Asia/Kolkata'
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/complete-kundli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.ok(data.d1_rashi_chart);
    assert.ok(data.d1_rashi_chart.lagna);
    assert.ok(data.d1_rashi_chart.planets.Sun);
    assert.ok(data.d1_rashi_chart.planets.Moon);
    assert.strictEqual(data.d1_rashi_chart.planets.Sun.house >= 1 && data.d1_rashi_chart.planets.Sun.house <= 12, true);
    assert.ok(data.vimshottari_dasha);
    assert.ok(data.vimshottari_dasha.active_now.maha_dasha);
  });
});
