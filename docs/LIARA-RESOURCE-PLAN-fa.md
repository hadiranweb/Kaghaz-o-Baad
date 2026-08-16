# برنامهٔ منابع Liara برای Kaghaz-o-Baad

## هدف

این سند فهرست دقیق منابعی را مشخص می‌کند که برای استقرار معماری مستقل Kaghaz-o-Baad روی Liara لازم است. در زمان تهیهٔ این سند هیچ App، دیتابیس یا Bucket جدیدی در Liara ایجاد نشده است.

## نتیجهٔ ممیزی فعلی

اتصال read-only به Team ID معتبر بود. در تیم Liara فعلاً هیچ پروژهٔ PaaS و هیچ دیتابیس DBaaS وجود ندارد؛ بنابراین باید منابع staging از صفر ساخته شوند. معماری موجود repository شامل یک frontend مستقل Vite/React و یک backend مستقل Node.js/Fastify است.

## منابع ضروری برای staging

| اولویت | منبع | تعداد | علت نیاز | وضعیت فعلی |
|---|---|---:|---|---|
| ۱ | Liara React App برای frontend | ۱ | اجرای build فعلی Vite و ارائهٔ SPA | باید ساخته شود |
| ۲ | Liara Node.js/Docker App برای backend | ۱ | اجرای Fastify، Auth، workflow، AI gateway، billing و API | باید ساخته شود |
| ۳ | Liara PostgreSQL DBaaS | ۱ | ذخیرهٔ کاربران، نقش‌ها، مقالات، usage، quota، billing، subscription و محتوای frontend | باید ساخته شود |
| ۴ | Liara Object Storage با S3 API | ۱ bucket | upload رسانه، presentation و فایل‌های کاربر با presigned URL | باید ساخته شود |
| ۵ | LiveKit Cloud یا LiveKit Server جدا | ۱ سرویس | اتاق زنده، صدور token، صدا/تصویر، همگام‌سازی اسلاید و data channel | باید تهیه/متصل شود |

Liara برای پروژه‌های Vite/React پلتفرم React دارد و build پروژه را در فرایند استقرار اجرا می‌کند [1] [2]. Backend پروژه با Dockerfile آماده است، روی Node.js 22 اجرا می‌شود و به پورت 8080 گوش می‌دهد؛ بنابراین می‌تواند به‌عنوان یک App مستقل Node.js یا Docker مستقر شود.

## منابعی که فعلاً لازم نیست بسازیم

| منبع | تصمیم | توضیح |
|---|---|---|
| LiveKit App جدا روی Liara | فعلاً نسازیم | LiveKit را روی همان App backend نصب نمی‌کنیم؛ backend فقط token کوتاه‌عمر صادر می‌کند و به LiveKit Cloud یا LiveKit Server جدا متصل می‌شود. خود سرویس LiveKit برای پخش زنده ضروری است. |
| AI Provider | سرویس خارجی | فقط `AI_API_KEY` و در صورت نیاز `AI_BASE_URL` لازم است؛ App یا مدل AI جداگانه در Liara فعلاً لازم نیست. |
| ZarinPal | سرویس خارجی | به Merchant ID و callback عمومی نیاز دارد؛ پس از در دسترس شدن domain فعال می‌شود. |
| SMS.ir | سرویس خارجی | در نسخهٔ فعلی منبع Liara محسوب نمی‌شود و پس از تعیین جریان OTP باید credential آن اضافه شود. |
| Mail | اختیاری | برای شروع staging ضروری نیست؛ بعداً برای ایمیل تراکنشی اضافه می‌شود. |
| DNS/SSL | بعد از ساخت App | ابتدا از subdomain پیش‌فرض Liara برای smoke test استفاده می‌کنیم؛ دامنهٔ اصلی و SSL سفارشی بعداً تنظیم می‌شود. |
| App جدا برای worker | فعلاً لازم نیست | jobهای cache و subscription در repository وجود دارند، اما ابتدا باید روش اجرای زمان‌بندی‌شدهٔ آن‌ها روی Liara تعیین شود. در staging می‌توان آن‌ها را دستی اجرا کرد. |

## تنظیمات لازم frontend

Frontend با `npm run build` ساخته می‌شود و فقط به متغیر زیر نیاز دارد:

```text
VITE_API_URL=https://<backend-app-domain>/api/v1
```

در صورت قرارگیری frontend و backend پشت reverse proxy مشترک، مقدار پیش‌فرض `/api/v1` نیز می‌تواند استفاده شود؛ اما برای دو App جدا، مقدار صریح دامنهٔ backend شفاف‌تر است. پلتفرم React لیارا برای پروژه‌های Vite، `npm install` و سپس `npm run build` را اجرا می‌کند [1] [2].

## تنظیمات ضروری backend

متغیرهای زیر برای بالا آمدن backend ضروری هستند:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=8080
DATABASE_URL=<Liara PostgreSQL connection string>
AUTH_JWT_SECRET=<random secret, at least 32 characters>
CORS_ORIGIN=<frontend app URL>
```

متغیرهای زیر بر اساس قابلیت مورد استفاده تنظیم می‌شوند:

| حوزه | متغیرها |
|---|---|
| AI | `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` |
| پرداخت | `ZARINPAL_MERCHANT_ID`, `ZARINPAL_SANDBOX`, `PAYMENT_CALLBACK_BASE_URL` |
| LiveKit ضروری | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| Object Storage | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| کنترل هزینه و پایداری | `RATE_LIMIT_*`, `AI_CACHE_*`, `PAYMENT_PROVIDER_TIMEOUT_MS` |

Liara متغیرهای محیطی را در تنظیمات App نگه‌داری می‌کند و این مقادیر نباید در repository یا image عمومی قرار گیرند [3].

## ترتیب پیشنهادی ساخت

ابتدا PostgreSQL DBaaS ساخته می‌شود، زیرا backend بدون `DATABASE_URL` اجرا نمی‌شود. سپس Object Storage و bucket ساخته می‌شوند تا قابلیت Media در همان staging قابل آزمایش باشد. بعد backend App ساخته و با Dockerfile فعلی مستقر می‌شود؛ migrationهای 001 تا 009 از داخل backend اجرا خواهند شد. پس از دریافت دامنهٔ backend، frontend React App ساخته و با `VITE_API_URL` به backend متصل می‌شود. در پایان با subdomainهای پیش‌فرض Liara smoke test انجام می‌شود.

## برآورد مرحله‌ای هزینه

در این مرحله نباید مبلغ را حدس بزنیم؛ قیمت‌های Liara به نوع محصول، plan، منابع و موقعیت build وابسته‌اند و باید هنگام ساخت هر resource در Console/API مشاهده شوند. برای شروع کم‌هزینهٔ staging، فقط یک App frontend، یک App backend، یک PostgreSQL کوچک، یک bucket Object Storage و یک سرویس LiveKit لازم است. LiveKit، دامنهٔ سفارشی، Mail، SMS، AI provider و planهای بالاتر هزینه‌های جداگانه یا خارجی دارند.

## مواردی که پیش از ساخت باید اصلاح شوند

فایل root `.env.example` اکنون فقط `VITE_API_URL` را برای frontend مستقل تعریف می‌کند و `backend/.env.example` نیز متغیرهای core، AI، billing، LiveKit و Object Storage را بدون secret واقعی ارائه می‌دهد. همچنین باید یک `liara.json` یا دستورهای deploy مستند برای frontend و backend جداگانه اضافه شود تا مسیر استقرار تکرارپذیر باشد.

## مراجع

[1]: https://docs.liara.ir/paas/react/quick-start/ "Liara React quick start"
[2]: https://docs.liara.ir/paas/react/how-tos/deploy-app/ "Liara React deployment"
[3]: https://docs.liara.ir/paas/details/envs/ "Liara environment variables"
