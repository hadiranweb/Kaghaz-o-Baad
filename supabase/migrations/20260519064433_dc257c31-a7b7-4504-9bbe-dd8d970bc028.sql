
CREATE TABLE public.project_description (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  body_en TEXT NOT NULL DEFAULT '',
  body_fa TEXT NOT NULL DEFAULT '',
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_description ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project description viewable by all"
  ON public.project_description FOR SELECT USING (true);

CREATE POLICY "Admins can insert project description"
  ON public.project_description FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update project description"
  ON public.project_description FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete project description"
  ON public.project_description FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_project_description_updated_at
  BEFORE UPDATE ON public.project_description
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.project_description (section_key, order_num, title_en, title_fa, body_en, body_fa) VALUES
('purpose', 1, 'Application Purpose', 'هدف اپلیکیشن',
'KaghazBaad (Paper and Wind) is a bilingual EN/FA academic publishing platform. Paper symbolizes data; Wind symbolizes the living environment carrying it. The app hosts long-form scholarly articles with two reading modes: traditional text and an interactive slide-based experience.',
'کاغذ و باد یک پلتفرم انتشار آکادمیک دوزبانه (انگلیسی/فارسی) است. کاغذ نماد داده و باد نماد محیط زنده‌ای است که داده‌ها را حمل می‌کند. این اپلیکیشن میزبان مقالات علمی بلند با دو حالت مطالعه است: متن سنتی و تجربه اسلایدمحور تعاملی.'),
('audience', 2, 'Target Users', 'کاربران هدف',
'- Researchers and academics in psychology and cognitive sciences\n- Graduate students seeking curated scholarly content\n- Bilingual readers (EN/FA) interested in long-form academic writing\n- Invited authors publishing on the platform',
'- پژوهشگران و دانشگاهیان حوزه روانشناسی و علوم شناختی\n- دانشجویان تحصیلات تکمیلی به دنبال محتوای علمی منتخب\n- خوانندگان دوزبانه (EN/FA) علاقه‌مند به نوشتار آکادمیک بلند\n- نویسندگان دعوت‌شده برای انتشار در پلتفرم'),
('scope', 3, 'Project Scope', 'دامنه پروژه',
'Focused on time-bound academic work in the owner''s field of expertise (psychology and cognitive science). Intentionally a curated community, not a general blogging or social platform. Media (audio/video) is planned but currently Coming Soon.',
'تمرکز بر آثار آکادمیک محدود به زمان در حوزه تخصصی صاحب اثر (روانشناسی و علوم شناختی). عمداً یک جامعه منتخب است، نه پلتفرم وبلاگ یا شبکه اجتماعی عمومی. پشتیبانی از رسانه (صوت/ویدئو) برنامه‌ریزی شده ولی فعلاً «به‌زودی» است.'),
('architecture', 4, 'Technical Architecture', 'معماری فنی',
'Frontend: React 18, Vite 5, TypeScript, Tailwind v3, shadcn/ui.\nBackend: Supabase Cloud (Supabase) — Postgres, Auth, Edge Functions.\nAI: AI Gateway (Google Gemini) for search suggestions.\nSMS: SMS.ir Bulk API for OTP delivery.\nRouting: React Router v6 (SPA).\nState: TanStack Query + React Context (Auth, Language).',
'فرانت‌اند: React 18، Vite 5، TypeScript، Tailwind v3، shadcn/ui.\nبک‌اند: Supabase Cloud (Supabase) — Postgres، احراز هویت، Edge Functions.\nهوش مصنوعی: AI Gateway (Google Gemini) برای پیشنهاد جستجو.\nپیامک: SMS.ir Bulk API برای ارسال OTP.\nمسیریابی: React Router v6 (SPA).\nState: TanStack Query + React Context (احراز هویت، زبان).'),
('schema', 5, 'Database Schema', 'طرحواره پایگاه داده',
'Main tables:\n- articles (bilingual title, slug, status, categories, tags, author)\n- slides (order, body EN/FA, media URLs, tied to article)\n- comments (user comments on published articles)\n- profiles (first_name, last_name, phone, bio, avatar, socials)\n- public_profiles (safe public view without phone)\n- user_roles (admin/user roles in a separate table to prevent privilege escalation)\n- media (type, src_url, tags)\n- persons (team/contributor cards)\n- otp_codes (server-only OTP storage)\n- translations (UI strings: key, en, fa)\n- social_links (footer/site-wide links)\n- project_description (this page''s editable content)',
'جداول اصلی:\n- articles (عنوان دوزبانه، slug، وضعیت، دسته‌ها، تگ‌ها، نویسنده)\n- slides (ترتیب، متن EN/FA، رسانه، متصل به مقاله)\n- comments (نظرات کاربران روی مقالات منتشرشده)\n- profiles (نام، نام‌خانوادگی، تلفن، بیو، آواتار، شبکه‌ها)\n- public_profiles (ویو عمومی امن بدون تلفن)\n- user_roles (نقش‌های ادمین/کاربر در جدول جدا برای جلوگیری از ارتقای امتیاز)\n- media (نوع، آدرس منبع، تگ)\n- persons (کارت‌های تیم/همکار)\n- otp_codes (ذخیره OTP فقط در سرور)\n- translations (رشته‌های UI: کلید، انگلیسی، فارسی)\n- social_links (لینک‌های فوتر/سایت)\n- project_description (محتوای قابل ویرایش همین صفحه)'),
('apis', 6, 'APIs and Edge Functions', 'APIها و Edge Functions',
'Edge Functions (supabase/functions/):\n- send-otp: generates a 6-digit OTP, stores it in otp_codes, sends via SMS.ir or email.\n- verify-otp: validates the OTP, signs the user in via rotated temp password, enforces 2FA.\n- search-suggest: public endpoint calling AI Gateway (Gemini Flash) to return 4 short, relevant search suggestions.\n\nAll client CRUD uses @/integrations/supabase/client with RLS-enforced access.',
'Edge Functions (supabase/functions/):\n- send-otp: یک کد ۶ رقمی می‌سازد، در otp_codes ذخیره و از طریق SMS.ir یا ایمیل می‌فرستد.\n- verify-otp: کد را اعتبارسنجی و کاربر را با رمز موقت چرخان وارد می‌کند و 2FA را اجبار می‌کند.\n- search-suggest: endpoint عمومی که AI Gateway (Gemini Flash) را برای ۴ پیشنهاد جستجوی کوتاه و مرتبط فراخوانی می‌کند.\n\nهمه CRUD کلاینت از @/integrations/supabase/client با دسترسی محافظت‌شده توسط RLS استفاده می‌کند.'),
('rules', 7, 'Project Rules', 'قوانین پروژه',
'- RLS is enforced on every table; admin operations use has_role(uid, ''admin'').\n- Roles live in a separate user_roles table (never on profiles).\n- Passwordless OTP only (Email/SMS); second-method verification required for sensitive actions.\n- No anonymous sign-ups. No auto-confirm.\n- Bilingual EN/FA with RTL for Persian. No machine auto-translation of missing content.\n- Visual: pitch-black iOS dark theme, 24px glassmorphism, 16px rounded, SF-Pro-style typography.\n- Homepage is symmetrical and Google-like with the brain logo.\n- All AI calls go through edge functions; never call LLMs directly from the client.',
'- RLS روی همه جداول اجبار شده؛ عملیات ادمین از has_role(uid, ''admin'') استفاده می‌کند.\n- نقش‌ها در جدول جدای user_roles ذخیره می‌شوند (هرگز روی profiles).\n- فقط OTP بدون رمز (ایمیل/پیامک)؛ تایید با روش دوم برای اقدامات حساس الزامی است.\n- ثبت‌نام ناشناس ممنوع. تایید خودکار ممنوع.\n- دوزبانه EN/FA با RTL برای فارسی. هیچ ترجمه ماشینی خودکار برای محتوای ناقص.\n- ظاهر: تم تاریک iOS مشکی مطلق، گلسمورفیسم 24px، گردی 16px، تایپوگرافی SF Pro.\n- صفحه اصلی متقارن و Google-like با لوگوی مغز.\n- همه فراخوانی‌های AI از edge functions می‌گذرند؛ هرگز مستقیم از کلاینت LLM فراخوانی نشود.'),
('limits', 8, 'Limitations and Accepted Risks', 'محدودیت‌ها و ریسک‌های پذیرفته‌شده',
'- No backend rate limiting on edge functions yet (platform gap).\n- search-suggest is intentionally public/unauthenticated.\n- Admin UI gating is client-side only (UX); server-side enforcement is via RLS + has_role.\n- otp_codes has RLS enabled with no policies (correctly denies all client access).\n- public_profiles view uses security_invoker=off by design to hide phone numbers.\n- Storage buckets are not yet configured.',
'- هنوز محدودیت نرخ بک‌اند روی edge functions وجود ندارد (شکاف پلتفرم).\n- search-suggest عمداً عمومی و بدون احراز هویت است.\n- محدودسازی UI ادمین فقط در کلاینت است (UX)؛ اجرای سرور از طریق RLS + has_role.\n- otp_codes با RLS فعال و بدون policy است (به‌درستی دسترسی کلاینت را رد می‌کند).\n- ویو public_profiles عمداً security_invoker=off است تا شماره تلفن مخفی بماند.\n- باکت‌های Storage هنوز تنظیم نشده‌اند.');
