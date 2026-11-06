import { ClerkProvider } from '@clerk/clerk-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import '@fontsource-variable/inter';
import '@fontsource-variable/rubik';
import './styles.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <App />
    </ClerkProvider>
  </StrictMode>,
);