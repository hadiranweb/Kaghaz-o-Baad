# ارزیابی محل اجرای LiveKit

تاریخ بررسی: 2026-08-19

## الزامات فنی

طبق مستندات رسمی LiveKit، استقرار production به دامنه و گواهی TLS معتبر، termination در load balancer یا reverse proxy، آدرس عمومی قابل اعلام، و دسترسی شبکه‌ای به پورت‌های WebRTC نیاز دارد. پورت‌های معمول شامل WebSocket/API روی 7880، بازهٔ UDP از 50000 تا 60000، TCP روی 7881، و در صورت استفاده از UDP mux پورت 7882 هستند. TURN/TLS در صورت نبود load balancer باید روی 443 قرار بگیرد.

LiveKit در Docker استفاده از host networking را برای performance بهتر توصیه می‌کند. مستندات Kubernetes نیز تصریح می‌کنند که LiveKit برای ترافیک WebRTC به دسترسی مستقیم شبکه/host networking نیاز دارد و deployment روی serverless یا private cluster پشتیبانی نمی‌شود.

## نتیجهٔ معماری

Liara PaaS فعلی برای frontend/backend HTTP مناسب است، اما بدون تأیید رسمی دسترسی UDP عمومی و host networking، محل مناسبی برای LiveKit self-hosted نیست. اضافه‌کردن LiveKit به backend Node/Fastify نیز LiveKit Server ایجاد نمی‌کند؛ backend فقط باید با LiveKit از طریق SDK برای ساخت token، مدیریت room و webhook ارتباط داشته باشد.

گزینه‌های عملی عبارت‌اند از: استفاده از LiveKit Cloud به‌عنوان مسیر کم‌ریسک، اجرای self-hosted روی VPS/VM با public IP، یا اجرای self-hosted روی Kubernetes/VM عمومی که host networking و پورت‌های لازم را پشتیبانی کند. یک PaaS معمولی فقط در صورتی قابل استفاده است که صریحاً UDP public ingress، پورت‌های رسانه‌ای و networking مناسب را ارائه کند.

منابع:
- https://docs.livekit.io/transport/self-hosting/deployment/
- https://docs.livekit.io/transport/self-hosting/ports-firewall/
- https://docs.livekit.io/transport/self-hosting/kubernetes/
