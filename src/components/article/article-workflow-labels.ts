import type { ArticleStatus, ArticleWorkflowAction } from '@/lib/content-workflow';

export const STATUS_LABELS: Record<ArticleStatus, { fa: string; en: string }> = {
  draft: { fa: 'پیش‌نویس', en: 'Draft' },
  in_review: { fa: 'در انتظار بررسی', en: 'In review' },
  changes_requested: { fa: 'نیازمند اصلاح', en: 'Changes requested' },
  approved: { fa: 'تأییدشده', en: 'Approved' },
  scheduled: { fa: 'زمان‌بندی‌شده', en: 'Scheduled' },
  published: { fa: 'منتشرشده', en: 'Published' },
  archived: { fa: 'بایگانی‌شده', en: 'Archived' },
};

export const STATUS_VARIANTS: Record<ArticleStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  in_review: 'outline',
  changes_requested: 'destructive',
  approved: 'default',
  scheduled: 'outline',
  published: 'default',
  archived: 'secondary',
};

export const ACTION_LABELS: Record<ArticleWorkflowAction, { fa: string; en: string }> = {
  submit_for_review: { fa: 'ارسال برای بررسی', en: 'Submit for review' },
  request_changes: { fa: 'درخواست اصلاح', en: 'Request changes' },
  approve: { fa: 'تأیید', en: 'Approve' },
  schedule: { fa: 'زمان‌بندی', en: 'Schedule' },
  publish: { fa: 'انتشار', en: 'Publish' },
  archive: { fa: 'بایگانی', en: 'Archive' },
  restore_draft: { fa: 'بازگردانی به پیش‌نویس', en: 'Restore draft' },
};
