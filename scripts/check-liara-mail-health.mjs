#!/usr/bin/env node

const baseUrl = (process.env.LIARA_MAIL_API_BASE_URL ?? 'https://mail-service.iran.liara.ir').replace(/\/$/, '');
const token = process.env.LIARA_MAIL_API_TOKEN;
const mailServerId = process.env.LIARA_MAIL_SERVER_ID;
const workerHealthUrl = process.env.WORKER_HEALTH_URL;
const accountName = process.env.LIARA_MAIL_ACCOUNT_NAME;
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 15_000);

function required(name, value) {
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

function assertHexId(name, value) {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) throw new Error(`invalid_environment:${name}`);
  return value;
}

function safeBody(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value.slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 10).map(safeBody);
  if (typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      if (/token|secret|password|authorization/i.test(key)) continue;
      result[key] = safeBody(entry);
    }
    return result;
  }
  return value;
}

async function getJson(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json', ...headers },
        signal: controller.signal,
      });
    } catch (error) {
      throw new Error(error?.name === 'AbortError' ? `timeout:${url}` : `network_error:${url}`);
    }
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
    return { ok: response.ok, status: response.status, elapsedMs: Date.now() - started, body: safeBody(body) };
  } finally {
    clearTimeout(timeout);
  }
}

function printCheck(name, result) {
  console.log(JSON.stringify({ check: name, ok: result.ok, status: result.status, elapsedMs: result.elapsedMs, body: result.body }));
}

async function main() {
  const checks = [];
  if (workerHealthUrl) {
    const result = await getJson(`${workerHealthUrl.replace(/\/$/, '')}/healthz`);
    printCheck('worker_liveness', result);
    checks.push(result.ok);
    const ready = await getJson(`${workerHealthUrl.replace(/\/$/, '')}/readyz`);
    printCheck('worker_readiness', ready);
    checks.push(ready.ok);
  }

  required('LIARA_MAIL_API_TOKEN', token);
  assertHexId('LIARA_MAIL_SERVER_ID', required('LIARA_MAIL_SERVER_ID', mailServerId));
  const auth = { Authorization: `Bearer ${token}` };
  const accounts = await getJson(`${baseUrl}/api/v1/mails/${mailServerId}/accounts`, auth);
  printCheck('liara_mail_accounts_list', accounts);
  checks.push(accounts.ok);

  if (accountName) {
    if (!/^[a-z0-9]+([.-][a-z0-9]+)*$/.test(accountName) || accountName.length > 64) {
      throw new Error('invalid_environment:LIARA_MAIL_ACCOUNT_NAME');
    }
    const availability = await getJson(
      `${baseUrl}/api/v1/mails/${mailServerId}/accounts/${encodeURIComponent(accountName)}/check-availability`,
      auth,
    );
    printCheck('liara_mail_account_availability', availability);
    checks.push(availability.ok);
  }

  if (checks.some((ok) => !ok)) process.exitCode = 1;
  else console.log(JSON.stringify({ ok: true, message: 'all_requested_health_checks_passed' }));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'unknown_error' }));
  process.exitCode = 1;
});
