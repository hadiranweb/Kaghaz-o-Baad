-- 20260809180000_rate_limiting_and_edge_caching.sql
-- اسپرینت ۱ / اولویت ۱: زیرساخت Rate Limiting (Sliding Window / Token Bucket)
-- و Edge Caching (پایگاه داده چندلایه) جهت استفاده در Edge Functions

-- 1. جدول مدیریت محدودیت نرخ درخواست (Rate Limits)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. جدول کش لبه (Edge Cache) برای نتایج پردازش هوش مصنوعی و جستجو
CREATE TABLE IF NOT EXISTS public.edge_cache (
  cache_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.edge_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_edge_cache_expires_at ON public.edge_cache (expires_at);

-- 3. تابع اتمیک بررسی محدودیت نرخ درخواست (با استفاده از قفل ردیف FOR UPDATE)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_reset_time TIMESTAMPTZ;
BEGIN
  SELECT count, window_start INTO v_count, v_window_start
    FROM public.rate_limits
    WHERE key = p_key
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_now);
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_in_seconds', p_window_seconds
    );
  END IF;

  IF v_now >= (v_window_start + (p_window_seconds || ' seconds')::interval) THEN
    UPDATE public.rate_limits
      SET count = 1, window_start = v_now
      WHERE key = p_key;
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_in_seconds', p_window_seconds
    );
  END IF;

  v_reset_time := v_window_start + (p_window_seconds || ' seconds')::interval;
  IF v_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_in_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_reset_time - v_now))::integer)
    );
  END IF;

  UPDATE public.rate_limits
    SET count = v_count + 1
    WHERE key = p_key;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_requests - (v_count + 1),
    'reset_in_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_reset_time - v_now))::integer)
  );
END;
$$;

-- 4. تابع دریافت از کش لبه
CREATE OR REPLACE FUNCTION public.get_edge_cache(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val JSONB;
BEGIN
  SELECT value INTO v_val
    FROM public.edge_cache
    WHERE cache_key = p_key
      AND expires_at > now();
      
  RETURN v_val;
END;
$$;

-- 5. تابع ذخیره در کش لبه
CREATE OR REPLACE FUNCTION public.set_edge_cache(
  p_key TEXT,
  p_value JSONB,
  p_ttl_seconds INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.edge_cache (cache_key, value, created_at, expires_at)
  VALUES (
    p_key,
    p_value,
    now(),
    now() + (p_ttl_seconds || ' seconds')::interval
  )
  ON CONFLICT (cache_key) DO UPDATE SET
    value = EXCLUDED.value,
    created_at = now(),
    expires_at = now() + (p_ttl_seconds || ' seconds')::interval;
END;
$$;

-- 6. تابع پاک‌سازی دوره‌ای رکوردهای منقضی در کش، کد پیامک (otp_codes) و پنجره‌های قدیمی نرخ
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache_and_otp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now();
  DELETE FROM public.edge_cache WHERE expires_at < now();
  DELETE FROM public.rate_limits WHERE window_start + interval '24 hours' < now();
END;
$$;
