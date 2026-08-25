import type { AppEnv } from '../config/env.js';

export class EmailProviderError extends Error {
  constructor(public readonly statusCode: number, message = 'email_provider_failed') {
    super(message);
  }
}

export async function sendEmailVerification(input: {
  env: AppEnv;
  email: string;
  token: string;
}): Promise<void> {
  if (input.env.EMAIL_PROVIDER !== 'resend' || !input.env.RESEND_API_KEY || !input.env.EMAIL_FROM) {
    throw new EmailProviderError(503, 'email_provider_not_configured');
  }

  const url = new URL('/auth/verify-email', input.env.FRONTEND_URL);
  url.searchParams.set('token', input.token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      from: input.env.EMAIL_FROM,
      to: [input.email],
      subject: 'تأیید ایمیل کاغذ و باد',
      html: `<div dir="rtl"><p>برای تکمیل ثبت‌نام کاغذ و باد روی پیوند زیر کلیک کنید:</p><p><a href="${url.toString()}">تأیید ایمیل</a></p><p>این پیوند پس از ${Math.floor(input.env.EMAIL_VERIFICATION_TTL_SECONDS / 60)} دقیقه منقضی می‌شود.</p></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new EmailProviderError(response.status === 429 ? 429 : 502);
  }
}
