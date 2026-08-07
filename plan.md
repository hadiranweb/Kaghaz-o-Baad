# ماژول جلسات زنده — LiveKit Cloud

پلتفرم: **LiveKit Cloud** (با امکان مهاجرت بعدی به self-host بدون تغییر کد). صدا/تصویر هرگز از Supabase عبور نمی‌کند؛ Supabase فقط Auth/DB/Edge Functions است.

## ۱) رازها (Secrets)
نیاز به اضافه کردن سه راز در Lovable Cloud:
- `LIVEKIT_URL` (مثل `wss://xxx.livekit.cloud`)
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

این‌ها فقط در Edge Function استفاده می‌شوند؛ هرگز در کلاینت expose نمی‌شوند.

## ۲) دیتابیس (تکمیل migration قبلی)
جداول `live_sessions` و `live_participants` در migration قبلی ساخته شدند. نیازی به migration جدید نیست. ساختار موجود:
- `live_sessions`: host_user_id, room_name (unique), title_en/fa, description_en/fa, status (scheduled/live/ended/cancelled), scheduled_at, started_at, ended_at, max_participants, recording_enabled, recording_url, article_id
- `live_participants`: session_id, user_id, role (host/speaker/viewer), joined_at, left_at
- RLS: نمایش عمومی نشست‌ها، ایجاد توسط کاربر لاگین، ویرایش/حذف توسط host یا admin

## ۳) Edge Functions
### `supabase/functions/livekit-token/index.ts`
- ورودی: `{ room_name, participant_name }` با هدر Authorization
- احراز هویت کاربر با `getClaims()`
- بررسی session فعال در `live_sessions`
- تعیین role: اگر `host_user_id === user.id` → host، در غیر این‌صورت viewer
- ساخت JWT با `livekit-server-sdk` (npm:) شامل grants مناسب:
  - host: canPublish + canSubscribe + roomAdmin + roomRecord
  - viewer: فقط canSubscribe + canPublishData (برای چت)
- ثبت در `live_participants` (upsert)
- خروجی: `{ token, livekit_url, role, session_id }`
- CORS کامل، اعتبارسنجی ورودی با Zod
- `verify_jwt = false` در config.toml چون در کد بررسی می‌کنیم

### `supabase/functions/livekit-webhook/index.ts` (اختیاری/فاز ۲)
- دریافت webhook از LiveKit (room_started, room_finished, participant_joined/left)
- بررسی امضای webhook با API secret
- آپدیت `status`, `started_at`, `ended_at` در `live_sessions`
- بستن `left_at` در `live_participants`
- `verify_jwt = false`

## ۴) Frontend
### Dependencies جدید
- `@livekit/components-react`
- `@livekit/components-styles`
- `livekit-client`

### `src/hooks/useLiveKitToken.ts`
Hook برای دریافت توکن از Edge Function با `supabase.functions.invoke()`.

### `src/components/live/LiveRoom.tsx`
- لابی pre-join با دکمه "ورود به جلسه" (تم glassmorphism مشکی پروژه)
- پس از join: `<LiveKitRoom>` با `<RoomAudioRenderer>`، `<GridLayout>` با `<ParticipantTile>`، `<ControlBar>` (mic/camera/screenshare/leave)
- نشانگر LIVE قرمز با پالس
- badge "Host" برای میزبان
- استایل کاملاً منطبق با design tokens پروژه (هیچ کلاس رنگی direct، فقط semantic)

### `src/pages/LiveSessions.tsx` (در `/live`)
- لیست جلسات (status: scheduled یا live)
- فیلتر دوزبانه EN/FA با RTL
- کارت‌های glassmorphism با عنوان، زمان (date-fns + locale fa)، badge "در حال پخش"
- دکمه "ورود" فقط برای جلسات live
- refetchInterval هر ۳۰ ثانیه
- وقتی کاربر روی ورود می‌زند → render `<LiveRoom>`

### `src/pages/LiveSessionForm.tsx` (در `/dashboard/live/new`)
- فرم ایجاد جلسه برای کاربر لاگین کرده (نویسنده مقاله)
- فیلدها: عنوان EN/FA، توضیح EN/FA، زمان، مقاله مرتبط (اختیاری)، max_participants
- خودکار `room_name = nanoid()`
- پس از ساخت → redirect به جلسه

### مدیریت در داشبورد
- در `Dashboard.tsx` تب "جلسات من" با لیست `live_sessions` ساخته‌شده توسط کاربر، دکمه‌های شروع/پایان/حذف
- در `AdminDashboard.tsx` تب "همه جلسات" برای admin

## ۵) Routing و Navigation
- App.tsx: route جدید `/live` و `/live/new`
- Header.tsx: لینک "جلسات زنده" / "Live Sessions" به منوی navigation
- Translation keys: `nav.live`, `live.join`, `live.host`, `live.scheduled`, ...

## ۶) فاز‌بندی
1. **فاز ۱ (همین حالا):** Secretها + Edge Function token + LiveRoom + صفحه `/live` + فرم ایجاد جلسه + لینک Header
2. **فاز ۲ (بعد):** webhook، ضبط، یادآور قبل از جلسه، پنل چت کنار ویدئو، simulcast/dynacast tuning

## نکات فنی
- استفاده از `npm:livekit-server-sdk@2` (نه esm.sh) برای پایداری
- `getClaims()` به‌جای `getUser()` در edge function برای سرعت
- بدون قرار دادن `LIVEKIT_API_SECRET` در `VITE_` ها
- روی موبایل: درخواست permission میکروفون/دوربین فقط پس از کلیک Join
- `prejoin` با `LiveKitRoom`'s `connect={true}` بعد از دریافت توکن
