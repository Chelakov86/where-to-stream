import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch, mockTitleDetails } from '../helpers/api-mock';
import { sampleSearchResults } from '../helpers/test-data';

test.describe('Results Display', () => {
  test('should display result list with items', async ({ homePage, page }) => {
    await mockSearch(page);

    await homePage.search('test');
    await homePage.waitForResults();

    await expect(homePage.resultsList).toBeVisible();
    const count = await homePage.getResultsCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should display result item details', async ({ homePage, page }) => {
    await mockSearch(page);

    await homePage.search('test');
    await homePage.waitForResults();

    const firstResult = homePage.resultItems.first();
    await expect(firstResult).toBeVisible();

    // Check that result contains title
    const text = await firstResult.textContent();
    expect(text).toBeTruthy();
  });

  test('should select result item and show details', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    await homePage.search('test');
    await homePage.waitForResults();

    await homePage.clickResultItem(0);

    // Wait for result details to appear
    const resultDetailsPage = new (await import('../pages/ResultDetailsPage')).ResultDetailsPage(
      page
    );
    await resultDetailsPage.waitForDetails();
    await expect(resultDetailsPage.detailsSection).toBeVisible();
  });

  test('should display no results message when no results', async ({ homePage, page }) => {
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
    await expect(homePage.noResultsMessage).toContainText('No titles found');
  });

  test('should display initial prompt when no search performed', async ({ homePage }) => {
    await expect(homePage.initialPrompt).toBeVisible();
    await expect(homePage.initialPrompt).toContainText('Search for a movie or series');
  });

  test('should navigate pagination correctly', async ({ homePage, page }) => {
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

    // Check initial state
    await expect(homePage.paginationPrevious).toBeDisabled();
    await expect(homePage.paginationNext).toBeEnabled();

    // Go to next page
    await homePage.goToNextPage();
    await homePage.waitForResults();

    await expect(homePage.paginationPrevious).toBeEnabled();

    // Go to last page
    await homePage.goToNextPage();
    await homePage.waitForResults();

    await expect(homePage.paginationNext).toBeDisabled();
  });

  test('should scroll to result details when selected', async ({ homePage, page }) => {
    await mockSearch(page);
    await mockTitleDetails(page);

    await homePage.search('test');
    await homePage.waitForResults();

    // Scroll down first
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await homePage.clickResultItem(0);

    // Wait a bit for scroll animation
    await page.waitForTimeout(500);

    // Check that details section is in viewport
    const resultDetailsPage = new (await import('../pages/ResultDetailsPage')).ResultDetailsPage(
      page
    );
    await resultDetailsPage.waitForDetails();

    const isInViewport = await resultDetailsPage.detailsSection.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight;
    });

    expect(isInViewport).toBeTruthy();
  });
});
