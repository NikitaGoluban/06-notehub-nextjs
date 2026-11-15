import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  testIgnore: '**/live/**',
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node tests/helpers/mock-api.cjs',
      url: 'http://127.0.0.1:4010/__test/health',
      reuseExistingServer: false,
    },
    {
      command:
        'node --require ./tests/helpers/redirect-api.cjs node_modules/next/dist/bin/next start --hostname 127.0.0.1',
      url: 'http://127.0.0.1:3000',
      env: { NOTEHUB_TEST_API_ORIGIN: 'http://127.0.0.1:4010' },
      reuseExistingServer: false,
    },
  ],
});
