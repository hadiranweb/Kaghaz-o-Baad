# Runbook فعال‌سازی کنترل‌شدهٔ n8n، OpenClaw و Open WebUI در Liara

**تاریخ:** ۲۶ اوت ۲۰۲۶
**وضعیت:** آماده برای rollout مرحله‌ای پس از merge و تکمیل gateهای runtime
**اصل:** یک سرویس در هر release؛ بدون deployment خودکار AI؛ بدون دسترسی مستقیم به پایگاه‌دادهٔ محصول.

## هدف و مرز امنیتی

این runbook برای سه App Docker موجود در Liara نوشته شده است: `kaghazbaad-n8n`، `kaghazbaad-openclaw` و `kaghazbaad-openwebui`. هر App باید فقط از APIهای allowlist‌شدهٔ backend عبور کند؛ backend همچنان مرجع احراز هویت، RBAC، quota، rate limit، attribution و audit است. وجود `DATABASE_URL`، `PG*`، `POSTGRES*` یا `SUPABASE_*` در environment هر App AI در preflight ممنوع و مانع deployment است.

> Liara در `liara.json` اجازهٔ `envs` می‌دهد، اما استفاده از آن تمام متغیرهای قبلی App را جایگزین می‌کند. بنابراین تمام Secretها فقط در Liara Secret store نگهداری می‌شوند و هیچ مقدار runtime در Git ثبت نمی‌شود.[1]

## ترتیب اجباری rollout

| مرحله | سرویس | هدف کم‌خطر | gate خروج |
|---:|---|---|---|
| 0 | Auth/SMS/SMTP | delivery کنترل‌شدهٔ یک OTP و یک email verification | delivery موفق و log redacted بدون خطای provider |
| 1 | n8n | webhook تشخیصی HMAC و read-only | disk، domain policy، health، reject signature/replay و rollback |
| 2 | OpenClaw | یک Gateway مدیرمحور با ابزارهای read-only | Gateway token، security audit، deny شدن exec/filesystem/automation و revoke |
| 3 | Open WebUI | یک admin و یک مدل محدود | login داخلی، عدم signup عمومی، health، مدل محدود و revoke |

هیچ مرحله‌ای با عبور مرحله قبل جایگزین نمی‌شود. در صورت failure delivery Auth، health check، disk، domain policy یا rollback، release بعدی اجرا نمی‌شود.

## یک‌بار پیش از هر deployment

برای هر App، ابتدا disk persistent با نام و mount زیر باید در Liara وجود داشته باشد. Liara API ایجاد disk را برای App مشخص با `name` و `size` تعریف می‌کند؛ manifestهای repository نیز در هنگام deployment همان disk را mount می‌کنند.[2]

| App | Disk | Mount path | Domain پیشنهادی | policy لازم |
|---|---|---|---|---|
| `kaghazbaad-n8n` | `n8n-data` | `/home/node/.n8n` | `n8n.kaghazobaad.ir` | `admin-only` پشت Cloudflare Access/IP allowlist |
| `kaghazbaad-openclaw` | `openclaw-state` | `/home/node/.openclaw` | `agent.kaghazobaad.ir` | `admin-only`؛ public exposure ممنوع |
| `kaghazbaad-openwebui` | `openwebui-data` | `/app/backend/data` | `ai.kaghazobaad.ir` | login داخلی Open WebUI، signup غیرفعال؛ Cloudflare Access/IP allowlist ندارد |

برای custom domain، domain باید در Liara ایجاد و سپس با شناسهٔ domain و project به App وصل شود.[3] سیاست بیرونی دسترسی فقط برای سرویس‌هایی مانند n8n/OpenClaw که در جدول بالا صراحتاً آن را می‌خواهند ارزیابی می‌شود. Open WebUI در این rollout فقط از login محلی خود استفاده می‌کند و هیچ attestation، Cloudflare Access یا IP allowlist ندارد.

## تنظیم Secretها در Liara

تمام مقدارهای حساس در Console/Secret store Liara ثبت می‌شوند؛ در chat، Git و issue قرار نمی‌گیرند. مقادیر URL و policyهای غیرحساس نیز بهتر است در همان store ثبت شوند تا preflight قابل‌ممیزی بماند.

### Backend: کلیدهای adapter

| سرویس | کلید backend | مقدار مورد انتظار |
|---|---|---|
| n8n | `N8N_BASE_URL` | `https://n8n.kaghazobaad.ir` |
| n8n | `N8N_EVENT_WEBHOOK_URL` | webhook production n8n با path اختصاصی و غیرقابل‌حدس |
| n8n | `N8N_WEBHOOK_SECRET` | HMAC secret حداقل ۳۲ کاراکتر، جدا از encryption key n8n |
| OpenClaw | `OPENCLAW_BASE_URL` | `https://agent.kaghazobaad.ir` |
| OpenClaw | `OPENCLAW_GATEWAY_TOKEN` | token حداقل ۳۲ کاراکتر و برابر با token App OpenClaw |
| Open WebUI | `OPENWEBUI_BASE_URL` | `https://ai.kaghazobaad.ir` |

### n8n App

| کلید | مقدار/قاعده |
|---|---|
| `N8N_ENCRYPTION_KEY` | Secret پایدار حداقل ۳۲ کاراکتر؛ پس از تولید credential تغییر ناگهانی ندهید. |
| `N8N_HOST` | `n8n.kaghazobaad.ir` |
| `N8N_PROTOCOL` | `https` |
| `N8N_EDITOR_BASE_URL` | `https://n8n.kaghazobaad.ir` |
| `WEBHOOK_URL` | `https://n8n.kaghazobaad.ir` |
| `KAGHAZBAAD_ACCESS_POLICY` | دقیقاً `admin-only`، فقط پس از اعمال access policy بیرونی |

n8n Webhook Node از روش‌های authentication از جمله Basic، Header و JWT پشتیبانی می‌کند؛ در این پروژه، علاوه بر آن HMAC-SHA256 backend و timestamp/replay window لازم است.[4]

### OpenClaw App

| کلید | مقدار/قاعده |
|---|---|
| `OPENCLAW_GATEWAY_TOKEN` | Secret حداقل ۳۲ کاراکتر؛ با backend دقیقاً یکسان باشد. |
| `KAGHAZBAAD_ACCESS_POLICY` | دقیقاً `admin-only` پس از اعمال policy بیرونی. |

راه‌انداز پروژه در نخستین startup، config Gateway را با `gateway.auth.mode = token`، session isolation و deny کردن گروه‌های automation/runtime/filesystem ایجاد می‌کند. OpenClaw خود تأکید می‌کند که یک Gateway مرز امن multi-tenant برای کاربران adversarial نیست؛ برای trust boundary متفاوت باید Gateway جداگانه استفاده شود. همچنین پیش از exposure باید `openclaw security audit --deep` اجرا و یافتهٔ critical باقی‌مانده صفر باشد.[5]

### Open WebUI App

| کلید | مقدار/قاعده |
|---|---|
| `WEBUI_SECRET_KEY` | Secret پایدار حداقل ۳۲ کاراکتر؛ برای JWT و encryption داده‌های حساس استفاده می‌شود. |
| `WEBUI_URL` | `https://ai.kaghazobaad.ir`، پیش از استفاده از OAuth/SSO تنظیم شود. |
| `WEBUI_ADMIN_EMAIL` | email مدیر bootstrap؛ فقط در Secret store. |
| `WEBUI_ADMIN_PASSWORD` | password قوی و یکتا، حداقل ۳۲ کاراکتر؛ فقط در Secret store. |
| `ENABLE_SIGNUP` | دقیقاً `false` |
| `ENABLE_LOGIN_FORM` و `ENABLE_PASSWORD_AUTH` | دقیقاً `true` تا login محلی قابل استفاده باشد |
| `WEBUI_SESSION_COOKIE_SECURE` و `WEBUI_SESSION_COOKIE_SAME_SITE` | به‌ترتیب `true` و `strict` روی HTTPS |
| `JWT_EXPIRES_IN` | حداکثر `4h` در نبود Redis برای token revocation |
| `CORS_ALLOW_ORIGIN` | دقیقاً `https://ai.kaghazobaad.ir` |

Open WebUI RBAC و کنترل resource را ارائه می‌کند؛ resourceها private-by-default هستند، اما role و group به‌صورت additive عمل می‌کنند. بنابراین در rollout اول تنها یک admin ایجاد و تنها یک مدل publish می‌شود.[6] `WEBUI_SECRET_KEY` باید صریح و پایدار باشد، زیرا برای امضای JWT و encryption دادهٔ حساس به کار می‌رود؛ تغییر آن tokenها و secretهای رمز‌شدهٔ پیشین را بی‌اعتبار می‌کند.[7]

## اجرای workflow دستی

فایل `.github/workflows/deploy-ai-stack.yml` تنها با `workflow_dispatch` اجرا می‌شود و هیچ trigger مبتنی بر `push` یا `pull_request` ندارد. GitHub environment `production` باید approval را enforce کند. هر run فقط یک App را deploy می‌کند و پیش از deployment موارد زیر را بدون چاپ value بررسی می‌کند:

1. وجود Secretهای GitHub برای Liara و وجود کلیدهای runtime لازم در Liara.
2. حداقل طول Secretهای حساس، تطابق token OpenClaw با backend و URLهای HTTPS صحیح.
3. وجود disk و mount موردنیاز.
4. ممنوع‌بودن پیکربندی database مستقیم در App AI.
5. برای n8n/OpenClaw، وجود access-policy attestation بعد از فعال‌سازی واقعی policy؛ Open WebUI از این gate مستثنا است و login داخلی دارد.
6. pinned بودن image و نبودن `env/envs` در manifest.

| سرویس انتخابی | confirmation لازم در workflow | health/release verification |
|---|---|---|
| `n8n` | `DEPLOY_N8N` | Liara `READY` و `https://n8n.kaghazobaad.ir/healthz` |
| `openclaw` | `DEPLOY_OPENCLAW` | Liara `READY` و health check داخلی container؛ probe عمومی عمداً ندارد |
| `openwebui` | `DEPLOY_OPENWEBUI` | Liara `READY` و `https://ai.kaghazobaad.ir/health` |

استقرار Docker با Liara CLI و team ID پشتیبانی می‌شود؛ credential deployment باید در GitHub Secret باقی بماند.[8]

## آزمون release و rollback

پس از هر deployment، فقط همان سرویس آزمون می‌شود.

| سرویس | آزمون success | آزمون failure/rollback |
|---|---|---|
| n8n | دریافت event HMAC معتبر، ثبت request ID، پاسخ workflow read-only | HMAC غلط یا timestamp قدیمی باید reject شود؛ workflow disable و بازگشت release قبلی |
| OpenClaw | Gateway auth با token معتبر، `security audit --deep` پاک، agent بدون exec/fs | token غلط باید reject شود؛ revoke token و بازگشت release قبلی |
| Open WebUI | login admin، signup غیرفعال، مدل محدود، route health | revoke دسترسی، حذف model exposure و بازگشت release قبلی |

اگر نیاز به rollback باشد، App را به release آمادهٔ قبلی در Liara برگردانید، tokenهای مشکوک را rotate کنید و سپس logهای redacted را بررسی کنید. برای n8n/OpenClaw کنترل بیرونی دسترسی در طول rollback حفظ می‌شود؛ Open WebUI بر login داخلی خود متکی است. rollback هر سرویس مستقل از frontend/backend/core است.

## وضعیت فعلی و شرط شروع

در ممیزی ۲۶ اوت، هر سه App AI در Liara `ACTIVE` دیده شدند، اما environment key قابل‌استفاده‌ای نداشتند و log عملیاتی قابل‌مشاهده‌ای برای آن‌ها برنگشت. بنابراین preflight کنونی عمداً block خواهد شد تا disk، domain/policy و کلیدهای جدول‌های بالا تکمیل شوند. این رفتار شکست نیست؛ کنترل طراحی‌شده برای جلوگیری از release ناامن است.

پیش از مرحله ۱، canary Auth نیز باید با شماره و email آزمایشیِ تحت مالکیت کاربر و مجوز صریح ارسال انجام شود. اگر SMS.ir یا SMTP delivery ناموفق باشد، این runbook متوقف می‌شود.

## مراجع

[1]: [Liara — فایل liara.json و هشدار دربارهٔ جایگزینی `envs`](https://docs.liara.ir/paas/liarajson/)

[2]: [Liara PaaS API — ایجاد disk برای App](https://developers.liara.ir/pass/disks/create-a-disk.md)

[3]: [Liara PaaS API — ایجاد و اتصال domain به project](https://developers.liara.ir/pass/domains/create-a-domain.md) و [اتصال domain](https://developers.liara.ir/pass/domains/set-a-domain-for-project.md)

[4]: [n8n — Webhook node و authentication](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook)

[5]: [OpenClaw — Gateway security، trust boundary و security audit](https://docs.openclaw.ai/gateway/security)

[6]: [Open WebUI — Authentication، RBAC و access control](https://docs.openwebui.com/features/authentication-access/)

[7]: [Open WebUI — `WEBUI_SECRET_KEY` و پایداری encryption/JWT](https://docs.openwebui.com/reference/env-configuration/)

[8]: [Liara — CI/CD با GitHub Actions و deployment CLI](https://docs.liara.ir/paas/cicd/github/)
