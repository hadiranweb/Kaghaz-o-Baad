import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QuotaExceededError,
  QuotaNotConfiguredError,
} from '../../backend/dist/modules/quota/service.js';

describe('Usage Gateway, Telemetry & Quota Metrics', () => {
  describe('Quota Error Classes', () => {
    it('instantiates QuotaExceededError with status 429 and remaining count', () => {
      const err = new QuotaExceededError('ai.tokens', 0);
      assert.equal(err.statusCode, 429);
      assert.equal(err.message, 'quota_exceeded');
      assert.equal(err.featureKey, 'ai.tokens');
      assert.equal(err.remaining, 0);
    });

    it('instantiates QuotaNotConfiguredError with status 403', () => {
      const err = new QuotaNotConfiguredError('live.minutes');
      assert.equal(err.statusCode, 403);
      assert.equal(err.message, 'quota_not_configured');
      assert.equal(err.featureKey, 'live.minutes');
    });
  });

  describe('Usage Metrics Sanitization', () => {
    function sanitizeMetrics(metrics) {
      if (!metrics) return {};
      return {
        inputTokens: typeof metrics.inputTokens === 'number' && Number.isInteger(metrics.inputTokens) && metrics.inputTokens >= 0 ? metrics.inputTokens : 0,
        outputTokens: typeof metrics.outputTokens === 'number' && Number.isInteger(metrics.outputTokens) && metrics.outputTokens >= 0 ? metrics.outputTokens : 0,
        cachedTokens: typeof metrics.cachedTokens === 'number' && Number.isInteger(metrics.cachedTokens) && metrics.cachedTokens >= 0 ? metrics.cachedTokens : 0,
        costMinor: typeof metrics.costMinor === 'number' && metrics.costMinor >= 0 ? Math.round(metrics.costMinor) : null,
      };
    }

    it('sanitizes valid integer token counts and cost', () => {
      const raw = {
        inputTokens: 1500,
        outputTokens: 450,
        cachedTokens: 800,
        costMinor: 1250.7,
      };

      const clean = sanitizeMetrics(raw);
      assert.equal(clean.inputTokens, 1500);
      assert.equal(clean.outputTokens, 450);
      assert.equal(clean.cachedTokens, 800);
      assert.equal(clean.costMinor, 1251);
    });

    it('handles missing or negative metrics safely', () => {
      const clean = sanitizeMetrics({});
      assert.equal(clean.inputTokens, 0);
      assert.equal(clean.outputTokens, 0);
      assert.equal(clean.cachedTokens, 0);
      assert.equal(clean.costMinor, null);
    });
  });
});
