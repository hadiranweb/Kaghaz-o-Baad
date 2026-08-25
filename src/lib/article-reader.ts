import type { BackendArticleCard, BackendSlide } from './backend-api';

export type ReaderLocale = 'fa' | 'en';

export type ReaderSlide = {
  id: string;
  article_id: string;
  sort_order: number;
  title_fa: string;
  title_en: string;
  body_fa: string;
  body_en: string;
};

export type ReaderArticle = BackendArticleCard & {
  author_id?: string | null;
  slides: ReaderSlide[];
};

const stringValue = (value: unknown): string => typeof value === 'string' ? value : '';

export function normalizeSlide(slide: BackendSlide): ReaderSlide {
  const content = slide.content || {};
  const title = stringValue(slide.title);
  return {
    id: slide.id,
    article_id: slide.article_id,
    sort_order: Number.isFinite(slide.sort_order) ? slide.sort_order : 0,
    title_fa: stringValue(content.title_fa) || title,
    title_en: stringValue(content.title_en) || title,
    body_fa: stringValue(content.body_fa) || stringValue(content.markdown_fa) || stringValue(content.body) || '',
    body_en: stringValue(content.body_en) || stringValue(content.markdown_en) || stringValue(content.body) || '',
  };
}

export function normalizeSlides(slides: BackendSlide[]): ReaderSlide[] {
  return slides.map(normalizeSlide).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}

export function localizedSlideTitle(slide: ReaderSlide, locale: ReaderLocale): string {
  return (locale === 'fa' ? slide.title_fa : slide.title_en) || slide.title_fa || slide.title_en;
}

export function localizedSlideBody(slide: ReaderSlide, locale: ReaderLocale): string {
  return (locale === 'fa' ? slide.body_fa : slide.body_en) || slide.body_fa || slide.body_en;
}

export function localizedArticleTitle(article: Pick<ReaderArticle, 'title_fa' | 'title_en'>, locale: ReaderLocale): string {
  return (locale === 'fa' ? article.title_fa : article.title_en) || article.title_fa || article.title_en;
}

export function localizedArticleSummary(article: Pick<ReaderArticle, 'summary_fa' | 'summary_en'>, locale: ReaderLocale): string {
  return (locale === 'fa' ? article.summary_fa : article.summary_en) || article.summary_fa || article.summary_en;
}
