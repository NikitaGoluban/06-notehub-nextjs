import { defineConfig, devices } from '@playwright/test';

process.loadEnvFile('.env.local');

export default defineConfig({
  testDir: './tests',
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
