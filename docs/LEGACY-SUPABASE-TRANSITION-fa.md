# وضعیت میراث انتقالی Supabase

**به‌روزرسانی:** ۲۰۲۶-۰۸-۲۳

## تصمیم معماری

مسیر Production کاغذ و باد **Node.js/Fastify + PostgreSQL مستقل** است. Migrationهای فعال در `backend/migrations/` قرار دارند و برای Liara DBaaS یا PostgreSQL مستقل طراحی شده‌اند.

Supabase مقصد Production نیست و توسعهٔ قابلیت جدید روی Auth، Edge Function، RPC، Storage یا Database آن ممنوع است.

## وضعیت واقعی Runtime

ممیزی خط مبنای `main@0a7903e` نشان داد:

- `package.json` وابستگی `@supabase/supabase-js` ندارد؛
- در `src/` هیچ import از `@supabase` یا `src/integrations/supabase` وجود ندارد؛
- متغیرهای `VITE_SUPABASE_*` در Environment example فعال وجود ندارند؛
- Backend مستقل APIهای Auth، Content، Workflow، Usage، Billing، Live و Storage را ارائه می‌دهد؛
- CI پوشهٔ `supabase/` را Deploy یا اجرا نمی‌کند.

بنابراین پوشهٔ `supabase/` **Runtime dependency نیست**. این پوشه اکنون آرشیو انتقالی شامل Migrationها و Edge Functionهای قدیمی است.

## دلیل نگهداری موقت آرشیو

فایل‌های تاریخی تا Sprint حذف Legacy فقط برای این موارد نگهداری می‌شوند:

1. تطبیق Schema قدیم با `backend/migrations/`؛
2. شناسایی داده‌هایی که باید Export/Import شوند؛
3. ثبت Mapping و Checksum مهاجرت؛
4. طراحی Rollback و Forward recovery؛
5. اثبات اینکه هیچ رفتار منحصربه‌فردی از Edge Functionها جا نمانده است.

این فایل‌ها نباید Build، Deploy یا منبع Capability جدید باشند.

## Gate حذف کامل

حذف یا انتقال آرشیو فقط پس از این موارد انجام می‌شود:

1. مقایسهٔ جدول‌ها، Enumها، Constraintها و Policyهای قدیمی با PostgreSQL مقصد؛
2. Mapping کاربران، مقاله، رسانه، جلسه، Workflow، Comment و Storage؛
3. Export آزمایشی بدون Secret؛
4. Import روی PostgreSQL موقت/Staging؛
5. تطبیق تعداد رکورد و Checksum؛
6. Smoke و Integration test؛
7. ثبت Backup و Rollback؛
8. تأیید مالک داده.

## منابع فعال مستقل

- API: `backend/src/`؛
- Migration مقصد: `backend/migrations/`؛
- PostgreSQL محلی: `docker-compose.local.yml`؛
- Migration runner: `backend/src/db/migrate.ts`؛
- Object Storage adapter: `backend/src/modules/storage/`؛
- استقرار: `.github/workflows/ci.yml` و Dockerfileها.

## برچسب وضعیت

```text
supabase/ = TRANSITIONAL ARCHIVE — NOT RUNTIME — DO NOT DEPLOY
```
