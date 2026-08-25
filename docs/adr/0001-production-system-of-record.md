# ADR-0001: منبع حقیقت Production

- **وضعیت:** Accepted
- **تاریخ:** ۲۰۲۶-۰۸-۲۳

## زمینه

Repository از یک معماری Supabase-based به Backend مستقل منتقل شده است. اسناد قدیمی هنوز گاهی Edge Function، RPC و Environmentهای Supabase را مسیر فعال معرفی می‌کنند.

## تصمیم

- Backend مبتنی بر Fastify مالک منطق کسب‌وکار و API است.
- PostgreSQL مستقل روی Liara DBaaS منبع حقیقت داده است.
- `backend/migrations/` تنها مسیر Migration فعال است.
- Object Storage سازگار با S3 محل فایل‌هاست.
- `supabase/` آرشیو انتقالی و خارج از Runtime/CI/CD است.
- Browser فقط از API Backend استفاده می‌کند و مجاز به تصمیم‌گیری دربارهٔ Role، Workflow، Quota یا Payment نیست.

## پیامدها

- توسعهٔ جدید روی Supabase ممنوع است.
- حذف آرشیو پس از تطبیق داده و Rollback انجام می‌شود.
- README، Environmentها، تست و Runbook باید با Backend مستقل همگام باشند.
