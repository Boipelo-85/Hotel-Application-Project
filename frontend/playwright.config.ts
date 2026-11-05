import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/navigation',
  timeout: 30000,
  expect: { timeout: 10000 },
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'msedge', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
