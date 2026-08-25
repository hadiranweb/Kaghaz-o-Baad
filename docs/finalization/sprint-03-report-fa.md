# گزارش جامع اسپرینت ۳ — امنیت ذخیره‌سازی، اعتبارسنجی رسانه‌ها، لینک‌های Presigned، اسلایدهای تعاملی و آزمون‌های ذخیره‌سازی

**تاریخ اجرا:** ۲۴ اوت ۲۰۲۶ (۳ شهریور ۱۴۰۵)  
**شاخه ادغام:** `integration/product-finalization`  
**وضعیت اسپرینت:** موفق / آمادهٔ ادغام و بررسی در CI  

---

## ۱. خلاصهٔ دستاوردها و اهداف محقق‌شده

در اسپرینت ۳، لایهٔ ذخیره‌سازی ابری و خطوط لولهٔ رسانه‌ای (Storage & Media Pipelines) به طور کامل بازطراحی، ایمن‌سازی و اعتبارسنجی شدند. نقاط ضعف امنیتی در آپلود فایل‌ها برطرف گردید و زیرساخت ارائه‌های تعاملی و فایل‌های اسلاید در جلسات زنده تثبیت شد.

### اهم اقدامات پیاده‌سازی‌شده:
1. **ماتریس جامع اعتبارسنجی رسانه و MIME Types (`backend/src/modules/storage/service.ts`):**
   - تفکیک ۶ دستهٔ مجاز رسانه‌ای به همراه محدودیت سقف حجم و پسوندهای مجاز:
     - `image`: فرمت‌های JPEG, PNG, WebP, GIF, SVG (حداکثر ۱۰ مگابایت)
     - `avatar`: فرمت‌های JPEG, PNG, WebP (حداکثر ۵ مگابایت)
     - `document`: فرمت‌های PDF, EPUB, TXT, Markdown (حداکثر ۵۰ مگابایت)
     - `presentation`: فرمت‌های PDF, PPT, PPTX (حداکثر ۱۰۰ مگابایت)
     - `audio`: فرمت‌های MP3, WAV, OGG, WebM, AAC, M4A (حداکثر ۱۰۰ مگابایت)
     - `video`: فرمت‌های MP4, WebM, MOV, OGV (حداکثر ۵۰۰ مگابایت)
   - تطبیق سخت‌گیرانهٔ پسوند فایل با Content-Type اعلام‌شده جهت جلوگیری از حملات پنهان‌سازی فایل‌های اجرایی (Extension Spoofing).
   - پاکسازی نام فایل‌ها (`sanitizeFileName`) جهت حذف کاراکترهای خطرناک، بایت‌های تهی (Null Bytes) و تلاش برای Path Traversal (`../`).

2. **تثبیت و ایمن‌سازی لینک‌های موقت Presigned Object Storage:**
   - صدور لینک موقت آپلود (`createUploadUrl`) با TTL کنترل‌شده (بازه ۶۰ تا ۳۶۰۰ ثانیه، پیش‌فرض ۱۵ دقیقه) و هدرهای ایزولاسیون مالک در فرادادهٔ S3.
   - افزودن اندپوینت امن صدور لینک دانلود رسانه‌های خصوصی (`GET /api/v1/media/:id/download-url`) با کنترل دسترسی مالک و مدیران و تنظیم هدر `ResponseContentDisposition`.
   - عملیات حذف همگام رسانه از پایگاه‌داده و باکت ذخیره‌سازی شیء (`DELETE /api/v1/media/:id`).

3. **مدیریت اسناد PDF و ارائه‌های اسلاید تعاملی جلسات زنده:**
   - افزودن اندپوینت بازچینی دسته‌ای اسلایدها (`PUT /api/v1/articles/:articleId/slides/reorder`).
   - اتصال مستقیم ارائه‌های PDF و اسلاید به متادیتای نشست‌های زنده LiveKit (`presentationMediaId`, `presentationUrl`, `presentationKind`, `presentationName`).

4. **مایگریشن پایگاه‌داده شماره ۲۰ (`020_media_mime_and_storage_indexes.sql`):**
   - افزودن ستون‌های `mime_type` و `checksum_sha256` به جدول `media`.
   - ایجاد ایندکس‌های بهینه‌ساز عملکرد روی `file_path` و `mime_type` و `slides(owner_id, article_id)`.

5. **جاب نگهداری و پاکسازی فایل‌های بی‌صاحب (`jobs/cleanup-orphaned-media.ts`):**
   - ایجاد اسکریپت پس‌زمینه و افزودن دستور `"jobs:cleanup-media"` در `backend/package.json`.

6. **توسعهٔ آزمون‌های واحد بومی (Native Unit Tests):**
   - اضافه شدن ۳ سوئیت آزمون جدید در `tests/unit/`:
     - `tests/unit/media-validation.test.mjs` (آزمون‌های جامع MIME، اعتبارسنجی حجم و امنیت نام فایل)
     - `tests/unit/storage-presign.test.mjs` (آزمون‌های تنظیمات باکت S3 و محدودسازی زمان انقضا)
     - `tests/unit/slides-presentation.test.mjs` (آزمون‌های مجوزهای اسلایدها، مرتب‌سازی و ارائه‌های زنده)
   - ارتقای کل تست‌سوئیت‌ها به **۵۴ آزمون در ۱۴ سوئیت با قبولی ۱۰۰٪ (Pass: 54 / Fail: 0)**.

---

## ۲. جدول دسته‌های رسانه‌ای و محدودیت‌های اعتبارسنجی

| دسته (Category) | پسوندهای مجاز | فرمت‌های مجاز (MIME) | حداکثر حجم (Max Size) |
| :--- | :--- | :--- | :---: |
| **تصاویر (image)** | `.jpg, .jpeg, .png, .webp, .gif, .svg` | `image/jpeg, image/png, image/webp, image/gif, image/svg+xml` | ۱۰ مگابایت |
| **آواتار (avatar)** | `.jpg, .jpeg, .png, .webp` | `image/jpeg, image/png, image/webp` | ۵ مگابایت |
| **اسناد (document)** | `.pdf, .epub, .txt, .md` | `application/pdf, application/epub+zip, text/plain, text/markdown` | ۵۰ مگابایت |
| **ارائه (presentation)** | `.pdf, .ppt, .pptx` | `application/pdf, application/vnd.ms-powerpoint, application/vnd.openxmlformats-...` | ۱۰۰ مگابایت |
| **صوت (audio)** | `.mp3, .wav, .ogg, .webm, .aac, .m4a` | `audio/mpeg, audio/mp3, audio/wav, audio/ogg, audio/webm, audio/aac, audio/m4a` | ۱۰۰ مگابایت |
| **ویدیو (video)** | `.mp4, .webm, .mov, .ogv` | `video/mp4, video/webm, video/quicktime, video/ogg` | ۵۰۰ مگابایت |

---

## ۳. شواهد آزمون و اعتبارسنجی فنی

```text
TAP version 13
# tests 54
# suites 14
# pass 54
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1090ms
```

- `npm run verify:architecture`: استقلال کامل از Supabase تأیید شد.
- `npm run verify:seo`: فایل‌های خروجی SEO تأیید شدند.
- `migrate:dry-run`: ۲۰ فایل مایگریشن با موفقیت اعتبارسنجی شدند (`001` تا `020`).
- `backend check & build`: بدون خطا کامپایل شد.
- `installer check & build`: بدون خطا کامپایل شد.
- `secret-scan`: صفر فایل و کلید حساس گزارش شد.

---

## ۴. نقشهٔ راه اسپرینت بعدی (Sprint 4)

در **اسپرینت ۴ (Sprint 4 — LiveKit Streaming, E2EE, Recording & WebRTC Hardening)** موارد زیر هدف‌گذاری خواهند شد:
1. ایمن‌سازی کلیدهای توکن‌های وب‌هوک و احراز هویت LiveKit.
2. تثبیت رمزنگاری سرتاسری (E2EE) و ارائه همگام در جلسات زنده.
3. مدیریت خطاهای سرویس ضبط ویدیویی (Egress) و ذخیره‌سازی فایل‌های خروجی در Object Storage.
4. افزودن تست‌های واحد برای منطق توکن‌دهی، محدودیت دسترسی‌ها و رخدادهای اتاق‌های زنده.
