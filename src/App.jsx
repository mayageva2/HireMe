import React, { useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Amplify } from 'aws-amplify';
import { awsConfig } from './aws-config';
Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: 'us-east-1_u56lBJUdL',
            userPoolClientId: 'sb893tp11fni580ojjfpp9u52', // <--- זה ה-App Client ID
            region: 'us-east-1' 
        }
    }
});
import { Login, SignUp } from './AuthComponents';


const GlobalStyle = createGlobalStyle`
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body, html { 
    width: 100%; height: 100%; margin: 0;
    background-color: #080e1c; color: #e0e5f9;
    font-family: 'Inter', -apple-system, sans-serif;
    overflow: hidden;
  }
`;

const Container = styled.div` height: 100vh; width: 100vw; display: flex; flex-direction: column; `;
const Main = styled.main` flex: 1; display: flex; width: 100%; overflow: hidden; `;

const FormSection = styled.section`
  width: 100%; display: flex; flex-direction: column; justify-content: center;
  padding: 0 2rem; z-index: 2; background: #080e1c;
  @media (min-width: 1024px) { width: 40%; padding: 0 4rem; }
`;

const VideoSection = styled.section`
  display: none; position: relative; background: #000; height: 100%;
  @media (min-width: 1024px) { display: block; flex: 1; }
`;

const VideoOverlay = styled.div`
  position: absolute; inset: 0; 
  background: linear-gradient(to right, #080e1c, transparent 40%); 
  z-index: 1;
`;

function App() {
  const [view, setView] = useState('login');

  const handleLoginSuccess = () => {
    alert("Success! Welcome to your Dashboard.");
    // כאן נכניס בעתיד את הניתוב לדף הראיונות
  };

  return (
    <Container>
      <GlobalStyle />
      <Main>
        <FormSection>
          <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
            <div style={{ color: '#5bf4de', fontWeight: '900', fontSize: '1.5rem', marginBottom: '2.5rem', letterSpacing: '-1px' }}>
              HireMe
            </div>
            
            {view === 'login' ? (
              <Login onSwitch={() => setView('signup')} onSuccess={handleLoginSuccess} />
            ) : (
              <SignUp onSwitch={() => setView('login')} />
            )}
          </div>
        </FormSection>
        
        <VideoSection>
          <VideoOverlay />
          <video 
            autoPlay loop muted playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
          >
            <source src="/handshake (1).mp4" type="video/mp4" />
          </video>
        </VideoSection>
      </Main>
    </Container>
  );
}

export default App;