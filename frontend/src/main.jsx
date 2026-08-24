import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './hireme-layout.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { awsConfig } from './aws-config';

Amplify.configure(awsConfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
