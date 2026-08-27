import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  decideArticleAiProposal,
  listArticleAiProposals,
  requestArticleEditorialSuggestion,
  type BackendArticleAiProposal,
} from '@/lib/backend-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type ArticleAiProposalsProps = {
  articleId: string;
  canRequest: boolean;
};

function proposalStateLabel(state: BackendArticleAiProposal['state'], locale: string) {
  const labels = {
    pending_review: locale === 'fa' ? 'نیازمند بررسی' : 'Needs review',
    accepted: locale === 'fa' ? 'پذیرفته‌شده' : 'Accepted',
    rejected: locale === 'fa' ? 'ردشده' : 'Rejected',
    edited: locale === 'fa' ? 'ویرایش‌شده' : 'Edited',
    stale: locale === 'fa' ? 'مربوط به نسخهٔ قدیمی' : 'Older version',
  } as const;
  return labels[state];
}

function proposalBadgeVariant(state: BackendArticleAiProposal['state']) {
  if (state === 'accepted') return 'default' as const;
  if (state === 'rejected') return 'destructive' as const;
  return 'secondary' as const;
}

export function ArticleAiProposals({ articleId, canRequest }: ArticleAiProposalsProps) {
  const { locale } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['article-ai-proposals', articleId];
  const proposalsQuery = useQuery({
    queryKey,
    queryFn: () => listArticleAiProposals(articleId),
    staleTime: 10_000,
  });

  const queueSuggestion = useMutation({
    mutationFn: () => requestArticleEditorialSuggestion(articleId),
    onSuccess: (result) => {
      toast({
        title: locale === 'fa' ? 'درخواست ثبت شد' : 'Request queued',
        description: result.idempotent
          ? (locale === 'fa' ? 'برای این نسخه، درخواست پیشین در حال پیگیری است.' : 'An existing request for this version is being tracked.')
          : (locale === 'fa' ? 'پیشنهاد هوشمند پس از بررسی در همین بخش نمایش داده می‌شود.' : 'The suggestion will appear here after review.'),
      });
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: locale === 'fa' ? 'ثبت درخواست ناموفق بود' : 'Could not queue request',
        description: error instanceof Error ? error.message : 'casio_request_failed',
      });
    },
  });

  const decideProposal = useMutation({
    mutationFn: ({ proposalId, decision }: { proposalId: string; decision: 'accepted' | 'rejected' | 'edited' }) =>
      decideArticleAiProposal(proposalId, { decision }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ title: locale === 'fa' ? 'تصمیم ثبت شد' : 'Decision saved' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: locale === 'fa' ? 'ثبت تصمیم ناموفق بود' : 'Could not save decision',
        description: error instanceof Error ? error.message : 'proposal_decision_failed',
      });
    },
  });

  const proposals = proposalsQuery.data?.proposals ?? [];

  return (
    <Card className="border-primary/20 bg-primary/[0.025]" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              {locale === 'fa' ? 'پیشنهادهای ویراست هوشمند' : 'Editorial suggestions'}
            </CardTitle>
            <CardDescription className="mt-1">
              {locale === 'fa'
                ? 'نتیجه‌ها پیشنهادی‌اند؛ متن و وضعیت مقاله فقط با تصمیم ویراستار تغییر می‌کند.'
                : 'Results are proposals only; an editor remains responsible for article text and status.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void proposalsQuery.refetch()} disabled={proposalsQuery.isFetching}>
              {proposalsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ms-1.5">{locale === 'fa' ? 'به‌روزرسانی' : 'Refresh'}</span>
            </Button>
            {canRequest && (
              <Button size="sm" onClick={() => queueSuggestion.mutate()} disabled={queueSuggestion.isPending}>
                {queueSuggestion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="ms-1.5">{locale === 'fa' ? 'درخواست پیشنهاد' : 'Request suggestion'}</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposalsQuery.isLoading && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {locale === 'fa' ? 'در حال دریافت پیشنهادها…' : 'Loading suggestions…'}
          </div>
        )}
        {!proposalsQuery.isLoading && proposals.length === 0 && (
          <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
            {locale === 'fa' ? 'هنوز پیشنهادی برای این مقاله ثبت نشده است.' : 'No suggestion has been recorded for this article yet.'}
          </p>
        )}
        {proposals.map((proposal) => (
          <article key={proposal.id} className="space-y-3 rounded-xl border border-border/60 bg-background/65 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={proposalBadgeVariant(proposal.state)}>{proposalStateLabel(proposal.state, locale)}</Badge>
                <span className="text-xs text-muted-foreground">{proposal.proposal_type}</span>
                {proposal.confidence !== null && proposal.confidence !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {locale === 'fa' ? 'اطمینان:' : 'Confidence:'} {Math.round(Number(proposal.confidence) * 100)}%
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {locale === 'fa' ? `نسخهٔ محتوا: ${proposal.snapshot_content_revision}` : `Content revision: ${proposal.snapshot_content_revision}`}
              </span>
            </div>
            <p className="text-sm leading-7">{proposal.reason}</p>
            {proposal.original_text && (
              <div className="rounded-lg bg-muted/55 p-3 text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{locale === 'fa' ? 'متن مبنا' : 'Original text'}</span>
                <p className="whitespace-pre-wrap">{proposal.original_text}</p>
              </div>
            )}
            {proposal.suggested_text && (
              <div className="rounded-lg border border-primary/15 bg-primary/[0.045] p-3 text-sm">
                <span className="mb-1 block text-xs font-medium text-primary">{locale === 'fa' ? 'پیشنهاد' : 'Suggestion'}</span>
                <p className="whitespace-pre-wrap">{proposal.suggested_text}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{proposal.flow_key} · {proposal.flow_version}</span>
              {proposal.state === 'pending_review' && canRequest && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={decideProposal.isPending} onClick={() => decideProposal.mutate({ proposalId: proposal.id, decision: 'edited' })}>
                    {locale === 'fa' ? 'ویرایش دستی' : 'Edit manually'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={decideProposal.isPending} onClick={() => decideProposal.mutate({ proposalId: proposal.id, decision: 'rejected' })}>
                    {locale === 'fa' ? 'رد' : 'Reject'}
                  </Button>
                  <Button size="sm" disabled={decideProposal.isPending} onClick={() => decideProposal.mutate({ proposalId: proposal.id, decision: 'accepted' })}>
                    {locale === 'fa' ? 'پذیرش' : 'Accept'}
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
