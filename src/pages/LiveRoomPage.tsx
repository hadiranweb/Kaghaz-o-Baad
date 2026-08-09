import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLiveKitToken } from '@/hooks/useLiveKitToken';
import { LiveRoom } from '@/components/LiveRoom';

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const { data: tokenData, loading, error } = useLiveKitToken(user && id ? id : null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('live_sessions')
      .select('title_en, title_fa')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const t = locale === 'fa' ? data.title_fa : data.title_en;
        setSessionTitle(t);
        document.title = `${t} | ${locale === 'fa' ? 'پخش زنده' : 'Live'}`;
      });
  }, [id, locale]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-thin mb-6">{sessionTitle}</h1>
      {loading && (
        <div className="text-foreground/50 text-sm">
          {locale === 'fa' ? 'در حال اتصال به جلسه…' : 'Connecting to session…'}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">{error}</div>
      )}
      {tokenData && <LiveRoom tokenData={tokenData} onLeave={() => navigate('/live')} />}
    </div>
  );
}