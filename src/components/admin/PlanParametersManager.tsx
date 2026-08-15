import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export type PlanParameterValue = {
  planKey: 'free' | 'student' | 'professor';
  planName: string;
  parameterKey: string;
  parameterName: string;
  unit?: string | null;
  period: string;
  enabled: boolean;
  value: string;
  exhaustionBehavior: 'block' | 'warn' | 'approval' | 'overage';
};

const PLAN_LABELS: Record<PlanParameterValue['planKey'], string> = {
  free: 'رایگان',
  student: 'دانشجویی',
  professor: 'استادی',
};

export function PlanParametersManager({
  values,
  locale = 'fa',
  onChange,
}: {
  values: PlanParameterValue[];
  locale?: 'fa' | 'en';
  onChange?: (next: PlanParameterValue) => void;
}) {
  const grouped = useMemo(() => {
    return values.reduce<Record<string, PlanParameterValue[]>>((acc, value) => {
      acc[value.parameterKey] ??= [];
      acc[value.parameterKey].push(value);
      return acc;
    }, {});
  }, [values]);

  const text = locale === 'fa'
    ? { title: 'کنترل پارامترهای پلن', period: 'دوره', unit: 'واحد', enabled: 'فعال', limit: 'مقدار', behavior: 'رفتار پایان سهمیه' }
    : { title: 'Plan parameter controls', period: 'Period', unit: 'Unit', enabled: 'Enabled', limit: 'Limit', behavior: 'Exhaustion behavior' };

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <CardTitle>{text.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(grouped).map(([parameterKey, entries]) => {
          const first = entries[0];
          return (
            <section key={parameterKey} className="space-y-3 rounded-xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium">{first.parameterName}</h3>
                  <p className="text-xs text-muted-foreground">{parameterKey}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{text.period}: {first.period}</Badge>
                  {first.unit && <Badge variant="secondary">{text.unit}: {first.unit}</Badge>}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {entries.map((entry) => (
                  <div key={`${entry.planKey}-${entry.parameterKey}`} className="space-y-2 rounded-lg bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{PLAN_LABELS[entry.planKey]}</span>
                      <Switch
                        checked={entry.enabled}
                        aria-label={`${text.enabled}: ${PLAN_LABELS[entry.planKey]}`}
                        onCheckedChange={(enabled) => onChange?.({ ...entry, enabled })}
                      />
                    </div>
                    <Input
                      value={entry.value}
                      disabled={!entry.enabled}
                      inputMode="decimal"
                      aria-label={`${text.limit}: ${PLAN_LABELS[entry.planKey]}`}
                      onChange={(event) => onChange?.({ ...entry, value: event.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">{entry.exhaustionBehavior}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
