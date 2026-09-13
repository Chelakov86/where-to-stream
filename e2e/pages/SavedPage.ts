import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the saved titles (watchlist) page.
 */
export class SavedPage extends BasePage {
  readonly heading: Locator;
  readonly emptyState: Locator;
  readonly startSearchingLink: Locator;
  readonly savedCards: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Saved titles' });
    this.emptyState = page.getByText('Nothing saved yet');
    this.startSearchingLink = page.getByRole('link', { name: 'Start searching' });
    this.savedCards = page.getByRole('main').locator('ul > li');
  }

  async gotoSaved(): Promise<void> {
    await this.goto('/saved');
    await expect(this.heading).toBeVisible();
  }

  removeButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Remove ${title} from saved` });
  }
}
