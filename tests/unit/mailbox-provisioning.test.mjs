import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure logic imports from compiled auth identity consistency module
import { validatePlatformEmailFormat, extractLocalpart, hasVerifiedFactor, isIdentityActive, resolveIdentityConsistencyErrors } from '../../backend/dist/auth/identity-consistency.js';

describe('Mailbox Provisioning — Email Validation & Identity Hardening', () => {
  describe('Platform Email Format Validation', () => {
    it('accepts valid local parts with alphanumeric, dots, and dashes', () => {
      assert.equal(validatePlatformEmailFormat('user-abc@kaghazobaad.ir', 'kaghazobaad.ir'), true);
      assert.equal(validatePlatformEmailFormat('test.user@kaghazobaad.ir', 'kaghazobaad.ir'), true);
      assert.equal(validatePlatformEmailFormat('alice@kaghazobaad.ir', 'kaghazobaad.ir'), true);
    });

    it('rejects invalid formats', () => {
      assert.equal(validatePlatformEmailFormat('', 'kaghazobaad.ir'), false);
      assert.equal(validatePlatformEmailFormat('user__test@kaghazobaad.ir', 'kaghazobaad.ir'), false);
      assert.equal(validatePlatformEmailFormat('@kaghazobaad.ir', 'kaghazobaad.ir'), false);
      assert.equal(validatePlatformEmailFormat('user@other.ir', 'kaghazobaad.ir'), false);
    });
  });

  describe('Localpart Extraction', () => {
    it('extracts localpart correctly', () => {
      assert.equal(extractLocalpart('user-xyz@kaghazobaad.ir', 'kaghazobaad.ir'), 'user-xyz');
      assert.equal(extractLocalpart('alice.smith@kaghazobaad.ir', 'kaghazobaad.ir'), 'alice.smith');
    });

    it('throws on domain mismatch', () => {
      assert.throws(() => extractLocalpart('user@other.ir', 'kaghazobaad.ir'), { message: 'platform_email_domain_mismatch' });
    });
  });

  describe('Central Identity Consistency', () => {
    it('resolves verified factor when email or phone is verified', () => {
      const identity = {
        userId: 'user-1',
        platformEmail: 'user-1@kaghazobaad.ir',
        platformEmailLocalpart: 'user-1',
        identityStatus: 'active',
        verifiedFactors: [{ kind: 'email', value: 'a@b.ir', verifiedAt: new Date('2024-01-01') }],
        loginIdentities: [{ provider: 'password_email', providerSubject: 'a@b.ir', isVerified: true, verifiedAt: new Date('2024-01-01') }],
        mailboxStatus: 'pending',
        mailboxAddress: null,
      };
      assert.equal(hasVerifiedFactor(identity), true);
      assert.equal(isIdentityActive(identity), true);
    });

    it('detects missing verified factors', () => {
      const identity = {
        userId: 'user-2',
        platformEmail: 'user-2@kaghazobaad.ir',
        platformEmailLocalpart: 'user-2',
        identityStatus: 'pending',
        verifiedFactors: [],
        loginIdentities: [],
        mailboxStatus: 'pending',
        mailboxAddress: null,
      };
      assert.equal(hasVerifiedFactor(identity), false);
      assert.equal(isIdentityActive(identity), false);
      const result = resolveIdentityConsistencyErrors(identity, true);
      assert.ok(result.errors.includes('identity_not_active'));
      assert.ok(result.errors.includes('mailbox_provision_requires_verified_factor') || result.errors.includes('invalid_platform_email_format'));
    });

    it('reports mailbox warnings when enabled but not provisioned', () => {
      const identity = {
        userId: 'user-3',
        platformEmail: 'user-3@kaghazobaad.ir',
        platformEmailLocalpart: 'user-3',
        identityStatus: 'active',
        verifiedFactors: [{ kind: 'phone', value: '09121234567', verifiedAt: new Date('2024-06-01') }],
        loginIdentities: [{ provider: 'phone_otp', providerSubject: '+989121234567', isVerified: true, verifiedAt: new Date('2024-06-01') }],
        mailboxStatus: 'pending',
        mailboxAddress: null,
      };
      const result = resolveIdentityConsistencyErrors(identity, true);
      assert.ok(result.warnings.some((w) => w === 'mailbox_not_provisioned'));
      assert.equal(result.errors.length, 0);
    });
  });
});
