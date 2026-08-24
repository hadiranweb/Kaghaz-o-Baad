import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];

async function read(path) {
  return readFile(join(root, path), 'utf8');
}

// 1. Ensure supabase/ directory is completely removed
try {
  const dirStat = await stat(join(root, 'supabase'));
  if (dirStat.isDirectory()) {
    failures.push('supabase/ directory must not exist in repository (decommissioned in Sprint 5)');
  }
} catch {
  // Good: directory does not exist
}

// 2. Ensure package.json, backend/package.json, installer/package.json have no @supabase dependencies
for (const pkgPath of ['package.json', 'backend/package.json', 'installer/package.json']) {
  try {
    const pkgJson = JSON.parse(await read(pkgPath));
    const packageSections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
    for (const section of packageSections) {
      if (pkgJson[section]?.['@supabase/supabase-js']) {
        failures.push(`${pkgPath}: ${section} must not include @supabase/supabase-js`);
      }
    }
  } catch {
    // Skip missing files
  }
}

async function walk(directory) {
  try {
    const entries = await readdir(join(root, directory), { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await walk(path));
      else files.push(path);
    }
    return files;
  } catch {
    return [];
  }
}

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
for (const scanDir of ['src', 'backend/src']) {
  for (const file of await walk(scanDir)) {
    if (!sourceExtensions.has(extname(file))) continue;
    const content = await read(file);
    if (/@supabase\/supabase-js|integrations\/supabase|supabase\.functions\.|supabase\.from\(/.test(content)) {
      failures.push(`${relative(root, join(root, file))}: Supabase runtime reference is forbidden`);
    }
  }
}

for (const file of ['.env.example', '.env.local.example', 'backend/.env.example']) {
  try {
    const content = await read(file);
    if (/^VITE_SUPABASE_|^SUPABASE_/m.test(content)) {
      failures.push(`${file}: Supabase environment variables are forbidden in the active contract`);
    }
  } catch {
    // Skip if not present
  }
}

const workflow = await read('.github/workflows/ci.yml');
if (/\bsupabase\s+(functions\s+deploy|db\s+push|link)\b/i.test(workflow)) {
  failures.push('.github/workflows/ci.yml: Supabase deployment is forbidden');
}

if (failures.length) {
  console.error('[architecture] contract violations:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[architecture] zero-residue independent backend/PostgreSQL contract verified');
