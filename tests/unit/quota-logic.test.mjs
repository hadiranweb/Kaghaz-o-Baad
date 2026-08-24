import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function periodStart(period, now = new Date()) {
  const value = new Date(now);
  if (period === 'daily') {
    value.setUTCHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    value.setUTCDate(1);
    value.setUTCHours(0, 0, 0, 0);
  } else {
    value.setTime(0);
  }
  return value;
}

function periodEnd(period, start) {
  if (period === 'daily') return new Date(start.getTime() + 86_400_000);
  if (period === 'monthly') return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return null;
}

describe('Quota Period Calculations', () => {
  it('calculates daily periodStart and periodEnd correctly', () => {
    const fixedNow = new Date('2026-08-24T14:30:45.000Z');
    const start = periodStart('daily', fixedNow);
    assert.equal(start.toISOString(), '2026-08-24T00:00:00.000Z');

    const end = periodEnd('daily', start);
    assert.equal(end.toISOString(), '2026-08-25T00:00:00.000Z');
  });

  it('calculates monthly periodStart and periodEnd correctly', () => {
    const fixedNow = new Date('2026-08-24T14:30:45.000Z');
    const start = periodStart('monthly', fixedNow);
    assert.equal(start.toISOString(), '2026-08-01T00:00:00.000Z');

    const end = periodEnd('monthly', start);
    assert.equal(end.toISOString(), '2026-09-01T00:00:00.000Z');
  });

  it('handles year rollover for monthly periods', () => {
    const fixedNow = new Date('2026-12-15T10:00:00.000Z');
    const start = periodStart('monthly', fixedNow);
    assert.equal(start.toISOString(), '2026-12-01T00:00:00.000Z');

    const end = periodEnd('monthly', start);
    assert.equal(end.toISOString(), '2027-01-01T00:00:00.000Z');
  });

  it('handles lifetime period correctly', () => {
    const fixedNow = new Date('2026-08-24T14:30:45.000Z');
    const start = periodStart('lifetime', fixedNow);
    assert.equal(start.toISOString(), '1970-01-01T00:00:00.000Z');

    const end = periodEnd('lifetime', start);
    assert.equal(end, null);
  });
});
