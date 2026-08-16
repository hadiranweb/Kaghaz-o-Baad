# مرحلهٔ دوم: Usage Gateway و attribution

## وضعیت فعلی

هستهٔ مرحلهٔ دوم پیاده‌سازی شد و backend مستقل با موفقیت check/build می‌شود. migration جدید `002_usage_events.sql` جدول ثبت مصرف را ایجاد می‌کند و migration runner در dry-run آن را شناسایی می‌کند.

## اجزای پیاده‌سازی‌شده

| جزء | وضعیت |
|---|---|
| Request ID در Fastify | پیاده‌سازی شد؛ از `x-request-id` معتبر استفاده می‌شود و در غیر این صورت `request.id` ساخته‌شده توسط Fastify به پاسخ در header `x-request-id` برمی‌گردد. |
| جدول `usage_events` | پیاده‌سازی شد؛ user، article، request، feature، tool، provider، model، pricing version، status، tokenها، units، currency، cost و error را نگه می‌دارد. |
| Repository ثبت usage | پیاده‌سازی شد؛ token و unit منفی یا نامعتبر رد می‌شود. |
| Usage Gateway | پیاده‌سازی شد؛ execution را با `started` ثبت می‌کند و همان رکورد را به `succeeded`، `failed` یا `timed_out` به‌روزرسانی می‌کند. |
| Attribution | context شامل `featureKey`، `toolName`، `provider`، `model` و `pricingVersion` است. |
| Timeout | پیاده‌سازی شد؛ timeout به status `timed_out` تبدیل می‌شود. |
| اتصال provider واقعی | هنوز باقی است و در ادامهٔ مرحله باید با adapter server-side انجام شود. |
| Quota/entitlement | عمداً به مرحلهٔ سوم موکول شده است. |

## قرارداد استفاده از Gateway

```ts
const result = await runUsage(
  {
    userId,
    articleId,
    requestId: request.headers['x-request-id'] ?? request.id,
    featureKey: 'ai.title_suggestions',
    toolName: 'title-suggestion',
    provider: 'provider-name',
    model: 'model-name',
    timeoutMs: 30_000,
    metadata: { locale: 'fa' },
  },
  async () => {
    const response = await provider.generateTitle(input);
    return {
      value: response.text,
      metrics: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cachedTokens: response.usage.cachedTokens,
        provider: response.provider,
        model: response.model,
      },
    };
  },
);
```

در نسخهٔ واقعی، provider و model باید از adapter معتبر server-side بیایند؛ frontend نباید بتواند مقدار token، cost یا provider را جعل کند. Gateway فقط metrics بازگشتی adapter را normalize و ثبت می‌کند.

## مدل ثبت یک execution

برای جلوگیری از دوبرابرشماری، هر execution یک رکورد دارد. ابتدا status برابر `started` است. پس از نتیجه، همان رکورد به یکی از وضعیت‌های زیر تغییر می‌کند:

| status | معنا |
|---|---|
| `succeeded` | adapter با نتیجهٔ معتبر و metrics برگشته است. |
| `failed` | اجرای provider با خطای مشخص پایان یافته است. |
| `timed_out` | gateway از سقف زمان عبور کرده است. |

## کارهای باقی‌مانده برای خروج مرحلهٔ دوم

اتصال حداقل یک provider واقعی به adapter و عبور یک قابلیت مانند پیشنهاد عنوان از gateway هنوز انجام نشده است. همچنین باید تست‌های integration برای موفقیت، خطا، timeout، ثبت tokenهای صفر/مثبت، request ID ورودی و تولید request ID داخلی نوشته شود.

ثبت cost واقعی نیز باید پس از تعیین pricing snapshot انجام شود. gateway فعلاً فیلدهای `currency`، `costMinor` و `pricingVersion` را می‌پذیرد، اما منطق قیمت‌گذاری نباید در این مرحله به provider یا frontend واگذار شود.

## معیار خروج مرحلهٔ دوم

مرحلهٔ دوم زمانی کامل است که حداقل یک adapter واقعی server-side از gateway عبور کند و برای موفقیت، خطا و timeout یک `usage_events` معتبر بسازد؛ attribution provider/model و request ID قابل‌ردیابی باشد؛ tokenهای input/output/cache ثبت شوند؛ و تست‌ها ثابت کنند frontend نمی‌تواند مصرف یا قیمت را جعل کند. quota و entitlement پس از این مرحله در مرحلهٔ سوم enforce می‌شوند.
