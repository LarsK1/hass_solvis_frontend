// Version: 0.1.0 — 2025-12-28
import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  retries: 0,
  use: {
    baseURL: 'http://localhost:5500',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx serve . -p 5500',
    port: 5500,
    reuseExistingServer: !process.env.CI,
  },
});
