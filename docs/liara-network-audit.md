# ممیزی معماری ارتباطات Liara و Git

تاریخ بررسی: 2026-08-19

## وضعیت کد

ریپوی `hadiranweb/Kaghaz-o-Baad` روی branch اصلی commitهای مربوط به frontend، backend، CI/CD، Auth، SMS.ir، LiveKit، Storage و migrationها را دارد. ماژول‌های فعلی شامل auth/password، phone OTP/SMS.ir، OAuth جدید Google/GitHub، storage، LiveKit، admin و workflow مقاله هستند. workflow انتشار، backend را با Dockerfile و frontend را از ریشهٔ ریپو به دو اپ مستقل Liara deploy می‌کند؛ بنابراین انتقال ماژول‌ها از Git به Liara برقرار است و نباید با نصب مجدد یا بازچینی صفحات جایگزین شود.

## وضعیت Liara

دو اپ `kaghazbaad-frontend` و `kaghazbaad-backend` در شبکهٔ `kaghazbaad-network` و با وضعیت ACTIVE وجود دارند. backend از hostname داخلی DBaaS استفاده می‌کند: `kaghazbaad-db-staging:5432`. این hostname برای ارتباط داخلی backend با DB مناسب است، اما نباید در frontend، OAuth redirect عمومی یا DNS عمومی استفاده شود.

برای Object Storage، bucket `kaghazbaad-media-staging` فعال و private است. endpoint S3 در environment backend ثبت شده است. credentialهای S3 باید مستقل از Liara API token و فقط در environment backend نگه‌داری شوند.

## وضعیت دامنه

در پاسخ endpoint عمومی فهرست دامنه‌های Liara، دامنه‌ای برنگشت؛ این نتیجه به‌تنهایی ثابت نمی‌کند که DNS خارجی تنظیم نشده، زیرا مدیریت DNS/دامنه می‌تواند در endpoint یا حساب دیگری باشد. در هر صورت، resolve عمومی hostnameهای `kaghazobaad.ir`، `www`، `api`، `auth` و `mail` در بررسی فعلی پاسخ قابل اتکایی نداد. قبل از ایجاد یا حذف رکورد باید zone authoritative و رکوردهای واقعی DNS از پنل/endpoint درست Liara تطبیق داده شوند.

## نقشهٔ پیشنهادی

| مسیر | استفادهٔ درست |
|---|---|
| `https://kaghazobaad.ir` | frontend عمومی |
| `https://api.kaghazobaad.ir` | backend عمومی برای browser و OAuth callbackها |
| hostname داخلی DBaaS | فقط backend به PostgreSQL |
| endpoint داخلی شبکه برای سرویس‌های Liara، اگر سرویس ارائه کند | فقط backend؛ هرگز در bundle frontend |
| LiveKit Cloud WSS | اتصال رسانه‌ای browser؛ token فقط از backend صادر شود |
| Object Storage S3 | فقط backend/Egress؛ فایل خصوصی با presigned URL |

## نتیجهٔ محافظه‌کارانه

هیچ ماژولی حذف نشده است. مشکل اصلی فعلی «مخلوط‌بودن endpoint موقت و endpoint عمومی» و «کامل‌نبودن دامنه‌های public/redirect» است، نه کمبود کد Auth یا LiveKit. پیش از اعمال DNS یا تغییر environment باید hostname رسمی اپ‌ها و DB، دامنهٔ custom ثبت‌شده در Liara، و zone authoritative دامنه تأیید شوند.

مستند رسمی Liara تصریح می‌کند که برنامه‌ها و دیتابیس‌های یک شبکهٔ خصوصی مشترک می‌توانند با شناسهٔ برنامه یا hostname داخلی به یکدیگر متصل شوند و برای DB نیز اتصال خصوصی زمانی ممکن است که سرویس‌ها در همان شبکه باشند. همچنین تغییر شبکهٔ خصوصی پس از ایجاد پلتفرم ممکن نیست و تغییر آن نیازمند ساخت پلتفرم جدید و استقرار مجدد است [1]. بنابراین شبکهٔ فعلی `kaghazbaad-network` باید حفظ شود و فقط endpointها و DNS اصلاح شوند.

## قرارداد تنظیمات نهایی

در frontend فقط `VITE_API_URL=https://api.kaghazobaad.ir/api/v1` قرار می‌گیرد. در backend، `CORS_ORIGIN` فقط دامنهٔ frontend را می‌پذیرد؛ `DATABASE_URL` با hostname خصوصی DB باقی می‌ماند؛ و OAuth redirectهای Google/GitHub به دامنهٔ `api.kaghazobaad.ir` ختم می‌شوند. LiveKit Cloud از browser با WSS عمومی استفاده می‌شود، اما ساخت Room، صدور token، moderation و Egress فقط از backend انجام می‌گیرد. Object Storage نیز در browser با secret خام استفاده نمی‌شود و backend در صورت نیاز URL امضاشده تولید می‌کند.

## DNS پیشنهادی، مشروط به تأیید zone

| رکورد | هدف | وضعیت اقدام |
|---|---|---|
| `@` و `www` | frontend Liara | نیازمند ثبت custom domain روی frontend |
| `api` | backend Liara | نیازمند ثبت custom domain روی backend و صدور SSL |
| `auth` | در صورت نیاز، alias به backend؛ در غیر این صورت ایجاد نشود | فعلاً ایجاد نشود تا callbackها تثبیت شوند |
| `assets` یا `media` | فقط اگر Object Storage custom-domain رسمی و HTTPS ارائه دهد | فعلاً استفاده از presigned URL |
| `live` | لازم نیست؛ LiveKit Cloud endpoint فعلی مرجع است | ایجاد نشود مگر برای proxy رسمی |

### منابع

[1]: https://docs.liara.ir/paas/details/private-network/ "Liara: شبکه خصوصی"

## یافته‌های کنسول Liara پس از ورود

در کنسول Liara، zone `kaghazobaad.ir` فعال است و رکوردهای زیر در آن دیده شد:

| نوع | نام | مقصد/مقدار | TTL |
|---|---|---|---|
| ALIAS | `kaghazobaad.ir` | `rainier.liara.cloud` | ۱ ساعت |
| CNAME | `_acme-challenge.api.kaghazobaad.ir` | `api-kaghazobaad-ir._acme-challenge.liara.cloud` | ۱ ساعت |
| CNAME | `_acme-challenge.kaghazobaad.ir` | `kaghazobaad-ir._acme-challenge.liara.cloud` | ۱ ساعت |
| CNAME | `api.kaghazobaad.ir` | `rainier.liara.cloud` | ۱ ساعت |
| TXT | `liara-challenge.kaghazobaad.ir` | `e02b65dd-885e-414b-9e5a-b8253810c1e5` | ۱ ساعت |

اپ frontend دامنهٔ `kaghazobaad.ir` را با وضعیت فعال دارد. اپ backend دامنهٔ `api.kaghazobaad.ir` را دارد، اما وضعیت آن «نیازمند بررسی رکوردها» است و ۱۳ ساعت از ایجاد آن گذشته است.

تست عمومی نشان داد `https://kaghazobaad.ir/` با HTTP 200 و محتوای frontend پاسخ می‌دهد. `api.kaghazobaad.ir` به همان IP عمومی resolve می‌شود، اما TLS با خطای `tlsv1 unrecognized name` شکست می‌خورد؛ بنابراین مشکل فعلی در صدور/اتصال certificate یا انتشار صحیح custom domain API است، نه در routeهای backend. هیچ رکوردی حذف نشده است.

## نتیجهٔ اصلاح دامنهٔ API

پس از ورود به کنسول، مشخص شد zone فعال بوده و رکوردهای لازم نیز وجود داشته‌اند؛ فقط بررسی وضعیت ACME و صدور certificate تکمیل نشده بود. بررسی رسمی Liara با `teamID` وضعیت `CNameRecord=VALID` و `acmeRecord=VALID` را تأیید کرد. سپس درخواست صدور SSL برای `api.kaghazobaad.ir` ارسال شد. پس از تکمیل provisioning، وضعیت `certificatesStatus=ACTIVE` شد.

تست نهایی `https://api.kaghazobaad.ir/api/v1/health` با HTTP 200، اعتبارسنجی TLS موفق و پاسخ زیر انجام شد:

```json
{"ok":true,"service":"kaghazbaad-backend","environment":"production","version":"0.1.0"}
```

همچنین `https://kaghazobaad.ir/` با HTTP 200 frontend را ارائه می‌کند. bundle منتشرشدهٔ frontend نیز به `https://api.kaghazobaad.ir/api/v1` اشاره می‌کند، نه به hostname موقت Liara.

## ممیزی مجدد دامنه و SSL — ۱۹ اوت ۲۰۲۶

ممیزی read-only جدید از API رسمی Liara و DNS عمومی انجام شد. نتیجهٔ دامنهٔ backend به‌صورت `status=ACTIVE`، `certificatesStatus=ACTIVE`، `CNameRecord=VALID` و `acmeRecord=VALID` است. مقصد شبکهٔ Liara همچنان `rainier.liara.cloud` با IP `185.208.181.166` است.

رکوردهای عمومی `api.kaghazobaad.ir`، `_acme-challenge.api.kaghazobaad.ir` و `_acme-challenge.kaghazobaad.ir` همگی قابل resolve هستند و به مقصدهای Liara اشاره می‌کنند. TXT احراز دامنه نیز قابل مشاهده است.

تست `https://kaghazobaad.ir/` با HTTP 200 و TLS verify موفق و تست `https://api.kaghazobaad.ir/api/v1/health` نیز با HTTP 200، TLS verify موفق و پاسخ production سالم انجام شد. در این ممیزی هیچ تغییری در DNS، SSL یا اپ‌ها اعمال نشد.
