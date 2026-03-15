import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import { signUp, signIn } from 'aws-amplify/auth';
import awsConfig from './aws-exports';

Amplify.configure(awsConfig);

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profession, setProfession] = useState('');

  // SignUp Logic
  async function handleSignUp() {
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email: email,
            'custom:Profession': profession
          }
        }
      });
      alert('signed up successfully! check email for verification code.');
    } catch (err) { console.log('error signing up', err); }
  }

  // SignIn Logic
  async function handleSignIn() {
    try {
      const user = await signIn({ username: email, password });
      console.log('connection succeded!', user);
    } catch (err) { console.log('error signing in', err); }
  }

  return (
    <div style={{textAlign: 'center', marginTop: '50px'}}>
      <h1>HireMe Authentication</h1>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} /><br/>
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} /><br/>
      <input placeholder="Profession" onChange={e => setProfession(e.target.value)} /><br/>
      <button onClick={handleSignUp}>Sign Up</button>
      <button onClick={handleSignIn}>Sign In</button>
    </div>
  );
}

export default App;