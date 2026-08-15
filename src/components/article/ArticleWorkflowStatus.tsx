import { Badge } from '@/components/ui/badge';
import {
  ARTICLE_STATUSES,
  type ArticleStatus,
  type ArticleWorkflowAction,
  type ArticleWorkflowRole,
  canPerformWorkflowAction,
  getNextArticleStatus,
} from '@/lib/content-workflow';

const STATUS_LABELS: Record<ArticleStatus, { fa: string; en: string }> = {
  draft: { fa: 'پیش‌نویس', en: 'Draft' },
  in_review: { fa: 'در انتظار بررسی', en: 'In review' },
  changes_requested: { fa: 'نیازمند اصلاح', en: 'Changes requested' },
  approved: { fa: 'تأییدشده', en: 'Approved' },
  scheduled: { fa: 'زمان‌بندی‌شده', en: 'Scheduled' },
  published: { fa: 'منتشرشده', en: 'Published' },
  archived: { fa: 'بایگانی‌شده', en: 'Archived' },
};

const STATUS_VARIANTS: Record<ArticleStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  in_review: 'outline',
  changes_requested: 'destructive',
  approved: 'default',
  scheduled: 'outline',
  published: 'default',
  archived: 'secondary',
};

const ACTION_LABELS: Record<ArticleWorkflowAction, { fa: string; en: string }> = {
  submit_for_review: { fa: 'ارسال برای بررسی', en: 'Submit for review' },
  request_changes: { fa: 'درخواست اصلاح', en: 'Request changes' },
  approve: { fa: 'تأیید', en: 'Approve' },
  schedule: { fa: 'زمان‌بندی', en: 'Schedule' },
  publish: { fa: 'انتشار', en: 'Publish' },
  archive: { fa: 'بایگانی', en: 'Archive' },
  restore_draft: { fa: 'بازگردانی به پیش‌نویس', en: 'Restore draft' },
};

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

export { ACTION_LABELS, ARTICLE_STATUSES, getNextArticleStatus, STATUS_LABELS };
