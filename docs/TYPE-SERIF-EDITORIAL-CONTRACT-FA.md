# قرارداد Typography Editorial و Book Serif

این task capability رسمی `book-serif-index` و الگوهای `tailwindcss` را به typography دوزبانهٔ Kaghaz-o-Baad متصل می‌کند. هدف، ایجاد یک outer shell فنی با labelهای mono و یک hierarchy خواندنی و کتاب‌محور برای محتوای editorial است.

در فارسی، IRANSharp/Vazirmatn برای display، body و metadata استفاده می‌شود تا metrics و خوانایی پایدار بماند. در انگلیسی، display از Cormorant Garamond و body از fallback sans/serif موجود استفاده می‌کند. نقش‌های semantic شامل display، title، body، kicker، meta، quote و folio در token contract تعریف شده‌اند.

`ds-type-display` و `ds-type-title` برای headingهای اصلی و section headingها هستند. `ds-type-body` line-height سخاوتمند و text-wrap مناسب خواندن دارد. `ds-type-kicker` و `ds-type-meta` با mono و tracking برای index و catalog structure استفاده می‌شوند، اما در RTL tracking و transformهای لاتین حذف می‌شود تا متن فارسی مصنوعی نشود. `ds-type-quote` با serif display، border-inline و scale responsive برای pull quote آماده است.

Font loading با فایل‌های self-hosted و preload regular/bold انجام می‌شود. وزن light در preload نیست و تنها در صورت مصرف واقعی fetch می‌شود. durationهای motion و text-wrap در reduced-motion final state را حفظ می‌کنند و هیچ text role به animation وابسته نیست.

پیاده‌سازی فعلی روی Homepage issue bar، Hero kicker، LCP title، LCP paragraph، experience index و project narrative اعمال شده است. RTL/LTR از `html[lang]` و `[dir]` پشتیبانی می‌کند و CSS logical propertyها برای quote/padding به‌کار رفته‌اند.

## منابع

[1]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/book-serif-index "MengTo book-serif-index"
[2]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/tailwindcss "MengTo Tailwind CSS"
[3]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/progressive-blur "MengTo progressive blur"
