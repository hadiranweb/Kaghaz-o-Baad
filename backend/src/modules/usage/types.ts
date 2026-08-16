export type UsageStatus = 'started' | 'succeeded' | 'failed' | 'timed_out';

export type UsageMetrics = {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  units?: number;
  currency?: string;
  costMinor?: number;
  pricingVersion?: string;
};

export type UsageContext = {
  userId: string;
  articleId?: string;
  requestId: string;
  featureKey: string;
  toolName?: string;
  provider: string;
  model: string;
  metadata?: Record<string, unknown>;
};

export type UsageExecutionResult<T> = {
  value: T;
  metrics?: UsageMetrics;
};

export type UsageEventInsert = UsageContext & UsageMetrics & {
  status: UsageStatus;
  errorCode?: string;
  startedAt: Date;
  completedAt?: Date;
};
