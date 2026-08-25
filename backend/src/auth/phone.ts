import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * Converts Persian and Arabic numerals to ASCII digits.
 */
export function convertToAsciiDigits(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

/**
 * Normalizes an Iranian mobile phone number to canonical standard format: '09xxxxxxxxx' (11 digits).
 * Accepts:
 * - '09121234567'
 * - '9121234567'
 * - '+989121234567'
 * - '00989121234567'
 * - '989121234567'
 * - Persian/Arabic digits: '۰۹۱۲۱۲۳۴۵۶۷'
 */
export function normalizePhone(input: string): string {
  const converted = convertToAsciiDigits(input);
  const digits = converted.replace(/[^0-9]/g, '');

  let national = digits;
  if (national.startsWith('0098')) {
    national = national.slice(4);
  } else if (national.startsWith('98')) {
    national = national.slice(2);
  }

  if (national.startsWith('0')) {
    national = national.slice(1);
  }

  if (!/^9\d{9}$/.test(national)) {
    throw new Error('invalid_phone');
  }

  return `0${national}`;
}

/**
 * Returns true if the given input is a valid Iranian mobile number.
 */
export function isValidIranianPhone(input: string): boolean {
  try {
    normalizePhone(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a normalized phone ('0912xxxxxxx') to SMS.ir format ('98912xxxxxxx').
 */
export function formatPhoneForSmsIr(phone: string): string {
  const normalized = normalizePhone(phone);
  return `98${normalized.slice(1)}`;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

/**
 * Hashes an OTP code using SHA-256 for safe storage.
 */
export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * Verifies an OTP code against a stored hash using constant-time comparison to prevent timing attacks.
 */
export function verifyOtpCode(code: string, expectedHash: string): boolean {
  if (!code || !expectedHash) return false;
  const actualHash = hashOtpCode(code);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(actualHash, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
