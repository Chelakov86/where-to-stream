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

    await expect(homePage.errorAlert).toContainText("We couldn't reach the catalogue.");

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
      "Couldn't load availability."
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
