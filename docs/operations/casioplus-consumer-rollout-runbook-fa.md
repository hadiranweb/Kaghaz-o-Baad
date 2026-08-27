# Runbook rollout consumer Casioplus در کاغذ و باد

## مرز این تغییر

این تغییر فقط consumer کاغذ و باد را آماده می‌کند. فعال‌سازی Gateway، ایجاد یا استقرار Casioplus، و هر نوع تغییر در n8n، Open WebUI یا OpenClaw خارج از این Runbook است.

## پیش‌شرط‌های blocking

| مورد | شواهد لازم پیش از فعال‌سازی |
|---|---|
| Gateway staging Casioplus | endpoint invocation نسخهٔ `casio.flow.invoke.v1` و callback نسخهٔ `casio.flow.callback.v1` با fixture مشترک |
| tenant binding | mapping فقط‌سروری `kaghazbaad/editorial` و رد کردن tenant/client-supplied identity |
| کلیدها | دو HMAC مستقلِ جهت‌دار در secret store؛ هرکدام حداقل ۳۲ کاراکتر؛ عدم ثبت در Git، log یا query string |
| Worker | App Docker مستقل از backend و mailbox worker با health روی `/healthz` و readiness روی `/readyz` |
| داده | backup قابل‌بازیابی و اجرای موفق migration `020` در محیط staging |
| کنترل امنیت | تست signature، timestamp، nonce، replay، key rotation، idempotency و RBAC |

## ترتیب rollout

1. ابتدا migration `020_casioplus_article_snapshots_and_outbox.sql` را فقط در staging اجرا کنید. سپس migration ledger و constraintهای outbox را با queryهای read-only بررسی کنید.
2. backend کاغذ و باد را با `CASIO_PLUS_ENABLED=false` deploy کنید. این گام schema و routeها را می‌آورد اما هیچ درخواست خارجی یا worker فعالی ایجاد نمی‌کند.
3. Gateway staging را با fixtureهای versioned متصل کنید. HMAC outbound و inbound باید با کلیدهای مستقل و key ID فعال verify شوند.
4. در runtime staging، `CASIO_PLUS_ENABLED=true` را با `CASIO_OUTBOX_WORKER_ENABLED=false` فعال کنید. یک درخواست editorial از user دارای role editor/manager بسازید و تنها creation اتمیک snapshot، invocation و outbox را تأیید کنید.
5. App مستقل worker را با `CasioWorker.Dockerfile` deploy کنید، سپس `CASIO_OUTBOX_WORKER_ENABLED=true` را در همان محیط فعال کنید. نتیجهٔ invocation، receipt callback، proposal و audit event را با IDs مشاهده‌پذیر و بدون نمایش محتوا/secret تأیید کنید.
6. outage آزمایشی Gateway انجام دهید. انتظار می‌رود event پس از lease، با backoff retry شود و پس از سقف attempts به `dead_letter` برود، بدون توقف workflow مقاله.
7. ویرایش مقاله پس از queue را آزمایش کنید. event pending باید cancelled و proposalهای pending باید stale شوند. callback دیررس می‌تواند ثبت شود ولی نباید متن یا وضعیت مقاله را تغییر دهد.
8. فقط بعد از تأیید مستقل، همین ترتیب را برای production تکرار کنید: ابتدا migration، سپس backend غیرفعال، سپس Gateway/کلیدها، سپس worker و در پایان feature flag.

## متغیرهای runtime

| نام | کارکرد | وضعیت پیش از Gateway staging |
|---|---|---|
| `CASIO_PLUS_ENABLED` | gate تمام endpointهای نوشتنی و integration | `false` |
| `CASIO_PLUS_BASE_URL` | origin Gateway Casioplus | unset |
| `CASIO_PLUS_INTEGRATION_KEY` | شناسهٔ ثابت consumer | `kaghazbaad` |
| `CASIO_PLUS_SIGNING_KEY_ID` | key ID فعال | `v1` یا مقدار مدیریت‌شده |
| `KAGHAZBAAD_TO_CASIO_HMAC_SECRET` | امضای invocation outbound | unset در محیط غیرفعال |
| `CASIO_TO_KAGHAZBAAD_HMAC_SECRET` | verify callback inbound | unset در محیط غیرفعال |
| `CASIO_PLUS_PREVIOUS_SIGNING_KEY_ID` و `CASIO_TO_KAGHAZBAAD_PREVIOUS_HMAC_SECRET` | فقط overlap محدود key rotation inbound | unset مگر در rotation تأییدشده |
| `CASIO_OUTBOX_WORKER_ENABLED` | اجرای worker جداگانه | `false` |

## rollback

> feature flag اصلی مسیر rollback است. خاموش‌کردن آن، creation جدید و callback mutation را متوقف می‌کند؛ snapshotها، receiptها و proposalهای موجود برای audit نگه داشته می‌شوند.

| رخداد | اقدام فوری | داده‌ای که حفظ می‌شود |
|---|---|---|
| خطای Gateway یا timeout گسترده | `CASIO_OUTBOX_WORKER_ENABLED=false`، سپس بررسی queue | eventهای pending/leased و audit |
| اعتبارسنجی callback نامعتبر | `CASIO_PLUS_ENABLED=false` و rotate کلید inbound | receiptهای قبلی و proposalهای immutable |
| رفتار نادرست proposal | feature flag را خاموش کنید؛ proposalها را reject/stale کنید؛ هیچ auto-apply وجود ندارد | snapshot، provenance و decision history |
| نیاز به rollback release backend | ابتدا worker را متوقف کنید؛ migration additive باقی می‌ماند و حذف نمی‌شود | تمام جداول جدید به‌صورت بدون استفاده باقی می‌مانند |

## مشاهده‌پذیری و عملیات ممنوع

داشبورد مدیریتی فقط count صف pending/leased/delivered/dead-letter را می‌خواند. logها نباید شامل HMAC، متن snapshot، cookie، JWT یا URL دارای credential باشند. اجرای migration رو به عقب، حذف snapshot برای پنهان‌کردن خطا، و تغییر خودکار وضعیت مقاله توسط callback ممنوع است.
