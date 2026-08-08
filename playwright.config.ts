import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e/tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['html'], ['list'], ['github']] : [['html'], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Baselines must not depend on the runner's operating system. */
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',

  /* Configure projects for the Chromium engine across viewports. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Only viewport-sensitive specs run on tablet and mobile projects. */
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        browserName: 'chromium',
      },
      testMatch: /(responsive|visual-regression)\.e2e\.spec\.ts/,
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /(responsive|visual-regression)\.e2e\.spec\.ts/,
    },
  ],

  /* Run your local production server before starting the tests */
  webServer: {
    command: 'npm run build && npx cross-env PORT=3001 npm run start',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
});
