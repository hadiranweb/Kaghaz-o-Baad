import type { AppEnv } from '../../config/env.js';

export type ZarinpalRequestResult = {
  authority: string;
  redirectUrl: string;
  providerRequestId?: string;
  rawResponse: unknown;
};

export type ZarinpalVerifyResult = {
  success: boolean;
  refId?: string;
  providerCode: number;
  rawResponse: unknown;
};

function endpoints(env: AppEnv) {
  const origin = env.ZARINPAL_SANDBOX ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
  return {
    request: `${origin}/pg/v4/payment/request.json`,
    verify: `${origin}/pg/v4/payment/verify.json`,
    startPay: `${origin}/pg/StartPay/`,
  };
}

async function postJson(env: AppEnv, url: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.PAYMENT_PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`zarinpal_http_${response.status}`);
    return payload as { data?: Record<string, unknown>; errors?: unknown };
  } finally { clearTimeout(timer); }
}

export async function requestZarinpalPayment(env: AppEnv, input: {
  amountMinor: number;
  callbackUrl: string;
  description: string;
  metadata?: Record<string, string>;
}) {
  if (!env.ZARINPAL_MERCHANT_ID) throw new Error('zarinpal_not_configured');
  const result = await postJson(env, endpoints(env).request, {
    merchant_id: env.ZARINPAL_MERCHANT_ID,
    amount: input.amountMinor,
    callback_url: input.callbackUrl,
    description: input.description,
    metadata: input.metadata,
  });
  const code = Number(result.data?.code ?? -1);
  const authority = typeof result.data?.authority === 'string' ? result.data.authority : '';
  if (code !== 100 || !authority) throw new Error(`zarinpal_request_failed:${code}`);
  return {
    authority,
    redirectUrl: `${endpoints(env).startPay}${authority}`,
    providerRequestId: authority,
    rawResponse: result,
  } satisfies ZarinpalRequestResult;
}

export async function verifyZarinpalPayment(env: AppEnv, input: { authority: string; amountMinor: number }) {
  if (!env.ZARINPAL_MERCHANT_ID) throw new Error('zarinpal_not_configured');
  const result = await postJson(env, endpoints(env).verify, {
    merchant_id: env.ZARINPAL_MERCHANT_ID,
    amount: input.amountMinor,
    authority: input.authority,
  });
  const code = Number(result.data?.code ?? -1);
  const refId = typeof result.data?.ref_id === 'string' || typeof result.data?.ref_id === 'number' ? String(result.data.ref_id) : undefined;
  return { success: code === 100 || code === 101, refId, providerCode: code, rawResponse: result } satisfies ZarinpalVerifyResult;
}
