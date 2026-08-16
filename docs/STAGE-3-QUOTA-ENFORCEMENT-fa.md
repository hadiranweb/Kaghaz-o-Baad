# مرحلهٔ سوم: Quota Enforcement و Entitlement

## وضعیت فعلی

هستهٔ quota enforcement در backend مستقل پیاده‌سازی شده و به سناریوی `ai.title_suggestions` متصل است. migration جدید `003_quota_entitlements.sql` مدل پلن، پارامتر، entitlement، counter دوره‌ای و reservation را اضافه می‌کند.

`npm run check`، `npm run build` و `npm run migrate:dry-run` موفق هستند. migration واقعی روی PostgreSQL staging هنوز اجرا نشده است.

## مدل داده

```text
plans
  → plan_parameter_values
  → plan_parameters

users
  → entitlements
  → quota_counters
  → quota_reservations
```

سه پلن اولیهٔ `free`، `student` و `professor` ایجاد می‌شوند. پارامتر اولیه `ai.title_suggestions` با واحد `request` و دورهٔ `monthly` تعریف شده است. سهمیهٔ seed فعلی به‌ترتیب ۵، ۵۰ و ۲۰۰ درخواست ماهانه است و باید قبل از production با تصمیم محصول بازبینی شود.

کاربران موجودی که entitlement فعال ندارند، در migration به‌صورت پیش‌فرض entitlement رایگان می‌گیرند. این رفتار باید در staging بررسی و در صورت نیاز با سیاست محصول تغییر کند.

## جریان درخواست

```text
درخواست پیشنهاد عنوان
  → احراز هویت و مالکیت مقاله
  → reserveQuota(user, feature, request_id)
  → اجرای provider از طریق Usage Gateway
  → success: commitQuota
  → failure/timeout: releaseQuota
```

Reservation داخل transaction PostgreSQL انجام می‌شود و counter کاربر برای همان دوره با row lock/UPSERT محافظت می‌گردد. مقدار قابل‌مصرف برابر است با:

```text
limit - used_units - reserved_units
```

اگر مقدار باقی‌مانده کمتر از واحد موردنیاز باشد، backend پاسخ `429 quota_exceeded` می‌دهد. اگر برای کاربر یا feature entitlement معتبر وجود نداشته باشد، پاسخ `403 quota_not_configured` برگردانده می‌شود.

## idempotency و هم‌زمانی

کلید منطقی reservation شامل `user_id`، `request_id` و `feature_key` است. درخواست تکراری با همان request ID reservation جدید نمی‌سازد و از دوبرابرشماری جلوگیری می‌شود. commit و release نیز روی یک client و در transaction مستقل اجرا می‌شوند؛ بنابراین استفاده از چند connection pool به transaction نادرست منجر نمی‌شود.

## وضعیت مرحلهٔ سوم

| بخش | وضعیت |
|---|---|
| مدل plan و parameter | انجام شد |
| entitlement فعال | انجام شد |
| counter دوره‌ای | انجام شد |
| reservation اتمیک | انجام شد |
| commit پس از موفقیت | انجام شد |
| release پس از خطا/timeout | انجام شد |
| اتصال به پیشنهاد عنوان | انجام شد |
| endpoint مشاهدهٔ وضعیت سهمیه | باقی‌مانده |
| تست integration روی PostgreSQL | باقی‌مانده |
| تست واقعی هم‌زمانی و rollback | باقی‌مانده |
| اتصال همهٔ featureهای AI به quota | باقی‌مانده |
| policy نهایی overage و قیمت | باقی‌مانده و وابسته به تصمیم محصول |

## معیار خروج مرحلهٔ سوم

مرحلهٔ سوم زمانی کامل محسوب می‌شود که migration روی staging اجرا شود، endpoint وضعیت quota وجود داشته باشد، دو درخواست هم‌زمان نتوانند از limit عبور کنند، provider failure reservation را آزاد کند، retry با request ID قابل‌ردیابی باشد، و حداقل سناریوهای AI فعال از gateway و quota عبور کنند. سپس مرحلهٔ چهارم، یعنی داشبورد مدیر برای کنترل plan parameters، آغاز خواهد شد.
