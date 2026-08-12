import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  PreJoin,
  type LocalUserChoices,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, BookOpen, Video, ChevronLeft, ChevronRight, CheckCircle2, Lock, Radio } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { LiveKitTokenResponse } from '@/hooks/useLiveKitToken';
import type { SlideItem } from '@/pages/LiveRoomPage';

interface Props {
  tokenData: LiveKitTokenResponse;
  sessionId: string;
  slides?: SlideItem[];
  onLeave?: () => void;
}

export const LiveRoom = ({ tokenData, sessionId, slides = [], onLeave }: Props) => {
  const { locale } = useLanguage();
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [viewMode, setViewMode] = useState<'slides' | 'video'>(slides.length > 0 ? 'slides' : 'video');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const isHost = tokenData.role === 'host';
  const canPublish = tokenData.role === 'host' || tokenData.role === 'speaker';

  // همگام‌سازی زمان‌واقعی اسلایدها از طریق کانال Broadcast دیتابیس Supabase
  useEffect(() => {
    if (!sessionId || slides.length === 0) return;

    const channel = supabase
      .channel(`room-slide:${sessionId}`)
      .on('broadcast', { event: 'slide_change' }, (payload) => {
        if (typeof payload.payload?.index === 'number') {
          setCurrentSlideIndex(payload.payload.index);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, slides.length]);

  const handleSlideChange = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= slides.length) return;
    setCurrentSlideIndex(newIdx);

    // Broadcast to all participants in the room
    supabase.channel(`room-slide:${sessionId}`).send({
      type: 'broadcast',
      event: 'slide_change',
      payload: { index: newIdx },
    });
  };

  if (!choices) {
    return (
      <div className="min-h-[580px] bg-background rounded-2xl overflow-hidden border border-[hsl(var(--glass-border))]">
        <PreJoin
          defaults={{
            username: tokenData.name,
            videoEnabled: canPublish,
            audioEnabled: canPublish,
          }}
          onSubmit={setChoices}
          data-lk-theme="default"
        />
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="space-y-4">
      {/* نوار وضعیت امنیتی، پروتکل اتصال (SFU / Dynacast) و سوئیچ حالت نمایش */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-surface border border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {tokenData.e2ee_enabled ? (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-2.5 py-1">
              <Shield className="h-3.5 w-3.5" />
              <span>{locale === 'fa' ? '🔒 رمزنگاری سرتاسری (E2EE Active)' : '🔒 E2EE End-to-End Encrypted'}</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 font-mono text-xs">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span>{locale === 'fa' ? '🔒 رمزنگاری استاندارد DTLS/SRTP' : '🔒 DTLS/SRTP Encrypted'}</span>
            </Badge>
          )}

          <Badge variant="outline" className="gap-1 px-2.5 py-1 text-xs border-accent/40 text-accent">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>{locale === 'fa' ? '🔴 لایو (LiveKit SFU + Dynacast)' : '🔴 LIVE (LiveKit SFU + Dynacast)'}</span>
          </Badge>

          {slides.length > 0 && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>{locale === 'fa' ? `${slides.length} اسلاید مقاله` : `${slides.length} Slides`}</span>
            </Badge>
          )}
        </div>

        {slides.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'slides' ? 'default' : 'outline'}
              className="h-8 text-xs gap-1.5"
              onClick={() => setViewMode('slides')}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{locale === 'fa' ? 'حالت اسلاید همگام (Retina/4K)' : 'Slide Board (Synchronized)'}</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'video' ? 'default' : 'outline'}
              className="h-8 text-xs gap-1.5"
              onClick={() => setViewMode('video')}
            >
              <Video className="h-3.5 w-3.5" />
              <span>{locale === 'fa' ? 'شبکه ویدیویی کامل' : 'Full Video Grid'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* محیط اصلی اتاق زنده */}
      <div className="rounded-2xl overflow-hidden border border-[hsl(var(--glass-border))] relative bg-card">
        <LiveKitRoom
          serverUrl={tokenData.url}
          token={tokenData.token}
          connect={true}
          video={canPublish && choices.videoEnabled}
          audio={canPublish && choices.audioEnabled}
          onDisconnected={onLeave}
          data-lk-theme="default"
          className="min-h-[70vh] w-full"
        >
          {viewMode === 'slides' && currentSlide ? (
            <div className="grid lg:grid-cols-3 gap-4 p-4 min-h-[70vh]">
              {/* بخش چپ/وسط: نمایشگر بومی اسلاید با وضوح 4K و دکمه‌های همگام‌سازی */}
              <Card className="lg:col-span-2 glass-surface border-border/60 flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-1">
                      {locale === 'fa'
                        ? `اسلاید ${currentSlideIndex + 1} از ${slides.length}`
                        : `Slide ${currentSlideIndex + 1} of ${slides.length}`}
                    </Badge>
                    <CardTitle className="text-lg font-[IRANSharp]">
                      {(locale === 'fa' ? currentSlide.title_fa : currentSlide.title_en) ||
                        (locale === 'fa' ? 'اسلاید بدون عنوان' : 'Untitled Slide')}
                    </CardTitle>
                  </div>

                  {!canPublish && (
                    <Badge variant="secondary" className="text-xs bg-accent/10 text-accent gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{locale === 'fa' ? '📡 همگام‌سازی زنده با سخنران' : '📡 Synchronized with Speaker'}</span>
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="py-6 flex-1 overflow-y-auto max-h-[520px]">
                  <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                    <div data-color-mode="light">
                      <MDEditor.Markdown
                        source={(locale === 'fa' ? currentSlide.body_fa : currentSlide.body_en) || ''}
                      />
                    </div>
                  </div>
                </CardContent>

                {canPublish && (
                  <div className="p-3 bg-secondary/30 border-t border-border/40 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentSlideIndex <= 0}
                      onClick={() => handleSlideChange(currentSlideIndex - 1)}
                      className="gap-1"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'اسلاید قبلی' : 'Previous Slide'}</span>
                    </Button>
                    <span className="text-xs text-muted-foreground font-mono">
                      {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentSlideIndex >= slides.length - 1}
                      onClick={() => handleSlideChange(currentSlideIndex + 1)}
                      className="gap-1"
                    >
                      <span>{locale === 'fa' ? 'اسلاید بعدی' : 'Next Slide'}</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>

              {/* بخش راست: کنفرانس ویدیویی و صدا در کنار اسلاید */}
              <div className="lg:col-span-1 flex flex-col gap-3">
                <div className="h-[380px] rounded-xl overflow-hidden border border-border/50 bg-background/50">
                  <VideoConference />
                </div>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 text-xs text-muted-foreground leading-5">
                  <div className="font-semibold text-foreground mb-1">
                    {locale === 'fa' ? 'آداب کارگاه زنده «کاغذ و باد»:' : 'Live Workshop Etiquette:'}
                  </div>
                  {locale === 'fa'
                    ? 'نویسنده ۱۰ دقیقه ارائه می‌کند و ۵۰ دقیقه می‌شنود. اسلایدها با مصرف اینترنت نزدیک به صفر به صورت بومی در دستگاه شما رندر می‌شوند.'
                    : 'Author presents for 10 min, listens for 50. Slides render natively on your device with near-zero network overhead.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[75vh]">
              <VideoConference />
            </div>
          )}

          <RoomAudioRenderer />

          {!isHost && viewMode === 'video' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-foreground/60 bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-border/40">
              {locale === 'fa' ? 'حالت تماشاگر — درخواست صحبت از میزبان' : 'Viewer mode — request to speak'}
            </div>
          )}
        </LiveKitRoom>
      </div>
    </div>
  );
};
