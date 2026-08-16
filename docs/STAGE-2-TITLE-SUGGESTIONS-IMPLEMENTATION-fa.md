# اتصال provider واقعی و پیشنهاد عنوان

## وضعیت اجرا

سناریوی `ai.title_suggestions` اکنون از frontend تا provider واقعی طراحی و پیاده‌سازی شده است:

```text
Frontend
  → POST /api/v1/articles/:articleId/title-suggestions
  → Auth و کنترل مالکیت مقاله
  → Usage Gateway
  → OpenAI-compatible adapter
  → provider واقعی
  → پاسخ پیشنهادها + usage metrics
  → update usage_events
```

یک smoke test واقعی با provider انجام شد و پاسخ سه عنوان فارسی همراه با `inputTokens` و `outputTokens` دریافت گردید. در این آزمون provider برابر `openai` و مدل `gpt-5-mini` بود.

## متغیرهای backend

این مقادیر فقط در environment backend قرار می‌گیرند و نباید در frontend یا Git قرار داده شوند:

```env
AI_PROVIDER=openai
AI_API_KEY=server-side-secret
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-5-mini
AI_TIMEOUT_MS=30000
```

`AI_BASE_URL` عمداً OpenAI-compatible است؛ بنابراین در Liara می‌توان آن را به endpoint سازگار provider انتخابی تغییر داد، بدون تغییر route یا Usage Gateway.

## endpoint

```http
POST /api/v1/articles/{articleId}/title-suggestions
Authorization: Bearer <session-token>
Content-Type: application/json
X-Request-Id: optional-client-correlation-id

{
  "topic": "تأثیر یادگیری ماشین بر تحلیل داده‌های اقلیمی",
  "locale": "fa",
  "count": 3
}
```

پاسخ موفق شامل `requestId`، `usageId`، provider، model و suggestionهاست:

```json
{
  "ok": true,
  "requestId": "…",
  "usageId": "…",
  "provider": "openai",
  "model": "gpt-5-mini",
  "suggestions": [
    {
      "title": "…",
      "rationale": "…",
      "keywords": ["…"]
    }
  ]
}
```

## کنترل‌های امنیتی و محصولی

کاربر باید session معتبر داشته باشد. فقط مالک مقاله یا نقش‌های `editor`، `admin`، `senior_manager` و `technical_manager` مجاز به درخواست است. کلید provider فقط در backend استفاده می‌شود. frontend نمی‌تواند provider، model، token یا cost ثبت‌شده را تعیین کند؛ این مقادیر از تنظیمات server-side و پاسخ adapter می‌آیند.

هر درخواست در `usage_events` با feature key برابر `ai.title_suggestions` ثبت می‌شود. ابتدا رکورد `started` ساخته می‌شود و همان رکورد در پایان به `succeeded`، `failed` یا `timed_out` تغییر می‌کند. `request_id`، provider/model و tokenهای input/output/cache ثبت می‌شوند.

## وضعیت معیار مرحلهٔ دوم

اتصال provider واقعی، adapter پیشنهاد عنوان، endpoint احراز‌شده، request ID و ثبت metrics انجام شده‌اند. مرحلهٔ دوم هنوز برای خروج کامل به تست integration با PostgreSQL staging، بررسی callback خطا و timeout در route، و اتصال entitlement/quota نیاز دارد. enforcement quota متعلق به مرحلهٔ سوم است و در این implementation عمداً فعال نشده است.
