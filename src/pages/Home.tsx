import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Loader2, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { backendRequest } from '@/lib/backend-api';
import { useToast } from '@/hooks/use-toast';
import { BrainAnimation } from '@/components/BrainAnimation';

/**
 * The problem field is intentionally a search-only entry point while Studio is disabled.
 * A future Studio conversation may extend this surface only after its own approved flag,
 * contract, consent and review experience are ready; article discovery remains the fallback.
 */
export default function Home() {
  const { locale } = useLanguage();
  const isFa = locale === 'fa';
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = 'home-problem-search';
  const t = (fa: string, en: string) => isFa ? fa : en;

  const fetchSuggestions = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const data = await backendRequest<{ ok: true; suggestions: string[] }>(
        `/search/suggestions?q=${encodeURIComponent(value.trim())}&locale=${locale}`,
      );
      const nextSuggestions = data.suggestions || [];
      setSuggestions(nextSuggestions);
      setShowDropdown(nextSuggestions.length > 0);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number };
      if (errorObj?.message?.includes('Rate limit') || errorObj?.status === 429) {
        toast({
          title: t('محدودیت درخواست', 'Rate limit exceeded'),
          description: t('چند لحظه بعد دوباره تلاش کنید.', 'Please try again in a moment.'),
          variant: 'destructive',
        });
      }
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [locale, toast, isFa]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => void fetchSuggestions(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearch = (value: string) => {
    const term = value.trim();
    if (!term) return;
    setShowDropdown(false);
    // Before Studio activation, every submitted intent resolves only to published article search.
    navigate(`/read?q=${encodeURIComponent(term)}`);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleSearch(activeIndex >= 0 ? suggestions[activeIndex] : query);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setShowDropdown(true);
      setActiveIndex((index) => index < suggestions.length - 1 ? index + 1 : 0);
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => index > 0 ? index - 1 : suggestions.length - 1);
    } else if (event.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  return (
    <main dir={isFa ? 'rtl' : 'ltr'} className="relative grid min-h-[100svh] overflow-hidden bg-background px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.12),transparent_33%),radial-gradient(circle_at_50%_100%,hsl(var(--accent)/0.08),transparent_45%)]" aria-hidden="true" />
      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center self-center text-center" aria-labelledby="problem-search-title">
        <h1 id="problem-search-title" className="sr-only">{t('کاغذ و باد؛ جست‌وجوی مسئله در مقالات', 'KaghazBaad problem search')}</h1>
        <div className="mb-6 w-40 sm:mb-8 sm:w-52" aria-label={t('نشان کاغذ و باد', 'KaghazBaad mark')}>
          <BrainAnimation />
        </div>

        <p className="max-w-xl text-2xl font-semibold leading-[1.7] tracking-tight text-foreground sm:text-3xl">
          {t('امروز می‌خواهید چه مسئله‌ای را حل کنید؟', 'What problem would you like to solve today?')}
        </p>

        <div ref={containerRef} className="relative mt-7 w-full max-w-2xl sm:mt-9">
          <form onSubmit={handleSubmit} role="search" className="relative text-start">
            <label htmlFor={inputId} className="sr-only">{t('مسئله یا پرسش خود را بنویسید', 'Describe your problem or question')}</label>
            <div className={`rounded-[1.35rem] border bg-card/90 p-2 shadow-[0_18px_55px_-28px_hsl(var(--foreground)/0.65)] backdrop-blur transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10 ${showDropdown && suggestions.length ? 'border-primary/40 rounded-b-none' : 'border-border/75'}`}>
              <textarea
                id={inputId}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
                onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
                onKeyDown={handleKeyDown}
                className="min-h-28 w-full resize-none bg-transparent px-3 pb-2 pt-3 text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground/85 sm:min-h-32 sm:px-4 sm:text-lg"
                dir={isFa ? 'rtl' : 'ltr'}
                placeholder={t('مسئله، پرسش یا کلیدواژهٔ خود را بنویسید…', 'Describe a problem, question, or keyword…')}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showDropdown && suggestions.length > 0}
                aria-controls="article-suggestions"
                aria-activedescendant={activeIndex >= 0 ? `article-suggestion-${activeIndex}` : undefined}
                aria-busy={isLoadingSuggestions}
              />
              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <span className="inline-flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
                  {isLoadingSuggestions ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Search className="h-3.5 w-3.5" aria-hidden="true" />}
                  {t('جست‌وجو در مقالات منتشرشده', 'Search published articles')}
                </span>
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t('جست‌وجو در مقالات', 'Search articles')}
                  title={t('جست‌وجو در مقالات', 'Search articles')}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {showDropdown && suggestions.length > 0 && (
              <div id="article-suggestions" role="listbox" aria-label={t('مقاله‌های مرتبط', 'Related articles')} className="absolute inset-x-0 z-20 overflow-hidden rounded-b-[1.35rem] border border-t-0 border-primary/40 bg-card/95 p-2 shadow-[0_22px_55px_-30px_hsl(var(--foreground)/0.65)] backdrop-blur">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    id={`article-suggestion-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm transition ${index === activeIndex ? 'bg-primary/10 text-foreground' : 'text-foreground/80 hover:bg-accent/10'}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => { setQuery(suggestion); handleSearch(suggestion); }}
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
