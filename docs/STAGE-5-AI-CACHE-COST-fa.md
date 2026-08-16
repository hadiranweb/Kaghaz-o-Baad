# مرحلهٔ پنجم: کش پاسخ‌ها و مدیریت هزینه

## وضعیت فعلی

کش پاسخ پیشنهاد عنوان با storage توزیع‌شدهٔ PostgreSQL پیاده‌سازی و به endpoint `ai.title_suggestions` متصل شد. پاسخ‌های cache‌شده دوباره به provider ارسال نمی‌شوند و quota مصرف provider نیز برای cache hit رزرو نمی‌شود.

## رفتار درخواست

```text
Auth + ownership
  → Rate Limit
  → cache lookup
      ├─ hit: ثبت usage با cache_hit=true، پاسخ فوری، بدون provider و بدون quota
      └─ miss: quota reservation → Usage Gateway/provider → quota commit/release → cache write
```

## Cache key

کلید بر اساس hash نسخهٔ canonical شدهٔ این داده‌ها ساخته می‌شود:

```text
scope=user
user_id
feature_key
normalized_topic
locale
count
provider
model
prompt_version
```

به‌صورت پیش‌فرض scope برابر user است تا پاسخ‌های موضوعات خصوصی بین کاربران به اشتراک گذاشته نشود. تغییر به global cache باید تصمیم جداگانهٔ محصول و سیاست طبقه‌بندی داده داشته باشد.

## TTL و invalidation

TTL پیش‌فرض پیشنهاد عنوان ۲۴ ساعت است و از environment قابل تغییر است:

```env
AI_CACHE_ENABLED=true
AI_TITLE_CACHE_TTL_SECONDS=86400
AI_TITLE_PROMPT_VERSION=title-v1
```

با تغییر provider، model یا prompt version کلید تغییر می‌کند و پاسخ قدیمی دوباره استفاده نمی‌شود. cache row پس از `expires_at` معتبر نیست. پاک‌سازی فیزیکی rowهای منقضی‌شده باید در job نگهداری آینده انجام شود.

## ثبت هزینه و usage

cache hit در `usage_events` با `input_tokens=0`، `output_tokens=0`، `units=0` و metadata شامل `cache_hit=true` ثبت می‌شود. در cache miss، tokenهای provider از مسیر معمول Usage Gateway ثبت می‌شوند. این تفکیک اجازه می‌دهد هزینهٔ واقعی provider از تعداد درخواست‌های UI جدا گزارش شود.

## وضعیت اعتبارسنجی

`npm run check` و `npm run build` backend موفق هستند و `migrate:dry-run` پنج migration را شناسایی می‌کند. frontend نیز قرارداد `cacheHit` را در wrapper پیشنهاد عنوان دریافت کرده است.

اجرای migration واقعی و تست cache hit/miss روی PostgreSQL staging هنوز انجام نشده است، زیرا محیط فعلی `DATABASE_URL` ندارد.

## کارهای باقی‌مانده

برای خروج کامل از مرحلهٔ پنجم باید migration پنجم روی staging اجرا شود، تست دو درخواست یکسان و تغییر prompt version نوشته شود، عدم نشت داده بین دو user بررسی گردد و گزارش هزینهٔ cache hit در داشبورد مدیر مرحلهٔ بعد قرار گیرد. همچنین باید job پاک‌سازی cache منقضی‌شده و سقف حجم پاسخ cache اضافه شود.
