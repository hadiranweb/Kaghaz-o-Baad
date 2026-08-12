import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Shield, BookOpen } from 'lucide-react';

export default function LiveSessionNew() {
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descFa, setDescFa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('none');
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const [myArticles, setMyArticles] = useState<Array<{ id: string; title_fa: string; title_en: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('articles')
      .select('id, title_fa, title_en')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyArticles(data || []));
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFa.trim() || !titleEn.trim()) {
      toast.error(locale === 'fa' ? 'عنوان فارسی و انگلیسی لازم است' : 'Title (FA & EN) required');
      return;
    }
    setSubmitting(true);
    const roomName = `qa-${crypto.randomUUID().slice(0, 12)}`;
    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        host_user_id: user.id,
        room_name: roomName,
        title_fa: titleFa,
        title_en: titleEn,
        description_fa: descFa || null,
        description_en: descEn || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        article_id: selectedArticleId !== 'none' ? selectedArticleId : null,
        e2ee_enabled: e2eeEnabled,
        presentation_enabled: true,
        status: 'scheduled',
      })
      .select('id')
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(locale === 'fa' ? 'جلسه ایجاد شد' : 'Session created');
    navigate(`/live/${data.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-thin mb-8 font-[IRANSharp]">
        {locale === 'fa' ? 'ایجاد جلسه پرسش و پاسخ (کارگاه زنده)' : 'Create Q&A Workshop Session'}
      </h1>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{locale === 'fa' ? 'عنوان (فارسی)' : 'Title (FA)'}</Label>
            <Input value={titleFa} onChange={(e) => setTitleFa(e.target.value)} dir="rtl" placeholder="مثال: روانشناسی کارکرد اجرایی" />
          </div>
          <div className="space-y-2">
            <Label>{locale === 'fa' ? 'عنوان (انگلیسی)' : 'Title (EN)'}</Label>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" placeholder="e.g. Psychology of Executive Function" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{locale === 'fa' ? 'توضیحات (فارسی)' : 'Description (FA)'}</Label>
            <Textarea value={descFa} onChange={(e) => setDescFa(e.target.value)} dir="rtl" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>{locale === 'fa' ? 'توضیحات (انگلیسی)' : 'Description (EN)'}</Label>
            <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} />
          </div>
        </div>

        {/* اتصال اسلاید مقاله به جلسه زنده */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>{locale === 'fa' ? 'اتصال عرشه اسلاید مقاله به کارگاه (Synchronized Slide Deck)' : 'Attach Article Slide Deck to Workshop'}</span>
          </Label>
          <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {locale === 'fa' ? '— بدون اسلاید (فقط گفت‌وگوی صوتی/تصویری)' : '— No Slide Deck (Audio/Video only)'}
              </SelectItem>
              {myArticles.map((art) => (
                <SelectItem key={art.id} value={art.id}>
                  {locale === 'fa' ? art.title_fa : art.title_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {locale === 'fa'
              ? 'در صورت انتخاب، اسلایدهای ۶۰ ثانیه‌ای این مقاله در اتاق لایو به صورت همگام‌سازی‌شده (بدون تاری) نمایش داده می‌شود.'
              : 'If selected, the article 60-second slides will synchronize across all participants in native 4K.'}
          </p>
        </div>

        {/* فعال‌سازی رمزنگاری سرتاسری E2EE */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Shield className="h-4 w-4 text-accent" />
              <span>{locale === 'fa' ? 'رمزنگاری سرتاسری اتصال (E2EE - WebRTC Insertable Streams)' : 'End-to-End Encryption (E2EE)'}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-5">
              {locale === 'fa'
                ? 'در صورت فعال‌سازی، فریم‌های صدا و تصویر قبل از خروج از مرورگر رمزنگاری می‌شوند و حتی سرور SFU قادر به مانیتورینگ جلسه نخواهد بود.'
                : 'When enabled, audio and video frames are encrypted before leaving the browser. Even the SFU server cannot decrypt.'}
            </p>
          </div>
          <Switch checked={e2eeEnabled} onCheckedChange={setE2eeEnabled} />
        </div>

        <div className="space-y-2">
          <Label>{locale === 'fa' ? 'زمان برگزاری (اختیاری)' : 'Scheduled time (optional)'}</Label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>

        <Button type="submit" disabled={submitting} className="w-full h-11">
          {submitting
            ? locale === 'fa' ? 'در حال ایجاد کارگاه…' : 'Creating workshop…'
            : locale === 'fa' ? 'ایجاد جلسه زنده' : 'Create Live Session'}
        </Button>
      </form>
    </div>
  );
}
