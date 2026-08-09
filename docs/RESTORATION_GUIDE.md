# راهنمای بازسازی ساختار پروژه

## مشکل
تمامی دایرکتوری‌ها (`src/`, `public/`, `supabase/`) از بین رفته و همه فایل‌ها به ریشه ریخته شده بودند. نام‌گذاری با پسوند `(1)` دیده می‌شد.

## رویکرد توسعه

### 1. تشخیص ساختار مبدا
- تحلیل فهرست فایل‌های مورد انتظار (`src/pages/Home.tsx`, `src/components/ui/button.tsx`, `supabase/functions/*`)
- تحلیل importها (`@/components/ui/...`) و `vite.config.ts` (`alias @ -> ./src`)

### 2. نگاشت قطعی
هر فایل تخت به مقصد صحیح منتقل شد، مثلا `App(1).tsx` → `src/App.tsx`، `button(1).tsx` → `src/components/ui/button.tsx`.

### 3. اسکریپت بازسازی
`scripts/restore-structure.sh` تمام دایرکتوری‌های استاندارد را می‌سازد و فایل‌ها را با `mv` به جای درست برمی‌گرداند.

### 4. اعتبارسنجی
- `npm run build` بدون خطا
- `npx tsc --noEmit`
- `git status` باید renameها را نشان دهد

### 5. پیشگیری
- `.env` در `.gitignore`
- اسکریپت بازسازی نگهداری شود
- همیشه از `git clone` استفاده شود
