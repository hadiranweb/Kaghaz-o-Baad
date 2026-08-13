import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LiveRole = 'host' | 'speaker' | 'viewer';
export type PresentationKind = 'pdf' | 'image' | 'pptx' | 'other' | null;

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  room: string;
  role: LiveRole;
  identity: string;
  name: string;
  session_status?: string;
  e2ee_enabled?: boolean;
  article_id?: string | null;
  presentation_enabled?: boolean;
  presentation_media_id?: string | null;
  presentation_url?: string | null;
  presentation_name?: string | null;
  presentation_kind?: PresentationKind;
}

export interface LiveTokenError {
  message: string;
  code?: string;
}

/** تلاش برای استخراج بدنهٔ خطای JSON از پاسخ توابع لبه (FunctionsHttpError) */
async function extractError(err: unknown): Promise<LiveTokenError> {
  const e = err as { message?: string; context?: Response };
  if (e?.context && typeof e.context.clone === 'function') {
    try {
      const body = (await e.context.clone().json()) as { error?: string; message?: string };
      if (body) {
        return { message: body.message || body.error || e.message || 'خطا در اتصال به سرور زنده', code: body.error };
      }
    } catch {
      // not JSON — fall through
    }
  }
  return { message: e?.message || 'خطا در اتصال به سرور زنده' };
}

export function useLiveKitToken(sessionId: string | null) {
  const [data, setData] = useState<LiveKitTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LiveTokenError | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase.functions
      .invoke<LiveKitTokenResponse>('livekit-token', { body: { sessionId } })
      .then(({ data: res }) => {
        if (!cancelled) setData(res ?? null);
      })
      .catch(async (err: unknown) => {
        const parsed = await extractError(err);
        if (!cancelled) setError(parsed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId]);

  return { data, loading, error };
}
