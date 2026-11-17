import { test, expect } from '../fixtures/test-fixtures';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
];

test.describe('Responsive Design', () => {
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
