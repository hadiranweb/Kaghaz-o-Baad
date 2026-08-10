-- 20260809170000_storage_quota_trigger_and_policies.sql
-- اولویت ۱: ایجاد تریگر خودکار دیتابیس برای محاسبه سهمیه ۱۵ گیگابایتی (user_storage)
-- و تکمیل سیاست‌های RLS باکت Storage برای رسانه‌های اشتراکی (shared) و ویرایشگران (editor/admin)

-- 1. تابع کمکی استخراج شناسه مالک فایل (از owner_id یا profile.id در created_by)
CREATE OR REPLACE FUNCTION public.get_media_owner_id(_owner_id UUID, _created_by UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    _owner_id,
    (SELECT user_id FROM public.profiles WHERE id = _created_by)
  );
$$;

-- 2. تابع تریگر محاسبه خودکار حجم سهمیه (user_storage) هنگام هر تغییر در جدول media
CREATE OR REPLACE FUNCTION public.handle_media_storage_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_owner UUID;
  v_new_owner UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_old_owner := public.get_media_owner_id(OLD.owner_id, OLD.created_by);
    IF v_old_owner IS NOT NULL THEN
      PERFORM public.recalculate_user_storage(v_old_owner);
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'INSERT') THEN
    v_new_owner := public.get_media_owner_id(NEW.owner_id, NEW.created_by);
    IF v_new_owner IS NOT NULL THEN
      PERFORM public.recalculate_user_storage(v_new_owner);
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_owner := public.get_media_owner_id(OLD.owner_id, OLD.created_by);
    v_new_owner := public.get_media_owner_id(NEW.owner_id, NEW.created_by);
    
    IF v_old_owner IS NOT NULL AND v_old_owner IS DISTINCT FROM v_new_owner THEN
      PERFORM public.recalculate_user_storage(v_old_owner);
    END IF;
    IF v_new_owner IS NOT NULL THEN
      PERFORM public.recalculate_user_storage(v_new_owner);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. ایجاد تریگر روی جدول media
DROP TRIGGER IF EXISTS tr_media_storage_quota ON public.media;
CREATE TRIGGER tr_media_storage_quota
  AFTER INSERT OR UPDATE OF file_size, owner_id, created_by OR DELETE
  ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_media_storage_quota();

-- 4. تکمیل و استانداردسازی سیاست‌های RLS برای باکت 'media' در storage.objects

-- READ: مالک پوشه یا رسانه عمومی یا رسانه اشتراکی با کاربر یا نقش‌های editor/admin
DROP POLICY IF EXISTS "Users can read own or public media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read accessible media files" ON storage.objects;
CREATE POLICY "Users can read accessible media files" ON storage.objects FOR SELECT USING (
  bucket_id = 'media' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.media
      WHERE (
        media.src_url LIKE '%' || storage.objects.name || '%'
        OR storage.objects.name LIKE '%' || media.src_url || '%'
      )
      AND (
        media.visibility = 'public'
        OR (media.visibility = 'shared' AND auth.uid() = ANY(media.shared_with))
        OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
      )
    )
  )
);

-- UPDATE: مالک پوشه یا ادمین
DROP POLICY IF EXISTS "Users can update own media files" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can update media files" ON storage.objects;
CREATE POLICY "Owners and admins can update media files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'media' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- DELETE: مالک پوشه یا ادمین
DROP POLICY IF EXISTS "Users can delete own media files" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can delete media files" ON storage.objects;
CREATE POLICY "Owners and admins can delete media files" ON storage.objects FOR DELETE USING (
  bucket_id = 'media' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 5. توابع امن اشتراک‌گذاری فایل بر اساس ایمیل (بدون افشای جدول auth.users)
CREATE OR REPLACE FUNCTION public.share_media_with_email(p_media_id UUID, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_created_by UUID;
  v_target_user_id UUID;
  v_current_shared UUID[];
BEGIN
  -- بررسی مالکیت رسانه
  SELECT owner_id, created_by, shared_with 
    INTO v_owner, v_created_by, v_current_shared
    FROM public.media
    WHERE id = p_media_id;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Media not found');
  END IF;

  IF NOT (
    v_owner = auth.uid()
    OR v_created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied');
  END IF;

  -- یافتن شناسه کاربر بر اساس ایمیل در auth.users
  SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email))
    LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'کاربری با این ایمیل یافت نشد | User not found with this email');
  END IF;

  -- افزودن به آرایه shared_with
  UPDATE public.media
    SET 
      visibility = 'shared',
      shared_with = (
        SELECT ARRAY(
          SELECT DISTINCT e FROM unnest(COALESCE(v_current_shared, '{}'::uuid[]) || ARRAY[v_target_user_id]) AS e
        )
      )
    WHERE id = p_media_id;

  RETURN jsonb_build_object('ok', true, 'user_id', v_target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.unshare_media_user(p_media_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_created_by UUID;
BEGIN
  SELECT owner_id, created_by 
    INTO v_owner, v_created_by
    FROM public.media
    WHERE id = p_media_id;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Media not found');
  END IF;

  IF NOT (
    v_owner = auth.uid()
    OR v_created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['editor', 'admin']::app_role[])
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.media
    SET shared_with = array_remove(COALESCE(shared_with, '{}'::uuid[]), p_user_id)
    WHERE id = p_media_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 6. محاسبه مجدد سهمیه برای تمامی کاربران دارای رسانه در دیتابیس فعلی
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT public.get_media_owner_id(owner_id, created_by) AS uid 
    FROM public.media 
    WHERE owner_id IS NOT NULL OR created_by IS NOT NULL
  LOOP
    IF r.uid IS NOT NULL THEN
      PERFORM public.recalculate_user_storage(r.uid);
    END IF;
  END LOOP;
END;
$$;
