import type { AiFeatureKey } from '@/lib/content-workflow';

export type AiUsage = {
  requestId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  estimatedCostUsd?: number;
};

export type AiExecutionContext = {
  requestId: string;
  userId: string;
  articleId?: string;
  featureKey: AiFeatureKey;
  locale: 'fa' | 'en';
  signal?: AbortSignal;
};

export type TitleSuggestion = {
  title: string;
  rationale?: string;
  keywords?: string[];
};

export type ReviewAnnotation = {
  id: string;
  start: number;
  end: number;
  message: string;
  suggestedText?: string;
  severity: 'info' | 'suggestion' | 'warning';
};

export type PostPublishDraft = {
  destinationType: string;
  title?: string;
  body: string;
  hashtags?: string[];
  metadata?: Record<string, unknown>;
};

export interface AiProviderAdapter {
  readonly providerKey: string;
  suggestTitles(input: { topic: string; locale: 'fa' | 'en' }, context: AiExecutionContext): Promise<{
    suggestions: TitleSuggestion[];
    usage: AiUsage;
  }>;
  detectReviewAnnotations(input: { content: string }, context: AiExecutionContext): Promise<{
    annotations: ReviewAnnotation[];
    usage: AiUsage;
  }>;
  rewriteAnnotation(input: { content: string; annotation: ReviewAnnotation }, context: AiExecutionContext): Promise<{
    suggestedText: string;
    explanation?: string;
    usage: AiUsage;
  }>;
  createPostPublishDraft(input: { title: string; summary: string; content: string; destinationType: string }, context: AiExecutionContext): Promise<{
    draft: PostPublishDraft;
    usage: AiUsage;
  }>;
}

export type ConnectorCapabilities = {
  canCreateDraft: boolean;
  canPublish: boolean;
  requiresUserApproval: boolean;
};

export type ContentDestinationAdapter = {
  destinationKey: string;
  displayName: string;
  capabilities: ConnectorCapabilities;
  testConnection(): Promise<{ ok: boolean; message?: string }>;
  createDraft(input: PostPublishDraft, userId: string): Promise<{ externalId: string; url?: string }>;
  publish(externalId: string, userId: string): Promise<{ url?: string }>;
};

export function canAutoPublish(adapter: ContentDestinationAdapter): boolean {
  return adapter.capabilities.canPublish && !adapter.capabilities.requiresUserApproval;
}
