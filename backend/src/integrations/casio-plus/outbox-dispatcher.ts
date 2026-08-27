import type { LeasedCasioOutboxEvent } from './outbox-repository.js';
import { CasioDispatchError } from './errors.js';
import {
  leaseCasioOutboxEvents,
  markCasioOutboxDelivered,
  rescheduleCasioOutboxEvent,
} from './outbox-repository.js';

export type CasioOutboxSender = (event: LeasedCasioOutboxEvent) => Promise<{ runId: string }>;

export type CasioOutboxDispatcherOptions = {
  batchSize: number;
  concurrency: number;
  leaseMs: number;
  maxAttempts: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  sender: CasioOutboxSender;
  now?: () => Date;
  jitter?: () => number;
};

export type CasioOutboxDispatchSummary = {
  leased: number;
  delivered: number;
  rescheduled: number;
  deadLettered: number;
  leaseLost: number;
};

function retryAt(input: {
  attempts: number;
  maxAttempts: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  now: () => Date;
  jitter: () => number;
}): Date | null {
  if (input.attempts >= input.maxAttempts) return null;
  const exponent = Math.max(0, input.attempts - 1);
  const bounded = Math.min(input.backoffMaxMs, input.backoffBaseMs * (2 ** exponent));
  const jitterFactor = 0.8 + (Math.max(0, Math.min(1, input.jitter())) * 0.4);
  return new Date(input.now().getTime() + Math.round(bounded * jitterFactor));
}

async function mapLimit<T>(items: T[], concurrency: number, callback: (item: T) => Promise<void>): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await callback(items[index] as T);
    }
  });
  await Promise.all(workers);
}

export function createCasioOutboxDispatcher(options: CasioOutboxDispatcherOptions) {
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 100) {
    throw new Error('invalid_casio_outbox_batch_size');
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 10) {
    throw new Error('invalid_casio_outbox_concurrency');
  }
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1 || options.maxAttempts > 20) {
    throw new Error('invalid_casio_outbox_max_attempts');
  }

  const now = options.now ?? (() => new Date());
  const jitter = options.jitter ?? Math.random;

  return {
    async dispatchOnce(): Promise<CasioOutboxDispatchSummary> {
      const events = await leaseCasioOutboxEvents({ limit: options.batchSize, leaseMs: options.leaseMs });
      const summary: CasioOutboxDispatchSummary = {
        leased: events.length,
        delivered: 0,
        rescheduled: 0,
        deadLettered: 0,
        leaseLost: 0,
      };

      await mapLimit(events, options.concurrency, async (event) => {
        try {
          const result = await options.sender(event);
          const updated = await markCasioOutboxDelivered({
            outboxId: event.outboxId,
            leaseToken: event.leaseToken,
            runId: result.runId,
          });
          if (updated) summary.delivered += 1;
          else summary.leaseLost += 1;
        } catch (error) {
          const dispatchError = error instanceof CasioDispatchError
            ? error
            : new CasioDispatchError('casio_network_error', true);
          const nextRetry = dispatchError.retryable
            ? retryAt({
              attempts: event.attempts,
              maxAttempts: options.maxAttempts,
              backoffBaseMs: options.backoffBaseMs,
              backoffMaxMs: options.backoffMaxMs,
              now,
              jitter,
            })
            : null;
          const updated = await rescheduleCasioOutboxEvent({
            outboxId: event.outboxId,
            leaseToken: event.leaseToken,
            errorCode: dispatchError.code,
            retryAt: nextRetry,
          });
          if (!updated) {
            summary.leaseLost += 1;
          } else if (nextRetry) {
            summary.rescheduled += 1;
          } else {
            summary.deadLettered += 1;
          }
        }
      });

      return summary;
    },
  };
}
