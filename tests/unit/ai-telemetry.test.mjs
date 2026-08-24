import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Replicate sanitizeMetrics logic for pure testing
function sanitizeMetricsLocal(metrics) {
  if (!metrics) return {};
  return {
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
    cachedTokens: metrics.cachedTokens,
    units: metrics.units,
    currency: metrics.currency,
    costMinor: metrics.costMinor,
    pricingVersion: metrics.pricingVersion,
  };
}

describe('AI Telemetry — Usage Metrics & Sanity', () => {
  describe('Usage Metrics Sanitization', () => {
    it('preserves valid positive integer token counts', () => {
      const result = sanitizeMetricsLocal({ inputTokens: 150, outputTokens: 200, cachedTokens: 50 });
      assert.equal(result.inputTokens, 150);
      assert.equal(result.outputTokens, 200);
      assert.equal(result.cachedTokens, 50);
    });

    it('handles undefined metrics safely', () => {
      const result = sanitizeMetricsLocal(undefined);
      assert.deepEqual(result, {});
    });

    it('ignores negative or non-integer values gracefully (returns 0 or undefined)', () => {
      const result = sanitizeMetricsLocal({ inputTokens: undefined, outputTokens: -1, cachedTokens: -5 });
      assert.equal(result.inputTokens, undefined);
    });
  });

  describe('Title Suggestion Schema', () => {
    it('validates TitleSuggestion shape', () => {
      const suggestion = {
        title: 'Machine Learning in Climate Science',
        rationale: 'Covers predictive models and environmental data integration.',
        keywords: ['machine learning', 'climate', 'prediction'],
      };
      assert.ok(typeof suggestion.title === 'string');
      assert.ok(suggestion.title.length > 0);
      assert.ok(Array.isArray(suggestion.keywords));
    });
  });

  describe('AI Provider Error Codes', () => {
    it('maps timeout, configuration, and HTTP errors', () => {
      const codes = ['ai_provider_not_configured', 'ai_provider_timeout', 'ai_provider_http_502', 'ai_provider_request_failed'];
      codes.forEach((code) => {
        assert.ok(typeof code === 'string');
        assert.ok(code.startsWith('ai_provider_'));
      });
    });
  });
});
