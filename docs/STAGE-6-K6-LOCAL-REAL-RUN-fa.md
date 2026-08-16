# اجرای واقعی k6 روی محیط محلی

## محیط اجرا

به‌دلیل نبود Docker در sandbox، اجرای معادل Compose با PostgreSQL واقعی محلی انجام شد. PostgreSQL روی `127.0.0.1:5432` نصب و اجرا شد، database و role ایزوله ساخته شدند و migrationهای 001 تا 005 با موفقیت اعمال شدند.

```text
Database migrations completed.
{"ok":true,"database":"postgresql"}
```

Backend روی `127.0.0.1:8080` با همین database اجرا شد. یک کاربر و مقالهٔ تستی از API ساخته شد و پاسخ cache آزمایشی برای همان user/topic seed شد تا مسیر cache hit بدون استفاده از provider واقعی قابل آزمون باشد.

## integration test

تست با user و article واقعی محلی اجرا شد و موفق بود:

```json
{"ok":true,"baseUrl":"http://127.0.0.1:8080","quotaStatus":200,"reportStatus":403}
```

`403` برای گزارش مدیریتی مورد انتظار بود، زیرا user تستی نقش admin نداشت و این تست کنترل RBAC را نیز تأیید کرد.

## k6 configuration

بار اجراشده:

```text
steady_api: 2 VU برای 10 ثانیه
ai_burst: نرخ 2 درخواست در ثانیه برای 10 ثانیه
```

خلاصهٔ مشاهده‌شده:

| شاخص | مقدار |
|---|---:|
| HTTP requests | ۸۱ |
| iterations | ۴۰ |
| max VU | ۴ فعال، ۷ رزروشده |
| p95 کل request duration | ۵٫۳۱ms |
| p95 title latency | ۷ms |
| cache hit | ۸ از ۸ پاسخ موفق title در metric مربوطه |
| usage_events | ۱۰ رکورد |
| cache rows معتبر | ۱ |
| rate-limit buckets | ۳ |
| HTTP error rate k6 | ۳۹٫۵٪ |
| status 429 در backend log | ۳۲ مورد |

## تفسیر

integration test سالم است و مسیر database، auth، quota، cache و RBAC را تا سطح HTTP طی کرد. k6 نیز نشان داد cache hit با latency بسیار پایین کار می‌کند و rate limiting در بار burst فعال می‌شود.

exit code k6 برابر ۹۹ شد، چون thresholdهای فعلی برای بار انتخاب‌شده شکسته شدند. علت اصلی، ۳۲ پاسخ `429` در بار ۲ درخواست AI در ثانیه و محدودیت feature برابر ۱۰ درخواست در دقیقه بود. این رفتار از نظر حفاظت provider صحیح است، اما سناریوی k6 فعلی برای baseline موفقیت طراحی نشده و باید به دو سناریو تفکیک شود: تست ظرفیت عادی زیر limit و تست عمدی burst برای پذیرش 429.

Provider واقعی در این اجرای محلی فراخوانی نشد؛ پاسخ cache seed شده بود. بنابراین این تست latency provider و token cost را اندازه‌گیری نمی‌کند. برای آن باید cache پاک شود و `AI_API_KEY` آزمایشی با سقف مصرف محدود تنظیم شود.

## اصلاح پیشنهادی سناریو

برای baseline بدون شکست عمدی threshold، نرخ AI باید کمتر از limit feature باشد؛ برای مثال `AI_RATE=0.1` در بازهٔ کوتاه یا limit جداگانهٔ staging. سناریوی burst باید threshold مستقل داشته باشد که انتظار 429 را بررسی کند، نه اینکه همان threshold خطای عمومی را بشکند.

لاگ‌های خام در این پوشه ذخیره شده‌اند:

```text
docs/test-logs/migrate-local.log
docs/test-logs/dbcheck-local.log
docs/test-logs/integration-compose-equivalent.log
docs/test-logs/k6-compose-equivalent.log
docs/test-logs/backend-k6-local.log
```

این نتایج مربوط به محیط local PostgreSQL است و نباید به ظرفیت Liara یا production تعمیم داده شود.
