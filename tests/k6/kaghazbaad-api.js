import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const EMAIL = __ENV.TEST_EMAIL || '';
const PASSWORD = __ENV.TEST_PASSWORD || '';
const ARTICLE_ID = __ENV.TEST_ARTICLE_ID || '';
const TOKEN = __ENV.TEST_TOKEN || '';

export const options = {
  scenarios: {
    steady_api: { executor: 'constant-vus', vus: Number(__ENV.VUS || 5), duration: __ENV.DURATION || '30s' },
    ai_burst: { executor: 'constant-arrival-rate', rate: Number(__ENV.AI_RATE || 2), timeUnit: '1s', duration: __ENV.AI_DURATION || '20s', preAllocatedVUs: 5, maxVUs: 20, startTime: '5s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
    api_429_rate: ['rate<0.30'],
    cache_hit_rate: ['rate>0.10'],
  },
};

const api429 = new Rate('api_429_rate');
const cacheHits = new Rate('cache_hit_rate');
const titleLatency = new Trend('title_suggestion_latency', true);
const titleRequests = new Counter('title_suggestion_requests');

function headers(token = TOKEN) {
  const result = { 'Content-Type': 'application/json', 'X-Request-Id': `k6-${__VU}-${__ITER}-${Date.now()}` };
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

export function setup() {
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health is 200': (response) => response.status === 200 });
  if (!TOKEN && (!EMAIL || !PASSWORD)) return { token: '', articleId: ARTICLE_ID };
  if (TOKEN) return { token: TOKEN, articleId: ARTICLE_ID };
  const login = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), { headers: headers('') });
  check(login, { 'login is successful': (response) => response.status === 200 });
  return { token: login.json('token') || '', articleId: ARTICLE_ID };
}

export default function (data) {
  const token = data.token || TOKEN;
  const quota = http.get(`${BASE_URL}/api/v1/me/quota?featureKey=ai.title_suggestions`, { headers: headers(token) });
  api429.add(quota.status === 429);
  check(quota, { 'quota endpoint responds': (response) => [200, 401, 403].includes(response.status) });

  if (data.articleId && token) {
    const started = Date.now();
    const title = http.post(`${BASE_URL}/api/v1/articles/${data.articleId}/title-suggestions`, JSON.stringify({ topic: 'تأثیر یادگیری ماشین بر تحلیل داده‌های اقلیمی', locale: 'fa', count: 3 }), { headers: headers(token), tags: { feature: 'ai.title_suggestions' } });
    titleLatency.add(Date.now() - started);
    titleRequests.add(1);
    api429.add(title.status === 429);
    if (title.status === 200) cacheHits.add(title.json('cacheHit') === true);
    check(title, { 'title status is valid': (response) => [200, 403, 429, 502, 503, 504].includes(response.status) });
  }
  sleep(1);
}
