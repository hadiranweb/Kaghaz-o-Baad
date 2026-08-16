# وضعیت میراث انتقالی Supabase

## تصمیم معماری

مسیر production هدف کاغذ و باد، **Node.js/Fastify + PostgreSQL مستقل** است. migrationهای اجرایی این مسیر در `backend/migrations/` قرار دارند و برای Liara DBaaS یا PostgreSQL روی یک سرور مستقل طراحی شده‌اند.

پوشهٔ `supabase/` فعلاً به‌عنوان میراث انتقالی نگه داشته می‌شود، زیرا بخشی از frontend موجود هنوز از `src/integrations/supabase/` و `@supabase/supabase-js` استفاده می‌کند. حذف این پوشه یا dependency در وضعیت فعلی باعث خراب شدن build یا بخشی از قابلیت‌های سایت می‌شود.

## معیار حذف کامل

حذف Supabase فقط پس از انجام همهٔ موارد زیر مجاز است:

1. انتقال Auth و session به endpointهای مستقل backend.
2. انتقال CRUD مقاله، community، media و profile به API مستقل.
3. انتقال storage و URLهای رسانه به Liara Object Storage.
4. جایگزینی RPCها و Edge Functionهای استفاده‌شده در frontend.
5. حذف همهٔ importهای `@/integrations/supabase` و `@supabase/supabase-js`.
6. اجرای build frontend، تست integration و smoke test روی staging.
7. ثبت rollback و تأیید سلامت داده‌های منتقل‌شده.

تا پیش از عبور از این معیارها، Supabase نباید به‌عنوان مسیر جدید توسعه یا production استفاده شود؛ فقط کد انتقالی موجود است.

## منابع مستقل فعلی

- schema و migrationهای مقصد: `backend/migrations/`
- API مستقل: `backend/src/`
- پایگاه‌داده محلی: `docker-compose.local.yml`
- اجرای migration: `backend/src/db/migrate.ts`
- آماده‌سازی استقرار: `installer/`
