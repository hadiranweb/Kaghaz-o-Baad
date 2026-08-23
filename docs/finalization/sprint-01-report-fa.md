# گزارش اسپرینت ۰۱ — قرارداد معماری و منبع حقیقت

**تاریخ:** ۲۰۲۶-۰۸-۲۳  
**برنچ:** `integration/product-finalization`  
**ورودی:** `d82de0e`

## نتیجهٔ اجرایی

تناقض اصلی میان کد و مستندات برطرف شد: README و Roadmap دیگر Supabase Edge Functionها یا Stage 1 قدیمی را Runtime فعال معرفی نمی‌کنند. معماری Fastify/PostgreSQL مستقل، سیاست Branch/Deployment و مرز n8n/OpenClaw/Open WebUI با ADR ثبت شد. یک Check خودکار مانع بازگشت Supabase به Runtime می‌شود.

از سمت GitHub، `main` که پیش از این بدون Protection بود، محافظت شد. Environmentهای `production` و `staging` ساخته شدند و Push خط تجمیع از این پس CI را اجرا می‌کند، بدون اینکه Production Deploy شود.

## تغییرات Repository

### منبع حقیقت

- بازنویسی README بر اساس Runtime واقعی؛
- بازنویسی وضعیت هشت حوزهٔ محصول با تفکیک «طراحی‌شده، پیاده‌سازی‌شده، تأییدشده و عملیاتی»؛
- اصلاح سند Legacy Supabase: Runtime مستقل است و `supabase/` آرشیو انتقالی است؛
- تبدیل `plan.md` قدیمی LiveKit/Supabase به اعلان منسوخ‌شدن؛
- اصلاح بخش وضعیت فعلی در قرارداد حاکم محصول؛
- پذیرش رسمی AI Stack کمکی با مرز امنیتی.

### ADRها

- `ADR-0001`: Backend/PostgreSQL منبع حقیقت Production؛
- `ADR-0002`: سیاست Branch و Deployment؛
- `ADR-0003`: مرز n8n، OpenClaw و Open WebUI.

### Guard معماری

اسکریپت جدید `scripts/check-architecture-contract.mjs` این موارد را Fail می‌کند:

- افزودن `@supabase/supabase-js` به Package فعال؛
- import یا فراخوانی Supabase در `src/`؛
- بازگشت `VITE_SUPABASE_*` به Environmentهای Frontend؛
- Deploy کردن Supabase در Workflow اصلی.

فرمان آن:

```bash
npm run verify:architecture
```

و اکنون در CI اجرا می‌شود.

### CI/CD

- Push و Pull Request روی `integration/product-finalization` نیز Validation می‌شوند؛
- Production همچنان فقط از Push به `main` Deploy می‌شود؛
- Deploy به Environment با نام `production` متصل شد؛
- Secret scan اکنون پیش‌نیاز Deploy است؛
- نسخهٔ Node از `.node-version` خوانده می‌شود؛
- Production dependency audit فرانت‌اند اضافه شد؛
- توضیح نادرست «Deployment خودکار نیست» اصلاح شد.

Lint هنوز وارد CI نشد، چون Baseline دارای ۲۳ Error است. افزودن Check شکست‌خورده بدون برنامهٔ اصلاح، کل خط تجمیع را قفل می‌کرد. رفع Errorها و سپس اجباری‌کردن Lint در Sprintهای Hardening انجام می‌شود.

### Repository hygiene

- Pull Request template برای تست، امنیت، Migration و Rollback اضافه شد؛
- Artifactهای تولیدی Coverage، Playwright، Lighthouse و Trace به `.gitignore` اضافه شدند؛
- حذف خودکار Branch پس از Merge در تنظیم Repository فعال شد.

## تغییرات تنظیمات GitHub

### وضعیت قبل

- `main`: بدون Branch Protection؛
- Ruleset: وجود نداشت؛
- Environment قابل مشاهده: فقط `github-pages`؛
- Actions: همهٔ Actionها مجاز، SHA pinning اجباری نبود.

### وضعیت اعمال‌شده

برای `main`:

- Require Pull Request: فعال؛
- Strict Required Status Checks: فعال؛
- Enforce for administrators: فعال؛
- Dismiss stale review: فعال؛
- Conversation resolution: اجباری؛
- Force Push: ممنوع؛
- Branch deletion: ممنوع.

Required Checks:

1. `Frontend check and build`؛
2. `Backend check, build and migration dry-run`؛
3. `Windows EXE installer`؛
4. `Public repository secret scan`.

Environmentها:

- `production`: فقط Protected Branchها؛
- `staging`: Custom branch policy برای `integration/product-finalization`.

در این اسپرینت Staging App ایجاد یا Deploy نشد؛ فقط مرز GitHub Environment ساخته شد.

## نتایج Validation

| Check | نتیجه |
|---|---|
| Workflow YAML parse | ✅ |
| Relative Markdown links | ✅ |
| `npm run verify:architecture` | ✅ |
| Frontend build | ✅ |
| SEO verification | ✅ |
| Frontend production audit با آستانه High | ✅؛ دو Moderate باقی است |
| Backend type-check | ✅ |
| Backend build | ✅ |
| Migration dry-run | ✅؛ ۱۸ Migration |
| Backend production audit | ✅؛ صفر آسیب‌پذیری |
| Installer type-check | ✅ |
| Installer build | ✅ |
| Frontend lint | ❌؛ همان ۲۳ Error شناخته‌شده |

Build فرانت‌اند همچنان هشدار Chunkهای بزرگ را دارد و Sitemap در نبود API قابل دسترس با صفر مقاله و fallback معتبر ساخته شد.

## تصمیم‌های معماری

1. `supabase/` فقط آرشیو انتقالی است؛
2. `backend/migrations/` تنها Migration فعال است؛
3. Merge به `main` یک Release Action و باعث Production Deploy است؛
4. Integration branch فقط Validation دارد؛
5. n8n، OpenClaw و Open WebUI سرویس کمکی‌اند و Backend را دور نمی‌زنند؛
6. قابلیت AI بدون Feature Flag، Budget، Audit و Human approval وارد Production نمی‌شود.

## ریسک‌های باز

- Required Checkها باید با اجرای CI همین Push در GitHub تأیید شوند؛
- Staging هنوز زیرساخت و Secret واقعی ندارد؛
- Branch Protection به‌تنهایی Rollback یا Health verification ایجاد نمی‌کند؛
- Actions هنوز با Tag نسخه (`@v4`) استفاده می‌شوند و SHA pinning فعال نیست؛
- Lint دارای ۲۳ Error است؛
- تست واحد وجود ندارد؛
- Roleها میان Migration و برخی Routeها نیازمند یکدست‌سازی‌اند؛
- توکن ارسال‌شده در گفتگو همچنان باید پس از پایان دسترسی جاری تعویض شود.

## Rollback

تغییرات Repository با Revert Commit این اسپرینت قابل بازگشت‌اند. برای تنظیمات GitHub، Rollback باید آگاهانه انجام شود؛ غیرفعال‌کردن Branch Protection توصیه نمی‌شود. در صورت خطای Required Check، Context اشتباه اصلاح می‌شود و Protection دور زده نمی‌شود.

Environmentهای خالی `staging` و `production` داده یا Secret ایجاد نکرده‌اند.

## ورودی اسپرینت ۰۲

اسپرینت بعدی روی Backend Core متمرکز است:

1. تثبیت ماتریس Role؛
2. بررسی Migrationهای Role و Admin؛
3. تست Workflow و Transitionهای مجاز/غیرمجاز؛
4. تست Comment ownership؛
5. یکپارچه‌سازی Error envelope و Request ID؛
6. اجرای Migration واقعی روی PostgreSQL موقت؛
7. افزودن تست‌های Integration به CI؛
8. بررسی نتیجهٔ Workflow اسپرینت ۱ در GitHub.
