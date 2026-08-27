import { useQuery } from '@tanstack/react-query';
import { Activity, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCasioIntegrationStatus } from '@/lib/backend-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CasioIntegrationStatus() {
  const { locale } = useLanguage();
  const status = useQuery({
    queryKey: ['casio-integration-status'],
    queryFn: getCasioIntegrationStatus,
    refetchInterval: 30_000,
  });

  return (
    <Card className="glass-surface" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              {locale === 'fa' ? 'پایش اتصال Casioplus' : 'Casioplus integration monitoring'}
            </CardTitle>
            <CardDescription className="mt-1">
              {locale === 'fa' ? 'فقط وضعیت صف و runtime نمایش داده می‌شود؛ متن مقاله و کلیدها هرگز در این بخش نشان داده نمی‌شوند.' : 'Only queue and runtime status are shown; article content and keys are never displayed here.'}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => void status.refetch()} disabled={status.isFetching}>
            {status.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ms-1.5">{locale === 'fa' ? 'به‌روزرسانی' : 'Refresh'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {status.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{locale === 'fa' ? 'در حال دریافت وضعیت…' : 'Loading status…'}</p>}
        {status.isError && <p className="text-sm text-destructive">{locale === 'fa' ? 'دریافت وضعیت اتصال ممکن نشد.' : 'Integration status could not be loaded.'}</p>}
        {status.data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={status.data.enabled ? 'default' : 'secondary'}>{locale === 'fa' ? `اتصال: ${status.data.enabled ? 'فعال' : 'غیرفعال'}` : `Integration: ${status.data.enabled ? 'enabled' : 'disabled'}`}</Badge>
              <Badge variant={status.data.workerEnabled ? 'default' : 'secondary'}>{locale === 'fa' ? `worker: ${status.data.workerEnabled ? 'فعال' : 'غیرفعال'}` : `Worker: ${status.data.workerEnabled ? 'enabled' : 'disabled'}`}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{locale === 'fa' ? 'در انتظار' : 'Pending'}</dt><dd className="mt-1 text-lg font-semibold">{status.data.outbox.pending}</dd></div>
              <div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{locale === 'fa' ? 'در حال پردازش' : 'Leased'}</dt><dd className="mt-1 text-lg font-semibold">{status.data.outbox.leased}</dd></div>
              <div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{locale === 'fa' ? 'تحویل‌شده' : 'Delivered'}</dt><dd className="mt-1 text-lg font-semibold">{status.data.outbox.delivered}</dd></div>
              <div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{locale === 'fa' ? 'نیازمند رسیدگی' : 'Dead-letter'}</dt><dd className="mt-1 text-lg font-semibold">{status.data.outbox.deadLetter}</dd></div>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
