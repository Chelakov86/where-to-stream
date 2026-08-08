import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch } from '../helpers/api-mock';
import { sampleTvShow } from '../helpers/test-data';

test.describe('Search History', () => {
  test('should display and toggle search history visibility', async ({ homePage }) => {
    await expect(homePage.searchHistorySection).toBeVisible();
    await expect(homePage.isSearchHistoryExpanded()).resolves.toBeFalsy();

    await homePage.toggleSearchHistory();
    await expect(homePage.isSearchHistoryExpanded()).resolves.toBeTruthy();

    await homePage.toggleSearchHistory();
    await expect(homePage.isSearchHistoryExpanded()).resolves.toBeFalsy();
  });

  test('should show empty state when no history', async ({ homePage }) => {
    await homePage.toggleSearchHistory();

    const emptyMessage = homePage.page.locator('text=No viewed titles yet');
    await expect(emptyMessage).toBeVisible();
  });

  test('should add item to history when viewing result details', async ({ homePage }) => {
    await homePage.viewDetails('test');

    // Check history
    await homePage.toggleSearchHistory();
    const historyCount = await homePage.getSearchHistoryCount();
    expect(historyCount).toBeGreaterThan(0);
  });

  test('should select history item and show details', async ({ homePage }) => {
    const resultDetailsPage = await homePage.viewDetails('test');

    // Now select from history
    await homePage.toggleSearchHistory();
    await homePage.clickSearchHistoryItem(0);

    // Details should be displayed again
    await resultDetailsPage.waitForDetails();
    await expect(resultDetailsPage.detailsSection).toBeVisible();
  });

  test('should remove items and clear all history', async ({ homePage, page }) => {
    await homePage.viewDetails('test');
    // History dedupes by title, so the second search must return a different first result
    await mockSearch(page, [sampleTvShow]);
    await homePage.viewDetails('test2');

    // Remove a single item
    await homePage.toggleSearchHistory();
    const initialCount = await homePage.getSearchHistoryCount();

    await homePage.removeSearchHistoryItem(0);

    // Wait for removal
    await page.waitForTimeout(300);

    const newCount = await homePage.getSearchHistoryCount();
    expect(newCount).toBeLessThan(initialCount);

    // Clear all history
    await homePage.clearSearchHistory();

    // Wait for confirmation and clearing
    await page.waitForTimeout(500);

    const emptyMessage = homePage.page.locator('text=No viewed titles yet');
    await expect(emptyMessage).toBeVisible();
  });
});
