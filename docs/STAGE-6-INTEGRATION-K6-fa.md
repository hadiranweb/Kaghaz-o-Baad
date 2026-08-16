# مرحلهٔ ششم: تست‌های integration و بار k6

## وضعیت فعلی

تست‌های مرحلهٔ ششم ایجاد شده‌اند و کد backend با موفقیت check/build می‌شود. سناریوی k6 نیز با خود ابزار k6 نسخهٔ 0.54.0 inspect شده و ساختار آن معتبر است.

## تست integration پویا

فایل `tests/integration/api-smoke.mjs` با Node fetch اجرا می‌شود و این مسیرها را بررسی می‌کند:

```text
health
  → login یا token موجود
  → /api/v1/me/quota
  → پیشنهاد عنوان
  → تکرار همان درخواست و انتظار cache hit
  → گزارش مدیریتی usage
```

اجرای واقعی آن نیازمند `TEST_BASE_URL`، یک PostgreSQL staging مهاجرت‌شده، کاربر تست، token یا credentials و در صورت تست AI، provider معتبر است. این تست به‌صورت خودکار به production متصل نمی‌شود.

## سناریوی k6

فایل `tests/k6/kaghazbaad-api.js` دو سناریو دارد:

| سناریو | رفتار |
|---|---|
| `steady_api` | بار ثابت API برای health و quota با VU قابل تنظیم |
| `ai_burst` | نرخ ثابت درخواست‌های پیشنهاد عنوان برای مشاهدهٔ latency، 429 و cache hit |

نمونهٔ اجرا روی staging:

```bash
cd backend
BASE_URL=https://staging.example.ir \
TEST_TOKEN='server-side-test-token' \
TEST_ARTICLE_ID='article-uuid' \
VUS=10 DURATION=2m AI_RATE=3 AI_DURATION=1m \
npm run test:k6
```

Thresholdهای پیش‌فرض شامل نرخ خطای کمتر از ۵٪، p95 کمتر از ۸۰۰ms، نرخ 429 کمتر از ۳۰٪ و cache hit بیشتر از ۱۰٪ است. این اعداد برای شروع تست‌اند و قبل از production باید بر اساس ظرفیت واقعی Liara و provider بازبینی شوند.

## ابزار و اعتبارسنجی

k6 در مخزن apt موجود نبود، اما binary رسمی k6 نسخهٔ 0.54.0 در sandbox نصب و با `k6 inspect` سناریو اعتبارسنجی شد. به‌دلیل نبود سرویس staging و `DATABASE_URL`، بار واقعی علیه backend یا PostgreSQL اجرا نشده است؛ بنابراین هیچ نتیجهٔ latency یا ظرفیت production گزارش نمی‌شود.

## خروجی مورد انتظار در staging

در اجرای staging باید موارد زیر ثبت و بررسی شوند: p50/p95/p99 latency، HTTP error rate، تعداد و نسبت 429، cache hit ratio، تعداد quota exceeded، token usage، provider cost، connection pool saturation و تعداد خطاهای PostgreSQL. اجرای بار با API key واقعی provider روی production ممنوع است؛ تست باید با provider آزمایشی یا سقف مصرف محدود انجام شود.
