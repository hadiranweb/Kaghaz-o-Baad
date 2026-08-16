# مرحلهٔ اول: Workflow مقاله و RBAC

## وضعیت فعلی

در backend مستقل، احراز هویت، session، migration، workflow transition service و comment route وجود دارد. در این iteration، CRUD اصلی مقاله نیز اضافه شد و routeهای آن در server ثبت شدند. `npm run check` و `npm run build` backend موفق هستند.

## APIهای مرحلهٔ اول

| Method | Endpoint | نقش/شرط |
|---|---|---|
| POST | `/api/v1/articles` | author، contributor، editor یا admin |
| GET | `/api/v1/articles` | author/contributor فقط مقالات خود؛ مدیران workflow همه |
| GET | `/api/v1/articles/:articleId` | مالک یا مدیر workflow |
| PATCH | `/api/v1/articles/:articleId` | مالک فقط در draft/changes_requested؛ مدیر workflow با دسترسی گسترده‌تر |
| POST | `/api/v1/articles/:articleId/workflow` | بر اساس action، وضعیت قبلی، مالکیت و نقش |
| POST | `/api/v1/articles/:articleId/comments` | مالک یا مدیر workflow |
| PATCH | `/api/v1/comments/:commentId` | مالک مقاله یا مدیر workflow |

## انتقال‌های workflow

```ts
const transitions = {
  submit_for_review: [['draft', 'in_review'], ['changes_requested', 'in_review']],
  request_changes: [['in_review', 'changes_requested']],
  approve: [['in_review', 'approved']],
  schedule: [['approved', 'scheduled']],
  publish: [['approved', 'published'], ['scheduled', 'published']],
  archive: [['published', 'archived']],
  restore_draft: [['archived', 'draft'], ['changes_requested', 'draft']],
};
```

مالک دارای نقش `author` یا `contributor` می‌تواند مقالهٔ خودش را برای بررسی ارسال یا به draft بازگرداند. `editor`، `admin`، `senior_manager` و `technical_manager` نقش مدیر workflow محسوب می‌شوند و می‌توانند review، approve، schedule، publish و archive را انجام دهند. frontend فقط پیشنهاد UI است؛ تصمیم قطعی باید در backend باقی بماند.

## الگوی guard نقش

```ts
export function hasRole(user: Pick<AuthUser, 'roles'>, ...roles: string[]) {
  return roles.some((role) => user.roles.includes(role));
}

function canManageWorkflow(user: AuthUser) {
  return hasRole(user, 'editor', 'admin', 'senior_manager', 'technical_manager');
}
```

این guard اکنون در workflow service و article routes استفاده می‌شود. گام بعدی باید این نقش‌ها را در schema نهایی نیز یکدست کند؛ در migration فعلی enum اصلی فقط `author`، `contributor`، `editor` و `admin` را دارد، درحالی‌که `role_catalog` نقش‌های مدیریتی فارسی را نیز ثبت کرده است. این ناهماهنگی باید با تصمیم واحد حل شود: یا نقش‌های عملیاتی به enum اضافه شوند، یا فقط از mapping رسمی به نقش‌های workflow استفاده شود.

## تراکنش انتقال وضعیت

کد موجود انتقال وضعیت از row lock استفاده می‌کند و تغییر مقاله، ثبت `article_workflow_events` و ثبت `activity_events` را در یک transaction انجام می‌دهد:

```ts
await client.query('BEGIN');
const article = await client.query(
  'SELECT id, author_id, status FROM articles WHERE id = $1 FOR UPDATE',
  [articleId],
);
// validate ownership, role and allowed transition
await client.query('UPDATE articles SET status = $1, updated_at = now() WHERE id = $2', [next, articleId]);
await client.query('INSERT INTO article_workflow_events (...) VALUES (...)', values);
await client.query('INSERT INTO activity_events (...) VALUES (...)', activityValues);
await client.query('COMMIT');
```

## کدهای باقیمانده برای خروج از مرحلهٔ اول

### یکدست‌سازی نقش‌ها

باید تصمیم بگیریم `senior_manager`، `technical_manager`، `secretary` و `procurement_agent` نقش‌های مستقل auth باشند یا فقط metadata سازمانی. اگر مستقل هستند، migration بعدی باید مدل role را اصلاح کند و seed/assign route امن برای admin اضافه شود. نباید با SQL پراکنده یا تغییر دستی نقش کاربر این مرحله را حل کرد.

### تکمیل comment API

route ایجاد و resolve comment وجود دارد، اما list comment، pagination، فیلتر status، کنترل تغییر body و ثبت audit دقیق باید اضافه شود. resolve نباید فقط status را تغییر دهد؛ باید actor، زمان، وضعیت قبلی و وضعیت جدید را نیز ثبت کند.

### تکمیل activity و request tracing

تمام routeهای مقاله باید `request_id` را از header یا plugin Fastify دریافت کنند و در `activity_events.request_id` بنویسند. eventهای لازم عبارت‌اند از `article.created`، `article.updated`، `article.workflow.*`، `article.comment.created` و `article.comment.resolved`.

### تست‌های ضروری

حداقل تست‌های مرحلهٔ اول باید شامل ایجاد مقاله توسط author، جلوگیری از دیدن مقالهٔ مالک دیگر، ارسال draft به review، رد انتقال `draft -> published`، approve فقط توسط editor/admin، جلوگیری از resolve comment توسط کاربر بی‌ربط، ثبت هم‌زمان workflow با row lock و ثبت event در transaction باشد.

نمونهٔ درخواست انتقال:

```http
POST /api/v1/articles/{articleId}/workflow
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "action": "submit_for_review",
  "note": "نسخهٔ اولیه برای بررسی ارسال شد"
}
```

نمونهٔ پاسخ موفق:

```json
{
  "ok": true,
  "transition": {
    "articleId": "…",
    "fromStatus": "draft",
    "toStatus": "in_review",
    "eventId": "…",
    "actorId": "…"
  }
}
```

## معیار خروج مرحلهٔ اول

مرحلهٔ اول زمانی تکمیل‌شده محسوب می‌شود که endpointهای CRUD مقاله، workflow، comment و activity با auth مستقل کار کنند؛ ماتریس نقش‌ها در backend و frontend یکسان باشد؛ eventهای workflow و comment با transaction ثبت شوند؛ تست‌های منفی RBAC وجود داشته باشند؛ و migration schema روی PostgreSQL staging با موفقیت و بدون Supabase اجرا شود.
