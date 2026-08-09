import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'fa';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  locale: Locale;
  direction: Direction;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
  translations: Record<string, string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const FALLBACK_TRANSLATIONS: Record<string, string> = {
  'nav.home': 'Home',
  'nav.read': 'Read',
  'nav.media': 'Media',
  'nav.us': 'About Us',
  'hero.title': 'Academic Works and Media',
  'hero.subtitle': 'Paper symbolizes data; Wind symbolizes the living environment',
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale');
    return (stored === 'en' || stored === 'fa') ? stored : 'fa';
  });
  
  const [translations, setTranslations] = useState<Record<string, string>>(FALLBACK_TRANSLATIONS);
  const direction: Direction = locale === 'fa' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: string): string => {
    return translations[key] || FALLBACK_TRANSLATIONS[key] || key;
  };

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