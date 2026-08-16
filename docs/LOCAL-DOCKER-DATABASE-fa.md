# محیط PostgreSQL محلی با Docker Compose

این محیط فقط برای development و integration test است. Compose سه سرویس دارد: PostgreSQL، migration runner و backend. migration runner بعد از healthy شدن PostgreSQL اجرا می‌شود و backend فقط پس از موفقیت migration بالا می‌آید.

## پیش‌نیاز

روی رایانهٔ توسعه باید Docker و Docker Compose v2 نصب باشد. در این sandbox، Docker در دسترس نبود؛ بنابراین فایل‌ها و syntax اسکریپت بررسی شدند، اما اجرای واقعی container در همین محیط انجام نشده است.

## راه‌اندازی اول

از ریشهٔ repository اجرا کنید:

```bash
cp .env.local.example .env.local
./scripts/local-db.sh start
```

اگر `.env.local` وجود نداشته باشد، اسکریپت آن را به‌صورت خودکار از `.env.local.example` می‌سازد. مقدارهای فایل برای development هستند و نباید در production یا Git استفاده شوند.

پس از اجرای موفق، backend در این نشانی در دسترس است:

```text
http://localhost:8080
```

healthcheck:

```bash
curl http://localhost:8080/health
```

## فرمان‌ها

| فرمان | کاربرد |
|---|---|
| `./scripts/local-db.sh start` | روشن‌کردن PostgreSQL، اجرای migration و روشن‌کردن backend |
| `./scripts/local-db.sh migrate` | اجرای migrationهای جدید روی database محلی |
| `./scripts/local-db.sh status` | نمایش وضعیت سرویس‌ها |
| `./scripts/local-db.sh logs backend` | مشاهدهٔ log backend |
| `./scripts/local-db.sh logs migrate` | مشاهدهٔ log migration runner |
| `./scripts/local-db.sh stop` | توقف سرویس‌ها بدون حذف volume |
| `./scripts/local-db.sh down` | توقف و حذف containerها و network |
| `./scripts/local-db.sh reset` | حذف volume database، ساخت database خالی و اجرای همهٔ migrationها |

## اتصال تست‌ها

پس از `start`، integration test با credentials آزمایشی اجرا می‌شود:

```bash
cd backend
TEST_BASE_URL=http://127.0.0.1:8080 \
TEST_EMAIL=test@example.local \
TEST_PASSWORD='local-test-password-123' \
npm run test:integration
```

برای k6 باید ابتدا یک token و article UUID آزمایشی داشته باشید:

```bash
cd backend
BASE_URL=http://127.0.0.1:8080 \
TEST_TOKEN='<local-session-token>' \
TEST_ARTICLE_ID='<local-article-uuid>' \
VUS=5 DURATION=30s AI_RATE=2 AI_DURATION=20s \
npm run test:k6
```

## نکات امنیتی

`docker-compose.local.yml` هیچ secret production ندارد. مقدارهای پیش‌فرض برای توسعهٔ محلی‌اند و باید در محیط واقعی با secret manager یا environment امن جایگزین شوند. فایل `.env.local` نباید commit شود. اجرای `reset` تمام داده‌های database محلی را حذف می‌کند و نباید علیه `DATABASE_URL` واقعی استفاده شود.

## وضعیت migration

migration runner فایل‌های شماره‌گذاری‌شده را به‌ترتیب اجرا می‌کند و checksum هر migration را در `schema_migrations` نگه می‌دارد. اگر محتوای migration اعمال‌شده تغییر کرده باشد، runner با `migration_checksum_mismatch` متوقف می‌شود؛ migration قبلی نباید ویرایش شود و باید migration جدید اضافه گردد.
