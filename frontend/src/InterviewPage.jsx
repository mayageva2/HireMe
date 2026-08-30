import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  LiveKitRoom, 
  ControlBar, 
  ParticipantTile,
  RoomAudioRenderer,
  AudioTrack,
  useTranscriptions,
  useVoiceAssistant,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useRoomContext,
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import '@livekit/components-styles';
import { LIVEKIT_URL } from './config';

function isAvatarParticipant(identity) {
  if (!identity) return false;
  const id = identity.toLowerCase();
  return id.includes('simli') || id.includes('avatar') || id.includes('agent');
}

function InterviewVideoLayout() {
  const { videoTrack: assistantTrack, state } = useVoiceAssistant();
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localCameraTrack = cameraTracks.find((ref) => ref.participant?.isLocal);
  const remoteAvatarTrack = cameraTracks.find(
    (ref) => !ref.participant?.isLocal && isAvatarParticipant(ref.participant?.identity),
  );

  const lastAvatarTrackRef = useRef(null);
  const liveAvatarTrack = assistantTrack ?? remoteAvatarTrack ?? null;
  if (liveAvatarTrack) {
    lastAvatarTrackRef.current = liveAvatarTrack;
  }
  const displayAvatarTrack = liveAvatarTrack ?? lastAvatarTrackRef.current;
  const isWaiting = !displayAvatarTrack && (state === 'connecting' || state === 'initializing');

  return (
    <div
      style={{
        position: 'relative',
        height: 'calc(100vh - 200px)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
      }}
    >
      {displayAvatarTrack ? (
        <>
          <ParticipantTile trackRef={displayAvatarTrack} style={{ width: '100%', height: '100%' }} />
          {(state === 'thinking' || state === 'connecting') && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                padding: '6px 12px',
                borderRadius: 6,
                backgroundColor: 'rgba(0,0,0,0.65)',
                color: '#5bf4de',
                fontSize: 13,
              }}
            >
              {state === 'thinking' ? 'Thinking…' : 'Connecting…'}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            gap: '8px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div>{isWaiting ? 'Connecting avatar…' : 'Waiting for avatar video…'}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            {isWaiting
              ? 'First connection can take 20–40 seconds while Simli and the agent start.'
              : `Status: ${state}`}
          </div>
        </div>
      )}

      {localCameraTrack && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            width: 220,
            height: 165,
            border: '2px solid #5bf4de',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <ParticipantTile trackRef={localCameraTrack} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}

function AvatarAudioPlayback() {
  const { audioTrack: assistantAudio } = useVoiceAssistant();
  const audioTracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
  const avatarAudio = audioTracks.find(
    (ref) => !ref.participant?.isLocal && isAvatarParticipant(ref.participant?.identity),
  );

  return (
    <>
      <RoomAudioRenderer />
      {assistantAudio && <AudioTrack trackRef={assistantAudio} />}
      {avatarAudio && avatarAudio !== assistantAudio && (
        <AudioTrack trackRef={avatarAudio} />
      )}
    </>
  );
}

function LiveTranscription() {
  const segments = useTranscriptions();

  if (!segments || segments.length === 0) {
    return (
      <div style={{ marginTop: '20px', color: '#888', fontStyle: 'italic' }}>
        Waiting for speech (Deepgram STT)...
      </div>
    );
  }

  return (
    <div style={{ 
      marginTop: '20px', 
      padding: '15px', 
      border: '2px solid #00ff00',
      borderRadius: '8px',
      backgroundColor: '#1a1a1a',
      color: 'white',
      minHeight: '100px',
      textAlign: 'left'
    }}>
      <h4 style={{ color: '#00ff00' }}>Live Transcript:</h4>
      {segments.map((s, index) => (
        <p key={s.id ?? `${s.participant?.identity}-${index}`} style={{ margin: '5px 0' }}>
          <strong style={{ color: '#aaa' }}>{s.participant?.identity || 'User'}:</strong> {s.text}
        </p>
      ))}
    </div>
  );
}

/** Mute the user's mic while the agent speaks/thinks — prevents speaker echo without headphones. */
function MicGateWhileAgentSpeaks() {
  const { state } = useVoiceAssistant();
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const micEnabledRef = useRef(null);

  const avatarSpeaking = remoteParticipants.some(
    (p) =>
      p.isSpeaking &&
      (p.identity.includes('agent') ||
        p.identity.includes('simli') ||
        p.identity.includes('avatar'))
  );

  const shouldEnableMic = !avatarSpeaking && state !== 'speaking';

  useEffect(() => {
    if (!localParticipant) return undefined;
    if (micEnabledRef.current === shouldEnableMic) return undefined;

    const applyMicState = () => {
      micEnabledRef.current = shouldEnableMic;
      localParticipant.setMicrophoneEnabled(shouldEnableMic).catch((err) => {
        console.warn('Mic gate toggle failed:', err);
      });
    };

    if (shouldEnableMic) {
      const timer = setTimeout(applyMicState, 400);
      return () => clearTimeout(timer);
    }

    applyMicState();
    return undefined;
  }, [shouldEnableMic, localParticipant]);

  return null;
}

/** Any disconnect exits the page, so hanging up never leaves the user on a dead room. */
function LeaveOnDisconnect({ onDisconnected }) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return undefined;
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room, onDisconnected]);

  return null;
}

/** Leaves the room so the agent's shutdown hook runs and writes the feedback report. */
function EndInterviewButton({ onBeforeEnd, onEnd }) {
  const room = useRoomContext();
  const [isEnding, setIsEnding] = useState(false);

  const handleEnd = async () => {
    setIsEnding(true);
    onBeforeEnd();
    try {
      await room?.disconnect();
    } catch (err) {
      console.warn('Disconnect failed, continuing to feedback:', err);
    }
    onEnd();
  };

  return (
    <button
      type="button"
      onClick={handleEnd}
      disabled={isEnding}
      style={{
        padding: '12px 24px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: isEnding ? 'wait' : 'pointer',
        backgroundColor: '#5bf4de',
        color: '#080e1c',
        border: 'none',
        borderRadius: '8px',
      }}
    >
      {isEnding ? 'Ending…' : 'End Interview & Get Feedback'}
    </button>
  );
}

const InterviewPage = ({ token, avatarContext, onBack, onLogout, onFinish }) => {
    const [isStarted, setIsStarted] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const serverUrl = LIVEKIT_URL;
    // Hanging up returns to the dashboard; only the feedback button opens the report.
    const wantsFeedbackRef = useRef(false);
    const hasExitedRef = useRef(false);
    const requestFeedback = useCallback(() => {
      wantsFeedbackRef.current = true;
    }, []);
    // The button and the disconnect event can both fire; only navigate once.
    const handleExit = useCallback(() => {
      if (hasExitedRef.current) return;
      hasExitedRef.current = true;
      if (wantsFeedbackRef.current) {
        onFinish?.();
      } else {
        onBack?.();
      }
    }, [onBack, onFinish]);
    const roomMetadata = JSON.stringify({
      agent_name: 'my-agent',
      name: avatarContext?.name || 'Candidate',
      role: avatarContext?.role || 'General Position',
      interview_type: avatarContext?.interviewType === 'technical' ? 'technical' : 'hr',
      job_requirements: avatarContext?.jobRequirements || '',
    });

    if (!token) {
        return (
            <div style={{ textAlign: 'center', marginTop: '100px', color: 'white' }}>
                <h2>No Session Token Found</h2>
                <p>Waiting for the Lambda/Manual token to arrive...</p>
                <button onClick={onBack} style={{marginTop: '20px'}}>Go Back</button>
            </div>
        );
    }

    if (!isStarted) {
        return (
        <div style={{ textAlign: 'center', marginTop: '100px', color: 'white' }}>
            <h2>Ready to start?</h2>
            {avatarContext && (
              <p style={{ color: '#a5abbd', marginBottom: '16px' }}>
                <strong style={{ color: '#5bf4de' }}>
                  {avatarContext.interviewType === 'technical' ? 'Technical' : 'HR'} interview
                </strong>
                {' for '}{avatarContext.role}
                {avatarContext.jobRequirements ? ' · based on job description' : ''}
              </p>
            )}
            <button
            onClick={() => setIsStarted(true)}
            style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}
            >
            Join Interview & Enable Mic
            </button>
        </div>
        );
    }

    return (
        <div style={{ padding: '20px', height: '100vh', backgroundColor: '#111', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Interview Session</h2>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: '#a5abbd',
                    border: '1px solid #424858',
                    borderRadius: '6px',
                  }}
                >
                  Log out
                </button>
              )}
            </div>
            {connectionError && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#3b1c1c',
                border: '1px solid #7f1d1d',
                color: '#fca5a5',
                fontSize: '14px',
              }}>
                Could not connect to LiveKit: {connectionError}
                <div style={{ marginTop: '8px', color: '#f87171', fontSize: '12px' }}>
                  The token Lambda and frontend must use the same LiveKit project URL.
                </div>
              </div>
            )}
            <LiveKitRoom
                video={true}
                audio={{
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }}
                token={token}
                serverUrl={serverUrl}
                connect={true}
                options={{
                  metadata: roomMetadata,
                  audioCaptureDefaults: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                  },
                }}
                onConnected={() => {
                  console.log('Frontend joined!');
                  setConnectionError(null);
                }}
                onError={(err) => {
                  console.error('Room Error:', err);
                  setConnectionError(err.message || String(err));
                }}
            >
                <MicGateWhileAgentSpeaks />
                <LeaveOnDisconnect onDisconnected={handleExit} />
                <InterviewVideoLayout />
                <AvatarAudioPlayback />
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <ControlBar controls={{ screenShare: false }} />
                  {onFinish && (
                    <EndInterviewButton onBeforeEnd={requestFeedback} onEnd={handleExit} />
                  )}
                </div>
                <LiveTranscription />
        </LiveKitRoom>
        </div>
    );
};

export default InterviewPage;