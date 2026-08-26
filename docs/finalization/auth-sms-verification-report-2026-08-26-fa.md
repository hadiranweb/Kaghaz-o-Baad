# گزارش بررسی Auth، SMS و Email Verification

**تاریخ گزارش:** ۲۶ اوت ۲۰۲۶
**نویسنده:** Manus AI
**مبنای Production:** `origin/main` در commit `a97bd28f7d0d11d751712bb6186b713cb142d5f8`
**وضعیت گزارش:** بررسی کد، تست خودکار و بازرسی فقط‌خواندنی Production تکمیل شده است؛ ارسال واقعی SMS یا ایمیل عمداً انجام نشده است.

## جمع‌بندی اجرایی

مسیرهای سلامت و مرز دسترسی Auth در Production سالم‌اند: هر دو health endpoint با `200` پاسخ دادند، `GET /api/v1/auth/me` بدون Bearer token به‌درستی `401` برگرداند، و preflight مربوط به ارسال OTP برای origin اصلی سایت `204` و CORS صحیح دریافت کرد. در runtime backend، کلیدهای پیکربندی SMS.ir و SMTP موجودند، اما مقدار آن‌ها خوانده یا ثبت نشده است.

برای جلوگیری از تکرار failureهای مبهم provider، یک suite خودکار جدید شامل **۱۰ آزمون گذرا** به backend افزوده شد و به check اجباری CI متصل شد. همچنین خطای شبکهٔ SMS.ir و Resend اکنون به response امن `*_provider_failed` تبدیل می‌شود و در مسیرهای route، status provider به‌صورت ساختاریافته و بدون phone/secret log می‌شود. این تغییرات هنوز در شاخهٔ `feat/auth-ai-finalization` هستند و تا زمان merge/deploy، behavior runtime Production را تغییر نمی‌دهند.

> **نتیجهٔ عملی:** Production از نظر health، CORS و access control آماده است؛ اما اثبات delivery واقعی OTP و email، و در نتیجه شروع deployment سرویس‌های AI، تا زمانی که یک شماره و email آزمایشیِ تأییدشده و تنظیم صحیح template/provider موجود نباشد، متوقف می‌ماند.

## دامنهٔ بررسی

| لایه | روش | وضعیت |
|---|---|---|
| Auth API | بررسی routeها، schemaها و error mapping | تکمیل |
| SMS.ir | تست mock قرارداد verify، failure/status/network، مرور مستندات رسمی | تکمیل |
| SMTP/Resend | تست mock config، transport، 429/5xx/network | تکمیل |
| Production health/CORS | probe فقط‌خواندنی، بدون credential کاربر | تکمیل |
| ارسال واقعی OTP | عمداً اجرا نشد؛ مقصد مورد تأیید ارائه نشده است | متوقف با gate |
| ارسال واقعی email | عمداً اجرا نشد؛ مقصد مورد تأیید ارائه نشده است | متوقف با gate |
| lifecycle مبتنی بر DB | rate-limit، TTL/consumption، pending-registration، OAuth callback | شکاف پوشش خودکار باقی است |

## یافته‌های Production فقط‌خواندنی

آزمون‌های زیر در ۲۶ اوت ۲۰۲۶ انجام شد. این probeها هیچ پیامکی، ایمیلی، ثبت‌نامی یا credentialی تولید/مصرف نکردند.

| آزمون | Endpoint | نتیجه | تفسیر |
|---|---|---|---|
| Backend health | `GET https://api.kaghazobaad.ir/health` | `200` و `{ ok: true, environment: production }` | سرویس backend در دسترس است. |
| API health | `GET https://api.kaghazobaad.ir/api/v1/health` | `200` | routing عمومی API سالم است. |
| Auth boundary | `GET /api/v1/auth/me` بدون Bearer token | `401 { error: "unauthorized" }` | endpoint محافظت‌شده token جعلی صادر نمی‌کند. |
| CORS preflight | `OPTIONS /api/v1/auth/phone/send-code` با origin `https://kaghazobaad.ir` | `204` و `access-control-allow-origin` مطابق origin | browser می‌تواند درخواست مجاز OTP را ارسال کند. |
| runtime keys | Liara CLI با ستون `Key` فقط | `SMSIR_API_KEY`، `SMSIR_TEMPLATE_ID`، `SMSIR_CODE_PARAMETER`، `EMAIL_PROVIDER`، `EMAIL_FROM` و چهار کلید SMTP حاضرند | صرفاً **وجود نام‌ها** تأیید شده؛ مقدار یا اعتبار credential بررسی/نمایش نشده است. |

سه App AI در فهرست Liara `ACTIVE` و با scale برابر یک دیده شدند، اما هر سه فاقد environment variable ثبت‌شده در audit فعلی‌اند. دستور log برای هر سه App خروجی عملیاتی نداشت. `ACTIVE` به‌تنهایی اثبات release، health یا domain فعال نیست؛ پیش از deployment باید release metadata، disk، domain و policy به‌صورت جداگانه verified شود. API مستقیم Liara در محیط ممیزی به مشکل DNS برخورد کرد؛ برای release metadata باید در مرحلهٔ activation از CLI/پنل یا endpoint بازیابی‌شده استفاده شود.

## نتیجهٔ suite خودکار جدید

| گروه | آزمون‌های گذرا | آنچه ثابت می‌شود |
|---|---:|---|
| شماره تلفن | ۱ | تبدیل ورودی محلی، `+98`، `0098`، ارقام فارسی/عربی به شمارهٔ canonical و رد شمارهٔ غیرموبایل |
| SMS.ir configuration | ۱ | نبود API key یا template ID به `503 sms_provider_not_configured` منجر می‌شود. |
| SMS.ir success contract | ۱ | درخواست `POST`، header `X-API-KEY`، `mobile`، `templateId` و parameter مناسب ساخته می‌شود. |
| SMS.ir failure | ۲ | `429` حفظ می‌شود؛ 5xx و failure شبکه به `502 sms_provider_failed` امن تبدیل می‌شوند. |
| Email configuration | ۱ | نبود provider/SMTP به `503 email_provider_not_configured` تبدیل می‌شود. |
| SMTP | ۲ | port 465 به TLS و خطای transport به `502 email_provider_failed` نگاشت می‌شود؛ verification URL صحیح ساخته می‌شود. |
| Resend | ۱ | success، 429، 5xx و failure شبکه بدون نشت secret نگاشت می‌شوند. |
| schema environment | ۱ | الزام اختیاری/اجباری `AUTH_JWT_SECRET` و default parameter code کنترل می‌شود. |

فرمان محلی اجراشده چنین بود:

```bash
npm run check && npm run test:auth && npm run build && npm run migrate:dry-run && npm audit --omit=dev --audit-level=high
```

نتیجه: `10/10` تست گذرا، type-check و build گذرا، migration dry-run گذرا و `0` آسیب‌پذیری production با سطح `high` یا بالاتر.

## اصلاحات اعمال‌شده در شاخهٔ کاری

| فایل | تغییر | اثر امنیتی/عملیاتی |
|---|---|---|
| `backend/src/auth/smsir.ts` | wrap کردن خطای شبکه/timeout و تبدیل آن به `SmsProviderError(502)` | failure نامعلوم به 500 بدون‌ساختار تبدیل نمی‌شود و UI پیام قابل‌اقدام دریافت می‌کند. |
| `backend/src/auth/email.ts` | تبدیل failure شبکهٔ Resend به error provider و inject شدن SMTP transport برای test | تست SMTP بدون اتصال خارجی ممکن است و response پایدار می‌ماند. |
| `backend/src/auth/routes.ts` | export helper خالص normalizer | ورودی‌های فارسی/عربی OTP به‌صورت regression-tested پوشش داده می‌شوند. |
| `backend/tests/auth/adapters.test.ts` | suite unit جدید | بدون SMS، SMTP یا database واقعی اجرا می‌شود. |
| `backend/package.json` و `.github/workflows/ci.yml` | `npm run test:auth` و اجرای آن در job backend | failureهای contract adapter پیش از merge متوقف می‌شوند. |

## قرارداد SMS.ir و علت محتمل failure تاریخی

مستندات رسمی SMS.ir برای ارسال verification، endpoint `POST https://api.sms.ir/v1/send/verify`، header `X-API-KEY` و body شامل `mobile`، `templateId` و `parameters` را تعیین می‌کند. مهم‌تر از همه، `Parameter.Name` باید دقیقاً کلید تعریف‌شده در قالب و **بدون `#` ابتدا/انتها** باشد. بنابراین برای placeholder مانند `#CODE#`، مقدار معمول `CODE` است، اما string دقیق باید از خود template پنل SMS.ir برداشته شود. SMS.ir برای خطای احراز هویت `401` و برای rate-limit `429` کد HTTP جداگانه دارد.[1]

کد Production اکنون همین endpoint و contract را استفاده می‌کند. failure تاریخی `502 sms_provider_failed` از بیرون قابل‌تفکیک نبود؛ با تغییر جدید، response/provider status (بدون phone یا secret) در log ثبت می‌شود. تا وقتی template ID، نام parameter و وضعیت API key از پنل SMS.ir تطبیق داده نشود، این گزارش نمی‌تواند علت قطعی failure تاریخی را به یکی از این سه مورد منتسب کند.

## شکاف‌های باقی‌مانده

| شکاف | ریسک | اقدام لازم |
|---|---|---|
| OTP lifecycle database | code reuse، expiry و attempt/rate-limit در تست واحد تازه پوشش کامل ندارند. | ساخت Fastify factory با DB adapter قابل‌تزریق و testهای `app.inject` با DB test container یا fake transaction. |
| Email verification transaction | ترتیب send/pending-registration و one-time token در DB تست end-to-end نشده است. | integration test با DB ایزوله و mock provider اضافه شود. |
| OAuth | start/callback/state/ticket exchange فقط از review کد عبور کرده‌اند. | testهای provider_not_configured، state expiry و `safeNext` اضافه شوند. |
| delivery واقعی | سلامت credential/template/SMTP server اثبات نشده است. | canary کنترل‌شده با مقصدهای تحت مالکیت کاربر اجرا شود. |
| monitoring provider | log redacted وجود دارد اما alert یا dashboard provider status تعریف نشده است. | افزودن metric/alert بعد از فعال‌شدن delivery. |

## gate اجرای canary و فعال‌سازی AI

برای جلوگیری از پیام ناخواسته یا deployment AI با Auth ناقص، مراحل بعدی به ترتیب زیر انجام می‌شوند:

1. کاربر یک شمارهٔ آزمایشی تحت مالکیت خود و یک email آزمایشی ارائه می‌کند و مجوز صریح می‌دهد که **یک OTP** و **یک verification email** ارسال شود.
2. در پنل SMS.ir، `SMSIR_TEMPLATE_ID` و نام دقیق parameter template تأیید و فقط از طریق Liara Secret store اصلاح می‌شود؛ مقدار Secret در Git یا chat وارد نمی‌شود.
3. در Liara، مقدار `EMAIL_PROVIDER` و اتصال SMTP فقط با یک delivery کنترل‌شده تأیید می‌شود.
4. اگر هر کدام از SMS/email delivery ناموفق باشد، activation AI متوقف می‌شود.
5. فقط پس از صحت delivery، n8n با policy مدیران و webhook HMAC فعال می‌شود؛ OpenClaw read-only و Open WebUI پشت access policy در مراحل بعدی و با release جداگانه deploy می‌شوند.

## مراجع

[1]: [SMS.ir REST API — ارسال VERIFY، مدل Parameter و کدهای وضعیت](https://sms.ir/rest-api/)

[2]: [Liara PaaS API — مدیریت App، environment variable، domain و disk](https://developers.liara.ir/pages/paas)

[3]: [Liara — فایل liara.json، health check، disk و هشدار جایگزینی `envs`](https://docs.liara.ir/paas/liarajson/)
