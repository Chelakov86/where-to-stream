import { test, expect } from '../fixtures/test-fixtures';
import { mockAutocomplete } from '../helpers/api-mock';

test.describe('Accessibility', () => {
  test('should have proper page structure', async ({ homePage }) => {
    // Check main heading and description
    await expect(homePage.pageTitle).toBeVisible();
    await expect(homePage.pageTitle).toHaveText('WhereToStream');
    await expect(homePage.pageDescription).toBeVisible();

    // Check search form is present
    await expect(homePage.searchInput).toBeVisible();
    await expect(homePage.searchButton).toBeVisible();
  });

  test('should have accessible search form', async ({ homePage }) => {
    // Check input has label
    const input = homePage.searchInput;
    await expect(input).toBeVisible();

    // Check aria attributes
    await expect(input).toHaveAttribute('aria-autocomplete', 'list');
    await expect(input).toHaveAttribute('aria-haspopup', 'listbox');
  });

  test('should have accessible autocomplete', async ({ homePage, page }) => {
    await mockAutocomplete(page);

    await homePage.typeSearchQuery('test');
    await homePage.waitForAutocomplete();

    // Check autocomplete list has proper role
    await expect(homePage.autocompleteList).toHaveAttribute('role', 'listbox');

    // Check items have proper role
    const firstItem = homePage.autocompleteItems.first();
    await expect(firstItem).toHaveAttribute('role', 'option');
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

  test('should have accessible results list', async ({ homePage }) => {
    await homePage.search('test');
    await homePage.waitForResults();

    // Check results list has proper role
    await expect(homePage.resultsList).toHaveAttribute('role', 'list');
    await expect(homePage.resultsList).toHaveAttribute('aria-live', 'polite');
  });

  test('should have accessible result details', async ({ homePage }) => {
    const resultDetailsPage = await homePage.viewDetails('test');

    // Check details section has proper attributes
    await expect(resultDetailsPage.detailsSection).toHaveAttribute('role', 'region');
    await expect(resultDetailsPage.detailsSection).toHaveAttribute('aria-labelledby');
  });
});
