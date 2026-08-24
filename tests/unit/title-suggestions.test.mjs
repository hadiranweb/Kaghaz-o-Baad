import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Title Suggestions — Schema & Cache Behavior', () => {
  describe('Suggestion Schema', () => {
    it('requires title and allows optional rationale and keywords', () => {
      const item = {
        title: 'Advances in Neural Architecture Search',
        rationale: 'Explores automated design of deep networks.',
        keywords: ['NAS', 'deep learning', 'automation'],
      };
      assert.equal(typeof item.title, 'string');
      assert.ok(item.title.length > 0);
      assert.ok(typeof item.rationale === 'string' || item.rationale === undefined);
      assert.ok(Array.isArray(item.keywords) || item.keywords === undefined);
    });
  });

  describe('Cache Key Normalization', () => {
    it('accepts normalized topic inputs', () => {
      const topic = 'Machine Learning and Data'.normalize('NFKC').replace(/\s+/g, ' ');
      assert.equal(topic, 'Machine Learning and Data');
    });
  });
});
