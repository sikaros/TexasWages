// Playwright config for the TexasWages Ext JS E2E suite.
//
// The dev server (`sencha app watch`, http://localhost:1841) is started and torn
// down OUTSIDE of Playwright, so there is deliberately NO `webServer` block here.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/e2e',

  // Ext JS boot + chart layout can take a moment; keep timeouts generous but bounded.
  timeout: 60000,
  expect: { timeout: 15000 },

  // Each spec reloads the app in a fresh context, so state (filters/selection)
  // never leaks between tests. Run serially to keep the single dev server calm.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:1841',
    trace: 'on-first-retry',
    actionTimeout: 20000,
    navigationTimeout: 60000
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
