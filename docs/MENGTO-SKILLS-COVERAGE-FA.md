# پوشش کامل ۸۸ Skill وب‌دیزاین MengTo برای «کاغذ و باد»

این سند همهٔ پوشه‌های سطح اول `agent-skills/web-design` را پوشش می‌دهد. «استفاده» به معنی انتخاب یک نقش محصولی و ثبت adaptation است؛ مهارت‌هایی که فقط به دلیل تفاوت domain یا ریسک performance کنار گذاشته شده‌اند نیز عمداً ثبت شده‌اند.

## وضعیت‌های تصمیم

| وضعیت | معنی |
|---|---|
| **Adopted** | در branch فعلی وارد شده یا primitive آن در production UI پیاده شده است. |
| **Adapt next** | برای route واقعی پروژه ارزش دارد و در sprint بعدی باید به component React تبدیل شود. |
| **Experiment** | فقط پس از اندازه‌گیری، با branch و fallback مستقل بررسی می‌شود. |
| **Reference only** | برای composition یا مطالعه استفاده می‌شود؛ کد/asset خام وارد محصول نمی‌شود. |
| **Exclude** | برای دامنهٔ کاغذ و باد یا performance فعلاً ارزش کافی ندارد. |

## ماتریس پوشش

| Skill | وضعیت | نقش پیشنهادی در کاغذ و باد |
|---|---|---|
| `add-mouse-driven-orbit` | Experiment | orbit محدود برای cover/hero فقط روی desktop |
| `add-shader-cursor-trail` | Exclude | decoration بدون ارزش محتوایی قطعی |
| `agency-grid-layout-minimal` | Reference only | مطالعهٔ grid؛ زبان اصلی editorial است |
| `ambient-section-particles` | **Adopted** | ذرات paper bounded در hero |
| `animation-on-scroll` | **Adopted** | پایهٔ RevealOnScroll با IntersectionObserver |
| `animation-systems` | Adapt next | قرارداد واحد duration/easing/cleanup |
| `atmosphere-background` | Adapt next | background آرام و کم‌کنتراست، نه full-screen noise |
| `background-grid-webgl` | Experiment | فقط در prototype AboutProject |
| `beam-glow-states` | Adapt next | وضعیت live/active/published با متن و icon |
| `beautiful-shadows` | **Adopted** | shadowهای محدود کارت و hero |
| `blue-cloudy-clean-modern` | Reference only | مقایسهٔ تم، نه ترکیب هم‌زمان |
| `blue-laser-clean-glass-layout` | Reference only | inspiration برای contrast؛ glass محدود |
| `book-serif-index` | Adapt next | archive و reader editorial |
| `bright-green-tech-system-webgl` | Exclude | ناسازگار با identity کاغذ و باد |
| `build-awwwards-quality-sites` | Reference only | quality bar و choreography، نه feature مستقل |
| `build-interactive-particle-trail` | Experiment | فقط campaign مستقل در صورت use case |
| `build-threejs-scroll-worlds` | Experiment | فقط یک scene محدود بعد از baseline |
| `build-wireframe-scan-reveal` | Adapt next | reveal برای archive/technical metadata |
| `cinematic-gsap-lenis-motion-system` | Experiment | تنها اگر native scroll کافی نباشد |
| `cinematic-scroll-storytelling` | Adapt next | روایت AboutProject به‌صورت HTML/data |
| `clean-minimal-beige-light-mode` | Adapt next | variant روشن paper |
| `cobejs` | Exclude | globe برای domain محصول ضروری نیست |
| `company-logos` | Exclude | صفحهٔ شرکای سازمانی فعلاً نیاز محصول نیست |
| `container-lines` | **Adopted** | خطوط قاب و chapter separators در CSS |
| `corner-diagonals` | Reference only | accent محدود در hero |
| `corner-lasers` | Exclude | distraction و مصرف GPU |
| `css-alpha-masking` | Adapt next | mask CSS برای visual sequence سبک |
| `css-border-gradient` | Adapt next | border accent برای stateهای ویژه |
| `dark-blue-contrasting-clean` | **Adopted** | مبنای تم تیرهٔ فعلی |
| `dark-glass-clean-layout` | **Adopted** | glass tokenهای فعلی با کاهش blur |
| `documentary-brutalist-agency` | Reference only | rhythm روایی، نه visual identity اصلی |
| `editorial-portfolio-chapters` | Adapt next | chapterهای AboutProject و case study |
| `editorial-service-booking` | Exclude | booking در دامنهٔ فعلی نیست |
| `editorial-tech` | **Adopted** | زبان layout اصلی Home/About |
| `falling-leaves` | Experiment | فقط اگر asset برگ/کاغذ narrative داشته باشد |
| `framed-grid-layout` | **Adopted** | ساختار کارت و hero frame |
| `framed-tech-dark-border-gradient` | Adapt next | metadata و live state |
| `funky-purple-container-tech` | Exclude | ناسازگار با هویت رنگی |
| `glass-dark-mode-clock` | Exclude | clock محصولی نیست |
| `glass-dark-ui` | **Adopted** | فقط در componentهای موجود و کنترل‌شده |
| `globe-gl` | Exclude | نیاز محتوایی ندارد |
| `globe-particles` | Exclude | هزینهٔ بالا و domain نامرتبط |
| `gooey-blob-system` | Experiment | فقط illustration مستقل؛ priority پایین |
| `gsap` | Experiment | dependency فقط با gate bundle/performance |
| `gsap-scrolltrigger-storytelling` | Adapt next | برای sectionهای pin/scrub محدود |
| `high-contrast-skeuomorphic-clean` | Reference only | مطالعهٔ contrast و depth |
| `image-first-grid-layout` | Adapt next | archive cover cards در صورت وجود asset |
| `landing-page` | **Adopted** | ساختار محتوایی Home فعلی |
| `light-mode-paper-technical` | Adapt next | تم روشن و surface کاغذ |
| `liquid-metal-border` | Experiment | active/published accent، نه decoration عمومی |
| `marquee-loop` | Exclude | حرکت دائمی برای متن علمی مناسب نیست |
| `masked-reveal` | Adapt next | heading کوتاه با fallback |
| `matterjs` | Experiment | فقط در prototype physical paper؛ فعلاً بیش‌ازحد پیچیده |
| `mesh-gradient-dark-blue-clean` | **Adopted** | gradient hero فعلی |
| `nested-container-clean-agency` | Reference only | فقط برای hierarchy container |
| `nested-container-frames` | **Adopted** | قاب‌های تو در تو در hero/sections |
| `number-details` | **Adopted** | شمارهٔ مراحل و metadata |
| `operational-enterprise-ai` | Exclude | domain متفاوت |
| `orange-clean-paper-saas` | Reference only | رنگ accent محدود و نه SaaS aesthetic |
| `pointer-trail-emitter` | Exclude | distraction و مشکل touch |
| `pricing-page` | Exclude | pricing route در محصول فعلی نیست |
| `product-proof-saas` | Adapt next | evidence/benefit block در AboutProject |
| `progressive-blur` | Adapt next | فقط layerهای غیرحیاتی و با fallback |
| `reveal-hover-effect` | Experiment | preview تصویری، نه CTA اصلی |
| `scroll-progress-timeline` | **Adopted** | primitive با `aria-current` برای chapter |
| `scroll-scrubbed-visual-sequence` | Experiment | hero/about با asset اختصاصی |
| `scroll-scrubbed-word-reveal` | Adapt next | heading کوتاه؛ متن فارسی بلند ممنوع |
| `scroll-world-storytelling` | Adapt next | ابتدا DOM/data، سپس canvas اختیاری |
| `shaders-cursor-ripples` | Exclude | بدون value proposition روشن |
| `skeuomorphic-ui` | Reference only | مطالعهٔ page/physical metaphor |
| `solar-duotone-bold` | Reference only | icon/contrast reference |
| `split-layout-technical` | **Adopted** | split hero Home |
| `staggered-word-reveal` | Adapt next | heading کوتاه و accessible |
| `tailwindcss` | **Adopted** | framework موجود پروژه |
| `tech-green-dark-mode-modern` | Exclude | ناسازگار با brand colors |
| `technical-wireframe-info-layout` | Adapt next | archive metadata و project explanation |
| `thinking-orbs` | Experiment | visual cue برای live state، با count محدود |
| `threejs` | Experiment | فقط بعد از DOM baseline |
| `threejs-landscape` | Exclude | landscape domain نامرتبط |
| `threejs-towers` | Exclude | decoration غیرضروری |
| `threejs-weather` | Exclude | domain نامرتبط |
| `unicorn-studio` | Experiment | فقط اگر hosted runtime و license قابل‌قبول باشد |
| `vantajs` | Exclude | dependency و background heavy |
| `webgl-3d-object` | Experiment | cover سه‌بعدی اختیاری در archive |
| `webgl-landing-steering` | Experiment | scene hero فقط پس از proof |
| `webgl-laser` | Exclude | contrast/attention نامناسب برای مطالعه |

## جمع‌بندی اجرایی

در branch فعلی، ۱۴ capability به‌صورت واقعی در Home، Read، ArticleSlides، CSS و primitiveهای creative وارد شده‌اند. ۲۵ capability برای adaptation بعدی ارزش مستقیم دارند؛ ۱۴ مورد فقط پس از آزمایش و gate performance بررسی می‌شوند؛ بقیه یا reference هستند یا با دامنهٔ محصول و خوانایی علمی تعارض دارند.

«استفاده از همه» در production به معنای اجرای ۸۸ افکت هم‌زمان نیست. استفادهٔ کامل و حرفه‌ای یعنی برای هر Skill یا یک نقش محصولی قابل‌اندازه‌گیری تعریف شود، یا با دلیل ثبت‌شده کنار گذاشته شود. به این ترتیب ظرفیت repository از دست نمی‌رود و UI به مجموعه‌ای از demoهای متضاد تبدیل نمی‌شود.
