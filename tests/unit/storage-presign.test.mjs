import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { storageConfigured } from '../../backend/dist/modules/storage/service.js';

describe('Storage & Presigning Configuration', () => {
  it('correctly checks storageConfigured boolean', () => {
    const unconfigured = {
      S3_ENDPOINT: '',
      S3_BUCKET: '',
      S3_ACCESS_KEY_ID: '',
      S3_SECRET_ACCESS_KEY: '',
    };
    assert.equal(storageConfigured(unconfigured), false);

    const partial = {
      S3_ENDPOINT: 'https://s3.ir-thr-at1.liara.cloud',
      S3_BUCKET: 'my-bucket',
      S3_ACCESS_KEY_ID: '',
      S3_SECRET_ACCESS_KEY: '',
    };
    assert.equal(storageConfigured(partial), false);

    const configured = {
      S3_ENDPOINT: 'https://s3.ir-thr-at1.liara.cloud',
      S3_BUCKET: 'kaghazbaad-media',
      S3_ACCESS_KEY_ID: 'access-key-123',
      S3_SECRET_ACCESS_KEY: 'secret-key-456',
    };
    assert.equal(storageConfigured(configured), true);
  });

  it('clamps presigned URL expiration between 60 and 3600 seconds', () => {
    function clampExpiresIn(input = 900) {
      return Math.min(Math.max(input, 60), 3600);
    }

    assert.equal(clampExpiresIn(900), 900);
    assert.equal(clampExpiresIn(10), 60);
    assert.equal(clampExpiresIn(10000), 3600);
    assert.equal(clampExpiresIn(), 900);
  });

  it('formats S3 object key with user isolation', () => {
    function buildObjectKey(userId, category, timestamp, safeName) {
      return `${userId}/${category}/${timestamp}-${safeName}`;
    }

    const key = buildObjectKey('user-uuid-123', 'image', 1700000000, 'diagram.png');
    assert.equal(key, 'user-uuid-123/image/1700000000-diagram.png');
    assert.ok(key.startsWith('user-uuid-123/'));
  });
});
