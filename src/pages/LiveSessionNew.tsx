import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LiveSessionNew() {
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descFa, setDescFa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        status: 'scheduled',
      })
      .select('id')
      .single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(locale === 'fa' ? 'جلسه ایجاد شد' : 'Session created');
    navigate(`/live/${data.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-thin mb-8">
        {locale === 'fa' ? 'ایجاد جلسه پرسش و پاسخ' : 'Create Q&A Session'}
      </h1>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{locale === 'fa' ? 'عنوان (فارسی)' : 'Title (FA)'}</Label>
            <Input value={titleFa} onChange={(e) => setTitleFa(e.target.value)} dir="rtl" />
          </div>
          <div className="space-y-2">
            <Label>{locale === 'fa' ? 'عنوان (انگلیسی)' : 'Title (EN)'}</Label>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
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
        <div className="space-y-2">
          <Label>{locale === 'fa' ? 'زمان برگزاری (اختیاری)' : 'Scheduled time (optional)'}</Label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting
            ? locale === 'fa' ? 'در حال ایجاد…' : 'Creating…'
            : locale === 'fa' ? 'ایجاد جلسه' : 'Create session'}
        </Button>
      </form>
    </div>
  );
}