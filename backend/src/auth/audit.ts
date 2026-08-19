import type { FastifyRequest } from 'fastify';
import { db } from '../db/pool.js';

export type AuthEventInput = {
  request: FastifyRequest;
  eventType: string;
  outcome: 'success' | 'failure' | 'blocked';
  provider?: string;
  userId?: string | null;
  email?: string | null;
  errorCode?: string | null;
  startedAt?: number;
  metadata?: Record<string, unknown>;
};

function requestIp(request: FastifyRequest) {
  return request.ip || request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || null;
}

function safeMetadata(metadata: Record<string, unknown> = {}) {
  const forbidden = /pass(word)?|token|secret|code|authorization|cookie|client_secret/i;
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !forbidden.test(key)));
}

export async function recordAuthEvent(input: AuthEventInput) {
  const latency = input.startedAt ? Math.max(0, Date.now() - input.startedAt) : null;
  try {
    await db.query(
      `INSERT INTO auth_events (request_id, user_id, email, provider, event_type, outcome, error_code, ip_address, user_agent, latency_ms, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        input.request.id,
        input.userId ?? null,
        input.email ?? null,
        input.provider ?? 'password',
        input.eventType,
        input.outcome,
        input.errorCode ?? null,
        requestIp(input.request),
        input.request.headers['user-agent']?.slice(0, 500) ?? null,
        latency,
        safeMetadata(input.metadata),
      ],
    );
  } catch {
    // Auth must not fail because audit storage is unavailable. Fastify request logging
    // still retains the request id and the endpoint error for operational diagnosis.
  }
}
