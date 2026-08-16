-- 20260809220000_live_resilience_and_presentation.sql
-- زیرساخت اولویت‌های سه‌گانه پخش زنده: (۱) سرعت و بهینگی Dynacast/SFU، (۲) امنیت و رمزنگاری سرتاسری E2EE، و (۳) ارائه همگام‌سازی‌شده اسلاید

-- 1. افزودن ستون‌های رمزنگاری سرتاسری (E2EE) و ارائه اسلاید به جلسات زنده
ALTER TABLE public.live_sessions 
  ADD COLUMN IF NOT EXISTS e2ee_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.live_sessions 
  ADD COLUMN IF NOT EXISTS presentation_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2. ایجاد شاخص‌های سرعت برای اتصال جلسات و مقالات مرتبط
CREATE INDEX IF NOT EXISTS idx_live_sessions_status_scheduled 
ON public.live_sessions (status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_sessions_article_id 
ON public.live_sessions (article_id) WHERE article_id IS NOT NULL;

-- 3. تابع RPC دریافت سریع اسلایدهای مقاله متصل به جلسه زنده (جهت رندر بومی 4K Markdown در اتاق)
CREATE OR REPLACE FUNCTION public.get_session_slides(p_session_id UUID)
RETURNS SETOF public.slides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_art_id UUID;
BEGIN
  SELECT article_id INTO v_art_id
    FROM public.live_sessions
    WHERE id = p_session_id;

  IF v_art_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
    FROM public.slides
    WHERE article_id = v_art_id
    ORDER BY order_num ASC;
END;
$$;
