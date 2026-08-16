# مرحلهٔ هفتم: adapter رسمی زرین‌پال

## قرارداد رسمی استفاده‌شده

بر اساس [مستندات رسمی اتصال زرین‌پال](https://www.zarinpal.com/docs/paymentGateway/connectToGateway)، شروع پرداخت با endpoint نسخهٔ چهار انجام می‌شود و پاسخ موفق شامل `data.code = 100` و `data.authority` است. کاربر پس از آن به `StartPay/{authority}` هدایت می‌شود. پس از بازگشت، callback پارامترهای `Authority` و `Status` را دریافت می‌کند و فقط در حالت `Status=OK` باید verify انجام شود.

بر اساس [مستندات رسمی verify برای Node.js](https://www.zarinpal.com/docs/sdk/nodejs/method/verify)، authority و amount باید برای verify ارسال شوند و amount باید از database استخراج شود. کاغذ و باد amount را هرگز از frontend یا query callback نمی‌گیرد.

## کد اضافه‌شده

- `backend/src/modules/billing/zarinpal.ts`؛
- تنظیمات `ZARINPAL_MERCHANT_ID`، `ZARINPAL_SANDBOX`، `PAYMENT_CALLBACK_BASE_URL` و `PAYMENT_PROVIDER_TIMEOUT_MS`؛
- endpoint آغاز پرداخت:

```http
POST /api/v1/billing/payment-attempts/:attemptId/start
```

- callback رسمی:

```http
GET /api/v1/billing/callback/zarinpal?Authority=...&Status=OK
```

- ثبت authority و redirect URL در payment attempt؛
- verify server-side با مبلغ invoice؛
- ثبت ref_id؛
- انتقال invoice به paid و payment attempt به succeeded؛
- انقضای entitlement قبلی و ایجاد entitlement پلن پرداخت‌شده در transaction؛
- ثبت activity event برای پرداخت موفق؛
- رفتار idempotent در callback تکراری؛
- ثبت failed برای Status=NOK یا verify ناموفق.

## متغیرهای محیطی

```env
ZARINPAL_MERCHANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ZARINPAL_SANDBOX=true
PAYMENT_CALLBACK_BASE_URL=https://api.example.ir
PAYMENT_PROVIDER_TIMEOUT_MS=30000
```

merchant ID و callback فقط در backend قرار می‌گیرند. frontend تنها invoice و payment attempt را ایجاد می‌کند و redirect URL را از پاسخ server دریافت خواهد کرد.

## وضعیت تست

`npm run check`، `npm run build` و `npm run migrate:dry-run` موفق هستند. migration ششم روی PostgreSQL محلی نیز با موفقیت اجرا شده است. sandbox واقعی زرین‌پال به merchant ID و callback عمومی نیاز دارد و در محیط فعلی بدون این credentialها و دامنهٔ عمومی اجرا نشده است.

## مرزهای باقی‌مانده

قبل از production باید callback با sandbox واقعی آزمایش شود، adapter IDPay در صورت نیاز اضافه گردد، قیمت‌گذاری و واحد مبلغ با قرارداد حساب پذیرنده نهایی شود، و entitlement به subscription period و grace period کامل متصل گردد.
