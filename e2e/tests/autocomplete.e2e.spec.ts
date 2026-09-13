import { test, expect } from '../fixtures/test-fixtures';

test.describe('Autocomplete Functionality', () => {
  test('suggests titles while typing', async ({ homePage }) => {
    await homePage.typeSearchQuery('Fig');

    await expect(homePage.suggestions).toHaveCount(3);
    await expect(homePage.searchInput).toHaveAttribute('aria-expanded', 'true');
  });

  test('moves through suggestions with arrow keys', async ({ homePage, page }) => {
    await homePage.typeSearchQuery('Fig');
    await expect(homePage.suggestions).toHaveCount(3);

    await page.keyboard.press('ArrowDown');
    await expect(homePage.suggestions.nth(0)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(homePage.suggestions.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(homePage.suggestions.nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('opens the highlighted title with Enter', async ({ homePage, page }) => {
    await homePage.typeSearchQuery('Bre');
    await expect(homePage.suggestions).toHaveCount(3);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.waitForURL('**/title/tv/1396?country=US');
  });

  test('opens a title on click', async ({ homePage, page }) => {
    await homePage.typeSearchQuery('Shaw');
    await homePage.suggestions.filter({ hasText: 'The Shawshank Redemption' }).click();

    await page.waitForURL('**/title/movie/278?country=US');
  });

  test('closes suggestions with Escape', async ({ homePage, page }) => {
    await homePage.typeSearchQuery('Fig');
    await expect(homePage.suggestions).toHaveCount(3);

    await page.keyboard.press('Escape');
    await expect(homePage.suggestions).toHaveCount(0);
    await expect(homePage.searchInput).toHaveAttribute('aria-expanded', 'false');
  });

  test('searches immediately with Enter when nothing is highlighted', async ({
    homePage,
    page,
  }) => {
    await homePage.typeSearchQuery('Fig');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/q=Fig/);
    await expect(homePage.suggestions).toHaveCount(0);
    await expect(homePage.resultsHeading).toHaveText('Results for “Fig”');
  });
});
