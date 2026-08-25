#!/usr/bin/env node
// Production release readiness verification script
// Checks CI contract, deploy environment, and integration branch tracking.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(name, condition, message) {
  const result = condition ? { ok: true, name, message: message || 'passed' } : { ok: false, name, message: message || 'failed' };
  console.log(JSON.stringify(result));
  return result.ok;
}

function main() {
  const ciFile = resolve('.github/workflows/ci.yml');
  const ciContent = readFileSync(ciFile, 'utf8');

  let ok = true;
  ok = check('production_deploy_trigger', ciContent.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"), 'Production deploy triggered by main push') && ok;
  ok = check('main_protected', ciContent.includes('environment: production'), 'Production environment protected') && ok;
  ok = check('required_checks', ciContent.includes('needs: [frontend, backend, secret-scan]'), 'Required checks before deploy') && ok;
  ok = check('secret_validation', ciContent.includes('test -n "$LIARA_API_TOKEN"'), 'Deployment secrets validated') && ok;
  ok = check('rollback_policy', ciContent.includes('cancel-in-progress: true'), 'Concurrent deploy cancellation enabled') && ok;

  console.log(JSON.stringify({ ok, message: ok ? 'production_release_ready' : 'release_gate_blocked' }));
  process.exitCode = ok ? 0 : 1;
}

main();
