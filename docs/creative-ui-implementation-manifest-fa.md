# Manifest اجرای Creative UI — کاغذ و باد

## وضعیت

این manifest مربوط به branch `feat/comprehensive-mengto-skills-ui` است و تفاوت میان قابلیت‌های اجراشده، قابلیت‌های adapt‌شده و قابلیت‌های آینده را ثبت می‌کند.

| قابلیت | منبع | وضعیت | روش استفاده | fallback / guard |
|---|---|---|---|---|
| Editorial hero و مسیرهای محصول | `editorial-tech`، `landing-page` | اجراشده در `Home.tsx` | بازنویسی React/Tailwind با copy دوزبانه | HTML semantic، CTA مستقیم، RTL/LTR |
| Mask/reveal foundation | `animation-systems`، `masked-reveal` | primitive اجراشده | `RevealOnScroll` با IntersectionObserver | reduced motion و no-IO به حالت visible |
| Word reveal | `staggered-word-reveal` | هنوز فعال نشده | پس از تست typography برای heading کوتاه | هرگز برای متن بلند یا لینک؛ no-JS text |
| Ambient paper particles | `ambient-section-particles` | اجراشده در hero | بازنویسی dependency-free با Canvas 2D | bounded، one RAF، ResizeObserver، IntersectionObserver، hidden-tab pause، DPR cap، reduced motion static |
| Falling paper/leaves | `falling-leaves` | آمادهٔ بررسی، فعال نشده | فقط در صورت نیاز به شکل قابل‌شناسایی | mobile/reduced-motion fallback |
| Scroll chapter progress | `scroll-progress-timeline` | primitive اجراشده | `ScrollChapterProgress` با `aria-current` | native anchor navigation |
| Page turn | `complete-shelf`، `sketchbook` | فعال نشده | باید برای `ArticleSlides` به React/TS بازنویسی شود | buttons، keyboard، touch و text fallback |
| Editorial archive | `book-serif-index` | در حال آماده‌سازی | token/layout برای `Read` و reader | list/grid ساده و semantic |
| Scroll storytelling | `cinematic-scroll-storytelling`، `scroll-world-storytelling` | native foundation | ابتدا HTML/data؛ GSAP/Lenis فقط با metric | ordinary document flow |
| GSAP / Lenis | `animation-systems`، `cinematic-gsap-lenis-motion-system` | نصب نشده | تصمیم بعد از native-scroll prototype | فقط یک scroll engine |
| WebGL / Three.js | `threejs`، `webgl-3d-object` | نصب نشده | آزمایش مستقل بعد از reader | static poster، DPR cap، pause/dispose |
| Pointer trail / shader ripple | `pointer-trail-emitter`، `shaders-cursor-ripples` | ردشده برای P0 | فقط campaign آزمایشی با use case واقعی | touch/keyboard fallback |
| Dark/light paper tokens | `dark-blue-contrasting-clean`، `light-mode-paper-technical` | بخشی موجود | adapt روی CSS tokenهای فعلی | contrast و reduced motion |

## Provenance و license

ریپوی `MengTo/Skills` با LICENSE ریشهٔ MIT بررسی شده است. این مجوز به‌صورت خودکار شامل artwork، texture، audio یا کد اختصاصی companion repoها نمی‌شود. برای همین، componentهای فعلی از منطق و توصیه‌های skillها بازنویسی شده‌اند و هیچ asset اختصاصی از `sylva`، `kage`، `complete-shelf` یا `sketchbook` وارد production نشده است.

منابع مرجع:

- https://github.com/MengTo/Skills
- https://github.com/MengTo/sylva
- https://github.com/MengTo/kage
- https://github.com/MengTo/complete-shelf
- https://github.com/MengTo/sketchbook

## قابلیت‌های فعلی branch

- `src/components/creative/RevealOnScroll.tsx`
- `src/components/creative/AmbientPaperParticles.tsx`
- `src/components/creative/ScrollChapterProgress.tsx`
- `src/components/creative/index.ts`
- بازطراحی اولیهٔ `src/pages/Home.tsx`
- primitiveهای CSS در `src/index.css`

## gateهای بعدی

پیش از page-turn و WebGL باید `Read.tsx`، `ArticleSlides.tsx` و mobile/RTL behavior با دادهٔ واقعی بررسی شوند. build production موفق است و lint فایل‌های جدید بدون خطا اجرا شده است؛ lint کل repository همچنان خطاهای pre-existing در فایل‌های قدیمی دارد و نباید به‌عنوان regression این branch تلقی شود.
