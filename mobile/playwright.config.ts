import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  use: { baseURL: 'http://localhost:8081', browserName: 'chromium', screenshot: 'only-on-failure' },
  projects: [
    { name: '320', use: { ...devices['iPhone SE'], viewport: { width: 320, height: 568 } } },
    { name: '375', use: { ...devices['iPhone 13'], viewport: { width: 375, height: 667 } } },
    { name: '414', use: { viewport: { width: 414, height: 896 } } },
    { name: '768', use: { viewport: { width: 768, height: 1024 } } },
  ],
  webServer: { command: 'npx expo start --web', url: 'http://localhost:8081', reuseExistingServer: true, timeout: 120000 },
});