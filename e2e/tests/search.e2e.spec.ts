import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch, mockEmptySearch } from '../helpers/api-mock';
import { sampleSearchResults } from '../helpers/test-data';

test.describe('Search Functionality', () => {
  test('should display search results', async ({ homePage, page }) => {
    await mockSearch(page);

    await homePage.search('Fight Club');
    await homePage.waitForResults();

    await expect(homePage.resultsList).toBeVisible();
    const resultsCount = await homePage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);
  });

  test('should show no results message when no results found', async ({ homePage, page }) => {
    await mockEmptySearch(page);

    await homePage.search('nonexistent movie');
    await homePage.waitForSearchComplete();

    await expect(homePage.noResultsMessage).toBeVisible();
    await expect(homePage.noResultsMessage).toContainText('No titles found');
  });

  test('should validate empty search query', async ({ homePage }) => {
    await homePage.searchInput.fill('');
    await homePage.submitSearch();

    // Check for validation error
    const errorMessage = await homePage.page.locator('#search-form-query-error').textContent();
    expect(errorMessage).toContain('Please enter a search query');
  });

  test('should clear search results when new search is performed', async ({ homePage, page }) => {
    await mockSearch(page);

    await homePage.search('Fight Club');
    await homePage.waitForResults();

    await mockEmptySearch(page);
    await homePage.search('nonexistent');
    await homePage.waitForSearchComplete();

    await expect(homePage.noResultsMessage).toBeVisible();
  });

  test('should navigate pagination across pages', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      const url = new URL(route.request().url());
      const requestedPage = parseInt(url.searchParams.get('page') || '1', 10);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: requestedPage,
          totalPages: 3,
          totalResults: 30,
          results: sampleSearchResults,
        }),
      });
    });

    await homePage.search('test');
    await homePage.waitForResults();

    // Initial state: first page, next enabled, previous disabled
    await expect(homePage.paginationPrevious).toBeDisabled();
    await expect(homePage.paginationNext).toBeEnabled();

    // Navigate to the last page
    await homePage.goToNextPage();
    await homePage.waitForResults();
    expect(await homePage.getPaginationInfo()).toContain('Page 2');

    await homePage.goToNextPage();
    await homePage.waitForResults();
    await expect(homePage.paginationNext).toBeDisabled();
    await expect(homePage.paginationPrevious).toBeEnabled();

    // Navigate back
    await homePage.goToPreviousPage();
    await homePage.waitForResults();
    expect(await homePage.getPaginationInfo()).toContain('Page 2');
  });
});
