import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Layers3, Search, Sparkles, Video } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { backendRequest } from '@/lib/backend-api';
import { useToast } from '@/hooks/use-toast';
import { BrainAnimation } from '@/components/BrainAnimation';
import { DeferredAmbientParticles } from '@/components/creative/DeferredAmbientParticles';
import { MaskedReveal } from '@/components/creative/MaskedReveal';
import { RevealOnScroll } from '@/components/creative/RevealOnScroll';
import { StaggeredWordReveal } from '@/components/creative/StaggeredWordReveal';
import { StaggerGroup } from '@/components/creative/StaggerGroup';
import { usePointerIntent } from '@/hooks/useCreativeInteraction';

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
  const inputId = 'home-article-search';
  const { point: pointerPoint, onPointerMove, onPointerLeave } = usePointerIntent(true);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const data = await backendRequest<{ ok: true; suggestions: string[] }>(
        `/search/suggestions?q=${encodeURIComponent(q.trim())}&locale=${locale}`,
      );
      setSuggestions(data.suggestions || []);
      setShowDropdown((data.suggestions || []).length > 0);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number };
      if (errorObj?.message?.includes('Rate limit') || errorObj?.status === 429) {
        toast({
          title: isFa ? 'محدودیت درخواست' : 'Rate limit exceeded',
          description: isFa ? 'چند لحظه بعد دوباره تلاش کنید.' : 'Please try again in a moment.',
          variant: 'destructive',
        });
      }
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [isFa, locale, toast]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (value: string) => {
    const term = value.trim();
    if (!term) return;
    setShowDropdown(false);
    navigate(`/read?q=${encodeURIComponent(term)}`);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSearch(activeIndex >= 0 ? suggestions[activeIndex] : query);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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

  const Arrow = isFa ? ArrowLeft : ArrowRight;
  const t = (fa: string, en: string) => isFa ? fa : en;

  return (
    <main dir={isFa ? 'rtl' : 'ltr'} className="min-h-screen bg-background">
      <section className="creative-section kb-hero relative border-b border-border/60">
        <div className="kb-issue-bar container relative z-20 mx-auto flex max-w-6xl items-center justify-between px-4 pt-5 text-[10px] uppercase tracking-[.18em] text-muted-foreground lg:px-8" aria-label={t('اطلاعات شمارهٔ جاری', 'Current issue information')}>
          <span>{t('شمارهٔ ۰۱ · بهار ۱۴۰۵', 'Issue 01 · Spring 2026')}</span>
          <span className="hidden sm:inline">{t('یک بایگانی زنده از ایده‌ها', 'A living archive of ideas')}</span>
        </div>
        <DeferredAmbientParticles count={30} />
        <div className="container relative z-10 mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl text-center lg:text-start">
            <MaskedReveal as="p" className="kb-kicker mb-5 text-xs font-semibold uppercase tracking-[.2em] text-primary">{t('دفترِ بازِ کاغذ و باد', 'The open desk of KaghazBaad')}</MaskedReveal>
            <MaskedReveal delay={80} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/65 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t('نشر آکادمیک دوزبانه', 'Bilingual academic publishing')}
            </MaskedReveal>
            <StaggeredWordReveal
              as="h1"
              className="kb-display-title kb-lcp-critical max-w-3xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"
              text={t('دانش را بنویس، به گفت‌وگو برگردان.', 'Write knowledge. Bring it back to conversation.')}
              disabled
            />
            <MaskedReveal as="p" delay={180} disabled className="kb-lcp-critical mt-6 max-w-2xl text-lg leading-9 text-foreground/75 md:text-xl">
              {t('کاغذ و باد فضایی برای مقاله، نمایش اسلایدی و گفت‌وگوی زنده است؛ جایی که یک ایده می‌تواند خوانده، نقد و ادامه داده شود.', 'KaghazBaad is a space for articles, slide-based reading, and live scholarly dialogue—a place where an idea can be read, questioned, and extended.')}
            </MaskedReveal>
            <StaggerGroup className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start" step={90}>
              <Link to="/read" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t('مشاهدهٔ مقالات', 'Explore articles')} <Arrow className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/about-project" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/65 px-5 py-3 text-sm font-semibold transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t('آشنایی با پروژه', 'About the project')} <Arrow className="h-4 w-4" aria-hidden="true" />
              </Link>
            </StaggerGroup>
            <div ref={containerRef} className="relative mt-10 max-w-xl lg:max-w-2xl">
              <label htmlFor={inputId} className="mb-2 block text-start text-xs font-semibold text-muted-foreground">
                {t('در مقالات جست‌وجو کنید', 'Search the articles')}
              </label>
              <form onSubmit={handleSubmit} role="search" className="relative">
                <div className={`flex h-14 items-center border border-border bg-card/90 shadow-soft transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 ${showDropdown && suggestions.length ? 'rounded-t-2xl rounded-b-none border-b-0' : 'rounded-2xl'}`}>
                  <Search className="mx-4 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    id={inputId}
                    type="search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
                    onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
                    onKeyDown={handleKeyDown}
                    className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/80"
                    dir={isFa ? 'rtl' : 'ltr'}
                    placeholder={t('عنوان، موضوع یا نویسنده...', 'Title, topic, or author...')}
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showDropdown && suggestions.length > 0}
                    aria-controls="article-suggestions"
                    aria-activedescendant={activeIndex >= 0 ? `article-suggestion-${activeIndex}` : undefined}
                    aria-busy={isLoadingSuggestions}
                  />
                  <button type="submit" className="me-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {t('جست‌وجو', 'Search')}
                  </button>
                </div>
                {showDropdown && suggestions.length > 0 && (
                  <div id="article-suggestions" role="listbox" aria-label={t('پیشنهادهای جست‌وجو', 'Search suggestions')} className="absolute inset-x-0 z-20 overflow-hidden rounded-b-2xl border border-border border-t-0 bg-card shadow-elegant">
                    <div className="border-b border-border/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-accent">{t('پیشنهادهای مرتبط', 'Related suggestions')}</div>
                    {suggestions.map((suggestion, index) => (
                      <button key={`${suggestion}-${index}`} id={`article-suggestion-${index}`} type="button" role="option" aria-selected={index === activeIndex} className={`flex w-full items-center gap-3 px-4 py-3 text-start text-sm transition ${index === activeIndex ? 'bg-primary/10 text-foreground' : 'text-foreground/80 hover:bg-accent/10'}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => { setQuery(suggestion); handleSearch(suggestion); }}>
                        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />{suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>
          </div>
          <div className="kb-hero-art relative mx-auto min-h-[28rem] w-full max-w-md rounded-[2rem] border border-primary/20 p-8 shadow-elegant lg:min-h-[34rem] lg:p-10" aria-label={t('کارت روایت کاغذ و باد', 'KaghazBaad story card')} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} style={{ '--pointer-x': pointerPoint.x, '--pointer-y': pointerPoint.y } as React.CSSProperties}>
            <div className="kb-parallax-layer kb-parallax-layer--deep relative mx-auto mb-8 max-w-[16rem]" aria-label={t('نشانهٔ تصویری کاغذ و باد', 'KaghazBaad visual mark')}>
              <BrainAnimation />
            </div>
            <div className="kb-parallax-layer kb-parallax-layer--near relative grid gap-3">
              {[['۰۱', 'بنویس', 'Write', 'متن و چکیدهٔ روشن', 'Clear text and abstract'], ['۰۲', 'بساز', 'Build', 'هر ایده در یک اسلاید', 'One idea per slide'], ['۰۳', 'زنده کن', 'Make it live', 'پرسش، پاسخ و ادامه', 'Questions, answers, and extension']].map(([number, faTitle, enTitle, faBody, enBody]) => (
                <div key={number} className="kb-step-card flex items-center gap-4 rounded-2xl p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">{number}</span>
                  <div><p className="font-semibold">{t(faTitle, enTitle)}</p><p className="mt-1 text-sm text-muted-foreground">{t(faBody, enBody)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <RevealOnScroll className="container mx-auto max-w-6xl px-4 py-16 lg:px-8">
        <div className="kb-editorial-rule mb-8 flex items-center gap-4 text-[10px] uppercase tracking-[.2em] text-muted-foreground"><span>{t('فهرست تجربه‌ها', 'Index of experiences')}</span><span className="h-px flex-1 bg-border/70" /></div>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="kb-section-label">{t('از اینجا شروع کنید', 'Start here')}</p><h2 className="mt-2 text-3xl font-bold md:text-4xl">{t('سه راه برای ورود به کاغذ و باد', 'Three ways into KaghazBaad')}</h2></div>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">{t('مسیر مناسب خود را انتخاب کنید؛ هر تجربه به مسیر بعدی متصل است.', 'Choose your path; each experience connects to the next.')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: BookOpen, title: t('مقالات', 'Articles'), body: t('ایده‌ها را سریع مرور کنید و به متن کامل برسید.', 'Scan ideas quickly and continue to the full text.'), href: '/read', cta: t('مشاهدهٔ مقالات', 'Explore articles') },
            { icon: Layers3, title: t('نمایش اسلایدی', 'Slide reading'), body: t('هر ادعا را صفحه‌به‌صفحه بخوانید و مسیر استدلال را دنبال کنید.', 'Read each claim page by page and follow the argument.'), href: '/read', cta: t('دیدن نمونه', 'View a sample') },
            { icon: Video, title: t('پخش زنده', 'Live dialogue'), body: t('پرسش و پاسخ را کنار مقاله به بخشی از اثر تبدیل کنید.', 'Make questions and answers part of the work.'), href: '/live', cta: t('مشاهدهٔ جلسات', 'View sessions') },
          ].map(({ icon: Icon, title, body, href, cta }) => (
            <Link key={title} to={href} className="kb-skill-card group rounded-3xl p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" /><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">{cta}<Arrow className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </RevealOnScroll>

      <RevealOnScroll className="container mx-auto max-w-6xl px-4 pb-20 lg:px-8">
        <div className="grid gap-8 rounded-[2rem] border border-primary/20 bg-primary/5 p-7 md:grid-cols-[.8fr_1.2fr] md:p-10">
          <div><p className="kb-section-label">{t('ایدهٔ اصلی', 'The idea')}</p><h2 className="mt-3 text-3xl font-bold md:text-4xl">{t('از فایل دفن‌شده تا گفت‌وگوی زنده', 'From buried PDF to living dialogue')}</h2></div>
          <div className="space-y-5 text-sm leading-8 text-muted-foreground"><p>{t('کاغذ و باد انتشار را پایان کار نمی‌داند. مقاله می‌تواند خلاصه شود، به اسلاید تبدیل شود، در یک جلسه به بحث گذاشته شود و با پرسش‌های خوب دوباره کامل‌تر شود.', 'KaghazBaad does not treat publishing as the end. An article can be condensed, turned into slides, discussed live, and extended by good questions.')}</p><Link to="/about-project" className="inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline">{t('روایت کامل پروژه', 'Read the full project story')}<Arrow className="h-4 w-4" aria-hidden="true" /></Link></div>
        </div>
      </RevealOnScroll>
    </main>
  );
}
