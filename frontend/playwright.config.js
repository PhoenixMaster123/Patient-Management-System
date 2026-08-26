import { defineConfig, devices } from '@playwright/test';

// These specs drive the demo build — the same artifact the Pages workflow
// publishes. VITE_DEMO_ONLY=true makes src/api.js skip the network and serve
// the 15 patients from seed.js out of memory, so the suite needs no gateway,
// no database and no docker-compose. The backend path is covered by the
// RestAssured suite in integration-tests/ instead.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },

  // One browser on purpose. This is a back-office records desk, not a
  // cross-browser product, and a single project keeps the CI job honest.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Build and serve the demo bundle. Reusing an already-running preview locally
  // saves the rebuild between runs; CI always starts its own.
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_DEMO_ONLY: 'true' },
  },
});
