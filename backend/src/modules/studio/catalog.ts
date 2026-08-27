export const STUDIO_CATALOG_VERSION = '2026-08-27' as const;

export type StudioCapabilityContext = 'article' | 'publication' | 'live' | 'media' | 'community' | 'operations';
export type StudioReadiness = 'connection_ready' | 'contract_pending' | 'foundation_pending' | 'governance_pending';
export type StudioRiskLevel = 'low' | 'medium' | 'high';

export type StudioCapabilityDefinition = {
  key: string;
  context: StudioCapabilityContext;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  inputSummaryFa: string;
  outputSummaryFa: string;
  readiness: StudioReadiness;
  risk: StudioRiskLevel;
  requiresHumanReview: true;
  requiresConsent: boolean;
  activationBlockedByFa: string;
};

const capability = (definition: StudioCapabilityDefinition) => definition;

/**
 * Canonical product catalog. A capability is intentionally not an executable endpoint.
 * A Studio Flow can only be wired after its versioned contract, policy, evaluation and
 * review surface are individually approved.
 */
export const studioCapabilityCatalog = [
  capability({
    key: 'article.editorial_suggestion', context: 'article',
    titleFa: 'پیشنهاد ویراستاری مقاله', titleEn: 'Editorial suggestion',
    descriptionFa: 'بازنویسی، annotation و checklist پیشنهادی برای نسخهٔ مشخص مقاله.', descriptionEn: 'Version-bound rewrite, annotations and editorial checklist.',
    inputSummaryFa: 'snapshot مقاله، زبان و هدف ویراستاری', outputSummaryFa: 'proposalهای anchorدار و قابل‌داوری',
    readiness: 'connection_ready', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'تا تکمیل contract E2E امضاشده با Studio، این قابلیت غیرفعال است.',
  }),
  capability({
    key: 'article.title_suggestions', context: 'article',
    titleFa: 'پیشنهاد عنوان پژوهشی', titleEn: 'Academic title suggestions',
    descriptionFa: 'چند عنوان و کلیدواژهٔ پیشنهادی بدون ایجاد ادعای پژوهشی جدید.', descriptionEn: 'Academic title and keyword drafts without new research claims.',
    inputSummaryFa: 'موضوع یا snapshot مقاله', outputSummaryFa: 'عنوان، rationale و کلیدواژه',
    readiness: 'contract_pending', risk: 'low', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'schema خروجی و Flow نسخه‌دار Studio هنوز تعریف نشده است.',
  }),
  capability({
    key: 'article.academic_rewrite', context: 'article',
    titleFa: 'بازنویسی دانشگاهی', titleEn: 'Academic rewrite',
    descriptionFa: 'متن بازنویسی‌شده با tone و زبان انتخابی، به شکل diff قابل‌بررسی.', descriptionEn: 'Tone- and language-aware draft rewrite as a reviewable diff.',
    inputSummaryFa: 'بخش انتخابی یا snapshot مقاله', outputSummaryFa: 'متن پیشنهادی و provenance',
    readiness: 'contract_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'مسیر محصول آماده است، اما contract خارجی و diff review باید تکمیل شود.',
  }),
  capability({
    key: 'article.submission_readiness', context: 'article',
    titleFa: 'بررسی آمادگی ارسال برای داوری', titleEn: 'Submission readiness',
    descriptionFa: 'checklist ساختار، پرسش‌های باز و موارد نیازمند بازبینی پیش از ارسال.', descriptionEn: 'Pre-review structure checklist and open questions.',
    inputSummaryFa: 'snapshot مقاله و معیار انتخاب‌شده', outputSummaryFa: 'checklist هشدار و سؤال',
    readiness: 'contract_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'policy ارزیابی و معیارهای review باید مصوب شوند.',
  }),
  capability({
    key: 'article.abstract_summary', context: 'article',
    titleFa: 'چکیده و خلاصهٔ علمی', titleEn: 'Abstract and summary',
    descriptionFa: 'چکیدهٔ علمی و plain-language summary پیشنهادی برای مقاله.', descriptionEn: 'Draft scholarly abstract and plain-language summary.',
    inputSummaryFa: 'snapshot مقاله و زبان مقصد', outputSummaryFa: 'چکیده و خلاصهٔ پیشنهادی',
    readiness: 'contract_pending', risk: 'low', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'مدل proposal و policy دوزبانگی باید افزوده شود.',
  }),
  capability({
    key: 'article.metadata_seo', context: 'article',
    titleFa: 'metadata و SEO پیشنهادی', titleEn: 'Metadata and SEO assistant',
    descriptionFa: 'tag، category، keyword و description پیشنهادی برای بازبینی editor.', descriptionEn: 'Draft tags, categories, keywords and descriptions for editor review.',
    inputSummaryFa: 'مقاله و taxonomy مجاز', outputSummaryFa: 'metadata پیشنهادی و دلیل',
    readiness: 'contract_pending', risk: 'low', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'taxonomy کنترل‌شده و schema خروجی لازم است.',
  }),
  capability({
    key: 'article.translation', context: 'article',
    titleFa: 'ترجمه و محلی‌سازی فارسی–انگلیسی', titleEn: 'Persian–English localization',
    descriptionFa: 'ترجمهٔ پیشنهادی با حفظ اصطلاحات و جداسازی کامل از متن اصلی.', descriptionEn: 'Terminology-aware draft translation without overwriting source.',
    inputSummaryFa: 'فیلد یا snapshot مقاله و زبان مقصد', outputSummaryFa: 'ترجمه و نکات اصطلاحی',
    readiness: 'contract_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'review دوزبانه و policy اصطلاحات هنوز آماده نیست.',
  }),
  capability({
    key: 'article.citation_consistency', context: 'article',
    titleFa: 'بررسی انسجام ادعا و ارجاع', titleEn: 'Claim and citation consistency',
    descriptionFa: 'نشان‌دادن ادعاهای نیازمند بررسی؛ نه fact-check قطعی و نه تولید منبع.', descriptionEn: 'Flags claims needing review; it neither fact-checks conclusively nor invents sources.',
    inputSummaryFa: 'snapshot مقاله و ارجاعات موجود', outputSummaryFa: 'یافته‌های قابل‌بررسی با اطمینان',
    readiness: 'governance_pending', risk: 'high', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'policy منبع، evaluation و نمایش عدم‌قطعیت باید تصویب شود.',
  }),
  capability({
    key: 'article.review_thread_digest', context: 'article',
    titleFa: 'خلاصهٔ گفت‌وگوی داوری', titleEn: 'Review thread digest',
    descriptionFa: 'تلخیص کامنت‌ها و پرسش‌های باز برای پاسخ نویسنده.', descriptionEn: 'Comment-thread digest and open questions for the author.',
    inputSummaryFa: 'کامنت‌های مجاز و snapshot مقاله', outputSummaryFa: 'digest و پاسخ draft',
    readiness: 'foundation_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'redaction هویت و مدل artifact کامنت باید آماده شود.',
  }),
  capability({
    key: 'article.reviewer_assist', context: 'article',
    titleFa: 'کمک به اولویت‌دهی یا انتخاب داور', titleEn: 'Reviewer assistance',
    descriptionFa: 'توصیهٔ غیرالزام‌آور برای editor؛ نه تخصیص خودکار.', descriptionEn: 'Non-binding editor recommendation; never automatic assignment.',
    inputSummaryFa: 'معیارهای مصوب و metadata حداقلی', outputSummaryFa: 'توصیه و دلیل قابل‌بررسی',
    readiness: 'governance_pending', risk: 'high', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'کنترل bias، policy و مسیر اعتراض انسانی لازم است.',
  }),
  capability({
    key: 'publication.instagram_caption', context: 'publication',
    titleFa: 'مقاله به کپشن اینستاگرام', titleEn: 'Instagram caption',
    descriptionFa: 'کپشن، CTA و hashtag پیشنهادی از نسخهٔ تأییدشدهٔ مقاله.', descriptionEn: 'Draft caption, CTA and hashtags from an approved article version.',
    inputSummaryFa: 'snapshot مقاله، tone و محدودیت طول', outputSummaryFa: 'کپشن کوتاه/بلند، CTA و hashtag',
    readiness: 'contract_pending', risk: 'low', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'Flow و proposal type اختصاصی لازم است؛ انتشار اجتماعی خودکار وجود ندارد.',
  }),
  capability({
    key: 'publication.channel_adaptation', context: 'publication',
    titleFa: 'بازنویسی برای کانال انتشار', titleEn: 'Channel adaptation',
    descriptionFa: 'نسخهٔ پیشنهادی برای LinkedIn، newsletter یا کانال داخلی.', descriptionEn: 'Draft channel-specific copy for LinkedIn, newsletter or internal channels.',
    inputSummaryFa: 'مقالهٔ تأییدشده و کانال مقصد', outputSummaryFa: 'copy پیشنهادی هر کانال',
    readiness: 'foundation_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'contract کانال و review surface باید تکمیل شود.',
  }),
  capability({
    key: 'publication.carousel_outline', context: 'publication',
    titleFa: 'ساختار carousel و پست چنداسلایدی', titleEn: 'Carousel outline',
    descriptionFa: 'outline کارت‌ها، پیام اصلی و CTA؛ نه تولید یا انتشار خودکار تصویر.', descriptionEn: 'Card outline, key message and CTA; no automatic image creation or publishing.',
    inputSummaryFa: 'مقاله و پلتفرم مقصد', outputSummaryFa: 'outline کارت‌ها و متن پیشنهادی',
    readiness: 'foundation_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'مدل draft اسلاید و policy دارایی تصویری لازم است.',
  }),
  capability({
    key: 'publication.faq_extraction', context: 'publication',
    titleFa: 'استخراج FAQ از مقاله', titleEn: 'Article FAQ extraction',
    descriptionFa: 'پرسش‌وپاسخ‌های پیشنهادی grounded در مقالهٔ منتشرشده.', descriptionEn: 'Article-grounded FAQ drafts from a published article.',
    inputSummaryFa: 'snapshot مقالهٔ منتشرشده', outputSummaryFa: 'FAQ همراه اشاره به منبع',
    readiness: 'foundation_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'schema citation و review انتشار لازم است.',
  }),
  capability({
    key: 'publication.content_calendar', context: 'publication',
    titleFa: 'پیشنهاد تقویم بازنشر محتوا', titleEn: 'Content calendar advisory',
    descriptionFa: 'توصیهٔ زمان و کانال؛ نه زمان‌بندی یا انتشار خودکار.', descriptionEn: 'Timing and channel advisory; no scheduling or automatic publishing.',
    inputSummaryFa: 'metadata انتشار و policy کانال', outputSummaryFa: 'پیشنهاد زمان/کانال',
    readiness: 'governance_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'policy تجاری و دادهٔ کافی برای evaluation لازم است.',
  }),
  capability({
    key: 'article.slide_outline', context: 'article',
    titleFa: 'outline و speaker note اسلاید', titleEn: 'Slide outline and speaker notes',
    descriptionFa: 'ساختار اسلاید و یادداشت گوینده از متن مقاله، در وضعیت draft.', descriptionEn: 'Draft slide outline and speaker notes from article content.',
    inputSummaryFa: 'snapshot مقاله و زبان مقصد', outputSummaryFa: 'عنوان، bullet و note هر اسلاید',
    readiness: 'contract_pending', risk: 'low', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'schema اسلاید و review flow اختصاصی لازم است.',
  }),
  capability({
    key: 'media.accessibility_metadata', context: 'media',
    titleFa: 'alt text و metadata دسترس‌پذیری رسانه', titleEn: 'Accessibility metadata',
    descriptionFa: 'alt text، caption و description پیشنهادی برای media.', descriptionEn: 'Draft alt text, captions and descriptions for media.',
    inputSummaryFa: 'رسانه با URL کوتاه‌عمر و مجوز owner', outputSummaryFa: 'alt text و caption پیشنهادی',
    readiness: 'foundation_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'URL کوتاه‌عمر و policy دسترسی رسانهٔ خصوصی لازم است.',
  }),
  capability({
    key: 'media.document_understanding', context: 'media',
    titleFa: 'OCR و تلخیص PDF/ارائه', titleEn: 'Document understanding',
    descriptionFa: 'متن استخراج‌شده، تلخیص و metadata پیشنهادی از فایل مجاز.', descriptionEn: 'Extracted text, summary and metadata from an authorized file.',
    inputSummaryFa: 'فایل با دسترسی scoped', outputSummaryFa: 'artifact متن و summary',
    readiness: 'foundation_pending', risk: 'high', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'صف پردازش فایل، retention و کنترل دسترسی لازم است.',
  }),
  capability({
    key: 'media.classification', context: 'media',
    titleFa: 'طبقه‌بندی و برچسب رسانه', titleEn: 'Media classification',
    descriptionFa: 'پیشنهاد type، tag و description بدون تغییر خودکار.', descriptionEn: 'Draft media type, tags and description without automatic changes.',
    inputSummaryFa: 'رسانهٔ مجاز و taxonomy', outputSummaryFa: 'metadata پیشنهادی',
    readiness: 'foundation_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'contract media و review metadata باید افزوده شود.',
  }),
  capability({
    key: 'live_recording.transcription', context: 'live',
    titleFa: 'ویدئوی ضبط‌شده به متن', titleEn: 'Recording transcription',
    descriptionFa: 'تبدیل recording دارای رضایت به transcript نسخه‌دار.', descriptionEn: 'Consent-gated recording transcription into a versioned transcript.',
    inputSummaryFa: 'recording مجاز، زبان و consent', outputSummaryFa: 'transcript و quality metadata',
    readiness: 'foundation_pending', risk: 'high', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'consent، URL کوتاه‌عمر، queue و transcript schema لازم است.',
  }),
  capability({
    key: 'live_recording.summary_actions', context: 'live',
    titleFa: 'خلاصهٔ جلسه و action item', titleEn: 'Meeting summary and action items',
    descriptionFa: 'خلاصه، تصمیم و action item پیشنهادی پس از transcript.', descriptionEn: 'Draft summary, decisions and action items after transcription.',
    inputSummaryFa: 'transcript تأییدشده و interactions مجاز', outputSummaryFa: 'خلاصه و action item پیشنهادی',
    readiness: 'foundation_pending', risk: 'high', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'به transcript، approval میزبان و policy action نیاز دارد.',
  }),
  capability({
    key: 'live_recording.subtitles_chapters', context: 'live',
    titleFa: 'زیرنویس و chapter ویدئو', titleEn: 'Subtitles and chapters',
    descriptionFa: 'VTT/SRT، chapter marker و پیشنهاد clip از recording مجاز.', descriptionEn: 'Draft VTT/SRT, chapters and clip hints from an authorized recording.',
    inputSummaryFa: 'recording مجاز و transcript', outputSummaryFa: 'artifact زیرنویس و chapter',
    readiness: 'foundation_pending', risk: 'high', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'retention و pipeline رسانه باید ساخته شود.',
  }),
  capability({
    key: 'live.interaction_digest', context: 'live',
    titleFa: 'خلاصهٔ پرسش‌وپاسخ جلسهٔ زنده', titleEn: 'Live interaction digest',
    descriptionFa: 'دسته‌بندی پرسش‌ها و پاسخ draft برای میزبان.', descriptionEn: 'Question clustering and host-facing draft answers.',
    inputSummaryFa: 'interactionهای مجاز جلسه', outputSummaryFa: 'digest و پاسخ draft',
    readiness: 'foundation_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'redaction، consent و review میزبان لازم است.',
  }),
  capability({
    key: 'live.moderation_advisory', context: 'live',
    titleFa: 'پیشنهاد moderation جلسه', titleEn: 'Live moderation advisory',
    descriptionFa: 'flag و دلیل پیشنهادی؛ هرگز mute، حذف یا تغییر نقش خودکار نیست.', descriptionEn: 'Draft flags and rationale; never automatic mute, deletion or role changes.',
    inputSummaryFa: 'interactionهای مجاز و policy', outputSummaryFa: 'flag و توضیح کوتاه',
    readiness: 'governance_pending', risk: 'high', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'policy شفاف، appeal انسانی و audit لازم است.',
  }),
  capability({
    key: 'community.comment_digest', context: 'community',
    titleFa: 'تلخیص کامنت و پاسخ draft', titleEn: 'Comment digest and draft reply',
    descriptionFa: 'جمع‌بندی گفت‌وگو و پاسخ پیشنهادی برای صاحب محتوا.', descriptionEn: 'Thread digest and draft reply for the content owner.',
    inputSummaryFa: 'کامنت‌های مجاز و snapshot مقاله', outputSummaryFa: 'digest و پاسخ draft',
    readiness: 'foundation_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'redaction و review surface کامنت لازم است.',
  }),
  capability({
    key: 'community.safety_advisory', context: 'community',
    titleFa: 'پیشنهاد ایمنی کامنت', titleEn: 'Comment safety advisory',
    descriptionFa: 'flag پیشنهادی برای review؛ نه حذف، ban یا محدودسازی خودکار.', descriptionEn: 'Review flag only; never automatic deletion, ban or restriction.',
    inputSummaryFa: 'کامنت و policy مصوب', outputSummaryFa: 'flag، دسته و دلیل',
    readiness: 'governance_pending', risk: 'high', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'policy، evaluation، appeal و audit انسانی لازم است.',
  }),
  capability({
    key: 'knowledge.grounded_retrieval', context: 'operations',
    titleFa: 'بازیابی معنایی مقالات منتشرشده', titleEn: 'Grounded retrieval',
    descriptionFa: 'جست‌وجو و پاسخ grounded فقط بر corpus عمومی یا opt-in.', descriptionEn: 'Search and grounded answers over public or opt-in corpus only.',
    inputSummaryFa: 'corpus مجاز و پرسش کاربر', outputSummaryFa: 'پاسخ همراه source',
    readiness: 'governance_pending', risk: 'high', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'corpus policy، citation و evaluation کیفیت باید آماده شود.',
  }),
  capability({
    key: 'operations.usage_insight', context: 'operations',
    titleFa: 'خلاصهٔ عملیاتی usage و quota', titleEn: 'Usage and quota insight',
    descriptionFa: 'توضیح روندهای aggregate برای مدیر، بدون PII یا توصیهٔ مالی.', descriptionEn: 'Aggregate operational trends without PII or financial advice.',
    inputSummaryFa: 'دادهٔ aggregate usage و quota', outputSummaryFa: 'روند و هشدار پیشنهادی',
    readiness: 'governance_pending', risk: 'medium', requiresHumanReview: true, requiresConsent: false,
    activationBlockedByFa: 'aggregation policy و baseline ارزیابی لازم است.',
  }),
  capability({
    key: 'operations.support_draft', context: 'operations',
    titleFa: 'پاسخ draft پشتیبانی', titleEn: 'Support response draft',
    descriptionFa: 'دسته‌بندی و پاسخ پیشنهادی برای اپراتور، بدون ارسال خودکار.', descriptionEn: 'Operator-facing classification and draft reply with no automatic send.',
    inputSummaryFa: 'درخواست redacted و policy پاسخ', outputSummaryFa: 'دسته و پاسخ draft',
    readiness: 'governance_pending', risk: 'high', requiresHumanReview: true, requiresConsent: true,
    activationBlockedByFa: 'redaction PII و approval اپراتور لازم است.',
  }),
] as const satisfies readonly StudioCapabilityDefinition[];

export type StudioCapability = (typeof studioCapabilityCatalog)[number];

export function capabilitiesForContext(context?: StudioCapabilityContext): readonly StudioCapability[] {
  return context ? studioCapabilityCatalog.filter((item) => item.context === context) : studioCapabilityCatalog;
}
