import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  workflowActions,
  ARTICLE_TRANSITIONS,
  isValidTransition,
  getNextStatus,
  isActionPermittedForActor,
} from '../../backend/dist/modules/workflow/service.js';

describe('Workflow Engine & State Machine', () => {
  it('contains all 7 canonical workflow actions', () => {
    assert.deepEqual([...workflowActions], [
      'submit_for_review',
      'request_changes',
      'approve',
      'schedule',
      'publish',
      'archive',
      'restore_draft',
    ]);
  });

  describe('State Transitions Map', () => {
    it('validates submit_for_review transitions', () => {
      assert.equal(isValidTransition('submit_for_review', 'draft'), true);
      assert.equal(getNextStatus('submit_for_review', 'draft'), 'in_review');

      assert.equal(isValidTransition('submit_for_review', 'changes_requested'), true);
      assert.equal(getNextStatus('submit_for_review', 'changes_requested'), 'in_review');

      assert.equal(isValidTransition('submit_for_review', 'published'), false);
      assert.equal(getNextStatus('submit_for_review', 'published'), null);
    });

    it('validates request_changes transitions', () => {
      assert.equal(isValidTransition('request_changes', 'in_review'), true);
      assert.equal(getNextStatus('request_changes', 'in_review'), 'changes_requested');

      assert.equal(isValidTransition('request_changes', 'draft'), false);
      assert.equal(getNextStatus('request_changes', 'draft'), null);
    });

    it('validates approve transitions', () => {
      assert.equal(isValidTransition('approve', 'in_review'), true);
      assert.equal(getNextStatus('approve', 'in_review'), 'approved');

      assert.equal(isValidTransition('approve', 'draft'), false);
      assert.equal(isValidTransition('approve', 'changes_requested'), false);
    });

    it('validates schedule transitions', () => {
      assert.equal(isValidTransition('schedule', 'approved'), true);
      assert.equal(getNextStatus('schedule', 'approved'), 'scheduled');

      assert.equal(isValidTransition('schedule', 'draft'), false);
      assert.equal(isValidTransition('schedule', 'in_review'), false);
    });

    it('validates publish transitions', () => {
      assert.equal(isValidTransition('publish', 'approved'), true);
      assert.equal(getNextStatus('publish', 'approved'), 'published');

      assert.equal(isValidTransition('publish', 'scheduled'), true);
      assert.equal(getNextStatus('publish', 'scheduled'), 'published');

      assert.equal(isValidTransition('publish', 'draft'), false);
      assert.equal(isValidTransition('publish', 'in_review'), false);
    });

    it('validates archive transitions', () => {
      assert.equal(isValidTransition('archive', 'published'), true);
      assert.equal(getNextStatus('archive', 'published'), 'archived');

      assert.equal(isValidTransition('archive', 'draft'), false);
    });

    it('validates restore_draft transitions', () => {
      assert.equal(isValidTransition('restore_draft', 'archived'), true);
      assert.equal(getNextStatus('restore_draft', 'archived'), 'draft');

      assert.equal(isValidTransition('restore_draft', 'changes_requested'), true);
      assert.equal(getNextStatus('restore_draft', 'changes_requested'), 'draft');

      assert.equal(isValidTransition('restore_draft', 'published'), false);
    });
  });

  describe('Actor Permissions on Actions', () => {
    const authorUser = { id: 'user-author-1', roles: ['author'] };
    const contributorUser = { id: 'user-contrib-1', roles: ['contributor'] };
    const otherAuthor = { id: 'user-author-2', roles: ['author'] };
    const editorUser = { id: 'user-editor-1', roles: ['editor'] };
    const adminUser = { id: 'user-admin-1', roles: ['admin'] };
    const seniorManagerUser = { id: 'user-sm-1', roles: ['senior_manager'] };
    const technicalManagerUser = { id: 'user-tm-1', roles: ['technical_manager'] };
    const strangerUser = { id: 'user-stranger-1', roles: ['secretary'] };

    const article = { author_id: 'user-author-1' };

    it('author owner can submit_for_review and restore_draft', () => {
      assert.equal(isActionPermittedForActor(authorUser, 'submit_for_review', article), true);
      assert.equal(isActionPermittedForActor(authorUser, 'restore_draft', article), true);
    });

    it('non-owner author CANNOT submit_for_review or restore_draft', () => {
      assert.equal(isActionPermittedForActor(otherAuthor, 'submit_for_review', article), false);
      assert.equal(isActionPermittedForActor(otherAuthor, 'restore_draft', article), false);
    });

    it('author owner CANNOT approve, request_changes, schedule, publish, archive', () => {
      assert.equal(isActionPermittedForActor(authorUser, 'request_changes', article), false);
      assert.equal(isActionPermittedForActor(authorUser, 'approve', article), false);
      assert.equal(isActionPermittedForActor(authorUser, 'schedule', article), false);
      assert.equal(isActionPermittedForActor(authorUser, 'publish', article), false);
      assert.equal(isActionPermittedForActor(authorUser, 'archive', article), false);
    });

    it('editor can perform all workflow actions', () => {
      for (const action of workflowActions) {
        assert.equal(isActionPermittedForActor(editorUser, action, article), true, `Editor should be allowed '${action}'`);
      }
    });

    it('admin, senior_manager, and technical_manager can perform all workflow actions', () => {
      for (const manager of [adminUser, seniorManagerUser, technicalManagerUser]) {
        for (const action of workflowActions) {
          assert.equal(isActionPermittedForActor(manager, action, article), true, `${manager.roles[0]} should be allowed '${action}'`);
        }
      }
    });

    it('stranger/non-author/non-manager is forbidden from all actions', () => {
      for (const action of workflowActions) {
        assert.equal(isActionPermittedForActor(strangerUser, action, article), false, `Stranger should NOT be allowed '${action}'`);
      }
    });
  });
});
