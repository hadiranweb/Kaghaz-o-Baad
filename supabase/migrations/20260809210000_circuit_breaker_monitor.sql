-- 20260809210000_circuit_breaker_monitor.sql
-- تابع RPC مشاهده و بازنشانی وضعیت مدارشکن‌ها برای داشبورد مدیریت

CREATE OR REPLACE FUNCTION public.list_circuit_breakers()
RETURNS SETOF public.circuit_breakers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- فقط ادمین یا ویرایشگر می‌توانند وضعیت مدارشکن‌ها را ببینند
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin', 'editor']::app_role[]) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- اطمینان از وجود سرویس‌های کلیدی در جدول
  INSERT INTO public.circuit_breakers (service_name, state, failure_count, cooldown_seconds)
  VALUES 
    ('gemini-ai', 'CLOSED', 0, 45),
    ('smsir-api', 'CLOSED', 0, 60)
  ON CONFLICT (service_name) DO NOTHING;

  RETURN QUERY
  SELECT * FROM public.circuit_breakers
  ORDER BY service_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_circuit_breaker(p_service TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Access denied. Only admin can reset circuit breakers.');
  END IF;

  INSERT INTO public.circuit_breakers (service_name, state, failure_count, last_failure_at, opened_at, updated_at)
  VALUES (p_service, 'CLOSED', 0, NULL, NULL, now())
  ON CONFLICT (service_name) DO UPDATE SET
    state = 'CLOSED',
    failure_count = 0,
    last_failure_at = NULL,
    opened_at = NULL,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'state', 'CLOSED');
END;
$$;

-- امکان تست دستی / شبیه‌سازی تریپ مدارشکن برای بررسی Graceful Degradation
CREATE OR REPLACE FUNCTION public.trip_circuit_breaker_test(p_service TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Access denied.');
  END IF;

  UPDATE public.circuit_breakers
  SET 
    state = 'OPEN',
    failure_count = 3,
    last_failure_at = now(),
    opened_at = now(),
    updated_at = now()
  WHERE service_name = p_service;

  RETURN jsonb_build_object('ok', true, 'state', 'OPEN');
END;
$$;
