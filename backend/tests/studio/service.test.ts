import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEnv } from '../../src/config/env.js';
import { assertStudioCapability, StudioProviderError, studioReadiness } from '../../src/modules/studio/service.js';

function env(overrides: NodeJS.ProcessEnv = {}) {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/kaghazbaad_test',
    ...overrides,
  });
}

test('Studio Consumer defaults to disabled and exposes no external configuration', () => {
  const readiness = studioReadiness(env());
  assert.deepEqual(readiness, {
    provider: 'disabled',
    directCompatibilityEnabled: false,
    externalStudioConfigured: false,
    capabilities: {
      titleSuggestions: false,
      academicRewrite: false,
      editorialProposals: false,
    },
  });
});

test('disabled Studio blocks product capabilities before cache, quota or provider execution', () => {
  assert.throws(
    () => assertStudioCapability(env(), 'title_suggestions'),
    (error: unknown) => error instanceof StudioProviderError
      && error.code === 'studio_not_configured'
      && error.capability === 'title_suggestions',
  );
});

test('direct compatibility requires an explicit dual opt-in', () => {
  assert.throws(
    () => env({ STUDIO_PROVIDER: 'direct_compat' }),
    /STUDIO_PROVIDER=direct_compat requires STUDIO_DIRECT_COMPAT_ENABLED/,
  );

  assert.doesNotThrow(() => assertStudioCapability(
    env({ STUDIO_PROVIDER: 'direct_compat', STUDIO_DIRECT_COMPAT_ENABLED: 'true' }),
    'academic_rewrite',
  ));
});

test('external Studio mode requires the independent integration configuration', () => {
  assert.throws(
    () => env({ STUDIO_PROVIDER: 'external_studio' }),
    /STUDIO_PROVIDER=external_studio requires CASIO_PLUS_ENABLED/,
  );
});
