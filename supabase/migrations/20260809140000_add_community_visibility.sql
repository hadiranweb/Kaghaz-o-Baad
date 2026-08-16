-- معرفی تعامل‌کنندگان — کلید نمایش عمومی
-- یک کلید برای نمایش تصویر و نام در کارت‌ها + حضور در مدار بی‌نهایت صفحه‌ی جامعه

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_on_cards BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_in_community BOOLEAN NOT NULL DEFAULT false;

-- برای سازگاری، یک کلید واحد هم اضافه می‌کنیم که هر دو را کنترل کند (اگر یکی فعال باشد کافی است)
-- اما برای سادگی، هر دو ستون جدا نگه می‌داریم تا ادمین بتواند تفکیک کند

-- به‌روزرسانی ویو عمومی: فقط پروفایل‌هایی که حداقل یکی از کلیدها را فعال کرده‌اند، قابل دیدن باشند
-- ویو فعلی public_profiles ستون‌های جدید را خودکار نشان نمی‌دهد، بازسازی می‌کنیم
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
  SELECT
    id,
    user_id,
    first_name,
    last_name,
    COALESCE(NULLIF(display_name, ''), TRIM(first_name || ' ' || last_name)) AS display_name,
    avatar_url,
    bio_en,
    bio_fa,
    socials,
    show_on_cards,
    show_in_community
  FROM public.profiles
  WHERE show_on_cards = true OR show_in_community = true;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- شاخص برای اسکرول بی‌نهایت
CREATE INDEX IF NOT EXISTS idx_profiles_community_visible ON public.profiles (show_in_community) WHERE show_in_community = true;
CREATE INDEX IF NOT EXISTS idx_profiles_cards_visible ON public.profiles (show_on_cards) WHERE show_on_cards = true;

-- تکمیل پروفایل‌هایی که نام نمایشی ندارند
UPDATE public.profiles
SET display_name = TRIM(first_name || ' ' || last_name)
WHERE display_name IS NULL OR display_name = '';
