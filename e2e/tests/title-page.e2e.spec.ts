import { test, expect } from '../fixtures/test-fixtures';
import { WATCH_LINK } from '../helpers/test-data';

test.describe('Title page', () => {
  test('shows title details and cast', async ({ titlePage, page }) => {
    await titlePage.gotoTitle('movie', 550);
    await titlePage.waitForTitle();

    await expect(titlePage.heading).toHaveText('Fight Club');
    await expect(page.getByText('Mischief. Mayhem. Soap.')).toBeVisible();
    await expect(page.getByText('2h 19m')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Genres' })).toContainText('Thriller');
    await expect(titlePage.castSection).toContainText('Edward Norton');
    await expect(titlePage.trailerLink).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=qtRKdVHc-cE'
    );
  });

  test('shows where to watch in the user country', async ({ titlePage }) => {
    await titlePage.gotoTitle('movie', 550);

    await expect(titlePage.availabilityHeading).toHaveText('Where to watch in United States');
    await expect(titlePage.verdict).toContainText('Free to watch');
    await expect(titlePage.availability).toContainText('Stream with a subscription');
    await expect(titlePage.provider('Netflix')).toBeVisible();
    await expect(titlePage.provider('Netflix').getByRole('link')).toHaveCount(0);
    await expect(titlePage.watchOptionsLink).toHaveAttribute('href', WATCH_LINK);
    await expect(titlePage.watchOptionsLink).toHaveAttribute('target', '_blank');
  });

  test('keeps the TMDB action inside the panel on narrow screens', async ({ titlePage, page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await titlePage.gotoTitle('movie', 550);
    await expect(titlePage.watchOptionsLink).toBeVisible();
    const action = await titlePage.watchOptionsLink.boundingBox();
    const panel = await titlePage.availability.boundingBox();
    expect(action).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(action!.x).toBeGreaterThanOrEqual(panel!.x);
    expect(action!.x + action!.width).toBeLessThanOrEqual(panel!.x + panel!.width);
    expect(
      await titlePage.watchOptionsLink.evaluate((element) => getComputedStyle(element).whiteSpace)
    ).toBe('normal');
  });

  test('uses the country from the URL', async ({ titlePage }) => {
    await titlePage.gotoTitle('movie', 550, 'DE');

    await expect(titlePage.availabilityHeading).toHaveText('Where to watch in Germany');
    await expect(titlePage.verdict).toContainText('Rent or buy only');
  });

  test('points to other countries when unavailable locally', async ({ titlePage, page }) => {
    await titlePage.gotoTitle('movie', 550, 'FR');

    await expect(titlePage.verdict).toContainText('Not available here');
    await page.getByRole('link', { name: 'See the 3 countries that carry it' }).click();
    await page.waitForURL('**/title/movie/550/countries?country=FR');
  });

  test('goes back to search', async ({ titlePage, page }) => {
    await titlePage.gotoTitle('movie', 550);
    await titlePage.backLink.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Where can I stream it in United States?'
    );
  });
});

test.describe('Country comparison', () => {
  test('opens from the title page', async ({ titlePage, countriesPage, page }) => {
    await titlePage.gotoTitle('movie', 550);
    await titlePage.compareLink.click();

    await page.waitForURL('**/title/movie/550/countries?country=US');
    await expect(countriesPage.heading).toHaveText('Fight Club: availability by country');
  });

  test('lists my country first, then pinned countries', async ({ countriesPage }) => {
    await countriesPage.gotoCountries('movie', 550);

    await expect(countriesPage.countryNames).toHaveText([
      'United States',
      'Germany',
      'United Kingdom',
    ]);
    await expect(countriesPage.card('United States')).toContainText('Your country');
  });

  test('pins and unpins countries', async ({ countriesPage, page }) => {
    await countriesPage.gotoCountries('movie', 550);

    await countriesPage.pinButton('Germany').click();
    await expect(countriesPage.countryNames).toHaveText([
      'United States',
      'United Kingdom',
      'Germany',
    ]);
    await expect(countriesPage.pinButton('Germany')).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await expect(countriesPage.countryNames).toHaveText([
      'United States',
      'United Kingdom',
      'Germany',
    ]);
  });

  test('filters countries by name', async ({ countriesPage }) => {
    await countriesPage.gotoCountries('movie', 550);

    await countriesPage.filterInput.fill('king');
    await expect(countriesPage.countryNames).toHaveText(['United Kingdom']);

    await countriesPage.filterInput.fill('atlantis');
    await expect(countriesPage.noMatches).toBeVisible();
  });

  test('goes back to the title', async ({ countriesPage, page }) => {
    await countriesPage.gotoCountries('movie', 550, 'DE');
    await countriesPage.backLink.click();
    await page.waitForURL('**/title/movie/550?country=DE');
  });
});
