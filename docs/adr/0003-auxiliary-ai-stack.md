# ADR-0003: مرز AI Stack کمکی

- **وضعیت:** Accepted
- **تاریخ:** ۲۰۲۶-۰۸-۲۳

## زمینه

برنامهٔ محصول شامل n8n، OpenClaw، Open WebUI، RAG و Agent workflow است. اتصال مستقیم این سرویس‌ها به Browser یا Production Database می‌تواند Auth، هزینه و حاکمیت داده را دور بزند.

## تصمیم

- Backend کاغذ و باد تنها درگاه عمومی AI است.
- Usage، Quota، Entitlement، Redaction و Audit پیش از فراخوانی سرویس کمکی اعمال می‌شوند.
- n8n نقش Orchestrator داخلی دارد.
- OpenClaw Runtime عامل‌های محدود و Tool-allowlisted است.
- Open WebUI Workspace خصوصی تیم است، نه رابط عمومی محصول.
- هر سرویس App/Network/Secret/Health/Rollback مستقل دارد.
- دسترسی مستقیم Agent به Production DB ممنوع است؛ ابزارها فقط API محدود Backend را فراخوانی می‌کنند.
- قابلیت‌های نوآورانه Feature Flag و Kill Switch دارند.
- خروجی قابل انتشار نیازمند Human approval است.

## پیامدها

خرابی یا خاموشی AI Stack نباید Auth، Workflow، مطالعه، Media، Live یا Payment را از دسترس خارج کند. Deploy این سرویس‌ها از Deploy هسته جدا خواهد بود.
