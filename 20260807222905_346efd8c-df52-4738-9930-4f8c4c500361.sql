ALTER VIEW public.public_profiles SET (security_invoker = on);

REVOKE SELECT ON public.live_sessions FROM anon;
GRANT SELECT (id, host_user_id, article_id, title_en, title_fa, description_en, description_fa, status, scheduled_at, started_at, ended_at, max_participants, recording_enabled, recording_url, created_at, updated_at) ON public.live_sessions TO anon;