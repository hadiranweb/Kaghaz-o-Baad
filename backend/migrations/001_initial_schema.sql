CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('author', 'contributor', 'editor', 'admin');
CREATE TYPE article_status AS ENUM (
  'draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'archived'
);
CREATE TYPE comment_source AS ENUM ('human', 'ai');
CREATE TYPE comment_status AS ENUM ('open', 'accepted', 'rejected', 'resolved');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE role_catalog (
  role_key TEXT PRIMARY KEY,
  label_fa TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO role_catalog (role_key, label_fa, label_en, description) VALUES
  ('senior_manager', 'مدیر ارشد', 'Senior manager', 'مدیریت راهبردی و تصمیم‌های سطح بالا'),
  ('technical_manager', 'مدیر فنی', 'Technical manager', 'مدیریت فنی، زیرساخت و انتشار'),
  ('secretary', 'منشی', 'Secretary', 'مدیریت امور اداری و هماهنگی'),
  ('procurement_agent', 'کارپرداز', 'Procurement agent', 'پیگیری خرید و امور تدارکاتی')
ON CONFLICT (role_key) DO NOTHING;

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title_fa TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  content_fa TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  status article_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE article_workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_status article_status NOT NULL,
  to_status article_status NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source comment_source NOT NULL DEFAULT 'human',
  status comment_status NOT NULL DEFAULT 'open',
  body TEXT NOT NULL,
  suggested_text TEXT,
  anchor JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  request_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_active_idx ON sessions (user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX article_workflow_events_article_idx ON article_workflow_events (article_id, created_at DESC);
CREATE INDEX article_comments_article_idx ON article_comments (article_id, created_at DESC);
CREATE INDEX activity_events_user_idx ON activity_events (user_id, created_at DESC);
CREATE INDEX articles_status_idx ON articles (status, updated_at DESC);
