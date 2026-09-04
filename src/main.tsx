import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AlertProvider } from './context/AlertContext.tsx';
import { SchoolProvider } from './context/SchoolContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
      <SchoolProvider>
        <App />
      </SchoolProvider>
    </AlertProvider>
  </StrictMode>,
);
