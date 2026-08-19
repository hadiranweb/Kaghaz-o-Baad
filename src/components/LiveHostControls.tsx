import { useCallback, useEffect, useState } from 'react';
import { CircleStop, Mic, MicOff, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  listLiveRoomParticipants,
  muteLiveRoomParticipant,
  removeLiveRoomParticipant,
  listLiveRecordings,
  startLiveRecording,
  stopLiveRecording,
  type LiveRecording,
  type LiveRoomParticipant,
} from '@/lib/backend-api';
import { toast } from 'sonner';

interface Props {
  sessionId: string;
  hostIdentity: string;
}

export default function LiveHostControls({ sessionId, hostIdentity }: Props) {
  const { locale } = useLanguage();
  const fa = locale === 'fa';
  const [participants, setParticipants] = useState<LiveRoomParticipant[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<LiveRecording[]>([]);

  const refresh = useCallback(async () => {
    try {
      const result = await listLiveRoomParticipants(sessionId);
      setParticipants(result.participants);
    } catch {
      // The room may not exist yet or may have just ended; do not interrupt the room UI.
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    void listLiveRecordings(sessionId).then((result) => setRecordings(result.recordings)).catch(() => undefined);
    const timer = window.setInterval(() => {
      void refresh();
      void listLiveRecordings(sessionId).then((result) => setRecordings(result.recordings)).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh, sessionId]);

  const activeRecording = recordings.find((recording) => recording.status === 'starting' || recording.status === 'active');

  const toggleRecording = async () => {
    setBusy('recording');
    try {
      if (activeRecording) {
        await stopLiveRecording(sessionId, activeRecording.egress_id);
        toast.success(fa ? 'ضبط متوقف شد' : 'Recording stopped');
      } else {
        await startLiveRecording(sessionId, 'mp4');
        toast.success(fa ? 'ضبط جلسه آغاز شد' : 'Recording started');
      }
      const result = await listLiveRecordings(sessionId);
      setRecordings(result.recordings);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : fa ? 'عملیات ضبط ناموفق بود' : 'Recording operation failed');
    } finally {
      setBusy(null);
    }
  };

  const removeParticipant = async (identity: string) => {
    setBusy(identity);
    try {
      await removeLiveRoomParticipant(sessionId, identity);
      toast.success(fa ? 'کاربر از اتاق خارج شد' : 'Participant removed');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : fa ? 'حذف کاربر ناموفق بود' : 'Could not remove participant');
    } finally {
      setBusy(null);
    }
  };

  const muteTrack = async (participant: LiveRoomParticipant, trackSid: string, muted: boolean) => {
    setBusy(`${participant.identity}:${trackSid}`);
    try {
      await muteLiveRoomParticipant(sessionId, participant.identity, { trackSid, muted });
      toast.success(fa ? (muted ? 'صدای کاربر قطع شد' : 'صدای کاربر وصل شد') : muted ? 'Participant muted' : 'Participant unmuted');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : fa ? 'تغییر وضعیت صدا ناموفق بود' : 'Could not change mute state');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="glass-surface border-border/60">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {fa ? `مدیریت حاضران (${participants.length})` : `Participants (${participants.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2">
          <div>
            <p className="text-sm">{fa ? 'ضبط جلسه' : 'Session recording'}</p>
            <p className="text-[11px] text-muted-foreground">{activeRecording ? (fa ? 'در حال ضبط' : 'Recording') : fa ? 'متوقف' : 'Stopped'}</p>
          </div>
          <Button size="sm" variant={activeRecording ? 'destructive' : 'default'} disabled={busy !== null} onClick={() => void toggleRecording()}>
            <CircleStop className="h-4 w-4 me-1" />
            {activeRecording ? (fa ? 'توقف' : 'Stop') : (fa ? 'شروع ضبط' : 'Record')}
          </Button>
        </div>
        {recordings.filter((recording) => recording.status === 'completed' && recording.object_url).map((recording) => (
          <a key={recording.id} href={recording.object_url ?? '#'} target="_blank" rel="noreferrer" className="block rounded-xl border border-border/50 px-3 py-2 text-xs text-primary hover:underline">
            {fa ? 'مشاهدهٔ آرشیو جلسه' : 'Open session archive'}
          </a>
        ))}
        {participants.length === 0 ? (
          <p className="text-xs text-muted-foreground">{fa ? 'هنوز کاربری در اتاق نیست.' : 'No participants are connected yet.'}</p>
        ) : participants.map((participant) => (
          <div key={participant.identity} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm truncate">{participant.name || participant.identity}</p>
              <p className="text-[11px] text-muted-foreground truncate">{participant.identity}</p>
            </div>
            <div className="flex items-center gap-1">
              {(participant.tracks ?? []).filter((track) => track.source === 'microphone').map((track) => (
                <Button
                  key={track.sid}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={!track.sid || busy !== null}
                  title={fa ? 'قطع/وصل صدا' : 'Mute/unmute'}
                  onClick={() => track.sid && void muteTrack(participant, track.sid, !track.muted)}
                >
                  {track.muted ? <MicOff className="h-3.5 w-3.5 text-amber-500" /> : <Mic className="h-3.5 w-3.5" />}
                </Button>
              ))}
              {participant.identity !== hostIdentity && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                  disabled={busy !== null}
                  title={fa ? 'خارج‌کردن از اتاق' : 'Remove from room'}
                  onClick={() => void removeParticipant(participant.identity)}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
