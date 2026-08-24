import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone,
  isValidIranianPhone,
  formatPhoneForSmsIr,
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from '../../backend/dist/auth/phone.js';

describe('Phone Authentication & Verified Factors', () => {
  describe('Iranian Phone Number Normalization', () => {
    it('normalizes standard 11-digit Iranian mobile numbers starting with 09', () => {
      assert.equal(normalizePhone('09121234567'), '09121234567');
      assert.equal(normalizePhone('09351234567'), '09351234567');
      assert.equal(normalizePhone('09901234567'), '09901234567');
    });

    it('normalizes 10-digit numbers without leading zero', () => {
      assert.equal(normalizePhone('9121234567'), '09121234567');
      assert.equal(normalizePhone('9351234567'), '09351234567');
    });

    it('normalizes international formats (+98, 0098, 98)', () => {
      assert.equal(normalizePhone('+989121234567'), '09121234567');
      assert.equal(normalizePhone('00989121234567'), '09121234567');
      assert.equal(normalizePhone('989121234567'), '09121234567');
      assert.equal(normalizePhone('+98 912 123 4567'), '09121234567');
      assert.equal(normalizePhone('0912-123-4567'), '09121234567');
    });

    it('normalizes Persian and Arabic numerals', () => {
      assert.equal(normalizePhone('۰۹۱۲۱۲۳۴۵۶۷'), '09121234567');
      assert.equal(normalizePhone('٠٩١٢١٢٣٤٥٦٧'), '09121234567');
      assert.equal(normalizePhone('+۹۸ ۹۱۲ ۱۲۳ ۴۵۶۷'), '09121234567');
    });

    it('rejects invalid, foreign, or landline numbers', () => {
      assert.throws(() => normalizePhone('02188888888'), { message: 'invalid_phone' });
      assert.throws(() => normalizePhone('+14155552671'), { message: 'invalid_phone' });
      assert.throws(() => normalizePhone('12345'), { message: 'invalid_phone' });
      assert.throws(() => normalizePhone(''), { message: 'invalid_phone' });
      assert.throws(() => normalizePhone('0912123456'), { message: 'invalid_phone' }); // 10 digits with 0
      assert.throws(() => normalizePhone('091212345678'), { message: 'invalid_phone' }); // 12 digits
    });
  });

  describe('isValidIranianPhone boolean helper', () => {
    it('returns true for valid mobile numbers', () => {
      assert.equal(isValidIranianPhone('09121234567'), true);
      assert.equal(isValidIranianPhone('+989351234567'), true);
      assert.equal(isValidIranianPhone('۰۹۱۲۱۲۳۴۵۶۷'), true);
    });

    it('returns false for invalid inputs without throwing', () => {
      assert.equal(isValidIranianPhone('02188888888'), false);
      assert.equal(isValidIranianPhone('invalid'), false);
      assert.equal(isValidIranianPhone(''), false);
      assert.equal(isValidIranianPhone(null), false);
    });
  });

  describe('SMS.ir Recipient Formatting', () => {
    it('formats normalized phone into 989xxxxxxxxx format for SMS.ir API', () => {
      assert.equal(formatPhoneForSmsIr('09121234567'), '989121234567');
      assert.equal(formatPhoneForSmsIr('+989351234567'), '989351234567');
      assert.equal(formatPhoneForSmsIr('۰۹۱۲۱۲۳۴۵۶۷'), '989121234567');
    });
  });

  describe('Secure OTP Code Generation & Hashing', () => {
    it('generates random 6-digit numeric codes', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateOtpCode();
        assert.equal(code.length, 6);
        assert.ok(/^\d{6}$/.test(code));
        const num = Number(code);
        assert.ok(num >= 100000 && num <= 999999);
      }
    });

    it('hashes OTP code using SHA-256', () => {
      const code = '754821';
      const hash1 = hashOtpCode(code);
      const hash2 = hashOtpCode(code);
      assert.equal(hash1, hash2);
      assert.equal(hash1.length, 64);
    });

    it('verifies valid OTP code and rejects incorrect code with constant-time equality', () => {
      const code = '654321';
      const hash = hashOtpCode(code);

      assert.equal(verifyOtpCode(code, hash), true);
      assert.equal(verifyOtpCode('654320', hash), false);
      assert.equal(verifyOtpCode('123456', hash), false);
      assert.equal(verifyOtpCode('', hash), false);
      assert.equal(verifyOtpCode('654321', ''), false);
    });
  });

  describe('Verified Factor Logic', () => {
    function evaluateVerifiedFactor(user) {
      return Boolean(user.email_verified || user.phone_verified);
    }

    it('resolves verified factor when either email or phone is verified', () => {
      assert.equal(evaluateVerifiedFactor({ email_verified: true, phone_verified: false }), true);
      assert.equal(evaluateVerifiedFactor({ email_verified: false, phone_verified: true }), true);
      assert.equal(evaluateVerifiedFactor({ email_verified: true, phone_verified: true }), true);
      assert.equal(evaluateVerifiedFactor({ email_verified: false, phone_verified: false }), false);
    });
  });
});
