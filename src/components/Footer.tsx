import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';

export const Footer = () => {
  const { locale, setLocale } = useLanguage();

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'fa' : 'en');
  };

  return (
    <footer className="mt-auto min-h-[5.5rem] border-t border-border/40 bg-background/50 backdrop-blur-[12px]">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-5 text-[11.5px] leading-6">
          {/* حقوق — استاندارد */}
          <p className="font-[IRANSharp] text-muted-foreground text-center sm:text-right tracking-wide" dir="rtl">
            <span className="tabular-nums" dir="ltr">© 2026</span>
            <span className="mx-1.5">کاغذ و باد.</span>
            <span className="mr-1">تمام حقوق محفوظ است.</span>
            <span className="hidden sm:inline text-foreground/25 mx-2">·</span>
            <span className="hidden sm:inline text-muted-foreground/70">All rights reserved.</span>
          </p>

          <div className="flex items-center gap-5 text-muted-foreground">
            <Link
              to="/about-project"
              className="hover:text-foreground transition-colors font-light underline-offset-4 hover:underline"
            >
              {locale === 'fa' ? 'شرح پروژه' : 'Project details'}
            </Link>
            <span className="h-3 w-px bg-border/60 hidden sm:block" aria-hidden />
            <Link
              to="/about"
              className="hover:text-foreground transition-colors font-light underline-offset-4 hover:underline"
            >
              {locale === 'fa' ? 'درباره ما' : 'About'}
            </Link>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors font-light"
              aria-label="Toggle language"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{locale === 'en' ? 'فارسی' : 'English'}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
