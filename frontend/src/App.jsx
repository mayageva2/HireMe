import React, { useState, useEffect } from 'react';
import { Login, SignUp, getCurrentUser, logout, isExplicitTargetRole } from './AuthComponents';
import Dashboard from './components/Dashboard';
import InterviewPage from './InterviewPage';
import HRFlashcards from './components/HRFlashCards';
import TechFlashcards from './components/TechFlashCards';
import CVBuilder from './components/CVBuilder';
import InterviewSetup from './components/InterviewSetup';
import { AVATAR_CONTEXT_URL, LIVEKIT_TOKEN_URL } from './config';

function App() {
  const [authScreen, setAuthScreen] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [roomToken, setRoomToken] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [feedbackRoom, setFeedbackRoom] = useState(null);
  const [avatarContext, setAvatarContext] = useState(null);
  const [mainView, setMainView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingInterview, setIsStartingInterview] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserProfile(user);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.log('No active session found');
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleStartInterview = async ({ jobDescription } = {}) => {
    setIsStartingInterview(true);
    try {
      const profile = (await getCurrentUser()) || userProfile;
      const fallbackContext = {
        name: profile?.fullName || 'Candidate',
        role: profile?.profession || 'General Position',
      };

      let context = fallbackContext;
      if (profile?.userId && profile?.sortKey) {
        const contextUrl = `${AVATAR_CONTEXT_URL}?userId=${encodeURIComponent(profile.userId)}&sortKey=${encodeURIComponent(profile.sortKey)}`;
        try {
          const contextRes = await fetch(contextUrl);
          if (contextRes.ok) {
            context = await contextRes.json();
            console.log('Avatar context from Lambda:', context);
          } else {
            console.warn('GetAvatarContext failed, using Cognito profile fallback');
          }
        } catch (contextErr) {
          console.warn('GetAvatarContext unavailable, using Cognito profile fallback:', contextErr);
        }
      }

      // Only override DynamoDB when the user saved a real title in the dashboard.
      if (isExplicitTargetRole(profile?.profession)) {
        context = { ...context, role: profile.profession };
      }

      const jobRequirements = (jobDescription || '').trim().slice(0, 6000);
      if (jobRequirements) {
        context = { ...context, jobRequirements };
      }

      const tokenRes = await fetch(LIVEKIT_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          userId: profile?.userId,
          sortKey: profile?.sortKey,
          jobRequirements,
        }),
      });
      if (!tokenRes.ok) {
        throw new Error(`LiveKit token request failed (${tokenRes.status})`);
      }

      const data = await tokenRes.json();
      if (!data?.token) {
        throw new Error('LiveKit token response did not include a token');
      }
      setAvatarContext(context);
      setRoomToken(data.token);
      setRoomName(data.room || null);
      setMainView('interview');
    } catch (err) {
      console.error('Error starting interview:', err);
      const detail = err?.message || String(err);
      alert(
        `Could not start the interview session.\n\n${detail}\n\n` +
          'Check your network connection. The Python agent (hireme-agent) only needs to be running after you join the room.'
      );
    } finally {
      setIsStartingInterview(false);
    }
  };

  const handleFinishInterview = () => {
    setFeedbackRoom(roomName);
    setRoomToken(null);
    setRoomName(null);
    setMainView('feedback');
  };

  const handleShowFeedbackHistory = () => {
    setFeedbackRoom(null);
    setMainView('feedback');
  };

  const handleLoginSuccess = (profile) => {
    if (profile) {
      setUserProfile(profile);
      setIsLoggedIn(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggedIn(false);
      setUserProfile(null);
      setRoomToken(null);
      setRoomName(null);
      setAvatarContext(null);
      setMainView('dashboard');
      setAuthScreen('login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080e1c] flex items-center justify-center">
        <div className="text-[#5bf4de] font-black text-2xl animate-pulse tracking-tighter">
          HireMe
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      {!isLoggedIn ? (
        <main className="app-main">
          <section className="app-form-section">
            <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
              <div
                style={{
                  color: '#5bf4de',
                  fontWeight: '900',
                  fontSize: '1.5rem',
                  marginBottom: '2.5rem',
                  letterSpacing: '-1px',
                }}
              >
                HireMe
              </div>

              {authScreen === 'login' ? (
                <Login onSwitch={() => setAuthScreen('signup')} onSuccess={handleLoginSuccess} />
              ) : (
                <SignUp onSwitch={() => setAuthScreen('login')} />
              )}
            </div>
          </section>

          <section className="app-video-section">
            <div className="app-video-overlay" aria-hidden />
            <video
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
            >
              <source src="/handshake%20(1).mp4" type="video/mp4" />
            </video>
          </section>
        </main>
      ) : (
        <>
          {mainView === 'dashboard' ? (
            <Dashboard
              user={userProfile}
              onStartInterview={() => setMainView('interview_setup')}
              isStartingInterview={isStartingInterview}
              onShowHR={() => setMainView('hr_questions')} 
              onShowTech={() => setMainView('tech_questions')}
              onShowCV={() => setMainView('cv_builder')}
              onShowFeedback={handleShowFeedbackHistory}
              onLogout={handleLogout}
              onProfileUpdate={setUserProfile}
            />
          ) : mainView === 'hr_questions' ? (
            <div className="min-h-screen bg-[#080e1c] pt-20">
              <button 
                onClick={() => setMainView('dashboard')}
                className="ml-10 mb-6 flex items-center gap-2 text-[#5bf4de] font-bold transition-all duration-300"
                style={{ transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'drop-shadow(0 0 8px #5bf4de)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                  e.currentTarget.style.color = '#5bf4de';
                }}
              >
                <span className="material-symbols-outlined">arrow_back</span> Back to Dashboard
              </button>
              <HRFlashcards />
            </div>
          ) : mainView === 'tech_questions' ? (
            <div className="min-h-screen bg-[#080e1c] pt-20">
              <button 
                onClick={() => setMainView('dashboard')}
                className="ml-10 mb-6 flex items-center gap-2 text-[#5bf4de] font-bold transition-all duration-300"
                style={{ transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'drop-shadow(0 0 8px #5bf4de)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                  e.currentTarget.style.color = '#5bf4de';
                }}
              >
                <span className="material-symbols-outlined">arrow_back</span> Back to Dashboard
              </button>
              <TechFlashcards />
            </div>
          ) : mainView === 'cv_builder' ? (
            <CVBuilder
              onBack={() => setMainView('dashboard')}
              onLogout={handleLogout}
            />
          ) : mainView === 'interview_setup' ? (
            <InterviewSetup
              defaultRole={userProfile?.profession}
              isStarting={isStartingInterview}
              onBack={() => setMainView('dashboard')}
              onStart={handleStartInterview}
            />
          ) : mainView === 'feedback' ? (
            <InterviewFeedback
              roomName={feedbackRoom}
              onBack={() => setMainView('dashboard')}
              onLogout={handleLogout}
            />
          ) : (
            <InterviewPage
              token={roomToken}
              avatarContext={avatarContext}
              onBack={() => setMainView('dashboard')}
              onLogout={handleLogout}
              onFinish={handleFinishInterview}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
