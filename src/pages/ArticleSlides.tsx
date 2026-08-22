import { useEffect, useCallback, useReducer, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPublicArticleBySlug, listArticleSlides, listPublicProfiles } from '@/lib/backend-api';
import ArticleComments from '@/components/ArticleComments';
import MDEditor from '@uiw/react-md-editor';
import { setNoIndexMetadata, setSeoMetadata } from '@/lib/seo';
import { normalizeSlides, localizedSlideBody, localizedSlideTitle, localizedArticleTitle, localizedArticleSummary } from '@/lib/article-reader';
import { createReaderState, readerReducer } from '@/lib/reader-state';
import { useReducedMotion } from '@/hooks/useCreativeInteraction';

export default function ArticleSlides() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { locale, direction } = useLanguage();
  const [readerState, dispatchReader] = useReducer(readerReducer, undefined, createReaderState);
  const currentSlide = readerState.index;
  const reducedMotion = useReducedMotion();
  const curlRef = useRef<{ startX: number; startY: number; pointerId: number; width: number } | null>(null);
  const suppressClickRef = useRef(false);

  const { data: articleData, isLoading, error } = useQuery({
    queryKey: ['article-slides', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      
      const { article } = await getPublicArticleBySlug(slug);
      const { slides: backendSlides } = await listArticleSlides(article.id);
      let author = null;
      if (article.author_id) {
        const { profiles } = await listPublicProfiles([article.author_id]);
        const profile = profiles[0];
        if (profile) {
          const metadata = profile.metadata || {};
          author = {
            first_name: profile.first_name,
            last_name: profile.last_name,
            bio_en: typeof metadata.bio_en === 'string' ? metadata.bio_en : '',
            bio_fa: typeof metadata.bio_fa === 'string' ? metadata.bio_fa : profile.bio || '',
          };
        }
      }
      return {
        id: article.id,
        slug: article.slug,
        title_en: article.title_en,
        summary_en: article.summary_en,
        summary_fa: article.summary_fa,
        cover_url: article.cover_url,
        published_at: article.published_at,
        updated_at: article.updated_at,
        title_fa: article.title_fa,
        slides: normalizeSlides(backendSlides),
        author,
      };
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (!articleData) {
      dispatchReader({ type: 'DATA_LOADING' });
      return;
    }
    dispatchReader({ type: articleData.slides.length ? 'DATA_READY' : 'DATA_EMPTY', count: articleData.slides.length });
  }, [articleData]);

  const goToNextSlide = useCallback(() => {
    if (currentSlide >= (articleData?.slides.length ?? 1) - 1) return;
    dispatchReader({ type: 'NEXT_START' });
    dispatchReader({ type: 'TURN_COMMIT', index: currentSlide + 1 });
  }, [articleData, currentSlide]);

  const goToPrevSlide = useCallback(() => {
    if (currentSlide <= 0) return;
    dispatchReader({ type: 'PREVIOUS_START' });
    dispatchReader({ type: 'TURN_COMMIT', index: currentSlide - 1 });
  }, [currentSlide]);

  const handleCurlPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    curlRef.current = { startX: event.clientX, startY: event.clientY, pointerId: event.pointerId, width: rect.width };
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dispatchReader({ type: 'DRAG', progress: 0 });
  }, [reducedMotion]);

  const handleCurlPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = curlRef.current;
    if (!start || event.pointerId !== start.pointerId) return;
    const dx = event.clientX - start.startX;
    const dy = event.clientY - start.startY;
    const horizontal = Math.abs(dx);
    if (horizontal < Math.abs(dy) * 1.05) return;
    const rawProgress = dx / Math.max(start.width, 1);
    const resistance = Math.sign(rawProgress) * Math.min(Math.abs(rawProgress), 0.34) * (Math.abs(rawProgress) > 0.22 ? 0.72 : 1);
    dispatchReader({ type: 'DRAG', progress: resistance });
  }, []);

  const handleCurlPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = curlRef.current;
    curlRef.current = null;
    if (!start || event.pointerId !== start.pointerId) return;
    const dx = event.clientX - start.startX;
    const dy = event.clientY - start.startY;
    const progress = dx / Math.max(start.width, 1);
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.05) {
      suppressClickRef.current = true;
      if (progress < 0) goToNextSlide();
      else goToPrevSlide();
    } else {
      dispatchReader({ type: 'TURN_CANCEL' });
    }
  }, [goToNextSlide, goToPrevSlide]);

  const handleCurlPointerCancel = useCallback(() => {
    curlRef.current = null;
    dispatchReader({ type: 'TURN_CANCEL' });
  }, []);

  const handleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Click navigation: left half = prev, right half = next
  const handleSlideClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const midpoint = rect.width / 2;
    
    if (direction === 'rtl') {
      if (clickX < midpoint) goToNextSlide();
      else goToPrevSlide();
    } else {
      if (clickX < midpoint) goToPrevSlide();
      else goToNextSlide();
    }
  }, [direction, goToNextSlide, goToPrevSlide]);

  useEffect(() => {
    if (isLoading) return;
    if (error || !articleData || !slug) {
      setNoIndexMetadata();
      return;
    }

    const prefix = window.location.pathname.startsWith('/fa/') ? '/fa' : window.location.pathname.startsWith('/en/') ? '/en' : '';
    const canonicalPath = `${prefix}/read/${encodeURIComponent(articleData.slug)}`;
    const title = localizedArticleTitle(articleData, locale);
    const description = localizedArticleSummary(articleData, locale) || title;
    const authorName = articleData.author ? [articleData.author.first_name, articleData.author.last_name].filter(Boolean).join(' ') : 'کاغذ و باد';
    setSeoMetadata({
      title: `${title} — کاغذ و باد`,
      description,
      canonicalPath,
      locale: locale === 'fa' ? 'fa_IR' : 'en_US',
      language: locale === 'fa' ? 'fa-IR' : 'en-US',
      type: 'article',
      image: articleData.cover_url || undefined,
      structuredData: [
        {
          '@type': 'Article',
          '@id': `${window.location.origin}${canonicalPath}#article`,
          headline: title,
          description,
          mainEntityOfPage: { '@id': `${window.location.origin}${canonicalPath}#webpage` },
          author: { '@type': 'Person', name: authorName },
          publisher: { '@type': 'Organization', name: 'کاغذ و باد', url: 'https://kaghazobaad.ir' },
          datePublished: articleData.published_at || undefined,
          dateModified: articleData.updated_at || articleData.published_at || undefined,
          image: articleData.cover_url ? [articleData.cover_url] : ['https://kaghazobaad.ir/brain-character.svg'],
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: locale === 'fa' ? 'خانه' : 'Home', item: `https://kaghazobaad.ir${prefix || ''}/` },
            { '@type': 'ListItem', position: 2, name: locale === 'fa' ? 'مقالات' : 'Read', item: `https://kaghazobaad.ir${prefix}/read` },
            { '@type': 'ListItem', position: 3, name: title },
          ],
        },
      ],
    });
  }, [articleData, error, isLoading, locale, slug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (direction === 'rtl') goToPrevSlide();
        else goToNextSlide();
      } else if (e.key === 'ArrowLeft') {
        if (direction === 'rtl') goToNextSlide();
        else goToPrevSlide();
      } else if (e.key === 'Escape') {
        navigate('/read');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextSlide, goToPrevSlide, navigate, direction]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-reading-bg" role="status" aria-live="polite">
          <Loader2 className="h-12 w-12 animate-spin text-reading-fg/40" aria-hidden="true" />
          <span className="sr-only">{locale === 'fa' ? 'در حال بارگذاری مقاله…' : 'Loading article…'}</span>
      </div>
    );
  }

  if (error || !articleData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-reading-bg" role="alert">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-reading-fg">
            {locale === 'fa' ? 'مقاله یافت نشد' : 'Article Not Found'}
          </h2>
          <Button onClick={() => navigate('/read')}>
            {locale === 'fa' ? 'بازگشت به فهرست' : 'Back to Articles'}
          </Button>
        </div>
      </div>
    );
  }

  const slide = articleData.slides[currentSlide];
  const hasSlides = articleData.slides.length > 0 && Boolean(slide);

  return (
    <div className="fixed inset-0 bg-reading-bg z-50 flex flex-col">
      {/* Minimal Header */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          {hasSlides && (
            <span className="text-xs text-reading-muted font-light tabular-nums">
              {currentSlide + 1} / {articleData.slides.length}
            </span>
          )}
          <h1 className="text-sm font-light text-reading-muted truncate max-w-xs" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            {locale === 'fa' ? articleData.title_fa : articleData.title_en}
          </h1>
        </div>
        
        <Button variant="ghost" size="icon" onClick={() => navigate('/read')} className="text-reading-muted hover:text-reading-fg" aria-label={locale === 'fa' ? 'بازگشت به مقالات' : 'Back to articles'} title={locale === 'fa' ? 'بازگشت به مقالات' : 'Back to articles'}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Slide Content - clickable halves for navigation */}
      {hasSlides && slide ? (
        <div className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y" onClick={handleSlideClick} onClickCapture={handleClickCapture} onPointerDown={handleCurlPointerDown} onPointerMove={handleCurlPointerMove} onPointerUp={handleCurlPointerUp} onPointerCancel={handleCurlPointerCancel} role="region" aria-label={locale === 'fa' ? 'صفحهٔ مطالعهٔ مقاله؛ برای ورق‌زدن بکشید' : 'Article reading page; drag to turn'}>
          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center p-8 md:p-16 lg:p-24">
            <div key={currentSlide} className="creative-page-turn max-w-3xl w-full" dir={locale === 'fa' ? 'rtl' : 'ltr'} aria-live="polite" style={!reducedMotion ? { '--curl-progress': readerState.dragProgress, transform: `perspective(1200px) rotateY(${readerState.dragProgress * -10}deg) translateX(${readerState.dragProgress * 18}px)`, boxShadow: `${readerState.dragProgress * -28}px 0 32px -28px hsl(var(--reading-fg) / ${Math.min(Math.abs(readerState.dragProgress) * 1.8, .32)})` } as React.CSSProperties : undefined}>
              {localizedSlideTitle(slide, locale) && (
                <h2 className="text-2xl md:text-4xl font-semibold mb-8 text-reading-fg leading-relaxed">
                  {localizedSlideTitle(slide, locale)}
                </h2>
              )}
              
              <div className="prose-reading" data-color-mode="light">
                <MDEditor.Markdown source={localizedSlideBody(slide, locale)} />
              </div>
            </div>
          </div>

          {/* Very subtle nav arrows at 10% opacity */}
          {currentSlide > 0 && (
            <div className={`absolute top-1/2 -translate-y-1/2 ${direction === 'rtl' ? 'right-4' : 'left-4'} pointer-events-none`}>
              <ChevronLeft className={`h-8 w-8 text-reading-fg opacity-10 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            </div>
          )}

          {currentSlide < articleData.slides.length - 1 && (
            <div className={`absolute top-1/2 -translate-y-1/2 ${direction === 'rtl' ? 'left-4' : 'right-4'} pointer-events-none`}>
              <ChevronRight className={`h-8 w-8 text-reading-fg opacity-10 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-reading-muted">
          {locale === 'fa' ? 'هنوز اسلایدی اضافه نشده' : 'No slides yet'}
        </div>
      )}

      {/* Progress Bar - very subtle */}
      {hasSlides && (
        <div className="flex items-center gap-4 border-t border-reading-fg/5 px-6 py-2 text-xs text-reading-muted" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <span>{locale === 'fa' ? `اسلاید ${currentSlide + 1} از ${articleData.slides.length}` : `Slide ${currentSlide + 1} of ${articleData.slides.length}`}</span>
          <div className="h-0.5 flex-1 bg-reading-fg/5" role="progressbar" aria-valuemin={1} aria-valuemax={articleData.slides.length} aria-valuenow={currentSlide + 1} aria-label={locale === 'fa' ? 'پیشرفت اسلایدها' : 'Slide progress'}>
            <div className="h-full bg-reading-fg/30 transition-all duration-500 ease-out" style={{ width: `${((currentSlide + 1) / articleData.slides.length) * 100}%` }} />
          </div>
        </div>
      )}

      {hasSlides && (
        <div className="flex items-center justify-between gap-3 px-6 py-3" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <Button variant="ghost" size="sm" onClick={goToPrevSlide} disabled={currentSlide === 0} aria-label={locale === 'fa' ? 'اسلاید قبلی' : 'Previous slide'}>
            <ChevronLeft className={`h-4 w-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} aria-hidden="true" />
            {locale === 'fa' ? 'قبلی' : 'Previous'}
          </Button>
          <span className="text-xs text-reading-muted">{locale === 'fa' ? 'برای جابه‌جایی از کلیدهای جهت‌نما هم استفاده کنید' : 'You can also use the arrow keys to navigate'}</span>
          <Button variant="ghost" size="sm" onClick={goToNextSlide} disabled={currentSlide === articleData.slides.length - 1} aria-label={locale === 'fa' ? 'اسلاید بعدی' : 'Next slide'}>
            {locale === 'fa' ? 'بعدی' : 'Next'}
            <ChevronRight className={`h-4 w-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Comments Section */}
      <div className="border-t border-reading-fg/5 px-6 py-6 max-w-3xl mx-auto w-full shrink-0 overflow-auto" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
        <ArticleComments articleId={articleData.id} />
      </div>
    </div>
  );
}
