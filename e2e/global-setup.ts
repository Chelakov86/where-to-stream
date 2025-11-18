import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup runs once before all tests
 * This can be used for authentication, database setup, etc.
 */
async function globalSetup(config: FullConfig) {
  // The webServer in playwright.config.ts handles starting the Next.js dev server
  // This file can be used for additional setup if needed

  // Example: Set up test data, authenticate, etc.
  console.log('Global setup completed');
}

export default globalSetup;
