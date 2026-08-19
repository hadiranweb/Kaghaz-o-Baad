# قرارداد مرحلهٔ اول LiveKit: Room و RBAC

## اصل امنیتی

Frontend فقط وضعیت و کنترل‌های مناسب نقش را نمایش می‌دهد؛ **مرجع نهایی دسترسی backend و grant امضاشدهٔ LiveKit است**. هیچ کاربر یا کدی در browser نباید بتواند با تغییر state محلی، مجوز انتشار رسانه یا مدیریت participant را افزایش دهد.

## نقش‌ها

| نقش | تعیین نقش | انتشار صدا/تصویر | screen share | subscribe | ارسال data/chat | مدیریت Room و participant |
|---|---|---:|---:|---:|---:|---:|
| میزبان | `live_sessions.host_id = user.id` | بله | بله | بله | بله | بله |
| سخنران | فعلاً نقش‌های مدیریتی `admin`, `editor`, `senior_manager`, `technical_manager`؛ در فاز بعد جدول assignment جلسه‌ای | بله | بله | بله | بله | خیر، مگر policy محصولی بعدی |
| بیننده | هر کاربر احراز‌شدهٔ دیگر | خیر | خیر | بله | بله، برای chat و Q&A | خیر |

## Backend policy

`POST /api/v1/live/sessions/:sessionId/token` فقط برای کاربر دارای session معتبر صادر می‌شود. اگر جلسه ended یا cancelled باشد، token صادر نمی‌شود. نقش در backend محاسبه و در metadata توکن درج می‌شود. grant میزبان و سخنران شامل `roomJoin`, `canSubscribe`, `canPublish`, `canPublishSources` برای camera، microphone و screen share و `canPublishData` است. viewer فقط `roomJoin`, `canSubscribe` و `canPublishData` دارد.

`POST /api/v1/live/sessions/:sessionId/room` فقط برای host یا نقش‌های مدیریتی مجاز است. این endpoint Room را صریحاً با metadata محصول، ظرفیت پیش‌فرض ۵۰۰، empty timeout پنج دقیقه و departure timeout سی ثانیه ایجاد یا دریافت می‌کند و جلسهٔ scheduled را به live منتقل می‌کند.

`GET /participants`، `DELETE /participants/:identity` و `POST /participants/:identity/mute` فقط برای host یا نقش‌های مدیریتی مجازند. حذف خود میزبان ممنوع است. این endpointها از RoomServiceClient استفاده می‌کنند و از browser مستقیماً به LiveKit Admin API دسترسی داده نمی‌شود.

## Frontend policy

Frontend از پاسخ token، نقش و وضعیت جلسه را می‌خواند و PreJoin و کنترل‌های رسانه‌ای را بر اساس آن تنظیم می‌کند. viewer کنترل publish، camera، microphone و screen share ندارد؛ بااین‌حال chat و دریافت رسانه را دارد. host و speaker controls انتشار و ارائه را دارند. دکمه‌های invite، شروع جلسه، مدیریت participant و پایان جلسه باید فقط برای host نمایش داده شوند؛ وجود یا نبودن دکمه هرگز جایگزین بررسی backend نیست.

## Room lifecycle

جلسه در PostgreSQL منبع حقیقت محصول است و LiveKit منبع حقیقت اتصال realtime. هنگام شروع جلسه، frontend endpoint ساخت Room را صدا می‌زند و سپس status را live می‌کند. در صورت نبودن Room، LiveKit در اولین اتصال نیز می‌تواند آن را خودکار بسازد، اما مسیر explicit برای ثبت metadata، ظرفیت و کنترل lifecycle ترجیح داده می‌شود. پایان جلسه در مرحلهٔ بعد باید علاوه بر تغییر status، با webhook `room_finished` یا RoomServiceClient هماهنگ شود.

## محدودیت مرحلهٔ اول

در این مرحله نقش سخنران از نقش‌های مدیریتی backend مشتق می‌شود. برای مدل دقیق‌تر که میزبان بتواند یک کاربر عادی را به سخنران تبدیل کند، migration بعدی باید جدول `live_session_participants` با `session_id`, `user_id`, `role`, `granted_by`, `created_at` ایجاد کند. تا آن زمان، کاربر عادی بیننده است و فقط میزبان یا مدیران سازمانی امکان انتشار دارند.
