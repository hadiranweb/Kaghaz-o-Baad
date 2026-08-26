import process from 'node:process';

const [target, mode = 'preflight'] = process.argv.slice(2);
const allowedTargets = new Set(['n8n', 'openclaw', 'openwebui']);
if (!allowedTargets.has(target) || !new Set(['preflight', 'verify-release']).has(mode)) {
  console.error('Usage: node scripts/ai-stack-preflight.mjs <n8n|openclaw|openwebui> <preflight|verify-release>');
  process.exit(2);
}

const token = process.env.LIARA_API_TOKEN;
const teamId = process.env.LIARA_TEAM_ID;
if (!token || !teamId) {
  console.error('Liara deployment credentials are not configured.');
  process.exit(2);
}

const baseUrl = 'https://api.iran.liara.ir/v1/projects';
const forbiddenDatabaseKeys = [/^DATABASE_URL$/i, /^PG[A-Z0-9_]*$/i, /^POSTGRES[A-Z0-9_]*$/i, /^SUPABASE_/i];

const services = {
  n8n: {
    app: 'kaghazbaad-n8n',
    host: 'n8n.kaghazobaad.ir',
    disk: { name: 'n8n-data', mount: '/home/node/.n8n' },
    appKeys: ['N8N_ENCRYPTION_KEY', 'N8N_HOST', 'N8N_PROTOCOL', 'N8N_EDITOR_BASE_URL', 'WEBHOOK_URL', 'KAGHAZBAAD_ACCESS_POLICY'],
    backendKeys: ['N8N_BASE_URL', 'N8N_EVENT_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET'],
    appUrls: ['N8N_EDITOR_BASE_URL', 'WEBHOOK_URL'],
    backendUrls: ['N8N_BASE_URL'],
    strongSecrets: ['N8N_ENCRYPTION_KEY'],
    accessPolicy: 'admin-only',
  },
  openclaw: {
    app: 'kaghazbaad-openclaw',
    host: 'agent.kaghazobaad.ir',
    disk: { name: 'openclaw-state', mount: '/home/node/.openclaw' },
    appKeys: ['OPENCLAW_GATEWAY_TOKEN', 'KAGHAZBAAD_ACCESS_POLICY'],
    backendKeys: ['OPENCLAW_BASE_URL', 'OPENCLAW_GATEWAY_TOKEN'],
    appUrls: [],
    backendUrls: ['OPENCLAW_BASE_URL'],
    strongSecrets: ['OPENCLAW_GATEWAY_TOKEN'],
    accessPolicy: 'admin-only',
  },
  openwebui: {
    app: 'kaghazbaad-openwebui',
    host: 'ai.kaghazobaad.ir',
    disk: { name: 'openwebui-data', mount: '/app/backend/data' },
    appKeys: ['WEBUI_SECRET_KEY', 'WEBUI_URL', 'WEBUI_ADMIN_EMAIL', 'WEBUI_ADMIN_PASSWORD', 'ENABLE_SIGNUP', 'KAGHAZBAAD_ACCESS_POLICY'],
    backendKeys: ['OPENWEBUI_BASE_URL'],
    appUrls: ['WEBUI_URL'],
    backendUrls: ['OPENWEBUI_BASE_URL'],
    strongSecrets: ['WEBUI_SECRET_KEY', 'WEBUI_ADMIN_PASSWORD'],
    accessPolicy: 'authenticated-admin-only',
  },
};

class PreflightError extends Error {}

async function api(path) {
  const response = await fetch(`${baseUrl}${path}${path.includes('?') ? '&' : '?'}teamID=${encodeURIComponent(teamId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new PreflightError(`Liara API request failed for ${path} with HTTP ${response.status}.`);
  return response.json();
}

function envMap(project) {
  return new Map((project.envs ?? []).map((entry) => [entry.key, entry.value]));
}

function requireKeys(envs, scope, keys) {
  const missing = keys.filter((key) => !envs.get(key));
  if (missing.length) throw new PreflightError(`${scope} is missing required runtime keys: ${missing.join(', ')}.`);
}

function rejectDirectDatabaseAccess(envs, scope) {
  const disallowed = [...envs.keys()].filter((key) => forbiddenDatabaseKeys.some((rule) => rule.test(key)));
  if (disallowed.length) throw new PreflightError(`${scope} has prohibited direct product-database configuration: ${disallowed.join(', ')}.`);
}

function assertHttpsHost(envs, scope, keys, host) {
  for (const key of keys) {
    const value = envs.get(key);
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:' || parsed.hostname !== host) throw new Error('unexpected origin');
    } catch {
      throw new PreflightError(`${scope} key ${key} must use https://${host}.`);
    }
  }
}

function assertStrongSecrets(envs, scope, keys) {
  for (const key of keys) {
    const value = envs.get(key);
    if (!value || value.length < 32) throw new PreflightError(`${scope} key ${key} must be at least 32 characters long.`);
  }
}

function assertAccessPolicy(envs, scope, expected) {
  if (envs.get('KAGHAZBAAD_ACCESS_POLICY') !== expected) {
    throw new PreflightError(`${scope} must attest KAGHAZBAAD_ACCESS_POLICY=${expected} after the matching domain policy is applied.`);
  }
}

async function loadProject(app) {
  const details = await api(`/${encodeURIComponent(app)}`);
  const project = details.project;
  if (!project?._id) throw new PreflightError(`Liara returned incomplete metadata for ${app}.`);
  return project;
}

async function assertDisk(project, expected, app) {
  const details = await api(`/${encodeURIComponent(project._id)}/disks`);
  const diskExists = (details.disks ?? []).some((disk) => disk.name === expected.name);
  const mounted = (details.mounts ?? []).some((mount) => mount.name === expected.name && mount.mountedTo === expected.mount);
  if (!diskExists || !mounted) throw new PreflightError(`${app} requires persistent disk ${expected.name} mounted at ${expected.mount}.`);
}

async function assertReadyRelease(app) {
  const releases = await api(`/${encodeURIComponent(app)}/releases?page=1&count=10`);
  const ready = (releases.releases ?? []).some((release) => release.state === 'READY');
  if (!releases.currentRelease || !ready) throw new PreflightError(`${app} has no READY release after deployment.`);
}

try {
  const service = services[target];
  const [aiProject, backendProject] = await Promise.all([loadProject(service.app), loadProject('kaghazbaad-backend')]);
  const aiEnv = envMap(aiProject);
  const backendEnv = envMap(backendProject);

  requireKeys(aiEnv, service.app, service.appKeys);
  requireKeys(backendEnv, 'kaghazbaad-backend', service.backendKeys);
  rejectDirectDatabaseAccess(aiEnv, service.app);
  assertStrongSecrets(aiEnv, service.app, service.strongSecrets);
  assertAccessPolicy(aiEnv, service.app, service.accessPolicy);
  if (target === 'openwebui' && aiEnv.get('ENABLE_SIGNUP') !== 'false') {
    throw new PreflightError('Open WebUI must set ENABLE_SIGNUP=false before its first public release.');
  }
  if (target === 'openclaw' && aiEnv.get('OPENCLAW_GATEWAY_TOKEN') !== backendEnv.get('OPENCLAW_GATEWAY_TOKEN')) {
    throw new PreflightError('OpenClaw gateway token must match the backend adapter token.');
  }
  assertHttpsHost(aiEnv, service.app, service.appUrls, service.host);
  assertHttpsHost(backendEnv, 'kaghazbaad-backend', service.backendUrls, service.host);
  await assertDisk(aiProject, service.disk, service.app);

  if (mode === 'verify-release') await assertReadyRelease(service.app);
  console.log(`AI ${mode} passed for ${target}. No secret values were emitted.`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown preflight failure.';
  console.error(`AI ${mode} failed for ${target}: ${message}`);
  process.exit(1);
}
