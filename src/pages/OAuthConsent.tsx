import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const { locale } = useLanguage();
  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError(t('شناسه مجوز موجود نیست', 'Missing authorization_id'));
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/auth?next=' + encodeURIComponent(next);
        return;
      }
      const { data, error: detailsError } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: decideError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError(t('سرور مجوز آدرس بازگشتی ارسال نکرد.', 'No redirect returned by the authorization server.'));
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? t('یک برنامه', 'an app');

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md rounded-[24px] border border-border/40 bg-card/40 backdrop-blur-2xl p-8 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-light mb-3">{t('اتصال ناموفق بود', 'Could not load this request')}</h1>
            <p className="text-sm text-muted-foreground break-words">{error}</p>
          </>
        ) : !details ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground/30" />
          </div>
        ) : (
          <>
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h1 className="text-2xl font-light mb-2">
              {t(`اتصال ${clientName} به حساب شما`, `Connect ${clientName} to your account`)}
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              {t(
                `${clientName} می‌تواند با استفاده از دسترسی شما، مقالات و جلسات شما را بخواند و پیش‌نویس بسازد.`,
                `${clientName} will be able to read your articles and sessions and create drafts as you.`
              )}
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {t('تأیید', 'Approve')}
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                {t('رد', 'Deny')}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
