# مرحلهٔ چهارم: Rate Limiting روی Gateway

## وضعیت پیاده‌سازی

Rate Limiting برای مسیر پرهزینهٔ پیشنهاد عنوان روی Gateway پیاده‌سازی شد. این محدودیت از quota محاسباتی جداست: quota تعداد مجاز مصرف در دوره را کنترل می‌کند، اما rate limit تعداد درخواست‌های متوالی در یک پنجرهٔ کوتاه را کنترل می‌کند.

## لایه‌های فعال

| کلید | مقدار پیش‌فرض | هدف |
|---|---:|---|
| IP | ۱۲۰ درخواست در دقیقه | جلوگیری از burst و abuse شبکه‌ای |
| کاربر | ۶۰ درخواست در دقیقه | محدودکردن session پرمصرف |
| کاربر و feature | ۱۰ درخواست پیشنهاد عنوان در دقیقه | حفاظت از provider و هزینهٔ AI |

مقادیر از environment خوانده می‌شوند:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_IP_PER_MINUTE=120
RATE_LIMIT_USER_PER_MINUTE=60
RATE_LIMIT_AI_PER_MINUTE=10
```

## الگوریتم و storage

برای اجرای چند نمونهٔ backend روی Liara، counter در حافظهٔ process نگهداری نمی‌شود. جدول `rate_limit_buckets` در PostgreSQL ذخیره می‌شود و عملیات increment با `INSERT ... ON CONFLICT DO UPDATE` اتمیک انجام می‌گیرد. bucket بر اساس `window_start` یک دقیقه‌ای ساخته می‌شود و کلید خام IP یا user در database ذخیره نمی‌شود؛ کلید با SHA-256 hash می‌شود.

Rate limit به‌صورت fixed window اجرا می‌شود. درخواست‌های ردشده نیز counter را افزایش می‌دهند تا مهاجم با burst مداوم window را دور نزند. پاک‌سازی bucketهای منقضی‌شده باید در job نگهداری PostgreSQL یا scheduled cleanup آینده انجام شود.

## پاسخ 429 و headerها

در عبور از limit پاسخ زیر برمی‌گردد:

```json
{
  "error": "rate_limit_exceeded",
  "retryAfterSeconds": 17,
  "requestId": "…"
}
```

هدرهای زیر نیز اضافه می‌شوند:

```text
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
Retry-After
```

## مرز با quota

ترتیب درخواست پیشنهاد عنوان اکنون چنین است:

```text
Auth/ownership
  → IP/user/feature rate limit
  → quota reservation
  → Usage Gateway/provider
  → quota commit یا release
```

Rate limit قبل از provider و quota اجرا می‌شود. اگر rate limit رد شود، provider و quota reservation اجرا نمی‌شوند. اگر quota رد شود، provider اجرا نمی‌شود. اگر provider خطا یا timeout بدهد، quota آزاد می‌شود.

## وضعیت اعتبارسنجی

`npm run check` و `npm run build` backend موفق هستند و `npm run migrate:dry-run` هر چهار migration را شناسایی می‌کند. اجرای migration واقعی و تست burst روی PostgreSQL staging هنوز انجام نشده است، زیرا محیط فعلی `DATABASE_URL` ندارد.

## کارهای باقی‌مانده برای خروج مرحلهٔ چهارم

باید migration چهارم روی PostgreSQL staging اجرا شود، تست هم‌زمانی و key isolation نوشته شود، cleanup bucketهای منقضی‌شده تعریف گردد و در صورت وجود reverse proxy، رفتار `request.ip` و trusted proxy به‌صورت صریح تنظیم شود. پس از آن می‌توان rate limit عمومی API را با policy جداگانه اضافه کرد؛ فعلاً محدودیت دقیق روی مسیر AI اعمال شده تا endpointهای احراز هویت و health ناخواسته محدود نشوند.
