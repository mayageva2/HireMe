import React, { useState } from 'react';
import { 
  LiveKitRoom, 
  AudioConference, 
  ControlBar, 
  useTranscriptions
} from '@livekit/components-react';
import '@livekit/components-styles';

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
      {segments.map((s) => (
        <p key={s.id} style={{ margin: '5px 0' }}>
          <strong style={{ color: '#aaa' }}>{s.participant?.identity || 'User'}:</strong> {s.text}
        </p>
      ))}
    </div>
  );
}

const InterviewPage = ({ token }) => {
    const [isStarted, setIsStarted] = useState(false);
    const serverUrl = "wss://hireme-khyjrqi7.livekit.cloud";

    if (!isStarted) {
        return (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2>Ready to start?</h2>
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
        <div style={{ padding: '20px' }}>
        <h2>Interview Session</h2>
        <LiveKitRoom
            video={true} 
            audio={true}
            token={token}
            serverUrl={serverUrl}
            connect={true}
            data-lk-theme="default"
            onConnected={() => console.log("Connected!")}
            onError={(err) => console.error("Room Error:", err)}
        >
            <AudioConference />
            <ControlBar />
            <LiveTranscription />
        </LiveKitRoom>
        </div>
    );
};

export default InterviewPage;