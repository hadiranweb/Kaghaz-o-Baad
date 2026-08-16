-- Atomic article workflow transition.
-- The caller must use the user's JWT; auth.uid() is the authority.

CREATE OR REPLACE FUNCTION public.transition_article_workflow(
  p_article_id UUID,
  p_action TEXT,
  p_note TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  article_id UUID,
  from_status TEXT,
  to_status TEXT,
  actor_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_article RECORD;
  v_to_status TEXT;
  v_is_owner BOOLEAN;
  v_is_editor BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT a.id, a.status::TEXT AS status, a.author_id
    INTO v_article
  FROM public.articles a
  WHERE a.id = p_article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_found';
  END IF;

  v_is_owner := v_article.author_id = v_actor;
  v_is_editor := public.has_role(v_actor, 'editor'::app_role);
  v_is_admin := public.has_role(v_actor, 'admin'::app_role);

  IF p_action = 'submit_for_review'
     AND (v_is_owner OR v_is_editor OR v_is_admin)
     AND v_article.status IN ('draft', 'changes_requested') THEN
    v_to_status := 'in_review';
  ELSIF p_action = 'request_changes'
        AND (v_is_editor OR v_is_admin)
        AND v_article.status = 'in_review' THEN
    v_to_status := 'changes_requested';
  ELSIF p_action = 'approve'
        AND (v_is_editor OR v_is_admin)
        AND v_article.status = 'in_review' THEN
    v_to_status := 'approved';
  ELSIF p_action = 'schedule'
        AND (v_is_editor OR v_is_admin)
        AND v_article.status = 'approved' THEN
    v_to_status := 'scheduled';
  ELSIF p_action = 'publish'
        AND (v_is_editor OR v_is_admin)
        AND v_article.status IN ('approved', 'scheduled') THEN
    v_to_status := 'published';
  ELSIF p_action = 'archive'
        AND (v_is_editor OR v_is_admin)
        AND v_article.status = 'published' THEN
    v_to_status := 'archived';
  ELSIF p_action = 'restore_draft'
        AND (v_is_owner OR v_is_editor OR v_is_admin)
        AND v_article.status IN ('archived', 'changes_requested') THEN
    v_to_status := 'draft';
  ELSE
    RAISE EXCEPTION 'workflow_transition_forbidden';
  END IF;

  UPDATE public.articles
  SET
    status = v_to_status,
    published_at = CASE
      WHEN v_to_status = 'published' THEN COALESCE(published_at, now())
      WHEN v_article.status = 'published' AND v_to_status <> 'published' THEN NULL
      ELSE published_at
    END,
    updated_at = now()
  WHERE id = p_article_id;

  INSERT INTO public.article_workflow_events (
    article_id,
    actor_id,
    from_status,
    to_status,
    note,
    metadata
  ) VALUES (
    p_article_id,
    v_actor,
    v_article.status,
    v_to_status,
    NULLIF(left(COALESCE(p_note, ''), 4000), ''),
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY SELECT p_article_id, v_article.status, v_to_status, v_actor;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_article_workflow(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_article_workflow(UUID, TEXT, TEXT, JSONB) TO authenticated;
