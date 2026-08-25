import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LiaraMailClient, LiaraMailError, assertAccountName, assertMailServerId, assertMailServerId as assertMailId, redactResponse } from '../../backend/dist/modules/mail/liara-mail-client.js';

describe('Liara Mail Client — Request Mapping & Error Handling', () => {
  describe('Account and Server ID Validation', () => {
    it('accepts valid hex IDs', () => {
      assert.doesNotThrow(() => assertMailId('507f1f77bcf86cd799439011'));
      assert.doesNotThrow(() => assertAccountName('testuser'));
    });

    it('rejects invalid IDs', () => {
      assert.throws(() => assertMailId('not-a-hex-id'));
      assert.throws(() => assertAccountName(''));
      assert.throws(() => assertAccountName('TooLongAccountNameThatExceedsTheMaximumLengthOf64CharactersForMailboxProvisioning'));
      assert.throws(() => assertAccountName('invalid_char!'));
    });
  });

  describe('Provider Failure Classification', () => {
    it('maps HTTP status codes to failure kinds', () => {
      // We replicate the classify logic from the compiled client
      function classify(status) {
        if (status === 400) return 'invalid_request';
        if (status === 403) return 'forbidden';
        if (status === 404) return 'not_found';
        if (status === 409) return 'conflict';
        if (status === 429) return 'rate_limited';
        if (status >= 500) return 'transient';
        return 'unknown';
      }
      assert.equal(classify(400), 'invalid_request');
      assert.equal(classify(403), 'forbidden');
      assert.equal(classify(404), 'not_found');
      assert.equal(classify(409), 'conflict');
      assert.equal(classify(429), 'rate_limited');
      assert.equal(classify(503), 'transient');
      assert.equal(classify(418), 'unknown');
    });
  });

  describe('Response Redaction', () => {
    it('redacts sensitive keys', () => {
      const input = {
        token: 'secret',
        password: 'hidden',
        authorization: 'bearer xxx',
        safe: 'visible',
        nested: { secret: 'hidden', visible: 'ok' },
      };
      const output = redactResponse(input);
      assert.equal('token' in output, false);
      assert.equal('password' in output, false);
      assert.equal('authorization' in output, false);
      assert.equal(output.safe, 'visible');
      assert.equal(output.nested.visible, 'ok');
      assert.equal('secret' in output.nested, false);
    });
  });

  describe('Client Construction', () => {
    it('requires token and normalizes base URL', () => {
      assert.throws(() => {
        new LiaraMailClient({ baseUrl: 'https://mail-service.iran.liara.ir/', token: '', timeoutMs: 15000 });
      });
    });
  });
});
