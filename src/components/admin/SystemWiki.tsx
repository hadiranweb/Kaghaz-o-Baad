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
                <span><b>Admin:</b> admin@kaghazbaad.test</span>
                <span className="text-muted-foreground">TestAdmin@2026!</span>
              </div>
              <div className="p-2 rounded bg-secondary/30 flex justify-between items-center" dir="ltr">
                <span><b>Editor:</b> editor@kaghazbaad.test</span>
                <span className="text-muted-foreground">TestEditor@2026!</span>
              </div>
              <div className="p-2 rounded bg-secondary/30 flex justify-between items-center" dir="ltr">
                <span><b>Contributor:</b> contributor@kaghazbaad.test</span>
                <span className="text-muted-foreground">TestContributor@2026!</span>
              </div>
              <div className="p-2 rounded bg-secondary/30 flex justify-between items-center" dir="ltr">
                <span><b>User:</b> user@kaghazbaad.test</span>
                <span className="text-muted-foreground">TestUser@2026!</span>
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
      </div>
    </div>
  );
}
