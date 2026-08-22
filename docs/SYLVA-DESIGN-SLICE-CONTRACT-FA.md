# قرارداد slice طراحی Sylva برای کاغذ و باد

## هدف

این slice یک dock navigation editorial و reveal مرحله‌ای را به‌صورت faithful port از capabilityهای `MengTo/sylva` و Skillهای `staggered-word-reveal` و `masked-reveal` وارد Homepage می‌کند. هدف، یک interaction قابل‌استفاده برای کشف مسیرها و ورود روایی به صفحه است، نه تزئین مستقل.

## Component contracts

| Component | ورودی | stateها | fallback |
|---|---|---|---|
| `EditorialDock` | items، activeId، locale، pointer coordinates | idle، nearby، focused، active | nav معمولی با focus و underline |
| `StaggeredWordReveal` | متن کوتاه، semantic tag، disabled | idle، ready، visible | متن کامل بدون animation |
| `MaskedReveal` | children، delay، once | hidden، ready، revealed | content visible و بدون mask |

## Dock behavior

در desktop pointer، فاصلهٔ مکان‌نما تا هر item به scale محدود 1.0 تا 1.12 تبدیل می‌شود. این magnification فقط transform compositor-friendly است و layout را جابه‌جا نمی‌کند. item فعال با underline و `aria-current=page` مشخص می‌شود. focus keyboard نباید به pointer وابسته باشد و همان focus ring و scale ثابت را دریافت می‌کند. در touch و hover-none، proximity خاموش است و dock به navigation معمولی تبدیل می‌شود.

## Reveal behavior

متن در DOM از ابتدا وجود دارد. mask یا opacity فقط لایهٔ presentation است و نباید متن را از screen reader حذف کند. IntersectionObserver با threshold حدود ۲۰٪ trigger می‌شود و پس از اولین reveal unobserve می‌کند. در نبود Observer یا `prefers-reduced-motion`، content فوراً visible است. هیچ متن بلند یا متن دارای inline link split نمی‌شود.

## QA acceptance

صفحه باید بدون JS نیز خوانا باشد؛ keyboard باید کل مسیر را تکمیل کند؛ touch نباید scroll عمودی را مختل کند؛ RTL و LTR باید order و alignment درست داشته باشند؛ reduced motion باید animation را حذف و content را حفظ کند؛ console باید clean باشد؛ و هیچ dependency یا runtime سراسری جدیدی برای این slice اضافه نشود.

## Provenance

منبع رفتاری: `MengTo/sylva` برای proximity dock و staged entrance؛ `MengTo/Skills/staggered-word-reveal` برای word reveal؛ `MengTo/Skills/masked-reveal` برای mask و fallback. Implementation برای React 18/TypeScript بازنویسی می‌شود و asset یا artwork با مجوز نامشخص کپی نمی‌شود.
