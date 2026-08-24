-- 019_sync_role_catalog.sql
-- Synchronizes role_catalog with the full canonical set of system roles and translations.

INSERT INTO role_catalog (role_key, label_fa, label_en, description, is_system_role) VALUES
  ('admin', 'مدیر کل', 'System Administrator', 'دسترسی کامل مدیریتی و نظارتی بر کل سامانه', TRUE),
  ('senior_manager', 'مدیر ارشد', 'Senior Manager', 'مدیریت راهبردی، تصمیم‌های سطح بالا و نظارت بر انتشار', TRUE),
  ('technical_manager', 'مدیر فنی', 'Technical Manager', 'مدیریت فنی، زیرساخت، ثبات سیستم و انتشار', TRUE),
  ('editor', 'سردبیر', 'Editor', 'بررسی، ویرایش، تأیید، زمان‌بندی و انتشار مقالات و محتوا', TRUE),
  ('author', 'نویسنده', 'Author', 'نگارش مقالات، مدیریت پیش‌نویس‌ها و ارسال به فرآیند بازبینی', TRUE),
  ('contributor', 'همکار محتوا', 'Contributor', 'مشارکت در تولید محتوا و ارسال پیش‌نویس‌ها', TRUE),
  ('secretary', 'منشی', 'Secretary', 'مدیریت امور اداری، هماهنگی و نامه‌نگاری‌ها', TRUE),
  ('procurement_agent', 'کارپرداز', 'Procurement Agent', 'پیگیری خرید، امور تدارکاتی و پشتیبانی لجستیک', TRUE)
ON CONFLICT (role_key) DO UPDATE SET
  label_fa = EXCLUDED.label_fa,
  label_en = EXCLUDED.label_en,
  description = EXCLUDED.description,
  is_system_role = EXCLUDED.is_system_role;
