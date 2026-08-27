import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export type CasioSignatureInput = {
  secret: string;
  keyId: string;
  timestamp: string;
  nonce: string;
  rawBody: string;
};

export type CasioSignatureHeaders = {
  keyId: string;
  timestamp: string;
  nonce: string;
  signature: string;
};

function signingPayload(input: Omit<CasioSignatureInput, 'secret'>): string {
  return `${input.keyId}.${input.timestamp}.${input.nonce}.${input.rawBody}`;
}

export function createCasioSignature(input: CasioSignatureInput): string {
  return `sha256=${createHmac('sha256', input.secret).update(signingPayload(input), 'utf8').digest('hex')}`;
}

export function createCasioSignatureHeaders(input: {
  secret: string;
  keyId: string;
  rawBody: string;
  now?: number;
  nonce?: string;
}): CasioSignatureHeaders {
  const timestamp = String(input.now ?? Date.now());
  const nonce = input.nonce ?? randomUUID();
  return {
    keyId: input.keyId,
    timestamp,
    nonce,
    signature: createCasioSignature({
      secret: input.secret,
      keyId: input.keyId,
      timestamp,
      nonce,
      rawBody: input.rawBody,
    }),
  };
}

export function verifyCasioSignature(input: CasioSignatureInput & { receivedSignature: string; now?: number; maxAgeMs?: number }): boolean {
  const timestampMs = Number(input.timestamp);
  const now = input.now ?? Date.now();
  const maxAgeMs = input.maxAgeMs ?? 5 * 60_000;
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > maxAgeMs) return false;
  if (!/^[0-9a-f-]{36}$/i.test(input.nonce)) return false;
  const expected = Buffer.from(createCasioSignature(input), 'utf8');
  const received = Buffer.from(input.receivedSignature, 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
