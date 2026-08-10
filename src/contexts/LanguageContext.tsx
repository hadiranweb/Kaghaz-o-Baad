import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Locale = 'en' | 'fa';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  locale: Locale;
  direction: Direction;
  t: (keyOrFa: string, enFallback?: string) => string;
  setLocale: (locale: Locale) => void;
  translations: Record<string, string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const FA_TRANSLATIONS: Record<string, string> = {
  'nav.home': 'خانه',
  'nav.read': 'مقالات',
  'nav.media': 'چندرسانه‌ای',
  'nav.us': 'درباره ما',
  'nav.project': 'شرح پروژه',
  'nav.community': 'جامعه',
  'nav.live': 'پخش زنده',
  'hero.title': 'آثار و رسانه‌های آکادمیک',
  'hero.subtitle': 'کاغذ نماد داده؛ باد نماد محیط زنده',
  'article.read_more': 'مطالعه مقاله',
  'auth.login': 'ورود',
  'auth.phone': 'شماره تلفن',
  'auth.first_name': 'نام',
  'auth.last_name': 'نام خانوادگی',
};

const EN_TRANSLATIONS: Record<string, string> = {
  'nav.home': 'Home',
  'nav.read': 'Read',
  'nav.media': 'Media',
  'nav.us': 'About Us',
  'nav.project': 'Project',
  'nav.community': 'Community',
  'nav.live': 'Live',
  'hero.title': 'Academic Works and Media',
  'hero.subtitle': 'Paper symbolizes data; Wind symbolizes the living environment',
  'article.read_more': 'Read Article',
  'auth.login': 'Login',
  'auth.phone': 'Phone Number',
  'auth.first_name': 'First Name',
  'auth.last_name': 'Last Name',
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale');
    return stored === 'en' || stored === 'fa' ? stored : 'fa';
  });

  const [dbTranslations, setDbTranslations] = useState<Record<string, { en: string; fa: string }>>({});
  const direction: Direction = locale === 'fa' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  useEffect(() => {
    let active = true;
    async function loadDbTranslations() {
      try {
        const { data, error } = await supabase.from('translations').select('key, en, fa');
        if (!error && data && active) {
          const map: Record<string, { en: string; fa: string }> = {};
          data.forEach((r) => {
            map[r.key] = { en: r.en, fa: r.fa };
          });
          setDbTranslations(map);
        }
      } catch {}
    }
    loadDbTranslations();
    return () => {
      active = false;
    };
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (keyOrFa: string, enFallback?: string): string => {
    if (keyOrFa in dbTranslations) {
      const val = locale === 'fa' ? dbTranslations[keyOrFa].fa : dbTranslations[keyOrFa].en;
      if (val) return val;
    }
    if (keyOrFa in FA_TRANSLATIONS || keyOrFa in EN_TRANSLATIONS) {
      return locale === 'fa'
        ? FA_TRANSLATIONS[keyOrFa] || EN_TRANSLATIONS[keyOrFa]
        : EN_TRANSLATIONS[keyOrFa] || FA_TRANSLATIONS[keyOrFa];
    }

    if (enFallback !== undefined) {
      return locale === 'fa' ? keyOrFa : enFallback;
    }

    return keyOrFa;
  };

  const translations: Record<string, string> = {};
  const activeDict = locale === 'fa' ? FA_TRANSLATIONS : EN_TRANSLATIONS;
  Object.keys(activeDict).forEach((k) => {
    translations[k] = t(k);
  });

  return (
    <LanguageContext.Provider value={{ locale, direction, t, setLocale, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
