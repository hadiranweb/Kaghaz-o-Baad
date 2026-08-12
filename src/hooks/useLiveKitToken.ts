import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  room: string;
  role: 'host' | 'speaker' | 'viewer';
  identity: string;
  name: string;
  e2ee_enabled?: boolean;
  article_id?: string | null;
  presentation_enabled?: boolean;
}

export function useLiveKitToken(sessionId: string | null) {
  const [data, setData] = useState<LiveKitTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase.functions
      .invoke<LiveKitTokenResponse>('livekit-token', { body: { sessionId } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setData(data ?? null);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [sessionId]);

  return { data, loading, error };
}
