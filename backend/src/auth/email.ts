import nodemailer from 'nodemailer';
import type { AppEnv } from '../config/env.js';

export class EmailProviderError extends Error {
  constructor(
    public readonly statusCode: number,
    message = 'email_provider_failed',
    public readonly provider?: 'resend' | 'smtp',
    public readonly providerStatus?: number,
  ) {
    super(message);
  }
}

type SmtpTransport = {
  sendMail: (message: { from: string; to: string; subject: string; html: string }) => Promise<unknown>;
};

type SmtpTransportFactory = (options: {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
}) => SmtpTransport;

function buildVerificationMessage(input: { env: AppEnv; token: string }) {
  const url = new URL('/auth/verify-email', input.env.FRONTEND_URL);
  url.searchParams.set('token', input.token);
  const expiresInMinutes = Math.floor(input.env.EMAIL_VERIFICATION_TTL_SECONDS / 60);
  return {
    subject: 'تأیید ایمیل کاغذ و باد',
    html: `<div dir="rtl"><p>برای تکمیل ثبت‌نام کاغذ و باد روی پیوند زیر کلیک کنید:</p><p><a href="${url.toString()}">تأیید ایمیل</a></p><p>این پیوند پس از ${expiresInMinutes} دقیقه منقضی می‌شود.</p></div>`,
  };
}

export async function sendEmailVerification(input: {
  env: AppEnv;
  email: string;
  token: string;
  smtpTransportFactory?: SmtpTransportFactory;
}): Promise<void> {
  const { env } = input;
  if (!env.EMAIL_FROM) {
    throw new EmailProviderError(503, 'email_provider_not_configured');
  }

  const message = buildVerificationMessage(input);
  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY) {
      throw new EmailProviderError(503, 'email_provider_not_configured', 'resend');
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [input.email], ...message }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new EmailProviderError(response.status === 429 ? 429 : 502, 'email_provider_failed', 'resend', response.status);
      }
      return;
    } catch (error) {
      if (error instanceof EmailProviderError) throw error;
      throw new EmailProviderError(502, 'email_provider_failed', 'resend');
    }
  }

  if (env.EMAIL_PROVIDER === 'smtp') {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
      throw new EmailProviderError(503, 'email_provider_not_configured', 'smtp');
    }
    try {
      const transportFactory = input.smtpTransportFactory ?? ((options) => nodemailer.createTransport(options));
      const transport = transportFactory({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      });
      await transport.sendMail({ from: env.EMAIL_FROM, to: input.email, ...message });
      return;
    } catch {
      throw new EmailProviderError(502, 'email_provider_failed', 'smtp');
    }
  }

  throw new EmailProviderError(503, 'email_provider_not_configured');
}
