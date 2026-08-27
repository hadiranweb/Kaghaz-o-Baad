# راهنمای فعال‌سازی تدریجی قابلیت‌های Studio در کاغذ و باد

**وضعیت فعلی:** همهٔ capabilityهای Studio در Catalog و contextهای مقاله، رسانه و جلسهٔ زنده نمایش داده می‌شوند؛ همهٔ دکمه‌های اجرا عمداً غیرفعال‌اند. این سند اجازهٔ فعال‌سازی هیچ قابلیت یا اتصال خارجی نیست؛ فقط ترتیب کنترل‌شدهٔ فعال‌سازی پس از آماده‌شدن Studio را تعیین می‌کند.

## اصل فعال‌سازی

هر capability یک Flow مستقل است. فعال‌سازی یک Flow هرگز مجوز فعال‌کردن سایر Flowها نیست. کاغذ و باد source of truth مقاله، workflow، media، نقش‌ها و تصمیم‌های محصول باقی می‌ماند. Studio فقط input snapshot مجاز را از طریق contract دریافت و artifact یا proposal قابل‌بررسی برمی‌گرداند.

| شرط | معیار پذیرش |
|---|---|
| قرارداد | کلید Flow، schema نسخه‌دار input/output، `requestId` و idempotency مشخص و contract test مشترک سبز است. |
| داده | source، حداقل‌سازی داده، visibility، retention و برای media/live رضایت ثبت‌شده تعیین شده است. |
| امنیت | HMAC دوطرفه، timestamp، nonce، replay protection، key rotation و timeout فعال است. |
| محصول | UI نتیجه را draft نشان می‌دهد و accept/reject/edit فقط برای role مجاز قابل انجام است. |
| عملیات | snapshot/outbox، retry/dead-letter و monitoring وجود دارد؛ rollback با خاموش‌کردن flag فوری است. |
| کیفیت | fixture مشترک، آزمون E2E staging و ارزیابی نمونهٔ خروجی با معیار مشخص عبور کرده‌اند. |

## ترتیب پیشنهادی

| موج | Flowها | اقدام لازم در کاغذ و باد پیش از فعال‌سازی |
|---|---|---|
| ۰ | `article.editorial_suggestion` | E2E staging قرارداد حاضر با یک snapshot ساختگی؛ بررسی callback و review UI. |
| ۱ | `article.title_suggestions`، `article.academic_rewrite`، `article.abstract_summary`، `publication.instagram_caption` | contract و proposal schema اختصاصی؛ panel review؛ بدون publish/send خارجی. |
| ۲ | translation، metadata/SEO، slide outline، FAQ و channel adaptation | taxonomy/policy دوزبانه و artifact review؛ انتشار همچنان دستی. |
| ۳ | transcription، subtitles، meeting summary و live digest | migration transcript، consent model، signed URL، retention، processing queue و host approval. |
| ۴ | retrieval، reviewer assist، moderation و operational insight | data governance، redaction، evaluation baseline، human appeal و audit کامل. |

## configuration

تا وقتی Studio آماده نیست، این مقادیر باید به‌صورت زیر باقی بمانند و هیچ secret جدیدی ساخته یا ثبت نشود:

```dotenv
STUDIO_PROVIDER=disabled
STUDIO_DIRECT_COMPAT_ENABLED=false
CASIO_PLUS_ENABLED=false
CASIO_OUTBOX_WORKER_ENABLED=false
```

هنگام اجرای یک موج، فقط feature flag همان Flow پس از تأیید مستقل اضافه یا فعال می‌شود. `external_studio` بدون base URL و secretهای دوطرفه HMAC در backend fail-closed است. frontend هرگز secret، provider token یا URL credentialدار دریافت نمی‌کند.

## کنترل‌های ممنوع

هیچ Flow Studio مجاز نیست متن اصلی مقاله را overwrite کند، status workflow را تغییر دهد، مقاله/اسلاید/کامنت را منتشر یا حذف کند، email/SMS/شبکهٔ اجتماعی ارسال کند، نقش کاربر را عوض کند، کاربر را mute/ban کند یا به database کاغذ و باد دسترسی مستقیم داشته باشد. تمام این اقدامات فقط در backend کاغذ و باد و با authorization و تأیید انسانی انجام می‌شوند.

## rollback

اگر contract، callback، کیفیت خروجی یا policy نقض شد، flag همان capability خاموش می‌شود؛ dispatcher ارسال جدید را متوقف می‌کند؛ pending invocationها لغو یا dead-letter می‌شوند؛ proposalهای قبلی برای audit حفظ ولی اجرا نمی‌شوند. rollback نباید نیازمند حذف داده، تغییر schema یا تغییر role باشد.

## پیش‌نمایش‌های آموزشیِ غیرفعال

Catalog و پنل‌های context-aware برای هر capability یک **نمونهٔ آموزشی ثابت** نمایش می‌دهند. هر نمونه باید سناریوی ساختگی، خروجی نمونهٔ قابل‌بررسی و یادداشت ایمنی داشته باشد. این محتوا برای توضیح شکل artifact آینده است، نه برای ارزیابی کیفیت Studio و نه برای نمایش نتیجهٔ یک درخواست واقعی.

| قاعده | الزام |
|---|---|
| منشأ داده | فقط متن ساختگی یا عمومی؛ هیچ snapshot، media، کامنت، transcript، نام، شناسه یا دادهٔ حساب کاربر در preview قرار نمی‌گیرد. |
| اجرا | preview نباید request، queue، outbox، ذخیره‌سازی، analytics اختصاصی یا اتصال به provider/Studio ایجاد کند. |
| برچسب | UI باید صریحاً «نمونهٔ آموزشی»، «بدون اجرا» و در صورت نیاز «ساختگی» را نمایش دهد. |
| مرز تصمیم | نمونه، پیشنهاد واقعی، fact-check، transcript، moderation decision، پاسخ پشتیبانی یا مجوز انتشار نیست. |
| تغییرات آینده | افزودن یا تغییر capability فقط زمانی پذیرفته است که preview متناظر در registry و آزمون coverage آن نیز افزوده شود. |

> نمایش preview به هیچ‌وجه وضعیت `disabled` را تغییر نمی‌دهد. تا عبور از gates همین سند، تمامی کلیدهای Studio و قابلیت‌های اجرایی همچنان غیرفعال‌اند.
