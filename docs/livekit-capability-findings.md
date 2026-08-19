# یافته‌های قابلیت‌های LiveKit برای بخش پخش زنده

تاریخ بررسی: 2026-08-19

## هستهٔ realtime

LiveKit بر پایهٔ سه مفهوم Room، Participant و Track ساخته شده است. Room فضای مجازی جلسه است؛ Participant می‌تواند کاربر، agent، تماس SIP یا سرویس باشد؛ Track جریان صوتی، تصویری یا داده‌ای است. هر participant می‌تواند هم‌زمان چند track منتشر کند. قابلیت‌های مدیریتی رسمی شامل ایجاد، فهرست و حذف room، فهرست/حذف/قطع صدای participant و انتشار دوربین، میکروفون و screen share است.

منبع: https://docs.livekit.io/intro/basics/rooms-participants-tracks/

## رویداد و همگام‌سازی

LiveKit دو مسیر رویداد دارد: SDK events سمت client برای واکنش لحظه‌ای به تغییرات و webhook سمت server برای همگام‌سازی backend. رویدادهای رسمی شامل room_started، room_finished، participant_joined، participant_left، participant_connection_aborted، track_published، track_unpublished و رویدادهای lifecycle مربوط به egress و ingress است. webhook با Authorization امضاشده ارسال می‌شود و باید raw body برای اعتبارسنجی در backend حفظ شود. سیستم connection quality نیز کیفیت را بر اساس packet loss، latency و jitter گزارش می‌کند و مقادیر Excellent، Good، Poor، Lost و Unknown دارد.

منبع: https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/

## ضبط و خروجی رسانه‌ای

LiveKit Egress در LiveKit Cloud آمادهٔ استفاده است و می‌تواند room یا track را به MP4 یا HLS صادر کند و به YouTube Live، Twitch و Facebook از طریق RTMP بفرستد. انواع اصلی شامل RoomComposite، Web egress، Participant egress، TrackComposite، Track و Auto egress هستند. برای هر room می‌توان ضبط خودکار را فعال کرد. خروجی می‌تواند فایل، stream یا audio-only باشد.

منبع: https://docs.livekit.io/transport/media/ingress-egress/egress/

## ورود stream خارجی

LiveKit Ingress در LiveKit Cloud آماده است و منابع RTMP/RTMPS، WHIP، فایل HTTP، HLS، MP4، MOV، MKV/WEBM، OGG، MP3، M4A و SRT را به room وارد می‌کند. OBS، FFmpeg و GStreamer می‌توانند با RTMP یا WHIP به Ingress متصل شوند. Ingress پس از ایجاد، یک URL و stream key می‌دهد و media را به‌عنوان participant وارد room می‌کند.

منبع: https://docs.livekit.io/transport/media/ingress-egress/ingress/

## نتیجهٔ طراحی محصول

ماژول پخش زندهٔ کاغذ و باد باید در چند لایه طراحی شود: مدیریت room و زمان‌بندی؛ نقش‌های host، speaker، moderator و viewer؛ صوت و تصویر؛ screen share و ارائهٔ مقاله/اسلاید؛ chat و data messages؛ connection quality و reconnect؛ webhook و ثبت رویداد؛ ضبط و آرشیو؛ پخش هم‌زمان به شبکه‌های اجتماعی؛ ورود stream خارجی از OBS/RTMP/WHIP؛ و در فازهای بعدی AI participant، transcription و خلاصه‌سازی. LiveKit Cloud برخی قابلیت‌های رسانه‌ای مانند Ingress و Egress را آماده می‌کند، اما مدل محصول، دسترسی، پرداخت، آرشیو، moderation و تجربهٔ فارسی/RTL باید در backend و frontend کاغذ و باد پیاده‌سازی شود.

## قابلیت‌های تکمیلی realtime

LiveKit screen sharing را به‌صورت native پشتیبانی می‌کند و screen به‌عنوان video track منتشر می‌شود؛ در برخی browserها صدای tab نیز قابل اشتراک است. Data APIs شامل text streams برای chat و پاسخ‌های streaming مدل، byte streams برای فایل/تصویر، RPC برای request-response بین participantها، data tracks برای دادهٔ پیوسته و کم‌تأخیر، state synchronization برای metadata و attributes مشترک و data packets برای کنترل سطح پایین است.

منابع:
- https://docs.livekit.io/transport/media/screenshare/
- https://docs.livekit.io/transport/data/
- https://docs.livekit.io/transport/data/text-streams/

## Agents و قابلیت‌های AI realtime

LiveKit Agents به برنامه‌های Python یا Node.js اجازه می‌دهد به‌عنوان participant کامل وارد room شوند. قابلیت‌ها شامل voice، video و text، STT/LLM/TTS، turn detection، interruption، tool use، handoff چند agent، ترجمهٔ هم‌زمان، multimodal assistant و اتصال به telephony است. Agent می‌تواند در LiveKit Cloud یا محیط سفارشی اجرا شود. در معماری کاغذ و باد، Agent باید به‌عنوان یک participant کنترل‌شده و مشمول quota، permission و ثبت مصرف پیاده‌سازی شود؛ نباید کلید مدل یا ابزار در frontend قرار گیرد.

منبع: https://docs.livekit.io/agents/

## دامنه‌های خارج از MVP

SIP/telephony، agentهای چندمرحله‌ای، virtual avatar، robotics data tracks و پخش گسترده به چند شبکهٔ اجتماعی قابلیت‌های قدرتمند اما پرهزینه‌تر و پیچیده‌تر هستند. آن‌ها باید پس از تثبیت room، نقش‌ها، chat، screen share، recording، webhook و archive وارد roadmap شوند.


## Stage 4 — Egress and archive findings

- LiveKit RoomComposite Egress supports MP4 file output, HLS segment output, RTMP/SRT stream output, and image snapshots. Composite and participant Egress can transcode once to multiple output types.
- S3-compatible destinations are supported. For non-AWS storage, `force_path_style` should be enabled; configuration includes access key, secret, region, bucket, endpoint, metadata and content disposition.
- The Node server SDK exposes `EgressClient.startRoomCompositeEgress(roomName, output, options)` and Egress API requests require a token with `roomRecord` permission.
- Project backend already defines `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` in its environment schema.
- Official sources: https://docs.livekit.io/transport/media/ingress-egress/egress/outputs/ and https://docs.livekit.io/reference/other/egress/api/.
