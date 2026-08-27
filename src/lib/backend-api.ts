import { getToken } from './auth-api';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://api.kaghazobaad.ir/api/v1').replace(/\/$/, '');

export type ApiError = Error & { status?: number; code?: string };

export async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const currentToken = getToken();
  if (currentToken) headers.set('Authorization', `Bearer ${currentToken}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof payload?.error === 'string' ? payload.error : 'backend_request_failed') as ApiError;
    error.status = response.status;
    error.code = payload?.error;
    throw error;
  }
  return payload as T;
}

export type BackendProfile = {
  id: string;
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  metadata?: Record<string, unknown>;
};

export type BackendMedia = {
  id: string;
  owner_id?: string | null;
  created_by?: string | null;
  type: string;
  title: string;
  description: string;
  file_path?: string | null;
  public_url?: string | null;
  visibility: 'private' | 'public';
  metadata: Record<string, unknown>;
  file_size: number;
  created_at: string;
  updated_at: string;
};

export type BackendProjectDescription = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type BackendSlide = {
  id: string;
  article_id: string;
  owner_id: string;
  title: string;
  content: Record<string, unknown>;
  sort_order: number;
};

export type BackendLiveSession = {
  id: string;
  host_id?: string | null;
  title: string;
  description: string;
  room_name: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  metadata: Record<string, unknown>;
  starts_at?: string | null;
  ends_at?: string | null;
};

export function getProfile() {
  return backendRequest<{ ok: true; profile: BackendProfile | null }>('/me/profile');
}

export function saveProfile(input: Partial<Pick<BackendProfile, 'first_name' | 'last_name' | 'phone' | 'bio' | 'avatar_url' | 'metadata'>>) {
  return backendRequest<{ ok: true; profile: BackendProfile }>('/me/profile', {
    method: 'PUT',
    body: JSON.stringify({
      firstName: input.first_name,
      lastName: input.last_name,
      phone: input.phone,
      bio: input.bio,
      avatarUrl: input.avatar_url,
      metadata: input.metadata,
    }),
  });
}

export function getStorageUsage() {
  return backendRequest<{ ok: true; usedBytes: number }>('/me/storage');
}

export function createMediaUploadUrl(input: { fileName: string; contentType: string; type: string }) {
  return backendRequest<{ ok: true; uploadUrl: string; publicUrl: string; key: string }>('/media/upload-url', { method: 'POST', body: JSON.stringify(input) });
}

export function listMedia(params: { type?: string; visibility?: 'public' | 'private'; mine?: boolean } = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.visibility) query.set('visibility', params.visibility);
  if (params.mine) query.set('mine', 'true');
  return backendRequest<{ ok: true; media: BackendMedia[] }>(`/media${query.size ? `?${query}` : ''}`);
}

export function createMedia(input: Record<string, unknown>) {
  return backendRequest<{ ok: true; media: BackendMedia }>('/media', { method: 'POST', body: JSON.stringify(input) });
}

export function updateMedia(id: string, input: Record<string, unknown>) {
  return backendRequest<{ ok: true; media: BackendMedia }>(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteMedia(id: string) {
  return backendRequest<void>(`/media/${id}`, { method: 'DELETE' });
}

export function listProjectDescriptions() {
  return backendRequest<{ ok: true; descriptions: BackendProjectDescription[] }>('/projects/descriptions');
}

export function createProjectDescription(input: { title?: string; description?: string; metadata?: Record<string, unknown> }) {
  return backendRequest<{ ok: true; description: BackendProjectDescription }>('/projects/descriptions', { method: 'POST', body: JSON.stringify(input) });
}

export function deleteProjectDescription(id: string) {
  return backendRequest<void>(`/projects/descriptions/${id}`, { method: 'DELETE' });
}

export function listArticleSlides(articleId: string) {
  return backendRequest<{ ok: true; slides: BackendSlide[] }>(`/articles/${articleId}/slides`);
}

export function createArticleSlide(articleId: string, input: { title?: string; content?: Record<string, unknown>; sortOrder?: number }) {
  return backendRequest<{ ok: true; slide: BackendSlide }>(`/articles/${articleId}/slides`, { method: 'POST', body: JSON.stringify(input) });
}

export function listLiveSessions() {
  return backendRequest<{ ok: true; sessions: BackendLiveSession[] }>('/live-sessions');
}

export function createLiveSession(input: Record<string, unknown>) {
  return backendRequest<{ ok: true; session: BackendLiveSession }>('/live-sessions', { method: 'POST', body: JSON.stringify(input) });
}

export type LiveRoomParticipant = {
  sid: string;
  identity: string;
  name?: string;
  state?: string;
  permission?: Record<string, boolean>;
  tracks?: Array<{ sid?: string; source?: string; muted?: boolean; name?: string }>;
};

export function ensureLiveRoom(sessionId: string, maxParticipants = 500) {
  return backendRequest<{ ok: true; room: { name: string; sid: string; metadata?: string; max_participants?: number } }>(`/live/sessions/${sessionId}/room`, {
    method: 'POST',
    body: JSON.stringify({ maxParticipants }),
  });
}

export type LiveSessionRoleAssignment = {
  session_id: string;
  user_id: string;
  role: 'speaker' | 'viewer';
  granted_by?: string | null;
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function listLiveSessionRoles(sessionId: string) {
  return backendRequest<{ ok: true; host: { user_id: string; role: 'host' } | null; participants: LiveSessionRoleAssignment[] }>(`/live/sessions/${sessionId}/roles`);
}

export function assignLiveSessionRole(sessionId: string, userId: string, role: 'speaker' | 'viewer') {
  return backendRequest<{ ok: true; assignment: LiveSessionRoleAssignment }>(`/live/sessions/${sessionId}/roles/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export function revokeLiveSessionRole(sessionId: string, userId: string) {
  return backendRequest<{ ok: true; role: 'viewer' }>(`/live/sessions/${sessionId}/roles/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export type LiveInteractionType = 'chat' | 'question' | 'reaction' | 'hand_raise';
export type LiveInteraction = {
  id: string;
  session_id: string;
  user_id: string | null;
  interaction_type: LiveInteractionType;
  payload: Record<string, unknown>;
  created_at: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export function createLiveInteraction(sessionId: string, type: LiveInteractionType, payload: Record<string, unknown> = {}) {
  return backendRequest<{ ok: true; interaction: LiveInteraction }>(`/live/sessions/${sessionId}/interactions`, {
    method: 'POST',
    body: JSON.stringify({ type, payload }),
  });
}

export function listLiveInteractions(sessionId: string) {
  return backendRequest<{ ok: true; interactions: LiveInteraction[] }>(`/live/sessions/${sessionId}/interactions`);
}

export function listLiveRoomParticipants(sessionId: string) {
  return backendRequest<{ ok: true; participants: LiveRoomParticipant[] }>(`/live/sessions/${sessionId}/participants`);
}

export type LiveRecording = {
  id: string;
  session_id: string;
  egress_id: string;
  output_type: 'mp4' | 'audio';
  status: 'starting' | 'active' | 'completed' | 'failed' | 'stopped';
  object_key: string | null;
  object_url: string | null;
  duration_seconds: string | null;
  file_size_bytes: string | null;
  mime_type: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export function startLiveRecording(sessionId: string, outputType: 'mp4' | 'audio' = 'mp4') {
  return backendRequest<{ ok: true; recording: LiveRecording }>(`/live/sessions/${sessionId}/recordings`, {
    method: 'POST',
    body: JSON.stringify({ outputType }),
  });
}

export function stopLiveRecording(sessionId: string, egressId: string) {
  return backendRequest<{ ok: true; status: string }>(`/live/sessions/${sessionId}/recordings/${encodeURIComponent(egressId)}/stop`, { method: 'POST' });
}

export function listLiveRecordings(sessionId: string) {
  return backendRequest<{ ok: true; recordings: LiveRecording[] }>(`/live/sessions/${sessionId}/recordings`);
}

export function removeLiveRoomParticipant(sessionId: string, identity: string) {
  return backendRequest<{ ok: true }>(`/live/sessions/${sessionId}/participants/${encodeURIComponent(identity)}`, { method: 'DELETE' });
}

export function muteLiveRoomParticipant(sessionId: string, identity: string, input: { trackSid: string; muted: boolean }) {
  return backendRequest<{ ok: true; track: unknown }>(`/live/sessions/${sessionId}/participants/${encodeURIComponent(identity)}/mute`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteLiveSession(id: string) {
  return backendRequest<void>(`/live-sessions/${id}`, { method: 'DELETE' });
}

export function listTranslations() {
  return backendRequest<{ ok: true; translations: Array<{ key: string; en: string; fa: string }> }>('/translations');
}

export type BackendArticleCard = {
  id: string;
  slug: string;
  title_fa: string;
  title_en: string;
  summary_fa: string;
  summary_en: string;
  cover_url?: string | null;
  tags: string[];
  categories: string[];
  status: string;
  author_id?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export function listPublicArticles(params: { q?: string; cursorTime?: string; cursorId?: string; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.cursorTime) query.set('cursorTime', params.cursorTime);
  if (params.cursorId) query.set('cursorId', params.cursorId);
  if (params.limit) query.set('limit', String(params.limit));
  return backendRequest<{ ok: true; articles: BackendArticleCard[]; hasMore: boolean }>(`/public/articles?${query}`);
}

export function listPublicProfiles(ids: string[]) {
  return backendRequest<{ ok: true; profiles: Array<BackendProfile & { metadata?: Record<string, unknown> }> }>(`/public/profiles?ids=${ids.join(',')}`);
}

export function publishArticle(articleId: string) {
  return backendRequest<{ ok: true; article: BackendArticleCard }>(`/articles/${articleId}/workflow`, {
    method: 'POST',
    body: JSON.stringify({ action: 'publish', note: 'published_from_read_page' }),
  });
}

export type BackendComment = {
  id: string;
  article_id: string;
  author_id?: string | null;
  source: 'human' | 'ai';
  status: 'open' | 'accepted' | 'rejected' | 'resolved';
  body: string;
  suggested_text?: string | null;
  anchor: Record<string, unknown>;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
};

export function listArticleComments(articleId: string) {
  return backendRequest<{ ok: true; comments: BackendComment[] }>(`/articles/${articleId}/comments`);
}

export function createArticleComment(articleId: string, body: string) {
  return backendRequest<{ ok: true; comment: BackendComment }>(`/articles/${articleId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, source: 'human' }),
  });
}

export function deleteArticleComment(commentId: string) {
  return backendRequest<void>(`/comments/${commentId}`, { method: 'DELETE' });
}

export function getPublicArticleBySlug(slug: string) {
  return backendRequest<{ ok: true; article: BackendArticleCard & { author_id?: string | null } }>(`/public/articles/by-slug/${encodeURIComponent(slug)}`);
}

export function rewriteArticle(input: { source: string; tone: string; targetLang: 'fa' | 'en'; length: string; customPrompt?: string; articleId?: string }) {
  return backendRequest<{ ok: true; content: string; requestId: string; usageId?: string; provider: string; model: string }>('/ai/rewrite', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listCommunityProfiles() {
  return backendRequest<{ ok: true; profiles: Array<BackendProfile & { metadata?: Record<string, unknown> }> }>('/public/profiles?community=true');
}

export function listArticles() {
  return backendRequest<{ ok: true; articles: BackendArticleCard[] }>('/articles');
}

export function createArticle(input: { slug: string; titleFa: string; titleEn?: string; contentFa?: string; contentEn?: string }) {
  return backendRequest<{ ok: true; article: BackendArticleCard }>('/articles', { method: 'POST', body: JSON.stringify(input) });
}

export function updateArticle(articleId: string, input: Partial<{ slug: string; titleFa: string; titleEn: string; contentFa: string; contentEn: string }>) {
  return backendRequest<{ ok: true; article: BackendArticleCard }>(`/articles/${articleId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteArticle(articleId: string) {
  return backendRequest<void>(`/articles/${articleId}`, { method: 'DELETE' });
}

export function createSlide(articleId: string, input: { title?: string; content?: Record<string, unknown>; sortOrder?: number }) {
  return backendRequest<{ ok: true; slide: BackendSlide }>(`/articles/${articleId}/slides`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSlide(slideId: string, input: { title?: string; content?: Record<string, unknown>; sortOrder?: number }) {
  return backendRequest<{ ok: true; slide: BackendSlide }>(`/slides/${slideId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSlide(slideId: string) {
  return backendRequest<void>(`/slides/${slideId}`, { method: 'DELETE' });
}

export function updateProjectDescription(id: string, input: { title?: string; description?: string; metadata?: Record<string, unknown> }) {
  return backendRequest<{ ok: true; description: BackendProjectDescription }>(`/projects/descriptions/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function getLiveKitToken(sessionId: string) {
  return backendRequest<{
    ok: true;
    token: string;
    url: string;
    room: string;
    role: 'host' | 'speaker' | 'viewer';
    identity: string;
    name: string;
    session_status?: string;
    e2ee_enabled?: boolean;
    article_id?: string | null;
    presentation_enabled?: boolean;
    presentation_media_id?: string | null;
    presentation_url?: string | null;
    presentation_name?: string | null;
    presentation_kind?: 'pdf' | 'image' | 'pptx' | 'other' | null;
  }>(`/live/sessions/${sessionId}/token`, { method: 'POST', body: '{}' });
}

export function getLiveSession(id: string) {
  return backendRequest<{ ok: true; session: BackendLiveSession }>(`/live-sessions/${id}`);
}

export function updateLiveSessionStatus(id: string, status: BackendLiveSession['status']) {
  return backendRequest<{ ok: true; session: BackendLiveSession }>(`/live-sessions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function updateLiveSession(id: string, input: Record<string, unknown>) {
  return backendRequest<{ ok: true; session: BackendLiveSession }>(`/live-sessions/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export type AdminUserRecord = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  roles: string[];
  profile: { first_name?: string; last_name?: string; phone?: string } | null;
};

export function adminUsers(input: Record<string, unknown>) {
  return backendRequest<{ ok: true; users?: AdminUserRecord[]; forcedPasswordChange?: boolean }>('/admin/users', { method: 'POST', body: JSON.stringify(input) });
}

export type BackendCircuitBreaker = {
  service_name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failure_count: number;
  last_failure_at: string | null;
  opened_at: string | null;
  cooldown_seconds: number;
  updated_at: string;
};

export function listCircuitBreakers() {
  return backendRequest<{ ok: true; breakers: BackendCircuitBreaker[] }>('/admin/circuit-breakers');
}

export function resetCircuitBreaker(service: string) {
  return backendRequest<{ ok: true }>('/admin/circuit-breakers/reset', { method: 'POST', body: JSON.stringify({ service }) });
}

export function tripCircuitBreakerTest(service: string) {
  return backendRequest<{ ok: true }>('/admin/circuit-breakers/trip-test', { method: 'POST', body: JSON.stringify({ service }) });
}

export type BackendArticleAiProposal = {
  id: string;
  article_id: string;
  snapshot_id: string;
  invocation_id: string;
  suggestion_index: number;
  proposal_type: 'rewrite' | 'annotation' | 'checklist';
  anchor: { start?: number; end?: number };
  original_text?: string | null;
  suggested_text?: string | null;
  reason: string;
  confidence?: string | number | null;
  state: 'pending_review' | 'accepted' | 'rejected' | 'edited' | 'stale';
  flow_key: string;
  flow_version: string;
  casio_run_id: string;
  artifact_refs: string[];
  memory_refs: string[];
  provenance: Record<string, unknown>;
  snapshot_content_revision: string | number;
  created_at: string;
  updated_at: string;
};

export function requestArticleEditorialSuggestion(articleId: string) {
  return backendRequest<{
    ok: true;
    invocation: { id: string; state: string; requestId: string; idempotencyKey: string; flowKey: string };
    snapshot: { id: string; contentRevision: number };
    idempotent: boolean;
  }>(`/articles/${articleId}/ai/editorial-suggestion`, { method: 'POST', body: '{}' });
}

export function listArticleAiProposals(articleId: string) {
  return backendRequest<{
    ok: true;
    article: { id: string; contentRevision: string | number; status: string };
    proposals: BackendArticleAiProposal[];
  }>(`/articles/${articleId}/ai/proposals`);
}

export function decideArticleAiProposal(proposalId: string, input: { decision: 'accepted' | 'rejected' | 'edited'; note?: string }) {
  return backendRequest<{ ok: true; proposal: BackendArticleAiProposal }>(`/article-ai/proposals/${proposalId}/decision`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getCasioIntegrationStatus() {
  return backendRequest<{
    ok: true;
    enabled: boolean;
    workerEnabled: boolean;
    outbox: { pending: number; leased: number; delivered: number; deadLetter: number; oldestPendingAt: string | null };
  }>('/admin/integrations/casio/status');
}
