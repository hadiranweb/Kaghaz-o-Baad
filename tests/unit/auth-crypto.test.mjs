import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, hashSessionToken } from '../../backend/dist/auth/service.js';

describe('Auth Crypto & Security Primitives', () => {
  it('hashes and verifies valid password correctly', async () => {
    const password = 'CorrectHorseBatteryStaple123!';
    const hash = await hashPassword(password);
    assert.ok(hash.startsWith('scrypt:'), 'Hash must follow scrypt:salt:derived format');

    const isValid = await verifyPassword(password, hash);
    assert.equal(isValid, true, 'Valid password must verify');

    const isWrongValid = await verifyPassword('WrongPassword123!', hash);
    assert.equal(isWrongValid, false, 'Wrong password must be rejected');
  });

  it('rejects passwords shorter than 8 characters', async () => {
    await assert.rejects(
      async () => hashPassword('short'),
      { message: 'password_too_short' },
    );
  });

  it('handles corrupted or invalid hashes gracefully without throwing', async () => {
    assert.equal(await verifyPassword('password123', 'invalid_format'), false);
    assert.equal(await verifyPassword('password123', 'bcrypt:salt:hash'), false);
    assert.equal(await verifyPassword('password123', ''), false);
  });

  it('generates consistent SHA-256 session token hashes', () => {
    const token = 'sample-session-token-value-12345';
    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64, 'SHA-256 hex string must be 64 characters');
  });
});
