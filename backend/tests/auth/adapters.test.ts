import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEnv, type AppEnv } from '../../src/config/env.js';
import { sendSmsIrVerificationCode, SmsProviderError } from '../../src/auth/smsir.js';
import { sendEmailVerification, EmailProviderError } from '../../src/auth/email.js';

process.env.DATABASE_URL ??= 'postgres://test:test@127.0.0.1:5432/kaghazbaad_test';
const { normalizePhone } = await import('../../src/auth/routes.js');

function testEnv(overrides: NodeJS.ProcessEnv = {}): AppEnv {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/kaghazbaad_test',
    FRONTEND_URL: 'https://kaghazobaad.example',
    EMAIL_FROM: 'noreply@kaghazobaad.example',
    ...overrides,
  });
}

async function withMockFetch<T>(mock: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

test('normalizePhone canonicalizes Iranian local, international, Persian and Arabic digits', () => {
  assert.equal(normalizePhone('09121234567'), '09121234567');
  assert.equal(normalizePhone('+98 912 123 4567'), '09121234567');
  assert.equal(normalizePhone('۰۰۹۸ ۹۱۲ ۱۲۳ ۴۵۶۷'), '09121234567');
  assert.equal(normalizePhone('٩١٢١٢٣٤٥٦٧'), '09121234567');
  assert.throws(() => normalizePhone('02112345678'), /invalid_phone/);
});

test('SMS.ir adapter rejects a missing provider configuration before any network call', async () => {
  await assert.rejects(
    () => sendSmsIrVerificationCode({ env: testEnv({ SMSIR_API_KEY: undefined, SMSIR_TEMPLATE_ID: undefined }), phone: '09121234567', code: '123456' }),
    (error: unknown) => error instanceof SmsProviderError && error.statusCode === 503 && error.message === 'sms_provider_not_configured',
  );
});

test('SMS.ir adapter sends the documented verification payload and maps a success result', async () => {
  let observed: { url: string; init: RequestInit | undefined } | undefined;
  await withMockFetch(async (input, init) => {
    observed = { url: String(input), init };
    return new Response(JSON.stringify({ status: 1, data: { messageId: 42, cost: 1200 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }, async () => {
    const result = await sendSmsIrVerificationCode({
      env: testEnv({ SMSIR_API_KEY: 'test-smsir-key', SMSIR_TEMPLATE_ID: '12345', SMSIR_CODE_PARAMETER: 'CODE' }),
      phone: '09121234567',
      code: '123456',
    });
    assert.deepEqual(result, { messageId: '42', cost: 1200 });
  });

  assert.equal(observed?.url, 'https://api.sms.ir/v1/send/verify');
  assert.equal(observed?.init?.method, 'POST');
  assert.equal(new Headers(observed?.init?.headers).get('x-api-key'), 'test-smsir-key');
  assert.deepEqual(JSON.parse(String(observed?.init?.body)), {
    mobile: '9121234567',
    templateId: 12345,
    parameters: [{ name: 'CODE', value: '123456' }],
  });
});

test('SMS.ir adapter rejects a number outside the provider verification format before any network call', async () => {
  await assert.rejects(
    () => sendSmsIrVerificationCode({ env: testEnv({ SMSIR_API_KEY: 'test-smsir-key', SMSIR_TEMPLATE_ID: '12345' }), phone: '989121234567', code: '123456' }),
    (error: unknown) => error instanceof SmsProviderError && error.statusCode === 400 && error.message === 'invalid_phone',
  );
});

test('SMS.ir adapter preserves a provider 429 and records the upstream status safely', async () => {
  await withMockFetch(async () => new Response(JSON.stringify({ status: 0, message: 'throttled' }), { status: 429, headers: { 'content-type': 'application/json' } }), async () => {
    await assert.rejects(
      () => sendSmsIrVerificationCode({ env: testEnv({ SMSIR_API_KEY: 'test-smsir-key', SMSIR_TEMPLATE_ID: '12345' }), phone: '09121234567', code: '123456' }),
      (error: unknown) => error instanceof SmsProviderError && error.statusCode === 429 && error.providerStatus === 429 && error.message === 'sms_provider_failed',
    );
  });
});

test('SMS.ir adapter maps provider rejection and network failure to a retryable safe error', async () => {
  await withMockFetch(async () => new Response('upstream failure', { status: 500 }), async () => {
    await assert.rejects(
      () => sendSmsIrVerificationCode({ env: testEnv({ SMSIR_API_KEY: 'test-smsir-key', SMSIR_TEMPLATE_ID: '12345' }), phone: '09121234567', code: '123456' }),
      (error: unknown) => error instanceof SmsProviderError && error.statusCode === 502 && error.providerStatus === 500,
    );
  });

  await withMockFetch(async () => { throw new Error('network unavailable'); }, async () => {
    await assert.rejects(
      () => sendSmsIrVerificationCode({ env: testEnv({ SMSIR_API_KEY: 'test-smsir-key', SMSIR_TEMPLATE_ID: '12345' }), phone: '09121234567', code: '123456' }),
      (error: unknown) => error instanceof SmsProviderError && error.statusCode === 502 && error.message === 'sms_provider_failed',
    );
  });
});

test('email adapter rejects a missing provider configuration without sending', async () => {
  await assert.rejects(
    () => sendEmailVerification({ env: testEnv({ EMAIL_FROM: undefined, EMAIL_PROVIDER: 'none' }), email: 'user@example.test', token: 'a'.repeat(32) }),
    (error: unknown) => error instanceof EmailProviderError && error.statusCode === 503 && error.message === 'email_provider_not_configured',
  );

  await assert.rejects(
    () => sendEmailVerification({ env: testEnv({ EMAIL_PROVIDER: 'smtp', SMTP_HOST: undefined, SMTP_USER: undefined, SMTP_PASSWORD: undefined }), email: 'user@example.test', token: 'a'.repeat(32) }),
    (error: unknown) => error instanceof EmailProviderError && error.statusCode === 503 && error.provider === 'smtp',
  );
});

test('SMTP adapter uses the expected transport options and builds a verification link', async () => {
  let observedOptions: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } } | undefined;
  let observedMessage: { from: string; to: string; subject: string; html: string } | undefined;
  await sendEmailVerification({
    env: testEnv({ EMAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.example.test', SMTP_PORT: '465', SMTP_USER: 'mailer', SMTP_PASSWORD: 'smtp-test-password' }),
    email: 'user@example.test',
    token: 'b'.repeat(32),
    smtpTransportFactory: (options) => {
      observedOptions = options;
      return { sendMail: async (message) => { observedMessage = message; } };
    },
  });

  assert.deepEqual(observedOptions, { host: 'smtp.example.test', port: 465, secure: true, auth: { user: 'mailer', pass: 'smtp-test-password' } });
  assert.equal(observedMessage?.from, 'noreply@kaghazobaad.example');
  assert.equal(observedMessage?.to, 'user@example.test');
  assert.match(observedMessage?.html ?? '', /https:\/\/kaghazobaad\.example\/auth\/verify-email\?token=/);
});

test('SMTP transport failure is converted to a safe provider error', async () => {
  await assert.rejects(
    () => sendEmailVerification({
      env: testEnv({ EMAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.example.test', SMTP_USER: 'mailer', SMTP_PASSWORD: 'smtp-test-password' }),
      email: 'user@example.test',
      token: 'c'.repeat(32),
      smtpTransportFactory: () => ({ sendMail: async () => { throw new Error('smtp unavailable'); } }),
    }),
    (error: unknown) => error instanceof EmailProviderError && error.statusCode === 502 && error.provider === 'smtp',
  );
});

test('Resend adapter sends the expected request and maps 429, 5xx and network failures safely', async () => {
  let observed: { url: string; init: RequestInit | undefined } | undefined;
  await withMockFetch(async (input, init) => {
    observed = { url: String(input), init };
    return new Response(JSON.stringify({ id: 'message-1' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }, async () => {
    await sendEmailVerification({
      env: testEnv({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-resend-key' }),
      email: 'user@example.test',
      token: 'd'.repeat(32),
    });
  });
  assert.equal(observed?.url, 'https://api.resend.com/emails');
  assert.equal(new Headers(observed?.init?.headers).get('authorization'), 'Bearer test-resend-key');
  assert.deepEqual(JSON.parse(String(observed?.init?.body)).to, ['user@example.test']);

  await withMockFetch(async () => new Response('{}', { status: 429 }), async () => {
    await assert.rejects(
      () => sendEmailVerification({ env: testEnv({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-resend-key' }), email: 'user@example.test', token: 'e'.repeat(32) }),
      (error: unknown) => error instanceof EmailProviderError && error.statusCode === 429 && error.provider === 'resend' && error.providerStatus === 429,
    );
  });

  await withMockFetch(async () => new Response('{}', { status: 500 }), async () => {
    await assert.rejects(
      () => sendEmailVerification({ env: testEnv({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-resend-key' }), email: 'user@example.test', token: 'f'.repeat(32) }),
      (error: unknown) => error instanceof EmailProviderError && error.statusCode === 502 && error.providerStatus === 500,
    );
  });

  await withMockFetch(async () => { throw new Error('network unavailable'); }, async () => {
    await assert.rejects(
      () => sendEmailVerification({ env: testEnv({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-resend-key' }), email: 'user@example.test', token: 'g'.repeat(32) }),
      (error: unknown) => error instanceof EmailProviderError && error.statusCode === 502 && error.provider === 'resend' && error.providerStatus === undefined,
    );
  });
});

test('loadEnv enforces the auth-secret requirement only when requested', () => {
  assert.throws(
    () => loadEnv({ DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/kaghazbaad_test' }, { requireAuthSecret: true }),
    /AUTH_JWT_SECRET: Required/,
  );
  assert.equal(loadEnv({ DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/kaghazbaad_test' }).SMSIR_CODE_PARAMETER, 'CODE');
});
