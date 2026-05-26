import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleDriveProvider } from './context/GoogleDriveContext.tsx';
import { AlertProvider } from './context/AlertContext.tsx';
import { SchoolProvider } from './context/SchoolContext.tsx';

export const CLIENT_ID = "974466081867-16jf202lss43nh2bq336if1liuqdohgq.apps.googleusercontent.com"; // Replace with your actual Client ID

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <AlertProvider>
        <SchoolProvider>
          <GoogleDriveProvider>
            <App />
          </GoogleDriveProvider>
        </SchoolProvider>
      </AlertProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
