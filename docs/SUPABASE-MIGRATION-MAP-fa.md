# نقشهٔ مهاجرت کامل از Supabase

## هدف

تمام قابلیت‌های frontend کاغذ و باد باید از `@supabase/supabase-js`، Edge Function، RPC، Auth و Storage جدا شوند و فقط از backend مستقل Node.js/Fastify و PostgreSQL استفاده کنند. Supabase پس از عبور از معیارهای این سند از repository حذف می‌شود.

## وضعیت فعلی

احراز هویت پایه و workflow مقاله در frontend wrapper مستقل دارند، اما چندین صفحهٔ قدیمی هنوز مستقیم از کلاینت Supabase استفاده می‌کنند. backend مستقل نیز در حال حاضر endpointهای پایهٔ auth، مقاله، workflow، comment، usage، quota، billing و AI title suggestion را دارد.

## نقشهٔ قابلیت‌ها

| حوزه | استفادهٔ فعلی Supabase | مقصد مستقل | وضعیت |
|---|---|---|---|
| Auth و session | `supabase.auth` در OAuth و بخش‌هایی از context | `/api/v1/auth/*` و session cookie/token مستقل | wrapper پایه موجود؛ بررسی OAuth و OTP باقی است |
| مقاله | `supabase.from('articles')` در Read، Rewrite و Dashboard | `/api/v1/articles` و workflow/comment endpoints | endpoint پایه موجود؛ نیازمند جایگزینی همهٔ CRUDها |
| Community | queryهای مستقیم روی جداول مقاله/profile | API مقاله و endpoint community | endpoint اختصاصی و pagination لازم است |
| Profile | `supabase.from('profiles')` | `/api/v1/me/profile` | schema و route مستقل لازم است |
| Media | جدول `media` و `supabase.storage` | API media + Liara Object Storage adapter | schema، signed URL و upload route لازم است |
| Slides | جدول `slides` | API وابسته به article/project | schema و route لازم است |
| Project description | جدول `project_description` | API پروژه/مقاله | schema و route لازم است |
| Translations | جدول `translations` | فایل/جدول ترجمهٔ مستقل یا endpoint عمومی | تصمیم و route لازم است |
| AI search suggestion | Edge Function `search-suggest` | gateway مستقل AI | route مستقل title موجود؛ search suggestion لازم است |
| AI rewrite | Edge Function `rewrite-article` | AI usage gateway و cache | route مستقل rewrite لازم است |
| Admin users | Edge Function `admin-users` و `create-test-users` | admin routes مستقل با RBAC | route مستقل لازم است |
| LiveKit | Edge Function `livekit-token`، webhook و live_sessions | backend LiveKit adapter + API | adapter و route لازم است |
| RPC | `supabase.rpc(...)` برای workflow/media/live | transactionهای PostgreSQL در backend | باید هر RPC به service مستقل تبدیل شود |

## ترتیب اجرای مهاجرت

1. تکمیل migrationهای PostgreSQL برای profile، media، slides، project description، translations و live sessions.
2. ساخت API client مشترک frontend با base URL، token، خطای استاندارد و request ID.
3. تکمیل auth، session، OAuth/OTP و RBAC بدون Supabase.
4. انتقال مقاله، workflow، comment، dashboard و community.
5. انتقال media و storage به adapter سازگار با Liara Object Storage.
6. انتقال AI functions به gateway مستقل، با ثبت usage، quota، rate limit و cache.
7. انتقال LiveKit و admin routes.
8. حذف importهای Supabase، dependency، پوشهٔ `supabase/` و تنظیمات env قدیمی.
9. اجرای build، integration، k6 smoke و بررسی secret scan.

## معیار حذف Supabase

حذف کامل فقط وقتی مجاز است که جست‌وجوی زیر هیچ نتیجهٔ اجرایی نداشته باشد:

```bash
grep -RInE 'supabase|SUPABASE_|@supabase' src backend installer scripts
```

وجود کلمهٔ Supabase در مستندات تاریخی مجاز است، اما نباید در source، dependency، env runtime، CI یا deploy config باقی بماند.


## وضعیت موج نهایی مهاجرت — 2026-08-16

مهاجرت اجرایی frontend تکمیل شد. مسیرهای profile، translations، search، articles، comments، community، slides، dashboard، rewrite، LiveKit، media، live sessions، admin users، circuit breakers و realtime اتاق زنده اکنون از API مستقل Node.js/Fastify استفاده می‌کنند. upload رسانه از presigned URL سازگار با Liara Object Storage انجام می‌شود و مصرف فضا از PostgreSQL خوانده می‌شود.

وابستگی `@supabase/supabase-js`، پوشهٔ `src/integrations/supabase` و صفحهٔ Supabase OAuthConsent از branch اصلی حذف شدند. هیچ import یا فراخوانی اجرایی Supabase در `src` و `backend` باقی نمانده است. Migrationهای مستقل تا شمارهٔ 009 ادامه یافته‌اند.

مواردی که عمداً خارج از این migration باقی می‌مانند، فقط اسناد تاریخی و فایل‌های legacy مستندشده هستند و نباید در runtime یا CI استفاده شوند.
