import assert from 'node:assert/strict';
import test from 'node:test';
import { capabilitiesForContext, STUDIO_CATALOG_VERSION, studioCapabilityCatalog } from '../../src/modules/studio/catalog.js';

test('Studio catalog is versioned and keeps all capabilities review-gated', () => {
  assert.match(STUDIO_CATALOG_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(studioCapabilityCatalog.length >= 25);
  assert.ok(studioCapabilityCatalog.every((capability) => capability.requiresHumanReview));
  assert.ok(studioCapabilityCatalog.every((capability) => capability.activationBlockedByFa.length > 10));
});

test('Studio catalog includes the highest-priority content and media journeys', () => {
  const byKey = new Map(studioCapabilityCatalog.map((capability) => [capability.key, capability]));
  assert.equal(byKey.get('article.editorial_suggestion')?.readiness, 'connection_ready');
  assert.equal(byKey.get('publication.instagram_caption')?.readiness, 'contract_pending');
  assert.equal(byKey.get('live_recording.transcription')?.requiresConsent, true);
  assert.equal(byKey.get('live_recording.transcription')?.risk, 'high');
});

test('Studio catalog context filter keeps journeys isolated', () => {
  const article = capabilitiesForContext('article');
  const live = capabilitiesForContext('live');
  assert.ok(article.length > 0);
  assert.ok(live.length > 0);
  assert.ok(article.every((capability) => capability.context === 'article'));
  assert.ok(live.every((capability) => capability.context === 'live'));
  assert.ok(!article.some((capability) => capability.key === 'live_recording.transcription'));
});
