import type { AppEnv } from '../../config/env.js';

const CLOUDFLARE_BASE_URL = 'https://api.cloudflare.com/client/v4';
const RULE_DESCRIPTION = 'KaghazBaad: Open WebUI IP allowlist';
const RULESET_NAME = 'KaghazBaad Open WebUI Access Control';

type CloudflareEnvelope<T> = {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
};

type CloudflareList = { id: string; name: string; kind: string };
type CloudflareRule = { id: string; description?: string };
type CloudflareRuleset = { id: string; rules?: CloudflareRule[] };

export type AllowlistEdgeEntry = { cidr: string; label: string };
export type EdgeSyncResult = {
  listId: string;
  rulesetId: string;
  ruleId: string;
  operationId: string;
};

export class OpenWebUiEdgeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

export class OpenWebUiEdgeClient {
  constructor(
    private readonly env: AppEnv,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  isConfigured() {
    return Boolean(this.env.CLOUDFLARE_API_TOKEN && this.env.CLOUDFLARE_ACCOUNT_ID && this.env.CLOUDFLARE_ZONE_ID);
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new OpenWebUiEdgeError(
        'Cloudflare allowlist synchronization is not configured on the backend.',
        'cloudflare_not_configured',
      );
    }
    return {
      token: this.env.CLOUDFLARE_API_TOKEN!,
      accountId: this.env.CLOUDFLARE_ACCOUNT_ID!,
      zoneId: this.env.CLOUDFLARE_ZONE_ID!,
    };
  }

  private async request<T>(path: string, init: RequestInit = {}, options: { allowNotFound?: boolean } = {}): Promise<T | undefined> {
    const { token } = this.assertConfigured();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.CLOUDFLARE_HTTP_TIMEOUT_MS);
    try {
      const response = await this.fetcher(`${CLOUDFLARE_BASE_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
      if (response.status === 404 && options.allowNotFound) return undefined;
      let payload: CloudflareEnvelope<T> | undefined;
      try { payload = await response.json() as CloudflareEnvelope<T>; } catch { /* status is handled below */ }
      if (!response.ok || !payload?.success) {
        const message = payload?.errors?.map((error) => error.message).filter(Boolean).join('; ') || `Cloudflare returned HTTP ${response.status}.`;
        throw new OpenWebUiEdgeError(message, `cloudflare_http_${response.status}`, response.status === 429 || response.status >= 500);
      }
      return payload.result;
    } catch (error) {
      if (error instanceof OpenWebUiEdgeError) throw error;
      const aborted = error instanceof Error && error.name === 'AbortError';
      throw new OpenWebUiEdgeError(
        aborted ? 'Cloudflare request timed out.' : 'Cloudflare request failed.',
        aborted ? 'cloudflare_timeout' : 'cloudflare_network_error',
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private ruleExpression() {
    return `(http.host eq "${this.env.OPENWEBUI_EDGE_HOST}" and not ip.src in $${this.env.OPENWEBUI_EDGE_ALLOWLIST_NAME})`;
  }

  private rulePayload() {
    return {
      description: RULE_DESCRIPTION,
      expression: this.ruleExpression(),
      action: 'block',
      enabled: true,
      logging: { enabled: true },
      action_parameters: {
        response: {
          status_code: 403,
          content: 'Open WebUI access is restricted to approved network addresses.',
          content_type: 'text/plain',
        },
      },
    };
  }

  private async ensureIpList(existingListId?: string | null) {
    const { accountId } = this.assertConfigured();
    if (existingListId) return existingListId;
    const lists = await this.request<CloudflareList[]>(`/accounts/${accountId}/rules/lists`);
    const existing = lists?.find((list) => list.name === this.env.OPENWEBUI_EDGE_ALLOWLIST_NAME && list.kind === 'ip');
    if (existing) return existing.id;
    const created = await this.request<CloudflareList>(`/accounts/${accountId}/rules/lists`, {
      method: 'POST',
      body: JSON.stringify({
        name: this.env.OPENWEBUI_EDGE_ALLOWLIST_NAME,
        description: 'KaghazBaad Open WebUI administrator IP allowlist',
        kind: 'ip',
      }),
    });
    if (!created?.id) throw new OpenWebUiEdgeError('Cloudflare did not return a list id.', 'cloudflare_list_create_incomplete');
    return created.id;
  }

  private async replaceListItems(listId: string, entries: AllowlistEdgeEntry[]) {
    const { accountId } = this.assertConfigured();
    const result = await this.request<{ operation_id?: string }>(`/accounts/${accountId}/rules/lists/${listId}/items`, {
      method: 'PUT',
      body: JSON.stringify(entries.map((entry) => ({ ip: entry.cidr, comment: entry.label || 'KaghazBaad Open WebUI admin allowlist' }))),
    });
    if (!result?.operation_id) throw new OpenWebUiEdgeError('Cloudflare did not return a list operation id.', 'cloudflare_list_operation_incomplete');
    return result.operation_id;
  }

  private async waitForBulkOperation(operationId: string) {
    const { accountId } = this.assertConfigured();
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const operation = await this.request<{ status?: string }>(`/accounts/${accountId}/rules/lists/bulk_operations/${operationId}`);
      const status = operation?.status?.toLowerCase();
      if (status === 'completed') return;
      if (status === 'failed') throw new OpenWebUiEdgeError('Cloudflare rejected the allowlist item update.', 'cloudflare_list_operation_failed');
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    throw new OpenWebUiEdgeError('Cloudflare allowlist update did not finish in time.', 'cloudflare_list_operation_timeout', true);
  }

  private async ensureWafRule(existingRulesetId?: string | null, existingRuleId?: string | null) {
    const { zoneId } = this.assertConfigured();
    const knownEntryPoint = existingRulesetId
      ? await this.request<CloudflareRuleset>(`/zones/${zoneId}/rulesets/${existingRulesetId}`, {}, { allowNotFound: true })
      : await this.request<CloudflareRuleset>(`/zones/${zoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`, {}, { allowNotFound: true });
    const ruleset = knownEntryPoint;
    const managedRule = ruleset?.rules?.find((rule) => rule.id === existingRuleId)
      ?? ruleset?.rules?.find((rule) => rule.description === RULE_DESCRIPTION);

    if (ruleset?.id && managedRule?.id) {
      await this.request(`/zones/${zoneId}/rulesets/${ruleset.id}/rules/${managedRule.id}`, {
        method: 'PUT',
        body: JSON.stringify(this.rulePayload()),
      });
      return { rulesetId: ruleset.id, ruleId: managedRule.id };
    }

    if (ruleset?.id) {
      const createdRule = await this.request<CloudflareRule>(`/zones/${zoneId}/rulesets/${ruleset.id}/rules`, {
        method: 'POST',
        body: JSON.stringify(this.rulePayload()),
      });
      if (!createdRule?.id) throw new OpenWebUiEdgeError('Cloudflare did not return a WAF rule id.', 'cloudflare_rule_create_incomplete');
      return { rulesetId: ruleset.id, ruleId: createdRule.id };
    }

    const createdRuleset = await this.request<CloudflareRuleset>(`/zones/${zoneId}/rulesets`, {
      method: 'POST',
      body: JSON.stringify({
        name: RULESET_NAME,
        description: 'Host-specific IP allowlist for KaghazBaad Open WebUI',
        kind: 'zone',
        phase: 'http_request_firewall_custom',
        rules: [this.rulePayload()],
      }),
    });
    const createdRule = createdRuleset?.rules?.find((rule) => rule.description === RULE_DESCRIPTION);
    if (!createdRuleset?.id || !createdRule?.id) {
      throw new OpenWebUiEdgeError('Cloudflare did not return the created WAF rule metadata.', 'cloudflare_ruleset_create_incomplete');
    }
    return { rulesetId: createdRuleset.id, ruleId: createdRule.id };
  }

  async synchronize(input: {
    entries: AllowlistEdgeEntry[];
    listId?: string | null;
    rulesetId?: string | null;
    ruleId?: string | null;
  }): Promise<EdgeSyncResult> {
    if (input.entries.length === 0) {
      throw new OpenWebUiEdgeError('At least one enabled IP or CIDR is required before applying the edge allowlist.', 'empty_allowlist');
    }
    const listId = await this.ensureIpList(input.listId);
    const operationId = await this.replaceListItems(listId, input.entries);
    await this.waitForBulkOperation(operationId);
    const rule = await this.ensureWafRule(input.rulesetId, input.ruleId);
    return { listId, rulesetId: rule.rulesetId, ruleId: rule.ruleId, operationId };
  }
}
