import { supabase } from '@/integrations/supabase/client';
import type { ArticleStatus } from '@/lib/content-workflow';

export type WorkflowTransitionResult = {
  article_id: string;
  from_status: ArticleStatus;
  to_status: ArticleStatus;
  actor_id: string;
};

export async function transitionArticle(input: {
  articleId: string;
  action: string;
  note?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke('article-workflow', {
    body: input,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'Article workflow failed');
  return data.transition as WorkflowTransitionResult;
}

export type ArticleComment = {
  id: string;
  article_id: string;
  author_id: string | null;
  source: 'human' | 'ai';
  status: 'open' | 'accepted' | 'rejected' | 'resolved';
  body: string;
  suggested_text: string | null;
  anchor: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export async function createArticleComment(input: {
  articleId: string;
  body: string;
  source?: 'human' | 'ai';
  suggestedText?: string;
  anchor?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke('article-comment', {
    body: { action: 'create', ...input },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'Comment creation failed');
  return data.comment as ArticleComment;
}

export async function resolveArticleComment(input: {
  commentId: string;
  status: ArticleComment['status'];
}) {
  const { data, error } = await supabase.functions.invoke('article-comment', {
    body: { action: 'resolve', ...input },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'Comment resolution failed');
  return data.comment as ArticleComment;
}
