import { test as base, expect, Page } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { TitlePage } from '../pages/TitlePage';
import { CountriesPage } from '../pages/CountriesPage';
import { SavedPage } from '../pages/SavedPage';
import { setupDefaultMocks } from '../helpers/api-mock';

/**
 * Custom Playwright fixtures.
 * Every page starts in the United States unless a test picks another country.
 */

type TestFixtures = {
  homePage: HomePage;
  titlePage: TitlePage;
  countriesPage: CountriesPage;
  savedPage: SavedPage;
};

async function prepare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('wts.country')) {
      window.localStorage.setItem('wts.country', JSON.stringify('US'));
    }
  });
  await setupDefaultMocks(page);
}

export const test = base.extend<TestFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await prepare(page);
    await homePage.goto();
    await use(homePage);
  },

  titlePage: async ({ page }, use) => {
    await prepare(page);
    await use(new TitlePage(page));
  },

  countriesPage: async ({ page }, use) => {
    await prepare(page);
    await use(new CountriesPage(page));
  },

  savedPage: async ({ page }, use) => {
    await prepare(page);
    await use(new SavedPage(page));
  },
});

export { expect };
