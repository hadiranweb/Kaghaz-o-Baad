# یافته‌های احراز هویت ایمیلی و OAuth

تاریخ بررسی: 2026-08-19

## Google

Google از OAuth 2.0 و OpenID Connect برای ورود پشتیبانی می‌کند. برای ورود سروری باید state ضد CSRF و nonce برای جلوگیری از replay ایجاد و در callback بررسی شود؛ سپس authorization code در backend به token و ID token تبدیل و issuer، audience، امضا، nonce و اطلاعات هویتی اعتبارسنجی شود. برای ورود پایه scopeهای `openid email profile` کافی است و redirect URI باید دقیقاً با URI ثبت‌شده در Google Cloud Console یکسان باشد.

منبع رسمی: https://developers.google.com/identity/openid-connect/openid-connect

## GitHub

GitHub برای web application flow از authorization code استفاده می‌کند و state تصادفی را برای محافظت در برابر CSRF توصیه می‌کند. endpoint شروع `https://github.com/login/oauth/authorize` و callback backend باید code را به `https://github.com/login/oauth/access_token` تبدیل کند؛ سپس با توکن کوتاه‌مدت به `https://api.github.com/user` و در صورت نیاز endpoint ایمیل‌ها، فقط با scopeهای حداقلی `read:user user:email`، اطلاعات کاربر خوانده می‌شود. callback URL باید دقیقاً در OAuth App ثبت شود.

منابع رسمی: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps و https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app

## تصمیم معماری پروژه

Backend Fastify مالک state، nonce، code exchange، اعتبارسنجی provider، اتصال حساب به کاربر و ایجاد session داخلی خواهد بود. Frontend فقط لینک شروع OAuth را باز می‌کند و پس از callback به صفحهٔ Auth برمی‌گردد؛ client secret و provider access token هرگز در bundle یا browser نگه‌داری نمی‌شوند. برای email login نیز eventهای تلاش ورود، نتیجه، provider، latency، error code و request id بدون password، code یا token ثبت خواهند شد.
