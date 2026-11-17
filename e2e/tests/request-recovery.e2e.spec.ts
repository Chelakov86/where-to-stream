import { test, expect } from '../fixtures/test-fixtures';
import { setupDefaultMocks } from '../helpers/api-mock';
import { sampleSearchResults, sampleTitleDetails } from '../helpers/test-data';

for (const surface of ['search', 'title', 'countries'] as const) {
  test.describe(`${surface} request recovery`, () => {
    const pattern = surface === 'search' ? '**/api/search*' : '**/api/title/**';
    const returnTo = '/?q=dune&page=3&country=DE';
    const path =
      surface === 'search'
        ? '/?q=dune&country=DE'
        : `/title/movie/550${surface === 'countries' ? '/countries' : ''}?country=DE&returnTo=${encodeURIComponent(returnTo)}`;
    const recovered =
      surface === 'search'
        ? 'Fight Club'
        : surface === 'title'
          ? 'Fight Club'
          : 'Fight Club: availability by country';
    const success =
      surface === 'search'
        ? {
            page: 1,
            totalPages: 1,
            totalResults: sampleSearchResults.length,
            results: sampleSearchResults,
          }
        : sampleTitleDetails;

    test.beforeEach(async ({ page }) => {
      await setupDefaultMocks(page);
      await page.addInitScript(() => localStorage.setItem('wts.country', '"DE"'));
    });

    for (const dateHeader of [false, true]) {
      test(`honors ${dateHeader ? 'HTTP-date' : 'seconds'} Retry-After and recovers by keyboard`, async ({
        page,
      }) => {
        await page.clock.install({ time: new Date('2026-11-16T12:00:00Z') });
        await page.clock.pauseAt(new Date('2026-11-16T12:00:01Z'));
        let attempts = 0;
        await page.route(pattern, (route) => {
          attempts++;
          return attempts === 1
            ? route.fulfill({
                status: 429,
                headers: {
                  'Retry-After': dateHeader ? new Date('2026-11-16T12:01:01Z').toUTCString() : '60',
                },
                body: 'not JSON',
              })
            : route.fulfill({ json: success });
        });
        await page.goto(path);
        await expect(page.getByRole('heading', { name: 'Too many requests' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Please wait' })).toBeDisabled();
        const originalUrl = page.url();
        await page.clock.runFor(59000);
        expect(attempts).toBe(1);
        await expect(page.getByRole('button', { name: 'Please wait' })).toBeDisabled();
        await page.clock.runFor(2000);
        const retry = page.getByRole('button', { name: 'Try again' });
        await expect(retry).toBeEnabled();
        expect(attempts).toBe(1);
        await retry.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('heading', { name: recovered, exact: true })).toBeVisible();
        expect(attempts).toBe(2);
        expect(page.url()).toBe(originalUrl);
      });
    }

    test('offers safe navigation for not found without retrying', async ({ page }) => {
      await page.route(pattern, (route) =>
        route.fulfill({ status: 404, body: 'private stack trace' })
      );
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Not found', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
      await expect(page.getByText('private stack trace')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Back to search', exact: true })).toHaveAttribute(
        'href',
        surface === 'search' ? '/' : returnTo
      );
      if (surface === 'countries')
        await expect(page.getByRole('link', { name: 'Back to title' })).toHaveAttribute(
          'href',
          `/title/movie/550?country=DE&returnTo=${encodeURIComponent(returnTo)}`
        );
    });

    test('recovers from a network rejection', async ({ page }) => {
      let attempts = 0;
      await page.route(pattern, (route) =>
        ++attempts === 1 ? route.abort('failed') : route.fulfill({ json: success })
      );
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: 'Unable to connect', exact: true })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page.getByRole('heading', { name: recovered, exact: true })).toBeVisible();
      expect(attempts).toBe(2);
    });

    test('times out a stalled request and recovers', async ({ page }) => {
      await page.clock.install({ time: new Date('2026-11-16T12:00:00Z') });
      await page.clock.pauseAt(new Date('2026-11-16T12:00:01Z'));
      let attempts = 0;
      await page.route(pattern, (route) => {
        attempts++;
        if (attempts > 1) return route.fulfill({ json: success });
        // Leave the first request pending until the client deadline aborts it.
      });
      await page.goto(path);
      await expect.poll(() => attempts).toBe(1);
      await page.clock.runFor(21000);
      await expect(page.getByRole('heading', { name: 'The request took too long' })).toBeVisible();
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page.getByRole('heading', { name: recovered, exact: true })).toBeVisible();
      expect(attempts).toBe(2);
    });
  });
}
