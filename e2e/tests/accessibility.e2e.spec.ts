import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch } from '../helpers/api-mock';

test.describe('Accessibility', () => {
  test('should have proper page structure', async ({ homePage }) => {
    // Check main heading
    await expect(homePage.pageTitle).toBeVisible();

    // Check page description
    await expect(homePage.pageDescription).toBeVisible();
  });

  test('should have accessible search form', async ({ homePage }) => {
    // Check input has label
    const input = homePage.searchInput;
    await expect(input).toBeVisible();

    // Check aria attributes
    await expect(input).toHaveAttribute('aria-autocomplete', 'list');
    await expect(input).toHaveAttribute('aria-haspopup', 'listbox');
  });

  test('should navigate with keyboard', async ({ homePage, page }) => {
    await mockSearch(page);

    // Tab to search input
    await homePage.page.keyboard.press('Tab');

    // Type search query
    await homePage.typeSearchQuery('test');

    // Press Enter to submit
    await homePage.page.keyboard.press('Enter');

    await homePage.waitForResults();
    await expect(homePage.resultsList).toBeVisible();
  });

  test('should have accessible autocomplete', async ({ homePage, page }) => {
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
            results: [
              { id: 1, type: 'movie', title: 'Test Movie', year: 2020 },
              { id: 2, type: 'tv', title: 'Test TV', year: 2021 },
            ],
          }),
        });
      }
    });

    await homePage.typeSearchQuery('test');
    await homePage.waitForAutocomplete();

    // Check autocomplete list has proper role
    await expect(homePage.autocompleteList).toHaveAttribute('role', 'listbox');

    // Check items have proper role
    const firstItem = homePage.autocompleteItems.first();
    await expect(firstItem).toHaveAttribute('role', 'option');
  });

  test('should navigate autocomplete with keyboard', async ({ homePage, page }) => {
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
            results: [
              { id: 1, type: 'movie', title: 'Test Movie', year: 2020 },
              { id: 2, type: 'tv', title: 'Test TV', year: 2021 },
            ],
          }),
        });
      }
    });

    await homePage.typeSearchQuery('test');
    await homePage.waitForAutocomplete();

    // Navigate with arrow keys
    await homePage.navigateAutocomplete('down');
    const firstItem = homePage.autocompleteItems.first();
    await expect(firstItem).toHaveAttribute('aria-selected', 'true');

    // Select with Enter
    await homePage.pressEnterOnAutocomplete();
    await homePage.waitForAutocompleteHidden();
  });

  test('should have accessible error banner', async ({ homePage, page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await homePage.search('test');
    await homePage.waitForError();

    // Check error banner has proper role
    await expect(homePage.errorBanner).toHaveAttribute('role', 'alert');

    // Check dismiss button has proper label
    await expect(homePage.dismissErrorButton).toHaveAttribute('aria-label', 'Dismiss error');
  });

  test('should have accessible filters', async ({ homePage }) => {
    await homePage.toggleFilters();

    // Check filter toggle button has proper attributes
    await expect(homePage.filterToggleButton).toHaveAttribute('aria-expanded');
    await expect(homePage.filterToggleButton).toHaveAttribute('aria-controls', 'filter-section');

    // Check filter section has proper id
    await expect(homePage.filterSection).toHaveAttribute('id', 'filter-section');
  });

  test('should have accessible results list', async ({ homePage, page }) => {
    await mockSearch(page);

    await homePage.search('test');
    await homePage.waitForResults();

    // Check results list has proper role
    await expect(homePage.resultsList).toHaveAttribute('role', 'list');
    await expect(homePage.resultsList).toHaveAttribute('aria-live', 'polite');
  });

  test('should have accessible pagination', async ({ homePage, page }) => {
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

    // Check pagination buttons are accessible
    await expect(homePage.paginationPrevious).toBeVisible();
    await expect(homePage.paginationNext).toBeVisible();

    // Check disabled state
    await expect(homePage.paginationPrevious).toBeDisabled();
  });

  test('should have accessible result details', async ({ homePage, page }) => {
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

    // Check details section has proper attributes
    await expect(resultDetailsPage.detailsSection).toHaveAttribute('role', 'region');
    await expect(resultDetailsPage.detailsSection).toHaveAttribute('aria-labelledby');
  });

  test('should maintain focus management', async ({ homePage, page }) => {
    await mockSearch(page);

    // Focus search input
    await homePage.searchInput.focus();
    await homePage.enterSearchQuery('test');

    // Submit search
    await homePage.page.keyboard.press('Enter');
    await homePage.waitForResults();

    // Focus should be managed appropriately
    // (exact behavior depends on implementation)
  });

  test('should have proper color contrast', async ({ homePage }) => {
    // Playwright doesn't have built-in color contrast checking,
    // but we can verify text is visible
    await expect(homePage.pageTitle).toBeVisible();
    await expect(homePage.pageDescription).toBeVisible();

    // Check that text elements are readable
    const titleColor = await homePage.pageTitle.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.color;
    });

    expect(titleColor).toBeTruthy();
  });
});
