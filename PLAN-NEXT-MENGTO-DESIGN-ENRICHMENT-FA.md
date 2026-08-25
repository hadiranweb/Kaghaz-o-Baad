# پلن گام‌های بعدی واکشی و غنی‌سازی عمیق دیزاین MengTo برای کاغذ و باد

## هدف

این برنامه ادامهٔ source-level port از `MengTo/Skills` و ریپوهای `sylva`، `complete-shelf`، `sketchbook` و `kage` است. معیار موفقیت، شباهت سطحی یا انباشتن افکت نیست؛ هر قابلیت باید به component واقعی React/TypeScript، قرارداد state، fallback، provenance، تست و معیار performance تبدیل شود.

## وضعیت مبنا

تا اینجا `StaggeredWordReveal` و `EditorialDock` به‌صورت port واقعی وارد شده‌اند، Homepage و navigation editorial شده‌اند، Archive دارای shelf state machine است و Reader از دادهٔ واقعی مقاله/اسلاید، drag/curl پایه و touch fallback استفاده می‌کند. branch فعال `feat/comprehensive-mengto-skills-ui` و PR اصلی #11 است.

## اصول اجرایی

1. **Source-first:** برای هر capability ابتدا فایل مرجع، الگوریتم، timing، event lifecycle و asset dependency ثبت می‌شود.
2. **یکپارچگی محصولی:** قابلیت فقط در صورتی وارد production می‌شود که به کشف مقاله، خواندن، روایت، گفت‌وگو یا وضعیت زنده کمک کند.
3. **Progressive enhancement:** HTML/DOM و محتوای واقعی بدون Canvas، WebGL، GSAP یا pointer همچنان کامل و قابل دسترسی است.
4. **محافظت از performance:** runtimeهای سنگین فقط route-level و lazy؛ هیچ runtime سه‌بعدی global وارد bundle اصلی نمی‌شود.
5. **دسترسی و زبان:** keyboard، screen reader، RTL/LTR، touch و `prefers-reduced-motion` بخشی از contract هر component هستند.
6. **مجوز و provenance:** asset یا کد با مجوز نامشخص کپی نمی‌شود؛ source commit، نوع تغییر و attribution در manifest ثبت می‌شود.

## فاز ۱ — foundation مشترک طراحی و motion

### خروجی‌ها

ساخت tokenهای مشترک برای duration، easing، distance، blur، stagger، elevation، border، paper surface و z-index. ایجاد `MotionProvider` سبک، `useIntersectionReveal`، `useMediaQuery`، `useSafeArea` و `usePointerProximity` با cleanup، Strict Mode و SSR/prerender safety. ساخت componentهای عمومی `MaskedReveal`، `StaggerGroup`، `ProgressRail`، `LayeredSurface` و `FallbackFrame`.

### معیار پذیرش

تمام primitiveها باید در fixture داخلی با stateهای hidden/ready/revealed، loading، error، empty، reduced-motion، keyboard، RTL/LTR و narrow viewport قابل مشاهده باشند. هیچ primitive نباید به Home یا یک route hard-code شود.

## فاز ۲ — تکمیل faithful Sylva روی Homepage و navigation

### ۲.۱ staged entrance و masked/pixel reveal

منطق staged entrance از Sylva استخراج و به timeline dependency-free منتقل می‌شود: brand، issue bar، title، copy، CTA، illustration و ambient layer ترتیب و delay مشخص دارند. `MaskedReveal` باید با clip-path یا overlay CSS کار کند، متن را از DOM حذف نکند و در نبود JS/Observer و reduced motion فوراً visible باشد. Pixel reveal فقط برای artwork و با canvas محدود استفاده می‌شود، نه برای متن یا CTA.

### ۲.۲ dock/proximity کامل

`EditorialDock` فعلی به stateهای `idle`، `nearby`، `focused`، `active` و `touch-fallback` توسعه می‌یابد. proximity با یک rAF مشترک و geometry cache اجرا می‌شود؛ pointermove فقط مختصات را ثبت می‌کند؛ layout read در frame انجام می‌شود. magnification به transform محدود می‌شود و برای keyboard scale ثابت، برای touch حالت معمولی و برای reduced motion بدون حرکت است. active route، focus restoration، Escape و route change باید پوشش داده شوند.

### ۲.۳ pointer interaction و particle burst

فقط در تعامل معنادار CTA یا تغییر section، burst محدود اجرا می‌شود. برای pointer-trail و particle emitter، touch/hover-none، tab hidden، DPR cap، count cap و keyboard path تعریف می‌شود. اگر burst ارزش روایی نداشته باشد، حذف می‌شود.

## فاز ۳ — Complete Shelf عمیق در Archive

ساخت state machine کامل `idle → focused → opening → open → reading → closing` با transition cancellation، deep-link به `/read/:slug` و focus restoration. کارت مقاله باید cover/metadata واقعی، زبان، نویسنده، تاریخ، وضعیت انتشار و action واضح داشته باشد. shelf desktop با horizontal wheel/pointer/keyboard و mobile با snap list یا stacked fallback کار می‌کند.

بازشدن کتاب با shared layout و surface paper انجام می‌شود، اما cover یا texture با provenance نامشخص کپی نمی‌شود. جست‌وجو و فیلتر قبل از animation داده را محدود می‌کنند. خروجی باید بدون JS همچنان لینک استاندارد و محتوای قابل خواندن داشته باشد.

## فاز ۴ — Sketchbook Reader به page-curl واقعی‌تر

Reader به engine مستقل با دو virtual page، current/next surface، direction، progress، velocity، cancellation و edge resistance تبدیل می‌شود. drag باید به fold line، shadow، perspective و curl amount متصل باشد. pointer capture و release/cancel کامل می‌شود و چند gesture هم‌زمان state را corrupt نمی‌کند.

مسیرهای navigation عبارت‌اند از drag، swipe، tap نیمهٔ صفحه، دکمهٔ explicit و Arrow keys. روی markdown بلند، curl فقط روی surface کنترل‌شده اجرا می‌شود و متن اصلی در fallback reader باقی می‌ماند. loupe/magnifier فقط اگر روی محتوای مقاله ارزش خوانایی واقعی داشته باشد اضافه می‌شود؛ در غیر این صورت در fixture آزمایشی باقی می‌ماند.

## فاز ۵ — Kage narrative و chapter system

AboutProject از page sections به scroll narrative داده‌محور تبدیل می‌شود. chapter schema شامل id، title، summary، anchor، scene، progress و completion state خواهد بود. `ScrollChapterProgress` با hash، deep-link، keyboard، `aria-current` و focus restoration کار می‌کند.

ابتدا foreground/background، fade/blur، scene boundary و timeline با DOM/CSS پیاده می‌شوند. fog، rain، lantern و leaves به moduleهای مستقل تبدیل می‌شوند. WebGL فقط در spike route-level با static poster، DPR cap، visibility pause، frame budget و reduced-motion fallback آزمایش می‌شود و هرگز حامل تنها متن، navigation یا CTA نخواهد بود.

## فاز ۶ — Skills خانوادهٔ خوانایی و editorial

به‌ترتیب ارزش محصولی، این componentها ساخته و در routeهای واقعی استفاده می‌شوند:

| گروه | Componentهای هدف | route |
|---|---|---|
| خوانایی | `MaskedReveal`، `StaggerGroup`، phrase/line reveal فارسی، progressive blur | Home، AboutProject، Reader |
| ساختار | book-serif index، number-details، framed grid، technical wireframe info | Archive، AboutProject |
| atmosphere | paper surface، beautiful shadows، container lines، border gradient، ambient particles | Home، Archive، Reader |
| progress | scroll progress timeline، chapter rail، reader progress | AboutProject، Reader |
| تعامل | hover reveal، pointer proximity، tap/drag states، marquee فقط در صورت value | Home، Archive |

برای متن فارسی، word-by-word فقط روی headline کوتاه استفاده می‌شود و برای متن بلند به phrase/line reveal یا opacity ساده تبدیل می‌شود.

## فاز ۷ — Live و Media visual states

stateهای واقعی `scheduled`، `live`، `ended` و `recorded` با label متنی و visual token مجزا طراحی می‌شوند. beam glow و thinking orb فقط enhancement هستند. Live/Media از view model مشترک مقاله/اسلاید و progress/deep-link مشترک استفاده می‌کنند. LiveKit و PDF worker lazy باقی می‌مانند.

## فاز ۸ — runtime spikes کنترل‌شده

سه spike جدا ساخته می‌شود: `GSAPScrollTriggerSpike`، `LenisSmoothScrollSpike` و `WebGLSceneSpike`. هر spike feature-flagged و route-level است. baseline و بعد از spike شامل initial JS، route JS، gzip، LCP، INP، CLS، frame drops، CPU، memory، GPU و mobile/reduced-motion behavior اندازه‌گیری می‌شود.

runtime فقط زمانی وارد production می‌شود که interaction غیرقابل‌دستیابی با CSS/DOM ایجاد کند، fallback کامل داشته باشد و budget را نقض نکند. در غیر این صورت implementation native حفظ می‌شود.

## ترتیب branch و تحویل

کار در branchهای کوچک و قابل cherry-pick انجام می‌شود:

1. `foundation-motion-design-tokens`
2. `home-sylva-staged-reveal`
3. `nav-sylva-dock-v2`
4. `archive-complete-shelf-v2`
5. `reader-sketchbook-curl-v2`
6. `narrative-kage-dom`
7. `skills-editorial-atmosphere`
8. `live-media-visual-states`
9. `runtime-experiments`
10. `frontend-qa-rollout`

هر branch باید شامل code، provenance update، QA notes، screenshot/preview، lint/build result و rollback note باشد. Merge به PR اصلی فقط پس از pass شدن matrix کامل انجام می‌شود.

## QA matrix

هر component در چهار حالت بررسی می‌شود: desktop pointer، keyboard-only، touch/mobile و reduced-motion/low-power. برای RTL/LTR، alignment، order، swipe direction، focus order، deep-link، route transition و progress label جداگانه تست می‌شود.

تست‌های failure شامل API error، article without slides، malformed markdown، broken image، rapid navigation، cancellation، tab hidden، orientation change، safe area، missing font، unavailable WebGL و slow device است.

## تصمیم‌های لازم پیش از فازهای سنگین

| تصمیم | پیش‌فرض پیشنهادی |
|---|---|
| استفاده از artwork ریپوهای همراه | فقط پس از تأیید مجوز؛ در غیر این صورت CSS/DOM port با provenance |
| اضافه‌کردن GSAP/Lenis | ابتدا native؛ dependency فقط پس از spike و measurement |
| WebGL در production | خیر، مگر اینکه prototype ارزش غیرقابل‌جایگزین و fallback کامل نشان دهد |
| page-curl روی متن بلند | خیر؛ curl روی surface محدود و text fallback مرجع |
| mobile dock | proximity خاموش؛ navigation عادی با touch target بزرگ |
| merge PR | پس از QA کامل؛ قبل از آن rollout opt-in یا feature flag |

## نتیجهٔ مورد انتظار

خروجی نهایی یک سیستم frontend editorial یکپارچه است که رفتار MengTo را واقعاً port می‌کند، اما در معماری React/TypeScript کاغذ و باد قابل نگهداری، قابل تست و قابل خاموش‌کردن باقی می‌ماند. این سیستم باید هم در حالت کامل و هم در حالت ساده، تجربهٔ خواندن، کشف و گفت‌وگو را حفظ کند.
