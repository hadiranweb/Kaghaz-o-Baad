# ADR: آمادگی consumer Studio در کاغذ و باد

**وضعیت:** پذیرفته‌شده برای پیاده‌سازی؛ اتصال شبکه‌ای خارجی هنوز غیرفعال است.

## زمینه

کاغذ و باد امروز دو قابلیت محصولی AI—پیشنهاد عنوان و بازنویسی—را از routeهای محصول مستقیماً به adapter سازگار با OpenAI متصل می‌کند. این ساختار برای اتصال آینده به Studio مرکزی مناسب نیست، زیرا policy محصول، قرارداد قابلیت و انتخاب runtime در routeها پراکنده می‌شود. frontend از ابتدا provider خارجی را مستقیم صدا نمی‌زند و این مرز حفظ می‌شود.

## تصمیم

یک **Studio Consumer داخلی** در backend کاغذ و باد ایجاد می‌شود. routeهای محصول فقط با این service صحبت می‌کنند. service از capability ثابت استفاده می‌کند و بر پایهٔ configuration fail-closed یکی از این حالت‌ها را انتخاب می‌کند:

| حالت | رفتار |
|---|---|
| `disabled` | درخواست قابلیت Studio با خطای کنترل‌شدهٔ `studio_not_configured` رد می‌شود؛ هیچ اتصال خارجی برقرار نمی‌شود. |
| `direct_compat` | فقط برای سازگاری موقت و با flag صریح، adapter موجود OpenAI-compatible پشت Studio Consumer استفاده می‌شود. |
| `external_studio` | پس از آماده‌شدن Studio کاسیو پلاس و contract E2E، outbox و callback امضاشدهٔ موجود استفاده می‌شوند. این حالت در این تغییر فعال نمی‌شود. |

Studio Consumer مسئول policy قابلیت، contract version، timeout، metadata امن و mapping خطاست. routeهای محصول مسئول authentication، authorization، quota، rate limit، cache و HTTP response هستند. هیچ متن، secret، JWT یا URL credentialدار در audit/telemetry نوشته نمی‌شود.

## non-goalها

این ADR Casioplus را تغییر نمی‌دهد، runtime یا App AI جدید deploy نمی‌کند، key/runtime secret تولید نمی‌کند، و ownership مقاله یا RBAC کاغذ و باد را منتقل نمی‌کند. callback خارجی همچنان فقط proposal قابل‌داوری ایجاد می‌کند و هیچ mutation خودکار مقاله ندارد.

## migration

ابتدا consumer داخلی و flagهای fail-closed افزوده می‌شوند، سپس imports مستقیم در routeهای محصول حذف می‌گردند. حالت compatibility فقط در صورتی که configuration موجود صریحاً اجازه دهد حفظ می‌شود. پس از contract test مشترک با Studio، rollout خارجی از طریق flag انجام می‌شود. در هر زمان خاموش‌کردن flag، راه rollback فوری است و تغییر schema یا دادهٔ مقاله لازم ندارد.
