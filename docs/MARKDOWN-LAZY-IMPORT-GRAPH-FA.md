# بهینه‌سازی Markdown editor و import graph

## نتیجهٔ اجرایی

`@uiw/react-md-editor` اکنون فقط از مسیر `LazyMarkdownEditor` مصرف می‌شود و در مسیر authoring داشبورد قرار دارد. `ArticleSlides`، `LiveRoom` و `AboutProject` از `MarkdownReadonly` استفاده می‌کنند؛ این renderer به dependencyهای editor یا `react-markdown` وابسته نیست.

## تغییرات

| فایل | تغییر |
|---|---|
| `src/components/MarkdownReadonly.tsx` | renderer سبک read-only با escape، heading، list، code، strong و لینک‌های فقط HTTP(S) |
| `src/components/LazyMarkdownEditor.tsx` | `React.lazy` و `Suspense` برای editor کامل با loading fallback |
| `src/pages/Dashboard.tsx` | جایگزینی editor مستقیم با wrapper lazy در تمام فرم‌های ویرایش/ایجاد |
| `src/pages/ArticleSlides.tsx` | حذف MDEditor و استفاده از renderer سبک با direction locale |
| `src/components/LiveRoom.tsx` | حذف MDEditor و استفاده از renderer سبک در نمایش اسلاید |
| `src/pages/AboutProject.tsx` | حذف import مستقیم `react-markdown` و استفاده از renderer مشترک |
| `vite.config.ts` | نگه‌داشتن Markdown vendor برای تحلیل، اما حذف آن از `modulepreload` اولیه |

## قرارداد lazy boundary

editor کامل فقط با dynamic import زیر بار می‌رود:

```ts
const MarkdownEditor = lazy(() => import('@uiw/react-md-editor'));
```

Homepage، Archive، Reader، LiveRoom و AboutProject این dependency را import نمی‌کنند. Dashboard در بارگذاری اولیه editor را render نمی‌کند و پس از mount شدن consumer و درخواست component، Suspense fallback نمایش داده می‌شود. مسیر authoring همچنان props کنترل‌شدهٔ قبلی مانند `value`، `onChange`، `height`، `preview` و `direction` را دریافت می‌کند.

## Renderer read-only

`MarkdownReadonly` برای جلوگیری از تحمیل toolbar و editor runtime، یک renderer کوچک و بدون dependency خارجی است. ورودی HTML مستقیماً پذیرفته نمی‌شود؛ متن ابتدا escape می‌شود و سپس تنها syntaxهای محدود Markdown تولید می‌شوند. لینک‌ها فقط با الگوی `http://` یا `https://` به anchor تبدیل می‌شوند و با `rel="noreferrer noopener"` رندر می‌شوند. body خالی fallback متنی نشان می‌دهد و `dir` برای فارسی/انگلیسی از consumer دریافت می‌شود.

این renderer جایگزین کامل Markdown specification نیست؛ هدف آن public reading path سبک و پایدار است. اگر syntax پیچیده‌تری لازم باشد، باید در fixture و benchmark جداگانه بررسی شود، نه اینکه editor کامل وارد critical path شود.

## import graph و preload

پیش از تغییر، `dist/index.html`، `markdown-vendor` را در modulepreload اولیه قرار می‌داد. با نگه‌داشتن vendor boundary برای تحلیل و اضافه‌کردن `build.modulePreload.resolveDependencies`، Markdown vendor از preload Homepage حذف شد، درحالی‌که chunk مستقل برای Dashboard قابل نگهداری باقی ماند.

| شاخص | قبل از فیلتر preload | بعد از فیلتر preload |
|---|---:|---:|
| Homepage entry خام | حدود 112 KB | حدود 112 KB |
| Homepage entry gzip | حدود 33.6 KB | حدود 33.6 KB |
| shared app chunk خام | حدود 678 KB | حدود 678 KB |
| Markdown vendor خام | 382,981 B | 382,981 B |
| Markdown vendor gzip | حدود 117–118 KB | حدود 117–118 KB |
| Markdown در modulepreload Homepage | وجود داشت | حذف شد |
| import مستقیم editor در public reader | وجود داشت | حذف شد |

این تغییر preload را از critical request graph حذف می‌کند؛ اندازهٔ خود dependency فقط هنگام نیاز Dashboard منتقل می‌شود. chunk warning بزرگ همچنان ثبت می‌شود تا اندازهٔ runtimeهای PDF و LiveKit نیز در taskهای بعدی جداگانه تحلیل شود.

## Validation

آخرین validation:

```text
pnpm test: 1 file passed, 6 tests passed
npm run build: موفق
SEO prerender: موفق، 15 public route و 3 article record
Targeted ESLint: بدون error؛ دو warning قدیمی در LiveRoom دربارهٔ dependencyهای useCallback باقی است
```

Dashboard دارای چند `no-explicit-any` قدیمی خارج از scope این task است؛ این task آن خطاهای قبلی را پنهان نکرده و باید در cleanup type-safety جداگانه اصلاح شوند.

## ریسک‌ها و کارهای بعدی

1. برای تثبیت رفتار Markdown، باید fixtureهای body ساده، code block، لینک ناامن، body خالی و متن فارسی/انگلیسی اضافه شوند.
2. باید با Lighthouse و throttled 4G ثابت شود که حذف modulepreload واقعاً LCP و request priority را بهبود داده است.
3. باید Dashboard با focus و click کاربر بررسی شود تا Suspense fallback و editor load delay قابل قبول باشد.
4. باید PDF worker و LiveKit نیز با همین رویکرد route-level preload و import graph تحلیل شوند.
5. warningهای hook در LiveRoom و `no-explicit-any`های Dashboard باید در hardening مستقل رفع شوند.

## Rollback

برای rollback، consumerهای ArticleSlides، LiveRoom و AboutProject به renderer قبلی برگردانده می‌شوند، import wrapper در Dashboard حذف می‌شود و فیلتر `modulePreload` از Vite برداشته می‌شود. API و backend تغییری نکرده‌اند.
