# کاغذ و باد | KaghazBaad — پلتفرم نشر آکادمیک و گفت‌وگوی زنده دوزبانه
### Bilingual (Persian / English) Academic Publishing, Slide-based Learning & Live Discussion Platform

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Architecture: Algomaster Compliant](https://img.shields.io/badge/Architecture-Algomaster%20Compliant-emerald.svg)](#-اصول-مهندسی-و-معماری-algomaster-compliance)
[![RBAC: 4 Official Roles](https://img.shields.io/badge/RBAC-4%20Official%20Roles-purple.svg)](#-سطوح-دسترسی-و-حسابهای-تستی-rbac-matrix--test-accounts)
[![LiveKit: Realtime Workshop](https://img.shields.io/badge/Realtime-LiveKit%20Workshops-red.svg)](#-ماژول-جلسات-زنده--livekit-workshops)

---

## 🇮🇷 معرفی فارسی (Persian Overview)

**«کاغذ و باد» (KaghazBaad)** یک پلتفرم مستقل، دوزبانه (فارسی/انگلیسی) و متمرکز بر نشر آکادمیک در حوزه‌ی علوم شناختی، روان‌شناسی و مطالعات میان‌رشته‌ای است. این سامانه با الهام از فلسفه‌ی **«کاغذ، حاملِ ماندگار اندیشه؛ باد، حاملِ زنده‌ی آن»**، چرخه‌ی کامل **«نگارش → داوری → انتشار اسلایدی (۶۰ ثانیه‌ای) → گفت‌وگوی زنده»** را پوشش می‌دهد.

### 🌟 ویژگی‌های کلیدی و تمایز معماری
- 📖 **دوزبانگی هم‌ارز (RTL / LTR Parity):** تمام مقالات، اسلایدها و رابط کاربری دارای ستون‌های مجزای فارسی و انگلیسی در پایگاه داده و رابط کاربری هستند.
- 🎞️ **ایجاز مستدل (1-Idea-per-Slide Deck):** انتشار مقالات در قالب عرشه اسلایدهای ۶۰ ثانیه‌ای به همراه پیوست‌های چندرسانه‌ای (تصویر، صوت، ویدیو، سند).
- 🎙️ **کارگاه‌های زنده صوتی/تصویری (`LiveKit`):** هر مقاله پس از انتشار، نقطه آغاز یک کارگاه پرسش و پاسخ زنده با حضور نویسنده (Host)، ویراستاران (Speaker) و پژوهشگران (Viewer) است.
- 🔐 **احراز هویت بی‌رمز و تفکیک نقش‌ها (`Passwordless OTP + RBAC`):** ورود از طریق ایمیل و پیامک (`SMS.ir`) با تفکیک ۴ نقش رسمی (`admin`, `editor`, `contributor`, `user`) در جدول مستقل `user_roles`.
- 💾 **درایو شخصی ۱۵ گیگابایتی (`Google-Drive-style Quota`):** فضای ابری اختصاصی برای هر کاربر با محاسبه خودکار سهمیه در دیتابیس و اشتراک‌گذاری ایمیلی امن.
- ⚡ **کنسول مدیریت یکپارچه (Cloudflare-Style Unified Workspace):** تمام کاربران واردشده از آدرس واحد `/dashboard` به محیط کاری خود دسترسی دارند؛ ابزارهای مدیریتی و کاربری در یک نوار کناری تودرتو و تمیز به همراه **ویکی داخلی (`SystemWiki`)** تعبیه شده‌اند.

---

## 🇬🇧 English Overview

**KaghazBaad** is an independent, bilingual (Persian/English) platform focused on academic publishing in cognitive science, psychology, and interdisciplinary studies. Inspired by the philosophy **“Paper is the durable carrier of thought; Wind is its living carrier”**, KaghazBaad implements the continuous scholarly loop of **“Write → Review → 60-Second Slide Deck Publication → Live Audio/Video Workshop”**.

### 🌟 Core Capabilities & Architectural Differentiation
- 📖 **True Bilinguality (RTL / LTR Parity):** Title, summary, body, and metadata are maintained as dual-column peers in PostgreSQL and UI rendering.
- 🎞️ **Reasoned Brevity (60-Second Slide Decks):** Long-form walls of text are replaced by structured 1-idea-per-slide decks with rich media attachments.
- 🎙️ **Live Scholarly Workshops (`LiveKit Cloud`):** Publication is the start of a live Q&A session where authors expound their work via short-lived, RLS-enforced tokens.
- 🔐 **Granular RBAC & Secure Auth:** 4 official app roles (`admin`, `editor`, `contributor`, `user`) managed separately from profiles to prevent privilege escalation.
- 💾 **15GB Personal Media Drive (`user_storage`):** Dedicated quota tracking per user with atomic database triggers and secure email-based sharing.
- ⚡ **Cloudflare-Style Unified Workspace (`/dashboard`):** A single console where user authoring tools, system administration (for Admins/Editors), and an in-console Wiki coexist seamlessly.

---

## 🛡️ اصول مهندسی و معماری (Algomaster Compliance)

زیرساخت «کاغذ و باد» مطابق با پیشرفته‌ترین استانداردهای مهندسی سیستم‌ها در [Algomaster.io](https://algomaster.io) معماری شده است:

| اصل مهندسی Algomaster | پیاده‌سازی در «کاغذ و باد» | مزیت معماری |
|---|---|---|
| **RLS & Tenant Delivery Surfaces** | اعمال **Row Level Security** روی تمامی ۱۸ جدول پایگاه داده | جداسازی کامل داده‌های مستاجران و نقش‌ها در لایه هسته پایگاه داده |
| **Token Bucket / Sliding Window Rate Limiting** | پیاده‌سازی محدودیت نرخ در backend مستقل (`send-otp` و AI Gateway) | جلوگیری از DoS، ارسال رگباری پیامک و هرزنگاری |
| **2-Tier Response Caching** | کش حافظه (`In-Memory LRU`) + کش PostgreSQL (`ai_response_cache`) | کاهش latency و هزینهٔ پاسخ‌های AI با کنترل backend |
| **Keyset / Cursor-Based Pagination** | queryهای cursor-based در PostgreSQL و endpointهای مستقل | صفحه‌بندی مقیاس‌پذیر بدون اسکن offset در فهرست‌های بزرگ |
| **Circuit Breakers & Graceful Degradation** | مدارشکن خودکار ۳‌حالته + پنل پایش ادمین در backend | تاب‌آوری سامانه در برابر قطعی هوش مصنوعی و پیامک |
| **Resilient Client & ErrorBoundary** | API client مستقل با `<ErrorBoundary>` | جلوگیری از خطای صفحه سفید و امکان بازیابی رابط کاربری |

---

## 👥 سطوح دسترسی و حساب‌های تستی (RBAC Matrix & Test Accounts)

پلتفرم دارای **۴ نقش رسمی (`admin`, `editor`, `contributor`, `user`)** + **مهمان (`guest`)** است. برای تست سریع و آفلاین در محیط‌های توسعه و پیش‌نمایش (که مایگریشن سرور ابری هنوز اجرا نشده است)، مکانیزم **Sandbox Preview Auth Fallback** فعال است:

| نقش (App Role) | حساب تست | سطح دسترسی و قابلیت‌ها |
|---|---|---|
| **1. Admin (مدیر)** | از طریق seed امن محیط توسعه | دسترسی کامل به مقالات، کاربران، نقش‌ها، پایش سامانه و شرح پروژه |
| **2. Editor (ویرایشگر)** | از طریق seed امن محیط توسعه | داوری و بررسی مقالات، انتشار و حضور در لایو به عنوان Speaker |
| **3. Contributor (نویسنده)** | از طریق seed امن محیط توسعه | ایجاد و ویرایش مقاله و اسلاید و میزبانی جلسهٔ زنده |
| **4. User (کاربر عادی)** | از طریق seed امن محیط توسعه | تکمیل پروفایل، نظر، فضای شخصی و حضور در لایو به عنوان Viewer |
| **5. Main Admin (اصلی)** | از طریق bootstrap یک‌بارهٔ production | دسترسی کامل مدیریتی؛ credential هرگز در README، Git یا log ذخیره نمی‌شود |

> **راهنمای امنیتی:** حساب‌های تست باید فقط با متغیرهای محیطی یا seed محلی ایجاد شوند. برای production از endpoint عمومی seed استفاده نکنید؛ bootstrap مدیر باید یک‌باره اجرا شود و secret موقت آن بلافاصله حذف شود. در صفحهٔ ورود (`/auth`) نیز هیچ رمز واقعی یا credential ثابت نباید در bundle frontend قرار گیرد.

---

## 🏗️ ساختار کنسول یکپارچه (Cloudflare-Style Unified Console)

در آدرس واحد `/dashboard`، نوار کناری (Sidebar) به سه گروه اصلی دسته‌بندی شده است:
1. **ابزارهای من (`My Workspace`):** مقالات من (`My Articles`)، مقاله جدید (`New Article`)، درایو ۱۵ گیگابایتی (`15GB Media Drive`)، جلسات زنده (`Live Sessions`) و پروفایل کاربری (`Profile`).
2. **مدیریت کلان سامانه (`System Administration` - فقط برای Admin و Editor):** بررسی همه مقالات (`All Articles Review`)، کاربران و نقش‌ها (`Users & Roles`)، تاب‌آوری و مدارشکن‌ها (`Resilience & Breakers`)، پایش زنده جلسات (`Live Monitor`) و ویرایش شرح پروژه (`Project Description`).
3. **راهنما و ویکی (`Wiki & Support`):** ویکی و راهنمای داخلی سامانه (`SystemWiki`) و تنظیمات امنیتی (`Security Settings`).

---

## 📡 معماری پخش زنده (Live Broadcast Architecture)

پس از بررسی و اجماع روی پروتکل‌های محبوب (Telegram/tgcalls، Skyroom، Skype/Teams)، معماری نهایی بر پایه‌ی **LiveKit SFU** انتخاب شد — تنها گزینه‌ی متن‌باز و قابل استقرار روی زیرساخت خودی که هر سه اولویت کاربر را پوشش می‌دهد:

### اولویت‌ها و پیاده‌سازی (Priorities → Implementation)

| اولویت | راه‌حل پیاده‌سازی‌شده |
|---|---|
| ۱. سرعت و بهینگی اتصال | **SFU** (یک استریم بالادست + توزیع سروری، بدون MCU) + **Dynacast** (ارسال فقط لایه‌های موردنیاز هر بیننده) + **AdaptiveStream** (بستن خودکار ویدیوی پنهان) + کلید «خاموش‌کردن ویدیو» برای بینندگان + رندر بومی اسلاید/PDF (مصرف اینترنت نزدیک به صفر به‌جای اشتراک‌صفحه) |
| ۲. امنیت و ضد مانیتورینگ بیرونی | **E2EE واقعی** با `ExternalE2EEKeyProvider` + `Insertable Streams`: فریم‌های صدا/تصویر و کانال داده پیش از خروج از مرورگر رمز می‌شوند؛ کلید در مرورگر میزبان ساخته و هرگز روی سرور ذخیره نمی‌شود. بدون E2EE، مسیر همچنان **DTLS/SRTP** است |
| ۳. کیفیت اتصال و ارائه | همگام‌سازی اسلاید/صفحه از **کانال دادهٔ درون‌اتاقی LiveKit** (نه ویدیوی اشتراک‌صفحه) + رندر PDF صفحه‌به‌صفحه با **pdf.js** و DPI بالا + نشانگر کیفیت اتصال + بازیابی خودکار اتصال |

### امکانات تکمیلی (حواشی پخش زنده)
- **آپلود فایل ارائه** (PDF / تصویر / PPTX) هنگام ساخت جلسه؛ فایل در درایو رسانه ذخیره و به جلسه متصل می‌شود و اعضای جلسه از طریق **لینک امضاشدهٔ ۴ ساعته** (خروجی تابع `livekit-token`) به آن دسترسی دارند — بدون افشای فایل خصوصی.
- **اتاق انتظار** برای بینندگان جلسات «برنامه‌ریزی‌شده» + دکمهٔ «شروع جلسه» برای میزبان.
- **گفتگوی متنی** روی کانال داده (در جلسات E2EE، رمزشده).
- **لیست شرکت‌کنندگان** با نقش زنده (host/speaker/viewer) از `metadata` توکن.
- **پایان جلسه** توسط میزبان → اعلان همگام به همه + قفل اتاق.
- **نشانگر کیفیت اتصال** (ConnectionQuality) و بنر «در حال بازیابی اتصال».
- **کلید E2EE**: تولید خودکار در مرورگر میزبان + دکمهٔ کپی + هشدار ارسال امن؛ درگاه ورود کلید برای بینندگان.
- **سازگاری با دیتابیس قدیمی**: اگر مهاجرت ستون‌های جدید اعمال نشده باشد، درج جلسه/رسانه به‌صورت خودکار بدون ستون‌های جدید تکرار می‌شود.
- **خطای راهنمای راه‌اندازی**: اگر `LIVEKIT_URL/API_KEY/API_SECRET` تنظیم نشده باشند، تابع `livekit-token` خطای `LIVEKIT_NOT_CONFIGURED` برمی‌گرداند و رابط کاربری دستورهای setup را نمایش می‌دهد.

### راه‌اندازی سرور زنده (یک‌بار)
متغیرهای `LIVEKIT_URL`، `LIVEKIT_API_KEY` و `LIVEKIT_API_SECRET` را فقط در secret management سرویس backend روی Liara ثبت کنید. توکن اتاق از endpoint مستقل backend صادر می‌شود و migrationهای LiveKit با runner PostgreSQL در `backend/migrations/` اجرا می‌شوند.

```bash
cd backend
npm run check
npm run migrate:dry-run
```

### مهاجرت‌های مرتبط با پخش زنده
- `20260530213553_9d4f9e6d-...` — جدول `live_sessions` و `live_participants`
- `20260809220000_live_resilience_and_presentation.sql` — ستون‌های `e2ee_enabled`، `presentation_enabled`، RPC `get_session_slides`
- `20260813000000_live_complete_presentation.sql` — ستون `presentation_media_id`، نوع رسانهٔ `document`

---

## 🚀 شروع سریع (Quick Start)

```bash
# 1. کلون مخزن
git clone https://github.com/hadiranweb/Kaghaz-o-Baad.git
cd Kaghaz-o-Baad

# 2. نصب وابستگی‌ها
npm ci

# 3. ایجاد فایل متغیرهای محیطی (.env)
cp .env.example .env

# 4. اجرای سرور توسعه (Vite Dev Server) روی پورت 8080 و 0.0.0.0
npm run dev
# سایت روی آدرس http://localhost:8080 در دسترس است

# 5. بیلد تولیدی (Production Build)
npm run build      # خروجی در پوشه dist/ تولید می‌شود
```

### 🧪 ابزارهای خط فرمان و اسکریپت‌ها
- **بررسی متغیرهای محیطی محلی:**
  ```bash
  bash scripts/ensure-env.sh
  ```
- **راه‌اندازی PostgreSQL محلی و اجرای migrationهای backend مستقل:**
  ```bash
  bash scripts/local-db.sh up
  ```

مسیر اجرایی پروژه مستقل است و به Supabase وابستگی ندارد. migrationهای PostgreSQL در `backend/migrations/` نگه‌داری و با runner تراکنشی backend اجرا می‌شوند.

---

## 🗂️ ساختار پروژه (Project Directory Structure)

```
Kaghaz-o-Baad/
├── src/
│   ├── components/
│   │   ├── admin/             # UsersManager, LiveSessionsManager, CircuitBreakerMonitor, SystemWiki
│   │   ├── ui/                # shadcn/ui Design Tokens & Glassmorphic Components
│   │   ├── ErrorBoundary.tsx  # Resilient Client Fallback & Reload Card
│   │   ├── Header.tsx         # Mode Switcher (Public SEO ↔ Workspace) & Dual-State Navbar
│   │   ├── Footer.tsx         # Bilingual Footer & References
│   │   └── LiveRoom.tsx       # LiveKit VideoConference & PreJoin Lobby
│   ├── contexts/              # AuthContext (Sandbox Auth Fallback), LanguageContext (FA/EN Dicts)
│   ├── hooks/                 # useRole (RBAC check), useLiveKitToken, use-toast
│   ├── pages/                 # Home, Read (Keyset Pagination), Dashboard (Unified Console), Media, ...
│   └── main.tsx, App.tsx      # Entry point wrapped in ErrorBoundary
├── backend/
│   ├── migrations/            # migrationهای مستقل PostgreSQL، از 001 تا 007
│   ├── src/modules/           # auth، workflow، usage، quota، rate-limit، cache، billing
│   └── src/jobs/              # پاک‌سازی cache و lifecycle اشتراک
├── installer/                 # Windows EXE برای آماده‌سازی workspace استقرار
├── scripts/                   # ensure-env.sh و local-db.sh
├── public/                    # SVG assets (brain-character.svg), robots.txt
├── vite.config.ts             # Vite Dev Server config (0.0.0.0:8080, allowedHosts)
└── package.json
```

---

## 🔑 متغیرهای محیطی (.env.example)

| نام متغیر | توضیح |
|---|---|
| `VITE_API_BASE_URL` | آدرس backend مستقل کاغذ و باد |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | اتصال server-side backend به LiveKit Cloud |
| `SMSIR_API_KEY` / `SMSIR_LINE_NUMBER` | کلید و شماره خط پیامکی SMS.ir در backend |
| `AI_API_KEY` | کلید دسترسی backend به provider یا AI Gateway |
| `DATABASE_URL` / `AUTH_JWT_SECRET` | اتصال و امضای session در backend؛ فقط در secret management |

---

## 📄 مجوز و پشتیبانی (License & Contact)

- **مجوز (License):** Apache 2.0 — فایل `LICENSE` را مطالعه کنید.
- **تیم توسعه:** Hadiran Web — `hadiranweb@gmail.com`
