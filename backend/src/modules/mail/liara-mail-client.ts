const MAIL_SERVER_ID = /^[0-9a-fA-F]{24}$/;
const ACCOUNT_ID = /^[0-9a-fA-F]{24}$/;
const ACCOUNT_NAME = /^[a-z0-9]+([.-][a-z0-9]+)*$/;

export type LiaraMailAccount = {
  id: string;
  name: string;
  createdAt?: string;
};

export type ProviderFailureKind = 'configuration' | 'invalid_request' | 'forbidden' | 'not_found' | 'conflict' | 'rate_limited' | 'transient' | 'unknown';

export class LiaraMailError extends Error {
  constructor(
    message: string,
    public readonly kind: ProviderFailureKind,
    public readonly status?: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = 'LiaraMailError';
  }
}

function assertMailServerId(value: string) {
  if (!MAIL_SERVER_ID.test(value)) throw new LiaraMailError('invalid_liara_mail_server_id', 'configuration');
}

function assertAccountId(value: string) {
  if (!ACCOUNT_ID.test(value)) throw new LiaraMailError('invalid_liara_mail_account_id', 'unknown');
}

function assertAccountName(value: string) {
  if (value.length < 1 || value.length > 64 || !ACCOUNT_NAME.test(value)) {
    throw new LiaraMailError('invalid_liara_mail_account_name', 'invalid_request');
  }
}

function classify(status: number): ProviderFailureKind {
  if (status === 400) return 'invalid_request';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'transient';
  return 'unknown';
}

function redactResponse(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.slice(0, 2_000);
  if (Array.isArray(value)) return value.slice(0, 20).map(redactResponse);
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (/token|secret|password|authorization/i.test(key)) continue;
      result[key] = redactResponse(entry);
    }
    return result;
  }
  return value;
}

export class LiaraMailClient {
  private readonly baseUrl: string;

  constructor(private readonly options: {
    baseUrl: string;
    token: string;
    timeoutMs: number;
  }) {
    if (!options.token) throw new LiaraMailError('liara_mail_api_token_missing', 'configuration');
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T | undefined }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.options.token}`,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...(init.headers ?? {}),
          },
        });
      } catch (error) {
        throw new LiaraMailError(error instanceof Error && error.name === 'AbortError' ? 'liara_mail_timeout' : 'liara_mail_network_error', 'transient');
      }
      const text = await response.text();
      let data: unknown;
      if (text.length > 0) {
        try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 2_000) }; }
      }
      if (!response.ok) {
        throw new LiaraMailError(`liara_mail_http_${response.status}`, classify(response.status), response.status, redactResponse(data));
      }
      return { status: response.status, data: data as T | undefined };
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkAvailability(mailServerId: string, accountName: string): Promise<{ status: string }> {
    assertMailServerId(mailServerId);
    assertAccountName(accountName);
    const result = await this.request<{ status: string }>(`/api/v1/mails/${mailServerId}/accounts/${encodeURIComponent(accountName)}/check-availability`);
    return result.data ?? { status: 'unknown' };
  }

  async createAccount(mailServerId: string, accountName: string): Promise<{ status: string }> {
    assertMailServerId(mailServerId);
    assertAccountName(accountName);
    const result = await this.request<{ status: string }>(`/api/v1/mails/${mailServerId}/accounts`, {
      method: 'POST',
      body: JSON.stringify({ name: accountName }),
    });
    return result.data ?? { status: 'created' };
  }

  async listAccounts(mailServerId: string): Promise<{ domain?: string; accounts: LiaraMailAccount[] }> {
    assertMailServerId(mailServerId);
    const result = await this.request<{ status?: string; data?: { domain?: string; accounts?: LiaraMailAccount[] } }>(`/api/v1/mails/${mailServerId}/accounts`);
    return { domain: result.data?.data?.domain, accounts: result.data?.data?.accounts ?? [] };
  }

  async deleteAccount(mailServerId: string, accountId: string): Promise<void> {
    assertMailServerId(mailServerId);
    assertAccountId(accountId);
    await this.request(`/api/v1/mails/${mailServerId}/accounts/${accountId}`, { method: 'DELETE' });
  }
}

export { assertAccountName, assertMailServerId, redactResponse };
