# گزارش بازبینی EXE Installer کاغذ و باد

## نتیجهٔ کلی

installer اکنون باید یک EXE خودبسنده درون repository باشد. EXE مسیر repository والد خود را از محل اجرا تشخیص می‌دهد؛ کاربر فقط مقصد `Liara` یا `Single Server`، مسیر workspace خالی و تنظیمات لازم را وارد می‌کند. پس از preview و تأیید، installer یک کپی جدید و خصوصی می‌سازد و هیچ deployment، migration، upload، DNS، SSL یا اتصال database اجرا نمی‌کند.

## مغایرت‌های کشف‌شده و اصلاح‌شده

| موضوع | وضعیت قبل | وضعیت بعد |
|---|---|---|
| ورودی repository | متن قرارداد هنوز ZIP/پوشه را ورودی می‌دانست | repository والد EXE خودکار تشخیص داده می‌شود |
| خروجی رسمی | مسیر legacy `package:zip` وجود داشت | فقط `package:exe` رسمی است و ZIP builder حذف شد |
| AI base URL | نام نادرست `AI_PROVIDER_BASE_URL` | نام backend یعنی `AI_BASE_URL` |
| Frontend API URL | `VITE_API_BASE_URL` | `VITE_API_URL` مطابق repository |
| AI تنظیمات | فقط key و base URL | provider، model، timeout، cache و prompt version اضافه شد |
| Rate limit | از فرم قابل تنظیم نبود | حداقل AI rate limit و مقادیر backend در env writer پوشش داده شد |
| پرداخت | merchant به‌تنهایی | sandbox، callback base URL و provider timeout اضافه شد |
| Subscription | در EXE پوشش نداشت | grace days و job batch اضافه شد |
| راهنمای مقصد | فقط manifest | `DEPLOYMENT-GUIDE.md` برای Liara یا Single Server تولید می‌شود |
| ایمنی workspace | احتمال overwrite پوشهٔ غیرخالی | workspace غیرخالی با خطا متوقف می‌شود |

## فایل‌های خروجی workspace

پس از تأیید کاربر، EXE فایل‌های زیر را ایجاد یا مقداردهی می‌کند:

```text
کپی کامل repository/
backend/.env
.env.local
installer-manifest.json
DEPLOYMENT-GUIDE.md
```

Secretها فقط در `backend/.env` محلی و با mode محدود نوشته می‌شوند. preview و manifest مقدار secret را redacted می‌کنند. secret در frontend bundle، log، Git یا repository اصلی نوشته نمی‌شود.

## تنظیمات مهم پوشش‌داده‌شده

`DATABASE_URL`، `AUTH_JWT_SECRET`، `AI_PROVIDER`، `AI_MODEL`، `AI_BASE_URL`، `AI_API_KEY`، timeout AI، rate limit، cache AI، Object Storage، LiveKit، SMS، زرین‌پال، IDPay، callback پرداخت، timeout provider، mail و subscription lifecycle در مدل EXE قرار گرفته‌اند.

## اعتبارسنجی

`npm run check` و `npm run build` installer موفق هستند. `npm run package:exe` نیز با NSIS موفق شد و artifact زیر تولید شد:

```text
installer/release/KaghazBaad-Installer-0.1.0.exe
```

ساخت artifact در Linux انجام شده است. اجرای واقعی رابط، تشخیص مسیر EXE، انتخاب workspace، preview، ساخت کپی و بررسی فایل‌های `.env` باید روی Windows واقعی انجام شود. اجرای migration، اتصال provider، deployment و upload عمداً جزو آزمون installer نیستند و توسط آن انجام نمی‌شوند.

## نکتهٔ امنیتی

workspace خروجی حاوی secret است و باید خصوصی نگهداری شود. فایل EXE عمومی می‌تواند در repository باقی بماند، اما workspace مقداردهی‌شده نباید commit یا عمومی شود.
