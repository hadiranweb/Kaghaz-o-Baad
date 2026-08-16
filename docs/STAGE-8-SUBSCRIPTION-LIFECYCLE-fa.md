# مرحلهٔ هشتم: چرخهٔ عمر Subscription

## وضعیت‌های subscription

| وضعیت | معنا |
|---|---|
| `active` | دوره فعال و دسترسی برقرار است |
| `past_due` | تمدید یا پرداخت دوره بعدی ناموفق شده است |
| `grace` | دسترسی موقت در بازهٔ ارفاق پس از شکست پرداخت |
| `cancelled` | لغو فوری یا خاتمهٔ دستی |
| `expired` | پایان دوره بدون تمدید یا پایان grace period |

## مدل جدید

Migration `007_subscriptions.sql` جدول `subscriptions` را اضافه می‌کند. این جدول دورهٔ صورتحساب (`monthly`، `quarterly`، `yearly`)، مبلغ و currency، شروع و پایان دوره، grace period، auto renew، لغو در پایان دوره، provider و invoice اخیر را نگهداری می‌کند. entitlement موجود با `subscription_id` به subscription متصل می‌شود و داده‌های قبلی با backfill افزایشی حفظ می‌شوند.

## API جدید

```http
GET  /api/v1/billing/subscription
POST /api/v1/billing/subscription/renew
POST /api/v1/billing/subscription/cancel
```

لغو با `{ "immediate": false }` فقط `cancel_at_period_end` را فعال می‌کند. لغو فوری با `{ "immediate": true }` وضعیت subscription و entitlement فعال را همان لحظه خاتمه می‌دهد. تمدید، دورهٔ بعدی را بر اساس نوع billing period محاسبه و grace را پاک می‌کند.

## آزمون

`npm run check`، `npm run build` و `npm run migrate:dry-run` موفق هستند. Migration واقعی `007_subscriptions.sql` روی PostgreSQL محلی اجرا و `db:check` موفق شد. در دیتابیس محلی فعلی subscription قابل backfill وجود نداشت، بنابراین تعداد رکورد subscription و entitlement متصل صفر است؛ این به معنی شکست migration نیست، بلکه دادهٔ active entitlement در آن محیط وجود نداشته است.

## باقی‌مانده

برای خروج کامل از مرحله، job انتقال خودکار `past_due` به `grace` و سپس `expired`، تمدید خودکار با invoice جدید، اتصال کامل verify زرین‌پال به subscription به‌جای entitlement ساده، و تست sandbox درگاه لازم است.
