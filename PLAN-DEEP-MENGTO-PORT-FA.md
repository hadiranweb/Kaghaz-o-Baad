# برنامهٔ توسعهٔ عمیق MengTo برای کاغذ و باد

## هدف

هدف این برنامه، تبدیل ظرفیت واقعی منابع MengTo به یک **سیستم production-grade و یکپارچه برای کاغذ و باد** است؛ نه قراردادن چند افکت تزئینی روی صفحات موجود. تمام ۸۸ Skill وب‌دیزاین و چهار ریپوی مرجع `sylva`، `kage`، `complete-shelf` و `sketchbook` باید فایل‌به‌فایل بررسی شوند و برای هر قابلیت یکی از این تصمیم‌ها ثبت شود: reuse مستقیم، adaptation، port کامل الگوریتم به React/TypeScript، آزمایش محدود یا رد مستند.

این برنامه بر branch فعلی پروژهٔ اصلی `hadiranweb/Kaghaz-o-Baad` اعمال خواهد شد و پیش‌فرض آن حفظ APIها، مسیرهای فعلی، داده‌های مقاله و اسلاید، RTL/LTR، SEO و قابلیت مطالعه بدون افکت است.

## اصول غیرقابل مذاکره

1. **اول رفتار و معماری، بعد ظاهر:** هر interaction باید state، ورودی، خروجی، cleanup و fallback مشخص داشته باشد.
2. **هر Skill یک نقش محصولی:** هیچ Skill فقط به‌خاطر جذابیت بصری وارد production نمی‌شود؛ باید به خواندن، کشف مقاله، روایت پروژه، گفت‌وگو یا وضعیت زنده کمک کند.
3. **Reuse واقعی در صورت سازگاری:** اگر کد منبع از نظر license، runtime، bundler و معماری قابل استفاده باشد، ساختار و منطق آن حفظ می‌شود. در غیر این صورت، port کامل رفتار با ثبت تفاوت‌ها انجام می‌شود، نه یک imitation ساده.
4. **Progressive enhancement:** DOM و متن باید مستقل از JavaScript، WebGL، GSAP، Lenis و Canvas قابل خواندن و استفاده باقی بماند.
5. **Performance budget:** هیچ runtime سنگین global وارد bundle اصلی نمی‌شود. GSAP/Lenis/Three.js و shaderها route-level و lazy خواهند بود و فقط با نتیجهٔ اندازه‌گیری‌شده پذیرفته می‌شوند.
6. **RTL و touch از ابتدا:** جهت صفحه، swipe، focus order، keyboard و reduced motion بخشی از component contract هستند، نه اصلاحات انتهای پروژه.
7. **Provenance و license:** برای هر فایل reuse‌شده، منبع، license، نسخه/commit و نوع تغییر در manifest ثبت می‌شود. artwork یا code با license نامشخص کپی نمی‌شود.

## فاز صفر: تثبیت baseline و نقشهٔ provenance

پیش از تغییر UI، وضعیت branch، نسخهٔ Node/Vite/React/Tailwind، dependency graph، route map، API contract، asset inventory و bundle report ثبت می‌شود. برای چهار ریپوی مرجع و Skills، commit مورد بررسی pin می‌شود و فایل‌های `LICENSE`، `README`، `package.json`، entrypointها، assetها و demoها جداگانه index می‌شوند.

خروجی این فاز یک manifest ماشینی YAML خواهد بود که برای هر Skill این فیلدها را نگه می‌دارد: نام، منبع، مسیر فایل، قابلیت، dependency، runtime assumptions، نوع license، route هدف، تصمیم reuse/adapt/port/experiment/exclude، fallback، owner و معیار پذیرش.

## فاز یک: ساخت لایهٔ زیرساخت interaction

یک لایهٔ shared برای interaction ساخته می‌شود تا همهٔ portها از قرارداد مشترک استفاده کنند. این لایه شامل `useReducedMotion`، `useMediaQuery`، `useIntersectionReveal`، `usePointerIntent`، `useSwipeGesture`، `useRafLoop`، `usePageVisibility`، `useSafeArea` و tokenهای motion است.

هر hook باید با Strict Mode سازگار باشد، listenerها را cleanup کند، در SSR/prerender شکست نخورد، با pointer capture کار کند و امکان خاموش‌شدن در low-power یا reduced-motion را داشته باشد. tokenهای motion شامل duration، easing، distance، blur و stagger خواهند بود تا timing بین Home، Archive، Reader، AboutProject و Live یکدست بماند.

در همین فاز componentهای زیر ساخته می‌شوند: `MotionProvider` سبک، `Reveal`، `StaggerGroup`، `MaskedText`، `ProgressRail`، `PointerLayer`، `FallbackFrame` و `LayeredSurface`. هیچ component نباید به یک صفحهٔ خاص hard-code شود.

## فاز دو: port عمیق Sylva به Home و navigation

از `sylva` این رفتارها به‌صورت واقعی استخراج و port می‌شوند: pointer parallax لایه‌ای با CSS variables، staged entrances، pixel/masked reveal، navigation dock با proximity، keyboard focus states و particle burst کنترل‌شده.

Hero صفحهٔ اصلی به چند layer معنایی تقسیم می‌شود: typography، illustration/brain، paper plane/kite، metadata و ambient layer. parallax فقط با transform/variable روی compositor اجرا می‌شود، در touch خاموش یا به tilt محدود می‌شود و در reduced motion به حالت static می‌رود. proximity magnification فقط روی desktop pointer فعال است و برای keyboard، focus ring و touch نسخهٔ سادهٔ ثابت دارد.

هر reveal باید با `aria-hidden` نادرست متن را پنهان نکند؛ متن در DOM از ابتدا موجود می‌ماند و mask فقط presentation است. particle burst فقط در پاسخ به تعامل معنادار CTA یا تغییر مسیر اجرا می‌شود، محدودیت تعداد دارد و در tab hidden متوقف می‌شود.

## فاز سه: port عمیق Complete Shelf به archive

آرشیو مقالات به یک shelf editorial تبدیل می‌شود، نه grid افکت‌دار. state machine آن شامل `idle`، `focused`، `opening`، `open`، `reading` و `closing` است. هر card مقاله metadata واقعی، cover، زبان، نویسنده، تاریخ و وضعیت انتشار را نشان می‌دهد.

horizontal shelf برای pointer و keyboard قابل استفاده خواهد بود، اما scroll عمودی موبایل قربانی نمی‌شود. در موبایل shelf به snap list یا stacked cards تبدیل می‌شود. بازشدن کتاب با shared layout و transition کنترل‌شده انجام می‌شود؛ اگر JS، animation یا cover شکست خورد، لینک استاندارد `/read/:slug` همچنان کار می‌کند.

به‌جای کپی artwork یا texture نامشخص، surfaceهای کاغذی با CSS token و assetهای دارای provenance ساخته می‌شوند. جست‌وجو و فیلتر قبل از animation داده را محدود می‌کنند تا performance و discoverability هم‌زمان حفظ شوند.

## فاز چهار: port عمیق Sketchbook به Page-Turn Reader

Page-Turn Reader به یک engine مستقل تبدیل می‌شود. view model فعلی مقاله و اسلاید حفظ و تکمیل می‌شود و برای هر slide این داده‌ها را نگه می‌دارد: id، order، titleهای دو زبان، bodyهای دو زبان، media، reference، note و state.

state machine reader شامل `loading`، `ready`، `turning-next`، `turning-prev`، `settled`، `empty`، `error` و `fallback` خواهد بود. animation باید دو صفحهٔ مجازی، direction، progress و cancellation را مدیریت کند و در هنگام درخواست دوم، state قبلی را corrupt نکند.

در desktop، drag برای خم‌شدن گوشه و page curl با pointer capture بررسی می‌شود. در mobile، swipe با threshold، velocity، نسبت افقی/عمودی، cancel و edge resistance پیاده‌سازی می‌شود. tap نیمهٔ چپ/راست، دکمه‌های صریح و Arrow keys سه مسیر مستقل navigation هستند.

reader باید به دادهٔ واقعی backend متصل بماند، slideها را بر اساس `sort_order` مرتب کند، fallback زبان را کنترل کند، markdown را sanitize/render کند، index نامعتبر را clamp کند و متن مقاله را در fallback قابل دسترسی نگه دارد. `prefers-reduced-motion` به‌جای حذف محتوا، page transition را به crossfade یا تغییر فوری تبدیل می‌کند.

## فاز پنج: port عمیق Kage به AboutProject و narrative pages

ساختار `kage` به شکل یک scroll narrative داده‌محور بازطراحی می‌شود: chapterها، progress rail، scene boundaries، fade/blur transitions، foreground/background layers و chapter completion state. ابتدا همه‌چیز با DOM/CSS و assetهای سبک ساخته می‌شود.

WebGL scene فقط برای بخش‌هایی که واقعاً با canvas ارزش بیشتری از DOM دارند prototype می‌شود. lantern، fog، rain و falling leaves به‌صورت ماژول‌های مستقل با visibility gate، DPR cap، frame budget و static poster fallback طراحی خواهند شد. WebGL هرگز تنها حامل متن، navigation یا CTA نخواهد بود.

در AboutProject، `ScrollChapterProgress` به chapterهای واقعی متصل می‌شود و hash، keyboard، `aria-current` و focus restoration را پشتیبانی می‌کند. در موبایل rail به horizontal compact navigation تبدیل می‌شود.

## فاز شش: اجرای کامل خانوادهٔ Skills با اولویت محصولی

Skills در پنج گروه پیاده‌سازی می‌شوند:

| گروه | قابلیت‌ها | محل هدف |
|---|---|---|
| خوانایی و reveal | `masked-reveal`، `staggered-word-reveal`، `scroll-scrubbed-word-reveal`، `animation-on-scroll`، `progressive-blur` | Home، AboutProject، Reader |
| ساختار editorial | `book-serif-index`، `editorial-portfolio-chapters`، `image-first-grid-layout`، `technical-wireframe-info-layout`، `number-details`، `framed-grid-layout` | Archive، AboutProject |
| atmosphere و paper | `ambient-section-particles`، `atmosphere-background`، `falling-leaves`، `beautiful-shadows`، `css-alpha-masking`، `css-border-gradient`، `container-lines` | Home، AboutProject، Reader |
| interaction و motion | `pointer`/`mouse` orbit، `reveal-hover-effect`، `scroll-progress-timeline`، `gsap-scrolltrigger-storytelling`، `cinematic-scroll-storytelling`، `marquee-loop` فقط در صورت value | Home، Archive، Narrative |
| 3D/WebGL اختیاری | `threejs`، `webgl-3d-object`، `webgl-landing-steering`، `background-grid-webgl`، `thinking-orbs`، `gooey-blob-system` | prototype و route-level، هرگز global |

برای هر گروه یک demo fixture و یک component contract ساخته می‌شود. component باید در Storybook-like route یا صفحهٔ QA داخلی با stateهای loading، empty، error، reduced motion، keyboard، RTL و narrow viewport قابل مشاهده باشد.

## فاز هفت: Live و Media integration

وضعیت‌های `scheduled`، `live`، `ended` و `recorded` با `beam-glow-states` و `thinking-orbs` فقط زمانی نمایش داده می‌شوند که backend state واقعی وجود داشته باشد. هیچ glow نباید جایگزین label متنی شود.

در Media و Live، metadata مقاله/اسلاید از view model مشترک استفاده می‌کند. timeline جلسه، chapter reader و recording state باید با progress مشترک و deep-link قابل بازگشت باشند. LiveKit و PDF worker همچنان lazy باقی می‌مانند و visual layer نباید باعث دانلود زودهنگام آن‌ها شود.

## فاز هشت: آزمایش کنترل‌شدهٔ GSAP، Lenis و WebGL

برای هر runtime یک spike جداگانه ساخته می‌شود و با feature flag روشن می‌شود. baseline شامل initial JS، route JS، gzip، LCP، INP، CLS، تعداد frame drop، CPU time، memory، مصرف GPU، رفتار در mobile و reduced motion است.

معیار ورود به production این است که runtime یک interaction غیرقابل‌دستیابی با CSS/DOM را فراهم کند، fallback کامل داشته باشد، route-level lazy باشد و budget تعریف‌شده را نقض نکند. اگر native implementation از نظر تجربه و performance بهتر باشد، dependency اضافه نمی‌شود.

## فاز نه: QA و تست‌های پذیرش

تست هر component در چهار ماتریس انجام می‌شود: desktop pointer، keyboard-only، touch/mobile، reduced-motion/low-power. برای RTL و LTR، جهت swipe، arrow keys، alignment، focus order، progress label و deep-link جداگانه بررسی خواهد شد.

تست‌های functional شامل navigation سریع، cancellation، reload در deep-link، backend error، مقالهٔ بدون اسلاید، markdown بلند، تصویر خراب، زبان ناقص، tab hidden، تغییر orientation، safe area و بازگشت از reader به archive است.

تست‌های accessibility شامل semantic landmarks، heading order، visible focus، `aria-live` محدود، progressbar، label کنترل‌ها، contrast، عدم وابستگی به hover و امکان تکمیل مسیر بدون animation است.

تست‌های performance شامل route chunk، idle CPU، canvas frame rate، visibility pause، DPR، memory cleanup و مقایسهٔ قبل/بعد خواهد بود. هیچ هشدار chunk موجود بدون تصمیم ثبت‌شده نادیده گرفته نمی‌شود.

## فاز ده: تحویل و rollout

تحویل در branchهای کوچک و قابل cherry-pick انجام می‌شود: `foundation`، `home-sylva`، `archive-shelf`، `reader-sketchbook`، `narrative-kage`، `live-media` و `experiments`. هر branch باید build، lint، QA notes، screenshot و provenance manifest داشته باشد.

پس از review، rollout با feature flag یا route opt-in آغاز می‌شود. PR اصلی فقط زمانی merge می‌شود که مسیرهای اصلی، fallbackها، RTL/LTR و performance gateها تأیید شده باشند. مستندات نهایی شامل component catalog، data contracts، state diagrams، license matrix، performance report و rollback procedure خواهد بود.

## ریسک‌ها و تصمیم‌های باز

| ریسک | تصمیم برنامه |
|---|---|
| ریپوهای همراه ممکن است license یا asset permission روشن نداشته باشند | کد/asset نامشخص کپی نمی‌شود؛ فقط رفتار port می‌شود تا اجازهٔ روشن دریافت شود |
| اجرای هم‌زمان همهٔ افکت‌ها باعث افت performance می‌شود | همهٔ runtimeها route-level، gated و قابل خاموش‌کردن هستند |
| page curl واقعی با markdown بلند ناسازگار شود | geometry فقط برای surface کنترل‌شده؛ fallback reader متنی مرجع باقی می‌ماند |
| فارسی با word reveal کلمه‌به‌کلمه ناخوانا شود | reveal روی phrase/line یا opacity ساده تبدیل می‌شود |
| pointer interaction روی touch مزاحم scroll شود | `touch-pan-y`، dominance ratio و cancel threshold اجباری است |
| backend در preview در دسترس نباشد | fixture contract برای QA، بدون تغییر رفتار production |
| کپی مستقیم demoها با معماری Vite/React سازگار نباشد | port کامل با حفظ الگوریتم و provenance، نه imitation سطحی |

## معیار پایان برنامه

برنامه زمانی کامل تلقی می‌شود که capability manifest برای هر ۸۸ Skill تصمیم داشته باشد، componentهای اصلی Home/Archive/Reader/About/Live از قرارداد مشترک استفاده کنند، Page-Turn با دادهٔ واقعی و gesture کامل کار کند، همهٔ مسیرها fallback متنی داشته باشند، RTL/LTR و keyboard/touch پذیرفته شوند، آزمایش‌های WebGL/GSAP نتیجهٔ اندازه‌گیری‌شده داشته باشند و branchهای قابل review با build/lint/QA سبز به PR نهایی برسند.

## فرض‌های اجرایی

پروژهٔ هدف همان `hadiranweb/Kaghaz-o-Baad` با React 18، TypeScript، Vite، Tailwind و backend فعلی است. تغییر schema backend در این برنامه لازم نیست مگر اینکه assetهای اسلاید یا metadata جدید برای یک capability ضروری باشد؛ در آن صورت ابتدا قرارداد API versioned و migration جداگانه پیشنهاد می‌شود. دسترسی به یک مقالهٔ منتشرشده با چند اسلاید و دست‌کم یک دستگاه واقعی iOS یا Android برای sign-off نهایی مورد نیاز است.

## منابع مرجع

[1]: https://github.com/MengTo/Skills "MengTo Skills"
[2]: https://github.com/MengTo/sylva "MengTo Sylva"
[3]: https://github.com/MengTo/kage "MengTo Kage"
[4]: https://github.com/MengTo/complete-shelf "MengTo Complete Shelf"
[5]: https://github.com/MengTo/sketchbook "MengTo Sketchbook"
