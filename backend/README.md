# Backend مستقل کاغذ و باد

این پوشه backend مقصد نهایی کاغذ و باد است و طبق قرارداد حاکم پروژه برای اجرای مستقل روی Liara PaaS ساخته می‌شود. این سرویس به سرویس‌های managed خارجی برای Auth یا Edge Function وابسته نیست و PostgreSQL را از طریق اتصال مستقل Liara مصرف می‌کند.

## وضعیت فعلی

نسخهٔ فعلی شامل health endpoint، اعتبارسنجی environment، اتصال PostgreSQL، migration runner، احراز هویت، RBAC، workflow مقاله، usage، quota، billing، subscription، LiveKit و audit است.

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

## قرارداد migration

schema اجرایی فقط از `backend/migrations/` خوانده می‌شود. migration runner جدول `schema_migrations` را با version و checksum مدیریت می‌کند، هر migration را داخل transaction اجرا می‌کند و در صورت اختلاف checksum یا خطای SQL، اجرای release را متوقف می‌سازد.
