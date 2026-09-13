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
