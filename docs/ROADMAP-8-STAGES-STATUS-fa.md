# نقشهٔ راه هشت‌مرحله‌ای کاغذ و باد

## نتیجهٔ اجرایی

فایل پیوست، **نقشهٔ راه محصول و backend عملیاتی** است؛ installer و EXE در این هشت مرحله قرار نمی‌گیرند و باید به‌عنوان ابزار تحویل و آماده‌سازی deployment در کنار پروژه مدیریت شوند.

با ممیزی repository فعلی، پروژه هنوز در **مرحلهٔ اول** قرار دارد؛ البته بخشی از زیرساخت احراز هویت و migration ساخته شده است. مرحلهٔ اول هنوز قابل‌خروج نیست، زیرا endpointهای کامل workflow مقاله، ثبت eventهای عملیاتی، comment و کنترل نقش در مسیرهای واقعی backend تکمیل نشده‌اند.

## وضعیت واقعی امروز

| حوزه | وضعیت فعلی |
|---|---|
| backend مستقل Fastify/PostgreSQL | foundation ایجاد شده است. |
| migration runner و schema | ایجاد شده و برای اجرای مقصد آماده است؛ اجرای production هنوز انجام نشده است. |
| ثبت‌نام، ورود، logout و session | در backend مستقل وجود دارد. |
| نقش پایهٔ کاربر | هنگام ثبت‌نام نقش author ایجاد می‌شود و سرویس احراز هویت نقش‌ها را می‌خواند. |
| workflow مقاله در backend | هنوز endpointهای کامل انتقال وضعیت در backend فعلی دیده نمی‌شود و باید تکمیل شود. |
| activity و article workflow events | schema/foundation در برنامه وجود دارد، اما ثبت عملیاتی همهٔ مسیرها تکمیل نیست. |
| usage، quota و entitlement | schema و قراردادهای پایه وجود دارند؛ runtime enforcement هنوز ساخته نشده است. |
| AI provider و attribution | قراردادها/فیلدهای پایه وجود دارند؛ اتصال واقعی provider و ثبت token باقی است. |
| پلن‌های رایگان، دانشجویی و استادی | seed/foundation موجود است؛ پنل مدیر و سیاست نهایی باقی است. |
| پرداخت و subscription | schema پایه وجود دارد؛ درگاه، callback، invoice و تمدید باقی است. |
| LiveKit | در معماری تعریف شده؛ token endpoint، webhook و usage واقعی باقی است. |
| استقرار Liara | معماری و installer آماده‌سازی شده‌اند؛ staging، migration واقعی و production deployment باقی است. |
| installer EXE | EXE ساخته می‌شود، مسیر repository را خودکار تشخیص می‌دهد، preview و تأیید دارد و فقط کپی پیکربندی‌شده می‌سازد. |

## هشت مرحلهٔ اصلی

### مرحلهٔ اول: backend پایهٔ کاغذ و باد

هدف این مرحله ساخت مسیر قطعی احراز هویت، RBAC، workflow مقاله، comment و activity است. احراز هویت مستقل و session پایه در repository فعلی وجود دارد، اما مرحله زمانی کامل محسوب می‌شود که endpointهای `submit_for_review`، `request_changes`، `approve`، `schedule`، `publish` و `archive` در backend پیاده‌سازی شوند.

هر endpoint باید کاربر، نقش، مالکیت یا مسئولیت ویراستاری، وضعیت قبلی، انتقال مجاز، ثبت event و خطاهای قابل‌ردیابی را بررسی کند. frontend نباید منبع حقیقت انتقال وضعیت باشد.

**معیار خروج:** تست API برای نقش‌های author، editor و admin؛ ثبت `article_workflow_events`؛ ثبت comment؛ جلوگیری از انتقال غیرمجاز؛ و اتصال frontend به endpoint مستقل.

### مرحلهٔ دوم: usage gateway

تمام قابلیت‌های AI و ابزارهای قابل‌مصرف باید از gateway مشترک عبور کنند. gateway باید `request_id` بسازد، provider/model را ثبت کند، وضعیت اجرا و خطا را نگه دارد، tokenهای ورودی/خروجی/cache را دریافت کند و event قابل‌حسابرسی بسازد.

**معیار خروج:** حداقل یک provider واقعی از طریق adapter اجرا شود و برای موفقیت، خطا و timeout رکورد usage تولید کند؛ بدون اینکه frontend بتواند مقدار مصرف را جعل کند.

### مرحلهٔ سوم: enforcement سهمیه و entitlement

پیش از اجرای قابلیت، entitlement و quota باید در backend بررسی شود. ثبت مصرف باید اتمیک باشد تا درخواست‌های هم‌زمان نتوانند از سهمیه عبور کنند. تشخیص ارزان محل ویرایش، rewrite پس از کلیک، پیشنهاد عنوان و تولید محتوای پس از انتشار باید هرکدام feature key و policy مستقل داشته باشند.

**معیار خروج:** تست هم‌زمانی، رد درخواست پس از پایان quota، ثبت مصرف فقط پس از اجرای معتبر، و rollback مصرف در خطاهای قابل‌جبران.

### مرحلهٔ چهارم: داشبورد مدیر

پنل مدیر باید `plans`، `plan_parameters`، `plan_parameter_values` و entitlementها را کنترل کند. مدیر باید بتواند مقدار، واحد، دوره، فعال‌بودن و رفتار پایان سهمیه را تغییر دهد. هر تغییر باید audit شود و cache دسترسی invalid گردد.

**معیار خروج:** تغییر یک پارامتر از داشبورد، اثر آن در gateway، ثبت audit و عدم امکان تغییر توسط نقش غیرمجاز.

### مرحلهٔ پنجم: AI providerها و adapterهای OpenClaw-style

در این مرحله قراردادهای موجود به providerهای واقعی متصل می‌شوند. مدل ارزان برای تشخیص annotation و مدل قوی‌تر فقط پس از اقدام کاربر استفاده می‌شود. agent پس از انتشار ابتدا draft خلاصه، فلش‌کارت و محتوای شبکهٔ اجتماعی تولید می‌کند؛ ارسال واقعی به مقصد فقط با approval انجام می‌شود.

**معیار خروج:** حداقل یک provider واقعی، ثبت attribution و token، draft قابل ویرایش، approval انسانی و عدم ارسال خودکار بدون تأیید.

### مرحلهٔ ششم: LiveKit مستقل

LiveKit media server روی VM جداگانهٔ Liara یا LiveKit Cloud قرار می‌گیرد؛ اما token endpoint، کنترل نقش و پلن، webhook و محاسبهٔ usage در backend کاغذ و باد باقی می‌ماند. LiveKit نباید منبع حقیقت entitlement یا پرداخت باشد.

**معیار خروج:** صدور token از backend، اعمال grant بر اساس نقش/پلن، دریافت webhook، ثبت حضور و تست قطع/اتصال مجدد. installer فقط مقادیر لازم را آماده می‌کند و به LiveKit متصل نمی‌شود.

### مرحلهٔ هفتم: پرداخت و subscription

پس از تثبیت entitlement، invoice در backend ساخته می‌شود، کاربر به زرین‌پال یا IDPay می‌رود، callback دریافت و server-to-server تأیید می‌شود، payment event با idempotency ثبت می‌گردد و subscription/entitlement فعال می‌شود. frontend یا AI هرگز نباید پرداخت را تأیید کند.

**معیار خروج:** invoice، callback موفق/ناموفق، callback تکراری، پرداخت منقضی، فعال‌سازی پلن و audit کامل.

### مرحلهٔ هشتم: staging و استقرار Liara

پس از تست محلی و staging، frontend و backend روی Liara PaaS، PostgreSQL روی DBaaS، رسانه روی Object Storage و LiveKit روی VM جدا مستقر می‌شوند. مهاجرت Supabase فقط پس از export، import آزمایشی، تطبیق شمارش و checksum، تست application و rollback انجام می‌شود.

**معیار خروج:** محیط staging سالم، migration قابل rollback، health check، backup، secretهای server-side، دامنه/HTTPS، observability و runbook عملیاتی.

## ترتیب کار از امروز

کار بعدی نباید پرداخت یا AI provider باشد. ابتدا باید مرحلهٔ اول را قابل‌خروج کنیم: workflow endpointها، RBAC واقعی، comment و event ثبت‌شده در backend مستقل. سپس usage gateway و quota ساخته می‌شوند؛ زیرا پرداخت باید به entitlement پایدار متصل باشد و AI نیز باید از quota عبور کند.

ترتیب اجرایی پیشنهادی چنین است:

```text
مرحلهٔ اول → مرحلهٔ دوم → مرحلهٔ سوم → مرحلهٔ چهارم
      ↓
مرحلهٔ پنجم → مرحلهٔ ششم → مرحلهٔ هفتم → مرحلهٔ هشتم
```

## جایگاه installer در این نقشه

installer EXE یک **مسیر موازی تحویل** است، نه یکی از مراحل runtime محصول. وظیفهٔ آن تشخیص repository، گرفتن مقصد و تنظیمات، preview، تأیید و ساخت کپی خروجی است. installer نباید منتظر تکمیل پرداخت یا LiveKit بماند؛ فقط باید برای متغیرها و فایل‌های رسمی integrationهای موجود template داشته باشد.

## تصمیم فعلی

وضعیت رسمی پروژه باید چنین ثبت شود: **Stage 1 — In Progress**. احراز هویت مستقل، session و migration foundation ساخته شده‌اند؛ workflow کامل backend و ثبت عملیاتی eventها هنوز معیار خروج مرحلهٔ اول را تأمین نمی‌کنند. اجرای توسعه از endpointهای workflow و تست نقش‌ها شروع می‌شود.
