import { useEffect, useState } from 'react';
import { listCircuitBreakers, resetCircuitBreaker, tripCircuitBreakerTest } from '@/lib/backend-api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, RefreshCw, Activity, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

interface CircuitBreakerItem {
  service_name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failure_count: number;
  last_failure_at: string | null;
  opened_at: string | null;
  cooldown_seconds: number;
  updated_at: string;
}

export default function CircuitBreakerMonitor() {
  const { locale } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<CircuitBreakerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyService, setBusyService] = useState<string | null>(null);

  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);

  const loadBreakers = async () => {
    setLoading(true);
    try {
      const { breakers } = await listCircuitBreakers();
      setItems(breakers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        variant: 'destructive',
        title: t('خطا در بارگذاری مدارشکن‌ها', 'Error loading circuit breakers'),
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBreakers();
  }, []);

  const handleReset = async (serviceName: string) => {
    setBusyService(serviceName);
    try {
      await resetCircuitBreaker(serviceName);
      toast({
        title: t('مدارشکن بازنشانی شد', 'Circuit Breaker Reset'),
        description: t(`سرویس ${serviceName} به وضعیت عادی (CLOSED) بازگشت.`, `${serviceName} returned to normal (CLOSED) state.`),
      });
      loadBreakers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        variant: 'destructive',
        title: t('خطا در بازنشانی مدارشکن', 'Reset Error'),
        description: msg,
      });
    } finally {
      setBusyService(null);
    }
  };

  const handleTripTest = async (serviceName: string) => {
    setBusyService(serviceName);
    try {
      await tripCircuitBreakerTest(serviceName);
      toast({
        variant: 'destructive',
        title: t('تست قطع سریع مدارشکن (OPEN)', 'Circuit Breaker Tripped (Test)'),
        description: t(
          `سرویس ${serviceName} در حالت قطع سریع قرار گرفت. اکنون درخواست‌ها به صورت Graceful Degradation پاسخ داده می‌شوند.`,
          `${serviceName} tripped to OPEN mode. Requests will now gracefully degrade.`
        ),
      });
      loadBreakers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        variant: 'destructive',
        title: t('خطا در شبیه‌سازی مدارشکن', 'Trip Test Error'),
        description: msg,
      });
    } finally {
      setBusyService(null);
    }
  };

  const serviceDescription = (s: string) => {
    if (s === 'gemini-ai') {
      return t(
        'هوش مصنوعی Google Gemini (پیشنهاد جستجو و بازنویسی مقالات). در وضعیت OPEN، پاسخ‌ها فوری به صورت آفلاین/تنزّل ظریف (Curated Keywords) ارائه می‌شوند.',
        'Google Gemini AI (search suggestions & article rewrite). When OPEN, responses degrade gracefully to instant curated keywords.'
      );
    }
    if (s === 'smsir-api') {
      return t(
        'سرویس پیامکی SMS.ir (ارسال کدهای ورود OTP). در وضعیت OPEN، درخواست‌ها فوری با پیام ۵۰۳ و Retry-After بازمی‌گردند تا سیستم درگیر تایم‌اوت نشود.',
        'SMS.ir provider (OTP SMS delivery). When OPEN, requests fail-fast with 503 and Retry-After to prevent latency cascading.'
      );
    }
    return s;
  };

  const getStateBadge = (state: string) => {
    if (state === 'CLOSED') {
      return (
        <Badge variant="default" className="bg-emerald-600/90 hover:bg-emerald-600 text-white gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{t('CLOSED (عادی / فعال)', 'CLOSED (Normal)')}</span>
        </Badge>
      );
    }
    if (state === 'HALF_OPEN') {
      return (
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border border-amber-500/30 gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{t('HALF_OPEN (تست بازیابی)', 'HALF_OPEN (Recovery Trial)')}</span>
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1 animate-pulse">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>{t('OPEN (قطع سریع / Degraded)', 'OPEN (Degraded / Fast-Fail)')}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">
              {t('پایش مدارشکن‌ها و تاب‌آوری (Circuit Breakers)', 'Resilience & Circuit Breakers')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                'محافظت خودکار سیستم در برابر کندی و خرابی وابستگی‌های خارجی (بر اساس اصول Algomaster)',
                'Automated system protection against external dependency failures (Algomaster principles)'
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadBreakers} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('به‌روزرسانی وضعیت', 'Refresh')}</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('هیچ مدارشکنی یافت نشد.', 'No circuit breakers found.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const isBusy = busyService === item.service_name;
            return (
              <Card key={item.service_name} className="glass-surface border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-mono text-primary flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span>{item.service_name}</span>
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-xs leading-5">
                        {serviceDescription(item.service_name)}
                      </CardDescription>
                    </div>
                    {getStateBadge(item.state)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-secondary/30 p-3 border border-border/40">
                    <div>
                      <span className="text-muted-foreground block">{t('تعداد خطای متوالی:', 'Consecutive Failures:')}</span>
                      <span className="font-semibold text-foreground text-sm">{item.failure_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{t('زمان وقفه (تنفس):', 'Cooldown Period:')}</span>
                      <span className="font-semibold text-foreground text-sm">{item.cooldown_seconds} {t('ثانیه', 's')}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-border/30 text-[11px] text-muted-foreground flex justify-between">
                      <span>{t('آخرین خطا:', 'Last Failure:')}</span>
                      <span>{item.last_failure_at ? new Date(item.last_failure_at).toLocaleTimeString(locale) : '—'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy || item.state === 'CLOSED'}
                      onClick={() => handleReset(item.service_name)}
                    >
                      {t('بازنشانی به CLOSED', 'Reset to CLOSED')}
                    </Button>
                    <Button
                      size="sm"
                      variant={item.state === 'OPEN' ? 'secondary' : 'destructive'}
                      disabled={isBusy || item.state === 'OPEN'}
                      onClick={() => handleTripTest(item.service_name)}
                    >
                      {t('شبیه‌سازی قطع (تست OPEN)', 'Simulate OPEN Trip')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
