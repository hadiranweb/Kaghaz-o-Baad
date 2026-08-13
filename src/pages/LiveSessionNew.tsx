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
import { Shield, BookOpen, UploadCloud, FileText, X, KeyRound, Copy } from 'lucide-react';

const ACCEPTED = '.pdf,.ppt,.pptx,.png,.jpg,.jpeg,.webp';
const MAX_BYTES = 200 * 1024 * 1024; // 200MB

function extOf(name: string) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export default function LiveSessionNew() {
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const fa = locale === 'fa';

  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descFa, setDescFa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('none');
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [myArticles, setMyArticles] = useState<Array<{ id: string; title_fa: string; title_en: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [e2eeKey, setE2eeKey] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('articles')
      .select('id, title_fa, title_en')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyArticles(data || []));
  }, [user]);

  // تولید کلید E2EE در مرورگر — روی سرور ذخیره نمی‌شود
  useEffect(() => {
    if (e2eeEnabled && !e2eeKey) {
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      setE2eeKey(`kb-${b64}`);
    }
  }, [e2eeEnabled, e2eeKey]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handleFile = (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error(fa ? 'حجم فایل بیشتر از ۲۰۰ مگابایت است' : 'File exceeds 200MB limit');
      return;
    }
    setPresentationFile(f);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFa.trim() || !titleEn.trim()) {
      toast.error(fa ? 'عنوان فارسی و انگلیسی لازم است' : 'Title (FA & EN) required');
      return;
    }
    setSubmitting(true);

    try {
      // ۱) آپلود فایل ارائه به درایو رسانه (باکت خصوصی media)
      let presentationMediaId: string | null = null;
      if (presentationFile && user) {
        setUploading(true);
        const ext = extOf(presentationFile.name) || '.pdf';
        const storagePath = `${user.id}/presentations/${crypto.randomUUID()}${ext}`;
        const { error: upErr } = await supabase.storage
          .from('media')
          .upload(storagePath, presentationFile, { upsert: false, cacheControl: '3600' });
        if (upErr) throw new Error(fa ? `آپلود ناموفق: ${upErr.message}` : `Upload failed: ${upErr.message}`);

        const mime = presentationFile.type || 'application/octet-stream';
        const isImage = mime.startsWith('image/');
        const isPdf = mime === 'application/pdf';
        const isPpt = mime.includes('presentation') || /\.ppt.?$/i.test(presentationFile.name);
        const mediaType = isImage ? 'image' : 'pdf'; // پایهٔ سازگار (document برای PPTX در صورت اعمال مهاجرت)

        const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath);

        // تلاش با نوع توسعه‌یافتهٔ document (مهاجرت جدید) و عقب‌نشینی به pdf
        const mediaRow = {
          title_en: presentationFile.name,
          title_fa: presentationFile.name,
          type: mediaType,
          src_url: urlData.publicUrl,
          owner_id: user.id,
          file_size: presentationFile.size,
          visibility: 'private' as const,
          meta: {
            storage_path: storagePath,
            mime,
            original_name: presentationFile.name,
            presentation: true,
            doc_type: isPpt ? 'pptx' : isPdf ? 'pdf' : isImage ? 'image' : 'other',
          },
        };

        const baseRow = { ...mediaRow, type: isPpt ? ('document' as const) : mediaType };
        let mediaResult = await supabase.from('media').insert(baseRow).select('id').single();
        if (mediaResult.error && /document|check constraint|type/i.test(mediaResult.error.message || '')) {
          // مهاجرت media_type_check اعمال نشده → عقب‌نشینی به نوع pdf
          mediaResult = await supabase.from('media').insert(mediaRow).select('id').single();
        }
        const mediaErr = mediaResult.error;
        if (mediaErr) throw new Error(fa ? `ثبت رسانه ناموفق: ${mediaErr.message}` : `Media insert failed: ${mediaErr.message}`);
        presentationMediaId = mediaResult.data?.id ?? null;
        setUploading(false);
      }

      // ۲) ساخت جلسه زنده
      const roomName = `qa-${crypto.randomUUID().slice(0, 12)}`;
      const nowLive = !scheduledAt;
      const sessionRow = {
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
        presentation_media_id: presentationMediaId,
        status: nowLive ? 'live' : 'scheduled',
      };

      // تایپ‌های تولیدشده هنوز ستون‌های جدید را نمی‌دانند؛ پس از `supabase gen types` می‌توان cast را حذف کرد
      let sessionResult = await supabase
        .from('live_sessions')
        .insert(sessionRow as never)
        .select('id')
        .single();

      if (sessionResult.error && /column|e2ee_enabled|presentation_media_id|presentation_enabled/i.test(sessionResult.error.message || '')) {
        // مهاجرت ستون‌های جدید اعمال نشده → درج بدون ستون‌های جدید
        toast.warning(fa ? 'ستون‌های جدید دیتابیس اعمال نشده‌اند — supabase db push را اجرا کنید' : 'New DB columns missing — run supabase db push');
        sessionResult = await supabase
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
            status: nowLive ? 'live' : 'scheduled',
          })
          .select('id')
          .single();
      }

      const { data, error } = sessionResult;
      if (error) throw error;
      setSubmitting(false);

      toast.success(fa ? 'جلسه ایجاد شد' : 'Session created');
      if (e2eeEnabled && e2eeKey) {
        // نمایش کلید E2EE — باید جداگانه و امن ارسال شود
        navigator.clipboard?.writeText(e2eeKey).catch(() => undefined);
        toast.info(
          fa
            ? 'کلید E2EE ساخته و کپی شد — آن را فقط از راهِ امن برای شرکت‌کنندگان بفرستید'
            : 'E2EE key generated & copied — share it securely with participants',
          { duration: 8000 },
        );
      }
      navigate(`/live/${data.id}`);
    } catch (err) {
      setSubmitting(false);
      setUploading(false);
      const message = (err as { message?: string })?.message || String(err);
      toast.error(fa ? `خطا: ${message}` : `Error: ${message}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl" dir={fa ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-thin mb-8 font-[IRANSharp]">
        {fa ? 'ایجاد جلسه پرسش و پاسخ (کارگاه زنده)' : 'Create Q&A Workshop Session'}
      </h1>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{fa ? 'عنوان (فارسی)' : 'Title (FA)'}</Label>
            <Input value={titleFa} onChange={(e) => setTitleFa(e.target.value)} dir="rtl" placeholder="مثال: روانشناسی کارکرد اجرایی" />
          </div>
          <div className="space-y-2">
            <Label>{fa ? 'عنوان (انگلیسی)' : 'Title (EN)'}</Label>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" placeholder="e.g. Psychology of Executive Function" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{fa ? 'توضیحات (فارسی)' : 'Description (FA)'}</Label>
            <Textarea value={descFa} onChange={(e) => setDescFa(e.target.value)} dir="rtl" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>{fa ? 'توضیحات (انگلیسی)' : 'Description (EN)'}</Label>
            <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} />
          </div>
        </div>

        {/* آپلود فایل ارائه */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <UploadCloud className="h-4 w-4 text-primary" />
            <span>{fa ? 'آپلود فایل ارائه برای پخش زنده' : 'Upload presentation file'}</span>
          </Label>
          <div
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer hover:border-primary/50 ${
              presentationFile ? 'border-primary/60 bg-primary/5' : 'border-border/60'
            }`}
            onClick={() => document.getElementById('pres-file')?.click()}
          >
            {presentationFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-sm text-left">
                  <div className="font-medium break-all">{presentationFile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(presentationFile.size / (1024 * 1024)).toFixed(1)} MB —{' '}
                    {fa ? 'برای حذف کلیک کنید' : 'click to replace'}
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPresentationFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
                <div className="text-sm">{fa ? 'PDF، تصویر (PNG/JPG/WebP) یا PPTX — تا ۲۰۰MB' : 'PDF, image (PNG/JPG/WebP) or PPTX — up to 200MB'}</div>
                <div className="text-xs text-muted-foreground">
                  {fa
                    ? 'PDF پیشنهاد می‌شود: صفحه‌به‌صفحه، بومی و باکیفیت روی دستگاه همه رندر و همگام می‌شود.'
                    : 'PDF recommended: rendered natively on every device, page-by-page, fully synced.'}
                </div>
              </div>
            )}
            <input
              id="pres-file"
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </div>

        {/* اتصال اسلاید مقاله */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>{fa ? 'اتصال عرشه اسلاید مقاله (اختیاری)' : 'Attach article slide deck (optional)'}</span>
          </Label>
          <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {fa ? '— بدون اسلاید مقاله —' : '— No article slide deck —'}
              </SelectItem>
              {myArticles.map((art) => (
                <SelectItem key={art.id} value={art.id}>
                  {fa ? art.title_fa : art.title_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* فعال‌سازی رمزنگاری سرتاسری E2EE */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Shield className="h-4 w-4 text-accent" />
              <span>{fa ? 'رمزنگاری سرتاسری اتصال (E2EE - WebRTC Insertable Streams)' : 'End-to-End Encryption (E2EE)'}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-5">
              {fa
                ? 'در صورت فعال‌سازی، فریم‌های صدا و تصویر و کانال داده پیش از خروج از مرورگر رمز می‌شوند؛ حتی سرور SFU قادر به مانیتورینگ نیست. کلید در مرورگر شما ساخته و هرگز روی سرور ذخیره نمی‌شود.'
                : 'When enabled, audio/video frames and the data channel are encrypted before leaving the browser; even the SFU cannot monitor. The key is generated in your browser and never stored on the server.'}
            </p>
          </div>
          <Switch checked={e2eeEnabled} onCheckedChange={setE2eeEnabled} />
        </div>

        {e2eeEnabled && e2eeKey && (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <KeyRound className="h-4 w-4" />
              {fa ? 'کلید رمزنگاری جلسه (پس از ساخت، کپی و ارسال امن)' : 'Session encryption key (copy & share securely after creating)'}
            </div>
            <div className="flex gap-2">
              <code className="flex-1 font-mono text-xs bg-background border border-border/60 rounded-lg px-3 py-2 break-all" dir="ltr">
                {e2eeKey}
              </code>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(e2eeKey).then(() => toast.success(fa ? 'کلید کپی شد' : 'Key copied'))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-5">
              {fa
                ? 'هشدار: اگر کلید را گم کنید، هیچ‌کس (حتی مدیر سامانه) نمی‌تواند محتوای جلسه را باز کند.'
                : 'Warning: if the key is lost, no one (not even the platform admin) can decrypt the session.'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>{fa ? 'زمان برگزاری (اختیاری — خالی = پخش بلافاصله)' : 'Scheduled time (optional — empty = start now)'}</Label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>

        <Button type="submit" disabled={submitting || uploading} className="w-full h-11">
          {uploading
            ? fa ? 'در حال آپلود ارائه…' : 'Uploading presentation…'
            : submitting
              ? fa ? 'در حال ایجاد کارگاه…' : 'Creating workshop…'
              : fa ? 'ایجاد جلسه زنده' : 'Create Live Session'}
        </Button>
      </form>
    </div>
  );
}
