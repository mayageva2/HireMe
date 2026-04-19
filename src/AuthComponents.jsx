import React, { useState } from 'react';
import styled from 'styled-components';
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth';

const InputGroup = styled.div` margin-bottom: 1.2rem; `;
const Label = styled.label` font-size: 0.7rem; color: #a5abbd; display: block; margin-bottom: 0.5rem; text-transform: uppercase; `;
const Input = styled.input`
  width: 100%; padding: 0.85rem; background: #000; border: 1px solid #424858;
  border-radius: 10px; color: white; font-size: 0.95rem;
  &:focus { outline: none; border-color: #5bf4de; }
`;
const PrimaryButton = styled.button`
  width: 100%; padding: 0.85rem; background: linear-gradient(to right, #5bf4de, #11c9b4);
  color: #003a33; font-weight: 800; border-radius: 10px; border: none; cursor: pointer;
  margin-top: 0.5rem; transition: transform 0.1s;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: scale(0.98); }
`;

export const Login = ({ onSwitch, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. בדיקה מה יוצא מהאינפוטים
    const user = email.trim();
    const pass = password.trim();

    console.log("--- DEBUG START ---");
    console.log("Input Email:", email);
    console.log("Processed Username for Cognito:", user);
    console.log("Password Length:", pass.length);
    console.log("App Client ID being used:", 'sb893tp11fni580ojjfpp9u52');

    try {
      const result = await signIn({ username: user, password: pass });
      console.log("Login Result:", result);
      onSuccess();
    } catch (err) {
      // 2. פירוט השגיאה המלאה מהשרת של אמזון
      console.error("--- COGNITO ERROR ---");
      console.error("Error Name:", err.name);
      console.error("Error Message:", err.message);
      console.error("Full Error Object:", err);
      
      // הודעה חכמה למשתמש לפי סוג השגיאה
      if (err.name === 'UserNotConfirmedException') {
        alert("המשתמש קיים אבל לא מאומת! כנסי ל-AWS ותלחצי על Confirm User.");
      } else if (err.name === 'NotAuthorizedException') {
        alert("סיסמה לא נכונה או משתמש חסום.");
      } else if (err.name === 'UserNotFoundException') {
        alert("המשתמש " + user + " בכלל לא קיים ב-User Pool הזה.");
      } else {
        alert("שגיאת מערכת: " + err.message);
      }
    } finally {
      setLoading(false);
      console.log("--- DEBUG END ---");
    }
  };
  return (
    <form onSubmit={handleLogin}>
      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Welcome Back</h1>
      <p style={{ color: '#a5abbd', marginBottom: '2rem' }}>Sign in to continue to HireMe.</p>
      <InputGroup>
        <Label>Email or Username</Label>
        <Input type="text" placeholder="mayage2" onChange={e => setEmail(e.target.value)} required />
      </InputGroup>
      <InputGroup>
        <Label>Password</Label>
        <Input type="password" placeholder="••••••••" onChange={e => setPassword(e.target.value)} required />
      </InputGroup>
      <PrimaryButton type="submit" disabled={loading}>{loading ? 'AUTHENTICATING...' : 'SIGN IN'}</PrimaryButton>
      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#a5abbd', fontSize: '0.85rem' }}>
        New to HireMe? <span style={{ color: '#5bf4de', fontWeight: 'bold', cursor: 'pointer' }} onClick={onSwitch}>Create Account</span>
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
            name: username, // תיקון השגיאה שקיבלת - שליחת שם חובה
            given_name: username 
          } 
        }
      });
      setStep('confirm');
    } catch (err) { alert("שגיאה בהרשמה: " + err.message); }
    finally { setLoading(false); }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const username = email.split('@')[0].trim();
      await confirmSignUp({ username, confirmationCode: code });
      alert("Account verified! You can now sign in.");
      onSwitch();
    } catch (err) { alert("Code is incorrect: " + err.message); }
    finally { setLoading(false); }
  };

  if (step === 'confirm') {
    return (
      <form onSubmit={handleConfirm}>
        <h1 style={{ marginBottom: '1rem' }}>Verify Email</h1>
        <p style={{ color: '#a5abbd', marginBottom: '1.5rem' }}>Enter the code sent to your email.</p>
        <InputGroup>
          <Label>Verification Code</Label>
          <Input placeholder="123456" onChange={e => setCode(e.target.value)} required />
        </InputGroup>
        <PrimaryButton type="submit" disabled={loading}>VERIFY</PrimaryButton>
      </form>
    );
  }

  return (
    <form onSubmit={handleSignUp}>
      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Join HireMe</h1>
      <p style={{ color: '#a5abbd', marginBottom: '2rem' }}>Start your AI interview journey today.</p>
      <InputGroup>
        <Label>Institutional Email</Label>
        <Input type="email" placeholder="name@mta.ac.il" onChange={e => setEmail(e.target.value)} required />
      </InputGroup>
      <InputGroup>
        <Label>Password</Label>
        <Input type="password" placeholder="At least 8 characters" onChange={e => setPassword(e.target.value)} required />
      </InputGroup>
      <PrimaryButton type="submit" disabled={loading}>CREATE ACCOUNT</PrimaryButton>
      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#a5abbd', fontSize: '0.85rem' }}>
        Already a member? <span style={{ color: '#5bf4de', fontWeight: 'bold', cursor: 'pointer' }} onClick={onSwitch}>Sign In</span>
      </p>
    </form>
  );
};