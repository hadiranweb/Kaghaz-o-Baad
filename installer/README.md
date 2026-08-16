# نصب‌کنندهٔ ویندوزی کاغذ و باد

این پوشه سورس **installer ویندوزی** کاغذ و باد را نگه می‌دارد. کاربر repository را همراه EXE روی رایانهٔ خود دارد و فقط فایل EXE installer را اجرا می‌کند. installer هیچ deployment، upload، migration، اتصال به پایگاه‌داده، DNS، SSL یا عملیات زیرساختی انجام نمی‌دهد؛ تنها وظیفهٔ آن آماده‌سازی کد و ساخت یک کپی نهایی در پوشهٔ جداگانه است.

## جریان کار کاربر

کاربر repository را همراه EXE در اختیار دارد؛ EXE ریشهٔ repository والد خود را به‌صورت خودکار تشخیص می‌دهد و فقط مسیر یک workspace جدید را از کاربر می‌گیرد. سپس یکی از دو مقصد رسمی را انتخاب می‌کند: **زیرساخت Liara** یا **همه‌چیز روی یک سرور**. بر اساس مقصد انتخاب‌شده، installer اطلاعات لازم مانند نشانی API، نشانی frontend، `DATABASE_URL`، `AUTH_JWT_SECRET`، Object Storage، LiveKit و token/APIهای موردنیاز نسخهٔ پروژه را دریافت می‌کند.

پس از تکمیل فرم، installer ابتدا یک **پیش‌نمایش امن** ارائه می‌دهد. این پیش‌نمایش نوع مقصد، مسیر خودکار repository و خروجی، فایل‌های پیکربندی قابل تغییر و مقادیر secret را به‌صورت redacted نشان می‌دهد. تا این مرحله هیچ فایل خروجی نوشته نمی‌شود. فقط پس از تأیید کاربر، installer کپی repository را در workspace جدید می‌سازد و فایل‌های رسمی پیکربندی را مقداردهی می‌کند.

خروجی، یک پوشهٔ آمادهٔ انتقال است. کاربر پس از آن خودش این پوشه را روی Liara یا سرور قرار می‌دهد و مراحل نهایی build، migration، اجرای سرویس، DNS و سایر عملیات زیرساختی را انجام می‌دهد.

## مسیرهای پشتیبانی‌شده

| مسیر | آماده‌سازی installer |
|---|---|
| **زیرساخت Liara** | مقادیر لازم برای PaaS، DBaaS، Object Storage، دامنه/HTTPS و سرویس جداگانهٔ LiveKit را در فایل‌ها و نقاط کنترل رسمی پروژه آماده می‌کند. |
| **همه‌چیز روی یک سرور** | مقادیر لازم برای اجرای frontend، backend، PostgreSQL و سرویس‌های جانبی روی یک سرور را در کپی خروجی آماده می‌کند. |

installer به هیچ‌یک از این زیرساخت‌ها متصل نمی‌شود و حساب یا سرویس کاربر را تغییر نمی‌دهد.

## اجرای توسعه‌ای

```bash
npm install
npm run check
npm run build
npm run dev
```

## ساخت فایل EXE ویندوزی

برای تولید installer قابل‌انتقال Windows با NSIS اجرا کنید:

```bash
npm run package:exe
```

artifact اصلی در مسیر زیر تولید می‌شود:

```text
installer/release/KaghazBaad-Installer-0.1.0.exe
```

خروجی رسمی installer فقط فایل EXE است. EXE پس از اجرا یک workspace جدید شامل کپی repository، `backend/.env`، `.env.local`، `installer-manifest.json` و `DEPLOYMENT-GUIDE.md` می‌سازد.

## رفتار امنیتی

مقدارهای secret فقط در کپی محلیِ خروجی که کاربر تأیید کرده نوشته می‌شوند؛ نام‌های واقعی backend مانند `AI_BASE_URL`، `ZARINPAL_MERCHANT_ID`، `PAYMENT_CALLBACK_BASE_URL`، `SUBSCRIPTION_GRACE_DAYS` و `SUBSCRIPTION_JOB_BATCH_SIZE` در نقاط رسمی نوشته می‌شوند و به repository ورودی، Git، log یا frontend bundle اضافه نمی‌شوند. secretها در preview کامل نمایش داده نمی‌شوند. installer باید روی یک workspace جدید یا خالی اجرا شود تا repository اصلی هرگز overwrite نشود.

برای استفادهٔ واقعی، کاربر باید workspace خروجی را خصوصی نگه دارد و پس از انتقال امن به مقصد، سیاست secretهای همان مقصد را رعایت کند.

## قرارداد مرجع

قواعد غیرقابل‌مذاکره در فایل [INSTALLER-CONTRACT-fa.md](./INSTALLER-CONTRACT-fa.md) ثبت شده‌اند.

در صورت نبودن پیش‌نیاز یا ناقص بودن تنظیمات، installer باید متوقف شود و خطا را به کاربر نشان دهد؛ نباید مقدار ساختگی تولید کند یا عملیات زیرساختی را به‌جای کاربر انجام دهد.

**نسخهٔ فعلی آمادهٔ build شدن به‌صورت EXE است؛ آزمون اجرای خود EXE روی Windows باید در محیط Windows انجام شود.**
