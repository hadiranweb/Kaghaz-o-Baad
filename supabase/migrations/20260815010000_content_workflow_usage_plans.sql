-- Kaghaz-o-Baad: content workflow, usage metering, plans and entitlements
-- Initial foundation only. Payment gateway integration is intentionally deferred.

CREATE TABLE IF NOT EXISTS public.article_workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_workflow_events_article_created
  ON public.article_workflow_events(article_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'human' CHECK (source IN ('human', 'ai')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected', 'resolved')),
  body TEXT NOT NULL,
  suggested_text TEXT,
  anchor JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article_status
  ON public.article_comments(article_id, status);

CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  request_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_created
  ON public.activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_name_created
  ON public.activity_events(event_name, created_at DESC);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cached_tokens BIGINT NOT NULL DEFAULT 0 CHECK (cached_tokens >= 0),
  units NUMERIC(20,6) NOT NULL DEFAULT 1 CHECK (units >= 0),
  estimated_cost_usd NUMERIC(20,8) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  cost_rial BIGINT NOT NULL DEFAULT 0 CHECK (cost_rial >= 0),
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('started', 'succeeded', 'failed', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_feature_created
  ON public.usage_events(user_id, feature_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_fa TEXT,
  description_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  name_en TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'integer', 'decimal', 'text')),
  unit TEXT,
  period TEXT NOT NULL DEFAULT 'period' CHECK (period IN ('request', 'day', 'month', 'period', 'lifetime')),
  description_fa TEXT,
  description_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_parameter_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES public.plan_parameters(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  exhaustion_behavior TEXT NOT NULL DEFAULT 'block' CHECK (exhaustion_behavior IN ('block', 'warn', 'approval', 'overage')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, parameter_id)
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  provider TEXT,
  provider_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status
  ON public.user_subscriptions(user_id, status, ends_at DESC);

CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parameter_key TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ,
  limit_value NUMERIC(20,6),
  used_value NUMERIC(20,6) NOT NULL DEFAULT 0,
  source_subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, parameter_key, period_start)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_parameter_period
  ON public.entitlements(user_id, parameter_key, period_start DESC);

ALTER TABLE public.article_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_parameter_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read workflow events for visible articles" ON public.article_workflow_events;
CREATE POLICY "Users can read workflow events for visible articles"
  ON public.article_workflow_events FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
    OR EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_workflow_events.article_id
        AND a.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors and editors can read article comments" ON public.article_comments;
CREATE POLICY "Authors and editors can read article comments"
  ON public.article_comments FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
    OR EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_comments.article_id
        AND a.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can read own activity" ON public.activity_events;
CREATE POLICY "Users can read own activity"
  ON public.activity_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can read own usage" ON public.usage_events;
CREATE POLICY "Users can read own usage"
  ON public.usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can read active plans" ON public.plans;
CREATE POLICY "Authenticated users can read active plans"
  ON public.plans FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can read active parameters" ON public.plan_parameters;
CREATE POLICY "Authenticated users can read active parameters"
  ON public.plan_parameters FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can read plan parameter values" ON public.plan_parameter_values;
CREATE POLICY "Authenticated users can read plan parameter values"
  ON public.plan_parameter_values FOR SELECT TO authenticated
  USING (enabled OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can read own subscriptions"
  ON public.user_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can read own entitlements" ON public.entitlements;
CREATE POLICY "Users can read own entitlements"
  ON public.entitlements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.plans (plan_key, name_fa, name_en, description_fa, description_en, sort_order)
VALUES
  ('free', 'رایگان', 'Free', 'امکانات پایه برای شروع', 'Basic features to get started', 10),
  ('student', 'دانشجویی', 'Student', 'امکانات توسعه‌یافته برای دانشجویان', 'Extended features for students', 20),
  ('professor', 'استادی', 'Professor', 'امکانات کامل برای استادان و تولیدکنندگان حرفه‌ای', 'Full features for professors and professional creators', 30)
ON CONFLICT (plan_key) DO NOTHING;

INSERT INTO public.plan_parameters (parameter_key, name_fa, name_en, value_type, unit, period, description_fa, description_en)
VALUES
  ('article.publish', 'انتشار مقاله', 'Article publishing', 'integer', 'article', 'month', 'تعداد مقاله قابل انتشار در ماه', 'Articles publishable per month'),
  ('ai.title_suggestions', 'پیشنهاد عنوان با AI', 'AI title suggestions', 'integer', 'request', 'month', 'تعداد درخواست پیشنهاد عنوان', 'Title suggestion requests'),
  ('ai.review_detection', 'تشخیص محل ویرایش', 'AI review detection', 'integer', 'request', 'month', 'تعداد اجرای تشخیص کم‌هزینه', 'Low-cost review detection runs'),
  ('ai.rewrite', 'پیشنهاد ویرایش با AI', 'AI rewrite', 'integer', 'request', 'month', 'تعداد درخواست ویرایش با مدل قوی‌تر', 'Higher-quality rewrite requests'),
  ('ai.post_publish_content', 'تولید محتوای پس از انتشار', 'Post-publish AI content', 'integer', 'request', 'month', 'تعداد تولید خلاصه، فلش‌کارت و محتوای شبکه‌ها', 'Post-publish summary, flashcard and social content requests'),
  ('media.storage_bytes', 'فضای رسانه', 'Media storage', 'integer', 'byte', 'lifetime', 'حداکثر فضای رسانه', 'Maximum media storage'),
  ('connector.destinations', 'مقصدهای انتشار', 'Connected destinations', 'integer', 'destination', 'lifetime', 'تعداد مقصدهای قابل اتصال', 'Number of connectable destinations')
ON CONFLICT (parameter_key) DO NOTHING;

INSERT INTO public.plan_parameter_values (plan_id, parameter_id, value_json)
SELECT p.id, pp.id,
  CASE
    WHEN p.plan_key = 'free' AND pp.parameter_key = 'article.publish' THEN '{"value": 1}'::jsonb
    WHEN p.plan_key = 'student' AND pp.parameter_key = 'article.publish' THEN '{"value": 5}'::jsonb
    WHEN p.plan_key = 'professor' AND pp.parameter_key = 'article.publish' THEN '{"value": 30}'::jsonb
    WHEN p.plan_key = 'free' AND pp.parameter_key = 'media.storage_bytes' THEN '{"value": 1073741824}'::jsonb
    WHEN p.plan_key = 'student' AND pp.parameter_key = 'media.storage_bytes' THEN '{"value": 16106127360}'::jsonb
    WHEN p.plan_key = 'professor' AND pp.parameter_key = 'media.storage_bytes' THEN '{"value": 53687091200}'::jsonb
    ELSE '{"value": 0}'::jsonb
  END
FROM public.plans p CROSS JOIN public.plan_parameters pp
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_parameter_values pv
  WHERE pv.plan_id = p.id AND pv.parameter_id = pp.id
);
