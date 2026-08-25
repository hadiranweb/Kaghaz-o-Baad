# برنامهٔ نهایی‌سازی و آماده‌سازی Production پروژهٔ کاغذ و باد

**تاریخ مبنا:** ۱۴۰۵/۰۶/۰۱ (2026-08-23)
**مخزن:** `hadiranweb/Kaghaz-o-Baad`
**خط مبنا:** `main@0a7903e`
**روش اجرا:** اسپرینت‌های متوالی در همین گفت‌وگو، با خروجی کد، تست، گزارش و نقطهٔ بازگشت برای هر اسپرینت

---

## ۱. هدف نهایی

هدف فقط Merge کردن برنچ‌ها نیست. خروجی باید یک Release Candidate قابل استقرار باشد که این ویژگی‌ها را داشته باشد:

- یک خط توسعهٔ معتبر و قابل ردیابی؛
- Frontend و Backend قابل Build و Test؛
- Migrationهای امن و قابل Rollback؛
- احراز هویت، RBAC و Workflow قابل اتکا؛
- رسانه، پخش زنده، ایمیل، AI و پرداخت با مرزهای روشن؛
- CI/CD دارای محیط staging، کنترل انتشار و rollback؛
- Observability، Backup، Runbook و پاسخ‌گویی به رخداد؛
- رابط فارسی/انگلیسی، دسترس‌پذیر و دارای بودجهٔ عملکرد؛
- عدم وجود Secret در Git؛
- Production launch کنترل‌شده و قابل بازگشت.

---

## تصمیم‌های آغاز مورد توافق

- **تناوب Push:** پایان هر اسپرینت؛ هر اسپرینت یک Commit/Push مستقل و قابل بازگشت دارد.
- **دامنهٔ نوآوری:** گسترده و آینده‌نگر، ولی همهٔ قابلیت‌های آزمایشی پشت Feature Flag و با Kill Switch.
- **وضعیت محیط:** نامشخص؛ دسترسی GitHub، GitHub Environments، Liara و Staging در Sprint 0 ممیزی می‌شوند.
- **سیاست انتشار:** Production به‌صورت خودکار از `main`؛ بنابراین Push مستقیم به `main` ممنوع، Branch Protection و Required Checks اجباری، و فقط Merge کنترل‌شده به `main` مجاز است.

## ۲. راهبرد Git و تجمیع

### خط توسعه

یک برنچ تجمیع از `main` فعلی ساخته می‌شود:

```text
main@0a7903e
    └── integration/product-finalization
          ├── sprint/00-baseline
          ├── sprint/01-repository-contract
          ├── sprint/02-backend-core
          ├── ...
          └── release/1.0.0-rc.1
```

### قواعد

1. `main` تا آماده‌شدن Release Candidate منبع Production فعلی باقی می‌ماند.
2. برنچ‌های قدیمی مستقیماً Merge نمی‌شوند.
3. تغییرات مفید آن‌ها با `cherry-pick` انتخابی یا بازپیاده‌سازی روی خط جدید منتقل می‌شوند.
4. هر اسپرینت یک Commit/PR مستقل، گزارش تست و rollback note دارد.
5. حذف Supabase، ورود AI Stack و انتقال UI جامع هرکدام Gate مستقل دارند.
6. استقرار Production بدون تأیید صریح انجام نمی‌شود.

---

## ۳. Definition of Done مشترک

هر اسپرینت فقط زمانی تمام است که موارد مرتبط زیر پاس شوند:

```bash
npm ci
npm run build
npm run verify:seo
npm --prefix backend ci
npm --prefix backend run check
npm --prefix backend run build
npm --prefix backend run migrate:dry-run
npm --prefix installer ci
npm --prefix installer run check
npm --prefix installer run build
```

به‌علاوه:

- تست‌های جدید برای رفتار جدید؛
- عدم وجود Secret یا فایل محیط واقعی؛
- مستندات و `.env.example` همگام؛
- Migration دارای مسیر rollback یا forward recovery؛
- تست RTL/LTR و Accessibility برای تغییرات UI؛
- ثبت ریسک‌های باقیمانده؛
- Commit تمیز و قابل بازگشت.

---

# ۴. نقشهٔ اسپرینت‌ها

## اسپرینت ۰ — Baseline و ممیزی قابل تکرار

### هدف

ساخت خط مبنای قابل اعتماد پیش از هر تجمیع.

### کارها

- Clone کاری از `main@0a7903e`؛
- ایجاد `integration/product-finalization`؛
- ثبت نسخه‌های Node، npm، PostgreSQL و ابزارها؛
- اجرای همهٔ Buildها و Checkهای موجود؛
- فهرست‌کردن تست‌های موجود و خلأهای تست؛
- اجرای Secret scan و Dependency audit؛
- تهیهٔ inventory از API، route، migration، env و deployment؛
- ثبت اندازهٔ bundle و وضعیت فعلی SEO؛
- ایجاد tag محلی/پیشنهادی `pre-finalization-2026-08-23`.

### Gate خروج

گزارش baseline باید دقیقاً نشان دهد چه چیزهایی پاس و چه چیزهایی خراب است؛ هیچ خطای موجود پنهان نمی‌شود.

---

## اسپرینت ۱ — قرارداد معماری و پاک‌سازی منبع حقیقت

### هدف

رفع تناقض میان کد، README، Roadmap و Workflowها.

### کارها

- به‌روزرسانی وضعیت واقعی Roadmap هشت‌مرحله‌ای؛
- اصلاح README دربارهٔ Supabase، Liara و متغیرهای محیطی؛
- اعمال اصلاح کوچک PR #2 دربارهٔ قرارداد استقرار خودکار؛
- تعریف دقیق مرز Frontend، Backend، Worker، Installer و AI Stack؛
- ثبت Architecture Decision Record برای PostgreSQL مستقل و Liara؛
- تعریف سیاست نگهداری artifactهای Lighthouse خارج از Git؛
- تکمیل `.gitignore` برای گزارش‌های تولیدی.

### Gate خروج

یک توسعه‌دهندهٔ جدید باید فقط با اسناد repository بتواند معماری واقعی و مسیر استقرار را بفهمد.

---

## اسپرینت ۲ — تجمیع و تثبیت Backend Core

### هدف

اثبات اینکه Backend مستقل منبع حقیقت محصول است.

### کارها

- ممیزی routeهای Auth، Content، Workflow و Comment؛
- بررسی RBAC و ownership در تمام transitionها؛
- بررسی idempotency و transaction boundaries؛
- تکمیل تست Workflow برای author/editor/admin؛
- تست transitionهای غیرمجاز؛
- تست comment و audit event؛
- یکپارچه‌سازی error envelope و request ID؛
- بازبینی migration runner و ترتیب migrationها.

### Gate خروج

Workflow مقاله، Comment، RBAC و Audit در تست integration قابل اثبات باشند.

---

## اسپرینت ۳ — احراز هویت، Verification و Session Security

### هدف

آماده‌سازی Auth برای Production.

### کارها

- ممیزی registration/login/logout/session؛
- تست OTP شماره ایران و Email verification؛
- rate limit برای login، OTP و recovery؛
- expiration، replay prevention و lockout؛
- بررسی cookie flags، CORS، CSRF و trusted proxy؛
- rotation/validation برای secretها؛
- ممیزی نقش‌های admin/editor/author؛
- تست session revocation.

### Gate خروج

Threat checklist احراز هویت بدون ریسک Critical/High باز.

---

## اسپرینت ۴ — Mailbox Worker و ایمیل عملیاتی

### هدف

تثبیت آخرین خط توسعهٔ Production موجود در `main`.

### کارها

- تست claim query و رقابت چند Worker؛
- تست retry، backoff، dead-letter و idempotency؛
- تست health/readiness؛
- جلوگیری از duplicate email؛
- تست shutdown ایمن؛
- observability برای queue depth، failure و latency؛
- تست migration شماره ۱۸ و mailbox provisioning؛
- runbook خرابی Liara Mail.

### Gate خروج

اجرای هم‌زمان Worker باعث duplicate، starvation یا از دست‌رفتن پیام نشود.

---

## اسپرینت ۵ — حذف کنترل‌شدهٔ Legacy Supabase

### هدف

انتقال بخش معتبر Commit `5806609` بدون از بین بردن دارایی مهاجرتی ضروری.

### کارها

- اثبات عدم وجود import یا dependency Runtime؛
- دسته‌بندی `supabase/` به runtime، migration archive و rollback asset؛
- نگهداری migrationهای تاریخی لازم در archive خارج از مسیر اجرا؛
- انتقال اصلاحات README و SystemWiki؛
- حذف envها و dependencyهای منسوخ؛
- اجرای Build و smoke test پس از حذف؛
- ثبت راهنمای بازیابی داده و rollback.

### Gate خروج

هیچ Runtime به Supabase وابسته نباشد و تاریخچهٔ لازم برای مهاجرت/بازیابی نیز از دست نرود.

---

## اسپرینت ۶ — Storage، Media و Object Storage

### هدف

Production-ready کردن رسانه و سهمیهٔ ذخیره‌سازی.

### کارها

- signed URL، ownership و ACL؛
- محدودیت نوع/حجم فایل و filename normalization؛
- quota اتمیک و تست race condition؛
- multipart upload و cleanup فایل ناقص؛
- antivirus/malware integration point؛
- lifecycle و orphan cleanup؛
- تست public/private/shared؛
- CORS و cache policy Object Storage.

### Gate خروج

کاربر نتواند فایل دیگری را بخواند/حذف کند یا از quota عبور کند.

---

## اسپرینت ۷ — LiveKit و جلسات زنده

### هدف

تثبیت قابلیت‌های Live که قبلاً توسعه یافته‌اند.

### کارها

- token grant بر اساس نقش و مالکیت؛
- webhook signature و idempotency؛
- room lifecycle و moderation؛
- reconnect و network degradation؛
- recording/archive consent؛
- E2EE key-flow و جلوگیری از log شدن کلید؛
- quota زمان جلسه؛
- تست host/viewer و پایان جلسه؛
- runbook قطع LiveKit.

### Gate خروج

سناریوی کامل ایجاد اتاق تا پایان، reconnect و webhook تکراری در staging پاس شود.

---

## اسپرینت ۸ — Usage Gateway، Quota و Entitlement

### هدف

ساخت مرز اقتصادی قابل اعتماد برای AI و قابلیت‌های مصرفی.

### کارها

- ممیزی `usage/gateway` و repository؛
- request ID و attribution provider/model؛
- ثبت token و هزینه؛
- quota check اتمیک؛
- reservation/commit/rollback مصرف؛
- تست concurrency و retry؛
- entitlement cache invalidation؛
- گزارش مصرف برای کاربر و مدیر.

### Gate خروج

Frontend نتواند مصرف را جعل کند و درخواست‌های هم‌زمان نتوانند از quota عبور کنند.

---

## اسپرینت ۹ — Billing، Subscription و پرداخت

### هدف

آماده‌سازی پرداخت برای پول واقعی.

### کارها

- ممیزی invoice، subscription و entitlement؛
- Zarinpal/IDPay sandbox؛
- callback verification سمت سرور؛
- idempotency callback؛
- expiration و payment reconciliation؛
- فعال‌سازی/تمدید/لغو subscription؛
- audit مالی؛
- تست callback موفق، ناموفق، تکراری و دستکاری‌شده؛
- سیاست refund و پشتیبانی.

### Gate خروج

هیچ پرداختی صرفاً با دادهٔ Browser تأیید نشود و تکرار callback اثر دوباره نداشته باشد.

---

## اسپرینت ۱۰ — AI Provider و Automation Stack

### هدف

انتقال کنترل‌شدهٔ بخش معتبر Commit `3feee53`.

### کارها

- تثبیت AI provider adapter؛
- timeout، retry، circuit breaker و redaction؛
- جلوگیری از ارسال PII/Secret؛
- n8n با webhook امضاشده؛
- Open WebUI و OpenClaw پشت احراز هویت؛
- network boundary و allowlist؛
- deployهای مستقل به جای coupling با deploy اصلی؛
- health check و rollback هر سرویس؛
- approval انسانی برای انتشار خروجی AI.

### Gate خروج

خرابی AI Stack نباید Frontend، Auth، Workflow یا انتشار مقاله را مختل کند.

---

## مسیر نوآوری گسترده — اسپرینت‌های ۱۰A تا ۱۰F

این مسیر بعد از تثبیت Auth، Usage/Quota و مرزهای داده آغاز می‌شود. هیچ قابلیت آزمایشی نباید Release هسته را مسدود کند و همه باید Feature Flag، Kill Switch، Audit و بودجهٔ مصرف داشته باشند.

### اسپرینت ۱۰A — Editorial AI Copilot

- پیشنهاد عنوان، ساختار، بازنویسی و خلاصه؛
- citation و provenance؛
- approval انسانی؛
- عدم انتشار خودکار؛
- ثبت مدل، token، latency و هزینه.

### اسپرینت ۱۰B — Semantic Search و RAG

- جست‌وجوی hybrid متن کامل و embedding؛
- index versioning و re-index؛
- پاسخ مبتنی بر منابع داخلی با citation؛
- کنترل دسترسی سند پیش از retrieval؛
- جلوگیری از نشت محتوای private.

### اسپرینت ۱۰C — Live Intelligence

- transcription اختیاری با consent؛
- chaptering، summary و draft Addendum؛
- استخراج پرسش‌ها و تصمیم‌ها؛
- تأیید میزبان پیش از انتشار؛
- retention و حذف دادهٔ صوتی/متنی.

### اسپرینت ۱۰D — Agentic Workflows

- orchestration در n8n؛
- runtime عامل در OpenClaw؛
- workspace کنترل‌شده در Open WebUI؛
- tool allowlist، budget، timeout و approval؛
- event log و قابلیت replay امن؛
- عدم دسترسی مستقیم Agent به Production DB.

### اسپرینت ۱۰E — همکاری بلادرنگ

- presence و co-editing کنترل‌شده؛
- comment/mention و conflict policy؛
- autosave و revision history؛
- reconnect و offline conflict handling؛
- مجوز مستقل read/edit/publish.

### اسپرینت ۱۰F — PWA و مطالعهٔ آفلاین

- installable PWA؛
- cache امن مقالات مجاز؛
- offline reading و draft queue؛
- sync پس از reconnect؛
- عدم cache دادهٔ حساس روی دستگاه مشترک؛
- versioned cache invalidation.

## اسپرینت ۱۱ — Foundation رابط کاربری جامع

### هدف

انتقال بخش پایه از `feat/comprehensive-mengto-skills-ui` روی `main` فعلی.

### کارها

- design tokenها؛
- فونت محلی و typography؛
- motion primitives؛
- reduced-motion؛
- shared state contracts؛
- حذف reportهای خام از Commitها؛
- تعیین bundle budget؛
- Visual baseline.

### Gate خروج

Foundation بدون تغییر رفتار business و بدون regression در Build/SEO وارد شود.

---

## اسپرینت ۱۲ — Homepage، About و Editorial Navigation

### هدف

انتقال لایهٔ روایت محصول و UI اصلی.

### کارها

- حل تعارض `Home.tsx` و `AboutProject.tsx`؛
- Paper/Wind Hero؛
- Shelf و Navigation Dock؛
- دادهٔ واقعی و fallback؛
- RTL/LTR؛
- keyboard و screen reader؛
- حفظ canonical، structured data و prerender.

### Gate خروج

Home و About در موبایل/دسکتاپ، فارسی/انگلیسی و reduced-motion قابل استفاده باشند.

---

## اسپرینت ۱۳ — Page-Turn Reader و Article Experience

### هدف

انتقال قابلیت محوری Reader از برنچ جامع UI.

### کارها

- state machine ورق‌زدن؛
- اتصال به دادهٔ واقعی مقاله؛
- touch/drag/click/keyboard؛
- RTL page direction؛
- fallback ساده بدون motion؛
- حفظ متن کامل، منابع و navigation؛
- lazy loading؛
- تست state و interaction.

### Gate خروج

Reader با دادهٔ واقعی، deep-link، refresh و دستگاه ضعیف درست کار کند.

---

## اسپرینت ۱۴ — SEO، Accessibility، i18n و Performance

### هدف

Hardening عمومی Frontend.

### کارها

- WCAG 2.2 AA برای مسیرهای اصلی؛
- focus order، contrast و screen reader؛
- parity فارسی/انگلیسی؛
- canonical، sitemap، robots و JSON-LD؛
- CSP و security headers؛
- LCP/CLS/INP budgets؛
- route/chunk lazy loading؛
- تست Lighthouse تکرارپذیر با خلاصه، نه artifact خام در Git.

### Gate خروج

هیچ regression بحرانی در Accessibility، SEO یا Core Web Vitals وجود نداشته باشد.

---

## اسپرینت ۱۵ — CI/CD، Environment و Supply Chain

### هدف

تبدیل CI فعلی به خط انتشار قابل کنترل.

### کارها

- تفکیک validation، staging و production؛
- GitHub Environment protection؛
- approval دستی Production؛
- pin کردن actionها و dependency policy؛
- migration gate پیش از deploy؛
- deploy ترتیبی Backend/Worker/Frontend؛
- health verification پس از deploy؛
- rollback خودکار/دستی؛
- SBOM، dependency audit و secret scan؛
- artifact retention.

### Gate خروج

یک Release Candidate بدون دستکاری دستی و با rollback مستند به staging برود.

---

## اسپرینت ۱۶ — Observability، Backup و Incident Readiness

### هدف

قابل اداره‌کردن Production پس از انتشار.

### کارها

- structured logs و correlation ID؛
- metrics برای API، DB، Worker، LiveKit و AI؛
- error tracking و alerting؛
- uptime checks؛
- PostgreSQL backup و restore drill؛
- Object Storage recovery؛
- log retention و حذف PII؛
- runbookهای outage، DB، email، payment و LiveKit؛
- تعریف SLO و alert thresholds.

### Gate خروج

Restore آزمایشی و حداقل یک tabletop incident drill موفق باشد.

---

## اسپرینت ۱۷ — Staging، E2E، Load و UAT

### هدف

اثبات آمادگی Release Candidate.

### سناریوهای اجباری

1. ثبت‌نام و Verification؛
2. ورود و نقش‌ها؛
3. ساخت، ویرایش، Review و انتشار مقاله؛
4. Comment و Audit؛
5. آپلود و اشتراک رسانه؛
6. Reader و Deck؛
7. ایجاد و پایان جلسهٔ زنده؛
8. ایمیل و Mailbox Worker؛
9. AI request با quota؛
10. خرید/تمدید subscription در sandbox؛
11. backup/restore؛
12. rollback نسخه.

### Gate خروج

هیچ باگ Blocker/Critical، هیچ High security issue و هیچ migration بدون recovery باقی نماند.

---

## اسپرینت ۱۸ — Production Launch و Hypercare

### هدف

انتشار کنترل‌شدهٔ نسخهٔ نهایی.

### کارها

- Release freeze؛
- backup قبل از انتشار؛
- migration نهایی؛
- deploy Backend و health check؛
- deploy Worker و queue verification؛
- deploy Frontend؛
- smoke test دامنه‌های واقعی؛
- فعال‌سازی تدریجی AI/Payment/Live؛
- مانیتورینگ فشرده؛
- rollback در صورت عبور از threshold؛
- Tag و Release Notes؛
- برنامهٔ Hypercare حداقل ۲۴ تا ۷۲ ساعت.

### Gate خروج

SLOها پایدار، خطاها زیر آستانه و Runbook تحویل تیم بهره‌برداری شده باشد.

---

# ۵. اولویت و مسیر بحرانی

```text
Baseline
  → Backend/Auth
  → Mail Worker
  → Supabase retirement
  → Storage/LiveKit
  → Usage/Quota
  → Billing/AI
  → UI consolidation
  → CI/CD/Observability
  → Staging/UAT
  → Production
```

مسیر UI می‌تواند پس از تثبیت قراردادهای Backend در اسپرینت ۸ آغاز شود؛ اما Merge نهایی آن باید روی APIهای تثبیت‌شده انجام شود. Installer مسیر تحویل جانبی است و در هر اسپرینت فقط برای سازگاری env و deployment بررسی می‌شود.

---

# ۶. شیوهٔ پیشروی در همین گفت‌وگو

برای هر اسپرینت این چرخه اجرا می‌شود:

1. اعلام هدف و محدوده؛
2. بررسی کد و ثبت وضعیت قبل؛
3. ایجاد تغییرات در workspace؛
4. اجرای تست‌ها و Build؛
5. رفع خطاها؛
6. ثبت گزارش اسپرینت؛
7. ارائهٔ فایل‌ها و Diff؛
8. تصمیم ادامه/بازگشت؛
9. حرکت به اسپرینت بعد.

هر اسپرینت باید فایل گزارش داشته باشد:

```text
docs/finalization/sprint-XX-report-fa.md
```

و در آن این موارد ثبت شود:

- تغییرات؛
- تست‌های اجراشده؛
- نتایج؛
- ریسک‌های باز؛
- تصمیم‌های معماری؛
- rollback؛
- ورودی اسپرینت بعد.

---

# ۷. نقاطی که به تأیید یا دسترسی مالک نیاز دارند

اجرای محلی، اصلاح کد و تست را می‌توان در همین محیط انجام داد. موارد زیر در Gate مربوطه به مشارکت مالک نیاز دارند:

- Push و Merge در GitHub؛
- تنظیم Branch Protection و GitHub Environments؛
- Secretهای Liara، SMS.ir، Mail، LiveKit و Payment؛
- دسترسی PostgreSQL/Object Storage؛
- دامنه و DNS؛
- تصمیم تجاری پلن‌ها و قیمت‌ها؛
- اجرای migration واقعی Production؛
- تأیید نهایی انتشار و rollback.

هیچ Secret واقعی نباید در گفت‌وگو یا فایل‌های repository قرار گیرد.
