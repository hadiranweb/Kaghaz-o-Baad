-- 20260809200000_circuit_breaker.sql
-- اسپرینت ۳ / اولویت ۳: مکانیزم Circuit Breaker و Graceful Degradation
-- جهت محافظت از سیستم در برابر خرابی وابستگی‌های خارجی (هوش مصنوعی Gemini و سرویس پیامک SMS.ir)

-- 1. جدول وضعیت مدارشکن‌ها (Circuit Breakers)
CREATE TABLE IF NOT EXISTS public.circuit_breakers (
  service_name TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  cooldown_seconds INTEGER NOT NULL DEFAULT 45,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.circuit_breakers ENABLE ROW LEVEL SECURITY;

-- 2. تابع اتمیک دریافت وضعیت مدارشکن (با تغییر وضعیت خودکار به HALF_OPEN پس از پایان وقفه)
CREATE OR REPLACE FUNCTION public.get_circuit_breaker_state(
  p_service TEXT,
  p_threshold INTEGER DEFAULT 3,
  p_cooldown_seconds INTEGER DEFAULT 45
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.circuit_breakers%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_remaining INTEGER;
BEGIN
  SELECT * INTO v_row
    FROM public.circuit_breakers
    WHERE service_name = p_service
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.circuit_breakers (service_name, state, failure_count, cooldown_seconds, updated_at)
    VALUES (p_service, 'CLOSED', 0, p_cooldown_seconds, v_now);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'state', 'CLOSED',
      'failure_count', 0
    );
  END IF;

  -- اگر در وضعیت OPEN است
  IF v_row.state = 'OPEN' THEN
    IF v_now >= (v_row.opened_at + (v_row.cooldown_seconds || ' seconds')::interval) THEN
      -- ورود به حالت آزمایشی (HALF_OPEN)
      UPDATE public.circuit_breakers
        SET state = 'HALF_OPEN', updated_at = v_now
        WHERE service_name = p_service;
        
      RETURN jsonb_build_object(
        'allowed', true,
        'state', 'HALF_OPEN',
        'failure_count', v_row.failure_count
      );
    ELSE
      -- هنوز در وقفه است
      v_remaining := GREATEST(1, EXTRACT(EPOCH FROM ((v_row.opened_at + (v_row.cooldown_seconds || ' seconds')::interval) - v_now))::integer);
      RETURN jsonb_build_object(
        'allowed', false,
        'state', 'OPEN',
        'retry_after_seconds', v_remaining,
        'failure_count', v_row.failure_count
      );
    END IF;
  END IF;

  -- در وضعیت CLOSED یا HALF_OPEN
  RETURN jsonb_build_object(
    'allowed', true,
    'state', v_row.state,
    'failure_count', v_row.failure_count
  );
END;
$$;

-- 3. ثبت موفقیت در مدارشکن (بازگشت به CLOSED)
CREATE OR REPLACE FUNCTION public.record_circuit_breaker_success(p_service TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.circuit_breakers (service_name, state, failure_count, updated_at)
  VALUES (p_service, 'CLOSED', 0, now())
  ON CONFLICT (service_name) DO UPDATE SET
    state = 'CLOSED',
    failure_count = 0,
    opened_at = NULL,
    updated_at = now();
END;
$$;

-- 4. ثبت خطا در مدارشکن (افزایش خطا و تریپ به OPEN در صورت عبور از آستانه)
CREATE OR REPLACE FUNCTION public.record_circuit_breaker_failure(
  p_service TEXT,
  p_threshold INTEGER DEFAULT 3,
  p_cooldown_seconds INTEGER DEFAULT 45
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.circuit_breakers%ROWTYPE;
  v_count INTEGER;
  v_state TEXT;
BEGIN
  SELECT * INTO v_row
    FROM public.circuit_breakers
    WHERE service_name = p_service
    FOR UPDATE;

  IF NOT FOUND THEN
    v_count := 1;
    v_state := CASE WHEN v_count >= p_threshold THEN 'OPEN' ELSE 'CLOSED' END;
    INSERT INTO public.circuit_breakers (service_name, state, failure_count, last_failure_at, opened_at, cooldown_seconds, updated_at)
    VALUES (
      p_service,
      v_state,
      v_count,
      now(),
      CASE WHEN v_state = 'OPEN' THEN now() ELSE NULL END,
      p_cooldown_seconds,
      now()
    );
    RETURN jsonb_build_object('state', v_state, 'tripped', v_state = 'OPEN', 'failure_count', v_count);
  END IF;

  v_count := v_row.failure_count + 1;
  IF v_count >= p_threshold OR v_row.state = 'HALF_OPEN' THEN
    v_state := 'OPEN';
    UPDATE public.circuit_breakers
      SET 
        state = 'OPEN',
        failure_count = v_count,
        last_failure_at = now(),
        opened_at = now(),
        cooldown_seconds = p_cooldown_seconds,
        updated_at = now()
      WHERE service_name = p_service;
  ELSE
    v_state := v_row.state;
    UPDATE public.circuit_breakers
      SET 
        failure_count = v_count,
        last_failure_at = now(),
        updated_at = now()
      WHERE service_name = p_service;
  END IF;

  RETURN jsonb_build_object('state', v_state, 'tripped', v_state = 'OPEN', 'failure_count', v_count);
END;
$$;
