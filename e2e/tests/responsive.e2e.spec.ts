import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch } from '../helpers/api-mock';

test.describe('Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(homePage.pageTitle).toBeVisible();
    await expect(homePage.searchInput).toBeVisible();

    // Check that layout adapts to mobile
    const titleBox = await homePage.pageTitle.boundingBox();
    expect(titleBox?.width).toBeLessThanOrEqual(375);
  });

  test('should display correctly on tablet viewport', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(homePage.pageTitle).toBeVisible();
    await expect(homePage.searchInput).toBeVisible();

    // Check that layout adapts to tablet
    const titleBox = await homePage.pageTitle.boundingBox();
    expect(titleBox?.width).toBeLessThanOrEqual(768);
  });

  test('should display correctly on desktop viewport', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(homePage.pageTitle).toBeVisible();
    await expect(homePage.searchInput).toBeVisible();
  });

  test('should handle filters panel on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await homePage.toggleFilters();
    await expect(homePage.filterSection).toBeVisible();

    // Check that filters are accessible on mobile
    await expect(homePage.typeSelect).toBeVisible();
  });

  test('should handle search results on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockSearch(page);

    await homePage.search('test');
    await homePage.waitForResults();

    await expect(homePage.resultsList).toBeVisible();

    // Check that results are displayed properly
    const resultsCount = await homePage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);
  });

  test('should handle autocomplete on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

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
            totalResults: 2,
            results: [{ id: 1, type: 'movie', title: 'Test Movie', year: 2020 }],
          }),
        });
      }
    });

    await homePage.typeSearchQuery('test');
    await homePage.waitForAutocomplete();

    await expect(homePage.autocompleteList).toBeVisible();

    // Check that autocomplete fits on mobile screen
    const autocompleteBox = await homePage.autocompleteList.boundingBox();
    expect(autocompleteBox?.width).toBeLessThanOrEqual(375);
  });

  test('should handle touch interactions on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockSearch(page);

    // Simulate touch interaction (fallback to click if context doesn't support touch tap)
    const tapOrClick = async (locator: any) => {
      await locator.tap().catch(() => locator.click());
    };

    await tapOrClick(homePage.searchInput);
    await homePage.typeSearchQuery('test');
    await tapOrClick(homePage.searchButton);

    await homePage.waitForResults();
    await expect(homePage.resultsList).toBeVisible();
  });

  test('should handle result details on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockSearch(page);

    await page.route('**/api/title/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 550,
          type: 'movie',
          title: 'Test Movie',
          year: 2020,
          genres: [{ id: 1, name: 'Action' }],
          overview: 'Test overview',
          rating: 8.0,
          runtime: 120,
          availability: { preferredCountries: [], otherCountries: [] },
        }),
      });
    });

    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    const resultDetailsPage = new (await import('../pages/ResultDetailsPage')).ResultDetailsPage(
      page
    );
    await resultDetailsPage.waitForDetails();

    // Check that details are displayed properly on mobile
    await expect(resultDetailsPage.detailsSection).toBeVisible();

    const detailsBox = await resultDetailsPage.detailsSection.boundingBox();
    expect(detailsBox?.width).toBeLessThanOrEqual(375);
  });

  test('should handle pagination on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 3,
          totalResults: 30,
          results: [{ id: 1, type: 'movie', title: 'Test' }],
        }),
      });
    });

    await homePage.search('test');
    await homePage.waitForResults();

    // Check pagination is accessible on mobile
    await expect(homePage.paginationNext).toBeVisible();
    await expect(homePage.paginationPrevious).toBeVisible();
  });

  test('should handle search history on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockSearch(page);

    await page.route('**/api/title/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 550,
          type: 'movie',
          title: 'Test Movie',
          year: 2020,
          genres: [{ id: 1, name: 'Action' }],
          overview: 'Test overview',
          rating: 8.0,
          runtime: 120,
          availability: { preferredCountries: [], otherCountries: [] },
        }),
      });
    });

    await homePage.search('test');
    await homePage.waitForResults();
    await homePage.clickResultItem(0);

    await homePage.toggleSearchHistory();

    // Check that history is accessible on mobile
    await expect(homePage.searchHistorySection).toBeVisible();
  });
});
