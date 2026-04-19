import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// חשוב: ה-Amplify חייב להיות מיובא ומוגדר לפני שמרנדרים את האפליקציה
import { Amplify } from 'aws-amplify';

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: 'us-east-1_u56LBJUDL',
            userPoolClientId: 'sb893tp11fni580ojjfpp9u52'
        }
    }
}); 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)