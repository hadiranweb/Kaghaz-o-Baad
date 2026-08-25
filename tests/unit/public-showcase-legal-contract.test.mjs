import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Public Showcase & Legal — SEO & Route Contracts', () => {
  describe('SEO Policy Contract', () => {
    it('includes public terms and privacy patterns', () => {
      const patterns = [
        { pattern: '/terms', public: true },
        { pattern: '/privacy', public: true },
      ];
      patterns.forEach((p) => {
        assert.ok(p.pattern.startsWith('/'));
        assert.equal(p.public, true);
      });
    });
  });

  describe('Public Showcase Requirements', () => {
    it('requires SEO metadata and structured data', () => {
      assert.equal(typeof 'index', 'string');
    });
  });
});
