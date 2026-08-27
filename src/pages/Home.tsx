import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUp, BookOpen, Layers3, Loader2, Search, Video } from 'lucide-react';
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
    <main dir={isFa ? 'rtl' : 'ltr'} className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[100svh] bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.12),transparent_33%),radial-gradient(circle_at_50%_100%,hsl(var(--accent)/0.08),transparent_45%)]" aria-hidden="true" />
      <section className="relative z-10 grid min-h-[100svh] px-5 py-10 sm:px-8" aria-labelledby="problem-search-title">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center self-center text-center">
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
        </div>
      </section>
      <HomeSeoContent isFa={isFa} />
    </main>
  );
}

function HomeSeoContent({ isFa }: { isFa: boolean }) {
  const t = (fa: string, en: string) => isFa ? fa : en;
  const Arrow = isFa ? ArrowLeft : ArrowRight;
  const journeys = [
    {
      icon: BookOpen,
      href: '/read',
      title: t('مقالات پژوهشی دوزبانه', 'Bilingual research articles'),
      body: t('مقاله‌های منتشرشده را با عنوان، موضوع یا پرسش خود جست‌وجو کنید و به متن کامل هر اثر برسید.', 'Search published articles by title, topic, or question, then continue to each work in full.'),
      cta: t('مرور مقالات منتشرشده', 'Explore published articles'),
    },
    {
      icon: Layers3,
      href: '/media',
      title: t('رسانه و نمایش اسلایدی', 'Media and slide reading'),
      body: t('رسانه‌ها و ارائه‌های مرتبط با آثار را در کنار متن پژوهش ببینید تا مسیر استدلال هر ایده روشن‌تر شود.', 'See media and presentations connected to works alongside their research text, making each argument easier to follow.'),
      cta: t('دیدن رسانه‌ها و ارائه‌ها', 'View media and presentations'),
    },
    {
      icon: Video,
      href: '/live',
      title: t('گفت‌وگوی زنده پیرامون اثر', 'Live discussion around a work'),
      body: t('جلسه‌های زنده، امکان طرح پرسش و ادامه‌دادن گفت‌وگو پس از انتشار یک مقاله را فراهم می‌کنند.', 'Live sessions make space for questions and for continuing the discussion after an article is published.'),
      cta: t('مشاهدهٔ جلسه‌های زنده', 'View live sessions'),
    },
  ];

  return (
    <section className="relative z-10 border-t border-border/60 bg-background/85 py-16 sm:py-20" aria-labelledby="home-discovery-title">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-primary">{t('برای مطالعه و گفت‌وگو', 'For reading and dialogue')}</p>
          <h2 id="home-discovery-title" className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t('کاغذ و باد؛ جایی برای دنبال‌کردن یک ایده', 'KaghazBaad: a place to follow an idea')}
          </h2>
          <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
            {t('کاغذ و باد یک بستر دوزبانه برای انتشار آکادمیک است که مقاله، ارائه و گفت‌وگوی زنده را به هم پیوند می‌دهد. هدف این است که یک ایده پس از انتشار نیز خوانده، پرسیده و تکمیل شود.', 'KaghazBaad is a bilingual academic publishing platform that connects articles, presentations, and live dialogue. Its purpose is to let an idea keep being read, questioned, and developed after publication.')}
          </p>
        </header>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {journeys.map(({ icon: Icon, href, title, body, cta }) => (
            <article key={href} className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-sm">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
              <p className="mt-3 min-h-24 text-sm leading-7 text-muted-foreground">{body}</p>
              <Link to={href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {cta}<Arrow className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-12 grid gap-6 rounded-[2rem] border border-primary/20 bg-primary/[0.045] p-7 md:grid-cols-[0.8fr_1.2fr] md:items-start md:p-10" aria-labelledby="home-approach-title">
          <div>
            <p className="text-sm font-medium text-primary">{t('رویکرد پلتفرم', 'Platform approach')}</p>
            <h2 id="home-approach-title" className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t('از انتشار مقاله تا گفت‌وگوی ادامه‌دار', 'From published work to continuing dialogue')}
            </h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-muted-foreground">
            <p>{t('هر اثر منتشرشده می‌تواند با متن کامل، ارائهٔ مرتبط و گفت‌وگوی زنده دنبال شود. این مسیر به خواننده کمک می‌کند مسئله را در زمینهٔ خود ببیند و به نویسنده فرصت می‌دهد پرسش‌ها و بازخوردها را در گفت‌وگویی روشن پیگیری کند.', 'Each published work can be followed through its full text, related presentation, and live conversation. This path helps readers see a question in context and gives authors a clear way to continue with questions and feedback.')}</p>
            <p>{t('برای آشنایی با هدف، دامنه و شیوهٔ کار کاغذ و باد، شرح پروژه را بخوانید. دربارهٔ تیم و راه‌های ارتباط نیز در صفحات جداگانه توضیح داده شده است.', 'Read the project details to learn about KaghazBaad’s purpose, scope, and way of working. The team and contact routes are described on their own pages.')}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              <Link to="/about-project" className="inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t('شرح پروژهٔ کاغذ و باد', 'KaghazBaad project details')}<Arrow className="h-4 w-4" aria-hidden="true" /></Link>
              <Link to="/about" className="inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t('دربارهٔ کاغذ و باد', 'About KaghazBaad')}<Arrow className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
