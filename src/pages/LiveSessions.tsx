import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLiveSessions } from '@/lib/backend-api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, Calendar, Plus, Clock, Video } from 'lucide-react';

interface LiveSession {
  id: string;
  title_en: string;
  title_fa: string;
  description_en: string | null;
  description_fa: string | null;
  status: string;
  scheduled_at: string | null;
  host_user_id: string;
}

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  return diff;
}

function CountdownBadge({ scheduledAt, status, locale }: { scheduledAt: string | null; status: string; locale: string }) {
  const diff = useCountdown(scheduledAt);
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
        <Radio className="h-3 w-3 animate-pulse" />
        {locale === 'fa' ? 'در حال پخش' : 'LIVE'}
      </span>
    );
  }
  if (diff === null) return null;
  const isPast = diff <= 0;
  if (isPast) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/60 bg-foreground/5 px-2.5 py-1 rounded-full">
        <Clock className="h-3 w-3" />
        {locale === 'fa' ? 'به‌زودی' : 'Starting soon'}
      </span>
    );
  }
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const label =
    days > 0
      ? locale === 'fa'
        ? `${days} روز ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-accent bg-accent/10 px-2.5 py-1 rounded-full">
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function LiveSessions() {
  const { locale } = useLanguage();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = locale === 'fa' ? 'جلسات زنده | کاغذ و باد' : 'Live Sessions | KaghazBaad';
    listLiveSessions()
      .then(({ sessions: rows }) => {
        setSessions(rows.filter((row) => ['scheduled', 'live'].includes(row.status)).map((row) => ({
          id: row.id,
          title_fa: typeof row.metadata.title_fa === 'string' ? row.metadata.title_fa : row.title,
          title_en: typeof row.metadata.title_en === 'string' ? row.metadata.title_en : row.title,
          description_fa: typeof row.metadata.description_fa === 'string' ? row.metadata.description_fa : row.description,
          description_en: typeof row.metadata.description_en === 'string' ? row.metadata.description_en : row.description,
          status: row.status,
          scheduled_at: row.starts_at ?? null,
          host_user_id: row.host_id ?? '',
        })));
      })
      .catch((error) => console.error('Error loading live sessions:', error))
      .finally(() => setLoading(false));
  }, [locale]);

  return (
    <div className="container mx-auto px-4 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-thin tracking-tight">
            {locale === 'fa' ? 'جلسات زنده پرسش و پاسخ' : 'Live Q&A Sessions'}
          </h1>
          <p className="text-sm text-foreground/60 mt-2 font-light">
            {locale === 'fa' ? 'گفتگوهای زنده‌ی در حال برگزاری' : 'Real-time conversations with article authors'}
          </p>
        </div>
        {user && (
          <Button asChild variant="outline" size="sm">
            <Link to="/live/new">
              <Plus className="h-4 w-4 mr-1" />
              {locale === 'fa' ? 'جلسه جدید' : 'New session'}
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-foreground/40 text-sm">{locale === 'fa' ? 'در حال بارگذاری…' : 'Loading…'}</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-[hsl(var(--glass-border))] p-12 text-center text-foreground/50 font-light">
          {locale === 'fa' ? 'هیچ جلسه‌ای برنامه‌ریزی نشده است.' : 'No sessions scheduled.'}
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((s) => (
            <li key={s.id}>
              <Card className="group glass-surface hover:shadow-elegant transition-all duration-300 overflow-hidden h-full flex flex-col">
                <div className={`h-40 relative overflow-hidden bg-gradient-to-br ${
                  s.status === 'live'
                    ? 'from-red-500/20 via-secondary to-card'
                    : 'from-accent/15 via-secondary to-card'
                }`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-14 w-14 text-primary/20 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="absolute top-3 right-3">
                    <CountdownBadge scheduledAt={s.scheduled_at} status={s.status} locale={locale} />
                  </div>
                </div>

                <CardHeader>
                  <CardTitle
                    className="text-xl group-hover:text-primary transition-colors line-clamp-2"
                    dir={locale === 'fa' ? 'rtl' : 'ltr'}
                  >
                    {locale === 'fa' ? s.title_fa : s.title_en}
                  </CardTitle>
                  {(s.description_fa || s.description_en) && (
                    <CardDescription className="line-clamp-3" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                      {locale === 'fa' ? s.description_fa : s.description_en}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="mt-auto">
                  {s.scheduled_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(s.scheduled_at).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  )}
                  <Button variant="ghost-ios" asChild className="w-full">
                    <Link to={`/live/${s.id}`}>
                      {s.status === 'live'
                        ? (locale === 'fa' ? 'ورود به جلسه' : 'Join now')
                        : (locale === 'fa' ? 'مشاهده جزئیات' : 'View details')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}