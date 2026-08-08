import { test, expect } from '../fixtures/test-fixtures';
import { mockAutocomplete } from '../helpers/api-mock';

test.describe('Autocomplete Functionality', () => {
  test('should display autocomplete suggestions when typing', async ({ homePage, page }) => {
    await mockAutocomplete(page);

    await homePage.typeSearchQuery('Fight', 100);
    await homePage.waitForAutocomplete();

    await expect(homePage.autocompleteList).toBeVisible();
    const count = await homePage.getAutocompleteCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate autocomplete with arrow keys', async ({ homePage, page }) => {
    await mockAutocomplete(page);

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
    await mockAutocomplete(page);

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    await homePage.navigateAutocomplete('down');
    await homePage.pressEnterOnAutocomplete();

    // Autocomplete should close and item should be selected
    await homePage.waitForAutocompleteHidden();
  });

  test('should close autocomplete with Escape key', async ({ homePage, page }) => {
    await mockAutocomplete(page);

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    await homePage.pressEscapeOnAutocomplete();
    await homePage.waitForAutocompleteHidden();
  });

  test('should select autocomplete item with mouse click', async ({ homePage, page }) => {
    await mockAutocomplete(page);

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    await homePage.selectAutocompleteItem(0);
    await homePage.waitForAutocompleteHidden();
  });

  test('should clear autocomplete when search is submitted', async ({ homePage, page }) => {
    await mockAutocomplete(page);

    await homePage.typeSearchQuery('Fight');
    await homePage.waitForAutocomplete();

    await homePage.submitSearch();
    await homePage.waitForAutocompleteHidden();
  });
});
