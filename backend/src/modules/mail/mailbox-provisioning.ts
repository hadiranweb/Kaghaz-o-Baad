import type { PoolClient } from 'pg';
import { LiaraMailError } from './liara-mail-client.js';
import { hasVerifiedFactor, isIdentityActive, resolveIdentityConsistencyErrors, validatePlatformEmailFormat } from '../../auth/identity-consistency.js';

export type MailboxProvisioningConfig = {
  enabled: boolean;
  domain: string;
  mailServerId?: string;
};

export async function enqueueMailboxCreateTx(client: PoolClient, input: {
  userId: string;
  platformEmail: string;
  config: MailboxProvisioningConfig;
}) {
  if (!input.config.enabled) return null;
  if (!input.config.mailServerId) throw new LiaraMailError('liara_mail_server_id_missing', 'configuration');
  const domain = input.config.domain.toLowerCase();
  const localpart = input.platformEmail.slice(0, -(domain.length + 1));
  if (!localpart) throw new LiaraMailError('platform_email_localpart_missing', 'configuration');
  const domainResult = await client.query<{ id: string; domain: string; mail_server_id: string | null }>(
    `SELECT id, domain, mail_server_id FROM platform_domains
     WHERE domain=$1 AND is_active=TRUE LIMIT 1`, [domain],
  );
  const platformDomain = domainResult.rows[0];
  if (!platformDomain || platformDomain.mail_server_id !== input.config.mailServerId) {
    throw new LiaraMailError('platform_domain_not_configured', 'configuration');
  }

  // Central identity hardening: require verified factor before mailbox provisioning
  const identityResult = await client.query<{ verified: boolean; status: string; email_localpart: string }>(
    `SELECT
       CASE WHEN EXISTS (SELECT 1 FROM user_login_identities WHERE user_id=$1 AND is_verified = TRUE)
            OR EXISTS (SELECT 1 FROM user_contact_methods WHERE user_id=$1 AND verified_at IS NOT NULL)
            THEN TRUE ELSE FALSE END AS verified,
       identity_status AS status,
       platform_email_localpart AS email_localpart
     FROM users WHERE id=$1`, [input.userId],
  );
  const identityRow = identityResult.rows[0];
  if (!identityRow) throw new LiaraMailError('user_not_found', 'invalid_request');
  if (identityRow.status !== 'active') throw new LiaraMailError('user_identity_not_active', 'invalid_request');
  if (!identityRow.verified) throw new LiaraMailError('user_requires_verified_factor_before_mailbox', 'invalid_request');
  if (!validatePlatformEmailFormat(input.platformEmail, domain)) {
    throw new LiaraMailError('invalid_platform_email_format', 'invalid_request');
  }
  const mailboxResult = await client.query<{ id: string }>(
    `INSERT INTO user_mailboxes
       (user_id, platform_domain_id, provider_mail_server_id, account_name, address, status, desired_state)
     VALUES ($1,$2,$3,$4,$5,'pending','active')
     ON CONFLICT (user_id) DO UPDATE SET updated_at=now()
     RETURNING id`,
    [input.userId, platformDomain.id, input.config.mailServerId, localpart, input.platformEmail],
  );
  const mailbox = mailboxResult.rows[0];
  if (!mailbox) throw new Error('mailbox_insert_returned_no_row');
  await client.query(
    `INSERT INTO mailbox_provisioning_jobs (mailbox_id, operation, idempotency_key)
     VALUES ($1,'create',$2) ON CONFLICT (idempotency_key) DO NOTHING`,
    [mailbox.id, `mailbox:${mailbox.id}:create`],
  );
  return mailbox.id;
}
