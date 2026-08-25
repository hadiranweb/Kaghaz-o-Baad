#!/usr/bin/env node
// Isolation verification script for ADR-0003 Auxiliary AI Stack
// Checks that no manifest contains forbidden database references or secret overlaps.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MANIFEST_DIR = resolve('manifests/ai-stack');

function fail(message) {
  console.error(JSON.stringify({ ok: false, check: 'ai_stack_isolation', error: message }));
  process.exitCode = 1;
}

function pass(message) {
  console.log(JSON.stringify({ ok: true, check: 'ai_stack_isolation', message }));
}

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const forbidden = [
    /DATABASE_URL/i,
    /POSTGRES_[A-Z_]+/i,
    /SUPABASE_[A-Z_]+/i,
    /LIARA_MAIL_API_TOKEN/i,
    /AUTH_JWT_SECRET/i,
  ];
  const hits = forbidden.filter((re) => re.test(content));
  return hits.map((h) => h.source);
}

function main() {
  let allOk = true;
  const files = readdirSync(MANIFEST_DIR).filter((f) => f.endsWith('.yml'));
  for (const file of files) {
    const path = resolve(MANIFEST_DIR, file);
    const hits = checkFile(path);
    if (hits.length > 0) {
      fail(`File ${file} contains forbidden references: ${hits.join(', ')}`);
      allOk = false;
    } else {
      pass(`File ${file} passes isolation checks`);
    }
  }
  if (allOk) {
    console.log(JSON.stringify({ ok: true, message: 'all_ai_manifests_pass_isolation_contract', files_checked: files.length }));
    process.exitCode = 0;
  }
}

main();
