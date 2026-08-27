import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStudioReadiness } from '@/lib/backend-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function providerLabel(provider: 'disabled' | 'direct_compat' | 'external_studio', fa: boolean) {
  if (provider === 'disabled') return fa ? 'غیرفعال و ایمن' : 'Safely disabled';
  if (provider === 'direct_compat') return fa ? 'سازگاری مستقیم موقت' : 'Temporary direct compatibility';
  return fa ? 'Studio خارجی' : 'External Studio';
}

export function StudioReadinessCard() {
  const { locale } = useLanguage();
  const fa = locale === 'fa';
  const readiness = useQuery({
    queryKey: ['studio-readiness'],
    queryFn: getStudioReadiness,
    refetchInterval: 30_000,
  });

  return (
    <Card className="glass-surface" dir={fa ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {fa ? 'آمادگی Studio' : 'Studio readiness'}
            </CardTitle>
            <CardDescription className="mt-1">
              {fa ? 'این نما فقط policy و قابلیت‌های مجاز را نشان می‌دهد؛ کلید، نشانی اتصال و متن مقاله نمایش داده نمی‌شود.' : 'This view shows only policy and allowed capabilities; keys, endpoints, and article content are never shown.'}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => void readiness.refetch()} disabled={readiness.isFetching}>
            {readiness.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ms-1.5">{fa ? 'به‌روزرسانی' : 'Refresh'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {readiness.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{fa ? 'در حال دریافت وضعیت…' : 'Loading status…'}</p>}
        {readiness.isError && <p className="text-sm text-destructive">{fa ? 'دریافت وضعیت Studio ممکن نشد.' : 'Studio readiness could not be loaded.'}</p>}
        {readiness.data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={readiness.data.studio.provider === 'disabled' ? 'secondary' : 'default'}>
                {fa ? `حالت: ${providerLabel(readiness.data.studio.provider, true)}` : `Mode: ${providerLabel(readiness.data.studio.provider, false)}`}
              </Badge>
              <Badge variant={readiness.data.studio.externalStudioConfigured ? 'default' : 'secondary'}>
                {fa ? `اتصال خارجی: ${readiness.data.studio.externalStudioConfigured ? 'آماده' : 'تنظیم‌نشده'}` : `External connection: ${readiness.data.studio.externalStudioConfigured ? 'ready' : 'not configured'}`}
              </Badge>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{fa ? 'پیشنهاد عنوان' : 'Title suggestions'}</dt><dd className="mt-1 font-semibold">{readiness.data.studio.capabilities.titleSuggestions ? (fa ? 'مجاز' : 'Allowed') : (fa ? 'غیرفعال' : 'Disabled')}</dd></div>
              <div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{fa ? 'بازنویسی دانشگاهی' : 'Academic rewrite'}</dt><dd className="mt-1 font-semibold">{readiness.data.studio.capabilities.academicRewrite ? (fa ? 'مجاز' : 'Allowed') : (fa ? 'غیرفعال' : 'Disabled')}</dd></div>
              <div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{fa ? 'پیشنهاد مقاله' : 'Editorial proposals'}</dt><dd className="mt-1 font-semibold">{readiness.data.studio.capabilities.editorialProposals ? (fa ? 'مجاز' : 'Allowed') : (fa ? 'غیرفعال' : 'Disabled')}</dd></div>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
