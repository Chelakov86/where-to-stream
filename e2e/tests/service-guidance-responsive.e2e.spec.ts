import { test, expect } from '../fixtures/test-fixtures';

test.use({ hasTouch: true });

for (const surface of ['search', 'countries'] as const) {
  for (const input of ['keyboard', 'touch'] as const) {
    test(`${surface}: choose services using ${input} without losing context`, async ({
      homePage,
      page,
    }) => {
      if (input === 'touch') {
        await page.setViewportSize({ width: 393, height: 720 });
      }
      await homePage.goto('country=GB&query=fight&page=2');
      if (surface === 'countries') {
        await page.goto(
          '/title/movie/550/countries?country=GB&returnTo=%2F%3Fquery%3Dfight%26page%3D2'
        );
        await page.getByRole('textbox', { name: 'Filter countries' }).fill('United');
      }
      const filter =
        surface === 'search'
          ? page.getByRole('switch', { name: 'Only my services' })
          : page.getByRole('button', { name: 'On my services', exact: true });
      await expect(filter).toBeDisabled();
      await expect(filter).toHaveAccessibleDescription(
        'Select your streaming services to use this filter.'
      );
      const originalUrl = page.url();
      const opener = page.getByRole('button', { name: 'Choose services', exact: true });
      if (input === 'keyboard') {
        await opener.focus();
        await page.keyboard.press('Enter');
      } else {
        await opener.tap();
      }
      const dialog = page.getByRole('dialog', { name: 'Your streaming services' });
      const provider = dialog.getByRole('button', { name: 'Netflix', exact: true });
      if (input === 'keyboard') {
        await provider.focus();
        await page.keyboard.press('Space');
        await page.keyboard.press('Escape');
      } else {
        await provider.tap();
        await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
      }
      await expect(opener).toBeFocused();
      await expect(page).toHaveURL(originalUrl);
      await expect(filter).toBeEnabled();
      await expect(filter).toHaveAttribute(
        surface === 'search' ? 'aria-checked' : 'aria-pressed',
        'false'
      );
      await filter.click();
      await opener.click();
      await dialog.getByRole('button', { name: 'Clear all', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(filter).toBeDisabled();
      await expect(filter).toHaveAttribute(
        surface === 'search' ? 'aria-checked' : 'aria-pressed',
        'false'
      );
      if (surface === 'countries') {
        await expect(page.getByRole('textbox', { name: 'Filter countries' })).toHaveValue('United');
      }
      await homePage.servicesButton.click();
      await expect(dialog).toBeVisible();
    });
  }
}
