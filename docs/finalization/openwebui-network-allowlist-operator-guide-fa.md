# راهنمای مدیریت دسترسی شبکه‌ای Open WebUI

## هدف و مرز دسترسی

پنل **«دسترسی شبکه‌ای Open WebUI»** در داشبورد مدیر اصلی کاغذ و باد، IP و CIDRهای مجاز برای `ai.kaghazobaad.ir` را نگه‌داری می‌کند. تغییرهای ثبت‌شده ابتدا صرفاً **desired state** هستند و تا زمانی که مدیر دکمهٔ **«اعمال در لبه»** را در dialog تأیید نکند، هیچ قاعده‌ای در Cloudflare تغییر نمی‌کند.

> Open WebUI هیچ `DATABASE_URL`، `PG*`، `POSTGRES*` یا `SUPABASE_*` دریافت نمی‌کند. database محصول فقط desired state، وضعیت همگام‌سازی و audit مدیران را نگه می‌دارد؛ همگام‌سازی با Cloudflare فقط از backend و با secret runtime انجام می‌شود.

## راه‌اندازی یک‌بارهٔ backend

در secret store backend Liara، و فقط آن‌جا، متغیرهای زیر قرار می‌گیرند. مقدار واقعی هیچ‌کدام نباید در Git، CI output، فایل `.env` tracked یا گفتگو ذخیره شود.

| نام متغیر | کاربرد |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token محدود و مستقل برای allowlist Open WebUI |
| `CLOUDFLARE_ACCOUNT_ID` | account دارای custom IP list |
| `CLOUDFLARE_ZONE_ID` | zone مربوط به `kaghazobaad.ir` |
| `OPENWEBUI_EDGE_ALLOWLIST_NAME` | اختیاری؛ پیش‌فرض `kaghazbaad_openwebui_admin_ips` |
| `OPENWEBUI_EDGE_HOST` | اختیاری؛ پیش‌فرض `ai.kaghazobaad.ir` |
| `CLOUDFLARE_HTTP_TIMEOUT_MS` | اختیاری؛ پیش‌فرض `12000` میلی‌ثانیه |

API token باید فقط حداقل permissionهای لازم را داشته باشد: **Account Filter Lists: Edit** برای custom list و **Zone WAF: Edit** برای قاعدهٔ hostname-specific. token باید به account/zone درست محدود باشد و برای سرویس‌ها یا zoneهای نامرتبط مجوز نداشته باشد.

## روند روزمرهٔ مدیر

مدیر اصلی در dashboard، مسیر **مدیریت کلان سامانه → دسترسی شبکه‌ای Open WebUI** را باز می‌کند. IPv4/IPv6 عمومی یا CIDR ثبت می‌شود؛ محدوده‌های private، loopback، link-local، multicast و CIDRهای بسیار گسترده رد می‌شوند. مدیر می‌تواند هر entry را بدون اعمال فوری، فعال، غیرفعال یا حذف کند.

دکمهٔ **«اعمال در لبه»** فقط وقتی فعال است که حداقل یک entry فعال وجود داشته و runtime Cloudflare در backend تنظیم شده باشد. پیش از تأیید، UI تعداد IP/CIDRهای فعال و خطر lockout را نمایش می‌دهد. عملیات، custom IP list را به‌صورت کامل با فهرست فعال جایگزین می‌کند و یک WAF custom rule را فقط برای hostname `ai.kaghazobaad.ir` ایجاد یا به‌روزرسانی می‌کند. عبارت rule به‌صورت مفهومی چنین است:

```text
http.host == ai.kaghazobaad.ir AND source IP is not in the managed IP list → block (403)
```

بنابراین هیچ hostname یا مسیر دیگری از کاغذ و باد تحت تأثیر قرار نمی‌گیرد. عملیات list در Cloudflare asynchronous است؛ backend فقط پس از تکمیل operation، WAF rule را به‌روزرسانی می‌کند و سپس revision را «اعمال‌شده» می‌داند.

## کنترل‌های ایمنی و rollback

| وضعیت | اقدام مدیر |
|---|---|
| `Pending edge apply` | desired state تغییر کرده و هنوز Cloudflare تغییر نکرده است؛ آدرس‌ها را بازبینی کنید و سپس apply کنید. |
| `Applied and in sync` | revision مورد نظر و revision اعمال‌شده برابرند. |
| `Last apply failed` | message/code در UI را بررسی کنید؛ token/permission/account/zone را اصلاح کنید و دوباره apply کنید. |
| احتمال lockout | پیش از apply، IP فعلی مدیر یا CIDR شبکهٔ قابل‌اعتماد را به‌عنوان entry فعال نگه دارید. |
| بازگشت | entry قبلی را دوباره فعال/ثبت کنید و Apply at edge را تأیید کنید. هیچ rollback خودکار یا job زمان‌بندی‌شده وجود ندارد. |

هر ایجاد، ویرایش، حذف و sync با actor، request ID، hash IP/user-agent و metadata بدون secret در جدول audit ثبت می‌شود. خود token Cloudflare، password Open WebUI و header authorization به audit یا پاسخ API ارسال نمی‌شوند.

## پیش‌نیاز rollout Open WebUI

قبل از deploy Open WebUI، باید allowlist حداقل یک entry فعال داشته باشد، edge sync موفق باشد، disk `openwebui-data` به `/app/backend/data` mount شود، domain `ai.kaghazobaad.ir` آماده باشد و envهای bootstrap امن Open WebUI در Liara تنظیم شوند. این قابلیت allowlist deployment خودکار Open WebUI را فعال نمی‌کند؛ deploy همچنان approval و preflight مستقل نیاز دارد.

## منابع

[1] [Cloudflare — Allow traffic from IP addresses in allowlist only](https://developers.cloudflare.com/waf/custom-rules/use-cases/allow-traffic-from-ips-in-allowlist/)

[2] [Cloudflare — Lists API endpoints](https://developers.cloudflare.com/waf/tools/lists/lists-api/endpoints/)

[3] [Cloudflare — Create a custom rule via API](https://developers.cloudflare.com/waf/custom-rules/create-api/)

[4] [Open WebUI — Hardening](https://docs.openwebui.com/getting-started/advanced-topics/hardening/)
