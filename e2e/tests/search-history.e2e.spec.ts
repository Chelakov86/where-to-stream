import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch, mockTitleDetails } from '../helpers/api-mock';

test.describe('Search History', () => {
  test('should display search history section', async ({ homePage }) => {
    await expect(homePage.searchHistorySection).toBeVisible();
  });

  test('should toggle search history visibility', async ({ homePage }) => {
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

  test('should add item to history when viewing result details', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    await homePage.search('test');
    await homePage.waitForResults();

    await homePage.clickResultItem(0);

    // Wait for details to load
    const resultDetailsPage = new (await import('../pages/ResultDetailsPage')).ResultDetailsPage(
      page
    );
    await resultDetailsPage.waitForDetails();

    // Check history
    await homePage.toggleSearchHistory();
    const historyCount = await homePage.getSearchHistoryCount();
    expect(historyCount).toBeGreaterThan(0);
  });

  test('should select history item and show details', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    // First, add an item to history
    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    const resultDetailsPage = new (await import('../pages/ResultDetailsPage')).ResultDetailsPage(
      page
    );
    await resultDetailsPage.waitForDetails();

    // Now select from history
    await homePage.toggleSearchHistory();
    await homePage.clickSearchHistoryItem(0);

    // Details should be displayed again
    await resultDetailsPage.waitForDetails();
    await expect(resultDetailsPage.detailsSection).toBeVisible();
  });

  test('should remove item from history', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    // Add item to history
    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    const resultDetailsPage = new (await import('../pages/ResultDetailsPage')).ResultDetailsPage(
      page
    );
    await resultDetailsPage.waitForDetails();

    // Remove from history
    await homePage.toggleSearchHistory();
    const initialCount = await homePage.getSearchHistoryCount();

    await homePage.removeSearchHistoryItem(0);

    // Wait for removal
    await page.waitForTimeout(300);

    const newCount = await homePage.getSearchHistoryCount();
    expect(newCount).toBeLessThan(initialCount);
  });

  test('should clear all history', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    // Add multiple items to history
    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    await homePage.search('test2');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    // Clear history
    await homePage.toggleSearchHistory();
    await homePage.clearSearchHistory();

    // Wait for confirmation and clearing
    await page.waitForTimeout(500);

    const emptyMessage = homePage.page.locator('text=No viewed titles yet');
    await expect(emptyMessage).toBeVisible();
  });

  test('should persist history across page interactions', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    // Add item to history
    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    const resultDetailsPage = new (await import('../pages/ResultDetailsPage')).ResultDetailsPage(
      page
    );
    await resultDetailsPage.waitForDetails();

    // Perform another search
    await homePage.search('test2');
    await homePage.waitForResults();

    // History should still contain the previous item
    await homePage.toggleSearchHistory();
    const historyCount = await homePage.getSearchHistoryCount();
    expect(historyCount).toBeGreaterThan(0);
  });

  test('should limit displayed history items', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    // Add more than 10 items to history
    const { ResultDetailsPage } = await import('../pages/ResultDetailsPage');
    const resultDetailsPage = new ResultDetailsPage(page);

    for (let i = 0; i < 12; i++) {
      await homePage.search(`test${i}`);
      await homePage.waitForResults();
      if ((await homePage.getResultsCount()) > 0) {
        await homePage.clickResultItem(0);
        await resultDetailsPage.waitForDetails();
      }
    }

    await homePage.toggleSearchHistory();

    // Should show "Show more" button if more than 10 items
    const showMoreButton = homePage.page.locator('text=/Show \\d+ more/');
    const hasShowMore = await showMoreButton.isVisible().catch(() => false);

    // If there are more than 10 items, show more button should appear
    const historyCount = await homePage.getSearchHistoryCount();
    if (historyCount > 10) {
      await expect(showMoreButton).toBeVisible();
    }
  });
});
