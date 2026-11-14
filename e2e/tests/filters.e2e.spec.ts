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
