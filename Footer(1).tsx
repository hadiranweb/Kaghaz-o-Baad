import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';

export const Footer = () => {
  const { locale, setLocale } = useLanguage();

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'fa' : 'en');
  };

  return (
    <footer className="mt-auto py-3">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {locale === 'fa' ? 'کاغذ و باد' : 'Kaghaz-o-Baad'}. {locale === 'fa' ? 'تمام حقوق محفوظ است.' : 'All rights reserved.'}</p>

          <div className="flex items-center gap-4">
            <Link
              to="/about-project"
              className="hover:text-foreground transition-colors font-light"
            >
              {locale === 'fa' ? 'شرح پروژه' : 'Project'}
            </Link>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors font-light"
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
