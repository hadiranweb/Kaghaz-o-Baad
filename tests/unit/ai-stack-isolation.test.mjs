import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

describe('AI Stack Isolation — ADR-0003 Contract', () => {
  describe('Manifest Isolation', () => {
    it('manifests contain no database connection variables', () => {
      const dir = resolve('manifests/ai-stack');
      const files = readdirSync(dir).filter((f) => f.endsWith('.yml'));
      const forbiddenPatterns = [
        /DATABASE_URL/i,
        /POSTGRES_[A-Z_]+/i,
        /SUPABASE_[A-Z_]+/i,
        /LIARA_MAIL_API_TOKEN/i,
        /AUTH_JWT_SECRET/i,
      ];
      for (const file of files) {
        const content = readFileSync(resolve(dir, file), 'utf8');
        for (const pattern of forbiddenPatterns) {
          assert.ok(!pattern.test(content), `File ${file} violates isolation: ${pattern.source}`);
        }
      }
    });

    it('manifests declare kill switches and feature flags', () => {
      const dir = resolve('manifests/ai-stack');
      const files = readdirSync(dir).filter((f) => f.endsWith('.yml'));
      for (const file of files) {
        const content = readFileSync(resolve(dir, file), 'utf8');
        assert.ok(/FEATURE_FLAG_AUXILIARY_AI/i.test(content), `File ${file} must declare feature flag`);
        assert.ok(/KILL_SWITCH/i.test(content), `File ${file} must declare kill switch`);
      }
    });
  });
});
