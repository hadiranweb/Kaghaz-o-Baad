import { randomUUID } from 'node:crypto';
import { loadEnv } from '../config/env.js';
import { LiaraMailClient, LiaraMailError, type LiaraMailAccount } from '../modules/mail/liara-mail-client.js';
import {
  claimMailboxJobs,
  isRetriableError,
  markMailboxJobDeleted,
  markMailboxJobRetryable,
  markMailboxJobSucceeded,
  type MailboxJob,
} from '../modules/mail/mailbox-repository.js';
import { closeDatabase } from '../db/pool.js';
import { closeWorkerHealthServer, createWorkerHealthServer, listenWorkerHealthServer, type WorkerHealthState } from './worker-health-server.js';

const env = loadEnv();

export type WorkerResult = { claimed: number; succeeded: number; retried: number; failed: number };

function calculateBackoff(attempt: number) {
  const base = env.MAILBOX_BACKOFF_BASE_MS;
  const cap = env.MAILBOX_BACKOFF_MAX_MS;
  const exponential = Math.min(cap, base * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.max(250, Math.floor(exponential * 0.2)));
  return Math.min(cap, exponential + jitter);
}

function providerError(error: unknown) {
  if (error instanceof LiaraMailError) {
    return { code: error.message, message: error.message, status: error.status, kind: error.kind, response: error.response };
  }
  return { code: 'mailbox_worker_unexpected_error', message: error instanceof Error ? error.message : 'unknown_error', kind: 'unknown' as const, response: {} };
}

async function findExistingAccount(client: LiaraMailClient, job: MailboxJob): Promise<LiaraMailAccount | undefined> {
  const listed = await client.listAccounts(job.provider_mail_server_id);
  return listed.accounts.find((account) => account.name === job.account_name);
}

async function processCreate(client: LiaraMailClient, job: MailboxJob) {
  if (job.provider_account_id) {
    return { providerAccountId: job.provider_account_id, response: { reconciled: true } };
  }
  const availability = await client.checkAvailability(job.provider_mail_server_id, job.account_name);
  const availabilityText = String(availability.status ?? '').toLowerCase();
  if (availabilityText.includes('unavailable') || availabilityText.includes('taken') || availabilityText.includes('exists')) {
    const existing = await findExistingAccount(client, job);
    if (!existing) throw new LiaraMailError('liara_mail_name_unavailable_without_matching_account', 'conflict', 409);
    return { providerAccountId: existing.id, response: { reconciled: true, account: { id: existing.id, name: existing.name } } };
  }
  const created = await client.createAccount(job.provider_mail_server_id, job.account_name);
  const existing = await findExistingAccount(client, job);
  if (!existing) {
    throw new LiaraMailError('liara_mail_create_unconfirmed', 'transient', 503, { status: created.status });
  }
  return {
    providerAccountId: existing.id,
    response: { created: true, status: created.status, account: { id: existing.id, name: existing.name } },
  };
}

async function processReconcile(client: LiaraMailClient, job: MailboxJob) {
  const existing = await findExistingAccount(client, job);
  if (!existing) {
    return processCreate(client, { ...job, provider_account_id: null });
  }
  if (job.provider_account_id && job.provider_account_id !== existing.id) {
    throw new LiaraMailError('liara_mail_provider_account_id_drift', 'conflict', 409, { expected: job.provider_account_id, actual: existing.id });
  }
  return { providerAccountId: existing.id, response: { reconciled: true, account: { id: existing.id, name: existing.name } } };
}

async function processDelete(client: LiaraMailClient, job: MailboxJob) {
  if (job.provider_account_id) await client.deleteAccount(job.provider_mail_server_id, job.provider_account_id);
  return { response: { deleted: true } };
}

async function processJob(client: LiaraMailClient, job: MailboxJob): Promise<'succeeded' | 'retried' | 'failed'> {
  try {
    if (job.operation === 'delete') {
      const result = await processDelete(client, job);
      await markMailboxJobDeleted(job.id, job.mailbox_id, result.response);
      return 'succeeded';
    }
    const result = job.operation === 'reconcile' ? await processReconcile(client, job) : await processCreate(client, job);
    await markMailboxJobSucceeded(job.id, job.mailbox_id, result.providerAccountId, result.response);
    return 'succeeded';
  } catch (error) {
    const normalized = providerError(error);
    const retry = isRetriableError(normalized.kind) || (normalized.kind === 'conflict' && job.operation === 'reconcile');
    const delay = retry ? calculateBackoff(job.attempts) : env.MAILBOX_BACKOFF_MAX_MS;
    await markMailboxJobRetryable(job, normalized, new Date(Date.now() + delay), normalized.response);
    return retry && job.attempts < env.MAILBOX_MAX_ATTEMPTS ? 'retried' : 'failed';
  }
}

export async function runMailboxWorkerOnce(): Promise<WorkerResult> {
  if (!env.MAILBOX_PROVISIONING_ENABLED || !env.MAILBOX_WORKER_ENABLED) return { claimed: 0, succeeded: 0, retried: 0, failed: 0 };
  if (!env.LIARA_MAIL_API_TOKEN || !env.LIARA_MAIL_SERVER_ID) throw new Error('mailbox_worker_configuration_missing');
  const client = new LiaraMailClient({ baseUrl: env.LIARA_MAIL_API_BASE_URL, token: env.LIARA_MAIL_API_TOKEN, timeoutMs: env.MAILBOX_HTTP_TIMEOUT_MS });
  const jobs = await claimMailboxJobs({ batchSize: env.MAILBOX_WORKER_BATCH_SIZE, leaseMs: env.MAILBOX_LEASE_MS, workerId: `${process.pid}-${randomUUID()}` });
  const result: WorkerResult = { claimed: jobs.length, succeeded: 0, retried: 0, failed: 0 };
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      if (!job) continue;
      const status = await processJob(client, job);
      result[status] += 1;
    }
  };
  await Promise.all(Array.from({ length: Math.min(env.MAILBOX_WORKER_CONCURRENCY, Math.max(1, jobs.length)) }, worker));
  return result;
}

async function main() {
  const state: WorkerHealthState = { startedAt: Date.now(), stopping: false };
  const healthServer = createWorkerHealthServer(env, state);
  await listenWorkerHealthServer(healthServer, env);
  console.log(JSON.stringify({ ok: true, service: 'kaghazbaad-mailbox-worker', healthPort: env.MAILBOX_HEALTH_PORT }));
  if (!env.MAILBOX_PROVISIONING_ENABLED || !env.MAILBOX_WORKER_ENABLED) {
    console.log(JSON.stringify({ ok: true, enabled: false }));
    await new Promise<void>(() => undefined);
    return;
  }
  let stopping = false;
  const stop = () => { stopping = true; state.stopping = true; };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  while (!stopping) {
    try {
      const result = await runMailboxWorkerOnce();
      state.lastLoopAt = Date.now();
      state.lastLoopError = undefined;
      if (result.claimed > 0) console.log(JSON.stringify({ ok: true, ...result }));
    } catch (error) {
      state.lastLoopAt = Date.now();
      state.lastLoopError = error instanceof Error ? error.message : 'unknown_error';
      console.error(JSON.stringify({ ok: false, code: 'mailbox_worker_loop_error', message: state.lastLoopError }));
    }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, env.MAILBOX_WORKER_POLL_MS));
  }
  await closeWorkerHealthServer(healthServer);
  await closeDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
