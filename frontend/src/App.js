import React, { useState } from 'react';
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
  const [token] = useState("YOUR_HARDCODED_TOKEN_FOR_NOW");

  const handleLoginSuccess = (profile) => {
    setUserProfile(profile);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} authService={authService} />;
  }

  return (
    <>
      {view === 'dashboard' ? (
        <Dashboard user={userProfile} onStartInterview={() => setView('interview')} />
      ) : (
        <InterviewPage token={token} onBack={() => setView('dashboard')} />
      )}
    </>
  );
}

export default App;