import { test, expect } from '../fixtures/test-fixtures';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
];

test.describe('Responsive Design', () => {
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

    await page.waitForURL('**/title/movie/550?country=US');
  });
});
