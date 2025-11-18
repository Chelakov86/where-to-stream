import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch } from '../helpers/api-mock';
import { sampleAutocompleteResults } from '../helpers/test-data';

test.describe('Autocomplete Functionality', () => {
  test('should display autocomplete suggestions when typing', async ({ homePage, page }) => {
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
            totalResults: sampleAutocompleteResults.length,
            results: sampleAutocompleteResults,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            page: 1,
            totalPages: 1,
            totalResults: 0,
            results: [],
          }),
        });
      }
    });

    await homePage.typeSearchQuery('Fight', 100);
    await homePage.waitForAutocomplete();

    await expect(homePage.autocompleteList).toBeVisible();
    const count = await homePage.getAutocompleteCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate autocomplete with arrow keys', async ({ homePage, page }) => {
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
            totalResults: sampleAutocompleteResults.length,
            results: sampleAutocompleteResults,
          }),
        });
      }
    });

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    // Navigate down
    await homePage.navigateAutocomplete('down');
    const firstItem = homePage.autocompleteItems.first();
    await expect(firstItem).toHaveAttribute('aria-selected', 'true');

    // Navigate down again
    await homePage.navigateAutocomplete('down');
    const secondItem = homePage.autocompleteItems.nth(1);
    await expect(secondItem).toHaveAttribute('aria-selected', 'true');

    // Navigate up
    await homePage.navigateAutocomplete('up');
    await expect(firstItem).toHaveAttribute('aria-selected', 'true');
  });

  test('should select autocomplete item with Enter key', async ({ homePage, page }) => {
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
            totalResults: sampleAutocompleteResults.length,
            results: sampleAutocompleteResults,
          }),
        });
      }
    });

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    await homePage.navigateAutocomplete('down');
    await homePage.pressEnterOnAutocomplete();

    // Autocomplete should close and item should be selected
    await homePage.waitForAutocompleteHidden();
  });

  test('should close autocomplete with Escape key', async ({ homePage, page }) => {
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
            totalResults: sampleAutocompleteResults.length,
            results: sampleAutocompleteResults,
          }),
        });
      }
    });

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    await homePage.pressEscapeOnAutocomplete();
    await homePage.waitForAutocompleteHidden();
  });

  test('should select autocomplete item with mouse click', async ({ homePage, page }) => {
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
            totalResults: sampleAutocompleteResults.length,
            results: sampleAutocompleteResults,
          }),
        });
      }
    });

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    await homePage.selectAutocompleteItem(0);
    await homePage.waitForAutocompleteHidden();
  });

  test('should highlight autocomplete item on mouse hover', async ({ homePage, page }) => {
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
            totalResults: sampleAutocompleteResults.length,
            results: sampleAutocompleteResults,
          }),
        });
      }
    });

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    const firstItem = homePage.autocompleteItems.first();
    await firstItem.hover();

    await expect(firstItem).toHaveAttribute('aria-selected', 'true');
  });

  test('should close autocomplete when clicking outside', async ({ homePage, page }) => {
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
            totalResults: sampleAutocompleteResults.length,
            results: sampleAutocompleteResults,
          }),
        });
      }
    });

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    // Click outside the autocomplete (on page title)
    await homePage.pageTitle.click();
    await homePage.waitForAutocompleteHidden();
  });

  test('should clear autocomplete when search is submitted', async ({ homePage, page }) => {
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
            totalResults: sampleAutocompleteResults.length,
            results: sampleAutocompleteResults,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            page: 1,
            totalPages: 1,
            totalResults: 0,
            results: [],
          }),
        });
      }
    });

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    await homePage.submitSearch();
    await homePage.waitForAutocompleteHidden();
  });
});
