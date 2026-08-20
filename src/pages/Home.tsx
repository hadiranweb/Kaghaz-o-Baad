import { useLanguage } from '@/contexts/LanguageContext';
import { BrainAnimation } from '@/components/BrainAnimation';
import { ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { backendRequest } from '@/lib/backend-api';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { locale } = useLanguage();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (data.suggestions?.length > 0) {
        setSuggestions(data.suggestions);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number };
      if (errorObj?.message?.includes('Rate limit') || errorObj?.status === 429) {
        toast({
          title: locale === 'fa' ? 'محدودیت نرخ درخواست' : 'Rate limit exceeded',
          description: locale === 'fa' ? 'تعداد درخواست‌ها زیاد است؛ لطفاً چند ثانیه صبر کنید' : 'Too many requests; please wait a few seconds',
          variant: 'destructive',
        });
      }
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [locale, toast]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (q: string) => {
    const term = q.trim();
    if (term) {
      setShowDropdown(false);
      navigate(`/read?q=${encodeURIComponent(term)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(activeIndex >= 0 ? suggestions[activeIndex] : query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      {/* Brain Logo */}
      <div className="w-[180px] mb-6">
        <BrainAnimation />
      </div>

      {/* Search Bar with AI suggestions */}
      <div ref={containerRef} className="w-full max-w-[584px] px-4 relative">
        <form onSubmit={handleSubmit}>
          <div className="relative group">
            <div className={`flex items-center w-full h-12 border border-border bg-card transition-shadow ${showDropdown && suggestions.length > 0 ? 'rounded-t-2xl rounded-b-none border-b-0 shadow-elegant' : 'rounded-full hover:shadow-elegant focus-within:shadow-elegant'}`}>
              <Search className={`h-5 w-5 mx-4 shrink-0 transition-colors ${isLoadingSuggestions ? 'text-accent animate-pulse' : 'text-muted-foreground'}`} />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                onKeyDown={handleKeyDown}
                className="flex-1 h-full bg-transparent outline-none text-foreground text-base"
                dir={locale === 'fa' ? 'rtl' : 'ltr'}
                placeholder={locale === 'fa' ? 'جستجو در مقالات...' : 'Search articles...'}
                autoComplete="off"
              />
            </div>
          </div>
        </form>

        {/* AI Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            className="absolute left-4 right-4 bg-card border border-border border-t-0 rounded-b-2xl shadow-elegant overflow-hidden z-50"
            dir={locale === 'fa' ? 'rtl' : 'ltr'}
          >
            {/* AI label */}
            <div className="px-4 py-1.5 border-b border-border/50 flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-accent uppercase tracking-widest">
                {locale === 'fa' ? 'پیشنهاد هوش مصنوعی' : 'AI Suggestions'}
              </span>
            </div>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`w-full text-start flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-accent/10 text-foreground'
                    : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(-1)}
                onClick={() => { setQuery(s); handleSearch(s); }}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="mt-10 w-full max-w-[760px] px-4" aria-labelledby="home-discovery-title">
        <div className="grid gap-3 rounded-3xl border border-border/70 bg-card/50 p-4 shadow-elegant sm:grid-cols-[1.2fr_1fr] sm:p-5" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <div className="rounded-2xl bg-primary/10 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <BookOpen className="h-4 w-4" />
              {locale === 'fa' ? 'اتاق مطالعهٔ کاغذ و باد' : 'KaghazBaad reading room'}
            </div>
            <h2 id="home-discovery-title" className="mt-3 text-xl font-bold">
              {locale === 'fa' ? 'مقاله‌ها را روی قفسه ببینید، نه در یک فهرست بی‌روح.' : 'See articles on a shelf, not in a flat list.'}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {locale === 'fa' ? 'قفسه، شبکه و فهرست برای مرور سریع؛ با مسیر خواندن واقعی هر مقاله.' : 'Shelf, grid and list views for quick review, with a real reading path for every article.'}
            </p>
            <Link to="/read" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              {locale === 'fa' ? 'رفتن به آرشیو مقالات' : 'Open article archive'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-border/70 p-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{locale === 'fa' ? 'نقشهٔ محصول' : 'Product map'}</p>
              <p className="mt-3 text-lg font-bold">{locale === 'fa' ? 'از ایده تا گفت‌وگو، مسیر را دنبال کنید.' : 'Follow the path from idea to discussion.'}</p>
            </div>
            <Link to="/about-project" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              {locale === 'fa' ? 'دیدن شرح پروژه و فهرست مسیر' : 'View project map and TOC'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
