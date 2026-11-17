import { test, expect } from '../fixtures/test-fixtures';

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'short-mobile', width: 375, height: 500 },
]) {
  test(`autocomplete bounds and keyboard reachability on ${viewport.name}`, async ({
    homePage,
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/search*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('mode') !== 'autocomplete')
        return route.fallback();
      await route.fulfill({
        json: {
          results: Array.from({ length: 40 }, (_, i) => ({
            id: 1000 + i,
            type: 'movie',
            title: `Suggestion ${i + 1}`,
            year: 2020,
          })),
        },
      });
    });
    const input = homePage.searchInput;
    await input.fill('many');
    await expect(homePage.suggestions).toHaveCount(40);
    for (let i = 0; i < 40; i++) await input.press('ArrowDown');
    const metrics = await homePage.suggestionList.evaluate((list) => {
      const bounds = list.getBoundingClientRect();
      const active = list.querySelector('[aria-selected="true"]')!.getBoundingClientRect();
      return {
        top: bounds.top,
        bottom: bounds.bottom,
        viewport: innerHeight,
        height: list.clientHeight,
        scrollHeight: list.scrollHeight,
        scrollTop: list.scrollTop,
        activeTop: active.top,
        activeBottom: active.bottom,
      };
    });
    await testInfo.attach('bounds', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });
    await testInfo.attach('autocomplete', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewport - 8);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.height);
    expect(metrics.activeTop).toBeGreaterThanOrEqual(metrics.top);
    expect(metrics.activeBottom).toBeLessThanOrEqual(metrics.bottom);
    await expect(input).toBeFocused();
    for (let i = 0; i < 39; i++) await input.press('ArrowUp');
    await expect(homePage.suggestions.first()).toBeInViewport({ ratio: 1 });
    expect(
      await homePage.suggestions.first().evaluate((option) => {
        const rect = option.getBoundingClientRect();
        return option.contains(
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
        );
      })
    ).toBe(true);
    await input.press('Escape');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).toHaveValue('many');
    await input.press('Enter');
    await expect(page).toHaveURL(/q=many/);
    // Reopen without replacing the query and reach the last option again.
    await input.press('ArrowDown');
    for (let i = 0; i < 40; i++) await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/title\/movie\/1039\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('country')).toBe('US');
    expect(url.searchParams.get('returnTo')).toContain('q=many');
    await page.getByRole('link', { name: 'Back to search' }).click();
    await expect(page).toHaveURL(/q=many/);
    await expect(homePage.searchInput).toHaveValue('many');
  });
}

test('keeps recent titles reachable after resizing and supports pointer selection', async ({
  homePage,
  page,
  isMobile,
}) => {
  await page.evaluate(() =>
    localStorage.setItem(
      'where-to-stream-search-history',
      JSON.stringify(
        Array.from({ length: 6 }, (_, i) => ({
          id: 2000 + i,
          type: 'tv',
          title: `Recent ${i + 1}`,
          timestamp: i,
        }))
      )
    )
  );
  await page.reload();
  const input = homePage.searchInput;
  await input.click();
  const list = page.getByRole('listbox', { name: 'Recently viewed titles' });
  await expect(list.getByRole('option')).toHaveCount(6);
  for (let i = 0; i < 6; i++) await input.press('ArrowDown');
  await page.setViewportSize({ width: 375, height: 400 });
  await expect(async () => {
    const bounds = await list.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(8);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(392);
    await expect(list.getByRole('option').last()).toBeInViewport({ ratio: 1 });
  }).toPass();
  await expect(input).toBeFocused();
  await input.press('Escape');
  await input.press('ArrowDown');
  // Scroll just the list, as a touch drag/wheel would, without scrolling the page.
  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const last = list.getByRole('option').last();
  if (isMobile) await last.tap();
  else await last.click();
  await expect(page).toHaveURL(/\/title\/tv\/2005\?/);
  expect(new URL(page.url()).searchParams.get('returnTo')).toContain('country=US');
});

test('selects the final full suggestion by touch or pointer after internal scrolling', async ({
  homePage,
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: 375, height: 500 });
  await page.route('**/api/search*', async (route) => {
    if (new URL(route.request().url()).searchParams.get('mode') !== 'autocomplete')
      return route.fallback();
    await route.fulfill({
      json: {
        results: Array.from({ length: 40 }, (_, i) => ({
          id: 3000 + i,
          type: 'movie',
          title: `Match ${i + 1}`,
        })),
      },
    });
  });
  await homePage.searchInput.fill('many');
  await expect(homePage.suggestions).toHaveCount(40);
  await homePage.suggestionList.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const last = homePage.suggestions.last();
  await expect(last).toBeInViewport({ ratio: 1 });
  if (isMobile) await last.tap();
  else await last.click();
  await expect(page).toHaveURL(/\/title\/movie\/3039\?/);
});
