# ممیزی SEO صفحهٔ شرح پروژه

تاریخ بررسی: ۱۹ اوت ۲۰۲۶

## یافته‌ها

- مسیر `/about-project` در React Router وجود دارد و صفحهٔ جدید با ساختار Hero، CTA، FAQ و جزئیات فنی رندر می‌شود.
- preview محلی در `http://127.0.0.1:4173/about-project` پس از اجرای JavaScript با موفقیت رندر شد.
- صفحهٔ فعلی پیش از اصلاح فقط `title` و `description` را به‌صورت runtime تغییر می‌داد؛ canonical، URL مطلق Open Graph، Twitter title/description و JSON-LD نداشت.
- fallback عمومی `index.html` نیز فقط OG title/description/type/image محدود داشت.
- اصلاح جدید شامل canonical، robots، OG title/description/type/url/site_name/locale/image/alt، Twitter Card title/description/image/alt و JSON-LD شامل WebPage، Organization و FAQPage است.
- fallback عمومی `index.html` نیز برای crawlerهایی که JavaScript را اجرا نمی‌کنند با متادیتای پایهٔ مطلق و معتبر به‌روزرسانی شد.

## نکتهٔ فنی

متادیتای اختصاصی صفحهٔ SPA پس از mount شدن React در head قرار می‌گیرد. برای share crawlerهایی که JavaScript را اجرا نمی‌کنند، fallback عمومی `index.html` نیز بهینه شده است؛ تولید HTML کاملاً route-specific در مرحلهٔ بعدی می‌تواند با prerender/SSR انجام شود، اما برای این release به آن وابستگی ایجاد نشده است.

## نتیجهٔ build

`npm run build` با موفقیت اجرا شد. هشدار قبلی حجم chunkهای بزرگ همچنان وجود دارد و به SEO مربوط نیست.

## مواردی که باید پس از انتشار verify شوند

- `link[rel=canonical]` برابر `https://kaghazobaad.ir/about-project` باشد.
- `og:url` و تصویر Open Graph URL مطلق داشته باشند.
- JSON-LD شامل `WebPage` و `FAQPage` در head وجود داشته باشد.
- نسخهٔ انگلیسی با تغییر زبان، title، description، locale و inLanguage را تغییر دهد.
