import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '../..');

describe('Zero Legacy Residue & Architecture Contract', () => {
  it('ensures supabase/ directory does not exist in workspace', () => {
    const supabasePath = join(projectRoot, 'supabase');
    assert.equal(existsSync(supabasePath), false, 'supabase/ directory must be completely removed');
  });

  it('ensures no @supabase dependencies in package.json files', () => {
    const pkgs = ['package.json', 'backend/package.json', 'installer/package.json'];
    for (const pkg of pkgs) {
      const fullPath = join(projectRoot, pkg);
      if (existsSync(fullPath)) {
        const content = JSON.parse(readFileSync(fullPath, 'utf8'));
        const allDeps = {
          ...content.dependencies,
          ...content.devDependencies,
          ...content.optionalDependencies,
          ...content.peerDependencies,
        };
        assert.equal(Boolean(allDeps['@supabase/supabase-js']), false, `${pkg} must not contain @supabase/supabase-js`);
      }
    }
  });

  it('ensures no active source files import from @supabase', () => {
    function scanSource(dir) {
      if (!existsSync(dir)) return [];
      const results = [];
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...scanSource(fullPath));
        } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const srcFiles = [
      ...scanSource(join(projectRoot, 'src')),
      ...scanSource(join(projectRoot, 'backend/src')),
    ];

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf8');
      const hasSupabase = /@supabase\/supabase-js|integrations\/supabase|supabase\.functions\.|supabase\.from\(/.test(content);
      assert.equal(hasSupabase, false, `Source file ${file.replace(projectRoot, '')} must not contain Supabase runtime code`);
    }
  });

  it('ensures environment example files contain no Supabase variables', () => {
    const envFiles = ['.env.example', '.env.local.example', 'backend/.env.example'];
    for (const envFile of envFiles) {
      const fullPath = join(projectRoot, envFile);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf8');
        const hasSupabaseEnv = /^VITE_SUPABASE_|^SUPABASE_/m.test(content);
        assert.equal(hasSupabaseEnv, false, `${envFile} must not contain Supabase environment variables`);
      }
    }
  });

  it('ensures legacy manifest file exists in docs/archive/', () => {
    const manifestPath = join(projectRoot, 'docs/archive/legacy-supabase-manifest-2026-08-24.json');
    assert.equal(existsSync(manifestPath), true, 'Archival manifest must exist');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.totalFiles, 40, 'Archival manifest must document all 40 decommissioned files');
  });
});
