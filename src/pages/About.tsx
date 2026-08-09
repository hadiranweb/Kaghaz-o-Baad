import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function About() {
  const { locale, t } = useLanguage();

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('nav.us')}
            </h1>
          </div>

          {/* About Section */}
          <Card className="mb-12 glass-surface">
            <CardHeader>
              <CardTitle className="text-2xl">
                {locale === 'fa' ? 'درباره کاغذ و باد' : 'About KaghazBaad'}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
              {locale === 'fa' ? (
                <>
                  <p className="text-lg">
                    <strong>کاغذ</strong> نماد داده است؛ <strong>باد</strong> نماد محیط زنده‌ای که این داده‌ها را حمل می‌کند.
                  </p>
                  <p>
                    این پلتفرم میزبان یک جامعه متمرکز و آثار آکادمیک محدود به زمان در حوزه تخصصی صاحب اثر است.
                    هدف ما ایجاد فضایی است برای به اشتراک‌گذاری دانش علمی به صورت دوزبانه و با تجربه کاربری منحصر به فرد.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg">
                    <strong>Paper</strong> symbolizes data; <strong>Wind</strong> symbolizes the living environment that carries those data.
                  </p>
                  <p>
                    This platform hosts a focused community and time-bound academic work in the owner's field of expertise.
                    Our goal is to create a space for sharing scholarly knowledge bilingually with a unique user experience.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Team Section */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8 text-center">
              {locale === 'fa' ? 'تیم ما' : 'Our Team'}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass-surface">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="bg-accent text-accent-foreground text-xl">
                        KO
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {locale === 'fa' ? 'بنیان‌گذار' : 'Founder'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {locale === 'fa' ? 'صاحب پلتفرم' : 'Platform Owner'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                    {locale === 'fa' 
                      ? 'متخصص و پژوهشگر در حوزه روانشناسی و علوم شناختی'
                      : 'Expert and researcher in psychology and cognitive sciences'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}