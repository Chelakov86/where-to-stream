import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch, mockTitleDetails } from '../helpers/api-mock';

test.describe('Visual Regression', () => {
  test('should match home page screenshot', async ({ homePage }) => {
    await expect(homePage.pageTitle).toBeVisible();

    // Take screenshot
    await expect(homePage.page).toHaveScreenshot('home-page.png', {
      fullPage: true,
    });
  });

  test('should match search results screenshot', async ({ homePage, page }) => {
    await mockSearch(page);

    await homePage.search('test');
    await homePage.waitForResults();

    await expect(homePage.resultsList).toBeVisible();

    // Take screenshot of results
    await expect(homePage.page).toHaveScreenshot('search-results.png', {
      fullPage: true,
    });
  });

  test('should match result details screenshot', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    const resultDetailsPage = new (await import('../pages/ResultDetailsPage')).ResultDetailsPage(
      page
    );
    await resultDetailsPage.waitForDetails();

    // Take screenshot of details
    await expect(resultDetailsPage.detailsSection).toHaveScreenshot('result-details.png');
  });

  test('should match error state screenshot', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await homePage.search('test');
    await homePage.waitForError();

    // Take screenshot of error state
    await expect(homePage.errorBanner).toHaveScreenshot('error-banner.png');
  });

  test('should match filters panel screenshot', async ({ homePage }) => {
    await homePage.toggleFilters();
    await expect(homePage.filterSection).toBeVisible();

    // Take screenshot of filters
    await expect(homePage.filterSection).toHaveScreenshot('filters-panel.png');
  });

  test('should match autocomplete screenshot', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      const url = new URL(route.request().url());
      const mode = url.searchParams.get('mode');

      if (mode === 'autocomplete') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            page: 1,
            totalPages: 1,
            totalResults: 3,
            results: [
              { id: 1, type: 'movie', title: 'Test Movie 1', year: 2020 },
              { id: 2, type: 'movie', title: 'Test Movie 2', year: 2021 },
              { id: 3, type: 'tv', title: 'Test TV Show', year: 2022 },
            ],
          }),
        });
      }
    });

    await homePage.typeSearchQuery('test');
    await homePage.waitForAutocomplete();

    // Take screenshot of autocomplete
    await expect(homePage.autocompleteList).toHaveScreenshot('autocomplete-list.png');
  });

  test('should match mobile viewport screenshot', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(homePage.pageTitle).toBeVisible();

    // Take screenshot of mobile view
    await expect(homePage.page).toHaveScreenshot('home-page-mobile.png', {
      fullPage: true,
    });
  });

  test('should match tablet viewport screenshot', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(homePage.pageTitle).toBeVisible();

    // Take screenshot of tablet view
    await expect(homePage.page).toHaveScreenshot('home-page-tablet.png', {
      fullPage: true,
    });
  });

  test('should match desktop viewport screenshot', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(homePage.pageTitle).toBeVisible();

    // Take screenshot of desktop view
    await expect(homePage.page).toHaveScreenshot('home-page-desktop.png', {
      fullPage: true,
    });
  });

  test('should match no results state screenshot', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 0,
          totalResults: 0,
          results: [],
        }),
      });
    });

    await homePage.search('nonexistent');
    await homePage.waitForSearchComplete();

    await expect(homePage.noResultsMessage).toBeVisible();

    // Take screenshot of no results state
    await expect(homePage.page).toHaveScreenshot('no-results.png', {
      fullPage: true,
    });
  });
});
