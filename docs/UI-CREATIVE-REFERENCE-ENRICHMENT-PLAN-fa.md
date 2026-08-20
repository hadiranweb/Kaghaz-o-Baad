# برنامهٔ غنی‌سازی لایهٔ نمایشی کاغذ و باد با مراجع خلاقانهٔ متن‌باز

**وضعیت:** طرح اجرایی برای تأیید؛ در این مرحله هیچ کد، asset، migration، dependency یا production تغییر نمی‌کند  
**دامنه:** تجربهٔ کاربر، روایت بصری، نمایش مقاله، نمایش اسلاید و ارائهٔ جلسهٔ زنده  
**مرز صریح:** این برنامه فقط لایهٔ محصول و نمایش را غنی می‌کند و نباید معماری backend، زیرساخت Liara، مدل داده، APIهای AI، n8n، Open WebUI یا OpenClaw را به الگوهای بصری وابسته کند.

## ۱. هدف و فرض‌های طرح

هدف، تبدیل هویت «کاغذ و باد» از یک رابط صرفاً کاربردی به یک تجربهٔ روایی، آرام و متمایز برای **نشر علمی دوزبانه، نمایش اسلاید و گفت‌وگوی زنده** است. استعارهٔ مرکزی «کاغذی که در باد رها می‌شود، پرواز می‌کند و گفت‌وگو را برمی‌گرداند» در Hero، مرور مقاله، اسلایدها، جلسهٔ زنده و Addendum ادامه می‌یابد.

فرض این طرح آن است که «این دوست» به مجموعهٔ ریپوهای خلاقانهٔ MengTo اشاره دارد و سه فایل پیوست کاربر به‌عنوان سند مرجع طراحی پذیرفته می‌شوند. این منابع فقط برای **الگو، ایده و مطالعهٔ تعامل** استفاده می‌شوند؛ کپی مستقیم کد، asset یا dependency بدون بررسی license و بدون نیاز واقعی مجاز نیست.

## ۲. اسناد مرجع که باید در workspace ثبت شوند

پس از تأیید این طرح، فایل‌های پیوست در یک پوشهٔ فقط‌مرجع در ریپو، مانند `docs/references/creative-ui/`، با نام اصلی، hash، تاریخ دریافت و توضیح provenance نگه‌داری می‌شوند. این کار برای از دست‌نرفتن زمینهٔ طراحی انجام می‌شود و هیچ فایل اجرایی یا credentialی از آن‌ها استخراج نمی‌شود.

| فایل مرجع | کاربرد |
|---|---|
| `pasted_content_2.txt` | روایت محصول، positioning، مسئله/راه‌حل، مخاطبان، مرز محتوا، آداب انتشار، FAQ و چشم‌انداز Addendum/حافظهٔ مشترک |
| `pasted_content_3.txt` | نقشهٔ اجرایی UI شامل Hero parallax، scroll-as-wind، page-turn، navigation dock، paper particles، typography، texture و graceful degradation |
| `pasted_content_4.txt` | فهرست provenance منابع MengTo و نگاشت هر ریپو به لایهٔ UI |
| `n8n_forensic_reconstruction_final.pdf` | مرجع مستقل لایهٔ orchestration و deployment n8n؛ در طراحی بصری دخالت داده نمی‌شود و فقط در برنامهٔ AI/اتوماسیون باقی می‌ماند |

همراه این فایل‌ها یک `creative-ui-reference-manifest.md` ساخته می‌شود که برای هر منبع، URL، نوع استفاده، وضعیت license، بخش‌های اقتباس‌شده، بخش‌های ردشده و تصمیم «الهام/اقتباس/عدم استفاده» را ثبت می‌کند.

## ۳. اصول طراحی محصول

### روایت اصلی

صفحهٔ اصلی و About Project باید از مسئلهٔ «دانش نوشته می‌شود اما پرواز نمی‌کند» به راه‌حل «بنویس → بادبادک را ببند → رها کن» برسند. Hero باید یک جملهٔ روشن، CTA درخواست دعوت و CTA دیدن نمونه مقاله داشته باشد. بخش فنی و معماری در صفحهٔ عمومی حذف می‌شود و به مستندات/README منتقل می‌گردد تا صفحهٔ محصول روایت‌محور و قابل‌اسکن باقی بماند.

### زبان و دسترس‌پذیری

فارسی و انگلیسی باید هم‌ارز باقی بمانند؛ RTL/LTR، ترتیب focus، navigation dock، page-turn و motion نباید در زبان دوم شکسته شوند. متن فارسی با Vazirmatn یا فونت سازگار ذخیره و fallback محلی داشته باشد. انیمیشن‌ها باید `prefers-reduced-motion`، keyboard navigation، screen reader، contrast و حالت بدون JavaScript را پشتیبانی کنند.

### نمایش علمی

زیبایی نباید به قیمت خوانایی یا اعتبار علمی تمام شود. هر اسلاید یک ایدهٔ کامل، یک ادعا و در صورت نیاز دلیل/ارجاع دارد. تصویر یا رسانه باید دلیل یا زمینه باشد، نه تزئین. صفحهٔ مقاله باید مسیر سریع **Deck → متن کامل → منابع → گفت‌وگو → Addendum** را حفظ کند.

## ۴. نگاشت مرجع MengTo به تجربهٔ کاغذ و باد

| لایهٔ تجربه | منبع مرجع | کاربرد در کاغذ و باد | محدودیت |
|---|---|---|---|
| Hero | `sylva` | pointer parallax نرم، لایه‌های کاغذ/باد، CTA و عنوان روایی | بدون WebGL اجباری؛ fallback ثابت |
| Scroll narrative | `kage` | اسکرول به‌عنوان باد برای عبور بین فصل‌های معرفی یا اسلاید | نباید scroll hijacking یا افت SEO ایجاد کند |
| Page turn | `complete-shelf` و `sketchbook` | ورق‌زدن اسلاید با drag/click و خم‌شدن کنترل‌شدهٔ کاغذ | دکمه‌های Next/Previous و keyboard همیشه فعال بمانند |
| Wind particles | `kage` | برگ‌ها/تکه‌های کاغذ کم‌تعداد و کم‌شفافیت | `pointer-events:none`، خاموشی در reduced motion و موبایل ضعیف |
| Navigation dock | `sylva` | نخ بادبادک، نقطه‌های فصل و proximity نرم | دسترسی‌پذیر با label و focus؛ وابسته به hover نباشد |
| Timeline جلسهٔ زنده | `a-long-expected-party` | روایت زمان‌مند جلسه، بخش‌های ارائه/پرسش/Addendum | با LiveKit state و دادهٔ واقعی backend جایگزین نمی‌شود |
| Skills/AGENTS pattern | `Skills` | الگوی مستندسازی فایل‌محور برای قواعد داخلی طراحی | به‌عنوان راهنمای توسعه، نه runtime dependency |
| Procedural styles | `towers` | فقط مطالعهٔ تنوع سبک‌های نمایش در آینده | فاز اول بدون canvas سنگین یا تولید تصادفی پیچیده |

ریپوهای دستهٔ «بررسی شد، استفاده نشد» در پیوست فقط در manifest ثبت می‌شوند و وارد implementation نمی‌شوند مگر تصمیم جداگانهٔ مالک محصول.

## ۵. معماری نمایشی پیشنهادی

لایهٔ نمایش باید روی APIهای فعلی و آیندهٔ کاغذ و باد سوار شود و هیچ contract جدیدی به خاطر animation تحمیل نکند:

```text
دادهٔ واقعی Backend/API
  ├─ مقاله و نسخه‌ها
  ├─ اسلاید و رسانه
  ├─ وضعیت workflow
  ├─ LiveKit session state
  └─ Addendum و رویدادهای انتشار
          ↓ view models مستقل و قابل تست
Presentation Components
  ├─ KaghazHero
  ├─ WindChapterScroller
  ├─ KitePageViewer
  ├─ KiteDock
  ├─ WindParticles
  ├─ LiveTimeline
  └─ AddendumReveal
          ↓ progressive enhancement
CSS / Motion / SVG / Canvas محدود
          ↓ fallback
HTML خوانا، بدون motion و سازگار با SEO
```

View modelها باید از schemaهای API تغذیه شوند و animation state نباید در PostgreSQL یا eventهای محصول ثبت شود. state نمایشی مانند slide progress، drag offset و active section محلی و ephemeral است؛ state واقعی مانند published، approved، live session و addendum فقط از backend می‌آید.

## ۶. فازهای اجرای UI

### فاز صفر: ثبت منابع و audit

پیوست‌ها در workspace ثبت می‌شوند. license و provenance ریپوهای MengTo بررسی می‌شود. فایل‌های فعلی `AboutProject.tsx`، CSS، routeهای عمومی، build budget و وضعیت mobile/RTL audit می‌شوند. خروجی این فاز یک design brief، reference manifest و فهرست ریسک است.

### فاز یک: سیستم بصری پایه

Design tokenهای رنگ، تایپوگرافی، فاصله، shadow، easing، texture و breakpoint تعریف می‌شوند. پالت اولیه شامل paper white، paper warm، paper edge، wind blue، ink heavy، ink mid و ink light خواهد بود. استفاده از فونت خارجی باید fallback محلی و تصمیم performance داشته باشد.

### فاز دو: بازطراحی Hero و About Project

Hero روایت «دانشی که رها می‌شود تا پرواز کند» را اجرا می‌کند. About Project از ساختار Problem → Solution → How it works → Capabilities → Personas → Boundaries → Etiquette → FAQ → Vision استفاده می‌کند. CTAها در Hero و footer قرار می‌گیرند. SEO، Open Graph، JSON-LD و canonical قبلی حفظ و پس از تغییر دوباره اعتبارسنجی می‌شوند.

### فاز سه: نمایش مقاله و Deck

برای Deck دو حالت فراهم می‌شود: حالت سریع/اسکن‌پذیر با scroll chapter و حالت تعاملی با page-turn. کاربر باید بتواند بدون drag، با click، keyboard، touch و دکمه‌های قبلی/بعدی حرکت کند. متن کامل و منابع همیشه در دسترس می‌مانند. در صورت خطا یا device ضعیف، کارت‌های سادهٔ اسلاید نمایش داده می‌شوند.

### فاز چهار: Dock، ذرات و motion کنترل‌شده

Navigation dock و wind particles فقط پس از تثبیت Hero و Deck اضافه می‌شوند. تعداد ذرات، مدت animation و هزینهٔ render محدود و قابل تنظیم خواهد بود. هیچ animation تزئینی نباید تعامل، خوانایی، hydration، SEO، data fetching یا LiveKit را مختل کند.

### فاز پنج: Timeline جلسهٔ زنده و Addendum

جلسهٔ زنده به‌صورت یک پیوست مقاله نمایش داده می‌شود: معرفی، پرسش‌ها، جمع‌بندی و اصلاح‌های پذیرفته. Timeline از دادهٔ واقعی session و addendum استفاده می‌کند و صرفاً presentation layer است. ضبط، transcript و خلاصه فقط با consent و policy نگه‌داری فعال می‌شود. AI می‌تواند draft خلاصه بسازد، اما نویسنده/ویرایشگر باید آن را تأیید کند.

### فاز شش: hardening و انتشار

تست visual regression، RTL/LTR، mobile، reduced motion، keyboard، screen reader، performance، build size و SEO اجرا می‌شود. سپس preview روی branch مستقل، تأیید مالک محصول و deploy از مسیر CI/CD به Liara انجام می‌گیرد. main فقط با تأیید صریح تغییر می‌کند.

## ۷. تفکیک لایهٔ نمایش از AI و زیرساخت

| موضوع | در لایهٔ نمایشی مجاز است | خارج از لایهٔ نمایشی و ممنوع |
|---|---|---|
| AI | نمایش پیشنهاد عنوان، annotation، rewrite، خلاصه و status پردازش | محاسبهٔ quota، pricing، grant دسترسی یا اجرای provider در frontend |
| Open WebUI | نمایش Agentهای publish‌شده و workspace محدود | قراردادن API key یا credential و Studio عمومی |
| OpenClaw | نمایش وضعیت Agent و نتیجهٔ redacted | وابستگی مستقیم component به runtime OpenClaw |
| n8n | نمایش وضعیت workflow، draft و approval | اتصال مستقیم browser به webhook حساس یا credential n8n |
| LiveKit | timeline، وضعیت اتصال و addendum | صدور token یا تصمیم نقش در frontend |
| persistence | نگه‌داری state موقت animation در حافظهٔ مرورگر | ذخیرهٔ animation state در database به‌عنوان business event |

## ۸. معیارهای پذیرش

1. صفحهٔ عمومی بدون فعال‌بودن AI، n8n، Open WebUI یا OpenClaw کاملاً قابل استفاده است.
2. fallback ثابت و HTML خوانا برای reduced motion، JavaScript محدود و WebGL unavailable وجود دارد.
3. تمام مسیرهای اصلی با keyboard، touch، mouse و screen reader قابل استفاده‌اند.
4. RTL و LTR در Hero، Deck، page-turn، dock و timeline رفتار یکسان و قابل‌فهم دارند.
5. motion باعث تغییر داده، وضعیت مقاله، نقش، quota یا پرداخت نمی‌شود.
6. build size، LCP، CLS، INP و تعداد animationها اندازه‌گیری و برای mobile محدود می‌شوند.
7. Open Graph، canonical، sitemap، structured data و متن قابل ایندکس حفظ می‌شوند.
8. هیچ کد یا asset از منابع مرجع بدون بررسی مجوز و ثبت provenance وارد production نمی‌شود.
9. نمایش AI فقط نتیجهٔ API معتبر را نشان می‌دهد؛ خطا، loading، empty state و provider-offline به‌صورت graceful نمایش داده می‌شوند.
10. تغییرات در branch مستقل، با commitهای کوچک، preview و rollback انجام می‌شوند.

## ۹. ریسک‌ها و تصمیم‌های باز

| ریسک | اقدام کنترلی |
|---|---|
| motion زیاد یا سنگین | reduced-motion، budget عملکرد، fallback و خاموشی موبایل ضعیف |
| افت SEO به‌دلیل scroll/JS | semantic HTML، route مستقل، prerender و تست crawl |
| ناسازگاری page-turn با RTL | تست مستقل ورق‌زدن راست‌به‌چپ و چپ‌به‌راست |
| license نامشخص منابع | audit license پیش از هر اقتباس کد یا asset |
| وابستگی طراحی به فناوری خاص | استفاده از view model و progressive enhancement |
| اشتباه گرفتن نمایشی با runtime AI | مرز معماری و تست عدم دسترسی مستقیم frontend به secret |
| bundle بزرگ | lazy loading برای Deck، timeline و particle layer؛ حذف نمونه‌های unused |
| اختلال LiveKit | نمایش timeline از state پایدار backend و fallback متنی |

## ۱۰. نتیجهٔ مورد انتظار

پس از اجرای این برنامه، کاغذ و باد یک هویت نمایشی یکپارچه خواهد داشت: Hero مانند کاغذی در باد، Deck مانند بادبادکی که صفحه‌به‌صفحه باز می‌شود، جلسهٔ زنده مانند بازگشت گفت‌وگو به مقاله، و Addendum مانند نخ اتصال دانش به آینده. این غنی‌سازی کاملاً در سطح تجربهٔ محصول باقی می‌ماند و حاکمیت Backend، Liara، AI Gateway، Open WebUI، OpenClaw، n8n، RBAC و usage را تغییر نمی‌دهد.

هر قابلیت فقط زمانی عملیاتی محسوب می‌شود که کد UI، fallback، تست دسترسی و performance، مستندات، provenance منبع و rollback مشخص داشته باشد.

## منابع مرجع

1. `pasted_content_2.txt` — تعریف محصول، روایت، قابلیت‌ها، پرسونا، آداب و چشم‌انداز کاغذ و باد.
2. `pasted_content_3.txt` — نقشهٔ اجرایی لایه‌های UI و motion.
3. `pasted_content_4.txt` — جدول منابع MengTo و نگاشت آن‌ها به لایه‌های UI.
4. `docs/PRODUCT-ARCHITECTURE-CONTRACT-fa.md` — قرارداد حاکم پروژه.
5. `README.md` — معرفی محصول، دوزبانگی، Deck، LiveKit و ساختار dashboard.
6. [MengTo/Skills](https://github.com/MengTo/Skills)
7. [MengTo/kage](https://github.com/MengTo/kage)
8. [MengTo/complete-shelf](https://github.com/MengTo/complete-shelf)
9. [MengTo/sylva](https://github.com/MengTo/sylva)
10. [MengTo/a-long-expected-party](https://github.com/MengTo/a-long-expected-party)
11. [MengTo/sketchbook](https://github.com/MengTo/sketchbook)
