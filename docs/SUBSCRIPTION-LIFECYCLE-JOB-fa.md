# Job چرخهٔ عمر Subscription

## سیاست انتقال

job دوره‌های `active` و `past_due` را که `current_period_end` آن‌ها گذشته است، به وضعیت `grace` منتقل می‌کند و `grace_period_end` را بر اساس `SUBSCRIPTION_GRACE_DAYS` تعیین می‌کند. سپس subscriptionهای `grace` که grace period آن‌ها نیز گذشته است، به `expired` منتقل می‌شوند و entitlementهای فعال مرتبط منقضی می‌گردند.

## فرمان اجرا

```bash
npm run jobs:subscription-lifecycle
```

تنظیمات قابل تغییر:

```env
SUBSCRIPTION_GRACE_DAYS=3
SUBSCRIPTION_JOB_BATCH_SIZE=500
```

job هنگام start backend اجرا نمی‌شود و باید از cron یا scheduler لیارا فراخوانی شود. برای اجرای روزانه، یک اجرای scheduler در ساعت کم‌ترافیک کافی است؛ در صورت نیاز به دقت بیشتر می‌توان آن را ساعتی اجرا کرد.

## ایمنی و هم‌زمانی

هر اجرای job در یک transaction انجام می‌شود. انتخاب رکوردها با `FOR UPDATE SKIP LOCKED` است تا دو instance هم‌زمان یک subscription را دوباره پردازش نکنند. transitionها با شرط وضعیت انجام می‌شوند و اجرای دوبارهٔ job idempotent است.

## اجرای محلی

`npm run check`، `npm run build` و migration dry-run موفق شدند. اجرای job روی PostgreSQL محلی دوبار انجام شد و هر دو بار خروجی زیر را داد؛ چون در database محلی subscription واجد شرایط وجود نداشت:

```json
{"ok":true,"scanned":0,"movedToGrace":0,"movedToExpired":0,"entitlementsExpired":0}
```

این خروجی، no-op صحیح و idempotent بودن job را نشان می‌دهد. برای آزمون انتقال واقعی باید در یک database تست، subscriptionهای تاریخ‌گذشته و grace منقضی ایجاد شوند؛ این seed نباید در migration production قرار گیرد.
