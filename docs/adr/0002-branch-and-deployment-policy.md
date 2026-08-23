# ADR-0002: سیاست Branch و Deployment

- **وضعیت:** Accepted
- **تاریخ:** ۲۰۲۶-۰۸-۲۳

## زمینه

Workflow فعلی Push موفق به `main` را مستقیم روی Liara Production Deploy می‌کند. در آغاز Sprint 1، `main` Branch Protection نداشت.

## تصمیم

- `main` تنها منبع Production است.
- Push مستقیم، Force Push و حذف `main` ممنوع است.
- تغییرات از Pull Request و Required Checks عبور می‌کنند.
- Deployment Production فقط روی رویداد `push` به `main` اجرا می‌شود.
- Job استقرار به GitHub Environment با نام `production` متصل می‌شود.
- `integration/product-finalization` خط تجمیع اسپرینت‌هاست و Push آن Validation را اجرا می‌کند، نه Deployment را.
- هر اسپرینت Commit، گزارش، Push و Rollback مستقل دارد.

## Required Checks

- Frontend check and build؛
- Backend check, build and migration dry-run؛
- Windows EXE installer؛
- Public repository secret scan.

Lint پس از رفع Baseline شکست‌خورده به Required Checks افزوده می‌شود.

## پیامدها

- Merge به `main` یک عمل Production است.
- Branch Protection باید برای Admin نیز اجرا شود.
- Staging در اسپرینت CI/CD اضافه می‌شود و Production rollback باید پیش از Release Candidate آزمایش شود.
