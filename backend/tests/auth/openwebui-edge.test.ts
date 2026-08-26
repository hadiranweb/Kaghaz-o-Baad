import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEnv, type AppEnv } from '../../src/config/env.js';
import { OpenWebUiEdgeClient, OpenWebUiEdgeError } from '../../src/modules/admin/openwebui-edge-client.js';

function edgeEnv(overrides: NodeJS.ProcessEnv = {}): AppEnv {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/kaghazbaad_test',
    CLOUDFLARE_API_TOKEN: 'test-token-abcdefghijklmnopqrstuvwxyz',
    CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
    CLOUDFLARE_ZONE_ID: 'b'.repeat(32),
    ...overrides,
  });
}

test('Open WebUI edge adapter refuses a sync when backend-only Cloudflare config is absent', async () => {
  const client = new OpenWebUiEdgeClient(edgeEnv({
    CLOUDFLARE_API_TOKEN: undefined,
    CLOUDFLARE_ACCOUNT_ID: undefined,
    CLOUDFLARE_ZONE_ID: undefined,
  }));
  assert.equal(client.isConfigured(), false);
  await assert.rejects(
    () => client.synchronize({ entries: [{ cidr: '203.0.113.24/32', label: 'HQ' }] }),
    (error: unknown) => error instanceof OpenWebUiEdgeError && error.code === 'cloudflare_not_configured',
  );
});

test('Open WebUI edge adapter creates a public-IP list, waits for the asynchronous replacement, and scopes the WAF rule to the AI host', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    { status: 200, body: { success: true, result: [] } },
    { status: 200, body: { success: true, result: { id: 'c'.repeat(32), name: 'kaghazbaad_openwebui_admin_ips', kind: 'ip' } } },
    { status: 200, body: { success: true, result: { operation_id: 'operation-1' } } },
    { status: 200, body: { success: true, result: { status: 'completed' } } },
    { status: 404, body: { success: false, errors: [{ message: 'not found' }] } },
    { status: 200, body: { success: true, result: { id: 'd'.repeat(32), rules: [{ id: 'e'.repeat(32), description: 'KaghazBaad: Open WebUI IP allowlist' }] } } },
  ];
  const mockFetch: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    const next = responses.shift();
    assert.ok(next, 'unexpected Cloudflare request');
    return new Response(JSON.stringify(next.body), { status: next.status, headers: { 'content-type': 'application/json' } });
  };
  const client = new OpenWebUiEdgeClient(edgeEnv(), mockFetch);

  const result = await client.synchronize({ entries: [{ cidr: '203.0.113.24/32', label: 'HQ' }] });

  assert.deepEqual(result, {
    listId: 'c'.repeat(32),
    rulesetId: 'd'.repeat(32),
    ruleId: 'e'.repeat(32),
    operationId: 'operation-1',
  });
  assert.equal(requests[0]?.url, `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/rules/lists`);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
    name: 'kaghazbaad_openwebui_admin_ips',
    description: 'KaghazBaad Open WebUI administrator IP allowlist',
    kind: 'ip',
  });
  assert.deepEqual(JSON.parse(String(requests[2]?.init?.body)), [
    { ip: '203.0.113.24/32', comment: 'HQ' },
  ]);
  const rulesetBody = JSON.parse(String(requests[5]?.init?.body));
  assert.equal(rulesetBody.rules[0].action, 'block');
  assert.equal(rulesetBody.rules[0].expression, '(http.host eq "ai.kaghazobaad.ir" and not ip.src in $kaghazbaad_openwebui_admin_ips)');
  assert.equal(new Headers(requests[5]?.init?.headers).get('authorization'), 'Bearer test-token-abcdefghijklmnopqrstuvwxyz');
});
