import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import { signUp, signIn, confirmSignUp } from 'aws-amplify/auth'; 
import awsConfig from './aws-exports';
import InterviewPage from './InterviewPage';

Amplify.configure(awsConfig);

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [token, setToken] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // SignUp Logic
  async function handleSignUp() {
    try {
      const usernameFromEmail = email.split('@')[0];
      await signUp({
        username: usernameFromEmail,
        password,
        options: {
          userAttributes: {
            email: email,
            'custom:profession': profession,
            name: fullName
          }
        }
      });
      alert('signed up successfully! check email for verification code.');
      setShowConfirm(true);
    } catch (err) { console.log('error signing up', err); }
  }

  async function handleConfirm() {
    try {
      const usernameFromEmail = email.split('@')[0];
      await confirmSignUp({ username: usernameFromEmail, confirmationCode: authCode });
      alert('Confirmed! Now you can Sign In.');
      setShowConfirm(false);
    } catch (err) { console.log('Confirm error:', err); }
  }

  // SignIn Logic
  async function handleSignIn() {
    try {
      const usernameFromEmail = email.split('@')[0];
      await signIn({ username: usernameFromEmail, password });
      
      const myToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6ImludGVydmlldy1yb29tIiwiY2FuUHVibGlzaCI6dHJ1ZSwiY2FuU3Vic2NyaWJlIjp0cnVlLCJjYW5QdWJsaXNoRGF0YSI6dHJ1ZX0sInN1YiI6Ik1heWEiLCJpc3MiOiJBUElEVmY1WmNqTnBnek4iLCJuYmYiOjE3NzM4NTU0NjcsImV4cCI6MTc3Mzg3NzA2N30.7GU7owgYLcsrkzIw_eo_JmOP4X1bT0KQHY3nk-4RDuQ"; 
      setToken(myToken);
      setIsLoggedIn(true);
    } catch (err) { console.log('Sign in error:', err); }
  }

  if (isLoggedIn) return <InterviewPage token={token} />;

  return (
   <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>
      <h1>HireMe Authentication</h1>
      {!showConfirm ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      {isRegistering && (
        <>
          <input placeholder="Full Name" onChange={e => setFullName(e.target.value)} />
          <input placeholder="Profession" onChange={e => setProfession(e.target.value)} />
        </>
      )}
      
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />

      <div style={{ marginTop: '10px' }}>
        {isRegistering ? (
          <>
            <button onClick={handleSignUp}>Create Account</button>
            <p onClick={() => setIsRegistering(false)} style={{ cursor: 'pointer', fontSize: '12px', color: 'blue' }}>
              Already have an account? Sign In
            </p>
          </>
        ) : (
          <>
            <button onClick={handleSignIn}>Sign In</button>
            <p onClick={() => setIsRegistering(true)} style={{ cursor: 'pointer', fontSize: '12px', color: 'blue' }}>
              New here? Create an account
            </p>
          </>
        )}
      </div>
    </div>
      ) : (
      <>
        <h3>Enter the code sent to your email:</h3>
        <input placeholder="Verification Code" onChange={e => setAuthCode(e.target.value)} /><br/><br/>
        <button onClick={handleConfirm}>Confirm Account</button>
      </>
     )}
     </div>
  );
}

export default App;