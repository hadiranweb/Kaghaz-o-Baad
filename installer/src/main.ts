import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { access, cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import extract from 'extract-zip';
import { z } from 'zod';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = resolve(currentFile, '..');
const rendererPath = join(currentDirectory, '../src/renderer/index.html');

const deploymentSchema = z.object({
  sourcePath: z.string().min(1),
  workspacePath: z.string().min(1),
  mode: z.enum(['liara', 'single-server']),
  databaseUrl: z.string().min(1),
  authJwtSecret: z.string().min(32),
  apiPublicUrl: z.string().url(),
  frontendPublicUrl: z.string().url(),
  objectStorageEndpoint: z.string().url().optional(),
  objectStorageBucket: z.string().min(1).optional(),
  livekitUrl: z.string().url().optional(),
  livekitApiKey: z.string().optional(),
  livekitApiSecret: z.string().optional(),
  objectStorageAccessKey: z.string().optional(),
  objectStorageSecretKey: z.string().optional(),
  aiProvider: z.string().default('openai'),
  aiModel: z.string().default('gpt-5-mini'),
  aiProviderBaseUrl: z.string().url().optional(),
  aiApiKey: z.string().optional(),
  aiTimeoutMs: z.number().int().positive().max(120000).default(30000),
  rateLimitEnabled: z.boolean().default(true),
  rateLimitIpPerMinute: z.number().int().positive().default(120),
  rateLimitUserPerMinute: z.number().int().positive().default(60),
  rateLimitAiPerMinute: z.number().int().positive().default(10),
  aiCacheEnabled: z.boolean().default(true),
  aiTitleCacheTtlSeconds: z.number().int().positive().max(604800).default(86400),
  aiTitlePromptVersion: z.string().default('title-v1'),
  smsApiKey: z.string().optional(),
  paymentProvider: z.enum(['zarinpal', 'idpay', 'none']).default('none'),
  zarinpalMerchantId: z.string().optional(),
  zarinpalSandbox: z.boolean().default(false),
  idpayApiKey: z.string().optional(),
  paymentCallbackBaseUrl: z.string().url().optional(),
  paymentProviderTimeoutMs: z.number().int().positive().max(120000).default(30000),
  subscriptionGraceDays: z.number().int().positive().max(30).default(3),
  subscriptionJobBatchSize: z.number().int().positive().max(5000).default(500),
  mailHost: z.string().optional(),
  mailUser: z.string().optional(),
  mailPassword: z.string().optional(),
});

type DeploymentInput = z.infer<typeof deploymentSchema>;

async function detectRepositoryRoot() {
  const starts = [dirname(process.execPath), resolve(currentDirectory, '../..')];
  for (const start of starts) {
    let candidate = resolve(start);
    for (let depth = 0; depth < 6; depth += 1) {
      try {
        await Promise.all([access(join(candidate, 'installer')), access(join(candidate, 'backend')), access(join(candidate, 'package.json'))]);
        return candidate;
      } catch {
        candidate = dirname(candidate);
      }
    }
  }
  throw new Error('repository_root_not_found_place_exe_inside_repository');
}

function assertSafeWorkspace(sourcePath: string, workspacePath: string) {
  const source = resolve(sourcePath);
  const workspace = resolve(workspacePath);
  if (source === workspace || workspace.startsWith(`${source}${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error('workspace_must_not_be_inside_source');
  }
}

async function assertOutputWorkspaceAvailable(workspacePath: string) {
  try {
    const entries = await readdir(workspacePath);
    if (entries.length > 0) throw new Error('workspace_must_be_empty');
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}

async function copySource(sourcePath: string, workspacePath: string) {
  await mkdir(workspacePath, { recursive: true });
  const sourceStat = await import('node:fs/promises').then(({ stat }) => stat(sourcePath));
  if (sourceStat.isDirectory()) {
    await cp(sourcePath, workspacePath, { recursive: true, errorOnExist: false, force: true });
    return;
  }
  if (!sourcePath.toLowerCase().endsWith('.zip')) throw new Error('source_must_be_directory_or_zip');
  await extract(sourcePath, { dir: workspacePath });
}

function redact(value: string) {
  return value.length < 8 ? '[redacted]' : `${value.slice(0, 4)}…[redacted]`;
}

async function validateDeployment(input: DeploymentInput) {
  const sourcePath = await detectRepositoryRoot();
  const data = deploymentSchema.parse({ ...input, sourcePath });
  assertSafeWorkspace(data.sourcePath, data.workspacePath);
  return data;
}

function previewDeployment(input: DeploymentInput) {
  const data = validateDeployment(input);
  return data.then((validated) => ({
    mode: validated.mode,
    sourcePath: validated.sourcePath,
    workspacePath: validated.workspacePath,
    plannedFiles: ['backend/.env', '.env.local', 'installer-manifest.json', 'DEPLOYMENT-GUIDE.md'],
    settings: [
      { name: 'DATABASE_URL', value: redact(validated.databaseUrl), sensitive: true },
      { name: 'AUTH_JWT_SECRET', value: '[redacted]', sensitive: true },
      { name: 'PUBLIC_API_URL', value: validated.apiPublicUrl, sensitive: false },
      { name: 'CORS_ORIGIN', value: validated.frontendPublicUrl, sensitive: false },
      ...(validated.objectStorageEndpoint ? [{ name: 'OBJECT_STORAGE_ENDPOINT', value: validated.objectStorageEndpoint, sensitive: false }] : []),
      ...(validated.objectStorageBucket ? [{ name: 'OBJECT_STORAGE_BUCKET', value: validated.objectStorageBucket, sensitive: false }] : []),
      ...(validated.livekitUrl ? [{ name: 'LIVEKIT_URL', value: validated.livekitUrl, sensitive: false }] : []),
      ...(validated.livekitApiKey ? [{ name: 'LIVEKIT_API_KEY', value: '[redacted]', sensitive: true }] : []),
      ...(validated.livekitApiSecret ? [{ name: 'LIVEKIT_API_SECRET', value: '[redacted]', sensitive: true }] : []),
      ...(validated.objectStorageAccessKey ? [{ name: 'OBJECT_STORAGE_ACCESS_KEY', value: '[redacted]', sensitive: true }] : []),
      ...(validated.objectStorageSecretKey ? [{ name: 'OBJECT_STORAGE_SECRET_KEY', value: '[redacted]', sensitive: true }] : []),
      { name: 'AI_PROVIDER', value: validated.aiProvider, sensitive: false },
      { name: 'AI_MODEL', value: validated.aiModel, sensitive: false },
      ...(validated.aiProviderBaseUrl ? [{ name: 'AI_BASE_URL', value: validated.aiProviderBaseUrl, sensitive: false }] : []),
      ...(validated.aiApiKey ? [{ name: 'AI_API_KEY', value: '[redacted]', sensitive: true }] : []),
      { name: 'AI_TIMEOUT_MS', value: String(validated.aiTimeoutMs), sensitive: false },
      { name: 'RATE_LIMIT_ENABLED', value: String(validated.rateLimitEnabled), sensitive: false },
      { name: 'RATE_LIMIT_IP_PER_MINUTE', value: String(validated.rateLimitIpPerMinute), sensitive: false },
      { name: 'RATE_LIMIT_USER_PER_MINUTE', value: String(validated.rateLimitUserPerMinute), sensitive: false },
      { name: 'RATE_LIMIT_AI_PER_MINUTE', value: String(validated.rateLimitAiPerMinute), sensitive: false },
      { name: 'AI_CACHE_ENABLED', value: String(validated.aiCacheEnabled), sensitive: false },
      { name: 'AI_TITLE_CACHE_TTL_SECONDS', value: String(validated.aiTitleCacheTtlSeconds), sensitive: false },
      { name: 'AI_TITLE_PROMPT_VERSION', value: validated.aiTitlePromptVersion, sensitive: false },
      ...(validated.smsApiKey ? [{ name: 'SMS_API_KEY', value: '[redacted]', sensitive: true }] : []),
      { name: 'PAYMENT_PROVIDER', value: validated.paymentProvider, sensitive: false },
      ...(validated.zarinpalMerchantId ? [{ name: 'ZARINPAL_MERCHANT_ID', value: '[redacted]', sensitive: true }] : []),
      { name: 'ZARINPAL_SANDBOX', value: String(validated.zarinpalSandbox), sensitive: false },
      ...(validated.paymentCallbackBaseUrl ? [{ name: 'PAYMENT_CALLBACK_BASE_URL', value: validated.paymentCallbackBaseUrl, sensitive: false }] : []),
      { name: 'PAYMENT_PROVIDER_TIMEOUT_MS', value: String(validated.paymentProviderTimeoutMs), sensitive: false },
      { name: 'SUBSCRIPTION_GRACE_DAYS', value: String(validated.subscriptionGraceDays), sensitive: false },
      { name: 'SUBSCRIPTION_JOB_BATCH_SIZE', value: String(validated.subscriptionJobBatchSize), sensitive: false },
      ...(validated.idpayApiKey ? [{ name: 'IDPAY_API_KEY', value: '[redacted]', sensitive: true }] : []),
      ...(validated.mailHost ? [{ name: 'MAIL_HOST', value: validated.mailHost, sensitive: false }] : []),
      ...(validated.mailUser ? [{ name: 'MAIL_USER', value: validated.mailUser, sensitive: false }] : []),
      ...(validated.mailPassword ? [{ name: 'MAIL_PASSWORD', value: '[redacted]', sensitive: true }] : []),
    ],
    actions: ['تشخیص خودکار repository والد EXE', 'ساخت کپی جدید در workspace خروجی', 'نوشتن فایل‌های پیکربندی رسمی', 'تولید راهنمای مقصد', 'عدم اجرای deployment، migration، upload یا عملیات زیرساختی'],
  }));
}

async function prepareDeployment(input: DeploymentInput) {
  const data = await validateDeployment(input);
  assertSafeWorkspace(data.sourcePath, data.workspacePath);
  await assertOutputWorkspaceAvailable(data.workspacePath);
  await copySource(data.sourcePath, data.workspacePath);

  const backendDirectory = join(data.workspacePath, 'backend');
  await mkdir(backendDirectory, { recursive: true });
  const backendEnv = [
    `DATABASE_URL=${data.databaseUrl}`,
    `AUTH_JWT_SECRET=${data.authJwtSecret}`,
    `PUBLIC_API_URL=${data.apiPublicUrl}`,
    `CORS_ORIGIN=${data.frontendPublicUrl}`,
    data.objectStorageEndpoint ? `OBJECT_STORAGE_ENDPOINT=${data.objectStorageEndpoint}` : '',
    data.objectStorageBucket ? `OBJECT_STORAGE_BUCKET=${data.objectStorageBucket}` : '',
    data.objectStorageAccessKey ? `OBJECT_STORAGE_ACCESS_KEY=${data.objectStorageAccessKey}` : '',
    data.objectStorageSecretKey ? `OBJECT_STORAGE_SECRET_KEY=${data.objectStorageSecretKey}` : '',
    data.livekitUrl ? `LIVEKIT_URL=${data.livekitUrl}` : '',
    data.livekitApiKey ? `LIVEKIT_API_KEY=${data.livekitApiKey}` : '',
    data.livekitApiSecret ? `LIVEKIT_API_SECRET=${data.livekitApiSecret}` : '',
    `AI_PROVIDER=${data.aiProvider}`,
    `AI_MODEL=${data.aiModel}`,
    data.aiProviderBaseUrl ? `AI_BASE_URL=${data.aiProviderBaseUrl}` : '',
    data.aiApiKey ? `AI_API_KEY=${data.aiApiKey}` : '',
    `AI_TIMEOUT_MS=${data.aiTimeoutMs}`,
    `RATE_LIMIT_ENABLED=${data.rateLimitEnabled}`,
    `RATE_LIMIT_IP_PER_MINUTE=${data.rateLimitIpPerMinute}`,
    `RATE_LIMIT_USER_PER_MINUTE=${data.rateLimitUserPerMinute}`,
    `RATE_LIMIT_AI_PER_MINUTE=${data.rateLimitAiPerMinute}`,
    `AI_CACHE_ENABLED=${data.aiCacheEnabled}`,
    `AI_TITLE_CACHE_TTL_SECONDS=${data.aiTitleCacheTtlSeconds}`,
    `AI_TITLE_PROMPT_VERSION=${data.aiTitlePromptVersion}`,
    data.smsApiKey ? `SMS_API_KEY=${data.smsApiKey}` : '',
    `PAYMENT_PROVIDER=${data.paymentProvider}`,
    data.zarinpalMerchantId ? `ZARINPAL_MERCHANT_ID=${data.zarinpalMerchantId}` : '',
    `ZARINPAL_SANDBOX=${data.zarinpalSandbox}`,
    data.idpayApiKey ? `IDPAY_API_KEY=${data.idpayApiKey}` : '',
    data.paymentCallbackBaseUrl ? `PAYMENT_CALLBACK_BASE_URL=${data.paymentCallbackBaseUrl}` : '',
    `PAYMENT_PROVIDER_TIMEOUT_MS=${data.paymentProviderTimeoutMs}`,
    `SUBSCRIPTION_GRACE_DAYS=${data.subscriptionGraceDays}`,
    `SUBSCRIPTION_JOB_BATCH_SIZE=${data.subscriptionJobBatchSize}`,
    data.mailHost ? `MAIL_HOST=${data.mailHost}` : '',
    data.mailUser ? `MAIL_USER=${data.mailUser}` : '',
    data.mailPassword ? `MAIL_PASSWORD=${data.mailPassword}` : '',
  ].filter(Boolean).join('\n') + '\n';
  await writeFile(join(backendDirectory, '.env'), backendEnv, { mode: 0o600 });

  const frontendEnv = `VITE_API_URL=${data.apiPublicUrl}\nVITE_LIVEKIT_URL=${data.livekitUrl ?? ''}\n`;
  await writeFile(join(data.workspacePath, '.env.local'), frontendEnv, { mode: 0o600 });

  const guide = data.mode === 'liara' ? `# راهنمای انتقال به Liara\n\nاین workspace توسط EXE آماده شده است. installer هیچ deployment، migration یا uploadی اجرا نکرده است.\n\n1. frontend و backend را به Liara PaaS منتقل کنید.\n2. PostgreSQL را در Liara DBaaS ایجاد و DATABASE_URL را بررسی کنید.\n3. Object Storage، domain، DNS و SSL را در پنل مقصد تنظیم کنید.\n4. migrationهای backend/migrations را طبق راهنمای backend اجرا کنید.\n5. برای jobها، فرمان jobs:cleanup-ai-cache و jobs:subscription-lifecycle را به scheduler وصل کنید.\n6. backend و frontend را جداگانه build و health را بررسی کنید.\n\nفایل‌های حاوی secret فقط برای استفادهٔ خصوصی هستند و نباید در Git یا کانال عمومی قرار گیرند.\n` : `# راهنمای انتقال به Single Server\n\nاین workspace توسط EXE آماده شده است. installer هیچ deployment، migration یا uploadی اجرا نکرده است.\n\n1. workspace را به سرور منتقل کنید.\n2. Node.js و PostgreSQL را روی سرور آماده کنید.\n3. migrationهای backend/migrations را طبق راهنمای backend اجرا کنید.\n4. backend و frontend را build و با reverse proxy و HTTPS منتشر کنید.\n5. فرمان‌های jobs:cleanup-ai-cache و jobs:subscription-lifecycle را به cron وصل کنید.\n6. health endpoint و callback پرداخت را از بیرون سرور آزمایش کنید.\n\nفایل‌های حاوی secret فقط برای استفادهٔ خصوصی هستند و نباید در Git یا کانال عمومی قرار گیرند.\n`;
  await writeFile(join(data.workspacePath, 'DEPLOYMENT-GUIDE.md'), guide, { mode: 0o600 });

  const manifest = {
    installerVersion: '0.1.0',
    preparedAt: new Date().toISOString(),
    mode: data.mode,
    workspacePath: data.workspacePath,
    generatedFiles: ['backend/.env', '.env.local', 'DEPLOYMENT-GUIDE.md'],
    secrets: {
      databaseUrl: redact(data.databaseUrl),
      authJwtSecret: '[redacted]',
    },
    nextStep: 'user-uploads-workspace-and-runs-deployment-steps',
  };
  await writeFile(join(data.workspacePath, 'installer-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    webPreferences: {
      preload: join(currentDirectory, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void window.loadFile(rendererPath);
}

ipcMain.handle('repository-root', async () => detectRepositoryRoot());

ipcMain.handle('select-workspace', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0] ?? null;
});

ipcMain.handle('preview-deployment', async (_event, input: unknown) => previewDeployment(input as DeploymentInput));
ipcMain.handle('prepare-deployment', async (_event, input: unknown) => prepareDeployment(input as DeploymentInput));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
