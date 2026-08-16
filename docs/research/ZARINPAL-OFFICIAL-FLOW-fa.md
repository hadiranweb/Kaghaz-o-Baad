# یافته‌های رسمی زرین‌پال

منبع اصلی: [راهنمای اتصال به درگاه اینترنتی زرین‌پال](https://www.zarinpal.com/docs/paymentGateway/connectToGateway)

## جریان رسمی

درخواست ایجاد پرداخت با `POST https://payment.zarinpal.com/pg/v4/payment/request.json` و بدنهٔ JSON شامل `merchant_id`، `amount`، `callback_url`، `description` و در صورت نیاز `metadata` انجام می‌شود. مستند رسمی پاسخ موفق را با `data.code = 100` و `data.authority` نشان می‌دهد.

پس از دریافت authority، کاربر باید به نشانی `https://payment.zarinpal.com/pg/StartPay/{authority}` هدایت شود.

پس از بازگشت، زرین‌پال پارامترهای query از جمله `Authority` و `Status` را به callback می‌فرستد. مقدار `Status` می‌تواند `OK` یا `NOK` باشد. مستند رسمی می‌گوید verify فقط در حالت `OK` انجام شود؛ در حالت `NOK` تراکنش ناموفق یا لغوشده است.

در verify، authority بررسی می‌شود و در صورت پاسخ با code برابر 100، مقدار `ref_id` شناسهٔ تراکنش موفق است. این مقدار باید در payment attempt به‌صورت server-side ثبت شود و entitlement فقط پس از verify موفق و transaction اتمیک فعال گردد.

## پیامد برای کاغذ و باد

`merchant_id` باید فقط در backend environment باشد. `amount` باید از invoice معتبر و integer minor units تولید شود و از callback یا frontend پذیرفته نشود. callback باید بر اساس payment attempt و authority lookup کند، در برابر تکرار idempotent باشد و مقدار پرداخت‌شده را با amount invoice مقایسه کند. redirect URL نباید به frontend اجازهٔ تغییر invoice یا مبلغ بدهد.

## جزئیات verify از مستند Node.js

منبع تکمیلی: [تأیید پرداخت زرین‌پال برای Node.js](https://www.zarinpal.com/docs/sdk/nodejs/method/verify)

در verify، `authority` از query callback گرفته می‌شود و `amount` باید به‌صورت integer از database استخراج شود و با مبلغ اصلی تراکنش مطابقت داشته باشد. بنابراین adapter کاغذ و باد هرگز amount را از query یا frontend نمی‌گیرد.

## Sandbox

منبع رسمی: [سرویس تست زرین‌پال](https://www.zarinpal.com/docs/paymentGateway/sandBox)

در sandbox، آدرس web service باید به sandbox تغییر کند و authorityهای sandbox با حرف `S` شروع می‌شوند. مستند رسمی اجازه می‌دهد برای merchant ID در sandbox یک UUID متنی دلخواه استفاده شود. URLهای دقیق باید از نشانی‌های رسمی همان صفحه و تنظیم نسخهٔ جاری adapter استخراج شوند، نه از مقادیر hardcoded در frontend.
