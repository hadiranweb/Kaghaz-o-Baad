-- Live sessions table for Q&A streaming
CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  description_en TEXT,
  description_fa TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  max_participants INTEGER NOT NULL DEFAULT 100,
  recording_enabled BOOLEAN NOT NULL DEFAULT false,
  recording_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Live sessions viewable by all"
  ON public.live_sessions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can create sessions"
  ON public.live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts and admins can update"
  ON public.live_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Hosts and admins can delete"
  ON public.live_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = host_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX idx_live_sessions_host ON public.live_sessions(host_user_id);
CREATE INDEX idx_live_sessions_article ON public.live_sessions(article_id);

-- Participants log
CREATE TABLE public.live_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('host','speaker','viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.live_participants TO authenticated;
GRANT ALL ON public.live_participants TO service_role;

ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own participation"
  ON public.live_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.host_user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can record own join"
  ON public.live_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session"
  ON public.live_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_live_participants_session ON public.live_participants(session_id);
CREATE INDEX idx_live_participants_user ON public.live_participants(user_id);