# قرارداد متغیرهای طراحی Kaghaz-o-Baad

این قرارداد نخستین خروجی `phase-01-foundation-tokens` است و capabilityهای `tailwindcss`، `container-lines`، `css-border-gradient`، `css-alpha-masking`، `progressive-blur`، `beautiful-shadows` و `book-serif-index` را به یک لایهٔ semantic قابل مصرف در React/Tailwind تبدیل می‌کند.

| گروه | متغیرها | کاربرد |
|---|---|---|
| Color | `--ds-color-bg`، `surface`، `ink`، `ink-muted`، `brand`، `accent`، `line`، `focus` | رنگ‌های semantic متصل به تم فعلی |
| Type | `display`، `title`، `section`، `body`، `meta` و leadingها | hierarchy فارسی و لاتین |
| Spacing | `--ds-space-1` تا `--ds-space-8` و gutter | ریتم editorial و container |
| Layout | `--ds-container-gutter`، `--ds-container-max` | عرض و فاصلهٔ پایدار responsive |
| Shape | radius و border width | surface، control و card |
| Depth | shadow-paper، shadow-lift، shadow-inset | paper geometry و hover lift |
| Atmosphere | blur-surface، blur-progressive | glass/blur محدود و قابل کنترل |
| Layering | z-base، content، header، overlay | ترتیب لایه‌ها بدون magic number |
| Motion | duration، easing | اتصال به MotionProvider و reduced-motion |

در تم dark، shadowها برای زمینهٔ سرمه‌ای بازتنظیم می‌شوند. در `prefers-reduced-motion: reduce` همهٔ durationهای انیمیشن به صفر می‌رسند؛ در pointer coarse blur کاهش می‌یابد تا هزینه و سنگینی تعامل موبایل محدود بماند.

Primitiveهای اولیهٔ `.ds-container`، `.ds-paper-surface`، `.ds-editorial-rule` و `.ds-focus-ring` در `src/index.css` قرار دارند. این‌ها جایگزین تدریجی کلاس‌های پراکنده خواهند شد و فعلاً با کلاس‌های موجود سازگارند.

قانون migration این است که component ابتدا semantic token را مصرف کند، سپس در صورت نیاز variant محلی اضافه شود. رنگ hex مستقیم، سایهٔ تکراری، z-index عددی و transition بدون reduced-motion نباید به component جدید وارد شود.

## منابع

[1]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design "MengTo Web Design directory"
[2]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/tailwindcss "MengTo Tailwind CSS skill"
[3]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/container-lines "MengTo container lines skill"
[4]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/css-alpha-masking "MengTo CSS alpha masking skill"
[5]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/progressive-blur "MengTo progressive blur skill"
