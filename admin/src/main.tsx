import { AuthenticateWithRedirectCallback, ClerkProvider } from '@clerk/clerk-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import '@fontsource-variable/inter';
import '@fontsource-variable/rubik';
import './styles.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const isCallbackRoute = window.location.pathname === '/sso-callback';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      {isCallbackRoute ? <AuthenticateWithRedirectCallback /> : <App />}
    </ClerkProvider>
  </StrictMode>,
);
