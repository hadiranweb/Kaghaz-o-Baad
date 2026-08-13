import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLiveKitToken } from '@/hooks/useLiveKitToken';
import { rpc } from '@/integrations/supabase/rpc';
import { Button } from '@/components/ui/button';
import { Radio, Settings2, ArrowRight, Loader2 } from 'lucide-react';

// بارگذاری تنبل: pdf.js + LiveKit فقط هنگام ورود به اتاق زنده دانلود می‌شوند
const LiveRoom = lazy(() => import('@/components/LiveRoom'));

export interface SlideItem {
  id: string;
  order_num: number;
  title_fa?: string;
  title_en?: string;
  body_fa?: string;
  body_en?: string;
  media_urls?: string[];
  notes?: string;
}

interface SessionRow {
  id: string;
  title_en: string | null;
  title_fa: string | null;
  article_id: string | null;
  status: string;
  host_user_id: string;
}

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const fa = locale === 'fa';

  const [session, setSession] = useState<SessionRow | null>(null);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const isHost = !!user && !!session && (session.host_user_id === user.id);

  const loadSession = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('live_sessions')
      .select('id, title_en, title_fa, article_id, status, host_user_id')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      setSessionError(error?.message || 'Session not found');
      setSessionLoaded(true);
      return;
    }
    setSession(data);
    setSessionLoaded(true);

    // بارگذاری اسلایدهای مقالهٔ متصل: اول از RPC امن (عبور از RLS)، بعد پرس‌وجوی مستقیم
    if (data.article_id) {
      const { data: rpcRows, error: rpcErr } = await rpc<SlideItem[]>('get_session_slides', { p_session_id: id });
      if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
        setSlides(rpcRows);
        return;
      }
      const { data: slideRows } = await supabase
        .from('slides')
        .select('*')
        .eq('article_id', data.article_id)
        .order('order_num', { ascending: true });
      setSlides(slideRows || []);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    document.title = fa ? 'پخش زنده | کاغذ و باد' : 'Live | KaghazBaad';
    loadSession();
    // نظارت بر وضعیت جلسه (برای اتاق انتظار بینندگان و پایان جلسه)
    const timer = setInterval(loadSession, 8000);
    return () => clearInterval(timer);
  }, [id, loadSession, fa]);

  useEffect(() => {
    if (!session) return;
    const t = fa ? session.title_fa : session.title_en;
    if (t) {
      document.title = `${t} | ${fa ? 'پخش زنده' : 'Live'}`;
    }
  }, [session, fa]);

  // درخواست توکن فقط برای جلساتی که پایان نیافته‌اند
  const status = session?.status;
  const tokenSessionId = user && id && status !== 'ended' && status !== 'cancelled' ? id : null;
  const { data: tokenData, loading: tokenLoading, error: tokenError } = useLiveKitToken(tokenSessionId);

  const startSession = useCallback(async () => {
    if (!id) return;
    const { error } = await supabase
      .from('live_sessions')
      .update({ status: 'live', started_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('start session error', error);
      return;
    }
    await loadSession();
  }, [id, loadSession]);

  const endSession = useCallback(async () => {
    if (!id) return;
    await supabase
      .from('live_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', id);
    await loadSession();
  }, [id, loadSession]);

  if (authLoading || !sessionLoaded) return null;
  if (!user) return <Navigate to="/auth" replace />;

  // جلسه یافت نشد / خطا
  if (sessionError && !session) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center space-y-4">
        <div className="text-4xl">🛰️</div>
        <h1 className="text-xl font-thin">{fa ? 'اتاق زنده پیدا نشد' : 'Live room not found'}</h1>
        <p className="text-sm text-muted-foreground">{sessionError}</p>
        <Button variant="outline" onClick={() => navigate('/live')}>
          {fa ? 'بازگشت به جلسات' : 'Back to sessions'}
        </Button>
      </div>
    );
  }

  // جلسه پایان‌یافته
  if (session && (session.status === 'ended' || session.status === 'cancelled')) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
          <Radio className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-thin">
          {fa ? 'این پخش زنده پایان یافته است' : 'This live session has ended'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {fa
            ? 'پرسش‌ها و بازخوردهای خود را در دیدگاه‌های مقاله بنویسید.'
            : 'Please leave questions and feedback in the article comments.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/live')}>
          {fa ? 'بازگشت به جلسات' : 'Back to sessions'}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" dir={fa ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-thin mb-1 font-[IRANSharp]">
            {fa ? session?.title_fa : session?.title_en}
          </h1>
          <p className="text-xs text-muted-foreground">
            {fa
              ? 'معماری: LiveKit SFU + Dynacast — اسلایدها/ارائه به‌صورت بومی و همگام رندر می‌شوند'
              : 'Architecture: LiveKit SFU + Dynacast — slides render natively & stay in sync'}
          </p>
        </div>
        {isHost && session?.status === 'live' && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1.5"
            onClick={() => {
              if (window.confirm(fa ? 'جلسه برای همه پایان می‌یابد. مطمئن هستید؟' : 'End the session for everyone?')) {
                endSession();
              }
            }}
          >
            {fa ? 'پایان جلسه' : 'End session'}
          </Button>
        )}
      </div>

      {tokenLoading && (
        <div className="text-foreground/50 text-sm">{fa ? 'در حال اتصال به اتاق زنده…' : 'Connecting to live room…'}</div>
      )}

      {tokenError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 space-y-3">
          <div>{tokenError.message}</div>
          {tokenError.code === 'LIVEKIT_NOT_CONFIGURED' && (
            <div className="text-xs text-muted-foreground bg-background/60 rounded-lg p-3 border border-border/40 leading-6" dir="ltr">
              <div className="font-medium text-foreground mb-1">
                {fa ? 'راه‌اندازی سرور زنده:' : 'LiveKit setup:'}
              </div>
              <ol className="list-decimal pr-4 space-y-1 font-mono">
                <li>supabase secrets set LIVEKIT_URL=wss://… LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=…</li>
                <li>supabase functions deploy livekit-token</li>
                <li>supabase db push</li>
              </ol>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate('/live')}>
            {fa ? 'بازگشت به جلسات' : 'Back to sessions'}
          </Button>
        </div>
      )}

      {tokenData && session && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {fa ? 'در حال بارگذاری موتور پخش زنده…' : 'Loading live engine…'}
            </div>
          }
        >
          <LiveRoom
            tokenData={tokenData}
            sessionId={id || ''}
            slides={slides}
            presentation={{
              url: tokenData.presentation_url,
              name: tokenData.presentation_name,
              kind: tokenData.presentation_kind ?? null,
            }}
            sessionStatus={session.status}
            isHost={isHost}
            canStart={isHost}
            onStartSession={startSession}
            onEndSession={endSession}
            onLeave={() => navigate('/live')}
          />
        </Suspense>
      )}

      {!tokenData && !tokenError && !tokenLoading && (
        <div className="text-foreground/50 text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4 animate-spin" />
          {fa ? 'آماده‌سازی…' : 'Preparing…'}
          <ArrowRight className="h-4 w-4 opacity-0" />
        </div>
      )}
    </div>
  );
}
