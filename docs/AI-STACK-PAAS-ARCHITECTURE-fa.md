# معماری اجرایی Stack هوش مصنوعی کاغذ و باد روی Liara PaaS

**وضعیت:** طراحی اجرایی و قرارداد ریپو؛ آمادهٔ پیاده‌سازی مرحله‌ای، بدون استقرار خودکار تا زمان تعیین شناسهٔ اپ‌ها و secretهای production.

## تصمیم معماری

کاغذ و باد از یک معماری بدون VPS استفاده می‌کند. frontend و backend فعلی روی Liara PaaS باقی می‌مانند و هر جزء سنگین یا Dockerمحور به‌صورت یک برنامهٔ مستقل روی همان PaaS مستقر می‌شود. PostgreSQL و Object Storage همچنان سرویس‌های مستقل Liara هستند. LiveKit از سرویس managed فعلی استفاده می‌کند و runtime آن به این stack منتقل نمی‌شود.

| جزء | محل اجرا | نقش | مالک داده و مجوز |
|---|---|---|---|
| Frontend | Liara PaaS | تجربهٔ اصلی کاغذ و باد | Backend |
| Backend/Fastify | Liara PaaS | مرجع اعتماد، RBAC، quota، usage، audit و API Gateway | کاغذ و باد |
| PostgreSQL | Liara Database | دادهٔ محصول و گزارش مصرف | کاغذ و باد |
| Object Storage | Liara/S3-compatible | فایل و رسانهٔ پایدار | Backend policy |
| n8n | Liara Docker App مستقل | orchestration و اتصال webhook/API | فقط APIهای مجاز backend |
| Open WebUI | Liara Docker App مستقل | نمایش Workspace و Agentهای publish‌شده | Backend session/policy |
| OpenClaw | Liara Docker App مستقل | runtime عامل‌ها و gateway | Agent Adapter و allowlist |
| LiveKit | LiveKit Cloud managed | room، token و پخش زنده | Backend و consent policy |
| Webmail | Liara Mail یا provider مستقل | mailbox انسانی؛ جدا از transactional SMTP | مالک دامنه |

## دامنه‌های پیشنهادی

دامنه‌های زیر باید در Liara/Cloudflare ایجاد و به برنامهٔ متناظر متصل شوند. تا قبل از تأیید شناسهٔ نهایی، این‌ها فقط قرارداد نام‌گذاری هستند:

| دامنه | سرویس |
|---|---|
| `kaghazobaad.ir` | frontend اصلی |
| `api.kaghazobaad.ir` | backend عمومی |
| `n8n.kaghazobaad.ir` | n8n؛ ترجیحاً فقط دسترسی مدیر یا IP/Access policy |
| `ai.kaghazobaad.ir` | Open WebUI؛ پشت احراز و gateway |
| `agent.kaghazobaad.ir` | OpenClaw؛ عمومی‌سازی مستقیم ممنوع |

## قرارداد امنیتی

هیچ credential سرویس، کلید provider، encryption key، JWT secret یا token در Git commit نمی‌شود. متغیرهای محیطی در تنظیمات secret برنامهٔ Liara نگهداری می‌شوند. فایل‌های `liara.json` فقط شامل platform، port، health check، disk و تنظیمات غیرحساس هستند؛ استفاده از فیلد `envs` برای secretهای production ممنوع است، چون طبق مستندات Liara این فیلد می‌تواند متغیرهای قبلی برنامه را جایگزین کند [1].

Open WebUI، OpenClaw و n8n نباید مستقیماً به PostgreSQL محصول وصل شوند. هر عملیات محصولی از endpointهای backend عبور می‌کند و backend باید session/RBAC، entitlement، quota، rate limit، request ID، attribution و audit را اعمال کند. n8n فقط eventهای امضاشده و APIهای allowlist‌شده را مصرف می‌کند.

## قرارداد استقرار

هر سرویس یک context مستقل دارد و با push به `main`، فقط پس از موفقیت تست‌های مربوط به همان سرویس deploy می‌شود. workflow باید از `liara deploy` با `--team-id`، `--api-token` و نام app استفاده کند. secretهای GitHub فقط شامل token استقرار و شناسهٔ تیم هستند؛ secretهای runtime در Liara باقی می‌مانند [2].

ساختار مورد انتظار:

```text
infra/
  paas/
    n8n/
      liara.json
    open-webui/
      liara.json
    openclaw/
      liara.json
  n8n/
    workflows/
.github/workflows/
  ci.yml
  deploy-stack.yml
```

برای هر برنامه، دیسک persistent لازم است؛ filesystem موقتی PaaS محل ذخیرهٔ state، credential database، config یا لاگ دائمی نیست. health check باید قبل از پذیرش deployment اجرا شود. نسخهٔ imageهای Docker باید pin شود و استفاده از `latest` در production مجاز نیست.

## ترتیب فعال‌سازی

ابتدا manifestها و workflowها در Git ساخته می‌شوند، سپس سه App مستقل Liara با نام قطعی ایجاد می‌شوند. بعد secretهای runtime و دامنه‌ها تنظیم می‌شوند. پس از آن n8n با یک webhook آزمایشی، OpenClaw با یک Agent read-only و Open WebUI با یک مدل publish‌شده تست می‌شوند. اتصال production به eventهای مقاله و LiveKit فقط بعد از موفقیت health check، audit و rollback test فعال خواهد شد.

## منابع

[1]: https://docs.liara.ir/paas/liarajson/ "مستندات رسمی فایل liara.json در Liara"

[2]: https://docs.liara.ir/paas/cicd/github/ "مستندات رسمی GitHub Actions و استقرار Liara"

[3]: https://docs.openclaw.ai/install/docker "مستندات رسمی Docker برای OpenClaw"
