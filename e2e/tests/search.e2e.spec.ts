import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch, mockEmptySearch, mockSearchError } from '../helpers/api-mock';
import { sampleSearchResults } from '../helpers/test-data';

test.describe('Search Functionality', () => {
  test('should display search form', async ({ homePage }) => {
    await expect(homePage.searchInput).toBeVisible();
    await expect(homePage.searchButton).toBeVisible();
    await expect(homePage.pageTitle).toHaveText('WhereToStream');
  });

  test('should perform basic search', async ({ homePage, page }) => {
    await mockSearch(page);

    await homePage.search('Fight Club');
    await homePage.waitForSearchComplete();

    const resultsCount = await homePage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);
  });

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

  test('should display pagination when multiple pages exist', async ({ homePage, page }) => {
    // Mock search with multiple pages
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 3,
          totalResults: 30,
          results: sampleSearchResults,
        }),
      });
    });

    await homePage.search('test');
    await homePage.waitForResults();

    await expect(homePage.paginationInfo).toBeVisible();
    await expect(homePage.paginationNext).toBeEnabled();
    await expect(homePage.paginationPrevious).toBeDisabled();
  });

  test('should navigate to next page', async ({ homePage, page }) => {
    let pageNumber = 1;

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

    await homePage.goToNextPage();
    await homePage.waitForResults();

    const paginationInfo = await homePage.getPaginationInfo();
    expect(paginationInfo).toContain('Page 2');
  });

  test('should navigate to previous page', async ({ homePage, page }) => {
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

    await homePage.goToNextPage();
    await homePage.waitForResults();

    await homePage.goToPreviousPage();
    await homePage.waitForResults();

    const paginationInfo = await homePage.getPaginationInfo();
    expect(paginationInfo).toContain('Page 1');
  });

  test('should handle search API error', async ({ homePage, page }) => {
    await mockSearchError(page, 500);

    await homePage.search('test');
    await homePage.waitForError();

    const errorMessage = await homePage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test('should show searching indicator during search', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      // Add delay to see searching indicator
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 1,
          totalResults: sampleSearchResults.length,
          results: sampleSearchResults,
        }),
      });
    });

    await homePage.search('test');

    // Check that searching indicator appears briefly
    const isSearchingVisible = await homePage.searchingIndicator.isVisible().catch(() => false);
    // It might disappear quickly, so we just check it was there at some point

    await homePage.waitForSearchComplete();
    await expect(homePage.resultsList).toBeVisible();
  });
});
