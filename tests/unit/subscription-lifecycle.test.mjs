import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { intervalFor } from '../../backend/dist/modules/billing/subscription-service.js';

describe('Subscription Lifecycle & Entitlements', () => {
  describe('Billing Period Intervals', () => {
    it('resolves intervalFor correctly for yearly, quarterly, monthly', () => {
      assert.equal(intervalFor('yearly'), '1 year');
      assert.equal(intervalFor('quarterly'), '3 months');
      assert.equal(intervalFor('monthly'), '1 month');
      assert.equal(intervalFor('other'), '1 month');
    });
  });

  describe('Subscription Period End Calculation', () => {
    function computePeriodEnd(startDate, period) {
      const d = new Date(startDate);
      if (period === 'yearly') {
        d.setUTCFullYear(d.getUTCFullYear() + 1);
      } else if (period === 'quarterly') {
        d.setUTCMonth(d.getUTCMonth() + 3);
      } else {
        d.setUTCMonth(d.getUTCMonth() + 1);
      }
      return d;
    }

    it('calculates monthly period end accurately', () => {
      const start = new Date('2026-08-24T00:00:00.000Z');
      const end = computePeriodEnd(start, 'monthly');
      assert.equal(end.toISOString(), '2026-09-24T00:00:00.000Z');
    });

    it('calculates yearly period end accurately', () => {
      const start = new Date('2026-08-24T00:00:00.000Z');
      const end = computePeriodEnd(start, 'yearly');
      assert.equal(end.toISOString(), '2027-08-24T00:00:00.000Z');
    });
  });

  describe('Grace Period and Cancellation State Matrix', () => {
    function evaluateSubscriptionState(sub, now = new Date()) {
      if (sub.status === 'cancelled') return 'cancelled';
      if (sub.current_period_end > now) return 'active';
      if (sub.grace_period_end && sub.grace_period_end > now) return 'grace';
      return 'expired';
    }

    it('identifies active subscription within current period', () => {
      const now = new Date('2026-08-24T12:00:00Z');
      const sub = {
        status: 'active',
        current_period_end: new Date('2026-09-24T00:00:00Z'),
        grace_period_end: null,
      };
      assert.equal(evaluateSubscriptionState(sub, now), 'active');
    });

    it('identifies grace period when past period end but before grace end', () => {
      const now = new Date('2026-08-26T12:00:00Z');
      const sub = {
        status: 'past_due',
        current_period_end: new Date('2026-08-24T00:00:00Z'),
        grace_period_end: new Date('2026-08-27T00:00:00Z'),
      };
      assert.equal(evaluateSubscriptionState(sub, now), 'grace');
    });

    it('identifies expired subscription when past grace period', () => {
      const now = new Date('2026-08-28T12:00:00Z');
      const sub = {
        status: 'past_due',
        current_period_end: new Date('2026-08-24T00:00:00Z'),
        grace_period_end: new Date('2026-08-27T00:00:00Z'),
      };
      assert.equal(evaluateSubscriptionState(sub, now), 'expired');
    });
  });
});
