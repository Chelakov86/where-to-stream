import { test, expect } from '../fixtures/test-fixtures';

test.describe('My services', () => {
  test('picks streaming services and remembers them', async ({ homePage, page }) => {
    await homePage.openServices();
    await homePage.toggleService('Netflix');
    await expect(
      homePage.servicesDialog.getByRole('button', { name: 'Netflix', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    await homePage.closeDialog();

    await expect(homePage.servicesButton).toHaveAccessibleName('My services (1 selected)');
    await page.reload();
    await expect(homePage.servicesButton).toHaveAccessibleName('My services (1 selected)');
  });

  test('filters popular titles to my services', async ({ homePage, page }) => {
    await homePage.openServices();
    await homePage.toggleService('Netflix');
    await homePage.toggleService('Disney Plus');
    await homePage.closeDialog();

    const request = homePage.nextSearchRequest();
    await homePage.onlyMineSwitch.click();

    await expect(page).toHaveURL(/mine=1/);
    expect(new URL((await request).url()).searchParams.get('providerIds')).toBe('8,337');
    await expect(homePage.resultsHeading).toHaveText('Popular on your services in United States');
  });

  test('shows when a title is included in my services', async ({ homePage, titlePage }) => {
    await homePage.openServices();
    await homePage.toggleService('Netflix');
    await homePage.closeDialog();

    await titlePage.gotoTitle('movie', 550);
    await expect(titlePage.verdict).toContainText('Included in your services');
    await expect(titlePage.providerLink('Netflix')).toContainText('(one of your services)');
  });
});

test.describe('Country', () => {
  test('changes and remembers the country', async ({ homePage, page }) => {
    const request = homePage.nextSearchRequest();
    await homePage.chooseCountry('Germany');

    await expect(homePage.heroHeading).toHaveText('Where can I stream it in Germany?');
    await expect(homePage.resultsHeading).toHaveText('Popular in Germany');
    expect(new URL((await request).url()).searchParams.get('watchRegion')).toBe('DE');

    await page.reload();
    await expect(homePage.heroHeading).toHaveText('Where can I stream it in Germany?');
  });

  test('lists pinned countries first', async ({ homePage, page }) => {
    await homePage.countryButton.click();
    const pinned = page.locator('[cmdk-group]').filter({ hasText: 'Pinned' });
    await expect(pinned.getByRole('option')).toHaveText([
      'Germany',
      'United Kingdom',
      'United States',
      'Canada',
    ]);
  });

  test('honours and updates a country in the URL', async ({ homePage, page }) => {
    await homePage.goto('country=GB');
    await expect(homePage.resultsHeading).toHaveText('Popular in United Kingdom');

    await homePage.chooseCountry('Canada');
    await expect(page).toHaveURL(/country=CA/);
    await expect(homePage.resultsHeading).toHaveText('Popular in Canada');
  });
});
