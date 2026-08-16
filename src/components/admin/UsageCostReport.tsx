import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAdminUsageReport, type UsageReport } from '@/lib/article-workflow-api';

export default function UsageCostReport() {
  const { locale } = useLanguage();
  const [report, setReport] = useState<UsageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = (fa: string, en: string) => locale === 'fa' ? fa : en;

  useEffect(() => {
    getAdminUsageReport().then(setReport).catch((reason) => setError(reason instanceof Error ? reason.message : 'report_failed'));
  }, []);

  if (error) return <Card><CardContent className="pt-6 text-destructive">{t('دریافت گزارش ممکن نیست: ', 'Unable to load report: ')}{error}</CardContent></Card>;
  if (!report) return <Card><CardContent className="pt-6">{t('در حال دریافت گزارش…', 'Loading report…')}</CardContent></Card>;

  const total = report.totals;
  const cards = [
    [t('کل درخواست‌ها', 'Requests'), total.requests],
    [t('تعداد cache hit', 'Cache hits'), total.cacheHits],
    [t('هزینه provider (واحد خرد)', 'Provider cost (minor units)'), total.providerCostMinor],
    [t('صرفه‌جویی برآوردی (واحد خرد)', 'Estimated savings (minor units)'), total.estimatedSavingsMinor],
  ];
  return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-4">{cards.map(([label, value]) => <Card key={String(label)}><CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{value}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>{t('تفکیک provider و مدل', 'Provider and model breakdown')}</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-start">Provider / Model</th><th className="p-2 text-start">Feature</th><th className="p-2 text-end">Requests</th><th className="p-2 text-end">Cache hits</th><th className="p-2 text-end">Cost</th><th className="p-2 text-end">Savings</th></tr></thead><tbody>{report.rows.map((row) => <tr className="border-b" key={`${row.provider}-${row.model}-${row.feature_key}`}><td className="p-2">{row.provider} / {row.model}</td><td className="p-2">{row.feature_key}</td><td className="p-2 text-end">{row.requests}</td><td className="p-2 text-end">{row.cache_hits}</td><td className="p-2 text-end">{row.provider_cost_minor}</td><td className="p-2 text-end">{row.estimated_savings_minor}</td></tr>)}</tbody></table></CardContent></Card>
  </div>;
}
