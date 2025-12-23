import { test, expect } from '../fixtures/test-fixtures';
import { mockSearchError, mockTitleDetailsError, mockNetworkFailure } from '../helpers/api-mock';

test.describe('Error Handling', () => {
  test('should display error banner on API error', async ({ homePage, page }) => {
    await mockSearchError(page, 500);

    await homePage.search('test');
    await homePage.waitForError();

    await expect(homePage.errorBanner).toBeVisible();
    const errorMessage = await homePage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test('should dismiss error banner', async ({ homePage, page }) => {
    await mockSearchError(page, 500);

    await homePage.search('test');
    await homePage.waitForError();

    await homePage.dismissError();
    await homePage.waitForErrorHidden();

    await expect(homePage.errorBanner).not.toBeVisible();
  });

  test('should handle network errors', async ({ homePage, page }) => {
    await mockNetworkFailure(page, '**/api/search**');

    await homePage.search('test');

    // Should show error or handle gracefully
    // The exact behavior depends on implementation
    await page.waitForTimeout(2000);

    // Check if error is displayed or search completes with error handling
    const hasError = await homePage.errorBanner.isVisible().catch(() => false);
    const hasNoResults = await homePage.noResultsMessage.isVisible().catch(() => false);

    // At least one should be true
    expect(hasError || hasNoResults).toBeTruthy();
  });

  test('should handle invalid search gracefully', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Query parameter is required' }),
      });
    });

    await homePage.search('');

    // Should show validation error or API error
    const hasFormError = await homePage.page
      .locator('#search-form-query-error')
      .isVisible()
      .catch(() => false);
    const hasApiError = await homePage.errorBanner.isVisible().catch(() => false);

    expect(hasFormError || hasApiError).toBeTruthy();
  });

  test('should handle title details API error', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 1,
          totalResults: 1,
          results: [{ id: 550, type: 'movie', title: 'Test' }],
        }),
      });
    });

    await mockTitleDetailsError(page, 500);

    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    // Should show error in details section
    await page.waitForTimeout(1000);

    const errorMessage = page.locator("text=We're having trouble fetching data right now");
    await expect(errorMessage).toBeVisible();
  });

  test('should handle 404 error for non-existent title', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 1,
          totalResults: 1,
          results: [{ id: 99999, type: 'movie', title: 'Test' }],
        }),
      });
    });

    await page.route('**/api/title/**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });

    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    // Should show error
    await page.waitForTimeout(1000);
    const hasError = await page
      .locator('[role="alert"]')
      .isVisible()
      .catch(() => false);
    expect(hasError).toBeTruthy();
  });

  test('should recover from error and allow retry', async ({ homePage, page }) => {
    // First request fails
    await mockSearchError(page, 500);
    await homePage.search('test');
    await homePage.waitForError();

    // Dismiss error
    await homePage.dismissError();

    // Mock successful response
    await page.unroute('**/api/search**');
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 1,
          totalResults: 1,
          results: [{ id: 550, type: 'movie', title: 'Test' }],
        }),
      });
    });

    // Retry search
    await homePage.search('test');
    await homePage.waitForResults();

    await expect(homePage.resultsList).toBeVisible();
  });

  test('should handle genres API error gracefully', async ({ homePage, page }) => {
    await page.route('**/api/genres', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to fetch genres' }),
      });
    });

    await homePage.goto();
    await homePage.toggleFilters();

    // Should show error or handle gracefully
    await page.waitForTimeout(1000);

    const hasError = await homePage.errorBanner.isVisible().catch(() => false);
    const hasNoGenres = await homePage.page
      .locator('text=No genres available')
      .isVisible()
      .catch(() => false);

    expect(hasError || hasNoGenres).toBeTruthy();
  });
});
