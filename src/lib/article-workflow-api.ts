import type { ArticleStatus } from '@/lib/content-workflow';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');
const SESSION_STORAGE_KEY = 'kaghazbaad_session_token';

function getSessionToken() {
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
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
  if (token) window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  else window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
