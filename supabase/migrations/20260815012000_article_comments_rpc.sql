-- Secure comment operations for article review.

CREATE OR REPLACE FUNCTION public.create_article_comment(
  p_article_id UUID,
  p_body TEXT,
  p_source TEXT DEFAULT 'human',
  p_suggested_text TEXT DEFAULT NULL,
  p_anchor JSONB DEFAULT '{}'::jsonb
)
RETURNS public.article_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_article RECORD;
  v_comment public.article_comments;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 OR length(p_body) > 10000 THEN
    RAISE EXCEPTION 'invalid_comment';
  END IF;
  IF p_source NOT IN ('human', 'ai') THEN RAISE EXCEPTION 'invalid_comment_source'; END IF;

  SELECT a.id, a.author_id INTO v_article
  FROM public.articles a WHERE a.id = p_article_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'article_not_found'; END IF;

  IF NOT (
    v_article.author_id = v_actor
    OR public.has_role(v_actor, 'editor'::app_role)
    OR public.has_role(v_actor, 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'comment_forbidden';
  END IF;

  INSERT INTO public.article_comments (
    article_id, author_id, source, body, suggested_text, anchor
  ) VALUES (
    p_article_id, v_actor, p_source, left(trim(p_body), 10000),
    NULLIF(left(COALESCE(p_suggested_text, ''), 10000), ''),
    COALESCE(p_anchor, '{}'::jsonb)
  )
  RETURNING * INTO v_comment;

  RETURN v_comment;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_article_comment(
  p_comment_id UUID,
  p_status TEXT
)
RETURNS public.article_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_comment public.article_comments;
  v_is_allowed BOOLEAN;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_status NOT IN ('accepted', 'rejected', 'resolved', 'open') THEN
    RAISE EXCEPTION 'invalid_comment_status';
  END IF;

  SELECT c.* INTO v_comment
  FROM public.article_comments c
  JOIN public.articles a ON a.id = c.article_id
  WHERE c.id = p_comment_id
    AND (
      a.author_id = v_actor
      OR public.has_role(v_actor, 'editor'::app_role)
      OR public.has_role(v_actor, 'admin'::app_role)
    )
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'comment_forbidden_or_not_found'; END IF;

  UPDATE public.article_comments
  SET
    status = p_status,
    resolved_at = CASE WHEN p_status = 'open' THEN NULL ELSE now() END,
    resolved_by = CASE WHEN p_status = 'open' THEN NULL ELSE v_actor END
  WHERE id = p_comment_id
  RETURNING * INTO v_comment;

  RETURN v_comment;
END;
$$;

REVOKE ALL ON FUNCTION public.create_article_comment(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_article_comment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_article_comment(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_article_comment(UUID, TEXT) TO authenticated;
