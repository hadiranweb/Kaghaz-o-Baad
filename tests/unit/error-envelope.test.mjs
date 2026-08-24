import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Error Envelope & Response Standards', () => {
  it('formats standard error payloads consistently', () => {
    function formatError(error, requestId, details) {
      const payload = { error };
      if (requestId) payload.requestId = requestId;
      if (details) payload.details = details;
      return payload;
    }

    const simple = formatError('unauthorized');
    assert.deepEqual(simple, { error: 'unauthorized' });

    const withReq = formatError('invalid_input', 'req-12345');
    assert.deepEqual(withReq, { error: 'invalid_input', requestId: 'req-12345' });

    const withDetails = formatError('invalid_input', 'req-12345', { field: 'email is required' });
    assert.deepEqual(withDetails, {
      error: 'invalid_input',
      requestId: 'req-12345',
      details: { field: 'email is required' },
    });
  });

  it('validates request-id resolution logic', () => {
    function resolveRequestId(headerValue, fallbackId) {
      return typeof headerValue === 'string' && headerValue.trim().length > 0 && headerValue.length <= 200
        ? headerValue.trim()
        : fallbackId;
    }

    assert.equal(resolveRequestId('custom-request-id-123', 'fallback-id'), 'custom-request-id-123');
    assert.equal(resolveRequestId('', 'fallback-id'), 'fallback-id');
    assert.equal(resolveRequestId(null, 'fallback-id'), 'fallback-id');
    assert.equal(resolveRequestId(undefined, 'fallback-id'), 'fallback-id');
    assert.equal(resolveRequestId('a'.repeat(250), 'fallback-id'), 'fallback-id');
  });
});
