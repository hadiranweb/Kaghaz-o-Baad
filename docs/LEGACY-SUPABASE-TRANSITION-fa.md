# وضعیت میراث انتقالی Supabase

## تصمیم معماری

مسیر production هدف کاغذ و باد، **Node.js/Fastify + PostgreSQL مستقل** است. migrationهای اجرایی این مسیر در `backend/migrations/` قرار دارند و برای Liara DBaaS یا PostgreSQL روی یک سرور مستقل طراحی شده‌اند.

پوشهٔ اجرایی `supabase/` و dependencyهای مربوط به آن از شاخهٔ کاری حذف شده‌اند. frontend و backend از API مستقل کاغذ و باد استفاده می‌کنند و هیچ import یا اتصال runtime به Supabase ندارند.

## وضعیت اجرای معیار حذف کامل

معیارهای انتقال Auth/session، CRUD محتوا، media، profile، LiveKit، AI و جایگزینی RPCها با backend مستقل انجام شده‌اند. dependency و پوشهٔ اجرایی Supabase حذف شده، build و typecheck باید در CI تأیید شوند و اسناد تاریخی این فایل فقط برای traceability نگه داشته می‌شود. کنارگذاشتن هر دادهٔ منبع قدیمی، مستقل از حذف کد، منوط به export، import آزمایشی، تطبیق شمارش و checksum، تست application و rollback است.

## منابع مستقل فعلی

- schema و migrationهای مقصد: `backend/migrations/`
- API مستقل: `backend/src/`
- پایگاه‌داده محلی: `docker-compose.local.yml`
- اجرای migration: `backend/src/db/migrate.ts`
- آماده‌سازی استقرار: `installer/`
