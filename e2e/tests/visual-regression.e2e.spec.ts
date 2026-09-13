import { Page } from '@playwright/test';
import { test, expect } from '../fixtures/test-fixtures';
import { mockEmptySearch, mockSearchError } from '../helpers/api-mock';

/** Wait for data, images and fonts so screenshots are stable. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

test.describe('Visual Regression', () => {
  test('should match home page screenshot', async ({ homePage, page }) => {
    await homePage.waitForResults();
    await settle(page);
    await expect(page).toHaveScreenshot('home-page.png', { fullPage: true });
  });

  test('should match search results screenshot', async ({ homePage, page }) => {
    await homePage.goto('q=test&type=movie');
    await homePage.waitForResults();
    await settle(page);
    await expect(page).toHaveScreenshot('search-results.png', { fullPage: true });
  });

  test('should match title page screenshot', async ({ titlePage, page }) => {
    await titlePage.gotoTitle('movie', 550);
    await titlePage.waitForTitle();
    await settle(page);
    await expect(page).toHaveScreenshot('title-page.png', { fullPage: true });
  });

  test('should match country comparison screenshot', async ({ countriesPage, page }) => {
    await countriesPage.gotoCountries('movie', 550);
    await expect(countriesPage.countryCards).toHaveCount(3);
    await settle(page);
    await expect(page).toHaveScreenshot('countries-page.png', { fullPage: true });
  });

  test('should match saved titles empty state screenshot', async ({ savedPage, page }) => {
    await savedPage.gotoSaved();
    await expect(savedPage.emptyState).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('saved-empty.png', { fullPage: true });
  });

  test('should match services dialog screenshot', async ({ homePage, page }) => {
    await homePage.openServices();
    await expect(homePage.servicesDialog.getByRole('button', { name: 'Netflix' })).toBeVisible();
    await settle(page);
    await expect(homePage.servicesDialog).toHaveScreenshot('services-dialog.png');
  });

  test('should match filters popover screenshot', async ({ homePage, page }) => {
    await homePage.openFilters();
    await expect(homePage.filtersPopover.getByRole('button', { name: 'Action' })).toBeVisible();
    await settle(page);
    await expect(homePage.filtersPopover).toHaveScreenshot('filters-popover.png');
  });

  test('should match autocomplete screenshot', async ({ homePage, page }) => {
    await homePage.typeSearchQuery('test');
    await expect(homePage.suggestions).toHaveCount(3);
    await settle(page);
    await expect(homePage.suggestionList).toHaveScreenshot('autocomplete-list.png');
  });

  test('should match error state screenshot', async ({ homePage, page }) => {
    await mockSearchError(page, 500);
    await homePage.goto();
    await expect(homePage.errorAlert).toBeVisible();
    await settle(page);
    await expect(homePage.errorAlert).toHaveScreenshot('error-state.png');
  });

  test('should match no results state screenshot', async ({ homePage, page }) => {
    await mockEmptySearch(page);
    await homePage.goto('q=test');
    await expect(homePage.emptyState).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('no-results.png', { fullPage: true });
  });

  test('should match mobile viewport screenshot', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await homePage.waitForResults();
    await settle(page);
    await expect(page).toHaveScreenshot('home-page-mobile.png', { fullPage: true });
  });

  test('should match tablet viewport screenshot', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await homePage.waitForResults();
    await settle(page);
    await expect(page).toHaveScreenshot('home-page-tablet.png', { fullPage: true });
  });
});
