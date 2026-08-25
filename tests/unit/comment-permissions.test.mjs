import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isManager } from '../../backend/dist/auth/roles.js';

describe('Comment Permissions & Ownership', () => {
  function canReviewComment(user, articleAuthorId) {
    return articleAuthorId === user.id || isManager(user);
  }

  function canDeleteComment(user, commentAuthorId) {
    return commentAuthorId === user.id || isManager(user);
  }

  const articleAuthor = { id: 'author-1', roles: ['author'] };
  const otherAuthor = { id: 'author-2', roles: ['author'] };
  const editor = { id: 'editor-1', roles: ['editor'] };
  const admin = { id: 'admin-1', roles: ['admin'] };
  const seniorManager = { id: 'sm-1', roles: ['senior_manager'] };
  const technicalManager = { id: 'tm-1', roles: ['technical_manager'] };
  const generalUser = { id: 'user-1', roles: [] };

  it('allows article author to review comments on their own article', () => {
    assert.equal(canReviewComment(articleAuthor, 'author-1'), true);
  });

  it('forbids unrelated authors/users from reviewing comments', () => {
    assert.equal(canReviewComment(otherAuthor, 'author-1'), false);
    assert.equal(canReviewComment(generalUser, 'author-1'), false);
  });

  it('allows editor, admin, senior_manager, and technical_manager to review comments on any article', () => {
    assert.equal(canReviewComment(editor, 'author-1'), true);
    assert.equal(canReviewComment(admin, 'author-1'), true);
    assert.equal(canReviewComment(seniorManager, 'author-1'), true);
    assert.equal(canReviewComment(technicalManager, 'author-1'), true);
  });

  it('allows comment author to delete their own comment', () => {
    assert.equal(canDeleteComment(articleAuthor, 'author-1'), true);
    assert.equal(canDeleteComment(otherAuthor, 'author-2'), true);
  });

  it('forbids other non-manager users from deleting a comment', () => {
    assert.equal(canDeleteComment(otherAuthor, 'author-1'), false);
    assert.equal(canDeleteComment(generalUser, 'author-1'), false);
  });

  it('allows managers to delete any comment', () => {
    assert.equal(canDeleteComment(editor, 'author-1'), true);
    assert.equal(canDeleteComment(admin, 'author-1'), true);
    assert.equal(canDeleteComment(seniorManager, 'author-1'), true);
    assert.equal(canDeleteComment(technicalManager, 'author-1'), true);
  });
});
