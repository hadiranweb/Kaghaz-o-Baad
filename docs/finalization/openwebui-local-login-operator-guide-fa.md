# راهنمای بهره‌برداری Open WebUI با login داخلی

**وضعیت:** جایگزین راهنمای allowlist شبکه‌ای؛ Cloudflare Access، IP allowlist و Cloudflare API از مسیر Open WebUI حذف شده‌اند.

## مدل دسترسی

Open WebUI در `https://ai.kaghazobaad.ir` صفحهٔ ورود محلی ایمیل/رمز عبور خود را نمایش می‌دهد. در نخستین startup روی disk خالی، فقط حساب bootstrap تعریف‌شده در Secret store Liara ایجاد می‌شود و signup به‌صورت قطعی غیرفعال می‌ماند. ایجاد یا فعال‌سازی کاربر بعدی فقط از پنل administrator خود Open WebUI انجام می‌شود.

> Open WebUI به PostgreSQL محصول متصل نمی‌شود. داده‌های خودش فقط روی disk مستقل `openwebui-data` در mount `/app/backend/data` نگه‌داری می‌شوند.

## کلیدهای لازم در Secret store Liara

| کلید | الزام |
|---|---|
| `WEBUI_SECRET_KEY` | مقدار یکتا و پایدار با حداقل ۳۲ کاراکتر؛ هر تغییر آن همهٔ sessionهای موجود را بی‌اعتبار می‌کند. |
| `WEBUI_ADMIN_EMAIL` | ایمیل bootstrap administrator؛ فقط در Liara Secret store. |
| `WEBUI_ADMIN_PASSWORD` | رمز یکتا و قوی با حداقل ۳۲ کاراکتر؛ هرگز در Git، chat یا log قرار نگیرد. |
| `WEBUI_URL` | دقیقاً `https://ai.kaghazobaad.ir`. |
| `ENABLE_SIGNUP` | دقیقاً `false`. |
| `ENABLE_LOGIN_FORM` / `ENABLE_PASSWORD_AUTH` | هر دو دقیقاً `true`. |
| `WEBUI_SESSION_COOKIE_SECURE` / `WEBUI_SESSION_COOKIE_SAME_SITE` | به‌ترتیب `true` و `strict`. |
| `CORS_ALLOW_ORIGIN` | دقیقاً `https://ai.kaghazobaad.ir`. |

هیچ‌یک از کلیدهای `DATABASE_URL`، `PG*`، `POSTGRES*` یا `SUPABASE_*` نباید در app Open WebUI قرار گیرد.

## مراحل نخستین راه‌اندازی

ابتدا disk `openwebui-data` را روی `/app/backend/data` و domain `ai.kaghazobaad.ir` را در Liara آماده کنید. Secretهای بالا را مستقیم در Liara ثبت کنید. سپس workflow دستی `deploy-ai-stack.yml` را فقط با service `openwebui` و confirmation `DEPLOY_OPENWEBUI` اجرا کنید. این workflow preflight، وجود disk، HTTPS، نبود اتصال مستقیم database محصول، قدرت secretها و تنظیمات local login را بدون چاپ مقدارها بررسی می‌کند.

پس از release `READY`، health endpoint `/health` و ورود administrator آزمون می‌شوند. administrator باید فوراً رمز bootstrap را از پنل Open WebUI تغییر دهد، سپس فقط مدل‌های approved را منتشر و در صورت نیاز کاربران را دستی ایجاد/فعال کند.

## کنترل‌های عملیاتی و rollback

در نبود Redis، خروج از حساب Open WebUI token را بلافاصله revoke نمی‌کند؛ برای کاهش ریسک، عمر JWT روی چهار ساعت محدود شده است. در رخداد امنیتی، ابتدا administrator را غیرفعال یا رمز را تغییر دهید، secret مشکوک را rotate کنید و در صورت نیاز به release آمادهٔ قبلی Liara بازگردید. تغییر `WEBUI_SECRET_KEY` همهٔ sessionها را باطل می‌کند اما باید به‌عنوان عملیات عمدی انجام شود.

Cloudflare می‌تواند صرفاً وظیفهٔ DNS/CDN دامنه را داشته باشد، اما Open WebUI هیچ صفحهٔ تأیید Cloudflare، rule Allowlist یا token Cloudflare مصرف نمی‌کند.

## منابع

[1]: [Open WebUI — Environment Variable Configuration](https://docs.openwebui.com/reference/env-configuration/)

[2]: [Open WebUI — Hardening](https://docs.openwebui.com/getting-started/advanced-topics/hardening/)

[3]: [Open WebUI — Authentication & Access](https://docs.openwebui.com/features/authentication-access/)
