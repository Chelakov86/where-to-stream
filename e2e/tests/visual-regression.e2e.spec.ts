import { test, expect } from '../fixtures/test-fixtures';
import {
  mockAutocomplete,
  mockEmptySearch,
  mockImages,
  mockSearchError,
} from '../helpers/api-mock';

test.describe('Visual Regression', () => {
  test('should match home page screenshot', async ({ homePage }) => {
    await expect(homePage.pageTitle).toBeVisible();

    // Take screenshot
    await expect(homePage.page).toHaveScreenshot('home-page.png', {
      fullPage: true,
    });
  });

  test('should match search results screenshot', async ({ homePage, page }) => {
    await mockImages(page);

    await homePage.search('test');
    await homePage.waitForResults();

    await expect(homePage.resultsList).toBeVisible();

    // Take screenshot of results
    await expect(homePage.page).toHaveScreenshot('search-results.png', {
      fullPage: true,
    });
  });

  test('should match result details screenshot', async ({ homePage, page }) => {
    await mockImages(page);
    const resultDetailsPage = await homePage.viewDetails('test');

    // Take screenshot of details
    await expect(resultDetailsPage.detailsSection).toHaveScreenshot('result-details.png');
  });

  test('should match error state screenshot', async ({ homePage, page }) => {
    await mockSearchError(page, 500);

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
    await mockAutocomplete(page);
    await mockImages(page);

    await homePage.typeSearchQuery('test');
    await homePage.waitForAutocomplete();

    // Wait for the mocked results to render before capturing
    await expect(homePage.autocompleteItems).toHaveCount(3);

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

  test('should match no results state screenshot', async ({ homePage, page }) => {
    await mockEmptySearch(page);

    await homePage.search('nonexistent');
    await homePage.waitForSearchComplete();

    await expect(homePage.noResultsMessage).toBeVisible();

    // Take screenshot of no results state
    await expect(homePage.page).toHaveScreenshot('no-results.png', {
      fullPage: true,
    });
  });
});
