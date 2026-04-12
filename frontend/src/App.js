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
  const [view, setView] = useState('dashboard');
  const [token] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6ImludGVydmlldy1yb29tIiwiY2FuUHVibGlzaCI6dHJ1ZSwiY2FuU3Vic2NyaWJlIjp0cnVlLCJjYW5QdWJsaXNoRGF0YSI6dHJ1ZX0sInN1YiI6Ik1heWEiLCJpc3MiOiJBUElEVmY1WmNqTnBnek4iLCJuYmYiOjE3NzU5NzUzMDEsImV4cCI6MTc3NTk5NjkwMX0.myyVaBg3xBWTLlFNYvULvr_RvEtKOjG6_yczWkaeNd0");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Assuming your authService has a getCurrentUser method
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
          onStartInterview={() => setView('interview')}
        />
      ) : (
        <InterviewPage token={token} onBack={() => setView('dashboard')} />
      )}
    </>
  );
}

export default App;