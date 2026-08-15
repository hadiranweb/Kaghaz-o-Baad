export type BackendUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  roles?: string[];
};

export type BackendSession = {
  token: string;
  user: BackendUser;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');
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
  const response = await request<{ user: BackendUser; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
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
    await request('/auth/logout', { method: 'POST' });
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
