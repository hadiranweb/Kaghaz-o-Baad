import type { PoolClient } from 'pg';

export type CentralIdentityState = {
  userId: string;
  platformEmail: string;
  platformEmailLocalpart: string;
  identityStatus: string;
  verifiedFactors: { kind: string; value: string; verifiedAt: Date | null }[];
  loginIdentities: { provider: string; providerSubject: string; isVerified: boolean; verifiedAt: Date | null }[];
  mailboxStatus: string;
  mailboxAddress: string | null;
};

export function validatePlatformEmailFormat(platformEmail: string, domain: string): boolean {
  if (!platformEmail || typeof platformEmail !== 'string') return false;
  const lower = platformEmail.toLowerCase();
  const expectedDomain = `@${domain.toLowerCase()}`;
  if (!lower.endsWith(expectedDomain)) return false;
  const localpart = lower.slice(0, -expectedDomain.length);
  if (!localpart || localpart.length > 64) return false;
  return /^[a-z0-9]+([.-][a-z0-9]+)*$/.test(localpart);
}

export function extractLocalpart(platformEmail: string, domain: string): string {
  const lower = platformEmail.toLowerCase();
  const expectedDomain = `@${domain.toLowerCase()}`;
  if (!lower.endsWith(expectedDomain)) throw new Error('platform_email_domain_mismatch');
  return lower.slice(0, -expectedDomain.length);
}

export function hasVerifiedFactor(identity: CentralIdentityState): boolean {
  const verifiedContact = identity.verifiedFactors.some((f) => f.verifiedAt !== null);
  const verifiedLogin = identity.loginIdentities.some((l) => l.isVerified);
  return verifiedContact || verifiedLogin;
}

export function isIdentityActive(identity: CentralIdentityState): boolean {
  return identity.identityStatus === 'active';
}

export function isMailboxProvisionReady(identity: CentralIdentityState, mailboxEnabled: boolean): boolean {
  if (!mailboxEnabled) return false;
  if (!isIdentityActive(identity)) return false;
  if (!hasVerifiedFactor(identity)) return false;
  if (identity.mailboxStatus === 'deleted' || identity.mailboxStatus === 'deprovisioning') return false;
  return true;
}

export function resolveIdentityConsistencyErrors(identity: CentralIdentityState, mailboxEnabled: boolean): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!identity.userId) errors.push('missing_user_id');
  if (!isIdentityActive(identity)) errors.push('identity_not_active');
  if (mailboxEnabled && !identity.mailboxAddress && identity.mailboxStatus !== 'deleted' && identity.mailboxStatus !== 'deprovisioning') {
    warnings.push('mailbox_not_provisioned');
  }
  if (mailboxEnabled && identity.mailboxStatus === 'pending' && !hasVerifiedFactor(identity)) {
    errors.push('mailbox_provision_requires_verified_factor');
  }
  if (!validatePlatformEmailFormat(identity.platformEmail, 'kaghazobaad.ir')) {
    errors.push('invalid_platform_email_format');
  }
  if (identity.loginIdentities.length === 0) {
    warnings.push('no_login_identities_registered');
  }
  if (identity.verifiedFactors.length === 0) {
    warnings.push('no_verified_contact_factors');
  }
  return { errors, warnings };
}
