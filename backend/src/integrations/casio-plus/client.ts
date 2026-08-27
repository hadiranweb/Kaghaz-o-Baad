import type { AppEnv } from '../../config/env.js';
import { toCasioEditorialText, type ArticleContentSnapshot } from '../../modules/article-ai/snapshot-service.js';
import { CasioDispatchError } from './errors.js';
import type { LeasedCasioOutboxEvent } from './outbox-repository.js';
import {
  CASIO_EDITORIAL_FLOW_KEY,
  CASIO_FLOW_ACCEPTED_CONTRACT,
  casioFlowAcceptedSchema,
  casioFlowInvokeSchema,
  type CasioFlowInvoke,
} from './contracts.js';
import { createCasioSignatureHeaders } from './signer.js';

export class CasioPlusClient {
  constructor(
    private readonly config: Pick<
      AppEnv,
      | 'CASIO_PLUS_BASE_URL'
      | 'CASIO_PLUS_INTEGRATION_KEY'
      | 'CASIO_PLUS_SIGNING_KEY_ID'
      | 'KAGHAZBAAD_TO_CASIO_HMAC_SECRET'
      | 'CASIO_PLUS_HTTP_TIMEOUT_MS'
      | 'CASIO_INLINE_SNAPSHOT_MAX_BYTES'
    >,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private requireConfiguration(): {
    baseUrl: string;
    secret: string;
  } {
    if (!this.config.CASIO_PLUS_BASE_URL || !this.config.KAGHAZBAAD_TO_CASIO_HMAC_SECRET) {
      throw new CasioDispatchError('casio_configuration_missing', false);
    }
    return {
      baseUrl: this.config.CASIO_PLUS_BASE_URL,
      secret: this.config.KAGHAZBAAD_TO_CASIO_HMAC_SECRET,
    };
  }

  private toInvocation(event: LeasedCasioOutboxEvent): CasioFlowInvoke {
    if (event.canonicalPayload === null) {
      throw new CasioDispatchError('article_snapshot_purged', false);
    }
    const snapshot = {
      id: event.snapshotId,
      article_id: event.articleId,
      content_revision: event.contentRevision,
      snapshot_schema_version: event.canonicalPayload.schemaVersion,
      canonical_payload: event.canonicalPayload,
      content_sha256: event.contentSha256,
      byte_size: Buffer.byteLength(JSON.stringify(event.canonicalPayload), 'utf8'),
      created_at: this.now().toISOString(),
    } satisfies ArticleContentSnapshot;
    if (snapshot.byte_size > this.config.CASIO_INLINE_SNAPSHOT_MAX_BYTES) {
      throw new CasioDispatchError('casio_snapshot_too_large', false);
    }
    const editorial = toCasioEditorialText(snapshot);
    if (!editorial.title.trim() || !editorial.textSnapshot.trim()) {
      throw new CasioDispatchError('casio_snapshot_content_missing', false);
    }
    if (event.flowKey !== CASIO_EDITORIAL_FLOW_KEY) {
      throw new CasioDispatchError('casio_unsupported_flow', false);
    }
    const invocation = {
      contract: 'casio.flow.invoke.v1',
      flowKey: CASIO_EDITORIAL_FLOW_KEY,
      flowVersion: 'published',
      sourceApp: this.config.CASIO_PLUS_INTEGRATION_KEY,
      sourceEntity: {
        type: 'article',
        id: event.articleId,
        snapshotId: event.snapshotId,
        contentRevision: event.contentRevision,
        contentSha256: event.contentSha256,
      },
      actor: {
        id: event.actorId,
        type: 'human',
        roles: event.actorRoles,
      },
      input: {
        language: editorial.language,
        title: editorial.title,
        textSnapshot: editorial.textSnapshot,
        requestedAction: 'editorial_suggestion',
        tone: 'academic',
        length: 'moderate',
      },
      requestId: event.requestId,
      idempotencyKey: event.idempotencyKey,
      expiresAt: new Date(this.now().getTime() + 4 * 60_000).toISOString(),
    } satisfies CasioFlowInvoke;
    const parsed = casioFlowInvokeSchema.safeParse(invocation);
    if (!parsed.success) throw new CasioDispatchError('casio_invocation_contract_invalid', false);
    return parsed.data;
  }

  async invoke(event: LeasedCasioOutboxEvent): Promise<{ runId: string }> {
    const { baseUrl, secret } = this.requireConfiguration();
    const body = JSON.stringify(this.toInvocation(event));
    const signature = createCasioSignatureHeaders({
      secret,
      keyId: this.config.CASIO_PLUS_SIGNING_KEY_ID,
      rawBody: body,
      now: this.now().getTime(),
    });
    const url = new URL(
      `/api/v1/integrations/${encodeURIComponent(this.config.CASIO_PLUS_INTEGRATION_KEY)}/flows/${encodeURIComponent(event.flowKey)}/invoke`,
      baseUrl,
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.CASIO_PLUS_HTTP_TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-casio-integration': this.config.CASIO_PLUS_INTEGRATION_KEY,
          'x-casio-key-id': signature.keyId,
          'x-casio-timestamp': signature.timestamp,
          'x-casio-nonce': signature.nonce,
          'x-casio-signature': signature.signature,
          'x-request-id': event.requestId,
          'idempotency-key': event.idempotencyKey,
        },
        body,
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw new CasioDispatchError(`casio_http_${response.status}`, retryable);
      }
      let decoded: unknown;
      try {
        decoded = JSON.parse(text);
      } catch {
        throw new CasioDispatchError('casio_response_invalid_json', false);
      }
      const accepted = casioFlowAcceptedSchema.safeParse(decoded);
      if (!accepted.success || accepted.data.contract !== CASIO_FLOW_ACCEPTED_CONTRACT) {
        throw new CasioDispatchError('casio_response_contract_invalid', false);
      }
      if (accepted.data.requestId !== event.requestId || accepted.data.idempotencyKey !== event.idempotencyKey) {
        throw new CasioDispatchError('casio_response_correlation_mismatch', false);
      }
      return { runId: accepted.data.runId };
    } catch (error) {
      if (error instanceof CasioDispatchError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new CasioDispatchError('casio_request_timeout', true);
      }
      throw new CasioDispatchError('casio_network_error', true);
    } finally {
      clearTimeout(timeout);
    }
  }
}
