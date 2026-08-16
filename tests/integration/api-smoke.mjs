import assert from 'node:assert/strict';

const baseUrl = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
const articleId = process.env.TEST_ARTICLE_ID;
const suppliedToken = process.env.TEST_TOKEN;

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const health = await request('/health');
assert.equal(health.response.status, 200, 'health endpoint must be available');

let token = suppliedToken;
if (!token) {
  assert.ok(email && password, 'TEST_EMAIL and TEST_PASSWORD are required unless TEST_TOKEN is supplied');
  const login = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  assert.equal(login.response.status, 200, `login failed: ${JSON.stringify(login.body)}`);
  token = login.body.token;
}

const authHeaders = { Authorization: `Bearer ${token}` };
const quota = await request('/api/v1/me/quota?featureKey=ai.title_suggestions', { headers: authHeaders });
assert.ok([200, 403].includes(quota.response.status), `unexpected quota status: ${quota.response.status}`);

if (articleId) {
  const first = await request(`/api/v1/articles/${articleId}/title-suggestions`, {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ topic: 'تأثیر یادگیری ماشین بر تحلیل داده‌های اقلیمی', locale: 'fa', count: 3 }),
  });
  assert.ok([200, 403, 429, 502, 503, 504].includes(first.response.status), `unexpected title status: ${first.response.status}`);
  if (first.response.status === 200) {
    assert.ok(Array.isArray(first.body.suggestions), 'successful title response must contain suggestions');
    const second = await request(`/api/v1/articles/${articleId}/title-suggestions`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ topic: 'تأثیر یادگیری ماشین بر تحلیل داده‌های اقلیمی', locale: 'fa', count: 3 }),
    });
    assert.equal(second.response.status, 200, 'repeated title request should succeed or be cached');
    assert.equal(second.body.cacheHit, true, 'repeated identical request should be a cache hit');
  }
}

const report = await request('/api/v1/admin/usage-report', { headers: authHeaders });
assert.ok([200, 403].includes(report.response.status), `unexpected report status: ${report.response.status}`);
console.log(JSON.stringify({ ok: true, baseUrl, quotaStatus: quota.response.status, reportStatus: report.response.status }));
