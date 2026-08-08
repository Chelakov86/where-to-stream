import { test, expect } from '../fixtures/test-fixtures';

test.describe('Results Display', () => {
  test('should select result item and show details', async ({ homePage }) => {
    const resultDetailsPage = await homePage.viewDetails('test');

    await expect(resultDetailsPage.detailsSection).toBeVisible();
  });

  test('should display initial prompt when no search performed', async ({ homePage }) => {
    await expect(homePage.initialPrompt).toBeVisible();
    await expect(homePage.initialPrompt).toContainText('Search for a movie or series');
  });
});
