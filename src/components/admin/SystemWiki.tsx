import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Shield, Zap, FileText, ExternalLink, KeyRound, CheckCircle2, HelpCircle, HardDrive, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SystemWiki() {
  const { locale } = useLanguage();
  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">
              {t('ویکی و راهنمای جامع پلتفرم «کاغذ و باد»', 'KaghazBaad System Wiki & Etiquette')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                'مرجع سریع مفاهیم، ماتریس دسترسی نقش‌ها (RBAC)، آداب انتشار و تاب‌آوری سامانه',
                'Quick reference for platform concepts, RBAC matrix, publishing etiquette, and resilience'
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to="/about-project">
            <ExternalLink className="h-4 w-4" />
            <span>{t('مشاهده شرح کامل پروژه', 'Full Project Description')}</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* کارت ۱: شناسنامه و فلسفه */}
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-[IRANSharp]">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>{t('۱. فلسفه‌ی «کاغذ و باد» (Paper & Wind)', '1. Philosophy of Paper & Wind')}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {t('استعاره‌ی داده‌ی ماندگار در برابر گفت‌وگوی زنده', 'Durable data vs. living discussion')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-6 text-muted-foreground">
            <p>
              {t(
                '«کاغذ» نماد داده‌ی ضبط‌شده و ماندگار است: مقاله، اسلایدها و مراجع. «باد» نماد محیط جاری فهم است: کارگاه زنده، پرسش بی‌درنگ و اصلاح جمعی. هر اثر در این پلتفرم از چرخه‌ی «نگارش → داوری → انتشار اسلایدی → جلسه زنده» عبور می‌کند.',
                '“Paper” symbolizes durable data: articles, slides, references. “Wind” symbolizes living understanding: live workshops, immediate Q&A. Works flow through “Write → Review → Slide Publication → Live Discussion”.'
              )}
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
              <Badge variant="secondary">{t('دوزبانگی واقعی (FA/EN)', 'True Bilinguality (FA/EN)')}</Badge>
              <Badge variant="secondary">{t('اسلاید ۶۰ ثانیه‌ای', '60-sec Slide Deck')}</Badge>
              <Badge variant="secondary">{t('اتاق پرسش زنده', 'Live Q&A Room')}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* کارت ۲: ماتریس نقش‌ها و حساب‌های تستی */}
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-[IRANSharp]">
              <Shield className="h-4 w-4 text-accent" />
              <span>{t('۲. ماتریس دسترسی ۴ نقش رسمی (RBAC Matrix)', '2. RBAC Matrix & Test Accounts')}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {t('تفکیک سطوح معماری و حساب‌های تستی فعال', 'Tenant delivery surfaces and active test accounts')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="p-2 rounded bg-secondary/30 flex justify-between items-center" dir="ltr">
                <span><b>{t('مدیر (Admin):', 'Admin:')}</b> admin@kaghazbaad.test</span>
                <span className="text-muted-foreground">{t('رمز مخفی است', 'Password hidden') }</span>
              </div>
              <div className="p-2 rounded bg-secondary/30 flex justify-between items-center" dir="ltr">
                <span><b>{t('ویرایشگر (Editor):', 'Editor:')}</b> editor@kaghazbaad.test</span>
                <span className="text-muted-foreground">{t('رمز مخفی است', 'Password hidden') }</span>
              </div>
              <div className="p-2 rounded bg-secondary/30 flex justify-between items-center" dir="ltr">
                <span><b>{t('نویسنده (Contributor):', 'Contributor:')}</b> contributor@kaghazbaad.test</span>
                <span className="text-muted-foreground">{t('رمز مخفی است', 'Password hidden') }</span>
              </div>
              <div className="p-2 rounded bg-secondary/30 flex justify-between items-center" dir="ltr">
                <span><b>{t('کاربر (User):', 'User:')}</b> user@kaghazbaad.test</span>
                <span className="text-muted-foreground">{t('رمز مخفی است', 'Password hidden') }</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              {t(
                'در صورت عدم وجود دیتابیس ابری، سیستم ورود به صورت آفلاین پیش‌نمایش (Sandbox Auth) برای این حساب‌ها فعال است.',
                'Offline Sandbox Auth fallback is active for these accounts in preview environments.'
              )}
            </p>
          </CardContent>
        </Card>

        {/* کارت ۳: راهنمای ابزارهای تالیف و درایو شخصی */}
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-[IRANSharp]">
              <FileText className="h-4 w-4 text-emerald-500" />
              <span>{t('۳. راهنمای تالیف و درایو شخصی ۱۵ گیگابایتی', '3. Authoring Guide & 15GB Drive')}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {t('چگونه مقالاتی استاندارد و چندرسانه‌ای بسازیم', 'How to build standard slide articles and media')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-6 text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>
                {t(
                  'هر مقاله ابتدا در وضعیت «پیش‌نویس» است و فقط نویسنده، ویراستار و مدیر آن را می‌بینند.',
                  'Articles begin as “Drafts” visible only to author, editor, and admin.'
                )}
              </li>
              <li>
                {t(
                  'اسلاید خوب، یک فکر کامل است. هر اسلاید می‌تواند تصویر، صوت یا ویدیو پیوست داشته باشد.',
                  'A good slide is one complete thought. Can attach image, audio, or video.'
                )}
              </li>
              <li>
                {t(
                  'درایو شخصی ۱۵ گیگابایتی، فضای ابری هر کاربر است. فایل‌ها خصوصی، اشتراکی (با ایمیل) یا عمومی می‌شوند.',
                  '15GB Drive is personal cloud storage. Files can be private, shared via email, or public.'
                )}
              </li>
            </ul>
            <div className="flex gap-2 pt-2 border-t border-border/40">
              <Button size="sm" variant="outline" asChild className="text-xs h-7">
                <Link to="/media">
                  <HardDrive className="h-3.5 w-3.5 me-1" />
                  {t('درایو ۱۵ گیگابایتی', '15GB Media Drive')}
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="text-xs h-7">
                <Link to="/live">
                  <Video className="h-3.5 w-3.5 me-1" />
                  {t('جلسات زنده', 'Live Sessions')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* کارت ۴: مدارشکن و تاب‌آوری سامانه */}
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-[IRANSharp]">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>{t('۴. تاب‌آوری و مدارشکن‌ها (Circuit Breakers)', '4. System Resilience & Breakers')}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {t('محافظت خودکار سیستم در برابر خرابی وابستگی‌های خارجی', 'Automated resilience for external dependencies')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-6 text-muted-foreground">
            <p>
              {t(
                'بر اساس اصول Algomaster، تمام فراخوانی‌های هوش مصنوعی (Gemini) و پیامک (SMS.ir) دارای مدارشکن هستند. اگر سرویسی دچار قطعی متوالی شود، وضعیت به OPEN تغییر کرده و سیستم با تنزّل ظریف (Graceful Degradation) کار می‌کند.',
                'Per Algomaster rules, all AI (Gemini) and SMS (SMS.ir) calls use Circuit Breakers. If a service drops, state trips OPEN and degrades gracefully.'
              )}
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">CLOSED: {t('عادی', 'Normal')}</Badge>
              <Badge variant="outline" className="text-amber-500 border-amber-500/30">HALF_OPEN: {t('تست', 'Trial')}</Badge>
              <Badge variant="outline" className="text-red-500 border-red-500/30">OPEN: {t('قطع سریع', 'Tripped')}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* کارت ۵: معماری پخش زنده */}
        <Card className="glass-surface md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-[IRANSharp]">
              <Video className="h-4 w-4 text-red-500" />
              <span>{t('۵. معماری پخش زنده: سرعت ← امنیت ← کیفیت', '5. Live Architecture: Speed ← Security ← Quality')}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {t('اجماع پس از بررسی پروتکل‌ها: LiveKit SFU + Dynacast + E2EE + ارائهٔ همگام بومی', 'Consensus after protocol review: LiveKit SFU + Dynacast + E2EE + native synced presentation')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-6 text-muted-foreground">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  {t('سرعت و بهینگی', 'Speed')}
                </div>
                <p>
                  {t(
                    'SFU: هر فرستنده فقط یک استریم به سرور می‌فرستد و سرور به همه توزیع می‌کند. Dynacast فقط لایه‌های ویدیوییِ موردنیاز هر بیننده را ارسال می‌کند و AdaptiveStream ویدیوی پنهان را خودکار می‌بندد. بینندگان در حالت اسلاید/ارائه می‌توانند ویدیو را کامل خاموش کنند.',
                    'SFU: one upstream per publisher, server fan-out. Dynacast sends only needed layers; AdaptiveStream pauses hidden video. Viewers can fully disable video in slide/presentation mode.'
                  )}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  {t('امنیت و رمزنگاری', 'Security')}
                </div>
                <p>
                  {t(
                    'E2EE واقعی با ExternalE2EEKeyProvider + Insertable Streams: فریم‌ها و کانال داده پیش از خروج از مرورگر رمز می‌شوند. کلید (عبارت عبور) در مرورگر میزبان ساخته می‌شود و هرگز روی سرور ذخیره نمی‌شود؛ شرکت‌کنندگان آن را از راهِ امن می‌گیرند. بدون E2EE، اتصال همچنان DTLS/SRTP است.',
                    'Real E2EE via ExternalE2EEKeyProvider + Insertable Streams: frames & data are encrypted pre-egress. The passphrase is generated in the host browser, never stored server-side; participants get it out-of-band. Without E2EE, transport stays DTLS/SRTP.'
                  )}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  {t('کیفیت ارائه', 'Presentation quality')}
                </div>
                <p>
                  {t(
                    'دو حالت: (۱) عرشه اسلاید مقاله — رندر بومی Markdown؛ (۲) فایل ارائهٔ آپلودشده (PDF با pdf.js صفحه‌به‌صفحه و با DPI بالا رندر می‌شود؛ تصویر مستقیم؛ PPTX دانلود). همگام‌سازی از کانال دادهٔ درون‌اتاقی LiveKit است نه ویدیوی اشتراک‌صفحه.',
                    'Two modes: (1) article slide deck — native Markdown; (2) uploaded presentation (PDF rendered page-by-page at high DPI via pdf.js; images direct; PPTX downloadable). Sync rides the in-room LiveKit data channel, not screen-share video.'
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-border/40 font-mono text-[11px] space-y-1" dir="ltr">
              <div className="font-sans font-medium text-foreground">
                {t('راه‌اندازی سرور زنده (یک‌بار):', 'LiveKit setup (one-time):')}
              </div>
              <div>supabase secrets set LIVEKIT_URL=wss://… LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=…</div>
              <div>supabase functions deploy livekit-token</div>
              <div>supabase db push</div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">SFU (no MCU)</Badge>
              <Badge variant="outline">Dynacast</Badge>
              <Badge variant="outline">AdaptiveStream</Badge>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">E2EE: Insertable Streams</Badge>
              <Badge variant="outline">DataChannel: kb-slide / kb-chat / kb-ctrl</Badge>
              <Badge variant="outline">PDF: pdf.js native render</Badge>
              <Badge variant="outline">Waiting room</Badge>
              <Badge variant="outline">Invite link + key sharing</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
