# Backend مستقل کاغذ و باد

این پوشه backend مقصد نهایی کاغذ و باد است و طبق قرارداد حاکم پروژه برای اجرای مستقل روی Liara PaaS ساخته می‌شود. این سرویس به Supabase، Edge Function یا Supabase Auth وابسته نیست.

## وضعیت فعلی

نسخهٔ فعلی فقط اسکلت امن و قابل‌اجرا، health endpoint، اعتبارسنجی environment و Dockerfile دارد. هنوز اتصال PostgreSQL، احراز هویت، RBAC، workflow مقاله، usage و payment در آن فعال نشده‌اند.

## اجرای محلی

```bash
cp .env.example .env
npm install
npm run dev
```

برای build production:

```bash
npm run check
npm run build
npm start
```

Endpointهای فعلی:

- `GET /health`
- `GET /api/v1/health`

## قرارداد استقرار

در Liara مقدار `PORT` باید از environment سرویس خوانده شود. `DATABASE_URL`، `AUTH_JWT_SECRET` و تمام secretهای integration فقط در تنظیمات server-side قرار می‌گیرند و هرگز در frontend یا Git commit نمی‌شوند.

## گام‌های بعدی

ترتیب توسعه اجباری چنین است: PostgreSQL schema مقصد، migration runner، session/auth، RBAC، workflow مقاله، comment و activity، سپس usage/quota و پرداخت. تا قبل از تکمیل این مسیر، کدهای موجود در `supabase/` فقط transitional هستند و deploy نمی‌شوند.
