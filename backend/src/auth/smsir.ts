import { AppEnv } from '../config/env.js';

const SMSIR_VERIFY_URL = 'https://api.sms.ir/v1/send/verify';

function toSmsIrVerifyMobile(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const national = digits.startsWith('0') ? digits.slice(1) : digits;
  if (!/^9\d{9}$/.test(national)) throw new SmsProviderError(400, 'invalid_phone');
  return national;
}

export class SmsProviderError extends Error {
  constructor(
    public readonly statusCode: number,
    message = 'sms_provider_failed',
    public readonly providerStatus?: number,
  ) {
    super(message);
  }
}

export async function sendSmsIrVerificationCode(input: {
  env: AppEnv;
  phone: string;
  code: string;
}): Promise<{ messageId?: string; cost?: number }> {
  if (!input.env.SMSIR_API_KEY || !input.env.SMSIR_TEMPLATE_ID) {
    throw new SmsProviderError(503, 'sms_provider_not_configured');
  }
  const mobile = toSmsIrVerifyMobile(input.phone);

  try {
    const response = await fetch(SMSIR_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-KEY': input.env.SMSIR_API_KEY,
      },
      body: JSON.stringify({
        mobile,
        templateId: input.env.SMSIR_TEMPLATE_ID,
        parameters: [{ name: input.env.SMSIR_CODE_PARAMETER, value: input.code }],
      }),
      signal: AbortSignal.timeout(input.env.SMSIR_TIMEOUT_MS),
    });

    const payload = await response.json().catch(() => ({})) as {
      status?: number;
      message?: string;
      data?: { messageId?: number; cost?: number };
    };
    if (!response.ok || payload.status !== 1) {
      const providerStatus = response.status === 401 ? 502 : response.status === 429 ? 429 : 502;
      throw new SmsProviderError(providerStatus, 'sms_provider_failed', response.status);
    }
    return {
      messageId: payload.data?.messageId === undefined ? undefined : String(payload.data.messageId),
      cost: payload.data?.cost,
    };
  } catch (error) {
    if (error instanceof SmsProviderError) throw error;
    throw new SmsProviderError(502, 'sms_provider_failed');
  }
}
