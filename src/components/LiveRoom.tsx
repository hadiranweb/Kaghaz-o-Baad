import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  PreJoin,
  useParticipants,
  useLocalParticipant,
  type LocalUserChoices,
} from '@livekit/components-react';
import {
  Room,
  RoomEvent,
  ConnectionState,
  ConnectionQuality,
  ExternalE2EEKeyProvider,
  type RemoteParticipant,
} from 'livekit-client';
import E2EEWorker from 'livekit-client/e2ee-worker?worker';
import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Shield, Lock, BookOpen, Video, ChevronLeft, ChevronRight, CheckCircle2, Radio,
  MessageSquare, Users, Copy, LogOut, KeyRound, FileText, Download,
  Wifi, WifiOff, PlayCircle, MonitorX, Loader2, ArrowRight,
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { LiveKitTokenResponse, LiveRole, PresentationKind } from '@/hooks/useLiveKitToken';
import type { SlideItem } from '@/pages/LiveRoomPage';

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

// ————————————————————————————————————————————————————————————————
// پیام‌های کانال دادهٔ LiveKit (همگام‌سازی اسلاید / ارائه / گفتگو / کنترل)
// ————————————————————————————————————————————————————————————————
const TOPIC_SLIDE = 'kb-slide';
const TOPIC_CHAT = 'kb-chat';
const TOPIC_CTRL = 'kb-ctrl';

interface ChatMsg {
  id: string;
  name: string;
  text: string;
  ts: number;
  mine?: boolean;
}

export interface LivePresentation {
  url?: string | null;
  name?: string | null;
  kind?: PresentationKind;
}

interface Props {
  tokenData: LiveKitTokenResponse;
  sessionId: string;
  slides?: SlideItem[];
  presentation?: LivePresentation;
  sessionStatus?: string;
  isHost?: boolean;
  canStart?: boolean;
  onStartSession?: () => void;
  onEndSession?: () => void;
  onLeave?: () => void;
}

const uid = () => crypto.randomUUID().slice(0, 8);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// ————————————————————————————————————————————————————————————————
// تولید کلید رمزنگاری در مرورگر (هرگز روی سرور ذخیره نمی‌شود)
// ————————————————————————————————————————————————————————————————
function generatePassphrase(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `kb-${b64}`;
}

const qualityLabel = (q?: ConnectionQuality, fa = true) => {
  if (q === undefined) return null;
  if (q === ConnectionQuality.Excellent) return fa ? 'عالی' : 'Excellent';
  if (q === ConnectionQuality.Good) return fa ? 'خوب' : 'Good';
  if (q === ConnectionQuality.Poor) return fa ? 'ضعیف' : 'Poor';
  return fa ? 'بسیار ضعیف' : 'Very poor';
};

const roleLabel = (role: LiveRole | string | undefined, fa: boolean) => {
  if (role === 'host') return fa ? 'میزبان' : 'Host';
  if (role === 'speaker') return fa ? 'سخنران' : 'Speaker';
  return fa ? 'بیننده' : 'Viewer';
};

function parsedRole(metadata?: string): LiveRole | undefined {
  if (!metadata) return undefined;
  try {
    const m = JSON.parse(metadata) as { role?: LiveRole };
    return m.role;
  } catch {
    return undefined;
  }
}

// ————————————————————————————————————————————————————————————————
// نمایشگر PDF بومی (pdf.js) با رندر باکیفیت و همگام‌سازی صفحه
// ————————————————————————————————————————————————————————————————
function PdfViewer({ url, page, canControl, onPageChange }: {
  url: string;
  page: number;
  canControl: boolean;
  onPageChange: (p: number) => void;
}) {
  const { locale } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderSeq = useRef(0);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fa = locale === 'fa';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    pdfjs
      .getDocument({ url })
      .promise.then((doc) => {
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(fa ? 'خواندن فایل PDF ممکن نشد' : 'Could not load the PDF');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      renderSeq.current += 1;
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, [url, fa]);

  useEffect(() => {
    const seq = ++renderSeq.current;
    const render = async () => {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!doc || !canvas || !container) return;
      const width = Math.max(container.clientWidth || 900, 320);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = clamp((width * dpr) / 720, 0.5, 4);
      const pg = await doc.getPage(clamp(page, 1, numPages || 1));
      if (seq !== renderSeq.current) return;
      const viewport = pg.getViewport({ scale });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      await pg.render({ canvasContext: ctx, viewport }).promise;
    };
    render().catch(() => { /* page may be out of range while loading */ });
  }, [page, numPages, url]);

  return (
    <Card className="glass-surface border-border/60 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border/40 flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px] gap-1">
          <FileText className="h-3 w-3" />
          {fa ? `صفحه ${clamp(page, 1, numPages || 1)} از ${numPages || '…'}` : `Page ${clamp(page, 1, numPages || 1)} of ${numPages || '…'}`}
        </Badge>
        {!canControl && (
          <Badge variant="secondary" className="text-[10px] bg-accent/10 text-accent gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {fa ? 'همگام با میزبان' : 'In sync with host'}
          </Badge>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-[#3d3d3d] flex items-start justify-center p-4 min-h-[380px] max-h-[560px]">
        {loading && (
          <div className="flex flex-col items-center gap-2 text-white/70 text-xs py-16">
            <Loader2 className="h-6 w-6 animate-spin" />
            {fa ? 'در حال رندر بومی PDF…' : 'Rendering PDF natively…'}
          </div>
        )}
        {error && <div className="text-red-200 text-sm py-16">{error}</div>}
        <canvas ref={canvasRef} className="shadow-2xl rounded-sm bg-white" />
      </div>

      {canControl && numPages > 0 && (
        <div className="p-3 bg-secondary/30 border-t border-border/40 flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="gap-1">
            <ChevronRight className="h-4 w-4" />
            {fa ? 'صفحه قبل' : 'Prev'}
          </Button>
          <span className="text-xs font-mono text-muted-foreground">
            {clamp(page, 1, numPages)} / {numPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= numPages} onClick={() => onPageChange(page + 1)} className="gap-1">
            {fa ? 'صفحه بعد' : 'Next'}
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}

// ————————————————————————————————————————————————————————————————
// کامپوننت اصلی اتاق زنده
// ————————————————————————————————————————————————————————————————
export const LiveRoom = ({
  tokenData,
  sessionId,
  slides = [],
  presentation,
  sessionStatus = 'live',
  isHost = false,
  canStart = false,
  onStartSession,
  onEndSession,
  onLeave,
}: Props) => {
  const { locale } = useLanguage();
  const fa = locale === 'fa';

  const e2eeEnabled = !!tokenData.e2ee_enabled;
  const canPublish = tokenData.role === 'host' || tokenData.role === 'speaker';

  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [viewMode, setViewMode] = useState<'slides' | 'presentation' | 'video'>(() =>
    presentation?.url ? 'presentation' : slides.length > 0 ? 'slides' : 'video',
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [presPage, setPresPage] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [chats, setChats] = useState<ChatMsg[]>([]);
  const [chatText, setChatText] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [endedByHost, setEndedByHost] = useState(false);
  const [startedByHost, setStartedByHost] = useState(false);
  const [qualities, setQualities] = useState<Record<string, ConnectionQuality>>({});
  const [roomError, setRoomError] = useState<string | null>(null);
  const [videoOn, setVideoOn] = useState(canPublish);

  const unmountingRef = useRef(false);
  const connectedRef = useRef(false);
  const seenMsgIds = useRef(new Set<string>());

  const keyProvider = useMemo(() => (e2eeEnabled ? new ExternalE2EEKeyProvider() : null), [e2eeEnabled]);

  // کلید پیشنهادی میزبان
  useEffect(() => {
    if (e2eeEnabled && canPublish && !generatedKey) setGeneratedKey(generatePassphrase());
  }, [e2eeEnabled, canPublish, generatedKey]);

  // ——— ساخت اتاق با پیکربندی واقعی Dynacast + AdaptiveStream + E2EE ———
  useEffect(() => {
    if (!choices) return;
    let cancelled = false;
    setConnecting(true);
    setRoomError(null);

    (async () => {
      try {
        const r = new Room({
          dynacast: true,          // ارسال فقط لایه‌های موردنیاز هر بیننده
          adaptiveStream: true,    // توقف خودکار ویدیوی پنهان
          ...(e2eeEnabled && keyProvider && passphrase
            ? { encryption: { keyProvider, worker: new E2EEWorker() } }
            : {}),
        });

        // شنود پیام‌های کانال داده (اسلاید / صفحه ارائه / گفتگو / کنترل)
        r.on(RoomEvent.DataReceived, (payload: Uint8Array, _participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload)) as {
              v?: number; t?: string; i?: number; p?: number; id?: string; name?: string; text?: string; ts?: number;
            };
            if (msg.v !== 1 || !msg.t) return;

            if (topic === TOPIC_SLIDE) {
              if (msg.t === 'slide' && typeof msg.i === 'number') setCurrentSlideIndex(clamp(msg.i, 0, Math.max(slides.length - 1, 0)));
              if (msg.t === 'page' && typeof msg.p === 'number') setPresPage(clamp(msg.p, 1, 10_000));
            } else if (topic === TOPIC_CHAT && msg.t === 'chat') {
              if (!msg.id || seenMsgIds.current.has(msg.id)) return;
              seenMsgIds.current.add(msg.id);
              setChats((prev) => [...prev.slice(-199), { id: msg.id!, name: msg.name || '…', text: msg.text || '', ts: msg.ts || Date.now() }]);
            } else if (topic === TOPIC_CTRL) {
              if (msg.t === 'end') setEndedByHost(true);
              if (msg.t === 'start') setStartedByHost(true);
            }
          } catch {
            // پیام ناخوانا — نادیده
          }
        });

        r.on(RoomEvent.ConnectionQualityChanged, (q: ConnectionQuality, p: RemoteParticipant) => {
          setQualities((prev) => ({ ...prev, [p.identity]: q }));
        });
        r.on(RoomEvent.Reconnecting, () => setReconnecting(true));
        r.on(RoomEvent.Reconnected, () => setReconnecting(false));
        r.on(RoomEvent.Disconnected, () => {
          setReconnecting(false);
          if (connectedRef.current && !unmountingRef.current) setDisconnected(true);
        });

        if (e2eeEnabled && keyProvider && passphrase) {
          await keyProvider.setKey(passphrase); // PBKDF2 روی عبارت عبور
          await r.setE2EEEnabled(true);         // فعال‌سازی E2EE پیش از اتصال
        }

        if (cancelled) return;
        setRoom(r);
        setConnecting(false);
      } catch (e) {
        if (!cancelled) {
          setConnecting(false);
          setRoomError(fa ? `راه‌اندازی اتاق ناموفق بود: ${String((e as Error)?.message ?? e)}` : `Room setup failed: ${String((e as Error)?.message ?? e)}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // توجه: deliberately excludes slides.length — اتاق فقط یک‌بار ساخته می‌شود
    // و اسلایدهای دیررس نباید باعث قطع و اتصال مجدد شوند.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, e2eeEnabled, keyProvider, passphrase]);

  useEffect(() => () => { unmountingRef.current = true; }, []);

  // ——— ارسال پیام روی کانال داده (همگام‌سازی + گفتگو) ———
  const sendData = useCallback(
    async (topic: string, payload: Record<string, unknown>): Promise<boolean> => {
      if (!room || room.state !== ConnectionState.Connected) return false;
      try {
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ v: 1, ...payload })),
          { reliable: true, topic },
        );
        return true;
      } catch {
        return false;
      }
    },
    [room],
  );

  // ——— همگام‌سازی اسلاید: کانال رمزشدهٔ LiveKit + پشتیبان Broadcast (فقط بدون E2EE) ———
  useEffect(() => {
    if (!sessionId || slides.length === 0 || e2eeEnabled) return;
    const channel = supabase
      .channel(`room-slide:${sessionId}`)
      .on('broadcast', { event: 'slide_change' }, (payload) => {
        if (typeof payload.payload?.index === 'number') {
          setCurrentSlideIndex(clamp(payload.payload.index, 0, slides.length - 1));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, slides.length, e2eeEnabled]);

  const handleSlideChange = useCallback(
    (newIdx: number) => {
      if (newIdx < 0 || newIdx >= slides.length) return;
      setCurrentSlideIndex(newIdx);
      void sendData(TOPIC_SLIDE, { t: 'slide', i: newIdx }).then((ok) => {
        if (!ok && !e2eeEnabled) {
          supabase.channel(`room-slide:${sessionId}`).send({
            type: 'broadcast',
            event: 'slide_change',
            payload: { index: newIdx },
          });
        }
      });
    },
    [sendData, slides.length, sessionId, e2eeEnabled],
  );

  const handlePageChange = useCallback(
    (p: number) => {
      setPresPage(p);
      void sendData(TOPIC_SLIDE, { t: 'page', p });
    },
    [sendData],
  );

  const sendChat = useCallback(() => {
    const text = chatText.trim();
    if (!text || !room) return;
    const msg: ChatMsg = { id: uid(), name: room.localParticipant.name || (fa ? 'من' : 'Me'), text, ts: Date.now(), mine: true };
    setChats((prev) => [...prev.slice(-199), msg]);
    setChatText('');
    void sendData(TOPIC_CHAT, { t: 'chat', id: msg.id, name: msg.name, text, ts: msg.ts });
  }, [chatText, room, sendData, fa]);

  // ——— کنترل ویدیوی ورودی برای بینندگان (صرفه‌جویی در پهنای باند) ———
  const setRemoteVideo = useCallback(
    (on: boolean) => {
      if (!room) return;
      room.remoteParticipants.forEach((p) => {
        p.videoTrackPublications.forEach((pub) => pub.setSubscribed(on));
      });
    },
    [room],
  );

  useEffect(() => {
    if (canPublish) return;
    setRemoteVideo(videoOn);
  }, [videoOn, canPublish, setRemoteVideo, room]);

  useEffect(() => {
    if (viewMode === 'video') setVideoOn(true);
  }, [viewMode]);

  // ——— ناوبری صفحه‌کلید برای میزبان/سخنران ———
  useEffect(() => {
    if (!canPublish || !room) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const nextKey = fa ? 'ArrowLeft' : 'ArrowRight';
      const prevKey = fa ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === nextKey) {
        if (viewMode === 'slides') handleSlideChange(currentSlideIndex + 1);
        if (viewMode === 'presentation') handlePageChange(presPage + 1);
      } else if (e.key === prevKey) {
        if (viewMode === 'slides') handleSlideChange(currentSlideIndex - 1);
        if (viewMode === 'presentation') handlePageChange(Math.max(1, presPage - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canPublish, room, fa, viewMode, currentSlideIndex, presPage, handleSlideChange, handlePageChange]);

  // ——— دروازهٔ رمزنگاری E2EE (کلید هرگز روی سرور ذخیره نمی‌شود) ———
  if (e2eeEnabled && !passphrase) {
    return (
      <div className="min-h-[560px] bg-background rounded-2xl overflow-hidden border border-[hsl(var(--glass-border))] flex items-center justify-center p-6">
        <Card className="w-full max-w-lg glass-surface border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-emerald-500">
              <Shield className="h-5 w-5" />
              <CardTitle className="text-lg">{fa ? 'رمزنگاری سرتاسری (E2EE)' : 'End-to-End Encryption (E2EE)'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-6">
              {fa
                ? 'این جلسه E2EE است: صدا، تصویر و کانال داده پیش از خروج از مرورگر رمز می‌شوند و حتی سرور LiveKit هم قادر به مانیتورینگ نیست. کلید رمز فقط در مرورگرها ساخته و نگهداری می‌شود و هرگز روی سرور ذخیره نمی‌شود.'
                : 'This session is E2EE: audio, video and data are encrypted before leaving your browser; even the LiveKit server cannot monitor. The key never touches the server.'}
            </p>

            {canPublish ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                  <div className="text-xs text-muted-foreground mb-2">
                    {fa ? 'کلید پیشنهادی جلسه (آن را فقط از راهِ امن برای شرکت‌کنندگان بفرستید):' : 'Suggested session key (share securely with participants):'}
                  </div>
                  <div className="flex gap-2">
                    <code className="flex-1 font-mono text-xs bg-background border border-border/60 rounded-lg px-3 py-2 break-all" dir="ltr">
                      {generatedKey || generatePassphrase()}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedKey || generatePassphrase()).then(() =>
                          toast.success(fa ? 'کلید کپی شد — فقط از راه امن ارسال کنید' : 'Key copied — share securely'),
                        );
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    dir="ltr"
                    placeholder={fa ? 'یا کلید دلخواه خود را وارد کنید…' : '…or enter your own key'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button onClick={() => setPassphrase((keyInput.trim() || generatedKey || generatePassphrase()).trim())} className="gap-1.5">
                    <KeyRound className="h-4 w-4" />
                    {fa ? 'ورود به جلسه' : 'Enter room'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {fa ? 'کلید رمز را از میزبان جلسه بگیرید (از طریق پیام خصوصی / کانال امن خودتان).' : 'Ask the host for the encryption key (via your own secure channel).'}
                </p>
                <div className="flex gap-2">
                  <Input
                    dir="ltr"
                    placeholder={fa ? 'کلید رمزنگاری جلسه…' : 'Session encryption key…'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button disabled={!keyInput.trim()} onClick={() => setPassphrase(keyInput.trim())} className="gap-1.5">
                    <KeyRound className="h-4 w-4" />
                    {fa ? 'ورود' : 'Join'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // ——— جلسهٔ «برنامه‌ریزی‌شده» برای بینندگان: اتاق انتظار ———
  if (sessionStatus === 'scheduled' && !canStart && !startedByHost) {
    return (
      <div className="min-h-[480px] rounded-2xl border border-[hsl(var(--glass-border))] bg-background flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
          <Radio className="relative h-10 w-10 text-accent" />
        </div>
        <h2 className="text-xl font-thin">{fa ? 'جلسه هنوز آغاز نشده است' : 'The session has not started yet'}</h2>
        <p className="text-sm text-muted-foreground max-w-md leading-6">
          {fa
            ? 'به محض ورود میزبان، این صفحه خودکار به اتاق زنده متصل می‌شود. اگر میزبان هستید از داشبورد گزینهٔ «شروع جلسه» را بزنید.'
            : 'This page will auto-connect when the host joins. Hosts can press “Start session” from the dashboard.'}
        </p>
        <Button variant="outline" onClick={onLeave} className="gap-1.5">
          <ArrowRight className="h-4 w-4" />
          {fa ? 'بازگشت به جلسات' : 'Back to sessions'}
        </Button>
      </div>
    );
  }

  const currentSlide = slides[Math.min(currentSlideIndex, Math.max(slides.length - 1, 0))];
  const canControl = canPublish;
  const hasSlides = slides.length > 0;
  const hasPres = !!presentation?.url;
  const localQuality = room ? qualities[room.localParticipant.identity] : undefined;

  const allViewToggles: Array<{ key: 'slides' | 'presentation' | 'video'; label: string; icon: React.ReactNode; visible: boolean }> = [
    { key: 'slides', label: fa ? 'اسلاید مقاله' : 'Article slides', icon: <BookOpen className="h-3.5 w-3.5" />, visible: hasSlides },
    { key: 'presentation', label: fa ? 'فایل ارائه' : 'Presentation', icon: <FileText className="h-3.5 w-3.5" />, visible: hasPres },
    { key: 'video', label: fa ? 'ویدیو' : 'Video', icon: <Video className="h-3.5 w-3.5" />, visible: true },
  ];
  const viewToggles = allViewToggles.filter((v) => v.visible);

  return (
    <div className="space-y-4">
      {/* نوار وضعیت: امنیت، پروتکل، کیفیت اتصال، حالت نمایش */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-surface border border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {e2eeEnabled ? (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-2.5 py-1">
              <Shield className="h-3.5 w-3.5" />
              <span>{fa ? 'E2EE فعال — رمزنگاری سرتاسری' : 'E2EE Active'}</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 font-mono text-xs">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span>{fa ? 'DTLS/SRTP استاندارد' : 'DTLS/SRTP'}</span>
            </Badge>
          )}

          <Badge variant="outline" className="gap-1 px-2.5 py-1 text-xs border-accent/40 text-accent">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>LiveKit SFU + Dynacast</span>
          </Badge>

          {room && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {localQuality !== undefined && localQuality >= ConnectionQuality.Good ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span>{qualityLabel(localQuality, fa) ?? (fa ? 'اتصال…' : 'Connecting…')}</span>
            </Badge>
          )}

          {hasSlides && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>{fa ? `${slides.length} اسلاید مقاله` : `${slides.length} slides`}</span>
            </Badge>
          )}
          {hasPres && (
            <Badge variant="secondary" className="gap-1 text-xs max-w-[200px] truncate">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">{presentation?.name}</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {viewToggles.length > 1 &&
            viewToggles.map((v) => (
              <Button
                key={v.key}
                size="sm"
                variant={viewMode === v.key ? 'default' : 'outline'}
                className="h-8 text-xs gap-1.5"
                onClick={() => setViewMode(v.key)}
              >
                {v.icon}
                <span>{v.label}</span>
              </Button>
            ))}

          {!canPublish && hasPres && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setVideoOn((on) => !on)}>
              {videoOn ? <Video className="h-3.5 w-3.5" /> : <MonitorX className="h-3.5 w-3.5" />}
              <span>{fa ? (videoOn ? 'ویدیو: روشن' : 'ویدیو: خاموش') : videoOn ? 'Video: on' : 'Video: off'}</span>
            </Button>
          )}

          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 relative" onClick={() => setChatOpen((o) => !o)}>
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{fa ? 'گفتگو' : 'Chat'}</span>
            {chats.filter((c) => !c.mine).length > 0 && (
              <span className="absolute -top-1.5 -left-1.5 h-4 min-w-4 px-1 rounded-full bg-accent text-[10px] text-white flex items-center justify-center">
                {chats.filter((c) => !c.mine).length}
              </span>
            )}
          </Button>

          {canPublish && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).then(() =>
                  toast.success(fa ? 'لینک دعوت کپی شد' : 'Invite link copied'),
                );
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{fa ? 'دعوت' : 'Invite'}</span>
            </Button>
          )}

          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-red-400" onClick={onLeave}>
            <LogOut className="h-3.5 w-3.5" />
            <span>{fa ? 'خروج' : 'Leave'}</span>
          </Button>
        </div>
      </div>

      {/* اعلان شروع جلسه برای میزبان */}
      {sessionStatus === 'scheduled' && canStart && !startedByHost && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-accent/40 bg-accent/10">
          <div className="text-sm">
            <span className="font-medium">{fa ? 'جلسه هنوز «برنامه‌ریزی‌شده» است.' : 'Session is still “scheduled”.'}</span>{' '}
            <span className="text-muted-foreground">{fa ? 'بینندگان تا شروع جلسه در اتاق انتظار می‌مانند.' : 'Viewers will wait until you start.'}</span>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setStartedByHost(true);
              onStartSession?.();
              void sendData(TOPIC_CTRL, { t: 'start' });
            }}
          >
            <PlayCircle className="h-4 w-4" />
            {fa ? 'شروع جلسه' : 'Start session'}
          </Button>
        </div>
      )}

      {/* اتاق اصلی */}
      <div className="rounded-2xl overflow-hidden border border-[hsl(var(--glass-border))] relative bg-card">
        {connecting && !room && (
          <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {fa ? 'در حال ساخت اتاق رمزنگاری‌شده…' : 'Preparing encrypted room…'}
          </div>
        )}

        {roomError && (
          <div className="p-4 m-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-400">
            {roomError}
          </div>
        )}

        <LiveKitRoom
          serverUrl={tokenData.url}
          token={tokenData.token}
          room={room ?? undefined}
          connect={!!room}
          video={canPublish && !!choices.videoEnabled}
          audio={canPublish && !!choices.audioEnabled}
          onConnected={() => {
            connectedRef.current = true;
            setDisconnected(false);
            setReconnecting(false);
          }}
          onDisconnected={() => {
            if (connectedRef.current && !unmountingRef.current) setDisconnected(true);
          }}
          onError={(e) => setRoomError(fa ? `خطای اتصال: ${e.message}` : `Connection error: ${e.message}`)}
          onEncryptionError={(e) => {
            toast.error(fa ? `خطای رمزنگاری — کلید را بررسی کنید (${e.message})` : `Encryption error — check the key (${e.message})`);
          }}
          data-lk-theme="default"
          className="min-h-[70vh] w-full"
        >
          {reconnecting && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 text-xs bg-background/90 backdrop-blur border border-border/60 rounded-full px-4 py-1.5 shadow-lg">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              {fa ? 'اتصال در حال بازیابی است…' : 'Reconnecting…'}
            </div>
          )}

          <RoomBody
            room={room}
            canPublish={canPublish}
            viewMode={viewMode}
            slides={slides}
            currentSlideIndex={currentSlideIndex}
            presPage={presPage}
            presentation={presentation}
            canControl={canControl}
            handleSlideChange={handleSlideChange}
            handlePageChange={handlePageChange}
            sessionStatus={sessionStatus}
            canStart={canStart}
            startedByHost={startedByHost}
            onStart={() => {
              setStartedByHost(true);
              onStartSession?.();
              void sendData(TOPIC_CTRL, { t: 'start' });
            }}
            fa={fa}
          />

          {/* گفتگوی متنی روی کانال دادهٔ رمزشده */}
          {chatOpen && (
            <div className="absolute top-0 bottom-0 left-0 z-20 w-[300px] max-w-[85%] bg-background/97 backdrop-blur border-r border-border/60 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {fa ? 'گفتگوی جلسه' : 'Session chat'}
                  {e2eeEnabled && <Lock className="h-3 w-3 text-emerald-500" />}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setChatOpen(false)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chats.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-10">
                    {fa ? 'هنوز پیامی نیست — اولین پیام را بنویسید.' : 'No messages yet — say hello.'}
                  </div>
                )}
                {chats.map((c) => (
                  <div key={c.id} className="text-xs">
                    <div className={`inline-block max-w-[90%] rounded-xl px-3 py-2 leading-5 ${c.mine ? 'bg-primary/15' : 'bg-secondary/60 border border-border/40'}`}>
                      <div className="font-medium text-[10px] opacity-70 mb-0.5">{c.name}</div>
                      <div className="break-words">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border/50 flex gap-2">
                <Input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendChat();
                  }}
                  placeholder={fa ? 'پیام…' : 'Message…'}
                  className="h-9 text-xs"
                />
                <Button size="sm" className="h-9" onClick={sendChat}>
                  {fa ? 'ارسال' : 'Send'}
                </Button>
              </div>
            </div>
          )}

          <RoomAudioRenderer />

          {/* اعلان پایان جلسه */}
          {(endedByHost || sessionStatus === 'ended') && (
            <div className="absolute inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-6">
              <Card className="max-w-md w-full glass-surface border-border/60 text-center">
                <CardContent className="pt-8 pb-6 space-y-4">
                  <div className="mx-auto h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                    <LogOut className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-thin">{fa ? 'پخش زنده پایان یافت' : 'The live session has ended'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {fa ? 'از همراهی شما سپاسگزاریم. بازخورد و پرسش‌های خود را در بخش دیدگاه‌های مقاله بنویسید.' : 'Thank you for joining. Please leave questions in the article comments.'}
                  </p>
                  <Button onClick={onLeave} className="gap-1.5">
                    <ArrowRight className="h-4 w-4" />
                    {fa ? 'بازگشت به جلسات' : 'Back to sessions'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* اعلان قطع اتصال */}
          {disconnected && !endedByHost && (
            <div className="absolute inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-6">
              <Card className="max-w-md w-full glass-surface border-border/60 text-center">
                <CardContent className="pt-8 pb-6 space-y-4">
                  <div className="mx-auto h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                    <WifiOff className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-thin">{fa ? 'اتصال شما قطع شد' : 'You were disconnected'}</h3>
                  <p className="text-sm text-muted-foreground">{fa ? 'می‌توانید دوباره به جلسه وصل شوید.' : 'You can rejoin the session.'}</p>
                  <Button onClick={onLeave} variant="outline">
                    {fa ? 'بازگشت' : 'Back'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </LiveKitRoom>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// بدنهٔ داخلی اتاق (داخل LiveKitRoom — به Context دسترسی دارد)
// ————————————————————————————————————————————————————————————————
function RoomBody({
  room,
  canPublish,
  viewMode,
  slides,
  currentSlideIndex,
  presPage,
  presentation,
  canControl,
  handleSlideChange,
  handlePageChange,
  sessionStatus,
  canStart,
  startedByHost,
  onStart,
  fa,
}: {
  room: Room | null;
  canPublish: boolean;
  viewMode: 'slides' | 'presentation' | 'video';
  slides: SlideItem[];
  currentSlideIndex: number;
  presPage: number;
  presentation?: LivePresentation;
  canControl: boolean;
  handleSlideChange: (i: number) => void;
  handlePageChange: (p: number) => void;
  sessionStatus: string;
  canStart: boolean;
  startedByHost: boolean;
  onStart: () => void;
  fa: boolean;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const currentSlide = slides[Math.min(currentSlideIndex, Math.max(slides.length - 1, 0))];

  return (
    <div className="grid lg:grid-cols-3 gap-4 p-4 min-h-[70vh]">
      {/* ستون اصلی */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        {viewMode === 'slides' && currentSlide && (
          <Card className="glass-surface border-border/60 flex flex-col justify-between overflow-hidden flex-1">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <Badge variant="outline" className="text-[10px] mb-1">
                  {fa ? `اسلاید ${currentSlideIndex + 1} از ${slides.length}` : `Slide ${currentSlideIndex + 1} of ${slides.length}`}
                </Badge>
                <CardTitle className="text-lg font-[IRANSharp]">
                  {(fa ? currentSlide.title_fa : currentSlide.title_en) || (fa ? 'اسلاید بدون عنوان' : 'Untitled Slide')}
                </CardTitle>
              </div>
              {!canPublish && (
                <Badge variant="secondary" className="text-xs bg-accent/10 text-accent gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{fa ? 'همگام‌سازی زنده با سخنران' : 'Synced with speaker'}</span>
                </Badge>
              )}
            </CardHeader>

            <CardContent className="py-6 flex-1 overflow-y-auto max-h-[560px]">
              <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                <div data-color-mode="light">
                  <MDEditor.Markdown source={(fa ? currentSlide.body_fa : currentSlide.body_en) || ''} />
                </div>
              </div>
            </CardContent>

            {canPublish && (
              <div className="p-3 bg-secondary/30 border-t border-border/40 flex items-center justify-between">
                <Button size="sm" variant="outline" disabled={currentSlideIndex <= 0} onClick={() => handleSlideChange(currentSlideIndex - 1)} className="gap-1">
                  <ChevronRight className="h-4 w-4" />
                  <span>{fa ? 'اسلاید قبلی' : 'Previous'}</span>
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  {currentSlideIndex + 1} / {slides.length}
                </span>
                <Button size="sm" variant="outline" disabled={currentSlideIndex >= slides.length - 1} onClick={() => handleSlideChange(currentSlideIndex + 1)} className="gap-1">
                  <span>{fa ? 'اسلاید بعدی' : 'Next'}</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        )}

        {viewMode === 'presentation' && presentation?.url && (
          <>
            {presentation.kind === 'pdf' && (
              <div className="flex-1 flex flex-col">
                <PdfViewer url={presentation.url} page={presPage} canControl={canControl} onPageChange={handlePageChange} />
                {canControl && (
                  <div className="text-[10px] text-muted-foreground mt-1.5 text-center">
                    {fa ? 'کلیدهای جهتنما (→/←) برای جابه‌جایی صفحه' : 'Use arrow keys to change pages'}
                  </div>
                )}
              </div>
            )}
            {presentation.kind === 'image' && (
              <Card className="glass-surface border-border/60 overflow-hidden flex-1">
                <CardContent className="p-4 flex items-center justify-center bg-[#3d3d3d] min-h-[400px]">
                  <img src={presentation.url} alt={presentation.name || 'presentation'} className="max-w-full max-h-[600px] object-contain rounded shadow-2xl" />
                </CardContent>
              </Card>
            )}
            {presentation.kind === 'pptx' && (
              <Card className="glass-surface border-border/60 p-8 text-center flex-1 flex flex-col items-center justify-center gap-3">
                <FileText className="h-12 w-12 text-primary/50" />
                <h3 className="text-lg font-thin">{fa ? 'ارائهٔ پاورپوینت' : 'PowerPoint presentation'}</h3>
                <p className="text-sm text-muted-foreground max-w-md leading-6">
                  {fa
                    ? 'برای نمایش کاملاً همگام، فایل را به PDF تبدیل کنید و دوباره آپلود کنید. فعلاً می‌توانید فایل را دانلود و همراه با گفتگو دنبال کنید.'
                    : 'For fully synchronized display, convert the file to PDF and re-upload. For now you can download and follow along.'}
                </p>
                <Button asChild variant="outline" className="gap-1.5">
                  <a href={presentation.url || '#'} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" />
                    {fa ? 'دانلود فایل ارائه' : 'Download presentation'}
                  </a>
                </Button>
              </Card>
            )}
          </>
        )}

        {viewMode === 'video' && (
          <div className="h-[75vh] lg:h-full min-h-[480px]">
            <VideoConference />
          </div>
        )}
      </div>

      {/* ستون کناری: ویدیوی کوچک + شرکت‌کنندگان */}
      <div className="lg:col-span-1 flex flex-col gap-3">
        {viewMode !== 'video' && (
          <div className="h-[300px] rounded-xl overflow-hidden border border-border/50 bg-background/50">
            <VideoConference />
          </div>
        )}

        <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              {fa ? `شرکت‌کنندگان (${participants.length + 1})` : `Participants (${participants.length + 1})`}
            </span>
            {canStart && sessionStatus === 'scheduled' && !startedByHost && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={onStart}>
                <PlayCircle className="h-3.5 w-3.5" />
                {fa ? 'شروع' : 'Start'}
              </Button>
            )}
          </div>
          <ul className="space-y-1.5 max-h-[180px] overflow-y-auto">
            <li className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-background/60 border border-border/40">
              <span className="flex items-center gap-1.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="truncate">{localParticipant.name || (fa ? 'شما' : 'You')}</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {roleLabel(localParticipant.attributes?.role ?? parsedRole(localParticipant.metadata), fa)}
                </Badge>
              </span>
            </li>
            {participants.map((p) => (
              <li key={p.identity} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-background/60 border border-border/40">
                <span className="flex items-center gap-1.5 truncate">
                  <span className={`h-1.5 w-1.5 rounded-full ${p.isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-foreground/20'}`} />
                  <span className="truncate">{p.name || p.identity.slice(0, 8)}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {roleLabel(p.attributes?.role ?? parsedRole(p.metadata), fa)}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 text-xs text-muted-foreground leading-5">
          <div className="font-semibold text-foreground mb-1">{fa ? 'آداب کارگاه زنده «کاغذ و باد»:' : 'Live workshop etiquette:'}</div>
          {fa
            ? 'نویسنده ۱۰ دقیقه ارائه می‌کند و ۵۰ دقیقه می‌شنود. اسلایدها/ارائه با مصرف اینترنت نزدیک به صفر، بومی روی دستگاه شما رندر می‌شوند.'
            : 'The author presents for 10 min and listens for 50. Slides render natively on your device with near-zero network overhead.'}
          <div className="mt-2 text-[10px] text-accent">
            {fa ? 'همگام‌سازی از طریق کانال دادهٔ LiveKit' : 'Sync runs over the LiveKit data channel'}
            {room && <span> — {fa ? 'درون‌اتاق و رمزشده' : 'in-room & encrypted'}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveRoom;
