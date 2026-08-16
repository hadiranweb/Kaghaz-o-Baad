# تکمیل مرحلهٔ پنجم: پاک‌سازی cache و گزارش مدیریتی هزینه

## اجزای تکمیل‌شده

| جزء | وضعیت |
|---|---|
| پاک‌سازی cache منقضی‌شده | پیاده‌سازی شد |
| فرمان اجرای job | `npm run jobs:cleanup-ai-cache` |
| API گزارش هزینه | `GET /api/v1/admin/usage-report` |
| گزارش cache hit/miss | پیاده‌سازی شد |
| گزارش token و provider/model | پیاده‌سازی شد |
| صرفه‌جویی برآوردی | پیاده‌سازی شد بر اساس میانگین هزینهٔ uncached همان provider/model/feature |
| guard مدیریتی | فقط admin، senior_manager و technical_manager |
| اتصال داشبورد | view جدید `usage_report` در داشبورد مدیر |
| build validation | backend و frontend موفق |

## job پاک‌سازی

job فقط با اجرای صریح یا scheduler محیط اجرا می‌شود و هنگام start شدن backend به‌طور ضمنی اجرا نمی‌شود:

```bash
npm run jobs:cleanup-ai-cache
```

تعداد حذف در batch محدود می‌شود و از `CACHE_CLEANUP_BATCH_SIZE` خوانده می‌شود. مقدار پیش‌فرض ۱۰۰۰ است و سقف ۱۰٬۰۰۰ دارد. برای Liara می‌توان همین فرمان را در scheduler یا cron دوره‌ای قرار داد.

## API گزارش مدیریتی

```http
GET /api/v1/admin/usage-report?from=2026-08-01T00:00:00.000Z&to=2026-09-01T00:00:00.000Z
Authorization: Bearer <admin-session-token>
```

API حداکثر بازهٔ ۹۰ روز را قبول می‌کند و گزارش را بر اساس provider، model و feature تفکیک می‌کند. مجموع گزارش شامل تعداد درخواست، cache hit، tokenهای ورودی/خروجی/cache، هزینهٔ ثبت‌شدهٔ provider و صرفه‌جویی برآوردی است.

صرفه‌جویی برآوردی یک عدد حسابداری قطعی نیست؛ از میانگین `cost_minor` درخواست‌های موفق و uncached همان گروه ضرب‌در تعداد cache hit به‌دست می‌آید. برای گزارش مالی نهایی باید pricing snapshot و currency معتبر در Usage Gateway ثبت شود.

## داشبورد

در داشبورد مدیر، گزینهٔ «گزارش هزینه و کش AI» اضافه شده است. این view کارت‌های خلاصه و جدول تفکیک provider/model/feature را نمایش می‌دهد. frontend مستقیماً به Supabase وصل نمی‌شود و از wrapper مستقل `getAdminUsageReport` استفاده می‌کند.

## اعتبارسنجی

backend با `npm run check` و `npm run build` موفق شد. frontend نیز build شد. migration dry-run پنج migration را شناسایی می‌کند. اجرای واقعی migration و job پاک‌سازی روی PostgreSQL staging هنوز انجام نشده است، زیرا محیط فعلی `DATABASE_URL` ندارد.

## معیار خروج مرحلهٔ پنجم

هستهٔ مرحلهٔ پنجم تکمیل شده است. برای تأیید نهایی production باید migration `005_ai_response_cache.sql` روی staging اجرا شود، job با cache واقعی اجرا شود، endpoint گزارش با نقش admin آزمایش شود و دسترسی نقش‌های غیرمدیر با پاسخ 403 بررسی گردد.
