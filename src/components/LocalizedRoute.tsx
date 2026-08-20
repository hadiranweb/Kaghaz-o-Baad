import { ReactNode, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Locale = 'fa' | 'en';

export function LocalizedRoute({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { locale: currentLocale, setLocale } = useLanguage();

  useEffect(() => {
    if (currentLocale !== locale) setLocale(locale);
  }, [currentLocale, locale, setLocale]);

  return <>{children}</>;
}
