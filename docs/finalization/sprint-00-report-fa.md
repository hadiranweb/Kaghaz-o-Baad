# گزارش اسپرینت ۰۰ — Baseline و ممیزی اولیه

**تاریخ:** ۲۰۲۶-۰۸-۲۳
**مبنای ممیزی:** `main@0a7903e14f59338223e3883d56e98da25c8fb3e7`
**برنچ کاری:** `integration/product-finalization`

## نتیجهٔ اجرایی

خط مبنا ساخته شد و Buildهای Frontend، Backend و Installer موفق‌اند. با این حال پروژه هنوز Release-ready نیست: Lint فرانت‌اند شکست می‌خورد، تست واحد وجود ندارد، Audit مربوط به Frontend و Installer آسیب‌پذیری‌های حل‌نشده دارد، Integration/Load test اجرا نشده و سیاست استقرار خودکار از `main` بدون ممیزی احراز‌شدهٔ Branch Protection ریسک بالایی دارد.

توکن GitHub که در متن گفتگو ارسال شد افشاشده محسوب می‌شود. پس از تأیید صریح مالک، فقط برای Push همین اسپرینت در حافظهٔ موقت فرایند استفاده شد و در remote URL، فایل‌های Repository یا Git config ذخیره نشد. برنچ و Tag با موفقیت Push شدند؛ با این حال تعویض توکن همچنان توصیه می‌شود.

## خروجی‌های ایجادشده

- برنچ محلی و Remote با نام `integration/product-finalization`؛
- فایل `.nvmrc` با Node `22.12.0`؛
- فایل `.node-version` با Node `22.12.0`؛
- Snapshot ماشین‌خوان `docs/finalization/baseline-2026-08-23.json`؛
- این گزارش؛
- Tag محلی پیشنهادی `pre-finalization-2026-08-23`.

## موجودی Repository

| شاخص | مقدار |
|---|---:|
| فایل‌های Track‌شده | ۳۰۸ |
| Remote branchهای مشاهده‌شده | ۲۱ |
| Migrationهای Backend | ۱۸ |
| فایل‌های Track‌شدهٔ Supabase | ۴۰ |
| Pageهای Frontend | ۲۰ |
| فایل‌های TypeScript در Backend | ۴۶ |
| Route declarationهای Backend | ۸۳ |
| Workflowهای GitHub Actions | ۱ |
| فایل تست واحد | ۰ |
| Smoke/Load test | ۲ |

دو تست موجود عبارت‌اند از:

- `tests/integration/api-smoke.mjs`؛
- `tests/k6/kaghazbaad-api.js`.

این دو تست به Backend در حال اجرا، PostgreSQL و هویت تست نیاز دارند و در محیط فعلی اجرا نشدند.

## Toolchain

| ابزار | محیط ممیزی | قرارداد پروژه/CI |
|---|---:|---:|
| Node.js | `20.20.2` | Node `22` در CI؛ حداقل `22.12.0` برای بخشی از dependencyهای Installer |
| npm | `10.8.2` | قفل‌شده نیست |
| Git | `2.47.3` | — |

Buildها روی Node 20 پاس شدند، اما این نتیجه جای اجرای نهایی روی Node 22 را نمی‌گیرد. برای یکسان‌سازی توسعه، `.nvmrc` و `.node-version` اضافه شدند.

## ماتریس Checkها

| بخش | Check | نتیجه |
|---|---|---|
| Frontend | `npm ci` | ✅ |
| Frontend | `npm run lint` | ❌ ۲۳ خطا و ۱۹ هشدار |
| Frontend | `npm run build` | ✅ |
| Frontend | `npm run verify:seo` | ✅ |
| Frontend | Production dependency audit | ⚠️ دو Moderate |
| Frontend | Full dependency audit | ❌ یک High و سه Moderate |
| Backend | `npm ci` | ✅ |
| Backend | `npm run check` | ✅ |
| Backend | `npm run build` | ✅ |
| Backend | `npm run migrate:dry-run` | ✅ فهرست ۱۸ Migration |
| Backend | Production dependency audit | ✅ صفر آسیب‌پذیری |
| Installer | `npm ci` | ⚠️ هشدار Engine در Node محلی |
| Installer | `npm run check` | ✅ |
| Installer | `npm run build` | ✅ |
| Installer | Production dependency audit | ❌ یک High |
| Repository | Secret pattern scan | ✅ موردی در فایل‌های Track‌شده پیدا نشد |
| Integration | API smoke | ⏸ اجرا نشد |
| Performance | k6 | ⏸ اجرا نشد |
| GitHub | Push برنچ و Tag | ✅ |

## جزئیات Lint

Lint کل Repository را بررسی می‌کند و ۴۲ مورد گزارش داد:

- ۲۳ Error؛
- ۱۹ Warning؛
- `any`های صریح در Live، Dashboard، Media و Rewrite؛
- خطاهای `no-useless-catch` و `no-unused-expressions` در Backend؛
- Hook dependency warningها؛
- interfaceهای خالی در UI primitives؛
- empty block در `LanguageContext`؛
- `require()` در Tailwind config؛
- یک خطای Legacy در Supabase function.

CI فعلی Lint را اجرا نمی‌کند؛ به همین دلیل Workflow سبز است در حالی که Lint شکست می‌خورد.

## Dependency Audit

### Frontend

Production tree دو آسیب‌پذیری Moderate در React Router دارد. Full tree شامل یک High مربوط به Vite و سه Moderate است. ارتقای خودکار با `--force` انجام نشد، چون ممکن است Vite را با Breaking Change ارتقا دهد.

### Backend

Audit وابستگی‌های Production بدون آسیب‌پذیری بود.

### Installer

Production tree یک High در `extract-zip` دارد و Full tree دو High در زنجیرهٔ Electron/`extract-zip` نشان می‌دهد. برای Advisory اصلی `extract-zip` Fix مستقیم گزارش نشد؛ در اسپرینت Supply Chain باید نسخهٔ Electron/Builder یا جایگزین بسته بررسی شود.

## Build و Performance Baseline

Frontend در حدود ۱۵ ثانیه Build شد و SEO verification پاس شد. Sitemap به‌دلیل نبود دسترسی Runtime به API با صفر مقالهٔ منتشرشده ساخته شد؛ این رفتار fallback موفق بود.

Chunkهای مهم:

| Artifact | اندازهٔ Minified |
|---|---:|
| main index chunk | حدود ۹۲۹ KB |
| LiveKit vendor | حدود ۶۶۵ KB |
| PDF vendor | حدود ۳۶۴ KB |
| React vendor | حدود ۲۹۴ KB |
| PDF worker | حدود ۱.۳ MB |

Vite دربارهٔ chunkهای بزرگ‌تر از ۵۰۰ KB هشدار داد. این Baseline ورودی اسپرینت Performance است.

## وضعیت GitHub و استقرار

ممیزی عمومی GitHub نشان داد:

- Repository عمومی و Default branch برابر `main` است؛
- آخرین Workflow روی `main` موفق بوده است؛
- در ده اجرای اخیر چند Push ناموفق و PR موفق دیده می‌شود؛
- تنها Environment قابل مشاهده `github-pages` بود؛
- ممیزی Branch Protection به API احراز‌شده نیاز داشت و کامل نشد؛
- Push بدون Credential از پیش تنظیم‌شده ممکن نبود؛ پس از تأیید مالک، برنچ تجمیع و Tag مبنا با Credential موقت Push شدند.

CI موجود روی Push موفق به `main`، Liara Production را Deploy می‌کند. تا زمان احراز Branch Protection، Push مستقیم به `main` ممنوع تلقی می‌شود.

## Secret Scan

الگوهای زیر در فایل‌های Track‌شده پیدا نشدند:

- Private keyهای RSA/OpenSSH/EC؛
- الگوهای رایج OpenAI و Google API key؛
- فایل‌های `.env` واقعی، PEM یا KEY خارج از Exampleها.

این Scan جایگزین ابزار کامل مانند Gitleaks و ممیزی تاریخچه نیست و باید در اسپرینت Supply Chain تقویت شود.

## Blockerهای Release

1. Revoke و جایگزینی Credential افشاشدهٔ GitHub؛
2. احراز و فعال‌سازی Branch Protection برای `main`؛
3. رفع ۲۳ خطای Lint؛
4. ایجاد تست واحد و Integration واقعی؛
5. رسیدگی به High advisoryهای Frontend/Installer؛
6. اجرای تست‌ها روی Node 22؛
7. ساخت Staging مستقل از Production؛
8. اجرای Migration روی PostgreSQL موقت، نه فقط enumeration در Dry-run؛
9. اجرای API smoke و k6؛
10. تعریف Rollback قابل اجرا برای Production.

## ریسک‌های باز

- Build موفق بدون تست رفتاری، سلامت Runtime را تضمین نمی‌کند؛
- ۸۳ Route Backend با صفر تست واحد سطح حمله و regression بالایی دارند؛
- Supabase هنوز ۴۰ فایل Track‌شده دارد و وضعیت archive/runtime باید تعیین شود؛
- Production خودکار از `main` به Branch Protection وابسته است؛
- Chunkهای بزرگ می‌توانند LCP/INP موبایل را تضعیف کنند؛
- Installer دارای High advisory حل‌نشده است.

## Rollback اسپرینت ۰۰

این اسپرینت Runtime را تغییر نمی‌دهد. برای بازگشت:

```bash
git switch main
git branch -D integration/product-finalization
git tag -d pre-finalization-2026-08-23
```

## ورودی اسپرینت ۰۱

1. تعویض Credential افشاشده و تنظیم روش پایدار احراز هویت خارج از گفتگو؛
2. ممیزی Branch Protection و GitHub Environments با دسترسی احراز‌شده؛
3. اصلاح قرارداد Deployment در انتهای CI؛
4. همگام‌سازی README/Roadmap با کد واقعی؛
5. افزودن Lint به CI پس از تعیین برنامهٔ رفع baseline؛
6. تعیین سیاست artifactهای Lighthouse و گزارش‌ها؛
7. ثبت ADR برای خط معماری Production.
