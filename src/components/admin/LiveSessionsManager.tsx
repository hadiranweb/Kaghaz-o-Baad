import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, Trash2, Radio, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUSES = ['scheduled', 'live', 'ended', 'cancelled'] as const;

const STATUS_LABEL: Record<string, { en: string; fa: string }> = {
  scheduled: { en: 'Scheduled', fa: 'برنامه‌ریزی شده' },
  live: { en: 'Live', fa: 'در حال پخش' },
  ended: { en: 'Ended', fa: 'پایان یافته' },
  cancelled: { en: 'Cancelled', fa: 'لغو شده' },
};

function toLocalInput(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LiveSessionsManager() {
  const { locale } = useLanguage();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .order('scheduled_at', { ascending: false, nullsFirst: false });
    if (error) {
      toast({ variant: 'destructive', title: locale === 'fa' ? 'خطا' : 'Error', description: error.message });
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (id: string, field: string, value: any) =>
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const save = async (s: any) => {
    setSavingId(s.id);
    const { error } = await supabase
      .from('live_sessions')
      .update({
        title_en: s.title_en,
        title_fa: s.title_fa,
        description_en: s.description_en,
        description_fa: s.description_fa,
        status: s.status,
        scheduled_at: s.scheduled_at ? new Date(s.scheduled_at).toISOString() : null,
        max_participants: Number(s.max_participants) || 100,
        recording_enabled: !!s.recording_enabled,
      })
      .eq('id', s.id);
    setSavingId(null);
    if (error) {
      toast({ variant: 'destructive', title: locale === 'fa' ? 'خطا' : 'Error', description: error.message });
    } else {
      toast({
        title: locale === 'fa' ? 'ذخیره شد' : 'Saved',
        description: locale === 'fa' ? 'جلسه به‌روزرسانی شد' : 'Session updated',
      });
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('live_sessions').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: locale === 'fa' ? 'خطا' : 'Error', description: error.message });
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: locale === 'fa' ? 'حذف شد' : 'Deleted' });
    }
  };

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-thin">
          {locale === 'fa' ? 'پخش‌های زنده (پایش ادمین)' : 'Live Sessions (Admin Monitor)'} ({sessions.length})
        </h2>
      </div>

      {sessions.length === 0 ? (
        <Card className="glass-surface">
          <CardContent className="py-8 text-center text-muted-foreground">
            {locale === 'fa' ? 'هنوز جلسه‌ای وجود ندارد' : 'No live sessions yet'}
          </CardContent>
        </Card>
      ) : (
        sessions.map((s) => (
          <Card key={s.id} className="glass-surface">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg">
                  {(locale === 'fa' ? s.title_fa : s.title_en) || s.room_name}
                </CardTitle>
                <span className="px-3 py-1 rounded-full text-xs whitespace-nowrap bg-accent/15 text-accent">
                  {STATUS_LABEL[s.status]?.[locale === 'fa' ? 'fa' : 'en'] ?? s.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{s.room_name}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Title (EN)</label>
                  <Input value={s.title_en ?? ''} onChange={(e) => setField(s.id, 'title_en', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">عنوان (FA)</label>
                  <Input dir="rtl" value={s.title_fa ?? ''} onChange={(e) => setField(s.id, 'title_fa', e.target.value)} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Description (EN)</label>
                  <Textarea rows={3} value={s.description_en ?? ''} onChange={(e) => setField(s.id, 'description_en', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">توضیحات (FA)</label>
                  <Textarea rows={3} dir="rtl" value={s.description_fa ?? ''} onChange={(e) => setField(s.id, 'description_fa', e.target.value)} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {locale === 'fa' ? 'وضعیت' : 'Status'}
                  </label>
                  <select
                    value={s.status}
                    onChange={(e) => setField(s.id, 'status', e.target.value)}
                    className="w-full h-10 rounded-xl bg-background/40 border border-border px-3 text-sm"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABEL[st][locale === 'fa' ? 'fa' : 'en']}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {locale === 'fa' ? 'زمان برگزاری' : 'Scheduled at'}
                  </label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(s.scheduled_at)}
                    onChange={(e) => setField(s.id, 'scheduled_at', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {locale === 'fa' ? 'حداکثر شرکت‌کننده' : 'Max participants'}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={s.max_participants ?? 100}
                    onChange={(e) => setField(s.id, 'max_participants', e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!!s.recording_enabled}
                  onChange={(e) => setField(s.id, 'recording_enabled', e.target.checked)}
                />
                {locale === 'fa' ? 'ضبط جلسه فعال باشد' : 'Recording enabled'}
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/live/${s.id}`}>
                    <ExternalLink className="w-4 h-4" />
                    {locale === 'fa' ? 'ورود' : 'Open'}
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {locale === 'fa' ? 'حذف جلسه' : 'Delete session'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {locale === 'fa'
                          ? 'آیا از حذف این پخش زنده اطمینان دارید؟ این عملیات قابل بازگشت نیست.'
                          : 'Are you sure you want to delete this live session? This cannot be undone.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{locale === 'fa' ? 'لغو' : 'Cancel'}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(s.id)}>
                        {locale === 'fa' ? 'حذف' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button size="sm" disabled={savingId === s.id} onClick={() => save(s)}>
                  <Save className="w-4 h-4" />
                  {locale === 'fa' ? 'ذخیره' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}