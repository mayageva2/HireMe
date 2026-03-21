import React, { useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box; /* מבטיח שכל האלמנטים יישארו בתוך הגבולות שלהם */
  }

  body, html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden; /* מונע כל סוג של גלילה */
    background-color: #080e1c;
  }

  #root {
    height: 100%;
    width: 100%;
  }
`;

const theme = {
  background: "#080e1c",
  surface: "#12192a",
  primary: "#5bf4de",
  text: "#e0e5f9",
  textMuted: "#a5abbd",
  outline: "#424858"
};

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background-color: ${theme.background};
  color: ${theme.text};
  font-family: 'Inter', sans-serif;
  position: fixed; /* נועל את הכל למקום */
  top: 0;
  left: 0;
`;

const Nav = styled.nav`
  height: 65px; /* צמצמתי מעט כדי לתת יותר מקום לטופס */
  width: 100%;
  z-index: 50;
  background: #080e1c;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(91, 244, 222, 0.1);
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  width: 100%;
  overflow: hidden;
`;

const FormSection = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: ${theme.background};
  padding: 0 2rem;
  
  @media (min-width: 1024px) { 
    width: 40%; 
    padding: 0 4rem; 
  }
`;

const VideoSection = styled.section`
  display: none;
  position: relative;
  background: #000;
  height: 100%;
  
  @media (min-width: 1024px) { 
    display: block; 
    flex: 1; 
  }
`;

const InputGroup = styled.div`
  margin-bottom: 1rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.85rem;
  background: #000;
  border: 1px solid ${theme.outline};
  border-radius: 10px;
  color: white;
  font-size: 0.95rem;
  &:focus { outline: none; border-color: ${theme.primary}; }
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 0.85rem;
  background: linear-gradient(to right, ${theme.primary}, #11c9b4);
  color: #003a33;
  font-weight: 800;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  box-shadow: 0 0 15px rgba(91, 244, 222, 0.2);
  margin-top: 0.5rem;
`;

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <>
      <GlobalStyle />
      <Container>
        <Nav>
          <div style={{ color: theme.primary, fontWeight: '900', fontSize: '1.3rem', letterSpacing: '-1px' }}>HireMe</div>
          <PrimaryButton style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem', marginTop: 0 }}>Sign Up</PrimaryButton>
        </Nav>

        <Main>
          <FormSection>
            <div style={{ maxWidth: '360px', margin: '0 auto', width: '100%' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', lineHeight: '1.1' }}>
                Elevate Your Career
              </h1>
              <p style={{ color: theme.textMuted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Access your AI-driven interview training dashboard.
              </p>
              
              <form onSubmit={(e) => e.preventDefault()}>
                <InputGroup>
                  <label style={{ fontSize: '0.7rem', color: theme.textMuted, display: 'block', marginBottom: '0.3rem' }}>EMAIL ADDRESS</label>
                  <Input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </InputGroup>
                
                <InputGroup>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.7rem', color: theme.textMuted, marginBottom: '0.3rem' }}>PASSWORD</label>
                    <a href="#" style={{ color: theme.primary, fontSize: '0.7rem', textDecoration: 'none' }}>Forgot Password?</a>
                  </div>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </InputGroup>
                
                <PrimaryButton type="submit">SIGN IN</PrimaryButton>
              </form>

              <p style={{ textAlign: 'center', marginTop: '1.2rem', color: theme.textMuted, fontSize: '0.8rem' }}>
                New to HireMe? <a href="#" style={{ color: theme.primary, fontWeight: 'bold', textDecoration: 'none' }}>Create Account</a>
              </p>
            </div>
          </FormSection>

          <VideoSection>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${theme.background}, transparent 25%)`, zIndex: 1 }} />
            <video autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}>
              <source src="/handshake (1).mp4" type="video/mp4" />
            </video>
          </VideoSection>
        </Main>
      </Container>
    </>
  );
}

export default App;