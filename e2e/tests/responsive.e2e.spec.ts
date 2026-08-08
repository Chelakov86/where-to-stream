import { test, expect } from '../fixtures/test-fixtures';
import { Locator } from '@playwright/test';
import { mockSearch } from '../helpers/api-mock';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
];

test.describe('Responsive Design', () => {
  for (const viewport of viewports) {
    test(`should display correctly on ${viewport.name} viewport`, async ({ homePage, page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await expect(homePage.pageTitle).toBeVisible();
      await expect(homePage.searchInput).toBeVisible();

      // Check that layout adapts to the viewport width
      const titleBox = await homePage.pageTitle.boundingBox();
      expect(titleBox?.width).toBeLessThanOrEqual(viewport.width);
    });
  }

  test('should handle touch interactions on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockSearch(page);

    // Simulate touch interaction (fallback to click if context doesn't support touch tap)
    const tapOrClick = async (locator: Locator) => {
      await locator.tap().catch(() => locator.click());
    };

    await tapOrClick(homePage.searchInput);
    await homePage.typeSearchQuery('test');
    await tapOrClick(homePage.searchButton);

    await homePage.waitForResults();
    await expect(homePage.resultsList).toBeVisible();
  });
});
