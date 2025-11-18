import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ResultDetailsPage } from '../pages/ResultDetailsPage';
import { setupDefaultMocks } from '../helpers/api-mock';

/**
 * Custom Playwright fixtures
 */

type TestFixtures = {
  homePage: HomePage;
  resultDetailsPage: ResultDetailsPage;
};

export const test = base.extend<TestFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await setupDefaultMocks(page);
    await homePage.goto();
    await use(homePage);
  },

  resultDetailsPage: async ({ page }, use) => {
    const resultDetailsPage = new ResultDetailsPage(page);
    await setupDefaultMocks(page);
    await use(resultDetailsPage);
  },
});

export { expect };
