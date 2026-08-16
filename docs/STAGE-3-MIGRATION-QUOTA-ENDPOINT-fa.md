# Migration مرحلهٔ سوم و endpoint وضعیت quota

## نتیجهٔ migration واقعی

اجرای `npm run migrate` انجام شد، اما migration روی دیتابیس اعمال نشد؛ محیط فعلی `DATABASE_URL` و `AUTH_JWT_SECRET` ندارد. migration runner به‌درستی قبل از هر اتصال متوقف شد:

```text
Invalid backend environment: DATABASE_URL: Required; AUTH_JWT_SECRET: Required
```

بنابراین هیچ ادعایی دربارهٔ اعمال migration روی PostgreSQL staging وجود ندارد. پس از قرارگرفتن متغیرهای معتبر محیط backend، اجرای دستور زیر باید انجام شود:

```bash
cd backend
npm run migrate
npm run db:check
```

## endpoint جدید

```http
GET /api/v1/me/quota?featureKey=ai.title_suggestions
Authorization: Bearer <session-token>
```

نمونهٔ پاسخ پیکربندی‌شده:

```json
{
  "ok": true,
  "quota": {
    "configured": true,
    "featureKey": "ai.title_suggestions",
    "planKey": "student",
    "planNameFa": "دانشجویی",
    "period": "monthly",
    "periodStart": "2026-08-01T00:00:00.000Z",
    "periodEnd": "2026-09-01T00:00:00.000Z",
    "limit": 50,
    "used": 3,
    "reserved": 1,
    "remaining": 46,
    "exhaustionPolicy": "deny"
  }
}
```

این endpoint فقط کاربر احراز‌شدهٔ فعلی را می‌خواند و user ID از session backend استخراج می‌شود؛ client نمی‌تواند وضعیت کاربر دیگری را درخواست کند.

## اعتبارسنجی کد

backend با `npm run check` و `npm run build` موفق شد. `npm run migrate:dry-run` هر سه migration را شناسایی کرد:

```text
001_initial_schema.sql
002_usage_events.sql
003_quota_entitlements.sql
```

frontend نیز پس از افزودن wrapper `getMyQuota` build شد. تست واقعی endpoint و بررسی رکوردهای quota تا زمان فراهم‌شدن PostgreSQL staging قابل اجرا نیست.
