/**
 * AstroVerse Mobile OS - Forensic Test Suite: Hourly Guidance & Hora Timers
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateHoraProgressMobile, getHoraCategoryAndColors } from '../src/utils/horaCalculation.ts';
import { Colors } from '../src/theme/colors.ts';

describe('HourlyGuidance Mobile Calculation Engine', () => {
  describe('calculateHoraProgressMobile()', () => {
    it('calculates correct progress percentage and remaining time at slot midpoint', () => {
      const start = 1_700_000_000_000;
      const end = 1_700_003_600_000; // 1 hour = 3600s
      const now = start + 1_800_000; // 30 min in (50%)

      const res = calculateHoraProgressMobile(now, start, end);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.progressPct, 50);
      assert.strictEqual(res.remainingSec, 1800);
      assert.strictEqual(res.timeStr, '30:00 remaining');
    });

    it('formats single-digit minutes and seconds with zero padding', () => {
      const start = 1_000_000;
      const end = 1_100_000; // 100s slot
      // 65s remaining -> 01:05
      const now65 = end - 65_000;
      const res65 = calculateHoraProgressMobile(now65, start, end);
      assert.strictEqual(res65.timeStr, '01:05 remaining');

      // 5s remaining -> 00:05
      const now5 = end - 5_000;
      const res5 = calculateHoraProgressMobile(now5, start, end);
      assert.strictEqual(res5.timeStr, '00:05 remaining');
    });

    it('handles exact start boundary without underflow', () => {
      const start = 2_000_000;
      const end = 2_100_000;
      const res = calculateHoraProgressMobile(start, start, end);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.progressPct, 0);
      assert.strictEqual(res.remainingSec, 100);
      assert.strictEqual(res.timeStr, '01:40 remaining');
    });

    it('clamps progress to 0% if current time is before start epoch', () => {
      const start = 2_000_000;
      const end = 2_100_000;
      const res = calculateHoraProgressMobile(start - 10_000, start, end);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.progressPct, 0);
      assert.strictEqual(res.remainingSec, 110);
    });

    it('clamps progress to 100% and remaining seconds to 0 when expired', () => {
      const start = 2_000_000;
      const end = 2_100_000;
      const res = calculateHoraProgressMobile(end + 15_000, start, end);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.progressPct, 100);
      assert.strictEqual(res.remainingSec, 0);
      assert.strictEqual(res.timeStr, '00:00 remaining');
    });

    it('gracefully handles missing, null, undefined, or NaN epochs', () => {
      const badInputs = [
        [null, null],
        [undefined, undefined],
        [NaN, 1000],
        [1000, NaN],
        [null, 2000],
        [1000, null]
      ];

      for (const [s, e] of badInputs) {
        const res = calculateHoraProgressMobile(Date.now(), s as any, e as any);
        assert.strictEqual(res.isValid, false);
        assert.strictEqual(res.progressPct, 0);
        assert.strictEqual(res.remainingSec, 0);
        assert.strictEqual(res.timeStr, '--:-- unavailable');
      }
    });

    it('rejects invalid or inverted epoch intervals (end <= start)', () => {
      const invertedRes = calculateHoraProgressMobile(1500, 2000, 1000);
      assert.strictEqual(invertedRes.isValid, false);
      assert.strictEqual(invertedRes.timeStr, '--:-- unavailable');

      const zeroRes = calculateHoraProgressMobile(1000, 1000, 1000);
      assert.strictEqual(zeroRes.isValid, false);
      assert.strictEqual(zeroRes.timeStr, '--:-- unavailable');
    });
  });

  describe('getHoraCategoryAndColors()', () => {
    it('classifies Jupiter, Venus, and Mercury as Favorable with success theme', () => {
      for (const planet of ['Jupiter', 'Venus', 'Mercury']) {
        const res = getHoraCategoryAndColors(planet);
        assert.strictEqual(res.label, 'Favorable');
        assert.strictEqual(res.color, Colors.success);
        assert.strictEqual(res.bg, Colors.successMuted);
      }
    });

    it('classifies Sun and Moon as Authoritative / Moderate with warning theme', () => {
      for (const planet of ['Sun', 'Moon']) {
        const res = getHoraCategoryAndColors(planet);
        assert.strictEqual(res.label, 'Authoritative / Moderate');
        assert.strictEqual(res.color, Colors.warning);
        assert.strictEqual(res.bg, Colors.goldMuted);
      }
    });

    it('classifies Mars, Saturn, Rahu, and Ketu as Caution with error theme', () => {
      for (const planet of ['Mars', 'Saturn', 'Rahu', 'Ketu']) {
        const res = getHoraCategoryAndColors(planet);
        assert.strictEqual(res.label, 'Caution');
        assert.strictEqual(res.color, Colors.error);
        assert.strictEqual(res.bg, Colors.maroonMuted);
      }
    });

    it('defaults gracefully to Sun when planet is omitted or undefined', () => {
      const res = getHoraCategoryAndColors(undefined);
      assert.strictEqual(res.label, 'Authoritative / Moderate');
      assert.strictEqual(res.color, Colors.warning);
    });
  });

  describe('Hora Expiration & Foreground Re-sync Invariants', () => {
    it('simulates single-trigger refresh lock upon expiry without duplicate firing', () => {
      let refreshCallCount = 0;
      let hasTriggeredExpiry = false;

      const onRefresh = () => {
        refreshCallCount++;
      };

      const simulateTick = (now: number, start: number, end: number) => {
        const res = calculateHoraProgressMobile(now, start, end);
        if (res.remainingSec <= 0 && !hasTriggeredExpiry) {
          hasTriggeredExpiry = true;
          onRefresh();
        }
      };

      const start = 1_000_000;
      const end = 1_060_000; // 60s

      // Tick before expiry
      simulateTick(end - 1000, start, end);
      assert.strictEqual(refreshCallCount, 0);

      // Tick at exact expiry
      simulateTick(end, start, end);
      assert.strictEqual(refreshCallCount, 1);

      // Subsequent ticks past expiry should not fire again
      simulateTick(end + 1000, start, end);
      simulateTick(end + 2000, start, end);
      assert.strictEqual(refreshCallCount, 1, 'Refresh should only be called once per expired slot');

      // Once new slot arrives, flag resets
      hasTriggeredExpiry = false;
      const nextStart = end;
      const nextEnd = end + 60_000;
      simulateTick(nextStart + 30_000, nextStart, nextEnd);
      assert.strictEqual(refreshCallCount, 1);
    });

    it('simulates foreground AppState resume calculating immediately without latency', () => {
      const start = 1_000_000;
      const end = 2_000_000;

      let currentTime = start + 200_000; // 20%
      let state = calculateHoraProgressMobile(currentTime, start, end);
      assert.strictEqual(state.progressPct, 20);

      // App goes to background for 500s then resumes
      currentTime += 500_000;
      // On resume, immediate recalculate:
      state = calculateHoraProgressMobile(currentTime, start, end);
      assert.strictEqual(state.progressPct, 70);
      assert.strictEqual(state.remainingSec, 300);
      assert.strictEqual(state.timeStr, '05:00 remaining');
    });
  });
});
