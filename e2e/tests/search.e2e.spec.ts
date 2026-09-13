import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch } from '../helpers/api-mock';
import { sampleSearchResults } from '../helpers/test-data';

test.describe('Search Functionality', () => {
  test('shows popular titles in the user country before searching', async ({ homePage }) => {
    await expect(homePage.heroHeading).toHaveText('Where can I stream it in United States?');
    await expect(homePage.resultsHeading).toHaveText('Popular in United States');
    await homePage.waitForResults();
    await expect(homePage.titleCards).toHaveCount(sampleSearchResults.length);
  });

  test('requests popular titles for the country', async ({ homePage }) => {
    const request = homePage.nextSearchRequest();
    await homePage.goto();
    const params = new URL((await request).url()).searchParams;

    expect(params.get('query')).toBe('');
    expect(params.get('watchRegion')).toBe('US');
    expect(params.get('sort')).toBe('popularity');
  });

  test('searches as you type and keeps the query in the URL', async ({ homePage, page }) => {
    await homePage.search('Fight Club');

    await expect(homePage.resultsHeading).toHaveText('Results for “Fight Club”');
    await homePage.waitForResults();
    expect(new URL(page.url()).searchParams.get('q')).toBe('Fight Club');
  });

  test('opens a title from the results', async ({ homePage, page }) => {
    await homePage.waitForResults();
    await homePage.openTitleCard('Fight Club');

    await page.waitForURL('**/title/movie/550?country=US');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fight Club');
  });

  test('shows a no results message', async ({ homePage }) => {
    await homePage.search('nonexistent movie');
    await expect(homePage.emptyState).toHaveText('No titles found');
  });

  test('restores a search from a shared URL', async ({ homePage }) => {
    await homePage.goto('q=Breaking&type=tv');

    await expect(homePage.searchInput).toHaveValue('Breaking');
    await expect(homePage.resultsHeading).toHaveText('Results for “Breaking”');
    await expect(homePage.typeGroup.getByRole('button', { name: 'Series' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('clears the search back to popular titles', async ({ homePage, page }) => {
    await homePage.search('Fight Club');
    await homePage.clearSearchButton.click();

    await expect(homePage.resultsHeading).toHaveText('Popular in United States');
    expect(new URL(page.url()).searchParams.has('q')).toBe(false);
  });

  test('paginates through results', async ({ homePage, page }) => {
    await mockSearch(page, sampleSearchResults, { totalPages: 3 });
    await homePage.goto('q=test');
    await homePage.waitForResults();

    await expect(homePage.previousPageButton).toBeDisabled();
    await homePage.nextPageButton.click();
    await expect(page).toHaveURL(/page=2/);
    await expect(homePage.pagination).toContainText('Page 2 of 3');

    await homePage.nextPageButton.click();
    await expect(homePage.pagination).toContainText('Page 3 of 3');
    await expect(homePage.nextPageButton).toBeDisabled();

    await page.goBack();
    await expect(homePage.pagination).toContainText('Page 2 of 3');
  });
});
