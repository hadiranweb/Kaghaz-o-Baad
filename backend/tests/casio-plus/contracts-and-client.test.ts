import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEnv } from '../../src/config/env.js';
import { CasioPlusClient } from '../../src/integrations/casio-plus/client.js';
import { CASIO_FLOW_CALLBACK_CONTRACT, casioFlowCallbackSchema } from '../../src/integrations/casio-plus/contracts.js';
import { CasioDispatchError } from '../../src/integrations/casio-plus/errors.js';
import { createCasioSignatureHeaders, verifyCasioSignature } from '../../src/integrations/casio-plus/signer.js';
import type { LeasedCasioOutboxEvent } from '../../src/integrations/casio-plus/outbox-repository.js';

const outboundSecret = 'o'.repeat(40);
const inboundSecret = 'i'.repeat(40);
const now = new Date('2026-08-27T00:00:00.000Z');
const event: LeasedCasioOutboxEvent = {
  outboxId: '44444444-4444-4444-4444-444444444444',
  invocationId: '55555555-5555-5555-5555-555555555555',
  snapshotId: '66666666-6666-6666-6666-666666666666',
  requestId: '77777777-7777-7777-7777-777777777777',
  idempotencyKey: 'casio:article-editorial-suggestion:aaaaaaaa:1:v1',
  leaseToken: '88888888-8888-8888-8888-888888888888',
  attempts: 1,
  flowKey: 'article_editorial_suggestion',
  contractVersion: 'casio.flow.invoke.v1',
  requestedByUserId: '99999999-9999-9999-9999-999999999999',
  actorId: '99999999-9999-9999-9999-999999999999',
  actorRoles: ['editor'],
  articleId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  contentRevision: 1,
  contentSha256: 'a'.repeat(64),
  canonicalPayload: {
    schemaVersion: 'kaghazbaad.article-snapshot.v1',
    article: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', contentRevision: 1, slug: 'sample-article' },
    content: { titleFa: 'عنوان نمونه', titleEn: 'Sample title', contentFa: 'متن نمونه', contentEn: 'Sample text' },
  },
};

function casioEnv(overrides: NodeJS.ProcessEnv = {}) {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/kaghazbaad_test',
    CASIO_PLUS_ENABLED: 'true',
    CASIO_PLUS_BASE_URL: 'https://studio.example.test',
    KAGHAZBAAD_TO_CASIO_HMAC_SECRET: outboundSecret,
    CASIO_TO_KAGHAZBAAD_HMAC_SECRET: inboundSecret,
    ...overrides,
  });
}

test('Casioplus environment fails closed when enabled without both directional secrets', () => {
  assert.throws(
    () => loadEnv({
      DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/kaghazbaad_test',
      CASIO_PLUS_ENABLED: 'true',
      CASIO_PLUS_BASE_URL: 'https://studio.example.test',
      KAGHAZBAAD_TO_CASIO_HMAC_SECRET: outboundSecret,
    }),
    /Casioplus requires base URL and both directional HMAC secrets/,
  );
});

test('Casioplus signatures bind key, timestamp, nonce and exact raw body', () => {
  const rawBody = '{"contract":"casio.flow.callback.v1"}';
  const headers = createCasioSignatureHeaders({
    secret: inboundSecret,
    keyId: 'v1',
    rawBody,
    now: now.getTime(),
    nonce: '11111111-1111-1111-1111-111111111111',
  });
  assert.equal(verifyCasioSignature({
    secret: inboundSecret,
    keyId: headers.keyId,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    rawBody,
    receivedSignature: headers.signature,
    now: now.getTime(),
  }), true);
  assert.equal(verifyCasioSignature({
    secret: inboundSecret,
    keyId: headers.keyId,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    rawBody: `${rawBody} `,
    receivedSignature: headers.signature,
    now: now.getTime(),
  }), false);
  assert.equal(verifyCasioSignature({
    secret: inboundSecret,
    keyId: headers.keyId,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    rawBody,
    receivedSignature: headers.signature,
    now: now.getTime() + (6 * 60_000),
  }), false);
});

test('callback contract requires a result for completed and an error for non-completed results', () => {
  const base = {
    contract: CASIO_FLOW_CALLBACK_CONTRACT,
    eventId: '11111111-1111-1111-1111-111111111111',
    runId: 'run-001',
    status: 'completed',
    flowKey: 'article_editorial_suggestion',
    sourceEntity: {
      type: 'article',
      id: event.articleId,
      snapshotId: event.snapshotId,
      contentRevision: 1,
      contentSha256: event.contentSha256,
    },
    requestId: event.requestId,
    idempotencyKey: event.idempotencyKey,
    artifactRefs: [],
    memoryRefs: [],
    provenance: { flowVersion: '1.0.0', runtime: 'worker', createdAt: now.toISOString() },
  };
  assert.equal(casioFlowCallbackSchema.safeParse(base).success, false);
  assert.equal(casioFlowCallbackSchema.safeParse({ ...base, result: { suggestions: [] } }).success, true);
  assert.equal(casioFlowCallbackSchema.safeParse({ ...base, status: 'failed', error: { code: 'upstream_unavailable', retryable: true } }).success, true);
});

test('Casioplus client signs a validated envelope and enforces correlation in its response', async () => {
  let observed: { url: string; init: RequestInit } | undefined;
  const client = new CasioPlusClient(
    casioEnv(),
    async (input, init) => {
      observed = { url: String(input), init: init ?? {} };
      return new Response(JSON.stringify({
        contract: 'casio.flow.accepted.v1',
        runId: 'studio-run-1',
        status: 'accepted',
        flowKey: 'article_editorial_suggestion',
        requestId: event.requestId,
        idempotencyKey: event.idempotencyKey,
      }), { status: 202, headers: { 'content-type': 'application/json' } });
    },
    () => now,
  );

  const result = await client.invoke(event);
  assert.deepEqual(result, { runId: 'studio-run-1' });
  assert.equal(observed?.url, 'https://studio.example.test/api/v1/integrations/kaghazbaad/flows/article_editorial_suggestion/invoke');
  const headers = new Headers(observed?.init.headers);
  const rawBody = String(observed?.init.body);
  assert.equal(headers.get('idempotency-key'), event.idempotencyKey);
  assert.equal(headers.get('x-request-id'), event.requestId);
  assert.equal(verifyCasioSignature({
    secret: outboundSecret,
    keyId: headers.get('x-casio-key-id') ?? '',
    timestamp: headers.get('x-casio-timestamp') ?? '',
    nonce: headers.get('x-casio-nonce') ?? '',
    rawBody,
    receivedSignature: headers.get('x-casio-signature') ?? '',
    now: now.getTime(),
  }), true);
  const payload = JSON.parse(rawBody) as { sourceEntity: { snapshotId: string }; actor: { roles: string[] } };
  assert.equal(payload.sourceEntity.snapshotId, event.snapshotId);
  assert.deepEqual(payload.actor.roles, ['editor']);
});

test('Casioplus client classifies retryable upstream failure without exposing its body', async () => {
  const client = new CasioPlusClient(casioEnv(), async () => new Response('secret upstream diagnostic', { status: 503 }), () => now);
  await assert.rejects(
    () => client.invoke(event),
    (error: unknown) => error instanceof CasioDispatchError && error.code === 'casio_http_503' && error.retryable,
  );
});
