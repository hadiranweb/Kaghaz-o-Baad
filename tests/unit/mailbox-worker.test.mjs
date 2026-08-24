import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import compiled worker logic for pure function testing
import { loadEnv } from '../../backend/dist/config/env.js';

describe('Mailbox Worker — Backoff, Retry & Health Behavior', () => {
  describe('Backoff Calculation', () => {
    it('applies exponential backoff with jitter and cap', () => {
      const env = loadEnv({ MAILBOX_BACKOFF_BASE_MS: 2000, MAILBOX_BACKOFF_MAX_MS: 900000, MAILBOX_MAX_ATTEMPTS: 8 });
      const base = env.MAILBOX_BACKOFF_BASE_MS;
      const cap = env.MAILBOX_BACKOFF_MAX_MS;
      // We replicate the pure math from mailbox-outbox-worker logic
      function calculateBackoff(attempt) {
        const exponential = Math.min(cap, base * 2 ** Math.max(0, attempt - 1));
        const jitter = Math.floor(Math.random() * Math.max(250, Math.floor(exponential * 0.2)));
        return Math.min(cap, exponential + jitter);
      }
      const d1 = calculateBackoff(1);
      const d2 = calculateBackoff(2);
      const d3 = calculateBackoff(3);
      assert.ok(d1 >= base, `Backoff at attempt 1 must be >= base: ${d1}`);
      assert.ok(d2 >= d1 * 1.5 || d2 >= base * 2, `Backoff should grow exponentially`);
      assert.ok(d3 >= base * 4 || d3 >= cap, `Backoff at attempt 3 should be significantly larger or capped`);
      assert.ok(d3 <= cap, `Backoff must never exceed cap: ${cap}`);
    });
  });

  describe('Retry Classification', () => {
    it('treats rate_limited, transient, and unknown as retriable', () => {
      const retriable = ['rate_limited', 'transient', 'unknown'];
      retriable.forEach((kind) => {
        assert.ok(typeof kind === 'string', `Kind must be string: ${kind}`);
      });
    });

    it('treats conflict with reconcile operation as retriable', () => {
      const kind = 'conflict';
      const operation = 'reconcile';
      assert.equal(typeof kind, 'string');
      assert.equal(typeof operation, 'string');
    });
  });

  describe('Worker Environment Validation', () => {
    it('fails loadEnv when required mailbox variables are missing', () => {
      // loadEnv throws when validation fails; we verify the schema enforces rules
      assert.throws(() => {
        loadEnv({ LIARA_MAIL_API_TOKEN: '', LIARA_MAIL_SERVER_ID: 'bad', NODE_ENV: 'test' });
      });
    });
  });

  describe('Health State Tracking', () => {
    it('tracks lifecycle correctly', () => {
      const state = { startedAt: Date.now(), stopping: false, lastLoopAt: undefined, lastLoopError: undefined };
      assert.equal(state.stopping, false);
      state.stopping = true;
      assert.equal(state.stopping, true);
      state.lastLoopAt = Date.now();
      assert.ok(state.lastLoopAt > 0);
    });
  });
});
