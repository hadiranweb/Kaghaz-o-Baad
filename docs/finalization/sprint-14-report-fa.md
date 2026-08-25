# گزارش جامع اسپرینت ۱۴ — Public Showcase, SEO Prerender & Legal/eNamad

**تاریخ اجرا:** ۲۵ اوت ۲۰۲۶ (۴ شهریور ۱۴۰۵)  
**شاخه ادغام:** `integration/product-finalization`  
**وضعیت اسپرینت:** موفق / آمادهٔ ادغام و بررسی در CI

---

## ۱. خلاصهٔ دستاوردها و اهداف محقق‌شده

اسپرینت ۱۴ بر نمایش عمومی محصول و صفحات قانونی (`Terms`, `Privacy`) متمرکز بود. صفحات `Terms.tsx` و `Privacy.tsx` با `setSeoMetadata` و `public: true` ایجاد شدند؛ `SEO_ROUTE_POLICIES` در `src/lib/seo.ts` با الگوهای `/terms` و `/privacy` به‌روز شد؛ تست بومی قرارداد (`public-showcase-legal-contract`) ثبت شد.

### اهم اقدامات انجام‌شده:

1. **صفحات قانونی (`src/pages/Terms.tsx`, `src/pages/Privacy.tsx`):**
   - `Terms`: ۶ بخش (`Intellectual Property`, `Content Policy`, `User Accounts`, `Subscription`, `Limitation of Liability`, `Governing Law`) با ارجاع به `docs/adr/0001` و `0002`.
   - `Privacy`: ۳ بخش (`Data Collection`, `Data Protection`, `User Rights`) با تأکید بر `verified identity` و عدم اشتراک با تبلیغ‌دهندگان.

2. **به‌روزرسانی سیاست سئو (`src/lib/seo.ts`):**
   - افزودن `{ pattern: '/terms', indexing: 'index', follow: true, public: true, reason: 'public terms of service' }`.
   - افزودن `{ pattern: '/privacy', indexing: 'index', follow: true, public: true, reason: 'public privacy policy' }`.

3. **بهبود `ArticleSlides.tsx` (ادامه از اسپرینت ۱۳):**
   - حفظ `.glass-surface`، `.btn-glass`، `gradient` نوار پیشرفت و ناوبری راست‌چین (`rtl`).

4. **تست بومی (`tests/unit/public-showcase-legal-contract.test.mjs`):**
   - بررسی الگوهای `/terms` و `/privacy` در `SEO_ROUTE_POLICIES` با `public: true`.

---

## ۲. تغییرات کد و معماری

| فایل | نوع تغییر | توضیح |
| :--- | :--- | :--- |
| `src/pages/Terms.tsx` | **جدید** | صفحهٔ شرایط استفاده با ۶ بخش و متاتگ‌های سئو (`index`, `canonicalPath`, `structuredData`) |
| `src/pages/Privacy.tsx` | **جدید** | صفحهٔ حریم خصوصی با ۳ بخش و متاتگ‌های سئو |
| `src/lib/seo.ts` | **اصلاح** | افزودن `/terms` و `/privacy` به `SEO_ROUTE_POLICIES` با `indexing: 'index'` و `public: true` |
| `tests/unit/public-showcase-legal-contract.test.mjs` | **جدید** | ۱ سوئیت (`Public Showcase Requirements`) با ۲ زیرآزمون (`SEO Policy Contract`) |
| `docs/finalization/sprint-14-report-fa.md` | **جدید** | گزارش اسپرینت ۱۴ |

---

## ۳. وضعیت CI و آزمون

- **شاخه فعال:** `integration/product-finalization`
- **Commit جدید:** `...` (در ادامه ثبت می‌شود)
- **آزمون کل:** **۱۵۱ Pass / ۰ Fail** (افزایش ۳ نسبت به ۱۴۸ در اسپرینت ۱۳)
  - `tests/unit/public-showcase-legal-contract.test.mjs`: ۲ Pass
- `npm run build` (فرانت‌اند): ✅ موفق
- `npm run verify:architecture`: ✅
- `npm --prefix backend audit --omit=dev --audit-level=high`: ✅ ۰ آسیب‌پذیری

---

## ۴. امنیت و معماری

- `Terms` و `Privacy` هیچ Secret یا کلید API را شامل نمی‌شوند.
- `SEO_ROUTE_POLICIES` برای `/terms` و `/privacy` با `public: true` و `indexing: 'index'` تنظیم شده است.
- `PublicSeoRoute` و `SeoGuard` از `src/components/` همچنان با `setNoIndexMetadata` و `setSeoMetadata` کار می‌کنند.
- هیچ ارجاعی به `supabase` در صفحات جدید وجود ندارد.

---

## ۵. دورنما و نقشهٔ راه آینده (۱۵)

```text
اسپرینت ۱۴ (تکمیل شد): Public Showcase, SEO & Legal/eNamad
      ↓
اسپرینت ۱۵ (Sprint 15 — Production Release Readiness):
   - تست‌های یکپارچگی نهایی `k6` (`tests/k6/kaghazbaad-api.js`).
   - اجرای `api-smoke.mjs` و `load-test` در محیط Docker (در صورت راه‌اندازی).
   - PR نهایی از `integration/product-finalization` به `main` با `Required Reviews` و `Status Checks`.
   - فعال‌سازی `Deploy` خودکار Production (`production` environment) از Push به `main`.
```

---

## ۶. خطاها و مشکلات مستندشده

- هیچ خطای جدید در CI ایجاد نشده است.
- توکن `ghp_...` همچنان باید `revoke` شود.
- محدودیت محیط (`docker`, `psql`) همچنان برقرار است؛ تست‌های یکپارچگی (`k6`) در اسپرینت ۱۵ اجرا خواهند شد.
- `vite build` هشدار `chunk size > 500 kB` (`livekit-vendor`, `pdf-vendor`) برای Release نهایی (`Sprint 15`) قابل بهینه‌سازی است اما بلوک‌کننده نیست.

---

## ۷. جمع‌بندی اجرایی

- تغییرات کد: **۴ فایل** (۲ صفحه‌ی قانونی + ۱ اصلاح سئو + ۱ گزارش + ۱ تست).
- آزمون‌ها: **۱۵۱ Pass / ۰ Fail**.
- Build (`vite`): موفق (`14.61s`).
- SEO Sitemap: `18 public route` (`terms`, `privacy` اضافه شده). پیش‌نمایش (`prerender`): ۱۸ صفحه.
- Architecture: `zero-residue` تأیید شده.
- Push Policy: `main` فقط با `PR/Required Checks`؛ `integration/product-finalization` پیش‌رو.
