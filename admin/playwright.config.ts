import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173', browserName: 'chromium', screenshot: 'only-on-failure' },
  projects: [
    { name: '320', use: { viewport: { width: 320, height: 568 } } },
    { name: '768', use: { viewport: { width: 768, height: 1024 } } },
    { name: '1366', use: { viewport: { width: 1366, height: 768 } } },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 120000 },
});