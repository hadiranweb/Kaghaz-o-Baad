import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isManager } from '../../backend/dist/auth/roles.js';

describe('Interactive Slides & Presentation Pipelines', () => {
  function canManageSlide(user, slideOwnerId) {
    return slideOwnerId === user.id || isManager(user);
  }

  const slideOwner = { id: 'user-author-1', roles: ['author'] };
  const otherAuthor = { id: 'user-author-2', roles: ['author'] };
  const editor = { id: 'user-editor-1', roles: ['editor'] };
  const admin = { id: 'user-admin-1', roles: ['admin'] };
  const seniorManager = { id: 'user-sm-1', roles: ['senior_manager'] };

  it('allows slide owner to edit and reorder slides', () => {
    assert.equal(canManageSlide(slideOwner, 'user-author-1'), true);
  });

  it('forbids other authors from modifying slides of another user', () => {
    assert.equal(canManageSlide(otherAuthor, 'user-author-1'), false);
  });

  it('allows editor, admin, and senior managers to manage any slides', () => {
    assert.equal(canManageSlide(editor, 'user-author-1'), true);
    assert.equal(canManageSlide(admin, 'user-author-1'), true);
    assert.equal(canManageSlide(seniorManager, 'user-author-1'), true);
  });

  it('validates slide sort order sequencing', () => {
    const slides = [
      { id: 'slide-1', sortOrder: 0, title: 'Introduction' },
      { id: 'slide-2', sortOrder: 1, title: 'Methodology' },
      { id: 'slide-3', sortOrder: 2, title: 'Conclusion' },
    ];

    const sorted = [...slides].sort((a, b) => a.sortOrder - b.sortOrder);
    assert.equal(sorted[0].id, 'slide-1');
    assert.equal(sorted[1].id, 'slide-2');
    assert.equal(sorted[2].id, 'slide-3');
  });

  it('validates live session presentation metadata structure', () => {
    function buildPresentationMetadata(input) {
      return {
        presentation_enabled: Boolean(input.presentationEnabled),
        presentation_media_id: input.presentationMediaId ?? null,
        presentation_url: input.presentationUrl ?? null,
        presentation_name: input.presentationName ?? null,
        presentation_kind: input.presentationKind ?? 'pdf',
      };
    }

    const meta = buildPresentationMetadata({
      presentationEnabled: true,
      presentationMediaId: 'media-uuid-123',
      presentationUrl: 'https://s3.ir-thr-at1.liara.cloud/bucket/presentation.pdf',
      presentationName: 'Thesis Defense',
      presentationKind: 'pdf',
    });

    assert.equal(meta.presentation_enabled, true);
    assert.equal(meta.presentation_media_id, 'media-uuid-123');
    assert.equal(meta.presentation_kind, 'pdf');
  });
});
