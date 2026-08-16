-- Expand the original articles.status constraint for the review workflow.
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_status_check;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_status_check
  CHECK (status IN (
    'draft',
    'in_review',
    'changes_requested',
    'approved',
    'scheduled',
    'published',
    'archived'
  ));
