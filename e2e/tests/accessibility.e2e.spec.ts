import { test, expect } from '../fixtures/test-fixtures';
import { mockSearchError } from '../helpers/api-mock';

test.describe('Accessibility', () => {
  test('has landmarks and a single page heading', async ({ homePage, page }) => {
    await expect(homePage.header).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('labels the header controls', async ({ homePage }) => {
    await expect(homePage.savedLink).toBeVisible();
    await expect(homePage.servicesButton).toHaveAccessibleName('My services (0 selected)');
    await expect(homePage.countryButton).toHaveAccessibleName(
      'Country: United States. Change country'
    );
  });

  test('exposes combobox semantics on the search box', async ({ homePage, page }) => {
    const input = homePage.searchInput;
    await expect(input).toHaveAttribute('aria-autocomplete', 'list');
    await expect(input).toHaveAttribute('aria-controls', 'search-suggestions');
    await expect(input).toHaveAttribute('aria-expanded', 'false');

    await homePage.typeSearchQuery('Fig');
    await expect(homePage.suggestionList).toHaveAttribute('role', 'listbox');
    await expect(input).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('ArrowDown');
    const firstId = await homePage.suggestions.first().getAttribute('id');
    await expect(input).toHaveAttribute('aria-activedescendant', firstId!);
  });

  test('uses pressed state for toggle buttons', async ({ homePage }) => {
    const all = homePage.typeGroup.getByRole('button', { name: 'All' });
    const series = homePage.typeGroup.getByRole('button', { name: 'Series' });
    await expect(all).toHaveAttribute('aria-pressed', 'true');
    await expect(series).toHaveAttribute('aria-pressed', 'false');
  });

  test('traps the services dialog and returns focus on close', async ({ homePage, page }) => {
    await homePage.openServices();
    await expect(homePage.servicesDialog).toHaveAccessibleDescription(
      /Pick what you already pay for/
    );

    await homePage.closeDialog();
    await expect(homePage.servicesDialog).toBeHidden();
    await expect(homePage.servicesButton).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('announces load failures as alerts', async ({ homePage, page }) => {
    await mockSearchError(page, 500);
    await homePage.goto();
    await expect(homePage.errorAlert).toBeVisible();
  });

  test('labels availability on the title page', async ({ titlePage, page }) => {
    await titlePage.gotoTitle('movie', 550);
    await expect(
      page.getByRole('region', { name: /Where to watch in United States/ })
    ).toBeVisible();
    await expect(titlePage.verdict).toBeVisible();
  });
});
