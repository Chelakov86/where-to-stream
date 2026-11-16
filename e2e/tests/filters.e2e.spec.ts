import { test, expect } from '../fixtures/test-fixtures';

test.describe('Filter Functionality', () => {
  test('filters by media type', async ({ homePage, page }) => {
    const request = homePage.nextSearchRequest();
    await homePage.selectType('Movies');

    await expect(page).toHaveURL(/type=movie/);
    expect(new URL((await request).url()).searchParams.get('type')).toBe('movie');
    await expect(homePage.typeGroup.getByRole('button', { name: 'Movies' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('picks genres, rating, years and language from the filters popover', async ({
    homePage,
    page,
  }) => {
    await homePage.openFilters();

    await homePage.filtersPopover.getByRole('button', { name: 'Action' }).click();
    await expect(page).toHaveURL(/genre=28/);

    await homePage.filtersPopover.getByRole('button', { name: '7+' }).click();
    await expect(page).toHaveURL(/rating=7/);

    await homePage.filtersPopover.getByLabel('Year from').fill('2010');
    await expect(page).toHaveURL(/from=2010/);

    await homePage.filtersPopover.getByLabel('Original language').selectOption('de');
    await expect(page).toHaveURL(/lang=de/);

    await expect(homePage.filtersButton).toContainText('4');
  });

  test('sends filters to the search API', async ({ homePage }) => {
    const request = homePage.nextSearchRequest();
    await homePage.goto('genre=28,12&rating=7&from=2010&to=2020&lang=en');
    const params = new URL((await request).url()).searchParams;

    expect(params.get('genreIds')).toBe('28,12');
    expect(params.get('minRating')).toBe('7');
    expect(params.get('yearFrom')).toBe('2010');
    expect(params.get('yearTo')).toBe('2020');
    expect(params.get('language')).toBe('en');
  });

  test('restores filters from the URL and resets them', async ({ homePage, page }) => {
    await homePage.goto('genre=28&rating=7');
    await expect(homePage.filtersButton).toContainText('2');

    await homePage.openFilters();
    await expect(homePage.filtersPopover.getByRole('button', { name: 'Action' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await homePage.filtersPopover.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page).not.toHaveURL(/genre=|rating=/);
  });

  test('sorts results, offering best match only for searches', async ({ homePage, page }) => {
    await expect(homePage.sortSelect).toHaveValue('popularity');
    await expect(homePage.sortSelect.locator('option', { hasText: 'Best match' })).toHaveCount(0);

    await homePage.sortSelect.selectOption('rating');
    await expect(page).toHaveURL(/sort=rating/);

    await homePage.goto('q=Fight');
    await expect(homePage.sortSelect).toHaveValue('relevance');
  });

  test('keeps "only my services" disabled until services are picked', async ({ homePage }) => {
    await expect(homePage.onlyMineSwitch).toBeDisabled();
  });
});

// API behavior is covered by route contract tests; these exercise the browser's
// filtered page navigation and incomplete-result feedback.
test.describe('Year-filtered pagination', () => {
  test('preserves the range when paging through filtered matches', async ({ homePage, page }) => {
    await page.route('**/api/search?**', async (route) => {
      const params = new URL(route.request().url()).searchParams;
      const currentPage = Number(params.get('page') || '1');
      await route.fulfill({
        json: {
          page: currentPage,
          totalPages: 2,
          totalResults: 21,
          results: [{ id: currentPage, type: 'movie', title: `Match ${currentPage}`, year: 2005 }],
        },
      });
    });
    await homePage.goto('q=batman&type=movie&from=2000&to=2020');
    await expect(homePage.titleCards).toHaveCount(1);
    await expect(homePage.pagination).toContainText('Page 1 of 2');
    const nextRequest = homePage.nextSearchRequest();
    await homePage.nextPageButton.click();
    const params = new URL((await nextRequest).url()).searchParams;
    expect(params.get('yearFrom')).toBe('2000');
    expect(params.get('yearTo')).toBe('2020');
    expect(params.get('page')).toBe('2');
    await expect(homePage.pagination).toContainText('Page 2 of 2');
    await expect(homePage.titleCards.first()).toContainText('Match 2');
    await expect(homePage.nextPageButton).toBeDisabled();
    await homePage.previousPageButton.click();
    await expect(homePage.pagination).toContainText('Page 1 of 2');
  });

  test('explains when the inspected subset has no matches', async ({ homePage, page }) => {
    await page.route('**/api/search?**', (route) =>
      route.fulfill({
        json: {
          page: 1,
          totalPages: 1,
          totalResults: 0,
          results: [],
          resultsTruncated: true,
        },
      })
    );
    await homePage.goto('q=batman&from=2000');
    await expect(page.getByText('No matches in the inspected results')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('This search is incomplete');
    await expect(page.getByText('No titles found', { exact: true })).toHaveCount(0);
  });
});

test.describe('Filtered search pagination', () => {
  for (const { name, url, expected } of [
    { name: 'rating', url: 'rating=8', expected: { minRating: '8' } },
    { name: 'genre', url: 'genre=28', expected: { genreIds: '28' } },
    { name: 'services', url: 'mine=1', expected: { providerIds: '8' } },
  ]) {
    test(`preserves ${name} filters across pages without a year filter`, async ({
      homePage,
      page,
    }) => {
      await page.addInitScript(() => localStorage.setItem('wts.services', JSON.stringify([8])));
      await page.route('**/api/search?**', async (route) => {
        const params = new URL(route.request().url()).searchParams;
        const currentPage = Number(params.get('page') || '1');
        await route.fulfill({
          json: {
            page: currentPage,
            totalPages: 2,
            totalResults: 21,
            results: [{ id: currentPage, type: 'movie', title: `Filtered match ${currentPage}` }],
          },
        });
      });
      await homePage.goto(`q=batman&type=movie&${url}`);
      await expect(homePage.pagination).toContainText('Page 1 of 2');
      const nextRequest = homePage.nextSearchRequest();
      await homePage.nextPageButton.click();
      const params = new URL((await nextRequest).url()).searchParams;
      for (const [key, value] of Object.entries(expected)) expect(params.get(key)).toBe(value);
      expect(params.has('yearFrom')).toBe(false);
      expect(params.has('yearTo')).toBe(false);
      await expect(homePage.pagination).toContainText('Page 2 of 2');
      await expect(homePage.titleCards.first()).toContainText('Filtered match 2');
      await homePage.previousPageButton.click();
      await expect(homePage.pagination).toContainText('Page 1 of 2');
    });
  }

  test('keeps Previous and Next usable on an empty intermediate upstream page', async ({
    homePage,
    page,
  }) => {
    await page.route('**/api/search?**', async (route) => {
      const currentPage = Number(new URL(route.request().url()).searchParams.get('page') || '1');
      await route.fulfill({
        json: {
          page: currentPage,
          totalPages: 3,
          totalResults: 60,
          paginationScope: 'upstream',
          results:
            currentPage === 2
              ? []
              : [{ id: currentPage, type: 'movie', title: `Match ${currentPage}` }],
        },
      });
    });
    await homePage.goto('q=batman&type=movie&rating=8&page=2');
    await expect(page.getByText('No matches on this page')).toBeVisible();
    await expect(page.getByText('No titles found', { exact: true })).toHaveCount(0);
    await expect(homePage.previousPageButton).toBeEnabled();
    await expect(homePage.nextPageButton).toBeEnabled();
    await homePage.previousPageButton.click();
    await expect(homePage.pagination).toContainText('Page 1 of 3');
    await homePage.nextPageButton.click();
    await expect(page.getByText('No matches on this page')).toBeVisible();
    await homePage.nextPageButton.click();
    await expect(homePage.titleCards.first()).toContainText('Match 3');
  });
});

test.describe('Year draft validation', () => {
  test('restores partial years on Tab and dismissal without changing URL or requests', async ({
    homePage,
    page,
  }) => {
    const requests: URLSearchParams[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/search?')) {
        requests.push(new URL(request.url()).searchParams);
      }
    });
    const initial = homePage.nextSearchRequest();
    await homePage.goto('from=2010&to=2020');
    await initial;
    await homePage.openFilters();
    const from = homePage.filtersPopover.getByLabel('Year from');
    const to = homePage.filtersPopover.getByLabel('Year to');
    await expect(from).toHaveValue('2010');
    await expect(to).toHaveValue('2020');
    const committedURL = page.url();
    const requestCount = requests.length;

    await from.press('End');
    await from.press('Backspace');
    await expect(from).toHaveValue('201');
    await from.press('Tab');
    await expect(from).toHaveValue('2010');

    for (const dismiss of ['Escape', 'outside']) {
      await from.fill('201');
      if (dismiss === 'Escape') await from.press('Escape');
      else await homePage.heroHeading.click();
      await expect(homePage.filtersPopover).not.toBeVisible();
      await homePage.openFilters();
      await expect(from).toHaveValue('2010');
      await expect(to).toHaveValue('2020');
    }
    await expect(page).toHaveURL(committedURL);
    expect(requests).toHaveLength(requestCount);
    expect(requests[requests.length - 1].get('yearFrom')).toBe('2010');
    expect(requests[requests.length - 1].get('yearTo')).toBe('2020');

    const next = homePage.nextSearchRequest();
    await from.fill('201');
    await from.pressSequentially('5');
    const params = new URL((await next).url()).searchParams;
    expect(params.get('yearFrom')).toBe('2015');
    expect(params.get('yearTo')).toBe('2020');
    await expect(page).toHaveURL(/from=2015/);
    await expect(from).toHaveValue('2015');
  });

  test('blocks inverted bounds, corrects either year, and discards rejected edits on close', async ({
    homePage,
    page,
  }) => {
    const requests: URLSearchParams[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/search?')) {
        requests.push(new URL(request.url()).searchParams);
      }
    });
    await homePage.goto('from=2010&to=2020');
    await homePage.openFilters();
    const from = homePage.filtersPopover.getByLabel('Year from');
    const to = homePage.filtersPopover.getByLabel('Year to');
    const error = homePage.filtersPopover.getByRole('alert');
    const committedURL = page.url();

    await from.fill('2030');
    await from.press('Tab');
    await expect(error).toContainText('Change either year');
    await expect(from).toHaveAttribute('aria-invalid', 'true');
    await expect(to).toHaveAccessibleDescription(/Year from must be no later/);
    await expect(page).toHaveURL(committedURL);
    await to.press('Escape');
    await homePage.openFilters();
    await expect(from).toHaveValue('2010');
    await expect(to).toHaveValue('2020');
    await expect(error).toHaveCount(0);

    await from.fill('2030');
    const corrected = homePage.nextSearchRequest();
    await to.fill('2040');
    const params = new URL((await corrected).url()).searchParams;
    expect(params.get('yearFrom')).toBe('2030');
    expect(params.get('yearTo')).toBe('2040');
    await expect(page).toHaveURL(/from=2030&to=2040/);
    await expect(error).toHaveCount(0);
    await expect(from).toHaveValue('2030');
    await expect(to).toHaveValue('2040');

    await to.fill('2000');
    await expect(error).toBeVisible();
    const correctedFrom = homePage.nextSearchRequest();
    await from.fill('1990');
    const correctedParams = new URL((await correctedFrom).url()).searchParams;
    expect(correctedParams.get('yearFrom')).toBe('1990');
    expect(correctedParams.get('yearTo')).toBe('2000');
    await expect(page).toHaveURL(/from=1990&to=2000/);
    await expect(error).toHaveCount(0);

    await from.fill('2010');
    await expect(error).toBeVisible();
    const reset = homePage.nextSearchRequest();
    await homePage.filtersPopover.getByRole('button', { name: 'Reset filters' }).click();
    const resetParams = new URL((await reset).url()).searchParams;
    expect(resetParams.has('yearFrom')).toBe(false);
    expect(resetParams.has('yearTo')).toBe(false);
    await expect(page).not.toHaveURL(/from=|to=/);
    await expect(from).toHaveValue('');
    await expect(to).toHaveValue('');
    await expect(error).toHaveCount(0);
    for (const params of requests) {
      const lower = params.get('yearFrom');
      const upper = params.get('yearTo');
      if (lower !== null && upper !== null) {
        expect(Number(lower)).toBeLessThanOrEqual(Number(upper));
      }
    }
  });

  for (const bound of ['from', 'to']) {
    test(`clears the ${bound} bound immediately`, async ({ homePage, page }) => {
      await homePage.goto('from=2010&to=2020');
      await homePage.openFilters();
      const field = homePage.filtersPopover.getByLabel(bound === 'from' ? 'Year from' : 'Year to');
      const next = homePage.nextSearchRequest();
      await field.clear();
      const params = new URL((await next).url()).searchParams;
      expect(params.has(bound === 'from' ? 'yearFrom' : 'yearTo')).toBe(false);
      expect(params.get(bound === 'from' ? 'yearTo' : 'yearFrom')).toBe(
        bound === 'from' ? '2020' : '2010'
      );
      await expect(page).not.toHaveURL(new RegExp(`${bound}=`));
      await expect(field).toHaveValue('');
      await field.press('Escape');
      await homePage.openFilters();
      await expect(field).toHaveValue('');
    });
  }
});
