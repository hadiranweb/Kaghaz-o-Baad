import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Calendar, Loader2, Search, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useState } from 'react';

interface AuthorProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio_en?: string;
  bio_fa?: string;
  show_on_cards?: boolean;
  show_in_community?: boolean;
}

interface ArticleItem {
  id: string;
  title_en: string;
  title_fa: string;
  slug: string;
  summary_en?: string;
  summary_fa?: string;
  cover_url?: string;
  tags?: string[];
  categories?: string[];
  author_id?: string;
  published_at: string;
  created_at: string;
}

export default function Read() {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('paginate_published_articles', {
        p_cursor_time: null,
        p_cursor_id: null,
        p_limit: 9,
        p_query: searchQuery.trim() || null,
      });
      if (error) throw error;

      const rows = (data as ArticleItem[]) || [];
      const more = rows.length > 9;
      const pageItems = more ? rows.slice(0, 9) : rows;

      setHasMore(more);
      setArticles(pageItems);

      const authorIds = [...new Set(pageItems.map((a) => a.author_id).filter(Boolean))] as string[];
      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from('public_profiles')
          .select('id, first_name, last_name, display_name, avatar_url, bio_en, bio_fa, show_on_cards, show_in_community')
          .in('id', authorIds);

        if (profs) {
          const newAuthors: Record<string, AuthorProfile> = {};
          profs.forEach((p) => {
            newAuthors[p.id] = p as AuthorProfile;
          });
          setAuthors(newAuthors);
        }
      }
    } catch (err) {
      console.error('Error loading articles:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const handleLoadMore = async () => {
    if (articles.length === 0 || loadingMore) return;
    const last = articles[articles.length - 1];
    setLoadingMore(true);

    try {
      const { data, error } = await supabase.rpc('paginate_published_articles', {
        p_cursor_time: last.published_at || last.created_at,
        p_cursor_id: last.id,
        p_limit: 9,
        p_query: searchQuery.trim() || null,
      });
      if (error) throw error;

      const rows = (data as ArticleItem[]) || [];
      const more = rows.length > 9;
      const pageItems = more ? rows.slice(0, 9) : rows;

      setHasMore(more);
      setArticles((prev) => [...prev, ...pageItems]);

      const authorIds = [...new Set(pageItems.map((a) => a.author_id).filter(Boolean))] as string[];
      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from('public_profiles')
          .select('id, first_name, last_name, display_name, avatar_url, bio_en, bio_fa, show_on_cards, show_in_community')
          .in('id', authorIds);

        if (profs) {
          setAuthors((prev) => {
            const updated = { ...prev };
            profs.forEach((p) => {
              updated[p.id] = p as AuthorProfile;
            });
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Error loading more articles:', err);
    } finally {
      setLoadingMore(false);
    }
  };

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
              ? 'مجموعه مقالات آکادمیک به صورت دوزبانه - تجربه مطالعه منحصر به فرد با نمایش اسلایدی (صفحه‌بندی مکان‌نما)'
              : 'Collection of bilingual academic articles - unique reading experience with slide presentation (Keyset Pagination)'}
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
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Articles Grid */}
        {!loading && articles && articles.length > 0 && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => {
                const isUserArticle = user && article.author_id === user.id;
                const authProfile = article.author_id ? authors[article.author_id] : undefined;
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
                      
                      {authProfile && authProfile.show_on_cards && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/40 p-2.5">
                          <Avatar className="h-9 w-9 border border-border/50">
                            <AvatarImage src={authProfile.avatar_url || undefined} alt={authProfile.display_name || `${authProfile.first_name || ''} ${authProfile.last_name || ''}`} />
                            <AvatarFallback className="text-xs">{(authProfile.display_name || authProfile.first_name || '?').slice(0,2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{authProfile.display_name || `${authProfile.first_name || ''} ${authProfile.last_name || ''}`}</span>
                            {(locale === 'fa' ? authProfile.bio_fa : authProfile.bio_en) && (
                              <span className="text-xs text-muted-foreground/80 truncate max-w-[18ch]">{locale === 'fa' ? authProfile.bio_fa : authProfile.bio_en}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(article.published_at || article.created_at).toLocaleDateString(locale)}</span>
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

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {locale === 'fa' ? 'در حال بارگذاری...' : 'Loading more...'}
                    </>
                  ) : (
                    locale === 'fa' ? 'بارگذاری مقالات بیشتر' : 'Load More Articles'
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && articles && articles.length === 0 && (
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
