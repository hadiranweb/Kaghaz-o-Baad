# Creative UI Reference Manifest — KaghazBaad

**هدف:** نگه‌داری منابع مرجع برای غنی‌سازی لایهٔ نمایشی کاغذ و باد. این منابع به‌تنهایی مجوز کپی کد یا asset محسوب نمی‌شوند و هر اقتباس باید پیش از ورود به production از نظر license بررسی شود.

## فایل‌های ثبت‌شده

| فایل workspace | نوع | کاربرد مجاز | SHA-256 |
|---|---|---|---|
| `kaghazbaad-product-narrative-reference.txt` | متن مرجع محصول | روایت، positioning، پرسونا، آداب انتشار، FAQ و Addendum | `1cd4cefe3f07f0c86eb86ebac6ad70f49a5ddbd5c6b94aa5d253821f43df2854` |
| `kaghazbaad-ui-motion-reference.txt` | متن مرجع UI | Hero، parallax، scroll narrative، page turn، dock، particles، typography و fallback | `97c5526d62114836733987a3660cbde16f6e166e1b18f6f6dafe836a4020a598` |
| `mengto-reference-map.txt` | نقشهٔ منابع | provenance و نگاشت ریپوهای MengTo به لایه‌های تجربه | `a36eb86194715446bcb24e224d545976b2215f207405a2a9ca546904f24a37fc` |
| `n8n_forensic_reconstruction_final.pdf` | گزارش forensic | فقط مرجع معماری و استقرار n8n؛ خارج از لایهٔ بصری | `fe3a2563947c0320a9db8f6917811084c757e99422bdb7d8cb3b014b9a9ff584f` |

> توجه: hash سند PDF در زمان کپی به workspace ثبت شده است. اگر فایل مرجع دیگری با همان نام دریافت شود، باید hash آن دوباره بررسی شود.

## منابع خارجی MengTo

| لایه | منبع | تصمیم اولیه |
|---|---|---|
| Hero parallax و graceful degradation | [MengTo/sylva](https://github.com/MengTo/sylva) | الهام و مطالعه؛ اقتباس کد فقط پس از بررسی license |
| Scroll-as-wind و particle technique | [MengTo/kage](https://github.com/MengTo/kage) | الهام برای تجربهٔ اسکرول؛ بدون scroll hijacking |
| Page turn | [MengTo/complete-shelf](https://github.com/MengTo/complete-shelf) و [MengTo/sketchbook](https://github.com/MengTo/sketchbook) | مطالعهٔ interaction؛ fallback keyboard/click اجباری |
| Timeline | [MengTo/a-long-expected-party](https://github.com/MengTo/a-long-expected-party) | الگوی نمایشی؛ داده فقط از backend واقعی |
| فایل‌محوری و قواعد توسعه | [MengTo/Skills](https://github.com/MengTo/Skills) | الگوی مستندسازی، نه dependency runtime |
| procedural styles | [MengTo/towers](https://github.com/MengTo/towers) | فقط بررسی آینده؛ در فاز اول استفاده نمی‌شود |

## وضعیت license منابع کلیدی

بررسی صفحات رسمی GitHub نشان داد وضعیت مجوز منابع اصلی یکسان نیست. `sylva` صریحاً می‌گوید برای reuse یا redistribution کد، design یا artwork اصلی مجوزی اعطا نشده است؛ فقط اجزای ثالث مانند Three.js و Lexend مجوزهای خودشان را دارند. `kage` نیز اعلام می‌کند برای کد یا artwork اصلی مجوزی اعطا نشده و فقط مجوز ثالث Three.js باقی است. صفحهٔ `complete-shelf` توضیح معماری و تعامل را منتشر می‌کند، اما در بررسی فعلی مجوز صریحی برای کپی کد/asset احراز نشد. بنابراین این منابع در کاغذ و باد فعلاً **مرجع الهام و مطالعهٔ تعامل** هستند و کد، artwork، texture، audio یا asset آن‌ها وارد پروژه نمی‌شود؛ هر اقتباس مستقیم نیازمند بررسی license کامل یا اجازهٔ صاحب اثر است.

منابع بررسی‌شده:

- [MengTo/sylva](https://github.com/MengTo/sylva) — «No license is granted for reuse or redistribution of the Sylva code, design, or artwork.»
- [MengTo/kage](https://github.com/MengTo/kage) — «No license is currently granted for reuse or redistribution of the original Kage code or artwork.»
- [MengTo/complete-shelf](https://github.com/MengTo/complete-shelf) — مرجع رسمی معماری interaction و صفحه‌خوانی؛ مجوز صریح برای reuse در بررسی فعلی احراز نشد.

## مرز معماری

این منابع فقط در سطح **presentation layer** استفاده می‌شوند. آن‌ها نباید به مدل داده، backend/API contract، RBAC، quota، payment، LiveKit token، Open WebUI، OpenClaw یا n8n وابستگی ایجاد کنند. animation state محلی و موقت است و در PostgreSQL یا eventهای business ذخیره نمی‌شود.

صفحات عمومی باید بدون AI و سرویس‌های اتوماسیون نیز کامل کار کنند. همهٔ motionها باید reduced-motion، keyboard، touch، RTL/LTR، screen reader، fallback ثابت و محدودیت performance داشته باشند.

## وضعیت اقتباس

| مورد | وضعیت |
|---|---|
| ثبت پیوست‌ها در workspace | انجام شد |
| ثبت hash و provenance | انجام شد |
| بررسی license ریپوهای MengTo | پیش از هر اقتباس کد/asset باقی‌مانده |
| ایجاد componentهای UI | هنوز آغاز نشده |
| افزودن dependency جدید | انجام نشده |
| تغییر backend یا زیرساخت | انجام نشده و خارج از این مسیر است |
