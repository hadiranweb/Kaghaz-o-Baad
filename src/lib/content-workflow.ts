export const ARTICLE_STATUSES = [
  'draft',
  'in_review',
  'changes_requested',
  'approved',
  'scheduled',
  'published',
  'archived',
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export type ArticleWorkflowAction =
  | 'submit_for_review'
  | 'request_changes'
  | 'approve'
  | 'schedule'
  | 'publish'
  | 'archive'
  | 'restore_draft';

export type ArticleWorkflowRole = 'author' | 'contributor' | 'editor' | 'admin';

export type ArticleWorkflowEvent = {
  articleId: string;
  actorId: string | null;
  fromStatus: ArticleStatus;
  toStatus: ArticleStatus;
  action: ArticleWorkflowAction;
  note?: string;
  metadata?: Record<string, unknown>;
};

const TRANSITIONS: Record<ArticleWorkflowAction, readonly [ArticleStatus, ArticleStatus][]> = {
  submit_for_review: [
    ['draft', 'in_review'],
    ['changes_requested', 'in_review'],
  ],
  request_changes: [['in_review', 'changes_requested']],
  approve: [['in_review', 'approved']],
  schedule: [['approved', 'scheduled']],
  publish: [
    ['approved', 'published'],
    ['scheduled', 'published'],
  ],
  archive: [['published', 'archived']],
  restore_draft: [
    ['archived', 'draft'],
    ['changes_requested', 'draft'],
  ],
};

const ROLE_ACTIONS: Record<ArticleWorkflowRole, readonly ArticleWorkflowAction[]> = {
  author: ['submit_for_review', 'restore_draft'],
  contributor: ['submit_for_review', 'restore_draft'],
  editor: ['request_changes', 'approve', 'schedule', 'publish', 'archive', 'restore_draft'],
  admin: [
    'submit_for_review',
    'request_changes',
    'approve',
    'schedule',
    'publish',
    'archive',
    'restore_draft',
  ],
};

export function canPerformWorkflowAction(
  role: ArticleWorkflowRole,
  action: ArticleWorkflowAction,
  fromStatus: ArticleStatus,
): boolean {
  if (!ROLE_ACTIONS[role].includes(action)) return false;
  return TRANSITIONS[action].some(([from]) => from === fromStatus);
}

export function getNextArticleStatus(
  action: ArticleWorkflowAction,
  fromStatus: ArticleStatus,
): ArticleStatus | null {
  return TRANSITIONS[action].find(([from]) => from === fromStatus)?.[1] ?? null;
}

export function createWorkflowEvent(input: {
  articleId: string;
  actorId: string | null;
  role: ArticleWorkflowRole;
  action: ArticleWorkflowAction;
  fromStatus: ArticleStatus;
  note?: string;
  metadata?: Record<string, unknown>;
}): ArticleWorkflowEvent {
  const toStatus = getNextArticleStatus(input.action, input.fromStatus);
  if (!toStatus || !canPerformWorkflowAction(input.role, input.action, input.fromStatus)) {
    throw new Error(`Invalid article workflow transition: ${input.fromStatus} -> ${input.action}`);
  }

  return {
    articleId: input.articleId,
    actorId: input.actorId,
    fromStatus: input.fromStatus,
    toStatus,
    action: input.action,
    note: input.note,
    metadata: input.metadata,
  };
}

export const AI_FEATURE_KEYS = {
  titleSuggestions: 'ai.title_suggestions',
  reviewDetection: 'ai.review_detection',
  rewrite: 'ai.rewrite',
  postPublishContent: 'ai.post_publish_content',
} as const;

export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[keyof typeof AI_FEATURE_KEYS];

export type AiExecutionIntent = {
  requestId: string;
  userId: string;
  articleId?: string;
  featureKey: AiFeatureKey;
  provider?: string;
  model?: string;
  userInitiated: boolean;
  requiresApproval: boolean;
};

export function requiresExplicitAiApproval(featureKey: AiFeatureKey): boolean {
  return featureKey === AI_FEATURE_KEYS.rewrite || featureKey === AI_FEATURE_KEYS.postPublishContent;
}
