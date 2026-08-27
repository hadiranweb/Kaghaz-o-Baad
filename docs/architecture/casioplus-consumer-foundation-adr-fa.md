# ADR: پایهٔ consumer کاغذ و باد برای Casioplus

**وضعیت:** پذیرفته‌شده برای پیاده‌سازی مرحله‌ای، با rollout غیرفعال تا آماده‌شدن Gateway در staging

## زمینه

کاغذ و باد System of Record مقاله، محتوای نسخه‌دار، workflow نشر، کاربران و RBAC، quota، usage، billing و Live است. Casioplus Control Plane مرکزی Flow، runtime، provenance، artifact و حافظهٔ سازمانی خواهد بود. این دو سامانه با API/Webhook امضاشده همکاری می‌کنند و هیچ‌یک به database داخلی دیگری اتصال مستقیم ندارد.

## تصمیم‌ها

| موضوع | تصمیم |
|---|---|
| Flow نخست | `article_editorial_suggestion` و فقط با درخواست صریح editor یا مدیر مجاز |
| اجرا | asynchronous و durable: snapshot → invocation → outbox → Gateway → callback → proposal |
| مالک محتوا | کاغذ و باد؛ Casioplus فقط snapshot محدود و referenceهای اجرای Flow را دریافت می‌کند |
| نتیجهٔ AI | proposal/annotation قابل review؛ هیچ callbackی مجاز به approve/publish مقاله یا تغییر role/quota/billing نیست |
| tenant MVP | mapping فقط‌سروری و ثابت `kaghazbaad/editorial` در Casioplus؛ client آن را تعیین نمی‌کند |
| هویت سرویس | HMAC دوطرفه، کلیدهای مستقل، timestamp، nonce، key id و idempotency key |
| runtimeها | Native Worker Casioplus؛ n8n، Open WebUI و OpenClaw dependency فاز اول نیستند و HOLD می‌مانند |
| feature flag | `CASIO_PLUS_ENABLED=false` تا پس از Gateway staging، contract E2E و rollout کنترل‌شده |

## پیامدها

کاغذ و باد باید snapshot immutable، outbox پایدار، invocation/proposal domain و callback verifier داشته باشد. failure کاسیوپلاس نباید transitionهای مقاله را متوقف کند؛ event retry یا dead-letter می‌شود. پیشنهادهای stale تنها برای مشاهده/review نگه‌داری می‌شوند و به‌طور خودکار روی متن تازه اعمال نمی‌گردند.

## خارج از دامنه

ساخت Studio داخل کاغذ و باد، اتصال مستقیم runtime به PostgreSQL کاغذ و باد، ارسال JWT/cookie در query string، memory بدون scope، public exposure OpenClaw و فعال‌سازی هر سرویس AI در Liara خارج از این تغییرات هستند.

## معیار rollout

فعال‌شدن feature flag تنها پس از وجود Gateway staging، fixtureهای contract، HMAC/replay test، callback idempotency test، outage test، migration evidence و تأیید مستقل production مجاز است.
