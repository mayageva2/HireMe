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
  const queryParams = new URLSearchParams(window.location.search);
  const hasToken = queryParams.has("token");
  const [view, setView] = useState(hasToken ? 'interview' : 'dashboard');
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
        <InterviewPage onBack={() => setView('dashboard')} />
      )}
    </>
  );
}

export default App;