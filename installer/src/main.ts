import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
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
});

type DeploymentInput = z.infer<typeof deploymentSchema>;

function assertSafeWorkspace(sourcePath: string, workspacePath: string) {
  const source = resolve(sourcePath);
  const workspace = resolve(workspacePath);
  if (source === workspace || workspace.startsWith(`${source}${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error('workspace_must_not_be_inside_source');
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

async function prepareDeployment(input: DeploymentInput) {
  const data = deploymentSchema.parse(input);
  assertSafeWorkspace(data.sourcePath, data.workspacePath);
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
    data.livekitUrl ? `LIVEKIT_URL=${data.livekitUrl}` : '',
  ].filter(Boolean).join('\n') + '\n';
  await writeFile(join(backendDirectory, '.env'), backendEnv, { mode: 0o600 });

  const frontendEnv = `VITE_API_BASE_URL=${data.apiPublicUrl}\nVITE_LIVEKIT_URL=${data.livekitUrl ?? ''}\n`;
  await writeFile(join(data.workspacePath, '.env.local'), frontendEnv, { mode: 0o600 });

  const manifest = {
    installerVersion: '0.1.0',
    preparedAt: new Date().toISOString(),
    mode: data.mode,
    workspacePath: data.workspacePath,
    generatedFiles: ['backend/.env', '.env.local'],
    secrets: {
      databaseUrl: redact(data.databaseUrl),
      authJwtSecret: '[redacted]',
    },
    nextStep: 'validate-and-deploy',
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

ipcMain.handle('select-source', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory'],
    filters: [{ name: 'KaghazBaad repository', extensions: ['zip'] }],
  });
  return result.canceled ? null : result.filePaths[0] ?? null;
});

ipcMain.handle('select-workspace', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0] ?? null;
});

ipcMain.handle('prepare-deployment', async (_event, input: unknown) => prepareDeployment(input as DeploymentInput));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
