-- 20260813000000_live_complete_presentation.sql
-- تکمیل زیرساخت پخش زنده: اتصال فایل ارائه (PDF / تصویر / PPTX) به جلسه + نمایه‌سازی

-- 1) اتصال فایل ارائهٔ آپلودشده (از درایو رسانه) به جلسه زنده
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS presentation_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_live_sessions_presentation_media
  ON public.live_sessions (presentation_media_id)
  WHERE presentation_media_id IS NOT NULL;

-- 2) گسترش نوع رسانه برای فایل‌های ارائه (PPT / PPTX)
--    (در صورت اعمال نشدن این مهاجرت، فرانت‌اند به‌صورت خودکار با نوع «pdf» سازگار می‌شود)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'media_type_check' AND conrelid = 'public.media'::regclass
  ) THEN
    ALTER TABLE public.media DROP CONSTRAINT media_type_check;
  END IF;
END $$;

ALTER TABLE public.media
  ADD CONSTRAINT media_type_check
  CHECK (type IN ('image', 'video', 'audio', 'pdf', 'link', 'document'));

-- 3) ترجمه‌های جدید رابط کاربری پخش زنده
INSERT INTO public.translations (key, en, fa) VALUES
  ('live.e2ee.key', 'Encryption key', 'کلید رمزنگاری'),
  ('live.e2ee.passphrase', 'E2EE passphrase', 'عبارت عبور رمزنگاری'),
  ('live.upload.presentation', 'Upload presentation', 'آپلود فایل ارائه'),
  ('live.sync.note', 'Slides sync over encrypted LiveKit data channel', 'همگام‌سازی اسلایدها از طریق کانال دادهٔ رمزشدهٔ LiveKit')
ON CONFLICT (key) DO UPDATE SET en = EXCLUDED.en, fa = EXCLUDED.fa;
