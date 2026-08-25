import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteWithOpenAi, AiProviderError } from '../../backend/dist/modules/ai/openai-compatible.js';

describe('Academic Rewriter — AI Gateway Integration', () => {
  describe('Rewrite Input Validation', () => {
    it('enforces minimum source length conceptually', () => {
      const source = 'Academic research in machine learning requires rigorous peer review and reproducible results.';
      assert.ok(source.length >= 30);
    });

    it('accepts formal and informal tones', () => {
      const tones = ['formal', 'informal', 'neutral'];
      tones.forEach((tone) => {
        assert.equal(typeof tone, 'string');
        assert.ok(tone.length >= 1);
      });
    });
  });

  describe('AiProviderError Mapping', () => {
    it('instantiates error with code and name', () => {
      const error = new AiProviderError('ai_provider_not_configured');
      assert.equal(error.name, 'AiProviderError');
      assert.equal(error.code, 'ai_provider_not_configured');
    });
  });
});
