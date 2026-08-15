# نصب‌کنندهٔ کاغذ و باد

این پوشه نسخهٔ اولیهٔ installer ویندوزی کاغذ و باد را نگه می‌دارد. installer با Electron و TypeScript ساخته شده و برای این طراحی شده است که کاربر ZIP کامل repository را انتخاب کند، یک workspace جدا بسازد و پروژه را برای یکی از دو مسیر آماده کند.

## مسیرهای استقرار

در نسخهٔ فعلی دو گزینه نمایش داده می‌شود:

1. **زیرساخت Liara:** اجرای frontend و backend روی PaaS، PostgreSQL روی DBaaS، فایل‌ها روی Object Storage و LiveKit روی سرویس یا سرور جدا.
2. **همه‌چیز روی یک سرور:** مسیر آماده‌سازی برای Docker Compose و سرویس‌های هم‌مکان که در مرحلهٔ بعد تکمیل می‌شود.

## اجرای توسعه‌ای

```bash
npm install
npm run check
npm run build
```

برای اجرای رابط Electron در محیط توسعه، باید با محیط گرافیکی ویندوز یا دسکتاپ اجرا شود:

```bash
npm run dev
```

برای ساخت installer ویندوزی:

```bash
npm run package:win
```

## رفتار امنیتی

ZIP عمومی نباید شامل secret باشد. کاربر در wizard، `DATABASE_URL` و `AUTH_JWT_SECRET` را وارد می‌کند؛ این مقادیر فقط در workspace مقصد در فایل‌های env server-side نوشته می‌شوند و در manifest، log یا repository ثبت نمی‌شوند. پس از آماده‌سازی نیز فیلدهای secret از رابط پاک می‌شوند.

نسخهٔ فعلی هنوز deployment واقعی را خودکار نمی‌کند. ابتدا workspace و پیکربندی را می‌سازد و بعد از آن باید مراحل validate، migration و deploy با تأیید کاربر اضافه شوند. این تفکیک برای جلوگیری از اجرای ناخواستهٔ migration یا تغییر زیرساخت production است.
