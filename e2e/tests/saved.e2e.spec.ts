import { test, expect } from '../fixtures/test-fixtures';

test.describe('Saved titles', () => {
  test('shows an empty state', async ({ savedPage, page }) => {
    await savedPage.gotoSaved();

    await expect(savedPage.emptyState).toBeVisible();
    await savedPage.startSearchingLink.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Where can I stream it in United States?'
    );
  });

  test('saves a title, lists it, and removes it', async ({ titlePage, savedPage, page }) => {
    await titlePage.gotoTitle('movie', 550);
    await titlePage.saveButton.click();
    await expect(titlePage.saveButton).toHaveText('Saved');
    await expect(titlePage.saveButton).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('link', { name: 'Saved titles' }).click();
    await expect(savedPage.heading).toBeVisible();
    await expect(savedPage.savedCards).toHaveCount(1);
    await expect(savedPage.savedCards.first()).toContainText('Fight Club');

    await page.reload();
    await expect(savedPage.savedCards).toHaveCount(1);

    await savedPage.removeButton('Fight Club').click();
    await expect(savedPage.emptyState).toBeVisible();
  });

  test('opens a saved title', async ({ titlePage, savedPage, page }) => {
    await titlePage.gotoTitle('movie', 550);
    await titlePage.saveButton.click();

    await savedPage.gotoSaved();
    await savedPage.savedCards.getByRole('link', { name: /Fight Club/ }).click();
    await page.waitForURL('**/title/movie/550?country=US');
  });
});
