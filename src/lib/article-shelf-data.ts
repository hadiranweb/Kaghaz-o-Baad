export type ShelfLocale = 'fa' | 'en';

export type ShelfArticleInput = {
  id: string;
  slug: string;
  title_fa?: string | null;
  title_en?: string | null;
  summary_fa?: string | null;
  summary_en?: string | null;
  cover_url?: string | null;
  tags?: string[] | null;
  categories?: string[] | null;
  status?: string | null;
  author_id?: string | null;
  published_at?: string | null;
  created_at?: string | null;
};

type ShelfAuthor = { display_name?: string; first_name?: string; last_name?: string } | undefined;

export type ShelfArticle = ShelfArticleInput & {
  displayTitle: string;
  displaySummary: string;
  authorName: string;
  languageLabel: string;
  dateLabel: string;
  hasCover: boolean;
};

const text = (value: string | null | undefined) => value?.trim() || '';

export function normalizeShelfArticle(article: ShelfArticleInput, locale: ShelfLocale, author?: ShelfAuthor): ShelfArticle {
  const primaryTitle = locale === 'fa' ? text(article.title_fa) : text(article.title_en);
  const fallbackTitle = locale === 'fa' ? text(article.title_en) : text(article.title_fa);
  const primarySummary = locale === 'fa' ? text(article.summary_fa) : text(article.summary_en);
  const fallbackSummary = locale === 'fa' ? text(article.summary_en) : text(article.summary_fa);
  const authorName = text(author?.display_name) || [text(author?.first_name), text(author?.last_name)].filter(Boolean).join(' ') || (locale === 'fa' ? 'نویسندهٔ کاغذ و باد' : 'KaghazBaad author');
  const dateValue = article.published_at || article.created_at;
  const dateLabel = dateValue ? new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateValue)) : (locale === 'fa' ? 'تاریخ نامشخص' : 'Date unavailable');

  return {
    ...article,
    displayTitle: primaryTitle || fallbackTitle || (locale === 'fa' ? 'بدون عنوان' : 'Untitled article'),
    displaySummary: primarySummary || fallbackSummary || (locale === 'fa' ? 'خلاصه‌ای برای این مقاله ثبت نشده است.' : 'No summary is available for this article yet.'),
    authorName,
    languageLabel: locale === 'fa' ? 'فارسی / English' : 'English / فارسی',
    dateLabel,
    hasCover: Boolean(text(article.cover_url)),
  };
}
