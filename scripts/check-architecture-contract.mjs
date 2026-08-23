import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];

async function read(path) {
  return readFile(join(root, path), 'utf8');
}

const packageJson = JSON.parse(await read('package.json'));
const packageSections = ['dependencies', 'devDependencies', 'optionalDependencies'];
for (const section of packageSections) {
  if (packageJson[section]?.['@supabase/supabase-js']) {
    failures.push(`package.json: ${section} must not include @supabase/supabase-js`);
  }
}

async function walk(directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
for (const file of await walk('src')) {
  if (!sourceExtensions.has(extname(file))) continue;
  const content = await read(file);
  if (/@supabase\/supabase-js|integrations\/supabase|supabase\.functions\.|supabase\.from\(/.test(content)) {
    failures.push(`${relative(root, join(root, file))}: Supabase runtime reference is forbidden`);
  }
}

for (const file of ['.env.example', '.env.local.example']) {
  const content = await read(file);
  if (/^VITE_SUPABASE_/m.test(content)) {
    failures.push(`${file}: VITE_SUPABASE_* is forbidden in the active frontend contract`);
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

console.log('[architecture] independent backend/PostgreSQL contract verified');
