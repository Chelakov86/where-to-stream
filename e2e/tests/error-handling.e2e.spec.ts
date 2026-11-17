import { test, expect } from '../fixtures/test-fixtures';
import {
  mockProviders,
  mockSearch,
  mockSearchError,
  mockTitleDetails,
  mockTitleDetailsError,
} from '../helpers/api-mock';

test.describe('Error Handling', () => {
  test('shows an alert when the catalogue fails and recovers on retry', async ({
    homePage,
    page,
  }) => {
    await mockSearchError(page, 500);
    await homePage.goto();

    await expect(homePage.errorAlert).toContainText('The service is temporarily unavailable');

    await page.unroute('**/api/search*');
    await mockSearch(page);
    await homePage.errorAlert.getByRole('button', { name: 'Try again' }).click();
    await homePage.waitForResults();
  });

  test('shows an error when a title fails to load and recovers on retry', async ({
    titlePage,
    page,
  }) => {
    await mockTitleDetailsError(page, 502);
    await titlePage.gotoTitle('movie', 550);

    await expect(titlePage.errorHeading).toBeVisible();

    await page.unroute('**/api/title/**');
    await mockTitleDetails(page);
    await titlePage.retryButton.click();
    await expect(titlePage.heading).toHaveText('Fight Club');
  });

  test('shows an error when country availability fails', async ({ countriesPage, page }) => {
    await mockTitleDetailsError(page, 500);
    await countriesPage.goto('/title/movie/550/countries');

    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'The service is temporarily unavailable'
    );
  });

  test('returns a 404 page for invalid title routes', async ({ page }) => {
    const response = await page.goto('/title/person/1');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('This page could not be found.')).toBeVisible();
  });

  test('keeps filters usable when genres fail to load', async ({ homePage, page }) => {
    await page.route('**/api/genres', (route) =>
      route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"down"}' })
    );
    await homePage.goto();
    await homePage.openFilters();

    await expect(homePage.filtersPopover.getByRole('button', { name: 'Action' })).toHaveCount(0);
    await homePage.filtersPopover.getByRole('button', { name: '7+' }).click();
    await expect(page).toHaveURL(/rating=7/);
  });

  test('explains when streaming providers fail to load', async ({ homePage, page }) => {
    await mockProviders(page, 500);
    await homePage.openServices();

    await expect(homePage.servicesDialog.getByRole('alert')).toContainText(
      "Couldn't load providers."
    );
  });
});

test('retries genres by keyboard without reloading catalogue or clearing selected filters', async ({
  homePage,
  page,
}) => {
  let genreRequests = 0;
  let catalogueRequests = 0;
  let finishGenres!: () => void;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/search') catalogueRequests++;
  });
  await page.route('**/api/genres', async (route) => {
    genreRequests++;
    if (genreRequests === 1) {
      await route.fulfill({ status: 502, json: { error: 'down' } });
    } else {
      await new Promise<void>((resolve) => {
        finishGenres = resolve;
      });
      await route.fulfill({ json: { movie: [{ id: 28, name: 'Action' }], tv: [] } });
    }
  });
  await homePage.goto('/?q=dune&type=movie&genre=28&rating=7&page=2&country=US');
  await homePage.waitForResults();
  await homePage.openFilters();
  await expect(homePage.filtersPopover.getByRole('alert')).toContainText("We couldn't load genres");
  const originalUrl = page.url();
  const before = catalogueRequests;
  const retry = homePage.filtersPopover.getByRole('button', { name: 'Retry genres' });
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(homePage.filtersPopover.getByRole('status')).toHaveText('Loading genres…');
  await expect.poll(() => genreRequests).toBe(2);
  finishGenres();
  await expect(homePage.filtersPopover.getByRole('button', { name: 'Action' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(homePage.filtersPopover.getByRole('button', { name: '7+' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(page.url()).toBe(originalUrl);
  expect(catalogueRequests).toBe(before);
  await page.keyboard.press('Escape');
  await expect(homePage.titleCards.first()).toBeVisible();
});

test('explains a successful empty genre response', async ({ homePage, page }) => {
  await page.route('**/api/genres', (route) => route.fulfill({ json: { movie: [], tv: [] } }));
  await homePage.goto();
  await homePage.openFilters();
  await expect(homePage.filtersPopover.getByRole('status')).toHaveText('No genres available.');
  await expect(homePage.filtersPopover.getByRole('button', { name: 'Retry genres' })).toHaveCount(
    0
  );
});
