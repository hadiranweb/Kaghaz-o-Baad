# گزارش اجرای آزمایشی مرحلهٔ ششم

## دامنهٔ اجرا

تست‌ها در یک backend محلی روی `127.0.0.1:8080` اجرا شدند. برای جلوگیری از اتصال ناخواسته به محیط واقعی، `DATABASE_URL` عمداً به PostgreSQL ناموجود روی `127.0.0.1:65432` اشاره می‌کرد و `AUTH_JWT_SECRET` فقط یک مقدار ساختگی محلی بود. بنابراین این گزارش، اجرای واقعی API و رفتار خطای زیرساخت را نشان می‌دهد، نه نتیجهٔ staging یا production.

## اصلاح انجام‌شده قبل از اجرا

هر دو تست به‌جای مسیر اشتباه `/api/v1/health` اکنون از endpoint واقعی `/health` استفاده می‌کنند. backend هر دو مسیر `/health` و `/api/v1/health` را ارائه می‌کند، اما تست اصلاح‌شده با مسیر اصلی health هماهنگ است.

## نتیجهٔ integration test

فرمان اجرا:

```bash
TEST_BASE_URL=http://127.0.0.1:8080 \
TEST_TOKEN='local-dummy-token' \
npm run test:integration
```

نتیجه: **ناموفق، به‌دلیل نبود PostgreSQL**.

تست health با status 200 موفق شد، اما درخواست quota با status 500 برگشت. log backend علت را دقیقاً نشان می‌دهد:

```text
Error: connect ECONNREFUSED 127.0.0.1:65432
at getAuthUser
at /api/v1/me/quota
```

این failure از تست یا quota policy نیست؛ backend قبل از احراز هویت به database نیاز دارد و database در این اجرای ایزوله وجود نداشت. تست به‌درستی status 500 را به‌عنوان خطای غیرقابل‌قبول تشخیص داد و pass جعلی تولید نکرد.

## نتیجهٔ k6

فرمان اجرا با بار بسیار کوچک:

```bash
BASE_URL=http://127.0.0.1:8080 \
TEST_TOKEN='local-dummy-token' \
VUS=1 DURATION=2s AI_RATE=1 AI_DURATION=2s \
k6 run --no-usage-report tests/k6/kaghazbaad-api.js
```

نتایج اصلی:

| شاخص | مقدار |
|---|---:|
| health check | موفق، 200 |
| iterations | ۵ |
| HTTP requests | ۶ |
| HTTP error rate | ۸۳٫۳۳٪ |
| p95 کل request duration | ۳ms |
| rate-limit 429 | صفر |
| cache hit | قابل‌اندازه‌گیری نبود |
| نتیجهٔ k6 | fail؛ threshold خطای HTTP شکسته شد |

مقدار پایین latency در این اجرا قابل استناد برای ظرفیت سیستم نیست؛ زیرا درخواست‌ها به‌سرعت با `ECONNREFUSED` شکست خوردند و provider، quota، cache و PostgreSQL واقعاً اجرا نشدند.

## نتیجه و کار اصلاحی

اجرای آزمایشی نشان داد health مستقل از database پاسخ می‌دهد، اما مسیرهای احراز هویت و quota در نبود database با 500 شکست می‌خورند. برای اجرای معتبر مرحلهٔ ششم باید یک PostgreSQL محلی یا staging واقعی فراهم شود، migrationهای 001 تا 005 اجرا شوند، کاربر تست و مقالهٔ تست ایجاد شوند و در صورت سنجش AI، provider آزمایشی یا سقف مصرف محدود استفاده شود.

در وضعیت فعلی، هیچ ادعایی دربارهٔ p95 واقعی، ظرفیت concurrent، نرخ cache hit یا رفتار quota مطرح نمی‌شود. لاگ‌های خام در همین پوشه ذخیره شده‌اند:

```text
docs/test-logs/backend-local.log
docs/test-logs/integration-local.log
docs/test-logs/k6-local.log
```
