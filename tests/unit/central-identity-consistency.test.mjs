import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePlatformEmailFormat,
  extractLocalpart,
  hasVerifiedFactor,
  isIdentityActive,
  isMailboxProvisionReady,
  resolveIdentityConsistencyErrors,
} from '../../backend/dist/auth/identity-consistency.js';

describe('Central Identity Consistency — Hardening & Validation', () => {
  describe('Verified Factor Resolution', () => {
    it('returns true when either contact method or login identity is verified', () => {
      const identity = {
        userId: 'u-1',
        platformEmail: 'user-abc@kaghazobaad.ir',
        platformEmailLocalpart: 'user-abc',
        identityStatus: 'active',
        verifiedFactors: [{ kind: 'email', value: 'test@kaghazobaad.ir', verifiedAt: new Date() }],
        loginIdentities: [{ provider: 'password_email', providerSubject: 'test@kaghazobaad.ir', isVerified: false, verifiedAt: null }],
        mailboxStatus: 'pending',
        mailboxAddress: null,
      };
      assert.equal(hasVerifiedFactor(identity), true);
    });

    it('returns false when nothing is verified', () => {
      const identity = {
        userId: 'u-2',
        platformEmail: 'user-xyz@kaghazobaad.ir',
        platformEmailLocalpart: 'user-xyz',
        identityStatus: 'pending',
        verifiedFactors: [],
        loginIdentities: [{ provider: 'google', providerSubject: 'sub-123', isVerified: false, verifiedAt: null }],
        mailboxStatus: 'pending',
        mailboxAddress: null,
      };
      assert.equal(hasVerifiedFactor(identity), false);
    });
  });

  describe('Mailbox Provision Readiness', () => {
    it('requires active identity, verified factor, and enabled mailbox', () => {
      const readyIdentity = {
        userId: 'u-r',
        platformEmail: 'ready@kaghazobaad.ir',
        platformEmailLocalpart: 'ready',
        identityStatus: 'active',
        verifiedFactors: [{ kind: 'phone', value: '09121234567', verifiedAt: new Date() }],
        loginIdentities: [{ provider: 'phone_otp', providerSubject: '09121234567', isVerified: true, verifiedAt: new Date() }],
        mailboxStatus: 'pending',
        mailboxAddress: null,
      };
      assert.equal(isMailboxProvisionReady(readyIdentity, true), true);
      assert.equal(isMailboxProvisionReady(readyIdentity, false), false);

      const inactiveIdentity = { ...readyIdentity, identityStatus: 'pending' };
      assert.equal(isMailboxProvisionReady(inactiveIdentity, true), false);

      const unverifiedIdentity = { ...readyIdentity, verifiedFactors: [], loginIdentities: [{ provider: 'phone_otp', providerSubject: '09121234567', isVerified: false, verifiedAt: null }] };
      assert.equal(isMailboxProvisionReady(unverifiedIdentity, true), false);
    });
  });

  describe('Consistency Error Resolution', () => {
    it('collects errors and warnings separately', () => {
      const identity = {
        userId: 'u-3',
        platformEmail: 'bad-format@other.ir',
        platformEmailLocalpart: 'bad-format',
        identityStatus: 'pending',
        verifiedFactors: [],
        loginIdentities: [],
        mailboxStatus: 'pending',
        mailboxAddress: null,
      };
      const result = resolveIdentityConsistencyErrors(identity, true);
      assert.ok(Array.isArray(result.errors));
      assert.ok(Array.isArray(result.warnings));
      assert.ok(result.errors.some((e) => e === 'invalid_platform_email_format' || e === 'identity_not_active'));
    });
  });
});
