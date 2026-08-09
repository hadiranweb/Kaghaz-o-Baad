# کاغذ و باد | KaghazBaad

پلتفرم دو زبانه (فارسی/انگلیسی) برای انتشار مقالات آکادمیک، نمایش اسلایدی، جلسات زنده صوتی/تصویری و مدیریت محتوا.

**نام پروژه:** `kaghazbaad`  
**دامنه:** kaghazbaad.ir (نمونه)  
**مخزن:** `hadiranweb/KaghazBaad`

## ✨ ویژگی‌ها

- 📖 **مقالات دو زبانه** — عنوان، چکیده و اسلایدها به فارسی و انگلیسی، با RLS و وضعیت draft/published
- 🎞️ **اسلایدهای مقاله** — هر مقاله مجموعه‌ای از اسلایدهای مرتب با متن و رسانه
- 🎙️ **جلسات زنده** — یکپارچه با LiveKit Cloud (صدا/تصویر)، توکن امن از Edge Function
- 🔐 **احراز هویت** — OTP ایمیل/پیامک (SMS.ir)، نقش‌های admin/editor/contributor/user
- 📝 **بازنویسی هوشمند** — Edge Function با مدل Gemini
- 🌗 **تم تیره iOS-Glass** — Tailwind + shadcn/ui، فونت Vazirmatn، RTL کامل

## 🛠️ تکنولوژی‌ها

- **Frontend:** React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + shadcn/ui + React Router 6 + TanStack Query
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions/Deno)
- **Realtime:** LiveKit Cloud (یا Self-host)
- **State:** React Context (Auth, Language) + TanStack Query

## 🚀 شروع سریع

```bash
# 1. کلون
git clone https://github.com/hadiranweb/KaghazBaad.git
cd KaghazBaad

# 2. نصب
npm i

# 3. متغیرهای محیطی (.env)
# VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID

# 4. اجرا
npm run dev        # http://localhost:8080
npm run build      # تولید dist/
npm run preview    # پیش‌نمایش production
```

## 🗂️ ساختار پوشه‌ها

```
src/
├── assets/              # تصاویر (brain.png)
├── components/
│   ├── ui/              # کامپوننت‌های shadcn (button, dialog, ...)
│   ├── admin/           # LiveSessionsManager, UsersManager
│   ├── Header.tsx, Footer.tsx, LiveRoom.tsx, ...
├── contexts/            # AuthContext, LanguageContext
├── hooks/               # use-toast, use-mobile, useLiveKitToken
├── integrations/supabase/ # client.ts, types.ts
├── lib/                 # utils.ts, (mcp سابق حذف شد)
├── pages/               # Home, Read, ArticleSlides, Dashboard, LiveSessions, ...
├── App.tsx, App.css, main.tsx, index.css
public/
├── brain-character.svg, placeholder.svg, robots.txt
supabase/
├── config.toml
├── functions/           # send-otp, verify-otp, livekit-token, rewrite-article, ...
└── migrations/          # 14 فایل SQL
```

## 🔑 متغیرهای محیطی

| نام | توضیح |
|---|---|
| `VITE_SUPABASE_URL` | آدرس پروژه Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | کلید publishable (anon) |
| `VITE_SUPABASE_PROJECT_ID` | شناسه پروژه |
| `LIVEKIT_URL` | (فقط Edge Function) wss://xxx.livekit.cloud |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | (فقط Edge Function) |

## 🧩 اسکریپت بازسازی

اگر ساختار پوشه‌ها به هم ریخت:

```bash
bash scripts/restore-structure.sh
npm i && npm run build
```

## 📄 مجوز

Apache 2.0 — فایل `LICENSE` را ببینید.

## 👥 تیم

Hadiran Web — `hadiranweb@gmail.com`
