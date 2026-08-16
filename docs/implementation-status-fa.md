# وضعیت پیاده‌سازی اولیهٔ کاغذ و باد

## Branch توسعه

نام branch توسعه `feature/kaghazbaad-workflow-plans` است و از branch کامل‌تر `arena/019fe76c-kaghaz-o-baad` با commit پایهٔ `28ccc98` ساخته شده است. `main` و branch منبع تغییر نکرده‌اند.

## موارد پیاده‌شده

Migration `20260815010000_content_workflow_usage_plans.sql` جدول‌های workflow مقاله، comment، activity event، usage event، plans، plan parameters، plan parameter values، user subscriptions و entitlements را اضافه می‌کند. سه پلن اولیهٔ `free`، `student` و `professor` نیز به‌عنوان seed قرار داده شده‌اند. مقدارهای seed فقط مقدار اولیهٔ فنی هستند و باید از پنل مدیر یا migration بعدی بازبینی شوند.

فایل `src/lib/content-workflow.ts` وضعیت‌های مقاله، actionهای مجاز، نقش‌ها، انتقال‌های معتبر و کلیدهای قابلیت AI را تعریف می‌کند. این فایل فقط منطق قطعی و قابل‌آزمون را نگه می‌دارد و نباید جایگزین کنترل مجوز server-side شود.

فایل `src/components/article/ArticleWorkflowStatus.tsx` وضعیت مقاله و actionهای قابل نمایش را برای رابط کاربری فراهم می‌کند. فایل `src/components/admin/PlanParametersManager.tsx` اسکلت اولیهٔ پنل تنظیم پارامترهای پلن است و بعداً باید با query و mutation امن backend متصل شود.

فایل `src/lib/ai-adapters.ts` قرارداد providerهای AI و مقصدهای انتشار را تعریف می‌کند. این قراردادها اجازه می‌دهند در آینده providerهای مختلف یا adapterهای OpenClaw-style اضافه شوند، بدون اینکه هستهٔ محصول به یک سرویس خاص وابسته شود.

## نتیجهٔ آزمون

`npm run build` موفق است. Vite همچنان هشدار حجم chunk بزرگ‌تر از ۵۰۰ کیلوبایت را نمایش می‌دهد؛ این هشدار مانع build نیست و از قبل در پروژه وجود داشته است. lint کامل repository به‌دلیل خطاهای قدیمی متعدد در فایل‌های موجود پروژه موفق نیست، اما lint فایل‌های جدید بدون error اجرا شد و فقط warning مربوط به سیاست Fast Refresh در کامپوننتی که helper export می‌کند باقی مانده است.

## کارهای انجام‌نشده

endpoint امن انتقال وضعیت مقاله، اتصال پنل مدیر به Supabase، enforce کردن quota قبل و بعد از مصرف، callback درگاه، فاکتور، تمدید و لغو subscription هنوز پیاده نشده‌اند. همچنین migration فعلی فقط foundation است و قبل از production باید روی دیتابیس آزمایشی اجرا، policyها بررسی و با دادهٔ واقعی تست شود.

## گام بعدی

گام بعدی باید ساخت API/Edge Functionهای workflow و queryهای محدود به نقش باشد. سپس UI داشبورد نویسنده و مدیر به آن متصل می‌شود. بعد از تثبیت entitlement و quota، درگاه ایرانی و پرداخت اضافه خواهد شد. اتصال شبکه‌های اجتماعی و اجرای خودکار agent پس از آن و با تأیید کاربر انجام می‌شود.
