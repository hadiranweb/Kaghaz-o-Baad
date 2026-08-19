import type { ArticleStatus } from '@/lib/content-workflow';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://api.kaghazobaad.ir/api/v1').replace(/\/$/, '');
import { getToken } from './auth-api';

function getSessionToken() {
  return getToken();
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'api_request_failed');
  }
  return payload as T;
}

export type WorkflowTransitionResult = {
  articleId: string;
  fromStatus: ArticleStatus;
  toStatus: ArticleStatus;
  eventId: string;
  actorId: string;
};

export async function transitionArticle(input: {
  articleId: string;
  action: string;
  note?: string;
  metadata?: Record<string, unknown>;
}) {
  const data = await apiRequest<{ ok: true; transition: WorkflowTransitionResult }>(
    `/articles/${input.articleId}/workflow`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return data.transition;
}

export type Subscription = {
  id: string;
  plan_id: string;
  plan_key: string;
  status: 'active' | 'past_due' | 'grace' | 'cancelled' | 'expired';
  billing_period: 'monthly' | 'quarterly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  grace_period_end?: string | null;
  auto_renew: boolean;
  cancel_at_period_end: boolean;
};

export async function getSubscription() {
  const data = await apiRequest<{ ok: true; subscription: Subscription | null }>('/billing/subscription');
  return data.subscription;
}

export async function cancelSubscription(immediate = false) {
  const data = await apiRequest<{ ok: true; subscription: Subscription }>('/billing/subscription/cancel', { method: 'POST', body: JSON.stringify({ immediate }) });
  return data.subscription;
}

export async function renewSubscription() {
  const data = await apiRequest<{ ok: true; subscription: Subscription }>('/billing/subscription/renew', { method: 'POST', body: '{}' });
  return data.subscription;
}

export type Invoice = {
  id: string;
  invoice_number: string;
  status: 'draft' | 'issued' | 'paid' | 'void' | 'expired';
  currency: string;
  subtotal_minor: string;
  discount_minor: string;
  total_minor: string;
  plan_key?: string;
};

export async function createInvoice(input: { planKey: string; amountMinor: number; currency: string; description: string }) {
  const data = await apiRequest<{ ok: true; invoice: Invoice }>('/billing/invoices', { method: 'POST', body: JSON.stringify(input) });
  return data.invoice;
}

export async function createPaymentAttempt(input: { invoiceId: string; provider: 'zarinpal' | 'idpay' | 'sandbox'; idempotencyKey: string }) {
  const data = await apiRequest<{ ok: true; paymentAttempt: Record<string, unknown> }>('/billing/payment-attempts', { method: 'POST', body: JSON.stringify(input) });
  return data.paymentAttempt;
}

export type UsageReport = {
  period: { from: string; to: string };
  totals: {
    requests: number;
    cacheHits: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    providerCostMinor: number;
    estimatedSavingsMinor: number;
  };
  rows: Array<{
    provider: string;
    model: string;
    feature_key: string;
    requests: number;
    cache_hits: number;
    input_tokens: number;
    output_tokens: number;
    cached_tokens: number;
    provider_cost_minor: number;
    estimated_savings_minor: number;
  }>;
};

export async function getAdminUsageReport(input: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams();
  if (input.from) query.set('from', input.from);
  if (input.to) query.set('to', input.to);
  const data = await apiRequest<{ ok: true } & UsageReport>(`/admin/usage-report?${query.toString()}`);
  return data;
}

export type QuotaStatus = {
  configured: boolean;
  featureKey: string;
  planKey?: string;
  planNameFa?: string;
  period?: 'daily' | 'monthly' | 'lifetime';
  periodStart?: string;
  periodEnd?: string | null;
  limit?: number;
  used?: number;
  reserved?: number;
  remaining?: number;
  exhaustionPolicy?: 'deny' | 'allow_overage';
};

export async function getMyQuota(featureKey = 'ai.title_suggestions') {
  const data = await apiRequest<{ ok: true; quota: QuotaStatus }>(
    `/me/quota?featureKey=${encodeURIComponent(featureKey)}`,
  );
  return data.quota;
}

export type TitleSuggestion = {
  title: string;
  rationale?: string;
  keywords?: string[];
};

export async function suggestArticleTitles(input: {
  articleId: string;
  topic: string;
  locale?: 'fa' | 'en';
  count?: number;
}) {
  const data = await apiRequest<{
    ok: true;
    cacheHit?: boolean;
    requestId: string;
    usageId?: string;
    provider: string;
    model: string;
    suggestions: TitleSuggestion[];
  }>(
    `/articles/${input.articleId}/title-suggestions`,
    {
      method: 'POST',
      body: JSON.stringify({ topic: input.topic, locale: input.locale ?? 'fa', count: input.count }),
    },
  );
  return data;
}

export type ArticleComment = {
  id: string;
  article_id: string;
  author_id: string | null;
  source: 'human' | 'ai';
  status: 'open' | 'accepted' | 'rejected' | 'resolved';
  body: string;
  suggested_text: string | null;
  anchor: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export async function createArticleComment(input: {
  articleId: string;
  body: string;
  source?: 'human' | 'ai';
  suggestedText?: string;
  anchor?: Record<string, unknown>;
}) {
  const data = await apiRequest<{ ok: true; comment: ArticleComment }>(
    `/articles/${input.articleId}/comments`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return data.comment;
}

export async function resolveArticleComment(input: {
  commentId: string;
  status: ArticleComment['status'];
}) {
  const data = await apiRequest<{ ok: true; comment: ArticleComment }>(
    `/comments/${input.commentId}`,
    { method: 'PATCH', body: JSON.stringify({ status: input.status }) },
  );
  return data.comment;
}

export function setBackendSessionToken(token: string | null) {
  if (token) window.localStorage.setItem('kaghazbaad_backend_session_token', token);
  else window.localStorage.removeItem('kaghazbaad_backend_session_token');
}
