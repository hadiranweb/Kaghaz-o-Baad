import { randomUUID } from 'node:crypto';
import { insertUsageEvent, updateUsageEvent } from './repository.js';
import type { UsageContext, UsageExecutionResult, UsageMetrics } from './types.js';

export async function runUsage<T>(
  context: Omit<UsageContext, 'requestId'> & { requestId?: string; timeoutMs?: number },
  executor: (context: UsageContext) => Promise<UsageExecutionResult<T>>,
) {
  const { timeoutMs, ...baseContext } = context;
  const usageContext: UsageContext = { ...baseContext, requestId: baseContext.requestId ?? randomUUID() };
  const startedAt = new Date();
  const started = await insertUsageEvent({ ...usageContext, status: 'started', startedAt });
  const usageId = started.rows[0]?.id as string;

  try {
    const execution = executor(usageContext);
    const result = timeoutMs && timeoutMs > 0
      ? await withTimeout(execution, timeoutMs)
      : await execution;
    const completedAt = new Date();
    await updateUsageEvent(usageId, {
      ...sanitizeMetrics(result.metrics),
      status: 'succeeded',
      completedAt,
    });
    return { ...result, requestId: usageContext.requestId, usageId };
  } catch (error) {
    await updateUsageEvent(usageId, {
      status: error instanceof UsageTimeoutError ? 'timed_out' : 'failed',
      errorCode: errorCode(error),
      completedAt: new Date(),
    });
    throw error;
  }
}

class UsageTimeoutError extends Error {
  constructor() {
    super('usage_execution_timed_out');
    this.name = 'UsageTimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new UsageTimeoutError()), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

function errorCode(error: unknown) {
  if (error instanceof Error && error.message.length <= 200) return error.message;
  return 'usage_execution_failed';
}

function sanitizeMetrics(metrics: UsageMetrics | undefined): UsageMetrics {
  if (!metrics) return {};
  return {
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
    cachedTokens: metrics.cachedTokens,
    units: metrics.units,
    currency: metrics.currency,
    costMinor: metrics.costMinor,
    pricingVersion: metrics.pricingVersion,
  };
}
