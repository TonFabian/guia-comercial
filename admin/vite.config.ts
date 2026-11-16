import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // SPA: rotas como /sso-callback (callback OAuth do Clerk) resolvem para
  // index.html tanto em dev quanto em `vite preview`. Em produção o host
  // estático deve ter fallback equivalente (ex.: _redirects / vercel.json).
  appType: 'spa',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
});
