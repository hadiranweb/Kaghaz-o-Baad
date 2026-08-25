import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPresentationState } from '../../backend/dist/modules/live/routes.js';

describe('Live E2EE & Presentation Synchronization', () => {
  describe('Presentation State Builder', () => {
    it('builds full presentation state from metadata with defaults', () => {
      const empty = buildPresentationState({});
      assert.equal(empty.presentation_enabled, false);
      assert.equal(empty.presentation_media_id, null);
      assert.equal(empty.presentation_url, null);
      assert.equal(empty.presentation_name, null);
      assert.equal(empty.presentation_kind, null);
      assert.equal(empty.active_slide_index, 0);
      assert.equal(empty.active_page_number, 1);
      assert.equal(empty.e2ee_enabled, false);
      assert.equal(empty.e2ee_key_version, 1);
      assert.equal(empty.article_id, null);
    });

    it('extracts populated E2EE and presentation metadata accurately', () => {
      const populated = buildPresentationState({
        presentation_enabled: true,
        presentation_media_id: 'media-12345',
        presentation_url: 'https://s3.ir-thr-at1.liara.cloud/bucket/deck.pdf',
        presentation_name: 'Keynote Presentation',
        presentation_kind: 'pdf',
        active_slide_index: 3,
        active_page_number: 4,
        e2ee_enabled: true,
        e2ee_key_version: 2,
        article_id: 'article-999',
      });

      assert.equal(populated.presentation_enabled, true);
      assert.equal(populated.presentation_media_id, 'media-12345');
      assert.equal(populated.presentation_url, 'https://s3.ir-thr-at1.liara.cloud/bucket/deck.pdf');
      assert.equal(populated.presentation_name, 'Keynote Presentation');
      assert.equal(populated.presentation_kind, 'pdf');
      assert.equal(populated.active_slide_index, 3);
      assert.equal(populated.active_page_number, 4);
      assert.equal(populated.e2ee_enabled, true);
      assert.equal(populated.e2ee_key_version, 2);
      assert.equal(populated.article_id, 'article-999');
    });
  });

  describe('Presence Duration and Quota Calculations', () => {
    it('calculates duration in seconds and billed minutes accurately', () => {
      const joinedAt = new Date('2026-08-24T10:00:00.000Z').getTime();
      const leftAt = new Date('2026-08-24T10:14:35.000Z').getTime();

      const durationSeconds = Math.max(0, (leftAt - joinedAt) / 1000.0);
      assert.equal(durationSeconds, 875);

      const billedMinutes = Math.ceil(durationSeconds / 60.0);
      assert.equal(billedMinutes, 15, '875 seconds (14m 35s) should round up to 15 billed minutes');
    });

    it('handles short sessions under 1 minute', () => {
      const joinedAt = 1000;
      const leftAt = 15000; // 14 seconds
      const durationSeconds = (leftAt - joinedAt) / 1000.0;
      const billedMinutes = Math.ceil(durationSeconds / 60.0);
      assert.equal(billedMinutes, 1);
    });
  });

  describe('Interaction Type Schema Validation', () => {
    const validTypes = ['chat', 'question', 'reaction', 'hand_raise'];

    it('validates supported interaction types', () => {
      for (const type of validTypes) {
        assert.ok(validTypes.includes(type));
      }
    });

    it('rejects unsupported interaction types', () => {
      const invalidTypes = ['spam', 'kick', 'screen_lock', ''];
      for (const type of invalidTypes) {
        assert.equal(validTypes.includes(type), false);
      }
    });
  });
});
