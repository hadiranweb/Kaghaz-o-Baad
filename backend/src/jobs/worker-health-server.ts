import { createServer, type Server } from 'node:http';
import { db } from '../db/pool.js';
import type { AppEnv } from '../config/env.js';

export type WorkerHealthState = {
  startedAt: number;
  stopping: boolean;
  lastLoopAt?: number;
  lastLoopError?: string;
};

function sendJson(res: import('node:http').ServerResponse, statusCode: number, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(body);
}

export function createWorkerHealthServer(env: AppEnv, state: WorkerHealthState): Server {
  return createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
      return;
    }

    if (requestUrl.pathname === '/' || requestUrl.pathname === '/healthz' || requestUrl.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'kaghazbaad-mailbox-worker',
        status: state.stopping ? 'stopping' : 'alive',
        uptimeSeconds: Math.floor((Date.now() - state.startedAt) / 1000),
      });
      return;
    }

    if (requestUrl.pathname === '/readyz') {
      if (state.stopping) {
        sendJson(res, 503, { ok: false, status: 'stopping' });
        return;
      }
      if (!env.MAILBOX_PROVISIONING_ENABLED || !env.MAILBOX_WORKER_ENABLED) {
        sendJson(res, 503, { ok: false, status: 'disabled' });
        return;
      }
      if (!env.LIARA_MAIL_API_TOKEN || !env.LIARA_MAIL_SERVER_ID) {
        sendJson(res, 503, { ok: false, status: 'configuration_missing' });
        return;
      }
      try {
        await db.query('SELECT 1');
        sendJson(res, 200, {
          ok: true,
          status: 'ready',
          database: 'reachable',
          lastLoopSecondsAgo: state.lastLoopAt ? Math.floor((Date.now() - state.lastLoopAt) / 1000) : null,
        });
      } catch {
        sendJson(res, 503, { ok: false, status: 'database_unreachable' });
      }
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not_found' });
  });
}

export async function listenWorkerHealthServer(server: Server, env: AppEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(env.MAILBOX_HEALTH_PORT, env.HOST);
  });
}

export async function closeWorkerHealthServer(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
