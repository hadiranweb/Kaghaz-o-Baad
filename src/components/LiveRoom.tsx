import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  PreJoin,
  type LocalUserChoices,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LiveKitTokenResponse } from '@/hooks/useLiveKitToken';

interface Props {
  tokenData: LiveKitTokenResponse;
  onLeave?: () => void;
}

export const LiveRoom = ({ tokenData, onLeave }: Props) => {
  const { locale } = useLanguage();
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const isHost = tokenData.role === 'host';

  if (!choices) {
    return (
      <div className="min-h-[600px] bg-background rounded-2xl overflow-hidden border border-[hsl(var(--glass-border))]">
        <PreJoin
          defaults={{
            username: tokenData.name,
            videoEnabled: isHost,
            audioEnabled: isHost,
          }}
          onSubmit={setChoices}
          data-lk-theme="default"
        />
      </div>
    );
  }

  return (
    <div className="h-[80vh] rounded-2xl overflow-hidden border border-[hsl(var(--glass-border))] relative">
      <LiveKitRoom
        serverUrl={tokenData.url}
        token={tokenData.token}
        connect={true}
        video={isHost && choices.videoEnabled}
        audio={isHost && choices.audioEnabled}
        onDisconnected={onLeave}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
        {!isHost && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-foreground/60 bg-background/80 backdrop-blur px-3 py-1 rounded-full">
            {locale === 'fa' ? 'حالت تماشاگر — درخواست صحبت از میزبان' : 'Viewer mode — request to speak'}
          </div>
        )}
      </LiveKitRoom>
    </div>
  );
};