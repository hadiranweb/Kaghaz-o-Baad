import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Calendar, Loader2, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export default function Read() {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const { data: articlesData, isLoading, error } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      
      if (error) throw error;

      // Load author profiles
      const authorIds = [...new Set(data?.map(a => a.author_id).filter(Boolean))];
      let authors: Record<string, any> = {};
      
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('public_profiles')
          .select('id, first_name, last_name, bio_en, bio_fa')
          .in('id', authorIds);
        
        if (profilesData) {
          profilesData.forEach(profile => {
            authors[profile.id] = profile;
          });
        }
      }
      
      return { articles: data, authors };
    },
  });

  const allArticles = articlesData?.articles ?? [];
  const authors = articlesData?.authors || {};

  // Client-side filter based on search query
  const articles = useMemo(() => {
    if (!searchQuery.trim()) return allArticles;
    const q = searchQuery.toLowerCase();
    return allArticles.filter(a =>
      a.title_fa?.toLowerCase().includes(q) ||
      a.title_en?.toLowerCase().includes(q) ||
      a.summary_fa?.toLowerCase().includes(q) ||
      a.summary_en?.toLowerCase().includes(q) ||
      a.tags?.some(tag => tag.toLowerCase().includes(q)) ||
      a.categories?.some(cat => cat.toLowerCase().includes(q))
    );
  }, [allArticles, searchQuery]);

  const clearSearch = () => setSearchParams({});

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('nav.read')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            {locale === 'fa' 
              ? 'مجموعه مقالات آکادمیک به صورت دوزبانه - تجربه مطالعه منحصر به فرد با نمایش اسلایدی'
              : 'Collection of bilingual academic articles - unique reading experience with slide presentation'}
          </p>

          {/* Search query indicator */}
          {searchQuery && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-surface text-sm">
                <Search className="h-3.5 w-3.5 text-accent" />
                <span className="text-foreground/80" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                  {locale === 'fa' ? `نتایج برای: "${searchQuery}"` : `Results for: "${searchQuery}"`}
                </span>
                <button onClick={clearSearch} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                {locale === 'fa' ? `${articles.length} مقاله` : `${articles.length} articles`}
              </span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 text-muted-foreground">
            {locale === 'fa' ? 'خطا در بارگذاری مقالات' : 'Error loading articles'}
          </div>
        )}

        {/* Articles Grid */}
        {articles && articles.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => {
              const isUserArticle = user && article.author_id === user.id;
              return (
              <Card 
                key={article.id} 
                className={`group glass-surface hover:shadow-elegant transition-all duration-300 overflow-hidden ${
                  isUserArticle ? 'ring-1 ring-accent/30' : ''
                }`}
              >
                <div className={`h-48 bg-gradient-to-br relative overflow-hidden ${
                  isUserArticle 
                    ? 'from-accent/15 via-secondary to-card' 
                    : 'from-secondary via-card to-background'
                }`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-primary/20 group-hover:scale-110 transition-transform" />
                  </div>
                  {isUserArticle && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="bg-accent text-accent-foreground">
                        {locale === 'fa' ? 'مقاله شما' : 'Your Article'}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <CardHeader>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {article.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <CardTitle className="text-xl group-hover:text-primary transition-colors" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                    {locale === 'fa' ? article.title_fa : article.title_en}
                  </CardTitle>
                  
                  <CardDescription className="line-clamp-3" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                    {locale === 'fa' ? article.summary_fa : article.summary_en}
                  </CardDescription>
                  
                  {article.author_id && authors[article.author_id] && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-muted-foreground" dir="ltr">
                        {locale === 'fa' ? 'نویسنده: ' : 'Author: '}
                        {authors[article.author_id].first_name} {authors[article.author_id].last_name}
                      </p>
                      {(locale === 'fa' ? authors[article.author_id].bio_fa : authors[article.author_id].bio_en) && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                          {locale === 'fa' ? authors[article.author_id].bio_fa : authors[article.author_id].bio_en}
                        </p>
                      )}
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(article.published_at).toLocaleDateString(locale)}</span>
                    </div>
                  </div>
                  
                  <Button variant="ghost-ios" asChild className="w-full">
                    <Link to={`/read/${article.slug}`}>
                      {locale === 'fa' ? 'مطالعه مقاله' : 'Read Article'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}

        {/* Empty State */}
        {articles && articles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery
              ? (locale === 'fa' ? `نتیجه‌ای برای "${searchQuery}" پیدا نشد` : `No results found for "${searchQuery}"`)
              : (locale === 'fa' ? 'هنوز مقاله‌ای منتشر نشده است' : 'No articles published yet')
            }
          </div>
        )}
      </div>
    </div>
  );
}