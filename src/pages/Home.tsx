import { useLanguage } from '@/contexts/LanguageContext';
import { BrainAnimation } from '@/components/BrainAnimation';
import { Search } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase.functions.invoke('search-suggest', {
        body: { query: q.trim(), locale },
      });
      if (error) throw error;
      if (data?.suggestions?.length > 0) {
        setSuggestions(data.suggestions);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (err: any) {
      if (err?.message?.includes('Rate limit') || err?.status === 429) {
        toast({ title: locale === 'fa' ? 'محدودیت درخواست' : 'Rate limit', description: locale === 'fa' ? 'لطفاً کمی صبر کنید' : 'Please wait a moment', variant: 'destructive' });
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
    </div>
  );
}
