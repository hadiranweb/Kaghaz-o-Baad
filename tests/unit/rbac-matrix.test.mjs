import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SYSTEM_ROLES,
  ADMIN_ROLES,
  MANAGEMENT_ROLES,
  AUTHOR_ROLES,
  systemRoleSchema,
  hasRole,
  isAdmin,
  isManager,
  isAuthor,
  canManageWorkflow,
} from '../../backend/dist/auth/roles.js';

describe('RBAC & Role Matrix', () => {
  it('defines the 8 canonical system roles', () => {
    assert.deepEqual([...SYSTEM_ROLES], [
      'admin',
      'senior_manager',
      'technical_manager',
      'editor',
      'author',
      'contributor',
      'secretary',
      'procurement_agent',
    ]);
  });

  it('validates roles with systemRoleSchema', () => {
    for (const role of SYSTEM_ROLES) {
      const parsed = systemRoleSchema.safeParse(role);
      assert.equal(parsed.success, true, `Role '${role}' should be valid in schema`);
    }

    assert.equal(systemRoleSchema.safeParse('user').success, false, "'user' is not a system role");
    assert.equal(systemRoleSchema.safeParse('superadmin').success, false, "'superadmin' is not a system role");
    assert.equal(systemRoleSchema.safeParse('').success, false, "empty string is not a system role");
  });

  it('correctly evaluates hasRole', () => {
    const user = { roles: ['editor', 'author'] };
    assert.equal(hasRole(user, 'editor'), true);
    assert.equal(hasRole(user, 'author'), true);
    assert.equal(hasRole(user, 'admin'), false);
    assert.equal(hasRole(user, 'admin', 'editor'), true);
    assert.equal(hasRole(null, 'editor'), false);
    assert.equal(hasRole({}, 'editor'), false);
  });

  it('evaluates isAdmin correctly', () => {
    assert.equal(isAdmin({ roles: ['admin'] }), true);
    assert.equal(isAdmin({ roles: ['senior_manager'] }), true);
    assert.equal(isAdmin({ roles: ['technical_manager'] }), true);
    assert.equal(isAdmin({ roles: ['editor'] }), false);
    assert.equal(isAdmin({ roles: ['author'] }), false);
    assert.equal(isAdmin({ roles: ['contributor'] }), false);
    assert.equal(isAdmin({ roles: ['secretary'] }), false);
    assert.equal(isAdmin({ roles: [] }), false);
  });

  it('evaluates isManager / canManageWorkflow correctly', () => {
    assert.equal(isManager({ roles: ['admin'] }), true);
    assert.equal(isManager({ roles: ['senior_manager'] }), true);
    assert.equal(isManager({ roles: ['technical_manager'] }), true);
    assert.equal(isManager({ roles: ['editor'] }), true);
    assert.equal(isManager({ roles: ['author'] }), false);
    assert.equal(isManager({ roles: ['contributor'] }), false);
    assert.equal(isManager({ roles: ['secretary'] }), false);
    assert.equal(canManageWorkflow({ roles: ['editor'] }), true);
    assert.equal(canManageWorkflow({ roles: ['author'] }), false);
  });

  it('evaluates isAuthor correctly', () => {
    assert.equal(isAuthor({ roles: ['author'] }), true);
    assert.equal(isAuthor({ roles: ['contributor'] }), true);
    assert.equal(isAuthor({ roles: ['editor'] }), false);
    assert.equal(isAuthor({ roles: ['admin'] }), false);
    assert.equal(isAuthor({ roles: ['secretary'] }), false);
  });
});
