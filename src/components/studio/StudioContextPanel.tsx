import { useQuery } from '@tanstack/react-query';
import { CircleOff, Eye, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { listStudioCapabilities, type StudioCapabilityContext } from '@/lib/backend-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const contextHeading: Record<StudioCapabilityContext, { fa: string; en: string }> = {
  article: { fa: 'ابزارهای Studio برای مقاله', en: 'Studio tools for this article' },
  publication: { fa: 'ابزارهای Studio برای انتشار', en: 'Studio tools for publication' },
  live: { fa: 'ابزارهای Studio برای جلسهٔ زنده', en: 'Studio tools for live sessions' },
  media: { fa: 'ابزارهای Studio برای رسانه', en: 'Studio tools for media' },
  community: { fa: 'ابزارهای Studio برای جامعه', en: 'Studio tools for community' },
  operations: { fa: 'ابزارهای Studio برای عملیات', en: 'Studio tools for operations' },
};

export function StudioContextPanel({ context }: { context: StudioCapabilityContext }) {
  const { locale } = useLanguage();
  const fa = locale === 'fa';
  const catalog = useQuery({
    queryKey: ['studio-catalog', context],
    queryFn: () => listStudioCapabilities(context),
    staleTime: 30_000,
  });
  const heading = contextHeading[context];

  return (
    <Card className="border-dashed border-primary/35 bg-primary/[0.025]" dir={fa ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />{fa ? heading.fa : heading.en}</CardTitle>
        <CardDescription>{fa ? 'قابلیت‌های مرتبط از حالا قابل مشاهده‌اند. اجرای همهٔ آن‌ها تا اتصال تأییدشده به Studio غیرفعال است.' : 'Relevant capabilities are visible now. Execution remains disabled until the Studio connection is approved.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {catalog.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{fa ? 'در حال دریافت…' : 'Loading…'}</p>}
        {catalog.isError && <p className="text-sm text-muted-foreground">{fa ? 'کاتالوگ Studio در دسترس نیست.' : 'Studio catalog is unavailable.'}</p>}
        {catalog.data && <div className="grid gap-2 md:grid-cols-2">
          {catalog.data.capabilities.map((item) => (
            <div key={item.key} className="rounded-lg border border-border/65 bg-background/65 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{fa ? item.titleFa : item.titleEn}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{fa ? item.activationBlockedByFa : 'This capability is awaiting its contract, governance policy, or Studio connection.'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{fa ? 'غیرفعال' : 'Disabled'}</Badge>
                  <Button size="sm" disabled title={item.activationBlockedByFa}><CircleOff className="h-3.5 w-3.5" />{fa ? 'اجرا' : 'Run'}</Button>
                </div>
              </div>
              <details className="group mt-2 rounded-md border border-primary/15 bg-primary/[0.03] px-2.5 py-2">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-foreground marker:content-none">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  {fa ? 'نمونهٔ آموزشی (بدون اجرا)' : 'Educational preview (no execution)'}
                  <span className="ms-auto text-muted-foreground group-open:hidden">{fa ? 'نمایش' : 'Show'}</span>
                </summary>
                <div className="mt-2 space-y-1.5 border-t border-primary/15 pt-2 text-xs">
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">{fa ? 'سناریو: ' : 'Scenario: '}</span>{item.preview.scenarioFa}</p>
                  <pre className="whitespace-pre-wrap rounded border border-border/60 bg-background/80 p-2 font-sans leading-5 text-muted-foreground">{item.preview.sampleOutputFa}</pre>
                  <p className="text-muted-foreground">{item.preview.safetyNoteFa}</p>
                </div>
              </details>
            </div>
          ))}
        </div>}
      </CardContent>
    </Card>
  );
}
