# وضعیت میراث Supabase و گزارش خروج کامل (Decommissioned)

**تاریخ تکمیل خروج:** ۲۴ اوت ۲۰۲۶ (۳ شهریور ۱۴۰۵ — Sprint 5)  
**وضعیت:** تکمیل‌شده و حذف‌شده با ۰ باقیمانده (Zero Runtime Residue)

---

## ۱. بیانیهٔ قطعی خروج

پوشهٔ تاریخی `supabase/` و کلیهٔ وابستگی‌ها، Edge Functionها، فایل‌های پیکربندی و مراجع مرتبط با آن در **اسپرینت ۵** به صورت کامل و تحت ممیزی دقیق از مخزن حذف شدند.

قبل از حذف، کلیهٔ ۴۰ فایل تاریخی بررسی و شناسنامهٔ رمزنگاری‌شدهٔ SHA-256 آن‌ها در سند زیر آرشیو گردید:
```text
docs/archive/legacy-supabase-manifest-2026-08-24.json
```

---

## ۲. ممیزی عدم وجود هرگونه وابستگی (Zero Residue Audit)

1. **وابستگی‌های پکیج (`package.json`):** هیچ پکیجی از قبیل `@supabase/supabase-js` در هیچ‌یک از پروژه‌ها (`frontend`, `backend`, `installer`) وجود ندارد.
2. **سورس‌کد کلاینت و سرور (`src/`, `backend/src/`):** ۰ خط ارجاع به `@supabase`، `integrations/supabase` یا متدهای `supabase.*`.
3. **متغیرهای محیطی:** هیچ متغیر `VITE_SUPABASE_*` یا `SUPABASE_*` در محیط‌های فعال یا نمونه‌ها وجود ندارد.
4. **خط لوله CI/CD:** هیچ دستوری برای Deploy یا تعامل با Supabase در `.github/workflows/ci.yml` وجود ندارد.
5. **محافظ خودکار معماری:** اسکریپت `scripts/check-architecture-contract.mjs` در هر بیلد و در گیت‌هاب CI تضمین می‌کند که هیچ پوشه یا ایمپورتی از Supabase به پروژه بازنگردد.

---

## ۳. منابع فعال سیستم مستقل

- **هستهٔ سرور:** `backend/src/` (Fastify + TypeScript)
- **پایگاه‌داده و مایگریشن‌ها:** `backend/migrations/` (PostgreSQL مستقل روی Liara / Docker)
- **فضای ذخیره‌سازی ابری:** `backend/src/modules/storage/` (S3 / Liara Object Storage)
- **ارتباطات زنده و WebRTC:** `backend/src/modules/live/` (LiveKit Server SDK)
- **سیستم مدیریت هویت و ایمیل:** `backend/src/modules/mail/` و `backend/src/auth/`
- **احراز هویت پیامکی:** `backend/src/auth/smsir.ts` (SMS.ir UltraFast OTP)
