# قرارداد حاکم و غیرقابل‌مذاکرهٔ کاغذ و باد

**وضعیت:** سند حاکم پروژه  
**زبان مرجع:** فارسی، با پشتیبانی رسمی انگلیسی  
**دامنه:** محصول، معماری، داده، امنیت، توسعه و استقرار  
**اصل اجرایی:** هیچ کد، migration، سرویس، refactor یا تصمیم استقراری نباید با این سند تعارض داشته باشد.

---

## ۱. اصل حاکمیت سند

این سند مرجع بالادستی پروژه است. هر تصمیم جدید باید پیش از اجرا با آن تطبیق داده شود. اگر نیاز جدیدی با این سند تعارض داشت، اجرای آن متوقف می‌شود و ابتدا همین سند با تأیید صریح مالک محصول اصلاح خواهد شد.

هیچ‌کس، از جمله توسعه‌دهنده یا عامل هوش مصنوعی، مجاز نیست تعارض را با حدس، سلیقهٔ فنی، سرعت توسعه یا «راه موقت» نادیده بگیرد. راه موقت فقط زمانی مجاز است که به‌صراحت با برچسب `TRANSITIONAL` ثبت شود، مقصد و تاریخ حذف داشته باشد و با معماری نهایی اشتباه گرفته نشود.

## ۲. هویت محصول

محصول **کاغذ و باد** یک پلتفرم آکادمیک دو‌زبانه برای تولید، ویرایش، بررسی، انتشار و توسعهٔ محتوای علمی است. محصول شامل مقاله، رسانه، اسلاید، جلسهٔ زنده، ابزارهای AI، workflow تحریریه، پلن، اشتراک و پرداخت خواهد بود.

کاغذ و باد مالک منطق کسب‌وکار، مدل داده، مجوزها، workflow، قیمت‌گذاری، quota، entitlement، پرداخت و تجربهٔ کاربر است. هیچ زیرساخت، provider یا پروژهٔ متن‌باز مالک معماری محصول محسوب نمی‌شود.

## ۳. معماری نهایی اجباری

معماری نهایی باید متعلق به خودِ کاغذ و باد و روی زیرساخت Liara باشد:

```text
Frontend کاغذ و باد       → Liara PaaS
Backend/API کاغذ و باد    → Liara PaaS
PostgreSQL کاغذ و باد     → Liara DBaaS
رسانه و فایل              → Liara Object Storage
دامنه و HTTPS             → Liara DNS/SSL
ایمیل تراکنشی             → Liara Mail، در صورت نیاز
LiveKit Media Server      → سرور مجزای Liara یا LiveKit Cloud
درگاه ایرانی              → اتصال server-side از Backend کاغذ و باد
SMS.ir                    → اتصال server-side از Backend کاغذ و باد
AI Providerها             → اتصال server-side از Backend کاغذ و باد
```

### ممنوعیت Supabase

Supabase مقصد نهایی نیست و نباید در معماری production کاغذ و باد استفاده شود. هیچ migration، Edge Function، RPC، Auth، Storage یا API جدیدی برای Supabase به‌عنوان مسیر محصول نوشته یا deploy نمی‌شود.

کد Supabase موجود در repo فقط **میراث انتقالی** است. می‌توان از آن برای فهم schema و منطق فعلی استفاده کرد، اما هر قابلیت جدید باید در backend مستقل کاغذ و باد پیاده شود. هر فایل انتقالی باید با `TRANSITIONAL` مشخص شود و پیش از production حذف یا جایگزین شود.

## ۴. تفکیک مسئولیت سرویس‌ها

Liara زیرساخت است، نه منطق محصول. frontend، backend، workflow، احراز هویت، RBAC، usage، quota، subscription و payment متعلق به کاغذ و باد هستند.

LiveKit فقط media server و ارتباط real-time را فراهم می‌کند. صدور token، بررسی entitlement، تعیین نقش شرکت‌کننده، ثبت webhook و محاسبهٔ مصرف باید در Backend کاغذ و باد انجام شود. LiveKit حق تصمیم‌گیری دربارهٔ پلن، پرداخت یا دسترسی تجاری را ندارد.

## ۵. workflow مقاله

workflow پیش‌فرض از الگوی وردپرس/ویکی‌پدیا اقتباس می‌شود:

```text
draft
  → in_review
  → changes_requested ↔ draft
  → approved
  → scheduled
  → published
  → archived
```

نویسنده یا contributor می‌تواند مقاله را برای بررسی ارسال کند. editor یا admin مسئول درخواست اصلاح، تأیید، زمان‌بندی، انتشار و بایگانی است. هیچ انتقال وضعیتی صرفاً با frontend یا پاسخ AI معتبر نیست؛ backend باید هویت، نقش، مالکیت، وضعیت قبلی و مجازبودن انتقال را بررسی کند و event تغییر را ثبت نماید.

## ۶. AI، n8n، OpenClaw و Open WebUI

AI اختیاری، مرحله‌ای و وابسته به محل استفاده است. قابلیت‌های رسمی عبارت‌اند از پیشنهاد عنوان پیش از نگارش، تشخیص کم‌هزینهٔ محل‌های نیازمند ویرایش، نمایش annotation/comment در متن، rewrite فقط پس از کلیک و درخواست کاربر، و تولید خلاصه، فلش‌کارت یا محتوای مقصد پس از انتشار.

مدل ارزان برای تشخیص و مدل قوی‌تر برای rewrite استفاده می‌شود. تشخیص annotation نباید خودکار هزینهٔ rewrite ایجاد کند. تولید محتوای مقصد ابتدا باید draft بسازد و انتشار خارجی فقط با تأیید کاربر انجام شود.

سرویس‌های کمکی با این مرز پذیرفته شده‌اند:

- n8n فقط Orchestrator داخلی Workflowهاست؛
- OpenClaw Runtime عامل‌های محدود و Tool-allowlisted است؛
- Open WebUI محیط خصوصی تیم برای مدل و Prompt است، نه رابط عمومی؛
- Backend تنها درگاه عمومی AI و مالک Auth، Usage، Quota، Entitlement، Redaction و Audit است؛
- Agentها حق دسترسی مستقیم به Production DB ندارند؛
- هر قابلیت AI باید Feature Flag، Kill Switch، Budget و Human approval متناسب داشته باشد.

خرابی این سرویس‌ها نباید Auth، Workflow، مطالعه، Media، Live یا Payment را مختل کند. جزئیات در `docs/adr/0003-auxiliary-ai-stack.md` ثبت شده است.

## ۷. usage، quota و attribution

تمام مصرف AI و ابزارها باید از usage gateway کاغذ و باد عبور کند. هر execution باید حداقل این اطلاعات را ثبت کند:

| دسته | دادهٔ اجباری |
|---|---|
| هویت | user، request و correlation ID |
| قابلیت | feature key و tool name |
| مدل | provider، model و نسخهٔ pricing |
| مصرف | input token، output token، cache token یا واحد مصرف اختصاصی |
| هزینه | currency، مبلغ snapshot‌شده و نرخ زمان اجرا |
| نتیجه | started، succeeded، failed، cancelled |
| امنیت | approval، actor، source و audit metadata |

AI هرگز منبع حقیقت مبلغ، quota، اشتراک یا پرداخت نیست. محاسبهٔ تومان باید deterministic و در Backend/Database کاغذ و باد انجام شود. نرخ pricing هنگام مصرف snapshot می‌شود تا تغییر نرخ آینده سوابق گذشته را تغییر ندهد.

## ۸. پلن‌ها و دسترسی

پلن‌های رسمی محصول عبارت‌اند از:

1. **رایگان**؛
2. **دانشجویی**؛
3. **استادی**.

پارامترها، مقدار، واحد، دوره، فعال‌بودن و رفتار پایان سهمیه باید از داشبورد مدیر قابل تنظیم باشند. کنترل سهمیه باید server-side و اتمیک باشد و به مخفی‌کردن دکمه در frontend محدود نشود.

## ۹. پرداخت و اشتراک

پرداخت، subscription، entitlement، فاکتور، تمدید، انقضا، لغو، callback، idempotency و refund متعلق به Backend کاغذ و باد هستند. frontend یا AI حق تأیید پرداخت را ندارند. ابتدا entitlement و quota تثبیت می‌شوند، سپس درگاه ایرانی متصل می‌شود.

هیچ درگاه، کلید خصوصی، secret یا credential واقعی نباید در frontend، Git، فایل migration عمومی یا log قرار گیرد.

## ۱۰. احراز هویت و RBAC

احراز هویت باید در Backend مستقل کاغذ و باد پیاده شود. حداقل نقش‌های محصول عبارت‌اند از author، contributor، editor و admin. مجوز هر عملیات در Backend بررسی می‌شود و frontend فقط رابط کاربری است.

session، refresh/revoke، reset، OTP در صورت نیاز، rate limit، audit log و حفاظت از secretها جزء مسئولیت Backend هستند. وجود کاربر در frontend یا وجود یک نقش ادعایی در request برای اعطای مجوز کافی نیست.

## ۱۱. داده، Storage و مهاجرت

PostgreSQL روی Liara DBaaS منبع نهایی داده است. فایل‌ها روی Liara Object Storage قرار می‌گیرند و URL عمومی یا signed URL باید از Backend صادر شود. رسانه‌ها نباید در filesystem موقت PaaS ذخیره شوند.

مهاجرت از Supabase فقط پس از تهیهٔ schema مقصد، mapping داده، export رمزنگاری‌شده، import آزمایشی، تطبیق شمارش و checksum، تست application و rollback انجام می‌شود. حذف منبع قدیمی قبل از تأیید کامل ممنوع است.

## ۱۲. LiveKit

برای شروع، LiveKit روی یک سرور مجزای Liara با Docker Compose و دامنهٔ اختصاصی اجرا می‌شود. روش‌های آینده مانند چند node، Kubernetes، LiveKit Cloud، Ingress، Egress یا agent server فقط بر اساس نیاز واقعی و با تصمیم جدید اضافه می‌شوند.

Backend کاغذ و باد باید token endpoint، role grant، webhook، session accounting و health check را ارائه کند. server مجزای LiveKit باید DNS، SSL، firewall، TURN و پورت‌های WebRTC را مستقل مدیریت کند.

## ۱۳. قواعد توسعه و branch

`main` و branch منبع کامل کاربر نباید بدون تأیید صریح تغییر کنند. توسعه در branch مستقل انجام می‌شود. هر commit باید کوچک، نام‌گذاری‌شده، قابل بازگشت و مرتبط با یک هدف باشد.

کد جدید نباید به سرویس انتقالی وابسته شود. هر dependency خارجی باید با دلیل، مجوز، secret model، هزینه، fallback و مسیر حذف ثبت شود. قبل از هر تغییر schema یا استقرار، build، تست، بررسی امنیتی و rollback plan لازم است.

## ۱۴. شرایط توقف اجباری

در موارد زیر توسعه باید متوقف و از مالک محصول سؤال شود:

- معلوم نباشد کد برای Liara یا یک سرویس انتقالی نوشته می‌شود؛
- نیاز به انتخاب provider، درگاه، قیمت، retention یا سیاست refund باشد؛
- تغییر مخرب در داده، branch یا production محتمل باشد؛
- schema یا migration بدون محیط آزمایشی و rollback plan باشد؛
- AI قرار باشد بدون درخواست یا تأیید کاربر هزینه ایجاد کند؛
- یک provider خارجی بخواهد مالک منطق محصول شود؛
- اطلاعات کافی دربارهٔ نقش‌ها، مجوز یا رفتار تجاری وجود نداشته باشد.

## ۱۵. معیار پذیرش هر قابلیت

هر قابلیت فقط زمانی «انجام‌شده» محسوب می‌شود که کد backend، تست منطقی، کنترل مجوز، ثبت event، مستندات، متغیرهای محیطی، migration مقصد، build و rollback آن مشخص باشد. وجود فایل یا قرارداد TypeScript به‌تنهایی به معنی فعال‌بودن قابلیت نیست.

## ۱۶. وضعیت فعلی و تصحیح سابقه

در خط مبنای `main@0a7903e`، Backend مستقل، Migrationهای PostgreSQL و Deployment Liara پیاده‌سازی شده‌اند. Runtime Frontend دیگر import یا dependency از Supabase ندارد. پوشهٔ `supabase/` فقط **TRANSITIONAL ARCHIVE** است و نباید Build یا Deploy شود.

پروژه در وضعیت `Production Hardening — In Progress` قرار دارد. وجود Runtime گسترده به معنی تأیید عملیاتی نیست؛ تست Integration، Staging، Security، Observability، Backup و Rollback هنوز Gate انتشار هستند.

هر گزارش آینده باید صریحاً میان این چهار وضعیت تفاوت بگذارد:

| وضعیت | معنی |
|---|---|
| طراحی‌شده | در سند یا قرارداد تعریف شده، ولی Runtime ندارد |
| پیاده‌سازی‌شده | کد نوشته و Build شده است |
| تأییدشده | تست خودکار روی زیرساخت واقعی یا جایگزین کنترل‌شده پاس شده است |
| عملیاتی | Deploy، Secret، Migration، Monitoring و Runbook فعال و تأیید شده‌اند |

وضعیت تفصیلی در `docs/ROADMAP-8-STAGES-STATUS-fa.md` نگهداری می‌شود.

**پایان قرارداد.**
