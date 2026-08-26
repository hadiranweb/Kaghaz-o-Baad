export type BackendUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  roles?: string[];
  phone?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  has_verified_factor?: boolean;
};

export type BackendSession = {
  token: string;
  user: BackendUser;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://api.kaghazobaad.ir/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'kaghazbaad_backend_session_token';

function token() {
  return window.localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const currentToken = token();
  if (currentToken) headers.set('Authorization', `Bearer ${currentToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof payload?.error === 'string' ? payload.error : 'auth_request_failed');
    Object.assign(error, { status: response.status, code: payload?.error });
    throw error;
  }
  return payload as T;
}

export async function register(input: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  const response = await request<{ user: BackendUser; token: string } | { pending: true; expires_in_seconds: number }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if ('pending' in response) return response;
  setToken(response.token);
  return { user: response.user, token: response.token };
}

export async function sendPhoneCode(phone: string) {
  return request<{ ok: true; expires_in_seconds: number }>('/auth/phone/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyPhoneCode(phone: string, code: string) {
  const response = await request<{ user: BackendUser; token: string }>('/auth/phone/verify-code', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  setToken(response.token);
  return { user: response.user, token: response.token };
}

export async function sendPhoneFactorCode(phone: string) {
  return request<{ ok: true; expires_in_seconds: number }>('/auth/phone/verify-factor/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyPhoneFactor(phone: string, code: string) {
  return request<{ ok: true; phone: string; phone_verified: true }>('/auth/phone/verify-factor', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

export async function verifyEmail(tokenValue: string) {
  const response = await request<{ user: BackendUser; token: string }>(`/auth/verify-email?token=${encodeURIComponent(tokenValue)}`);
  setToken(response.token);
  return { user: response.user, token: response.token };
}

export async function login(email: string, password: string) {
  const response = await request<{ user: BackendUser; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(response.token);
  return { user: response.user, token: response.token };
}

export function oauthStartUrl(provider: 'google' | 'github', next = '/dashboard') {
  const params = new URLSearchParams({ next });
  return `${API_BASE_URL}/auth/oauth/${provider}/start?${params.toString()}`;
}

export async function exchangeOAuthTicket(ticket: string) {
  const response = await request<{ token: string }>('/auth/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ ticket }),
  });
  setToken(response.token);
  return currentUser();
}

export async function currentUser() {
  const response = await request<{ user: BackendUser }>('/auth/me');
  return response.user;
}

export async function changePassword(password: string) {
  return request<{ ok: true }>('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST', body: '{}' });
  } finally {
    setToken(null);
  }
}

export function setToken(value: string | null) {
  if (value) window.localStorage.setItem(TOKEN_KEY, value);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return token();
}
