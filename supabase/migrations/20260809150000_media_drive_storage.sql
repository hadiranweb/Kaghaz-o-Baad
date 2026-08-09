-- چندرسانه‌ای — 드라이व شخصی ۱۵ گیگ + اشتراک‌گذاری
-- 4 نوع رسانه: image, video, audio, pdf

-- 1) افزودن ستون‌های اشتراک و حجم به media
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public','shared'));
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
-- owner_id برای محاسبه سهمیه شخصی (جدا از profiles.id)
-- اگر created_by خالی بود، از owner_id استفاده می‌شود

-- سازگاری: owner_id را از created_by پر کن (profile.id -> auth.users.id از طریق profiles)
UPDATE public.media SET owner_id = (
  SELECT user_id FROM public.profiles WHERE profiles.id = media.created_by
) WHERE owner_id IS NULL AND created_by IS NOT NULL;

-- 2) جدول سهمیه شخصی (مانند Google Drive — 15GB)
CREATE TABLE IF NOT EXISTS public.user_storage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  used_bytes BIGINT NOT NULL DEFAULT 0,
  quota_bytes BIGINT NOT NULL DEFAULT 16106127360, -- 15 * 1024^3
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own storage" ON public.user_storage;
CREATE POLICY "Users view own storage" ON public.user_storage FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own storage" ON public.user_storage;
CREATE POLICY "Users update own storage" ON public.user_storage FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own storage" ON public.user_storage;
CREATE POLICY "Users insert own storage" ON public.user_storage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3) به‌روزرسانی RLS مدیا برای اشتراک‌گذاری
DROP POLICY IF EXISTS "Media viewable by all" ON public.media;
CREATE POLICY "Media viewable by owner or public or shared" ON public.media FOR SELECT USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR (visibility = 'shared' AND auth.uid() = ANY(shared_with))
);

DROP POLICY IF EXISTS "Authenticated users can upload media" ON public.media;
CREATE POLICY "Authenticated can insert own media" ON public.media FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (owner_id = auth.uid() OR created_by IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can update own media" ON public.media;
CREATE POLICY "Owners can update own media" ON public.media FOR UPDATE USING (
  owner_id = auth.uid() OR created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users and admins can delete media" ON public.media;
CREATE POLICY "Owners and admins can delete media" ON public.media FOR DELETE USING (
  owner_id = auth.uid()
  OR created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 4) تابع محاسبه حجم استفاده‌شده
CREATE OR REPLACE FUNCTION public.recalculate_user_storage(p_user_id UUID)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total BIGINT;
BEGIN
  SELECT COALESCE(SUM(file_size),0) INTO v_total FROM public.media WHERE owner_id = p_user_id OR created_by = (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  INSERT INTO public.user_storage (user_id, used_bytes) VALUES (p_user_id, v_total)
  ON CONFLICT (user_id) DO UPDATE SET used_bytes = v_total, updated_at = now();
  RETURN v_total;
END;
$$;

-- 5) باکت ذخیره‌سازی (اگر از داشبورد ساخته نشده باشد، از طریق storage.buckets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', false, 16106127360, NULL)
ON CONFLICT (id) DO NOTHING;

-- پالیسی‌های storage
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "Users can read own or public media files" ON storage.objects;
CREATE POLICY "Users can read own or public media files" ON storage.objects FOR SELECT USING (
  bucket_id = 'media' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM public.media WHERE media.src_url LIKE '%' || storage.objects.name || '%' AND media.visibility = 'public')
  )
);
DROP POLICY IF EXISTS "Users can delete own media files" ON storage.objects;
CREATE POLICY "Users can delete own media files" ON storage.objects FOR DELETE USING (
  bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6) ترجمه فارسی صحیح
INSERT INTO public.translations (key, en, fa) VALUES ('nav.media', 'Media', 'چندرسانه‌ای')
ON CONFLICT (key) DO UPDATE SET en = EXCLUDED.en, fa = EXCLUDED.fa;
