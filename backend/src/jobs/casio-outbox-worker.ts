import { loadEnv } from '../config/env.js';
import { CasioPlusClient } from '../integrations/casio-plus/client.js';
import { createCasioOutboxDispatcher } from '../integrations/casio-plus/outbox-dispatcher.js';
import { closeDatabase } from '../db/pool.js';
import {
  closeWorkerHealthServer,
  createWorkerHealthServer,
  listenWorkerHealthServer,
  type WorkerHealthState,
} from './worker-health-server.js';

const env = loadEnv();

export type CasioOutboxWorkerResult = {
  claimed: number;
  delivered: number;
  retried: number;
  failed: number;
  leaseLost: number;
};

export async function runCasioOutboxWorkerOnce(): Promise<CasioOutboxWorkerResult> {
  if (!env.CASIO_PLUS_ENABLED || !env.CASIO_OUTBOX_WORKER_ENABLED) {
    return { claimed: 0, delivered: 0, retried: 0, failed: 0, leaseLost: 0 };
  }
  const client = new CasioPlusClient(env);
  const dispatcher = createCasioOutboxDispatcher({
    batchSize: env.CASIO_OUTBOX_WORKER_BATCH_SIZE,
    concurrency: env.CASIO_OUTBOX_WORKER_CONCURRENCY,
    leaseMs: env.CASIO_OUTBOX_LEASE_MS,
    maxAttempts: env.CASIO_OUTBOX_MAX_ATTEMPTS,
    backoffBaseMs: env.CASIO_OUTBOX_BACKOFF_BASE_MS,
    backoffMaxMs: env.CASIO_OUTBOX_BACKOFF_MAX_MS,
    sender: (event) => client.invoke(event),
  });
  const result = await dispatcher.dispatchOnce();
  return {
    claimed: result.leased,
    delivered: result.delivered,
    retried: result.rescheduled,
    failed: result.deadLettered,
    leaseLost: result.leaseLost,
  };
}

async function main() {
  const state: WorkerHealthState = { startedAt: Date.now(), stopping: false };
  const healthServer = createWorkerHealthServer(env, state, {
    service: 'kaghazbaad-casio-outbox-worker',
    isEnabled: () => env.CASIO_PLUS_ENABLED && env.CASIO_OUTBOX_WORKER_ENABLED,
    isConfigurationComplete: () => Boolean(env.CASIO_PLUS_BASE_URL && env.KAGHAZBAAD_TO_CASIO_HMAC_SECRET),
  });
  await listenWorkerHealthServer(healthServer, env, env.CASIO_OUTBOX_HEALTH_PORT);
  console.log(JSON.stringify({ ok: true, service: 'kaghazbaad-casio-outbox-worker', healthPort: env.CASIO_OUTBOX_HEALTH_PORT }));

  if (!env.CASIO_PLUS_ENABLED || !env.CASIO_OUTBOX_WORKER_ENABLED) {
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
      const result = await runCasioOutboxWorkerOnce();
      state.lastLoopAt = Date.now();
      state.lastLoopError = undefined;
      if (result.claimed > 0 || result.failed > 0 || result.leaseLost > 0) {
        console.log(JSON.stringify({ ok: true, ...result }));
      }
    } catch (error) {
      state.lastLoopAt = Date.now();
      state.lastLoopError = error instanceof Error ? error.message : 'unknown_error';
      console.error(JSON.stringify({ ok: false, code: 'casio_outbox_worker_loop_error', message: state.lastLoopError }));
    }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, env.CASIO_OUTBOX_WORKER_POLL_MS));
  }

  await closeWorkerHealthServer(healthServer);
  await closeDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
