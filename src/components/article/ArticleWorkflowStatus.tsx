import { Badge } from '@/components/ui/badge';
import {
  ARTICLE_STATUSES,
  type ArticleStatus,
  type ArticleWorkflowAction,
  type ArticleWorkflowRole,
  canPerformWorkflowAction,
  getNextArticleStatus,
} from '@/lib/content-workflow';
import { ACTION_LABELS, STATUS_LABELS, STATUS_VARIANTS } from './article-workflow-labels';

export function getArticleStatusLabel(status: ArticleStatus, locale: 'fa' | 'en' = 'fa') {
  return STATUS_LABELS[status][locale];
}

export function getAllowedArticleActions(
  role: ArticleWorkflowRole,
  status: ArticleStatus,
): ArticleWorkflowAction[] {
  const actions = Object.keys(ACTION_LABELS) as ArticleWorkflowAction[];
  return actions.filter((action) => canPerformWorkflowAction(role, action, status));
}

export function ArticleWorkflowStatus({
  status,
  locale = 'fa',
  className,
}: {
  status: ArticleStatus;
  locale?: 'fa' | 'en';
  className?: string;
}) {
  const label = STATUS_LABELS[status][locale];
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={className}>
      {label}
    </Badge>
  );
}

export { ARTICLE_STATUSES, getNextArticleStatus };
