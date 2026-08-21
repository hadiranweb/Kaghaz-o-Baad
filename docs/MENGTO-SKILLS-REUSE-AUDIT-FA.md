# ممیزی دقیق استفاده از MengTo/Skills برای «کاغذ و باد»

**تاریخ بررسی:** ۲۱ اوت ۲۰۲۶  
**ریپوهای بررسی‌شده:** `hadiranweb/Kaghaz-o-Baad`، `MengTo/Skills`، `MengTo/sylva`، `MengTo/kage`، `MengTo/complete-shelf` و `MengTo/sketchbook`.

## پاسخ کوتاه به پرسش اصلی

بله، باید از پتانسیل ریپوها استفاده کنیم؛ اما باید بین **کد کاملِ یک demo مستقل**، **skill به‌عنوان specification اجرایی** و **component قابل نصب در اپلیکیشن** تفاوت بگذاریم. `MengTo/Skills` یک کتابخانهٔ React یا npm package نیست. این ریپو مجموعه‌ای از `SKILL.md`ها، promptها، demoهای مستقل و asset/runtimeهای همراه است. بخش عمدهٔ demoهای web-design به‌صورت `index.html` مستقل ارائه شده‌اند، نه componentهای TypeScript قابل import در معماری فعلی. در inventory فعلی، ۸۲ demo با `index.html` و فقط ۹ فایل کد با پسوندهای JS/TS/JSX/TSX در مسیر demoهای web-design دیده شد.

بنابراین پاسخ «چرا کد کامل را مستقیم کپی نکنیم؟» این نیست که کدها بی‌ارزش‌اند؛ پاسخ این است که **کد کامل آن‌ها برای runtime و قرارداد دیگری کامل است**. ما باید قسمت‌های runtime، state machine، timing، cleanup و interaction را استخراج و در React/Vite/RTL/SEO پروژهٔ خودمان adapt کنیم. برای `MengTo/Skills` مجوز ریشهٔ MIT وجود دارد، اما runtimeها، fontها، artworkها و assetهای هر demo باید جداگانه بررسی شوند. در مقابل، برای `sylva` و `kage` در README/manifest صراحتاً محدودیت reuse/redistribution کد و artwork ذکر شده است؛ کپی مستقیم آن‌ها تصمیم امنی نیست.[1] [2] [3]

## آنچه واقعاً در ریپوی کاغذ و باد وجود دارد

ریپوی پروژه با React 18، TypeScript، Vite، Tailwind CSS، React Router، React Query، Radix UI، `next-themes` و `lucide-react` ساخته شده است. routeهای عمومی موردنیاز برای این برنامه حاضرند: خانه، آرشیو مقالات، نمایش اسلاید، چندرسانه‌ای، درباره، شرح پروژه و پخش زنده. در عین حال، package فعلی `gsap`، `lenis`، `three`، `@react-three/fiber` و `@react-three/drei` را نصب نکرده است.

| واقعیت فعلی | نتیجه برای reuse |
|---|---|
| `Home.tsx` عمدتاً شامل BrainAnimation و جست‌وجوی مقالات است. | Hero و search بیشترین فرصت فوری برای غنی‌سازی هستند. |
| `AboutProject.tsx` یک صفحهٔ محتوایی نسبتاً کامل با hero، مسئله/راه‌حل، مزیت‌ها، مخاطب، FAQ و CTA دارد. | بهترین محل برای اجرای editorial layout و revealهای محدود است. |
| `Read.tsx` و `ArticleSlides.tsx` مسیرهای واقعی مقاله و اسلاید هستند. | page-turn باید روی دادهٔ واقعی مقاله سوار شود، نه demo جداگانه. |
| CSS فعلی tokenهای تیره، glass، hero و animationهای brain/kb دارد. | بخشی از زبان بصری وجود دارد؛ نباید یک aesthetic ناسازگار دوم اضافه شود. |
| creative commit فعلی فقط docs، `AboutProject.tsx` و `index.css` را تغییر داده است. | بسیاری از قابلیت‌های وعده‌داده‌شده هنوز runtime component نشده‌اند. |
| هیچ GSAP/Lenis/Three.js در package نیست. | port کردن کامل demoها نیازمند تصمیم dependency، bundle budget و cleanup است. |

## ممیزی MengTo/Skills

### ۱. لایهٔ طراحی و ترکیب‌بندی

سه skill بیشترین تطابق را با «کاغذ و باد» دارند: `editorial-tech`، `book-serif-index` و `light-mode-paper-technical`. اولی ترکیب layout editorial با جزئیات محصول/تکنولوژی را پیشنهاد می‌کند؛ دومی برای آرشیو و reader با تایپوگرافی serif، metadata و margin note مناسب است؛ سومی برای نسخهٔ کاغذی روشن، قاب تیره و texture محدود مفید است. این‌ها **راهنمای composition و token** هستند، نه کد قابل import.

پیشنهاد من این است که `editorial-tech` به‌عنوان زبان اصلی صفحات عمومی انتخاب شود، `book-serif-index` فقط برای آرشیو و خواندن مقاله وارد شود و `light-mode-paper-technical` به‌صورت variant تم روشن adapt شود. `dark-blue-contrasting-clean` برای تم فعلی نیز مفید است، اما باید با glass فعلی کنترل شود؛ اعمال هم‌زمان همهٔ این aestheticها باعث ناهمگونی می‌شود.

### ۲. لایهٔ motion و scroll

`animation-systems` و `cinematic-gsap-lenis-motion-system` برای تعریف یک سیستم واحد motion کاربرد دارند. نکتهٔ مهم آن‌ها این است که فقط یک smooth-scroll engine استفاده شود، ScrollTrigger با refresh و cleanup صحیح کار کند و در reduced motion، scrub و pinning حذف و حالت نهایی فوراً نمایش داده شود.[4]

`masked-reveal` و `staggered-word-reveal` برای تیتر hero و headingهای کوتاه مناسب‌اند. این قابلیت‌ها باید فقط روی متن‌های کوتاه و غیرحیاتی اجرا شوند. نام دسترس‌پذیر متن باید unsplit بماند و نسخهٔ بدون JavaScript نیز همان متن را نشان دهد. برای paragraphهای فارسی یا متن مقاله از split کلمه‌به‌کلمه استفاده نکنید؛ هزینهٔ cognitive و ریسک RTL بیشتر از ارزش بصری آن است.

`scroll-progress-timeline` برای مسیر مقاله، chapters صفحهٔ شرح پروژه و timeline جلسهٔ زنده ارزش واقعی دارد، چون progress در این‌جا اطلاعات است نه decoration. `scroll-scrubbed-word-reveal` فقط در بخش‌های کوتاه hero یا معرفی استفاده شود. `scroll-scrubbed-visual-sequence` و `scroll-world-storytelling` زمانی ارزشمندند که asset تصویری واقعی و روایت چندمرحله‌ای داشته باشیم؛ برای home فعلی اولویت پایین‌تری دارند.

### ۳. لایهٔ atmosphere

`ambient-section-particles` دقیقاً برای ذرات کاغذ/موت‌های محدود طراحی شده است و توصیه می‌کند effect داخل یک section bounded باشد، `pointer-events:none` داشته باشد، با IntersectionObserver متوقف شود، در tab مخفی frame تولید نکند و در reduced motion به still composition تبدیل شود.[5]

`falling-leaves` زمانی مناسب است که شکل واقعاً برگ یا قطعهٔ کاغذ خوانده شود؛ اگر فقط نقطه و ذره می‌خواهیم، ambient particles کم‌هزینه‌تر است. برای کاغذ و باد، انتخاب پیشنهادی **حداکثر یک لایهٔ canvas محدود در hero یا CTA** است، نه particle field تمام‌صفحه.

`pointer-trail-emitter` برای پروژهٔ فعلی اولویت ندارد. این skill از نظر الگوریتمی کامل است، اما cursor trail در یک پلتفرم علمی بیشتر احتمال دارد تمرکز را منحرف کند. اگر بعداً برای hero یک تعامل pointer مشخص تعریف شد، باید فقط دسکتاپ و با fallback touch/keyboard فعال شود.

### ۴. لایهٔ WebGL و سه‌بعدی

`threejs` و `webgl-3d-object` دستورالعمل‌های فنی خوبی برای cap کردن DPR، pause کردن renderer، dispose کردن resources، مدیریت context loss و poster fallback دارند. بااین‌حال، هیچ نیاز محصولی فعلی نشان نمی‌دهد که خانه به یک جهان WebGL یا مدل سه‌بعدی نیاز دارد. در صورت اضافه‌شدن، فقط یک مسئولیت برای canvas تعیین شود و متن، CTA و navigation در DOM باقی بمانند.[6]

## ماتریس تصمیم اجرایی

| قابلیت | محل استفاده در کاغذ و باد | تصمیم | روش اجرا |
|---|---|---|---|
| Editorial grid و hero split | Home، AboutProject | **Adapt** | React/Tailwind با tokenهای فعلی؛ حفظ RTL/LTR و متن semantic |
| Book-serif archive | Read | **Adapt** | typography و metadata؛ بدون کپی asset یا layout کامل demo |
| Masked reveal | hero heading و section heading | **Reuse logic / rewrite wrapper** | hook/component React با no-JS و reduced-motion fallback |
| Staggered word reveal | فقط headingهای کوتاه | **Adapt** | عدم split لینک‌ها، حفظ accessible name و محدودیت تعداد کلمات |
| Scroll progress timeline | Read، ArticleSlides، Live | **Adapt strongly** | progress واقعی chapter/slide با keyboard و `aria-current` |
| Ambient particles | hero یا CTA پایانی | **Rewrite in React** | canvas bounded، یک RAF، ResizeObserver، IntersectionObserver، cap DPR |
| Falling paper/leaves | hero campaign یا فصل خاص | **Optional rewrite** | فقط در صورت asset و narrative مشخص؛ خاموش روی موبایل ضعیف |
| Pointer trail | Home desktop | **Reject for phase 1** | ارزش اطلاعاتی کافی ندارد؛ احتمال distraction |
| Scroll-scrubbed visual sequence | AboutProject یا معرفی campaign | **Phase 2** | نیازمند assetهای تصویری و budget جداگانه |
| Scroll-world WebGL | Home | **Reject for now** | پیچیدگی و هزینه بیشتر از نیاز فعلی؛ poster/DOM fallback الزامی |
| Three.js 3D object | archive یا cover preview | **Phase 2 experiment** | فقط بعد از تثبیت reader ساده و اندازه‌گیری performance |
| Lenis + GSAP | کل public site | **Optional, not immediate** | ابتدا CSS/native scroll؛ سپس انتخاب تنها یک engine در صورت نیاز |
| dark-blue clean | تم فعلی | **Adapt tokens** | حفظ سرمه‌ای و accent؛ کاهش glass و blurهای غیرضروری |
| light-mode paper | تم روشن | **Adapt tokens** | paper surface، قاب، texture بسیار ظریف و contrast مناسب |
| book page-turn | ArticleSlides | **Rewrite/adapt** | state machine و geometry از reference؛ data و controls پروژهٔ خودمان |

## پاسخ فنی به «کد کامل داریم، چرا استفاده نکنیم؟»

### دلیل اول: demo کامل با application کامل یکی نیست

یک demo مستقل معمولاً مالک DOM، lifecycle، event listener، animation loop، asset loading و navigation خودش است. در اپلیکیشن فعلی، همین مسئولیت‌ها بین React، Router، Suspense، SEO، theme، locale و backend data تقسیم شده‌اند. اگر `index.html` یک demo را داخل route کپی کنیم، با lifecycle React، unmount، navigation و hydration احتمالی ناسازگار می‌شود.

### دلیل دوم: نسخهٔ کپی‌شده دادهٔ واقعی را نمی‌فهمد

صفحهٔ مقاله باید از API، وضعیت انتشار، زبان، نسخه و نقش کاربر تغذیه شود. demoهای Complete Shelf یا Sketchbook دادهٔ ایستا و assetهای خودشان را دارند. ما باید interaction را به view model مقاله متصل کنیم و state واقعی را از state نمایشی جدا نگه داریم؛ در غیر این صورت ظاهر زیبا با workflow محصول ناسازگار می‌شود.

### دلیل سوم: مسیر dependency و runtime متفاوت است

بخشی از demoها runtimeهای bundled، Three.js، GSAP یا فایل‌های asset خودشان را با مسیر نسبی بارگذاری می‌کنند. در Vite، مسیر public، code splitting، lazy loading و build output متفاوت است. این مسئله با «کپی فایل» حل نمی‌شود؛ باید import، asset pipeline، cleanup و route-level lazy loading بازطراحی شود.

### دلیل چهارم: مجوز همهٔ منابع یکسان نیست

خود `MengTo/Skills` دارای LICENSE با متن MIT است، اما این امر به‌صورت خودکار مجوز کد و artwork ریپوهای `sylva`، `kage` یا `complete-shelf` نیست. manifest موجود پروژه نیز درست تشخیص داده است که برای منابع اصلی، استفادهٔ فعلی باید در سطح مطالعه و الهام بماند مگر مجوز یا اجازهٔ مشخص احراز شود.[1] در عمل، امن‌ترین راه این است که از Skills و demoهای مجاز برای **منطق و الگوی پیاده‌سازی** استفاده کنیم و artwork، texture، audio و identity را خودمان بسازیم یا با مجوز مناسب تهیه کنیم.

### دلیل پنجم: استفادهٔ کامل یعنی verification کامل

کد interaction بدون تست در ۳۹۰، ۷۶۸، ۱۰۲۴ و ۱۴۴۰ پیکسل، RTL/LTR، keyboard، touch، reduced motion، hidden tab، route cleanup، console error و performance هنوز production-ready نیست. خود skillها نیز روی pause کردن offscreen، cap کردن DPR، fallback ثابت و cleanup تأکید دارند.[5] [6]

## برنامهٔ اجرایی پیشنهادی

### فاز A — استخراج و ثبت provenance

یک پوشهٔ `src/features/creative-ui/` یا `src/components/creative/` ایجاد شود. برای هر قابلیت، فایل `README.md` شامل منبع، لینک، تصمیم license، تفاوت با demo، API component و fallback ثبت شود. `MengTo/Skills` به‌عنوان مرجع توسعه در `docs/references` باقی بماند و به‌عنوان dependency runtime نصب نشود.

### فاز B — سیستم بصری مشترک

tokenهای `paper`, `ink`, `wind`, `accent`, spacing، radius، shadow و motion duration در CSS variables تثبیت شوند. `editorial-tech` برای layout، `book-serif-index` برای reader و `dark-blue/light-paper` برای theme variant انتخاب شوند. در این فاز هیچ WebGL یا smooth-scroll جدیدی اضافه نشود.

### فاز C — چهار component قابل استفادهٔ واقعی

اول `RevealOnScroll` برای headingهای کوتاه، دوم `ScrollChapterProgress` برای chapterهای مقاله، سوم `AmbientPaperParticles` با canvas محدود، و چهارم `ArticlePageViewer` با state machine ساده ساخته شوند. این چهار component بیشترین نسبت ارزش به ریسک را دارند و به routeهای موجود متصل می‌شوند.

### فاز D — بازطراحی public routes

Home از search-only به hero روایی با CTA و سه مسیر تبدیل شود. AboutProject با editorial rhythm و revealهای محدود ارتقا یابد. Read با archive card، filter و empty/error state کامل شود. ArticleSlides ابتدا fallback HTML و دکمه‌های قبلی/بعدی داشته باشد و سپس page-turn اختیاری روی آن سوار شود.

### فاز E — آزمایش تعاملی کنترل‌شده

تنها پس از baseline performance، یک prototype برای page-turn یا 3D cover روی branch مستقل ساخته شود. اگر نتیجه در mobile، reduced motion یا reader completion بهتر نبود، حذف شود. نصب GSAP/Lenis/Three.js باید به‌صورت تصمیم مستقل با اندازه‌گیری bundle و LCP انجام شود، نه به‌عنوان پیش‌شرط استفاده از Skills.

## نتیجهٔ نهایی

تشخیص دقیق این ممیزی این است که **پتانسیل Skills در پروژه کم استفاده شده است، اما راه درست استفاده، انتقال سیستماتیک قابلیت‌هاست نه کپی خام demoها**. در حال حاضر واقعاً هیچ runtime از Skills وارد package نشده و creative commit موجود بیشتر روی `AboutProject` و CSS متمرکز است؛ بنابراین انتقاد شما از «استفاده‌نشدن از پتانسیل» وارد است.

پیشنهاد عملی من این است که از همین حالا چهار قابلیت `editorial layout`، `masked/staggered reveal`، `scroll progress` و `ambient paper particles` وارد یک branch اجرایی شوند. برای page-turn نیز منطق Complete Shelf/Sketchbook را adapt می‌کنیم، ولی با data model، controls، RTL و fallback خود کاغذ و باد. WebGL و pointer trail فعلاً باید بعد از اثبات ارزش تجربه بررسی شوند، نه به‌عنوان decoration پیش‌فرض.

## References

[1]: https://github.com/MengTo/Skills "MengTo/Skills — skill specifications, demos and MIT license"

[2]: https://github.com/MengTo/sylva "MengTo/sylva — README and interactive Three.js implementation"

[3]: https://github.com/MengTo/kage "MengTo/kage — README and interactive scroll/world implementation"

[4]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/animation-systems "Animation systems skill"

[5]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/ambient-section-particles "Ambient section particles skill"

[6]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/threejs "Three.js web skill"

[7]: https://github.com/MengTo/complete-shelf "MengTo/complete-shelf — shelf/page-turn reference"

[8]: https://github.com/MengTo/sketchbook "MengTo/sketchbook — page-flipping interaction reference"

[9]: https://github.com/hadiranweb/Kaghaz-o-Baad "Kaghaz-o-Baad — current project repository"
