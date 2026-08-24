import React, { useState } from 'react';
import { signIn, signUp, confirmSignUp, signOut, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

/** DynamoDB HireMe_Table uses the Cognito username for both User id and Sort Key. */
function getDynamoUserKeys(attributes, sub) {
  const email = attributes.email || '';
  const username = email.includes('@')
    ? email.split('@')[0]
    : attributes.preferred_username || attributes.name || sub || '';

  return {
    userId: username,
    sortKey: attributes['custom:sortKey'] || username,
  };
}

export const logout = async () => {
  await signOut();
};

export const getCurrentUser = async () => {
  try {
    const attributes = await fetchUserAttributes();
    const session = await fetchAuthSession();
    const sub = session.tokens?.idToken?.payload?.sub;
    const { userId, sortKey } = getDynamoUserKeys(attributes, sub);

    return {
      fullName: attributes.name || 'User',
      profession: attributes['custom:profession'] || 'Professional',
      email: attributes.email,
      userId,
      sortKey,
    };
  } catch (error) {
    if (error?.name !== 'UserUnAuthenticatedException') {
      console.error('Auth error:', error);
    }
    return null;
  }
};

export const Login = ({ onSwitch, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    let usernameToQuery = email.trim();
    if (usernameToQuery.includes('@')) {
      usernameToQuery = usernameToQuery.split('@')[0];
    }

    try {
      await signIn({
        username: usernameToQuery,
        password: password.trim(),
      });
      const profile = await getCurrentUser();
      onSuccess(profile);
    } catch (err) {
      console.error('Cognito Error:', err);
      if (err.name === 'UserNotConfirmedException') {
        alert('המשתמש לא מאומת במערכת.');
      } else {
        alert('שגיאת התחברות: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} autoComplete="off">
      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Welcome Back</h1>
      <p style={{ color: '#a5abbd', marginBottom: '2rem' }}>Sign in to continue to HireMe.</p>
      <div className="auth-field-group">
        <label className="auth-label">Email or Username</label>
        <input
          className="auth-input"
          type="text"
          name="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          required
        />
      </div>
      <div className="auth-field-group">
        <label className="auth-label">Password</label>
        <input
          className="auth-input"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <button type="submit" className="auth-primary-btn" disabled={loading}>
        {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
      </button>
      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#a5abbd', fontSize: '0.85rem' }}>
        New to HireMe?{' '}
        <span style={{ color: '#5bf4de', fontWeight: 'bold', cursor: 'pointer' }} onClick={onSwitch}>
          Create Account
        </span>
      </p>
    </form>
  );
};

export const SignUp = ({ onSwitch }) => {
  const [step, setStep] = useState('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const username = email.split('@')[0].trim();
      await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
            name: username,
            given_name: username,
          },
        },
      });
      setStep('confirm');
    } catch (err) {
      alert('שגיאה בהרשמה: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const username = email.split('@')[0].trim();
      await confirmSignUp({ username, confirmationCode: code });
      alert('Account verified! You can now sign in.');
      onSwitch();
    } catch (err) {
      alert('Code is incorrect: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm') {
    return (
      <form onSubmit={handleConfirm}>
        <h1 style={{ marginBottom: '1rem' }}>Verify Email</h1>
        <p style={{ color: '#a5abbd', marginBottom: '1.5rem' }}>Enter the code sent to your email.</p>
        <div className="auth-field-group">
          <label className="auth-label">Verification Code</label>
          <input
            className="auth-input"
            placeholder="123456"
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="auth-primary-btn" disabled={loading}>
          VERIFY
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSignUp}>
      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Join HireMe</h1>
      <p style={{ color: '#a5abbd', marginBottom: '2rem' }}>Start your AI interview journey today.</p>
      <div className="auth-field-group">
        <label className="auth-label">Institutional Email</label>
        <input
          className="auth-input"
          type="email"
          placeholder="name@mta.ac.il"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="auth-field-group">
        <label className="auth-label">Password</label>
        <input
          className="auth-input"
          type="password"
          placeholder="At least 8 characters"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="auth-primary-btn" disabled={loading}>
        CREATE ACCOUNT
      </button>
      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#a5abbd', fontSize: '0.85rem' }}>
        Already a member?{' '}
        <span style={{ color: '#5bf4de', fontWeight: 'bold', cursor: 'pointer' }} onClick={onSwitch}>
          Sign In
        </span>
      </p>
    </form>
  );
};
