import { z } from 'zod';

export const SYSTEM_ROLES = [
  'admin',
  'senior_manager',
  'technical_manager',
  'editor',
  'author',
  'contributor',
  'secretary',
  'procurement_agent',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const systemRoleSchema = z.enum(SYSTEM_ROLES);

export const ADMIN_ROLES = ['admin', 'senior_manager', 'technical_manager'] as const;
export const MANAGEMENT_ROLES = ['admin', 'senior_manager', 'technical_manager', 'editor'] as const;
export const AUTHOR_ROLES = ['author', 'contributor'] as const;

export type UserWithRoles = { roles: string[] };

/**
 * Checks if a user has at least one of the specified roles.
 */
export function hasRole(user: UserWithRoles, ...roles: string[]): boolean {
  if (!user?.roles || !Array.isArray(user.roles)) return false;
  return roles.some((role) => user.roles.includes(role));
}

/**
 * Checks if a user has administrative privileges (admin, senior_manager, technical_manager).
 */
export function isAdmin(user: UserWithRoles): boolean {
  return hasRole(user, ...ADMIN_ROLES);
}

/**
 * Checks if a user has editorial/managerial privileges over content and workflow.
 */
export function isManager(user: UserWithRoles): boolean {
  return hasRole(user, ...MANAGEMENT_ROLES);
}

/**
 * Checks if a user has author/contributor privileges to create drafts.
 */
export function isAuthor(user: UserWithRoles): boolean {
  return hasRole(user, ...AUTHOR_ROLES);
}

/**
 * Checks if a user can manage article workflow transitions across all articles.
 */
export function canManageWorkflow(user: UserWithRoles): boolean {
  return isManager(user);
}
