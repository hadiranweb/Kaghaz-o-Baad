-- 20260809160000_fix_rbac.sql
-- تثبیت ساختار نقش‌ها و دسترسی‌ها (RBAC Matrix)
-- ۴ نقش رسمی (admin, editor, contributor, user) + ۳ نقش زنده (host, speaker, viewer) + ۱ مهمان (guest)

-- 1. تثبیت enum و اضافه کردن user در صورت عدم وجود
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

-- 2. توابع کمکی بررسی نقش (Security Definer) برای جلوگیری از بازگشت RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- 3. ماتریس RLS واحد (به جای پراکندگی)

-- ARTICLES
DROP POLICY IF EXISTS "Published articles viewable by all" ON public.articles;
DROP POLICY IF EXISTS "Articles viewable by role" ON public.articles;
CREATE POLICY "Articles viewable by role" ON public.articles FOR SELECT USING (
  status = 'published'
  OR auth.uid() = author_id
  OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
);

DROP POLICY IF EXISTS "Authors can create articles" ON public.articles;
DROP POLICY IF EXISTS "Contributors and above can create articles" ON public.articles;
CREATE POLICY "Contributors and above can create articles" ON public.articles FOR INSERT WITH CHECK (
  (auth.uid() = author_id AND public.has_any_role(auth.uid(), ARRAY['contributor', 'editor', 'admin']::app_role[]))
  OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
);

DROP POLICY IF EXISTS "Authors can update own articles" ON public.articles;
DROP POLICY IF EXISTS "Authors and editors can update articles" ON public.articles;
CREATE POLICY "Authors and editors can update articles" ON public.articles FOR UPDATE USING (
  auth.uid() = author_id
  OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
);

DROP POLICY IF EXISTS "Authors can delete own articles" ON public.articles;
DROP POLICY IF EXISTS "Authors and admins can delete articles" ON public.articles;
CREATE POLICY "Authors and admins can delete articles" ON public.articles FOR DELETE USING (
  auth.uid() = author_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- SLIDES
DROP POLICY IF EXISTS "Slides viewable with published articles" ON public.slides;
DROP POLICY IF EXISTS "Slides viewable by role" ON public.slides;
CREATE POLICY "Slides viewable by role" ON public.slides FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.articles
    WHERE articles.id = slides.article_id
    AND (
      articles.status = 'published'
      OR articles.author_id = auth.uid()
      OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
    )
  )
);

DROP POLICY IF EXISTS "Authors can manage slides" ON public.slides;
DROP POLICY IF EXISTS "Authors and editors can manage slides" ON public.slides;
CREATE POLICY "Authors and editors can manage slides" ON public.slides FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.articles
    WHERE articles.id = slides.article_id
    AND (
      articles.author_id = auth.uid()
      OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
    )
  )
);

-- MEDIA
DROP POLICY IF EXISTS "Media viewable by owner or public or shared" ON public.media;
DROP POLICY IF EXISTS "Media viewable by role" ON public.media;
CREATE POLICY "Media viewable by role" ON public.media FOR SELECT USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR (visibility = 'shared' AND auth.uid() = ANY(shared_with))
  OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
);

DROP POLICY IF EXISTS "Authenticated can insert own media" ON public.media;
DROP POLICY IF EXISTS "Users and above can insert own media" ON public.media;
CREATE POLICY "Users and above can insert own media" ON public.media FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    owner_id = auth.uid()
    OR created_by IS NOT NULL
    OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
  )
);

DROP POLICY IF EXISTS "Owners can update own media" ON public.media;
DROP POLICY IF EXISTS "Owners and editors can update media" ON public.media;
CREATE POLICY "Owners and editors can update media" ON public.media FOR UPDATE USING (
  owner_id = auth.uid()
  OR created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
);

DROP POLICY IF EXISTS "Owners and admins can delete media" ON public.media;
CREATE POLICY "Owners and admins can delete media" ON public.media FOR DELETE USING (
  owner_id = auth.uid()
  OR created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- USER_STORAGE
DROP POLICY IF EXISTS "Users view own storage" ON public.user_storage;
DROP POLICY IF EXISTS "Users view own storage or admin view all" ON public.user_storage;
CREATE POLICY "Users view own storage or admin view all" ON public.user_storage FOR SELECT USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- PERSONS
DROP POLICY IF EXISTS "Contributors and above can insert persons" ON public.persons;
CREATE POLICY "Contributors and above can insert persons" ON public.persons FOR INSERT WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['contributor', 'editor', 'admin']::app_role[])
);

DROP POLICY IF EXISTS "Contributors and above can update persons" ON public.persons;
CREATE POLICY "Contributors and above can update persons" ON public.persons FOR UPDATE USING (
  public.has_any_role(auth.uid(), ARRAY['contributor', 'editor', 'admin']::app_role[])
);

DROP POLICY IF EXISTS "Editors and admins can delete persons" ON public.persons;
CREATE POLICY "Editors and admins can delete persons" ON public.persons FOR DELETE USING (
  public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
);

-- USER_ROLES (مدیریت توسط ادمین)
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4. به‌روزرسانی محتوای project_description جهت هماهنگی با ۴ نقش رسمی
UPDATE public.project_description
SET 
  body_en = '- RLS is enforced on every table; admin operations use has_role(uid, ''admin'') or has_any_role().\n- Roles live in a separate user_roles table with 4 official roles: admin, editor, contributor, user (never on profiles).\n- Passwordless OTP only (Email/SMS); second-method verification required for sensitive actions.\n- No anonymous sign-ups. No auto-confirm.\n- Bilingual EN/FA with RTL for Persian. No machine auto-translation of missing content.\n- Visual: pitch-black iOS dark theme, 24px glassmorphism, 16px rounded, SF-Pro-style typography.\n- Homepage is symmetrical and Google-like with the brain logo.\n- All AI calls go through edge functions; never call LLMs directly from the client.',
  body_fa = '- RLS روی همه جداول اجبار شده؛ عملیات ادمین از has_role(uid, ''admin'') یا has_any_role() استفاده می‌کند.\n- نقش‌ها در جدول جدای user_roles با ۴ نقش رسمی ذخیره می‌شوند: admin, editor, contributor, user (هرگز روی profiles).\n- فقط OTP بدون رمز (ایمیل/پیامک)؛ تایید با روش دوم برای اقدامات حساس الزامی است.\n- ثبت‌نام ناشناس ممنوع. تایید خودکار ممنوع.\n- دوزبانه EN/FA با RTL برای فارسی. هیچ ترجمه ماشینی خودکار برای محتوای ناقص.\n- ظاهر: تم تاریک iOS مشکی مطلق، گلسمورفیسم 24px، گردی 16px، تایپوگرافی SF Pro.\n- صفحه اصلی متقارن و Google-like با لوگوی مغز.\n- همه فراخوانی‌های AI از edge functions می‌گذرند؛ هرگز مستقیم از کلاینت LLM فراخوانی نشود.'
WHERE section_key = 'rules';

-- 5. ایجاد حساب‌های تستی ۴ نقش (در صورت دسترسی به اسکیمای auth)
-- Admin: admin@kaghazbaad.test (TestAdmin@2026!)
-- Editor: editor@kaghazbaad.test (TestEditor@2026!)
-- Contributor: contributor@kaghazbaad.test (TestContributor@2026!)
-- User: user@kaghazbaad.test (TestUser@2026!)

CREATE OR REPLACE FUNCTION public.seed_test_users_if_possible()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := '00000000-0000-4000-8000-000000000001'::uuid;
  v_editor_id UUID := '00000000-0000-4000-8000-000000000002'::uuid;
  v_contrib_id UUID := '00000000-0000-4000-8000-000000000003'::uuid;
  v_user_id UUID := '00000000-0000-4000-8000-000000000004'::uuid;
BEGIN
  BEGIN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
    ) VALUES
    (
      v_admin_id, '00000000-0000-0000-0000-000000000000'::uuid, 'admin@kaghazbaad.test',
      crypt('TestAdmin@2026!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"مدیر","last_name":"تست (Admin)"}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
    ),
    (
      v_editor_id, '00000000-0000-0000-0000-000000000000'::uuid, 'editor@kaghazbaad.test',
      crypt('TestEditor@2026!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"ویراستار","last_name":"تست (Editor)"}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
    ),
    (
      v_contrib_id, '00000000-0000-0000-0000-000000000000'::uuid, 'contributor@kaghazbaad.test',
      crypt('TestContributor@2026!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"نویسنده","last_name":"تست (Contributor)"}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
    ),
    (
      v_user_id, '00000000-0000-0000-0000-000000000000'::uuid, 'user@kaghazbaad.test',
      crypt('TestUser@2026!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"کاربر","last_name":"عادی (User)"}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES
    (v_admin_id, v_admin_id, json_build_object('sub', v_admin_id::text, 'email', 'admin@kaghazbaad.test')::jsonb, 'email', v_admin_id::text, now(), now(), now()),
    (v_editor_id, v_editor_id, json_build_object('sub', v_editor_id::text, 'email', 'editor@kaghazbaad.test')::jsonb, 'email', v_editor_id::text, now(), now(), now()),
    (v_contrib_id, v_contrib_id, json_build_object('sub', v_contrib_id::text, 'email', 'contributor@kaghazbaad.test')::jsonb, 'email', v_contrib_id::text, now(), now(), now()),
    (v_user_id, v_user_id, json_build_object('sub', v_user_id::text, 'email', 'user@kaghazbaad.test')::jsonb, 'email', v_user_id::text, now(), now(), now())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Skipping direct auth.users insert: %', SQLERRM;
  END;

  INSERT INTO public.profiles (user_id, first_name, last_name, phone, show_on_cards, show_in_community)
  VALUES
    (v_admin_id, 'مدیر', 'تست (Admin)', '', true, true),
    (v_editor_id, 'ویراستار', 'تست (Editor)', '', true, true),
    (v_contrib_id, 'نویسنده', 'تست (Contributor)', '', true, true),
    (v_user_id, 'کاربر', 'عادی (User)', '', false, false)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (v_admin_id, 'admin'::app_role),
    (v_editor_id, 'editor'::app_role),
    (v_contrib_id, 'contributor'::app_role),
    (v_user_id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

SELECT public.seed_test_users_if_possible();
