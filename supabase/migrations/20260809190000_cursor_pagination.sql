-- 20260809190000_cursor_pagination.sql
-- اسپرینت ۲ / اولویت ۲: صفحه‌بندی مبتنی بر مکان‌نما (Cursor-based / Keyset Pagination)
-- برای لیست‌های بزرگ مقالات (Read) و چندرسانه‌ای (Media) جهت مقیاس‌پذیری و جلوگیری از اسکن آفست

-- 1. ساخت شاخص‌های ترکیبی (Composite B-Tree Indexes) جهت پشتیبانی بهینه از مقایسه‌های مکان‌نما
CREATE INDEX IF NOT EXISTS idx_articles_status_published_at_id 
ON public.articles (COALESCE(published_at, created_at) DESC, id DESC) 
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_media_type_created_at_id 
ON public.media (type, created_at DESC, id DESC);

-- 2. تابع RPC صفحه‌بندی مکان‌نما برای مقالات منتشرشده
CREATE OR REPLACE FUNCTION public.paginate_published_articles(
  p_cursor_time TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 9,
  p_query TEXT DEFAULT NULL
)
RETURNS SETOF public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.articles
  WHERE status = 'published'
    AND (p_cursor_time IS NULL OR (COALESCE(published_at, created_at), id) < (p_cursor_time, p_cursor_id))
    AND (
      p_query IS NULL 
      OR trim(p_query) = '' 
      OR title_fa ILIKE '%' || trim(p_query) || '%' 
      OR title_en ILIKE '%' || trim(p_query) || '%' 
      OR summary_fa ILIKE '%' || trim(p_query) || '%' 
      OR summary_en ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY COALESCE(published_at, created_at) DESC, id DESC
  LIMIT p_limit + 1;
END;
$$;

-- 3. تابع RPC صفحه‌بندی مکان‌نما برای کتابخانه چندرسانه‌ای (Media)
CREATE OR REPLACE FUNCTION public.paginate_media(
  p_type TEXT,
  p_scope TEXT, -- 'mine' or 'public'
  p_cursor_time TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 12
)
RETURNS SETOF public.media
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF p_scope = 'public' THEN
    RETURN QUERY
    SELECT *
    FROM public.media
    WHERE type = p_type
      AND visibility = 'public'
      AND (p_cursor_time IS NULL OR (created_at, id) < (p_cursor_time, p_cursor_id))
    ORDER BY created_at DESC, id DESC
    LIMIT p_limit + 1;
  ELSE
    -- 'mine' scope
    RETURN QUERY
    SELECT *
    FROM public.media
    WHERE type = p_type
      AND (
        owner_id = v_uid
        OR created_by = (SELECT id FROM public.profiles WHERE user_id = v_uid)
      )
      AND (p_cursor_time IS NULL OR (created_at, id) < (p_cursor_time, p_cursor_id))
    ORDER BY created_at DESC, id DESC
    LIMIT p_limit + 1;
  END IF;
END;
$$;
