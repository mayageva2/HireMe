import React, { useState } from 'react';

const AuthPage = ({ onLoginSuccess, authService }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuthAction = async () => {
    try {
      if (showConfirm) {
        await authService.handleConfirm(email, authCode);
        alert('Confirmed! Now you can Sign In.');
        setShowConfirm(false);
      } else if (isRegistering) {
        await authService.handleSignUp(email, password, fullName, profession);
        setShowConfirm(true);
      } else {
        const user = await authService.handleSignIn(email, password);
        onLoginSuccess(user);
      }
    } catch (err) {
      console.error("Auth Error:", err);
      alert(err.message);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>
      <h1>HireMe</h1>
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
          <button onClick={handleAuthAction}>{isRegistering ? 'Create Account' : 'Sign In'}</button>
          <p onClick={() => setIsRegistering(!isRegistering)} style={{ cursor: 'pointer', color: 'blue', fontSize: '12px' }}>
            {isRegistering ? 'Already have an account? Sign In' : 'New here? Create an account'}
          </p>
        </div>
      ) : (
        <>
          <h3>Check your email for the code:</h3>
          <input placeholder="Code" onChange={e => setAuthCode(e.target.value)} />
          <button onClick={handleAuthAction}>Confirm</button>
        </>
      )}
    </div>
  );
};

export default AuthPage;