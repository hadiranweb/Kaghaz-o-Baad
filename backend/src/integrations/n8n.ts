import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AppEnv } from '../config/env.js';

export type KaghazBaadEvent = {
  type: string;
  occurredAt: string;
  requestId: string;
  actorUserId?: string;
  entityId?: string;
  payload: Record<string, unknown>;
};

function sign(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export async function dispatchN8nEvent(
  env: Pick<AppEnv, 'N8N_EVENT_WEBHOOK_URL' | 'N8N_WEBHOOK_SECRET'>,
  event: KaghazBaadEvent,
  fetchImpl: typeof fetch = fetch,
): Promise<{ delivered: boolean; status?: number }> {
  if (!env.N8N_EVENT_WEBHOOK_URL || !env.N8N_WEBHOOK_SECRET) {
    return { delivered: false };
  }

  const body = JSON.stringify(event);
  const timestamp = String(Date.now());
  const signature = sign(env.N8N_WEBHOOK_SECRET, timestamp, body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetchImpl(env.N8N_EVENT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-kaghazbaad-event-timestamp': timestamp,
        'x-kaghazbaad-event-signature': `sha256=${signature}`,
        'x-request-id': event.requestId,
      },
      body,
      signal: controller.signal,
    });
    return { delivered: response.ok, status: response.status };
  } catch {
    return { delivered: false };
  } finally {
    clearTimeout(timeout);
  }
}

export function verifyN8nSignature(
  secret: string,
  timestamp: string,
  body: string,
  receivedSignature: string,
  nowMs = Date.now(),
): boolean {
  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(nowMs - timestampMs) > 5 * 60_000) return false;
  const expected = Buffer.from(`sha256=${sign(secret, timestamp, body)}`);
  const received = Buffer.from(receivedSignature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
