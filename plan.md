# سند منسوخ‌شدهٔ برنامهٔ LiveKit/Supabase

این فایل برنامهٔ اولیه‌ای بود که صدور Token و Webhookهای LiveKit را روی Supabase Edge Functions پیشنهاد می‌کرد. این مسیر دیگر معماری فعال پروژه نیست.

## وضعیت فعلی

- Token، Webhook، Role، Recording و Participant management در `backend/src/modules/live/routes.ts` پیاده‌سازی شده‌اند؛
- PostgreSQL مستقل و `backend/migrations/` منبع حقیقت‌اند؛
- پوشهٔ `supabase/` فقط آرشیو انتقالی است؛
- قابلیت جدید نباید به Supabase اضافه شود.

## اسناد معتبر

- `docs/PRODUCT-ARCHITECTURE-CONTRACT-fa.md`؛
- `docs/ROADMAP-8-STAGES-STATUS-fa.md`؛
- `docs/livekit-capability-findings.md`؛
- `docs/livekit-stage-one-rbac.md`؛
- `docs/finalization/roadmap-fa.md`.

این فایل فقط برای جلوگیری از دنبال‌کردن تصادفی برنامهٔ قدیمی باقی مانده و در Sprint حذف Legacy می‌تواند به آرشیو تاریخی منتقل یا حذف شود.
