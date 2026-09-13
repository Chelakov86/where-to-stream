import { test, expect } from '../fixtures/test-fixtures';
import { sampleTitleDetails } from '../helpers/test-data';

test.describe('Recently viewed titles', () => {
  test('offers nothing before any title was viewed', async ({ homePage }) => {
    await homePage.searchInput.click();
    await expect(homePage.suggestions).toHaveCount(0);
    await expect(homePage.searchInput).toHaveAttribute('aria-expanded', 'false');
  });

  test('offers viewed titles, most recent first', async ({ homePage, titlePage, page }) => {
    await page.route('**/api/title/tv/1396', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...sampleTitleDetails,
          id: 1396,
          type: 'tv',
          title: 'Breaking Bad',
          year: 2008,
        }),
      })
    );

    await titlePage.gotoTitle('movie', 550);
    await expect(titlePage.heading).toHaveText('Fight Club');
    await titlePage.gotoTitle('tv', 1396);
    await expect(titlePage.heading).toHaveText('Breaking Bad');

    await homePage.goto();
    await homePage.searchInput.click();
    await expect(page.getByRole('listbox', { name: 'Recently viewed titles' })).toBeVisible();
    await expect(homePage.suggestions).toHaveCount(2);
    await expect(homePage.suggestions.nth(0)).toContainText('Breaking Bad');
    await expect(homePage.suggestions.nth(1)).toContainText('Fight Club');

    await homePage.suggestions.nth(1).click();
    await page.waitForURL('**/title/movie/550?country=US');
  });
});
