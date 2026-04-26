import React, { useState, useEffect} from 'react';
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-exports';
import { authService } from './services/authService';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import InterviewPage from './InterviewPage';

Amplify.configure(awsConfig);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [roomToken, setRoomToken] = useState(null); // State to store the LiveKit token
  const [view, setView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await authService.getCurrentUser(); 
        if (user) {
          setUserProfile(user);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.log("No active session found");
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  // handle automatic activation
  const handleStartInterview = async () => {
    setIsLoading(true);
    try {
      // Fetch the token from your Lambda (via API Gateway)
      const response = await fetch('https://iexzogfkyuunk7b5sunmodusay0whgku.lambda-url.us-east-1.on.aws/');
      
      if (!response.ok) {
        throw new Error('Failed to fetch token');
      }

      const data = await response.json();
      
      // Save the token in state
      setRoomToken(data.token);
      
      // Switch to the interview view
      setView('interview');
    } catch (err) {
      console.error("Error starting interview:", err);
      alert("Could not connect to the avatar service. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (profile) => {
    setUserProfile(profile);
    setIsLoggedIn(true);
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

  if (!isLoggedIn) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} authService={authService} />;
  }

  return (
    <>
      {view === 'dashboard' ? (
        <Dashboard 
          user={userProfile} 
          onStartInterview={handleStartInterview} 
        />
      ) : (
        <InterviewPage 
          token={roomToken} 
          onBack={() => setView('dashboard')} 
        />
      )}
    </>
  );
}

export default App;