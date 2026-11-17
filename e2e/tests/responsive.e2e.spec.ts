import { test, expect } from '../fixtures/test-fixtures';
import { mockTitleDetails } from '../helpers/api-mock';
import { sampleTitleDetails, WATCH_LINK } from '../helpers/test-data';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
];

test.describe('Responsive Design', () => {
  test('opens country watch options and retains comparison context', async ({
    countriesPage,
    page,
    context,
    isMobile,
  }) => {
    await page.setViewportSize({ width: isMobile ? 320 : 900, height: 667 });
    await page.addInitScript(() => localStorage.setItem('wts.services', '[8]'));
    const usLink = `${WATCH_LINK}?locale=US`;
    const deLink = `${WATCH_LINK}?locale=DE`;
    await mockTitleDetails(page, {
      ...sampleTitleDetails,
      availability: {
        US: { ...sampleTitleDetails.availability.US, watchLink: usLink },
        DE: { ...sampleTitleDetails.availability.DE, watchLink: deLink },
        GB: { ...sampleTitleDetails.availability.GB, watchLink: undefined },
      },
    });
    // Keep external navigation deterministic; the app only promises the supplied destination.
    await context.route('https://www.themoviedb.org/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>TMDB watch options</h1>' })
    );
    const returnTo = '/?q=fight&type=movie&page=2&country=US';
    await page.goto(
      `/title/movie/550/countries?country=US&returnTo=${encodeURIComponent(returnTo)}`
    );
    await expect(countriesPage.heading).toHaveText('Fight Club: availability by country');
    const originalUrl = page.url();
    await expect(
      countriesPage.card('Germany').getByRole('link', { name: /View watch options on TMDB/ })
    ).toHaveAttribute('href', deLink);
    const uk = countriesPage.card('United Kingdom');
    await expect(uk.getByText('Watch options link unavailable for United Kingdom.')).toBeVisible();
    await expect(uk.getByRole('link')).toHaveCount(0);
    await expect(uk).toContainText('Netflix');

    const pin = countriesPage.pinButton('United Kingdom');
    if (isMobile) await pin.tap();
    else {
      await pin.focus();
      await page.keyboard.press('Enter');
    }
    const pins = await page.evaluate(() => localStorage.getItem('wts.pinnedCountries'));
    await countriesPage.filterInput.fill('United');
    await countriesPage.onMyServicesButton.click();
    const link = page.getByRole('link', {
      name: 'View watch options on TMDB for United States (opens in a new tab)',
    });
    await expect(link).toHaveAttribute('href', usLink);
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await link.scrollIntoViewIfNeeded();
    const bounds = await link.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(isMobile ? 320 : 900);
    if (!isMobile) {
      // Tab from the independent pin control to the watch-options link.
      await countriesPage.pinButton('United States').focus();
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
    }
    const scroll = await page.evaluate(() => window.scrollY);
    const popupPromise = page.waitForEvent('popup');
    if (isMobile) await link.tap();
    else await page.keyboard.press('Enter');
    const popup = await popupPromise;
    await expect(popup).toHaveURL(usLink);
    await expect(popup.getByRole('heading')).toHaveText('TMDB watch options');
    await popup.close();
    await page.bringToFront();

    await expect(page).toHaveURL(originalUrl);
    await expect(countriesPage.filterInput).toHaveValue('United');
    await expect(countriesPage.onMyServicesButton).toHaveAttribute('aria-pressed', 'true');
    await expect(countriesPage.countryNames).toHaveText(['United States', 'United Kingdom']);
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    expect(await page.evaluate(() => localStorage.getItem('wts.country'))).toBe('"US"');
    expect(await page.evaluate(() => localStorage.getItem('wts.pinnedCountries'))).toBe(pins);
    await countriesPage.backLink.click();
    await page.getByRole('link', { name: 'Back to search' }).click();
    await expect(page).toHaveURL(returnTo);
  });

  test('searches the full service catalogue and manages selections across countries', async ({
    homePage,
    page,
    isMobile,
  }) => {
    await page.route('**/api/providers*', (route) => {
      const country = new URL(route.request().url()).searchParams.get('watchRegion');
      return route.fulfill({
        json: {
          providers:
            country === 'DE'
              ? []
              : Array.from({ length: 80 }, (_, index) => ({
                  id: 1000 + index,
                  name: `Service ${index + 1}`,
                  priority: index,
                })),
        },
      });
    });
    await page.setViewportSize({ width: isMobile ? 375 : 900, height: 667 });
    await homePage.openServices();
    const dialog = homePage.servicesDialog;
    const search = dialog.getByRole('searchbox', { name: 'Search services' });
    await expect(dialog.getByRole('status')).toHaveText('80 of 80 services');
    // Reach the end through the actual scroll container, including with touch input.
    const last = dialog.getByRole('button', { name: 'Service 80', exact: true });
    await last.scrollIntoViewIfNeeded();
    if (isMobile) await last.tap();
    else {
      await last.focus();
      await page.keyboard.press('Enter');
    }
    await search.fill('SERVICE 61');
    const sixtyFirst = dialog.getByRole('button', { name: 'Service 61', exact: true });
    await expect(
      dialog.getByRole('list', { name: 'Available services' }).getByRole('button')
    ).toHaveCount(1);
    if (isMobile) await sixtyFirst.tap();
    else {
      await search.press('Tab');
      await expect(sixtyFirst).toBeFocused();
      await page.keyboard.press('Enter');
    }
    await search.fill('');
    await expect(sixtyFirst).toHaveAttribute('aria-pressed', 'true');
    await search.fill('nonexistent');
    await expect(dialog.getByRole('status')).toContainText('No services match');
    await expect(
      dialog.getByRole('button', { name: 'Remove Service 61', exact: true })
    ).toBeVisible();
    await dialog.getByRole('combobox', { name: /Change country/ }).click();
    await page.getByRole('option', { name: 'Germany', exact: true }).click();
    await expect(page.getByPlaceholder('Search countries…')).toHaveCount(0);
    await expect(dialog.getByRole('status')).toContainText(
      'No streaming services are listed in Germany'
    );
    const remove = dialog.getByRole('button', { name: 'Remove Service 61', exact: true });
    if (isMobile) await remove.tap();
    else {
      await remove.focus();
      await page.keyboard.press('Enter');
    }
    await expect(
      dialog.getByRole('button', { name: 'Remove Service 80', exact: true })
    ).toBeVisible();
    if (!isMobile) await expect(search).toBeFocused();
    await homePage.closeDialog();
    await expect(dialog).toBeHidden();
    await homePage.openServices();
    await expect(search).toHaveValue('');
    await expect(
      dialog.getByRole('button', { name: 'Remove Service 80', exact: true })
    ).toBeVisible();
    // A full reload deliberately leaves only numeric preferences, with no known catalogue details.
    await page.reload();
    await homePage.openServices();
    await expect(
      dialog.getByRole('button', { name: 'Remove Unavailable service (ID 1079)', exact: true })
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Clear all' }).click();
    await expect(dialog.getByRole('region', { name: /Selected services/ })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('wts.services'))).toBe('[]');
    const bounds = await dialog.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(667);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });

  test('recovers from an empty services country without losing context or selections', async ({
    homePage,
    page,
    isMobile,
  }) => {
    await homePage.openServices();
    await homePage.toggleService('Netflix');
    await homePage.closeDialog();
    await page.route('**/api/providers*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('watchRegion') !== 'GB') {
        return route.fallback();
      }
      await route.fulfill({ json: { providers: [] } });
    });
    const returnTo = '/?q=fight&type=movie&page=2';
    // The saved route keeps this check independent of server-side TMDB metadata requests.
    await page.goto(`/saved?country=GB&returnTo=${encodeURIComponent(returnTo)}`);
    const originalUrl = new URL(page.url());
    const trigger = homePage.servicesButton;
    if (isMobile) {
      await trigger.tap();
    } else {
      await trigger.focus();
      await page.keyboard.press('Enter');
    }
    const dialog = homePage.servicesDialog;
    await expect(dialog.getByRole('status')).toContainText(
      'No streaming services are listed in United Kingdom'
    );
    await expect(dialog.getByRole('status', { name: 'Loading providers' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(dialog.getByRole('status')).toContainText('No streaming services are listed');

    const picker = dialog.getByRole('combobox', { name: /Change country/ });
    if (isMobile) {
      await picker.tap();
      await page.getByRole('option', { name: 'Germany', exact: true }).tap();
    } else {
      await picker.focus();
      await page.keyboard.press('Enter');
      await page.getByPlaceholder('Search countries…').fill('Germany');
      await expect(page.getByRole('option', { name: 'Germany', exact: true })).toHaveAttribute(
        'data-selected',
        'true'
      );
      await page.keyboard.press('Enter');
    }
    expect(await page.evaluate(() => localStorage.getItem('wts.country'))).toBe('"DE"');
    originalUrl.searchParams.set('country', 'DE');
    await expect(page).toHaveURL(originalUrl.toString());
    await expect(dialog.getByRole('button', { name: 'Netflix', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(picker).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('wts.services'))).toBe('[8]');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(trigger).toBeFocused();
  });

  for (const viewport of viewports) {
    test(`should display correctly on ${viewport.name} viewport`, async ({ homePage, page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await expect(homePage.heroHeading).toBeVisible();
      await expect(homePage.searchInput).toBeVisible();
      await expect(homePage.countryButton).toBeVisible();
      await expect(homePage.servicesButton).toBeVisible();
      await homePage.waitForResults();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('should handle touch interactions on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await homePage.waitForResults();

    const card = homePage.titleCards.first();
    await card.tap().catch(() => card.click());

    await page.waitForURL(
      (url) => url.pathname === '/title/movie/550' && url.searchParams.get('country') === 'US'
    );
  });
});
