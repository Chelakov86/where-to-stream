import { FullConfig } from '@playwright/test';

/**
 * Global teardown runs once after all tests
 * This can be used for cleanup, database teardown, etc.
 */
async function globalTeardown(config: FullConfig) {
  // The webServer in playwright.config.ts handles stopping the Next.js dev server
  // This file can be used for additional cleanup if needed

  console.log('Global teardown completed');
}

export default globalTeardown;
