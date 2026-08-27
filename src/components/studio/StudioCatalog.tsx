import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CircleOff, Loader2, LockKeyhole, RefreshCw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { listStudioCapabilities, type StudioCapabilityContext, type StudioCatalogCapability } from '@/lib/backend-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const contexts: Array<{ key: StudioCapabilityContext | 'all'; fa: string; en: string }> = [
  { key: 'all', fa: 'همه', en: 'All' },
  { key: 'article', fa: 'مقاله', en: 'Article' },
  { key: 'publication', fa: 'انتشار', en: 'Publication' },
  { key: 'live', fa: 'جلسهٔ زنده', en: 'Live' },
  { key: 'media', fa: 'رسانه', en: 'Media' },
  { key: 'community', fa: 'جامعه', en: 'Community' },
  { key: 'operations', fa: 'عملیات', en: 'Operations' },
];

function readinessLabel(readiness: StudioCatalogCapability['readiness'], fa: boolean) {
  const labels = {
    connection_ready: fa ? 'آمادهٔ اتصال' : 'Connection-ready',
    contract_pending: fa ? 'قرارداد باقی‌مانده' : 'Contract pending',
    foundation_pending: fa ? 'Foundation باقی‌مانده' : 'Foundation pending',
    governance_pending: fa ? 'حکمرانی باقی‌مانده' : 'Governance pending',
  };
  return labels[readiness];
}

function riskLabel(risk: StudioCatalogCapability['risk'], fa: boolean) {
  const labels = {
    low: fa ? 'ریسک پایین' : 'Low risk',
    medium: fa ? 'ریسک متوسط' : 'Medium risk',
    high: fa ? 'ریسک بالا' : 'High risk',
  };
  return labels[risk];
}

function readinessVariant(readiness: StudioCatalogCapability['readiness']) {
  return readiness === 'connection_ready' ? 'default' : readiness === 'governance_pending' ? 'destructive' : 'secondary';
}

export function StudioCatalog({ context: initialContext }: { context?: StudioCapabilityContext } = {}) {
  const { locale } = useLanguage();
  const fa = locale === 'fa';
  const [selectedContext, setSelectedContext] = useState<StudioCapabilityContext | 'all'>(initialContext ?? 'all');
  const catalog = useQuery({
    queryKey: ['studio-catalog'],
    queryFn: () => listStudioCapabilities(),
    staleTime: 30_000,
  });

  const capabilities = useMemo(() => {
    const items = catalog.data?.capabilities ?? [];
    return selectedContext === 'all' ? items : items.filter((item) => item.context === selectedContext);
  }, [catalog.data?.capabilities, selectedContext]);

  return (
    <section className="space-y-5" dir={fa ? 'rtl' : 'ltr'} aria-labelledby="studio-catalog-title">
      <Card className="glass-surface overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-l from-primary/10 via-transparent to-transparent">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="space-y-1.5">
              <CardTitle id="studio-catalog-title" className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-primary" />{fa ? 'کاتالوگ قابلیت‌های Studio' : 'Studio capability catalog'}</CardTitle>
              <CardDescription className="max-w-3xl">{fa ? 'تمام قابلیت‌ها از هم‌اکنون در نقشهٔ محصول دیده می‌شوند، اما تا تکمیل قرارداد، سیاست داده و آزمون مشترک، هیچ‌کدام اجرا یا به سرویس خارجی متصل نمی‌شوند.' : 'All capabilities are visible in the product map, but none will run or connect externally until contracts, data policy and shared tests are complete.'}</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => void catalog.refetch()} disabled={catalog.isFetching}>
              {catalog.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ms-1.5">{fa ? 'به‌روزرسانی' : 'Refresh'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap gap-2" aria-label={fa ? 'فیلتر زمینهٔ قابلیت‌ها' : 'Capability context filter'}>
            {contexts.map((item) => <Button key={item.key} size="sm" variant={selectedContext === item.key ? 'default' : 'outline'} onClick={() => setSelectedContext(item.key)}>{fa ? item.fa : item.en}</Button>)}
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{fa ? 'وضعیت فعلی: ' : 'Current state: '}</span>
            {fa ? 'تمام کلیدهای اجرایی عمداً غیرفعال‌اند و خروجی هر Flow در آینده فقط به‌صورت draft قابل‌داوری بازمی‌گردد.' : 'Every execution control is intentionally disabled; future Flow output will be returned only as a reviewable draft.'}
          </div>
        </CardContent>
      </Card>

      {catalog.isLoading && <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{fa ? 'در حال دریافت کاتالوگ…' : 'Loading catalog…'}</div>}
      {catalog.isError && <Card><CardContent className="flex items-center gap-2 py-6 text-destructive"><AlertTriangle className="h-4 w-4" />{fa ? 'دریافت کاتالوگ Studio ممکن نشد.' : 'Studio catalog could not be loaded.'}</CardContent></Card>}
      {catalog.data && (
        <div className="grid gap-4 xl:grid-cols-2">
          {capabilities.map((item) => <CapabilityCard key={item.key} item={item} fa={fa} />)}
          {capabilities.length === 0 && <Card><CardContent className="py-8 text-sm text-muted-foreground">{fa ? 'قابلیتی برای این زمینه ثبت نشده است.' : 'No capability is registered for this context.'}</CardContent></Card>}
        </div>
      )}
    </section>
  );
}

function CapabilityCard({ item, fa }: { item: StudioCatalogCapability; fa: boolean }) {
  return (
    <Card className="flex h-full flex-col border-border/70">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{fa ? item.titleFa : item.titleEn}</CardTitle>
            <CardDescription>{fa ? item.descriptionFa : item.descriptionEn}</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1"><CircleOff className="h-3 w-3" />{fa ? 'غیرفعال' : 'Disabled'}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant={readinessVariant(item.readiness)}>{readinessLabel(item.readiness, fa)}</Badge>
          <Badge variant="outline">{riskLabel(item.risk, fa)}</Badge>
          <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />{fa ? 'بازبینی انسانی' : 'Human review'}</Badge>
          {item.requiresConsent && <Badge variant="outline" className="gap-1"><LockKeyhole className="h-3 w-3" />{fa ? 'نیازمند رضایت' : 'Consent required'}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 text-sm">
        <dl className="grid gap-2 rounded-lg bg-muted/45 p-3 text-muted-foreground sm:grid-cols-2">
          <div><dt className="text-xs">{fa ? 'ورودی مجاز' : 'Allowed input'}</dt><dd className="mt-0.5 text-foreground">{item.inputSummaryFa}</dd></div>
          <div><dt className="text-xs">{fa ? 'خروجی مجاز' : 'Allowed output'}</dt><dd className="mt-0.5 text-foreground">{item.outputSummaryFa}</dd></div>
        </dl>
        <p className="rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">{item.activationBlockedByFa}</p>
        <Button className="w-full" disabled title={item.activationBlockedByFa}><CircleOff className="h-4 w-4" />{fa ? 'در انتظار آماده‌سازی Studio' : 'Awaiting Studio readiness'}</Button>
      </CardContent>
    </Card>
  );
}
