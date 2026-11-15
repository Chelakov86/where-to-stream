import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch } from '../helpers/api-mock';
import { sampleMovie } from '../helpers/test-data';

for (const compare of [false, true]) {
  test(`restores search and scroll after title${compare ? ' and comparison' : ''}`, async ({
    homePage,
    page,
  }) => {
    await mockSearch(
      page,
      Array.from({ length: 30 }, (_, index) => ({
        ...sampleMovie,
        id: 550 + index,
        title: `Result ${index}`,
      })),
      { totalPages: 4 }
    );
    const query =
      'q=fight&type=movie&genre=18&from=1990&to=2020&rating=7&lang=en&sort=rating&page=3&mine=1&country=DE';
    await homePage.goto(query);
    await homePage.waitForResults();
    const card = homePage.titleCards.nth(20);
    await card.scrollIntoViewIfNeeded();
    const offset = await page.evaluate(() => window.scrollY);
    expect(offset).toBeGreaterThan(0);
    await card.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fight Club');
    if (compare) {
      await page.getByRole('link', { name: 'Compare 3 countries' }).click();
      await page.getByRole('link', { name: 'Back to title' }).click();
    }
    await page.getByRole('link', { name: 'Back to search' }).click();
    await expect(page).toHaveURL(`/?${query}`);
    await expect(homePage.searchInput).toHaveValue('fight');
    await expect(homePage.sortSelect).toHaveValue('rating');
    await expect(homePage.pagination).toContainText('Page 3 of 4');
    await expect(homePage.heroHeading).toContainText('Germany');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(offset, -1);
  });
}

test('rejects external return locations on direct title visits', async ({ titlePage, page }) => {
  await page.goto('/title/movie/550?returnTo=https%3A%2F%2Fevil.test');
  await expect(titlePage.backLink).toHaveAttribute('href', '/');
  await titlePage.backLink.click();
  await expect(page).toHaveURL('/');
});
